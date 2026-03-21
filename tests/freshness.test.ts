import assert from 'node:assert/strict';
import test from 'node:test';
import type { Article } from '../src/types.js';
import { filterFreshArticles, isFreshArticle, isValidPublishedAt } from '../src/freshness.js';

const NOW = Date.parse('2026-03-20T12:00:00.000Z');

function createArticle(id: string, publishedAt: string): Article {
  return {
    id,
    title: `Title ${id}`,
    link: `https://example.com/${id}`,
    snippet: 'snippet',
    source: 'OpenAI News',
    feedKind: 'official_blog',
    feedPriority: 'high',
    publishedAt,
  };
}

test('isValidPublishedAt returns false for invalid RSS dates', () => {
  assert.equal(isValidPublishedAt('not-a-date'), false);
});

test('isFreshArticle keeps articles published within the freshness window', () => {
  const article = createArticle('fresh', '2026-03-20T04:00:00.000Z');

  assert.equal(isFreshArticle(article, 24, NOW), true);
});

test('filterFreshArticles drops articles older than the freshness window', () => {
  const fresh = createArticle('fresh', '2026-03-20T04:00:00.000Z');
  const stale = createArticle('stale', '2026-03-19T10:59:59.000Z');

  const result = filterFreshArticles([fresh, stale], 24, NOW);

  assert.deepEqual(result.map(article => article.id), ['fresh']);
});

test('filterFreshArticles drops articles with invalid publishedAt values', () => {
  const invalid = createArticle('invalid', 'not-a-date');

  const result = filterFreshArticles([invalid], 24, NOW);

  assert.deepEqual(result, []);
});
