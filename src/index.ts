#!/usr/bin/env node
// src/index.ts
import { config, getMissingConfigKeys, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { fetchAllArticles } from './feeds.js';
import { filterByRelevance } from './relevance.js';
import { enrichEntry } from './extractor.js';
import { summarizeEntry } from './summarizer.js';
import {
  loadArticleQueue,
  saveArticleQueue,
  getQueue,
  isKnown,
  discoverArticles,
  handleColdStart,
  getEntriesByState,
  transitionEntry,
  markFailed,
  removeEntry,
  countByState,
} from './queue.js';
import { sendNotification, sendArticleNotification, escapeHtml } from './telegram.js';
import { processSummarizedEntry } from './delivery.js';
import { parseArgs } from './cli.js';
import { getLanguagePack } from './i18n.js';
import type { PollMetrics } from './types.js';

const log = createLogger('main');

function validateConfig(): void {
  const missingKeys = getMissingConfigKeys();
  if (missingKeys.length > 0) {
    log.error(`${missingKeys.join(', ')} ${missingKeys.length === 1 ? 'is' : 'are'} required. Set ${missingKeys.length === 1 ? 'it' : 'them'} in .env file.`);
    process.exit(1);
  }
}

let pollCycleCount = 0;
let lastArxivDigestTime = 0;
const ARXIV_DIGEST_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function emitMetrics(metrics: PollMetrics): void {
  const parts = Object.entries(metrics)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  log.info(`[METRICS] poll_cycle=${pollCycleCount} ${parts}`);
}

async function pollAndNotify(): Promise<void> {
  pollCycleCount++;
  log.info('Starting poll cycle...');

  const metrics: PollMetrics = {
    discovered: 0,
    enriched: 0,
    enrichment_scraped: 0,
    enrichment_snippet: 0,
    relevance_passed: 0,
    relevance_dropped: 0,
    relevance_bypassed: 0,
    summarized: 0,
    summary_failed: 0,
    sent: 0,
    send_failed: 0,
    truncated: 0,
    queue_pending: 0,
    queue_failed: 0,
  };

  try {
    loadArticleQueue();

    const allArticles = await fetchAllArticles();

    if (handleColdStart(allArticles)) {
      log.info('Cold start complete — no notifications this cycle');
      emitMetrics(metrics);
      return;
    }

    const newCount = discoverArticles(allArticles);
    metrics.discovered = newCount;
    saveArticleQueue();

    if (newCount === 0 && getEntriesByState('discovered').length === 0) {
      log.info('No new or pending articles');
      emitMetrics(metrics);
      return;
    }

    const relevancePassedIds = new Set<string>();
    // Limit discovered batch to prevent overwhelming the relevance model
    const MAX_RELEVANCE_BATCH = 25;
    const allDiscovered = getEntriesByState('discovered');
    const discovered = allDiscovered.slice(0, MAX_RELEVANCE_BATCH);

    if (allDiscovered.length > MAX_RELEVANCE_BATCH) {
      log.info(`Processing ${discovered.length}/${allDiscovered.length} discovered articles this cycle`);
    }

    if (discovered.length > 0) {
      const result = await filterByRelevance(discovered);

      metrics.relevance_bypassed = result.bypassed.length;
      metrics.relevance_passed = result.passed.length;
      metrics.relevance_dropped = result.dropped.length;

      for (const { entry } of result.dropped) {
        removeEntry(entry.id);
      }

      for (const entry of result.passed) relevancePassedIds.add(entry.id);
      for (const entry of result.bypassed) relevancePassedIds.add(entry.id);

      if (result.parseError) {
        log.warn('Relevance parse error — allowing all entries through this cycle');
        for (const entry of discovered) {
          relevancePassedIds.add(entry.id);
        }
      }

      saveArticleQueue();
    }

    const isArxiv = (name: string) => name.startsWith(config.arxivFeedPrefix);
    const eligibleForEnrich = getEntriesByState('discovered').filter(e => relevancePassedIds.has(e.id));
    const regularToEnrich = eligibleForEnrich.filter(e => !isArxiv(e.feedName));
    const arxivToEnrich = eligibleForEnrich.filter(e => isArxiv(e.feedName));

    const enrichBatch = [
      ...regularToEnrich.slice(0, config.maxArticlesPerPoll),
      ...arxivToEnrich.slice(0, config.arxivMaxPerPoll),
    ];

    for (const entry of enrichBatch) {
      try {
        const { enrichedContent, wasScraped } = await enrichEntry(entry);
        transitionEntry(entry.id, 'enriched', { enrichedContent });
        metrics.enriched++;
        if (wasScraped) metrics.enrichment_scraped++;
        else metrics.enrichment_snippet++;
      } catch (err) {
        markFailed(entry.id, `Enrichment error: ${err}`);
      }
    }
    saveArticleQueue();

    const toSummarize = getEntriesByState('enriched');
    for (const entry of toSummarize) {
      const summary = await summarizeEntry(entry);
      if (summary) {
        await processSummarizedEntry({
          entry,
          summary,
          arxivFeedPrefix: config.arxivFeedPrefix,
          sendArticleNotification,
          transitionEntry,
          markFailed,
          saveArticleQueue,
          onSummarized: () => {
            metrics.summarized++;
          },
          onSent: truncated => {
            metrics.sent++;
            if (truncated) metrics.truncated++;
          },
          onSendFailed: () => {
            metrics.send_failed++;
          },
        });
      } else {
        markFailed(entry.id, 'Summarization failed');
        saveArticleQueue();
        metrics.summary_failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // --- Send: split regular (immediate) vs arXiv (hourly digest) ---
    const toSend = getEntriesByState('summarized');
    const regularToSend = toSend.filter(e => !isArxiv(e.feedName));
    const arxivToSend = toSend.filter(e => isArxiv(e.feedName));

    // Send regular articles immediately
    for (const entry of regularToSend) {
      if (!entry.structuredSummary) {
        markFailed(entry.id, 'No structured summary available');
        metrics.send_failed++;
        continue;
      }

      const { success, truncated } = await sendArticleNotification(entry, entry.structuredSummary);
      if (success) {
        transitionEntry(entry.id, 'sent');
        saveArticleQueue();
        metrics.sent++;
        if (truncated) metrics.truncated++;
      } else {
        markFailed(entry.id, 'Telegram send failed');
        saveArticleQueue();
        metrics.send_failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Send arXiv as hourly digest
    const now = Date.now();
    const arxivReady = arxivToSend.filter(e => e.structuredSummary);
    if (arxivReady.length > 0 && (now - lastArxivDigestTime) >= ARXIV_DIGEST_INTERVAL_MS) {
      const { labels } = getLanguagePack(runtimeConfig.language);

      // Build digest message: each paper gets a compact entry
      const digestParts: string[] = [];
      for (const entry of arxivReady) {
        const s = entry.structuredSummary!;
        const title = s.translated_title || (s as any).title_tr || entry.title;
        digestParts.push(`<b>${escapeHtml(title)}</b>\n${escapeHtml(s.what_happened)}`);
      }

      // Keep digest compact enough for Telegram readability
      let digestMessage = '';
      let includedCount = 0;
      for (const part of digestParts) {
        const candidate = digestMessage ? digestMessage + '\n\n' + part : part;
        if (candidate.length > 3500) break;
        digestMessage = candidate;
        includedCount++;
      }

      const digestTitle = `📄 arXiv Digest (${includedCount} ${includedCount === 1 ? 'paper' : 'papers'})`;
      const success = await sendNotification(digestTitle, digestMessage, 'https://arxiv.org', labels.readMore);

      if (success) {
        // Mark all arxiv papers as sent (even those that didn't fit in message)
        for (const entry of arxivReady) {
          transitionEntry(entry.id, 'sent');
          metrics.sent++;
        }
        lastArxivDigestTime = now;
        log.info(`arXiv digest sent: ${includedCount} papers in message, ${arxivReady.length} total marked sent`);
      } else {
        for (const entry of arxivReady) {
          markFailed(entry.id, 'arXiv digest send failed');
          metrics.send_failed++;
        }
      }
    } else if (arxivReady.length > 0) {
      log.info(`arXiv: ${arxivReady.length} papers waiting for next digest (${Math.round((ARXIV_DIGEST_INTERVAL_MS - (now - lastArxivDigestTime)) / 60000)}min remaining)`);
    }

    saveArticleQueue();

    const counts = countByState();
    metrics.queue_pending = counts.discovered + counts.enriched + counts.summarized;
    metrics.queue_failed = counts.failed;

    emitMetrics(metrics);
    log.info(`Poll cycle complete: ${metrics.sent} sent, ${metrics.queue_pending} pending`);
  } catch (err) {
    log.error('Error in poll cycle', err);
    saveArticleQueue();
  }
}

function scheduleNextPoll(): void {
  const intervalMs = config.pollIntervalMinutes * 60 * 1000;
  log.info(`Next poll in ${config.pollIntervalMinutes} minutes`);
  setTimeout(async () => {
    await pollAndNotify();
    scheduleNextPoll();
  }, intervalMs);
}

function setupShutdown(): void {
  const shutdown = (signal: string) => {
    log.info(`Received ${signal}, shutting down...`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function main(): Promise<void> {
  // Parse CLI args before anything else
  const args = parseArgs();
  runtimeConfig.language = args.lang;

  const pack = getLanguagePack(runtimeConfig.language);
  log.info(`Newscrux v2.0 starting... (language: ${pack.name})`);
  validateConfig();
  setupShutdown();

  const startupSent = await sendNotification(
    '📡 Newscrux',
    pack.labels.startupMessage,
  );

  if (startupSent) {
    log.info('Startup notification sent');
  } else {
    log.error('Failed to send startup notification — check Telegram credentials');
  }

  await pollAndNotify();
  scheduleNextPoll();
}

main().catch((err) => {
  log.error('Fatal error', err);
  process.exit(1);
});
