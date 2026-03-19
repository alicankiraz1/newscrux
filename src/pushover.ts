// src/pushover.ts
import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { getLanguagePack } from './i18n.js';
import type { QueueEntry, StructuredSummary } from './types.js';

const log = createLogger('pushover');

// --- HTML Escaping ---

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Smart Truncation ---

function trimToSentenceBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('!\n'),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('?\n'),
  );

  if (lastSentenceEnd > maxLength * 0.3) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated;
}

// --- Notification Rendering ---

interface RenderResult {
  title: string;
  message: string;
  truncated: boolean;
}

export function renderNotification(entry: QueueEntry, summary: StructuredSummary): RenderResult {
  const isArxiv = entry.feedName.startsWith(config.arxivFeedPrefix);
  const emoji = isArxiv ? '📄' : '📰';
  const { labels } = getLanguagePack(runtimeConfig.language);

  // Support both translated_title and legacy title_tr
  // Title is NOT HTML-escaped — Pushover does not parse HTML in titles
  const titleRaw = summary.translated_title || (summary as any).title_tr || entry.title;
  const title = titleRaw.slice(0, 250);

  const source = escapeHtml(entry.feedName);
  const whatHappened = escapeHtml(summary.what_happened);
  const whyItMatters = escapeHtml(summary.why_it_matters);
  const keyDetail = escapeHtml(summary.key_detail);

  const sourceLine = `${emoji} ${source}`;
  const whatLine = `\n\n<b>${labels.whatHappened}</b> ${whatHappened}`;
  const whyLine = `\n\n<b>${labels.whyItMatters}</b> ${whyItMatters}`;
  const detailLine = `\n\n💡 ${keyDetail}`;

  const MAX_MESSAGE = 1024;

  let message = sourceLine + whatLine + whyLine + detailLine;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: false };
  }

  message = sourceLine + whatLine + whyLine;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: true };
  }

  const whyFirstSentence = whyItMatters.split(/[.!?]\s/)[0] + '.';
  const whyLineShort = `\n\n<b>${labels.whyItMatters}</b> ${whyFirstSentence}`;
  message = sourceLine + whatLine + whyLineShort;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: true };
  }

  const availableForWhat = MAX_MESSAGE - (sourceLine + `\n\n<b>${labels.whatHappened}</b> ` + whyLineShort).length;
  const whatTrimmed = trimToSentenceBoundary(whatHappened, Math.max(availableForWhat, 100));
  message = sourceLine + `\n\n<b>${labels.whatHappened}</b> ${whatTrimmed}` + whyLineShort;

  return { title, message: message.slice(0, MAX_MESSAGE), truncated: true };
}

// --- Pushover API ---

export async function sendNotification(
  title: string,
  message: string,
  url?: string,
  urlTitle?: string,
): Promise<boolean> {
  try {
    const params: Record<string, string> = {
      token: config.pushoverAppToken,
      user: config.pushoverUserKey,
      title: title.slice(0, 250),
      message: message.slice(0, 1024),
      html: '1',
    };

    if (url) params.url = url;
    if (urlTitle) params.url_title = urlTitle;

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    if (!response.ok) {
      const body = await response.text();
      log.error(`Pushover error (${response.status}): ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    log.error('Failed to send Pushover notification', err);
    return false;
  }
}

export async function sendArticleNotification(
  entry: QueueEntry,
  summary: StructuredSummary,
): Promise<{ success: boolean; truncated: boolean }> {
  const { title, message, truncated } = renderNotification(entry, summary);
  const isArxiv = entry.feedName.startsWith(config.arxivFeedPrefix);
  const { labels } = getLanguagePack(runtimeConfig.language);
  const urlTitle = isArxiv ? labels.readArticle : labels.readMore;

  const success = await sendNotification(title, message, entry.link, urlTitle);
  return { success, truncated };
}

export async function sendArxivDigest(entries: QueueEntry[]): Promise<boolean> {
  const { labels } = getLanguagePack(runtimeConfig.language);

  const digestParts: string[] = [];
  for (const entry of entries) {
    const s = entry.structuredSummary!;
    const title = s.translated_title || (s as any).title_tr || entry.title;
    digestParts.push(`<b>${escapeHtml(title)}</b>\n${escapeHtml(s.what_happened)}`);
  }

  // Pushover 1024 char limit — fit as many papers as possible
  let digestMessage = '';
  let includedCount = 0;
  for (const part of digestParts) {
    const candidate = digestMessage ? digestMessage + '\n\n' + part : part;
    if (candidate.length > 1000) break;
    digestMessage = candidate;
    includedCount++;
  }

  const digestTitle = `📄 arXiv Digest (${includedCount} ${includedCount === 1 ? 'paper' : 'papers'})`;
  const success = await sendNotification(digestTitle, digestMessage, 'https://arxiv.org', labels.readMore);

  if (success) {
    log.info(`arXiv digest sent: ${includedCount} papers in message, ${entries.length} total marked sent`);
  }
  return success;
}
