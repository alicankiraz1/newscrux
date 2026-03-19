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

interface ProcessSummarizedEntryArgs {
  entry: QueueEntry;
  summary: StructuredSummary;
  arxivFeedPrefix: string;
  sendArticleNotification: (
    entry: QueueEntry,
    summary: StructuredSummary,
  ) => Promise<{ success: boolean; truncated: boolean }>;
  transitionEntry: (id: string, newState: 'summarized' | 'sent', updates?: Partial<QueueEntry>) => void;
  markFailed: (id: string, error: string) => void;
  saveArticleQueue: () => void;
  onSummarized: () => void;
  onSent: (truncated: boolean) => void;
  onSendFailed: () => void;
}

export async function processSummarizedEntry({
  entry,
  summary,
  arxivFeedPrefix,
  sendArticleNotification,
  transitionEntry,
  markFailed,
  saveArticleQueue,
  onSummarized,
  onSent,
  onSendFailed,
}: ProcessSummarizedEntryArgs): Promise<void> {
  const immediateDelivery = await sendImmediatelyIfRegular(
    entry,
    summary,
    sendArticleNotification,
    arxivFeedPrefix,
  );

  if (immediateDelivery.attempted) {
    if (immediateDelivery.success) {
      transitionEntry(entry.id, 'sent', { structuredSummary: summary });
      saveArticleQueue();
      onSummarized();
      onSent(immediateDelivery.truncated);
      return;
    }

    transitionEntry(entry.id, 'summarized', { structuredSummary: summary });
    markFailed(entry.id, 'Telegram send failed');
    saveArticleQueue();
    onSummarized();
    onSendFailed();
    return;
  }

  transitionEntry(entry.id, 'summarized', { structuredSummary: summary });
  saveArticleQueue();
  onSummarized();
}
