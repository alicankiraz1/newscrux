#!/usr/bin/env node
// src/index.ts
import { config, runtimeConfig } from './config.js';
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
import { sendNotification, sendArticleNotification, sendArxivDigest } from './notifier.js';
import { parseArgs } from './cli.js';
import { getLanguagePack } from './i18n.js';
import type { PollMetrics } from './types.js';

const log = createLogger('main');

function validateConfig(): void {
  if (!config.llmApiKey) {
    log.error('LLM_API_KEY (or OPENROUTER_API_KEY) is required. Set it in .env file.');
    process.exit(1);
  }

  const hasPushover = !!(config.pushoverUserKey && config.pushoverAppToken);
  const hasGotify = !!(config.gotifyUrl && config.gotifyToken);

  if (hasPushover && hasGotify) {
    log.error(
      'Both Pushover and Gotify credentials are set — choose one. ' +
      'Set either PUSHOVER_USER_KEY+PUSHOVER_APP_TOKEN or GOTIFY_URL+GOTIFY_TOKEN, not both.',
    );
    process.exit(1);
  }

  if (!hasPushover && !hasGotify) {
    log.error(
      'No notification backend configured. ' +
      'Set PUSHOVER_USER_KEY+PUSHOVER_APP_TOKEN (Pushover) ' +
      'or GOTIFY_URL+GOTIFY_TOKEN (Gotify).',
    );
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
        transitionEntry(entry.id, 'summarized', { structuredSummary: summary });
        metrics.summarized++;
      } else {
        markFailed(entry.id, 'Summarization failed');
        metrics.summary_failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    saveArticleQueue();

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
        metrics.sent++;
        if (truncated) metrics.truncated++;
      } else {
        markFailed(entry.id, 'Notification send failed');
        metrics.send_failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Send arXiv as hourly digest
    const now = Date.now();
    const arxivReady = arxivToSend.filter(e => e.structuredSummary);
    if (arxivReady.length > 0 && (now - lastArxivDigestTime) >= ARXIV_DIGEST_INTERVAL_MS) {
      const success = await sendArxivDigest(arxivReady);
      if (success) {
        for (const entry of arxivReady) {
          transitionEntry(entry.id, 'sent');
          metrics.sent++;
        }
        lastArxivDigestTime = now;
        log.info(`arXiv digest sent: ${arxivReady.length} papers`);
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
    log.error('Failed to send startup notification — check notification credentials');
  }

  await pollAndNotify();
  scheduleNextPoll();
}

main().catch((err) => {
  log.error('Fatal error', err);
  process.exit(1);
});
