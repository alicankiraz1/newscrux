import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { getLanguagePack } from './i18n.js';
import type { QueueEntry, StructuredSummary } from './types.js';

const log = createLogger('telegram');

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

interface RenderResult {
  title: string;
  message: string;
  truncated: boolean;
}

export function renderNotification(entry: QueueEntry, summary: StructuredSummary): RenderResult {
  const isArxiv = entry.feedName.startsWith(config.arxivFeedPrefix);
  const emoji = isArxiv ? '📄' : '📰';
  const { labels } = getLanguagePack(runtimeConfig.language);

  const titleRaw = summary.translated_title || (summary as any).title_tr || entry.title;
  const title = titleRaw.slice(0, 250);

  const source = escapeHtml(entry.feedName);
  const whatHappened = escapeHtml(summary.what_happened);
  const whyItMatters = escapeHtml(summary.why_it_matters);
  const keyDetail = escapeHtml(summary.key_detail);
  const articleLink = escapeHtml(entry.link);

  const sourceLine = `${emoji} ${source}`;
  const whatLine = `\n\n<b>${labels.whatHappened}</b> ${whatHappened}`;
  const whyLine = `\n\n<b>${labels.whyItMatters}</b> ${whyItMatters}`;
  const detailLine = `\n\n💡 ${keyDetail}`;
  const linkLine = `\n\n<b>${labels.readArticle}:</b> ${articleLink}`;

  const MAX_MESSAGE = 3500;

  let message = sourceLine + whatLine + whyLine + detailLine + linkLine;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: false };
  }

  message = sourceLine + whatLine + whyLine + detailLine;
  if (message.length <= MAX_MESSAGE - linkLine.length) {
    return { title, message: message + linkLine, truncated: true };
  }

  const availableForWhat = MAX_MESSAGE - (sourceLine + whyLine + detailLine + linkLine + '\n\n<b></b> ').length - labels.whatHappened.length;
  const whatTrimmed = trimToSentenceBoundary(whatHappened, Math.max(availableForWhat, 200));
  message = sourceLine + `\n\n<b>${labels.whatHappened}</b> ${whatTrimmed}` + whyLine + detailLine + linkLine;

  return { title, message: message.slice(0, MAX_MESSAGE), truncated: true };
}

function appendOptionalLink(message: string, url?: string, urlTitle?: string): string {
  if (!url) return message;

  const label = urlTitle ? escapeHtml(urlTitle) : 'Link';
  const escapedUrl = escapeHtml(url);
  return `${message}\n\n<b>${label}:</b> ${escapedUrl}`;
}

export async function sendNotification(
  title: string,
  message: string,
  url?: string,
  urlTitle?: string,
): Promise<boolean> {
  try {
    const text = [`<b>${escapeHtml(title.slice(0, 250))}</b>`, appendOptionalLink(message, url, urlTitle)].join('\n\n');

    const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: text.slice(0, 4096),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log.error(`Telegram error (${response.status}): ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    log.error('Failed to send Telegram notification', err);
    return false;
  }
}

export async function sendArticleNotification(
  entry: QueueEntry,
  summary: StructuredSummary,
): Promise<{ success: boolean; truncated: boolean }> {
  const { title, message, truncated } = renderNotification(entry, summary);
  const success = await sendNotification(title, message);
  if (success) {
    log.info(`Telegram sent: ${entry.title}`);
  }
  return { success, truncated };
}
