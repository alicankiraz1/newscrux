# Uzbek Language Support Design

## Goal

Add full Uzbek (Latin script) language support to Newscrux so users can run the app with `--lang=uz` and receive AI-generated summaries and notification labels fully in Uzbek.

## Scope

This change adds Uzbek as a first-class language in the existing multilingual architecture. It includes:

- CLI support for `uz`
- Uzbek notification labels and feed kind labels
- Uzbek summarizer system prompt and JSON field instructions
- Documentation updates for supported languages and usage examples

This change does not alter feed fetching, queue behavior, relevance filtering, or notification delivery logic.

## Approach

Use the existing language-pack design without refactoring the current architecture.

The implementation will:

1. Extend `SupportedLanguage` with `uz`
2. Add a new `uz` entry to `LANGUAGES` in `src/i18n.ts`
3. Reuse the current runtime language selection flow in CLI, summarizer, and pushover rendering
4. Update README and contribution docs to describe the new language

This keeps the change localized and minimizes regression risk.

## Language Content Design

The Uzbek pack will provide:

- Language name: `Uzbek`
- Feed labels translated into natural Uzbek
- Notification labels in Uzbek Latin script
- A summarizer prompt written in Uzbek so the model returns:
  - `translated_title`
  - `what_happened`
  - `why_it_matters`
  - `key_detail`
  - `source_type`

Planned notification labels:

- `whatHappened`: `Yangilik:`
- `whyItMatters`: `Nega muhim:`
- `readArticle`: `Maqolani ochish`
- `startupMessage`: `Newscrux ishga tushdi! AI yangilik bildirishnomalari faol.`

The prompt will explicitly require Uzbek Latin output, concise titles, and complete structured JSON in the same style as the existing language packs.

## Files Affected

- `src/types.ts`
  Add `uz` to the supported language union.

- `src/i18n.ts`
  Add the Uzbek language pack including labels, feed-type translations, and summary prompt.

- `src/cli.ts`
  No structural change expected; supported values should update automatically from shared language definitions. Minor help text updates may occur if needed.

- `README.md`
  Update supported language counts, examples, and CLI docs to include Uzbek.

- `CONTRIBUTING.md`
  Keep language-extension guidance accurate after adding `uz`.

## Testing Strategy

Follow TDD:

1. Add a test that proves `uz` is accepted as a supported CLI language
2. Add a test that verifies `getLanguagePack('uz')` returns the expected Uzbek labels
3. Watch the new tests fail
4. Implement the minimal production changes
5. Run the targeted tests
6. Run build verification

If the repository does not already have a test harness, add the smallest practical test setup for the touched logic only.

## Risks And Mitigations

- Prompt quality risk
  Mitigation: mirror the structure and guardrails used by existing language packs.

- Inconsistent Uzbek wording across UI and AI output
  Mitigation: keep all user-facing labels and prompt instructions in one language pack.

- Docs drifting from implementation
  Mitigation: update README and contribution docs in the same change.

## Success Criteria

The work is complete when:

- `newscrux --lang=uz` is accepted by the CLI
- Uzbek labels appear in rendered notifications
- Summaries are requested in Uzbek via the language pack prompt
- Documentation lists Uzbek among supported languages
