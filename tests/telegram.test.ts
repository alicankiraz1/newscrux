import assert from 'node:assert/strict';
import test from 'node:test';
import { runtimeConfig } from '../src/config.js';
import { renderNotification } from '../src/telegram.js';
import type { QueueEntry, StructuredSummary } from '../src/types.js';

test('renderNotification includes Uzbek labels and article link for Telegram', () => {
  runtimeConfig.language = 'uz';

  const entry: QueueEntry = {
    id: '1',
    state: 'summarized',
    feedName: 'OpenAI News',
    feedKind: 'official_blog',
    feedPriority: 'high',
    title: 'Original title',
    link: 'https://example.com/article',
    snippet: 'snippet',
    publishedAt: '2026-03-20T00:00:00.000Z',
    discoveredAt: 0,
    lastUpdatedAt: 0,
  };

  const summary: StructuredSummary = {
    translated_title: 'Tarjima sarlavha',
    what_happened: 'Bu yerda yangilik tafsilotlari bor.',
    why_it_matters: 'Bu foydalanuvchi uchun muhim.',
    key_detail: 'Muhim fakt',
    source_type: 'official_announcement',
  };

  const result = renderNotification(entry, summary);

  assert.equal(result.title, 'Tarjima sarlavha');
  assert.match(result.message, /<b>Yangilik:<\/b>/);
  assert.match(result.message, /<b>Nega muhim:<\/b>/);
  assert.match(result.message, /Maqolani ochish:/);
  assert.match(result.message, /https:\/\/example\.com\/article/);
});
