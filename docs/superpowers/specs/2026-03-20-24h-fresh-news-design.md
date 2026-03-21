# 24-Hour Fresh News Filter Design

## Goal

Limit Newscrux delivery to only recent AI news from the last 24 hours so users do not receive stale backlog items.

## Scope

This change adds a freshness window to article intake and queue cleanup while keeping the rest of the pipeline intact:

- feed fetching
- deduplication
- queue persistence
- relevance filtering
- enrichment
- summarization
- Telegram delivery

Included in scope:

- a configurable freshness window in hours
- filtering fetched articles by `publishedAt`
- preserving `publishedAt` inside queue entries
- removing unsent queue items that have aged out of the freshness window
- documentation updates
- automated tests

Out of scope:

- changing relevance scoring
- changing supported feeds
- changing language behavior
- changing Telegram message format

## Approach

Use RSS publication time as the source of truth for freshness.

The implementation will:

1. Add a new config value, `FRESHNESS_WINDOW_HOURS`, defaulting to `24`
2. Filter fetched articles before discovery so only entries published within the freshness window continue through the pipeline
3. Persist `publishedAt` on queue entries so queued items can be re-evaluated on later poll cycles
4. Remove pending queue entries that are older than the freshness window before they consume relevance, enrichment, or summarization capacity
5. Log when items are skipped or cleaned up for freshness reasons

This keeps stale items out of the system early and prevents old backlog from resurfacing after restarts.

## Freshness Design

### Source of truth

Freshness is determined from each article's RSS `publishedAt` value. The freshness check compares:

- `now`
- minus `FRESHNESS_WINDOW_HOURS`
- against `publishedAt`

An article is fresh only if it was published within that rolling window.

### Fetch-time filtering

After feed fetch and deduplication, Newscrux will drop articles older than the freshness window before discovery.

This is the main control point because it stops stale articles from entering the queue at all.

### Queue-time cleanup

Before processing each poll cycle, Newscrux will remove unsent queue entries that are no longer fresh. This includes entries in:

- `discovered`
- `enriched`
- `summarized`

Entries already marked `sent` can remain for deduplication history and cleanup policy purposes.

### Invalid or missing dates

If `publishedAt` cannot be parsed into a valid timestamp, Newscrux should skip that article and log a warning.

This is safer than treating an invalid date as fresh and accidentally delivering stale content.

## Files Affected

- `src/types.ts`
  Add `publishedAt` to `QueueEntry`.

- `src/config.ts`
  Add `FRESHNESS_WINDOW_HOURS` config.

- `src/feeds.ts`
  Filter fetched articles by freshness after deduplication and sorting, or via a small shared helper used by fetch/discovery flow.

- `src/queue.ts`
  Persist `publishedAt` on discovered and cold-start entries, and add stale pending queue cleanup support.

- `src/index.ts`
  Invoke queue freshness cleanup during poll startup and include related logging.

- `README.md`
  Document the 24-hour default behavior and the new environment variable.

- `.env.example`
  Add the new environment variable.

## Error Handling

- If `FRESHNESS_WINDOW_HOURS` is invalid, config should still parse deterministically using the existing pattern; a small positive integer default should remain the fallback behavior.
- If `publishedAt` is invalid, the article should be skipped with a warning instead of entering the queue.
- If a queue entry lacks `publishedAt`, treat it as stale for pending states and remove it during cleanup.

## Testing Strategy

Follow TDD:

1. Add a failing test for fresh vs stale article filtering
2. Add a failing test for pending stale queue cleanup
3. Add a failing test for queue entries preserving `publishedAt`
4. Implement the minimal helpers and wiring
5. Run targeted tests
6. Run build and full test verification

## Risks And Mitigations

- Some feeds may publish inconsistent timestamps
  Mitigation: validate `publishedAt` and skip invalid entries with explicit logs.

- Older queue entries may disappear immediately after rollout
  Mitigation: this is expected and aligned with the new goal of receiving only recent news.

- Freshness logic duplicated in multiple places
  Mitigation: factor date-window checks into one small helper module or one queue-focused utility path.

## Success Criteria

The work is complete when:

- Newscrux only discovers articles published within the last 24 hours by default
- pending stale queue entries are removed before processing
- regular AI news notifications reflect recent items only
- no old backlog is delivered after restart
- docs explain the new freshness behavior and config
