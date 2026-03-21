// src/queue.ts
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { isStalePendingEntry } from './freshness.js';
import type { Article, ArticleQueue, QueueEntry, ArticleState, SeenArticlesStore } from './types.js';

const log = createLogger('queue');

const QUEUE_FILE = join(config.dataDir, 'article-queue.json');
const LEGACY_SEEN_FILE = join(config.dataDir, 'seen-articles.json');
const CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RETRIES = 3;

// --- Persistence (atomic write) ---

function loadQueue(): ArticleQueue {
  // Migration: if old seen-articles.json exists, import it
  if (!existsSync(QUEUE_FILE) && existsSync(LEGACY_SEEN_FILE)) {
    return migrateFromSeen();
  }

  try {
    if (existsSync(QUEUE_FILE)) {
      return JSON.parse(readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch {
    log.warn('Queue file could not be read, starting fresh');
  }
  return { entries: {}, lastCleanup: Date.now(), coldStartDone: false };
}

function saveQueue(queue: ArticleQueue): void {
  try {
    mkdirSync(config.dataDir, { recursive: true });
    const tmpFile = QUEUE_FILE + '.tmp';
    writeFileSync(tmpFile, JSON.stringify(queue, null, 2), 'utf-8');
    renameSync(tmpFile, QUEUE_FILE);
  } catch (err) {
    log.error('Failed to save queue', err);
  }
}

function migrateFromSeen(): ArticleQueue {
  log.info('Migrating from seen-articles.json to article-queue.json...');
  try {
    const old: SeenArticlesStore = JSON.parse(readFileSync(LEGACY_SEEN_FILE, 'utf-8'));
    const entries: Record<string, QueueEntry> = {};
    const now = Date.now();
    for (const [id, timestamp] of Object.entries(old.articles)) {
      entries[id] = {
        id,
        state: 'sent',
        feedName: '',
        feedKind: 'media',
        feedPriority: 'normal',
        title: '',
        link: '',
        snippet: '',
        publishedAt: '',
        discoveredAt: timestamp,
        lastUpdatedAt: now,
      };
    }
    const queue: ArticleQueue = {
      entries,
      lastCleanup: now,
      coldStartDone: true,
    };
    saveQueue(queue);
    renameSync(LEGACY_SEEN_FILE, LEGACY_SEEN_FILE + '.bak');
    log.info(`Migrated ${Object.keys(entries).length} entries from seen-articles.json`);
    return queue;
  } catch (err) {
    log.error('Migration failed, starting fresh', err);
    return { entries: {}, lastCleanup: Date.now(), coldStartDone: false };
  }
}

// --- Cleanup ---

function cleanupOldEntries(queue: ArticleQueue): void {
  const cutoff = Date.now() - CLEANUP_INTERVAL_MS;
  if (queue.lastCleanup > cutoff) return;

  let removed = 0;
  for (const [id, entry] of Object.entries(queue.entries)) {
    if (entry.state === 'sent' && entry.lastUpdatedAt < cutoff) {
      delete queue.entries[id];
      removed++;
    }
    if (entry.state === 'failed' && (entry.retryCount ?? 0) >= MAX_RETRIES) {
      delete queue.entries[id];
      removed++;
    }
  }
  queue.lastCleanup = Date.now();
  if (removed > 0) log.info(`Cleaned up ${removed} old queue entries`);
}

// --- Public API ---

let _queue: ArticleQueue | null = null;

export function loadArticleQueue(): ArticleQueue {
  _queue = loadQueue();
  cleanupOldEntries(_queue);
  return _queue;
}

export function saveArticleQueue(): void {
  if (_queue) saveQueue(_queue);
}

export function getQueue(): ArticleQueue {
  if (!_queue) throw new Error('Queue not loaded. Call loadArticleQueue() first.');
  return _queue;
}

export function isKnown(articleId: string): boolean {
  return articleId in getQueue().entries;
}

export function discoverArticles(articles: Article[]): number {
  const queue = getQueue();
  const now = Date.now();
  let count = 0;

  for (const article of articles) {
    if (!article.id || isKnown(article.id)) continue;
    queue.entries[article.id] = {
      id: article.id,
      state: 'discovered',
      feedName: article.source,
      feedKind: article.feedKind,
      feedPriority: article.feedPriority,
      title: article.title,
      link: article.link,
      snippet: article.snippet,
      publishedAt: article.publishedAt,
      discoveredAt: now,
      lastUpdatedAt: now,
    };
    count++;
  }

  return count;
}

export function handleColdStart(articles: Article[]): boolean {
  const queue = getQueue();
  if (queue.coldStartDone) return false;

  log.info(`Cold start: marking ${articles.length} existing articles as sent (no notifications)`);
  const now = Date.now();
  for (const article of articles) {
    if (!article.id) continue;
    queue.entries[article.id] = {
      id: article.id,
      state: 'sent',
      feedName: article.source,
      feedKind: article.feedKind,
      feedPriority: article.feedPriority,
      title: article.title,
      link: article.link,
      snippet: article.snippet,
      publishedAt: article.publishedAt,
      discoveredAt: now,
      lastUpdatedAt: now,
    };
  }
  queue.coldStartDone = true;
  saveQueue(queue);
  return true;
}

export function getEntriesByState(state: ArticleState, limit?: number): QueueEntry[] {
  const entries = Object.values(getQueue().entries).filter(e => e.state === state);
  entries.sort((a, b) => a.discoveredAt - b.discoveredAt);
  return limit ? entries.slice(0, limit) : entries;
}

export function transitionEntry(id: string, newState: ArticleState, updates?: Partial<QueueEntry>): void {
  const queue = getQueue();
  const entry = queue.entries[id];
  if (!entry) {
    log.warn(`Cannot transition unknown entry: ${id}`);
    return;
  }
  entry.state = newState;
  entry.lastUpdatedAt = Date.now();
  if (updates) {
    Object.assign(entry, updates);
  }
}

export function markFailed(id: string, error: string): void {
  const queue = getQueue();
  const entry = queue.entries[id];
  if (!entry) return;

  entry.retryCount = (entry.retryCount ?? 0) + 1;
  entry.lastError = error;

  if (entry.retryCount >= MAX_RETRIES) {
    entry.state = 'failed';
    log.warn(`Entry ${id} failed permanently after ${MAX_RETRIES} attempts: ${error}`);
  } else {
    if (entry.enrichedContent) {
      entry.state = 'enriched';
    } else {
      entry.state = 'discovered';
    }
    log.info(`Entry ${id} will be retried (attempt ${entry.retryCount}/${MAX_RETRIES}): ${error}`);
  }
  entry.lastUpdatedAt = Date.now();
}

export function removeEntry(id: string): void {
  delete getQueue().entries[id];
}

export function removeStalePendingEntries(
  queue: ArticleQueue,
  freshnessWindowHours: number,
  now = Date.now(),
): number {
  let removed = 0;

  for (const [id, entry] of Object.entries(queue.entries)) {
    if (!isStalePendingEntry(entry, freshnessWindowHours, now)) {
      continue;
    }

    delete queue.entries[id];
    removed++;
  }

  return removed;
}

export function countByState(): Record<ArticleState, number> {
  const counts: Record<ArticleState, number> = {
    discovered: 0, enriched: 0, summarized: 0, sent: 0, failed: 0,
  };
  for (const entry of Object.values(getQueue().entries)) {
    counts[entry.state]++;
  }
  return counts;
}
