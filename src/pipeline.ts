import type { QueueEntry } from './types.js';

interface SelectDiscoveredBatchOptions {
  maxBatchSize: number;
  arxivFeedPrefix: string;
  enableArxiv: boolean;
}

export function selectDiscoveredBatch(
  discovered: QueueEntry[],
  options: SelectDiscoveredBatchOptions,
): QueueEntry[] {
  const { maxBatchSize, arxivFeedPrefix, enableArxiv } = options;
  const isArxiv = (entry: QueueEntry) => entry.feedName.startsWith(arxivFeedPrefix);

  const regular = discovered.filter(entry => !isArxiv(entry));
  if (!enableArxiv) {
    return regular.slice(0, maxBatchSize);
  }

  const arxiv = discovered.filter(isArxiv);
  return [...regular, ...arxiv].slice(0, maxBatchSize);
}
