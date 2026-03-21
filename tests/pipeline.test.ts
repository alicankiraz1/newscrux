import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueueEntry } from '../src/types.js';
import { getEnabledFeeds } from '../src/config.js';
import { selectDiscoveredBatch } from '../src/pipeline.js';

function createEntry(id: string, feedName: string): QueueEntry {
  return {
    id,
    state: 'discovered',
    feedName,
    feedKind: feedName.startsWith('arXiv ') ? 'research' : 'media',
    feedPriority: 'normal',
    title: `Title ${id}`,
    link: `https://example.com/${id}`,
    snippet: 'snippet',
    publishedAt: '2026-03-20T00:00:00.000Z',
    discoveredAt: 0,
    lastUpdatedAt: 0,
  };
}

test('getEnabledFeeds excludes arXiv feeds when arXiv is disabled', () => {
  const feeds = getEnabledFeeds({ enableArxiv: false });

  assert.equal(feeds.some(feed => feed.name.startsWith('arXiv ')), false);
  assert.equal(feeds.some(feed => feed.name === 'OpenAI News'), true);
});

test('selectDiscoveredBatch prioritizes regular news before arXiv entries', () => {
  const discovered = [
    createEntry('1', 'arXiv cs.CL'),
    createEntry('2', 'arXiv cs.LG'),
    createEntry('3', 'OpenAI News'),
    createEntry('4', 'TechCrunch AI'),
  ];

  const batch = selectDiscoveredBatch(discovered, {
    maxBatchSize: 2,
    arxivFeedPrefix: 'arXiv ',
    enableArxiv: true,
  });

  assert.deepEqual(batch.map(entry => entry.id), ['3', '4']);
});

test('selectDiscoveredBatch skips arXiv entries entirely when arXiv is disabled', () => {
  const discovered = [
    createEntry('1', 'arXiv cs.CL'),
    createEntry('2', 'OpenAI News'),
  ];

  const batch = selectDiscoveredBatch(discovered, {
    maxBatchSize: 2,
    arxivFeedPrefix: 'arXiv ',
    enableArxiv: false,
  });

  assert.deepEqual(batch.map(entry => entry.id), ['2']);
});
