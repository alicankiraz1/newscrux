// src/types.ts

// --- Feed Configuration ---

export type FeedKind = 'official_blog' | 'media' | 'research' | 'newsletter';

export type { SupportedLanguage } from './i18n.js';

export interface FeedConfig {
  name: string;
  url: string;
  kind: FeedKind;
  priority: 'high' | 'normal';
}

// --- Article (raw from RSS) ---

export interface Article {
  id: string;
  title: string;
  link: string;
  snippet: string;
  source: string;
  feedKind: FeedKind;
  feedPriority: 'high' | 'normal';
  publishedAt: string;
}

// --- Structured Summary (from AI) ---

export type SourceType = 'official_announcement' | 'media_report' | 'research' | 'newsletter';

export interface StructuredSummary {
  translated_title: string;
  what_happened: string;
  why_it_matters: string;
  key_detail: string;
  source_type: SourceType;
}

// --- Article Queue (state pipeline) ---

export type ArticleState = 'discovered' | 'enriched' | 'summarized' | 'sent' | 'failed';

export interface QueueEntry {
  id: string;
  state: ArticleState;
  feedName: string;
  feedKind: FeedKind;
  feedPriority: 'high' | 'normal';
  title: string;
  link: string;
  snippet: string;
  publishedAt: string;
  enrichedContent?: string;
  structuredSummary?: StructuredSummary;
  discoveredAt: number;
  lastUpdatedAt: number;
  retryCount?: number;
  lastError?: string;
}

export interface ArticleQueue {
  entries: Record<string, QueueEntry>;
  lastCleanup: number;
  coldStartDone: boolean;
}

// --- Poll Metrics ---

export interface PollMetrics {
  discovered: number;
  enriched: number;
  enrichment_scraped: number;
  enrichment_snippet: number;
  relevance_passed: number;
  relevance_dropped: number;
  relevance_bypassed: number;
  summarized: number;
  summary_failed: number;
  sent: number;
  send_failed: number;
  truncated: number;
  queue_pending: number;
  queue_failed: number;
}

// --- Legacy (kept for migration compatibility) ---

export interface SeenArticlesStore {
  articles: Record<string, number>;
  lastCleanup: number;
  coldStartDone: boolean;
}
