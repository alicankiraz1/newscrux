import assert from 'node:assert/strict';
import test from 'node:test';
import { getMissingConfigKeys } from '../src/config.js';

test('getMissingConfigKeys requires Telegram credentials and OpenRouter key', () => {
  assert.deepEqual(
    getMissingConfigKeys({
      OPENROUTER_API_KEY: '',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
    }),
    ['OPENROUTER_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
  );
});

test('getMissingConfigKeys does not require legacy Pushover credentials', () => {
  assert.deepEqual(
    getMissingConfigKeys({
      OPENROUTER_API_KEY: 'or-key',
      TELEGRAM_BOT_TOKEN: 'bot-token',
      TELEGRAM_CHAT_ID: 'chat-id',
      PUSHOVER_USER_KEY: '',
      PUSHOVER_APP_TOKEN: '',
    }),
    []
  );
});
