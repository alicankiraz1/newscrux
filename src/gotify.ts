// src/gotify.ts
import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { getLanguagePack } from './i18n.js';
import type { QueueEntry, StructuredSummary } from './types.js';

const log = createLogger('gotify');

export async function sendNotification(
  title: string,
  message: string,
  url?: string,
  _urlTitle?: string,
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      title,
      message,
      priority: 5,
      extras: {
        'client::display': { contentType: 'text/markdown' },
        ...(url ? { 'client::notification': { click: { url } } } : {}),
      },
    };

    const response = await fetch(`${config.gotifyUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gotify-Key': config.gotifyToken,
        'Authorization': `Bearer ${config.gotifyToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      log.error(`Gotify error (${response.status}): ${text}`);
      return false;
    }

    return true;
  } catch (err) {
    log.error('Failed to send Gotify notification', err);
    return false;
  }
}

export async function sendArticleNotification(
  entry: QueueEntry,
  summary: StructuredSummary,
): Promise<{ success: boolean; truncated: boolean }> {
  const isArxiv = entry.feedName.startsWith(config.arxivFeedPrefix);
  const emoji = isArxiv ? '📄' : '📰';
  const { labels } = getLanguagePack(runtimeConfig.language);

  const titleRaw = summary.translated_title || (summary as any).title_tr || entry.title;
  const title = titleRaw.slice(0, 250);

  const message = [
    `**${emoji} ${entry.feedName}**`,
    '',
    `**${labels.whatHappened}** ${summary.what_happened}`,
    '',
    `**${labels.whyItMatters}** ${summary.why_it_matters}`,
    '',
    `💡 ${summary.key_detail}`,
  ].join('\n');

  const success = await sendNotification(title, message, entry.link, isArxiv ? labels.readArticle : labels.readMore);
  return { success, truncated: false };
}

export async function sendArxivDigest(entries: QueueEntry[]): Promise<boolean> {
  const { labels } = getLanguagePack(runtimeConfig.language);

  const parts = entries.map(entry => {
    const s = entry.structuredSummary!;
    const title = s.translated_title || (s as any).title_tr || entry.title;
    return `**${title}**\n${s.what_happened}`;
  });

  const digestMessage = parts.join('\n\n');
  const digestTitle = `📄 arXiv Digest (${entries.length} ${entries.length === 1 ? 'paper' : 'papers'})`;

  const success = await sendNotification(digestTitle, digestMessage, 'https://arxiv.org', labels.readMore);
  if (success) {
    log.info(`arXiv digest sent: ${entries.length} papers`);
  }
  return success;
}
