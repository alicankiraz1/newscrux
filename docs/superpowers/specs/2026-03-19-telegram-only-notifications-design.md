# Telegram-Only Notifications Design

## Goal

Replace Pushover delivery with Telegram bot delivery so Newscrux sends startup messages, article summaries, and arXiv digests only to a Telegram bot chat.

## Scope

This change replaces the current notification transport while keeping the rest of the Newscrux pipeline intact:

- feed fetching
- relevance filtering
- enrichment
- summarization
- queue/state handling
- Uzbek language support

Included in scope:

- Telegram Bot API delivery
- new Telegram environment variables
- startup notification via Telegram
- article notification delivery via Telegram
- arXiv digest delivery via Telegram
- documentation updates

Out of scope:

- supporting both Pushover and Telegram at the same time
- adding inline buttons or rich Telegram keyboards
- changing article selection or summarization behavior

## Approach

Use the existing notification rendering flow, but replace the outbound transport from Pushover to Telegram.

The implementation will:

1. Remove the requirement for Pushover credentials
2. Add Telegram configuration for bot token and target chat ID
3. Replace the current sender module with a Telegram-focused sender
4. Keep message rendering close to the current format using Telegram HTML parse mode
5. Continue using the same summary fields and language-pack labels

This keeps the change localized and minimizes behavior changes outside delivery.

## Telegram Delivery Design

### Configuration

Required environment variables:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

`OPENROUTER_API_KEY` remains required for relevance filtering and summarization.

### Sending

Newscrux will send messages through the Telegram Bot API `sendMessage` endpoint:

- endpoint: `https://api.telegram.org/bot<TOKEN>/sendMessage`
- `chat_id`: configured target chat
- `text`: rendered notification body
- `parse_mode`: `HTML`
- `disable_web_page_preview`: `true`

### Message format

The current rendered structure will be preserved as much as possible:

- source line with emoji
- `Yangilik:` block
- `Nega muhim:` block
- key detail line
- article URL included in the message body since Telegram does not use Pushover-style `url` and `url_title` fields

For article notifications, the final message will include a direct article link near the end using the language pack label:

- `Maqolani ochish: <url>`

For non-Uzbek languages, the corresponding language-pack label will be used.

### Length handling

Telegram supports far larger messages than Pushover, so the current 1024-character cap can be relaxed. Even so, Newscrux should keep notifications concise and preserve the current trimming behavior to avoid overly long messages.

The existing truncation logic can remain with a Telegram-safe max length, or be lightly relaxed while preserving readability.

## Files Affected

- `src/config.ts`
  Replace Pushover config values with Telegram config values.

- `src/index.ts`
  Update startup validation and notification calls to use Telegram delivery.

- `src/pushover.ts`
  Replace with Telegram sender logic or rename to a Telegram-specific module.

- `.env.example`
  Replace Pushover-related variables with Telegram variables.

- `README.md`
  Update product description, setup steps, and environment variable docs.

## Error Handling

- If Telegram credentials are missing, Newscrux should fail fast at startup with a clear message.
- If Telegram delivery fails for an article, the queue entry should remain failed and be retried in the next cycle, matching existing behavior.
- If startup notification fails, the app should log the error and continue into the poll loop, matching the current behavior.

## Testing Strategy

Follow TDD:

1. Add a failing test for Telegram message rendering
2. Add a failing test for config validation expectations
3. Implement the minimal Telegram sender logic
4. Run targeted tests
5. Run build verification

If practical, unit-test the Telegram sender request-building logic without making real network calls.

## Risks And Mitigations

- HTML formatting differences between Pushover and Telegram
  Mitigation: keep escaping centralized and use Telegram-supported HTML only.

- Missing article links after removing Pushover URL fields
  Mitigation: embed the article URL directly in the message text.

- Hardcoded Pushover assumptions elsewhere in the codebase
  Mitigation: update validation, docs, and message rendering together in one change.

## Success Criteria

The work is complete when:

- Newscrux starts without any Pushover configuration
- Newscrux requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- startup notification is sent to Telegram
- article summaries are sent to Telegram
- arXiv digests are sent to Telegram
- setup docs reference Telegram instead of Pushover
