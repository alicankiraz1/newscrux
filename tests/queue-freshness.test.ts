import assert from 'node:assert/strict';
import test from 'node:test';
import { removeStalePendingEntries } from '../src/queue.js';
import type { ArticleQueue, QueueEntry } from '../src/types.js';

const NOW = Date.parse('2026-03-20T12:00:00.000Z');

function createEntry(id: string, state: QueueEntry['state'], publishedAt: string): QueueEntry {
  return {
    id,
    state,
    feedName: 'OpenAI News',
    feedKind: 'official_blog',
    feedPriority: 'high',
    title: `Title ${id}`,
    link: `https://example.com/${id}`,
    snippet: 'snippet',
    publishedAt,
    discoveredAt: 0,
    lastUpdatedAt: 0,
  };
}

test('removeStalePendingEntries removes stale pending entries and keeps sent entries', () => {
  const queue: ArticleQueue = {
    entries: {
      fresh: createEntry('fresh', 'discovered', '2026-03-20T04:00:00.000Z'),
      stale: createEntry('stale', 'summarized', '2026-03-19T10:59:59.000Z'),
      sent: createEntry('sent', 'sent', '2026-03-19T10:59:59.000Z'),
    },
    lastCleanup: 0,
    coldStartDone: true,
  };

  const removed = removeStalePendingEntries(queue, 24, NOW);

  assert.equal(removed, 1);
  assert.deepEqual(Object.keys(queue.entries).sort(), ['fresh', 'sent']);
});
