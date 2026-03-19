// src/relevance.ts
import { config } from './config.js';
import { llm } from './llm.js';
import { createLogger } from './logger.js';
import type { QueueEntry } from './types.js';

const log = createLogger('relevance');

const RELEVANCE_PROMPT = `Sen bir AI/ML haber filtresisin.
Sana makale başlıkları ve açıklamaları verilecek.
Her makale için 1-10 arası bir "ilgililik puanı" ver.
Puanlama kriteri: makale yapay zeka, makine öğrenmesi, derin öğrenme, LLM, NLP, bilgisayarlı görü, robotik, AI donanımı/çipleri veya bu alanların doğrudan uygulamalarıyla ilgiliyse yüksek puan ver.
Genel teknoloji, iklim, biyoteknoloji, uzay, politika gibi AI ile doğrudan ilgisi olmayan konulara düşük puan ver.

Yanıtını SADECE şu JSON formatında ver, başka metin ekleme:
[{"id": 0, "score": 8}, {"id": 1, "score": 3}, ...]

id = makalenin sıra numarası (0'dan başlar), score = 1-10 arası puan.`;

const MAX_RETRIES = 2;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface RelevanceResult {
  passed: QueueEntry[];
  dropped: Array<{ entry: QueueEntry; score: number }>;
  bypassed: QueueEntry[];
  parseError: boolean;
}

export async function filterByRelevance(entries: QueueEntry[]): Promise<RelevanceResult> {
  const bypassed: QueueEntry[] = [];
  const toScore: QueueEntry[] = [];

  for (const entry of entries) {
    if (entry.feedPriority === 'high') {
      bypassed.push(entry);
    } else {
      toScore.push(entry);
    }
  }

  if (bypassed.length > 0) {
    log.info(`Relevance bypass: ${bypassed.length} high-priority entries`);
  }

  if (toScore.length === 0) {
    return { passed: [], dropped: [], bypassed, parseError: false };
  }

  const list = toScore
    .map((e, i) => `${i}. [${e.feedName}] ${e.title}\n   ${e.snippet.trim()}`)
    .join('\n');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await llm.chat.completions.create({
        model: config.llmModel,
        messages: [
          { role: 'system', content: RELEVANCE_PROMPT },
          { role: 'user', content: list },
        ],
      });

      const text = result.choices?.[0]?.message?.content ?? '';

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        log.warn('No JSON array found in relevance response');
        if (attempt < MAX_RETRIES) {
          await delay(Math.pow(2, attempt + 1) * 1000);
          continue;
        }
        return { passed: [], dropped: [], bypassed, parseError: true };
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ id: number; score: number }>;
      const scores = new Map<number, number>();
      for (const entry of parsed) {
        if (typeof entry.id === 'number' && typeof entry.score === 'number') {
          scores.set(entry.id, entry.score);
        }
      }

      const threshold = config.relevanceThreshold;
      const passed: QueueEntry[] = [];
      const dropped: Array<{ entry: QueueEntry; score: number }> = [];

      for (let i = 0; i < toScore.length; i++) {
        const score = scores.get(i);
        if (score === undefined) {
          passed.push(toScore[i]);
        } else if (score >= threshold) {
          passed.push(toScore[i]);
        } else {
          dropped.push({ entry: toScore[i], score });
        }
      }

      if (dropped.length > 0) {
        log.info(
          `Relevance dropped ${dropped.length}: ${dropped.map(d => `"${d.entry.title}" (${d.score}/${threshold})`).join(', ')}`
        );
      }
      log.info(`Relevance: ${passed.length}/${toScore.length} passed (threshold ${threshold})`);

      return { passed, dropped, bypassed, parseError: false };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt + 1) * 1000;
        log.warn(`Relevance attempt ${attempt + 1} failed, retrying in ${backoffMs}ms: ${err}`);
        await delay(backoffMs);
      } else {
        log.error('Relevance check failed after retries — entries stay discovered for retry', err);
        return { passed: [], dropped: [], bypassed, parseError: true };
      }
    }
  }

  return { passed: [], dropped: [], bypassed, parseError: true };
}
