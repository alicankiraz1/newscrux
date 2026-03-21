// src/config.ts
import 'dotenv/config';
import { join } from 'node:path';
import type { FeedConfig } from './types.js';
import type { SupportedLanguage } from './i18n.js';

const ARXIV_FEED_PREFIX = 'arXiv ';

const allFeeds = [
  // Official blogs (high priority — bypass relevance filter)
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', kind: 'official_blog', priority: 'high' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', kind: 'official_blog', priority: 'high' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', kind: 'official_blog', priority: 'high' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', kind: 'official_blog', priority: 'normal' },
  // Media
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', kind: 'media', priority: 'normal' },
  { name: 'MIT Technology Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', kind: 'media', priority: 'normal' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', kind: 'media', priority: 'normal' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', kind: 'media', priority: 'normal' },
  // Research
  { name: 'arXiv cs.CL', url: 'http://export.arxiv.org/rss/cs.CL', kind: 'research', priority: 'normal' },
  { name: 'arXiv cs.LG', url: 'http://export.arxiv.org/rss/cs.LG', kind: 'research', priority: 'normal' },
  { name: 'arXiv cs.AI', url: 'http://export.arxiv.org/rss/cs.AI', kind: 'research', priority: 'normal' },
  // Newsletters
  { name: 'Import AI', url: 'https://importai.substack.com/feed', kind: 'newsletter', priority: 'normal' },
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed', kind: 'newsletter', priority: 'normal' },
] satisfies FeedConfig[];

export function getEnabledFeeds(options?: { enableArxiv?: boolean }): FeedConfig[] {
  const enableArxiv = options?.enableArxiv ?? process.env.ENABLE_ARXIV !== 'false';
  if (enableArxiv) {
    return [...allFeeds];
  }

  return allFeeds.filter(feed => !feed.name.startsWith(ARXIV_FEED_PREFIX));
}

export const config = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v3.2-speciale',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  enableArxiv: process.env.ENABLE_ARXIV !== 'false',
  freshnessWindowHours: parseInt(process.env.FRESHNESS_WINDOW_HOURS || '24', 10),
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '15', 10),
  maxArticlesPerPoll: parseInt(process.env.MAX_ARTICLES_PER_POLL || '10', 10),
  logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  dataDir: join(process.cwd(), 'data'),

  /** Per-poll processing limit for arXiv articles (overflow stays in queue) */
  arxivMaxPerPoll: parseInt(process.env.ARXIV_MAX_PER_POLL || '15', 10),
  /** Feed name prefix to identify arXiv feeds */
  arxivFeedPrefix: ARXIV_FEED_PREFIX,

  /** AI relevance score threshold (1-10). Articles below this are filtered out. */
  relevanceThreshold: parseInt(process.env.RELEVANCE_THRESHOLD || '6', 10),

  /** Minimum snippet length to skip scraping (chars) */
  snippetMinLength: 300,
  /** Max enriched content length sent to summarizer (chars) */
  enrichedContentMaxLength: 3000,
  /** Scraping timeout per request (ms) */
  scrapingTimeoutMs: 10000,
  /** Rate limit delay between scraping requests to same domain (ms) */
  scrapingDomainDelayMs: 2000,
  feeds: getEnabledFeeds(),
} as const;

// Mutable runtime config (set by CLI args at startup)
export const runtimeConfig: { language: SupportedLanguage } = {
  language: 'en',
};

export function getMissingConfigKeys(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const requiredKeys = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = requiredKeys.filter(key => !env[key]);
  if (!env.OPENROUTER_API_KEY && !env.GEMINI_API_KEY) {
    missing.push('OPENROUTER_API_KEY or GEMINI_API_KEY');
  }
  return missing;
}
