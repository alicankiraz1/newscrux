import assert from 'node:assert/strict';
import test from 'node:test';
import { sendImmediatelyIfRegular } from '../src/delivery.js';
import type { QueueEntry, StructuredSummary } from '../src/types.js';

function createEntry(feedName: string): QueueEntry {
  return {
    id: feedName,
    state: 'enriched',
    feedName,
    feedKind: feedName.startsWith('arXiv ') ? 'research' : 'media',
    feedPriority: 'normal',
    title: 'Title',
    link: 'https://example.com/article',
    snippet: 'snippet',
    discoveredAt: 0,
    lastUpdatedAt: 0,
  };
}

const summary: StructuredSummary = {
  translated_title: 'Tarjima',
  what_happened: 'Yangilik tafsiloti.',
  why_it_matters: 'Bu muhim.',
  key_detail: 'Fakt',
  source_type: 'media_report',
};

test('sendImmediatelyIfRegular sends non-arxiv summaries right away', async () => {
  let called = 0;

  const result = await sendImmediatelyIfRegular(
    createEntry('TechCrunch AI'),
    summary,
    async () => {
      called++;
      return { success: true, truncated: false };
    },
    'arXiv '
  );

  assert.equal(called, 1);
  assert.deepEqual(result, { attempted: true, success: true, truncated: false });
});

test('sendImmediatelyIfRegular skips arxiv summaries for later digest delivery', async () => {
  let called = 0;

  const result = await sendImmediatelyIfRegular(
    createEntry('arXiv cs.CL'),
    summary,
    async () => {
      called++;
      return { success: true, truncated: false };
    },
    'arXiv '
  );

  assert.equal(called, 0);
  assert.deepEqual(result, { attempted: false, success: false, truncated: false });
});
