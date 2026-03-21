import Parser from 'rss-parser';
import { config, getEnabledFeeds } from './config.js';
import { createLogger } from './logger.js';
import { deduplicateArticles } from './dedup.js';
import { filterFreshArticles, isValidPublishedAt } from './freshness.js';
import type { Article, FeedConfig } from './types.js';

const log = createLogger('feeds');
const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Newscrux/2.0' },
});

const SNIPPET_MAX_CHARS = 1500;

async function fetchFeed(feed: FeedConfig): Promise<Article[]> {
  try {
    log.debug(`Fetching feed: ${feed.name}`);
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).map(item => {
      const raw = item.summary || item.contentSnippet || item.content || '';
      const snippet = raw.slice(0, SNIPPET_MAX_CHARS);
      return {
        id: item.guid || item.link || item.title || '',
        title: item.title || 'Untitled',
        link: item.link || '',
        snippet,
        source: feed.name,
        feedKind: feed.kind,
        feedPriority: feed.priority,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      };
    });
  } catch (err) {
    log.error(`Failed to fetch feed: ${feed.name}`, err);
    return [];
  }
}

export async function fetchAllArticles(): Promise<Article[]> {
  const results = await Promise.allSettled(
    getEnabledFeeds().map(feed => fetchFeed(feed))
  );

  const allArticles: Article[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }

  const unique = deduplicateArticles(allArticles);
  unique.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const invalidCount = unique.filter(article => !isValidPublishedAt(article.publishedAt)).length;
  if (invalidCount > 0) {
    log.warn(`Skipping ${invalidCount} article(s) with invalid publishedAt values`);
  }

  const fresh = filterFreshArticles(unique, config.freshnessWindowHours);
  const staleCount = unique.length - fresh.length;
  if (staleCount > 0) {
    log.info(`Skipped ${staleCount} stale article(s) outside the ${config.freshnessWindowHours}h freshness window`);
  }

  log.info(`Fetched ${allArticles.length} total articles, ${unique.length} after dedup, ${fresh.length} within freshness window`);
  return fresh;
}
