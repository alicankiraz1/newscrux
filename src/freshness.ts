import type { Article, QueueEntry } from './types.js';

export function isValidPublishedAt(publishedAt: string): boolean {
  return Number.isFinite(Date.parse(publishedAt));
}

export function isFreshPublishedAt(
  publishedAt: string,
  freshnessWindowHours: number,
  now = Date.now(),
): boolean {
  if (!isValidPublishedAt(publishedAt)) {
    return false;
  }

  const publishedAtMs = Date.parse(publishedAt);
  const freshnessWindowMs = freshnessWindowHours * 60 * 60 * 1000;
  return publishedAtMs >= now - freshnessWindowMs;
}

export function isFreshArticle(
  article: Pick<Article, 'publishedAt'>,
  freshnessWindowHours: number,
  now = Date.now(),
): boolean {
  return isFreshPublishedAt(article.publishedAt, freshnessWindowHours, now);
}

export function filterFreshArticles<T extends Pick<Article, 'publishedAt'>>(
  articles: T[],
  freshnessWindowHours: number,
  now = Date.now(),
): T[] {
  return articles.filter(article => isFreshArticle(article, freshnessWindowHours, now));
}

export function isStalePendingEntry(
  entry: Pick<QueueEntry, 'state' | 'publishedAt'>,
  freshnessWindowHours: number,
  now = Date.now(),
): boolean {
  if (entry.state === 'sent' || entry.state === 'failed') {
    return false;
  }

  return !isFreshPublishedAt(entry.publishedAt, freshnessWindowHours, now);
}
