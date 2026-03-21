import assert from 'node:assert/strict';
import test from 'node:test';
import { sendWithFallback } from '../src/llm.js';

test('sendWithFallback returns primary provider result when OpenRouter succeeds', async () => {
  const calls: string[] = [];

  const result = await sendWithFallback({
    systemPrompt: 'system',
    userPrompt: 'user',
    primaryProvider: async () => {
      calls.push('primary');
      return 'from-openrouter';
    },
    fallbackProvider: async () => {
      calls.push('fallback');
      return 'from-gemini';
    },
  });

  assert.equal(result.text, 'from-openrouter');
  assert.equal(result.provider, 'openrouter');
  assert.deepEqual(calls, ['primary']);
});

test('sendWithFallback falls back to Gemini when the primary provider fails', async () => {
  const calls: string[] = [];

  const result = await sendWithFallback({
    systemPrompt: 'system',
    userPrompt: 'user',
    primaryProvider: async () => {
      calls.push('primary');
      throw new Error('openrouter failed');
    },
    fallbackProvider: async () => {
      calls.push('fallback');
      return 'from-gemini';
    },
  });

  assert.equal(result.text, 'from-gemini');
  assert.equal(result.provider, 'gemini');
  assert.deepEqual(calls, ['primary', 'fallback']);
});

test('sendWithFallback rethrows the primary error when no fallback provider is available', async () => {
  await assert.rejects(
    sendWithFallback({
      systemPrompt: 'system',
      userPrompt: 'user',
      primaryProvider: async () => {
        throw new Error('openrouter failed');
      },
      fallbackProvider: null,
    }),
    /openrouter failed/
  );
});
