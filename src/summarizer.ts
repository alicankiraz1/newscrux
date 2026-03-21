// src/summarizer.ts
import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { getLanguagePack } from './i18n.js';
import { sendTextPrompt } from './llm.js';
import type { QueueEntry, StructuredSummary, FeedKind } from './types.js';

const log = createLogger('summarizer');

const KIND_TO_SOURCE_TYPE: Record<FeedKind, StructuredSummary['source_type']> = {
  official_blog: 'official_announcement',
  media: 'media_report',
  research: 'research',
  newsletter: 'newsletter',
};

const MAX_RETRIES = 1;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseAndValidateSummary(text: string, feedKind: FeedKind): StructuredSummary | null {
  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);

    // Accept both translated_title and title_tr (backward compat)
    const translatedTitle = parsed.translated_title || parsed.title_tr;

    const fields = { translated_title: translatedTitle, what_happened: parsed.what_happened, why_it_matters: parsed.why_it_matters, key_detail: parsed.key_detail, source_type: parsed.source_type };
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        log.warn(`Missing or empty field: ${field}`);
        return null;
      }
    }

    if (parsed.what_happened.length < 50) {
      log.warn(`what_happened too short: ${parsed.what_happened.length} chars (min 50)`);
      return null;
    }
    if (parsed.why_it_matters.length < 20) {
      log.warn(`why_it_matters too short: ${parsed.why_it_matters.length} chars (min 20)`);
      return null;
    }

    const expectedSourceType = KIND_TO_SOURCE_TYPE[feedKind];
    if (parsed.source_type !== expectedSourceType) {
      log.debug(`source_type mismatch: model="${parsed.source_type}" vs config="${expectedSourceType}" — using config`);
    }

    return {
      translated_title: translatedTitle.trim(),
      what_happened: parsed.what_happened.trim(),
      why_it_matters: parsed.why_it_matters.trim(),
      key_detail: parsed.key_detail.trim(),
      source_type: expectedSourceType,
    };
  } catch (err) {
    log.warn(`JSON parse error: ${err}`);
    return null;
  }
}

export async function summarizeEntry(entry: QueueEntry): Promise<StructuredSummary | null> {
  const content = entry.enrichedContent || entry.snippet;
  const pack = getLanguagePack(runtimeConfig.language);
  const kindLabel = pack.kindLabels[entry.feedKind];
  const sourceType = KIND_TO_SOURCE_TYPE[entry.feedKind];
  const systemPrompt = pack.summarySystemPrompt(kindLabel, sourceType);

  const userContent = `Title: ${entry.title}\nSource: ${entry.feedName}\nSource type: ${entry.feedKind}\n\nContent:\n${content}`;

  log.debug(`Summarizing: ${entry.title}`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { text, provider } = await sendTextPrompt(systemPrompt, userContent);
      log.info(`Summarizer provider: ${provider}`);
      const summary = parseAndValidateSummary(text, entry.feedKind);

      if (summary) {
        log.info(`Summarized: ${entry.title} (${summary.what_happened.length} chars)`);
        return summary;
      }

      if (attempt < MAX_RETRIES) {
        log.warn(`Summary validation failed for "${entry.title}", retrying...`);
        await delay(2000);
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        log.warn(`Summarization attempt ${attempt + 1} failed for "${entry.title}", retrying: ${err}`);
        await delay(Math.pow(2, attempt + 1) * 1000);
      } else {
        log.error(`Summarization failed after retries: ${entry.title}`, err);
      }
    }
  }

  return null;
}
