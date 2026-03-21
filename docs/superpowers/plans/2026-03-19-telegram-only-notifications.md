# Telegram-Only Notifications Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Pushover-based delivery with Telegram bot delivery while keeping the rest of the Newscrux pipeline unchanged.

**Architecture:** Swap the current notification transport for Telegram Bot API delivery and keep rendering in one shared sender module. Update startup validation, environment variables, and docs together so the runtime and setup flow stay consistent.

**Tech Stack:** TypeScript, Node.js, existing queue and summarization pipeline, Telegram Bot API over `fetch`, Node test runner with `tsx`

---

## Chunk 1: Tests For Telegram Notification Behavior

### Task 1: Add a failing render test for Telegram article notifications

**Files:**
- Create: `tests/telegram.test.ts`
- Test: `tests/telegram.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderNotification } from '../src/telegram.js';
import { runtimeConfig } from '../src/config.js';

test('renderNotification includes Uzbek labels and article link for Telegram', () => {
  runtimeConfig.language = 'uz';

  const result = renderNotification(
    {
      id: '1',
      state: 'summarized',
      feedName: 'OpenAI News',
      feedKind: 'official_blog',
      feedPriority: 'high',
      title: 'Original title',
      link: 'https://example.com/article',
      snippet: 'snippet',
      discoveredAt: 0,
      lastUpdatedAt: 0,
    },
    {
      translated_title: 'Tarjima sarlavha',
      what_happened: 'Bu yerda yangilik tafsilotlari bor.',
      why_it_matters: 'Bu foydalanuvchi uchun muhim.',
      key_detail: 'Muhim fakt',
      source_type: 'official_announcement',
    }
  );

  assert.equal(result.title, 'Tarjima sarlavha');
  assert.match(result.message, /<b>Yangilik:<\/b>/);
  assert.match(result.message, /<b>Nega muhim:<\/b>/);
  assert.match(result.message, /Maqolani ochish:/);
  assert.match(result.message, /https:\/\/example.com\/article/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/telegram.test.ts`
Expected: FAIL because the Telegram module does not exist yet.

### Task 2: Add a failing config test for Telegram-only validation expectations

**Files:**
- Create: `tests/config.test.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create a small test around a factored validation helper that expects Telegram credentials and no longer references Pushover credentials.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/config.test.ts`
Expected: FAIL because validation is still Pushover-based or the helper is not yet exposed.

## Chunk 2: Telegram Sender Implementation

### Task 3: Implement the Telegram sender module

**Files:**
- Create: `src/telegram.ts`
- Modify: `src/index.ts`
- Modify: `src/config.ts`
- Test: `tests/telegram.test.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Create the failing module boundary**

Export:

- `escapeHtml`
- `renderNotification`
- `sendNotification`
- `sendArticleNotification`

- [ ] **Step 2: Implement minimal Telegram request logic**

Use:

```ts
await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: config.telegramChatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }),
});
```

- [ ] **Step 3: Update article rendering for Telegram**

Preserve the existing body structure and append a labeled article link to the message body.

- [ ] **Step 4: Update startup validation**

Require:

- `OPENROUTER_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Do not require any Pushover variables.

- [ ] **Step 5: Replace sender imports in `src/index.ts`**

Update the app to use `src/telegram.ts` for startup, article sends, and arXiv digest sends.

- [ ] **Step 6: Run targeted tests**

Run: `node --import tsx --test tests/telegram.test.ts tests/config.test.ts tests/cli.test.ts tests/i18n.test.ts`
Expected: PASS

## Chunk 3: Environment And Documentation

### Task 4: Update setup files and docs for Telegram

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Replace Pushover variables in `.env.example`**

Add:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Remove or replace:

- `PUSHOVER_USER_KEY`
- `PUSHOVER_APP_TOKEN`

- [ ] **Step 2: Update README product description**

Replace Pushover references with Telegram bot delivery in setup steps, environment variable docs, and architecture text.

- [ ] **Step 3: Update quick-start instructions**

Document how to provide the bot token and chat ID.

- [ ] **Step 4: Run build verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Run full test verification**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Review git diff**

Run: `git diff -- src/index.ts src/config.ts src/telegram.ts .env.example README.md tests/telegram.test.ts tests/config.test.ts`
Expected: only Telegram-notification changes and related docs/tests.
