import type { QueueEntry, StructuredSummary } from './types.js';

export async function sendImmediatelyIfRegular(
  entry: QueueEntry,
  summary: StructuredSummary,
  sendArticleNotification: (
    entry: QueueEntry,
    summary: StructuredSummary,
  ) => Promise<{ success: boolean; truncated: boolean }>,
  arxivFeedPrefix: string,
): Promise<{ attempted: boolean; success: boolean; truncated: boolean }> {
  if (entry.feedName.startsWith(arxivFeedPrefix)) {
    return { attempted: false, success: false, truncated: false };
  }

  const result = await sendArticleNotification(entry, summary);
  return { attempted: true, ...result };
}
