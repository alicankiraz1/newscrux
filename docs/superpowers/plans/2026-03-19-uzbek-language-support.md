# Uzbek Language Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Uzbek (Latin script) support so `newscrux --lang=uz` produces Uzbek summaries and Uzbek notification labels.

**Architecture:** Extend the existing language-pack architecture with a new `uz` entry and thread that supported language through the existing CLI and rendering flow. Keep the change localized to shared language definitions, prompt content, and docs, with small focused tests around supported-language parsing and language-pack lookup.

**Tech Stack:** TypeScript, Node.js, existing CLI parser, existing i18n language-pack system, minimal Node test runner

---

## Chunk 1: Test Harness And Supported Language Coverage

### Task 1: Add a minimal test script and first failing CLI test

**Files:**
- Modify: `package.json`
- Create: `tests/cli.test.ts`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli.js';

test('parseArgs accepts --lang=uz', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'newscrux', '--lang=uz'];

  try {
    assert.deepEqual(parseArgs(), { lang: 'uz' });
  } finally {
    process.argv = originalArgv;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/cli.test.ts`
Expected: FAIL because `uz` is not yet a supported language.

- [ ] **Step 3: Add the minimal test script**

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "tsx src/index.ts",
  "test": "node --import tsx --test tests/*.test.ts"
}
```

- [ ] **Step 4: Re-run the CLI test**

Run: `node --import tsx --test tests/cli.test.ts`
Expected: still FAIL for unsupported `uz`, confirming the test is valid.

## Chunk 2: Uzbek Language Pack

### Task 2: Add the failing i18n pack test

**Files:**
- Create: `tests/i18n.test.ts`
- Test: `tests/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getLanguagePack } from '../src/i18n.js';

test('getLanguagePack returns Uzbek labels', () => {
  const pack = getLanguagePack('uz');

  assert.equal(pack.name, 'Uzbek');
  assert.equal(pack.labels.whatHappened, "Yangilik:");
  assert.equal(pack.labels.whyItMatters, "Nega muhim:");
  assert.equal(pack.labels.readArticle, "Maqolani ochish");
  assert.equal(pack.labels.startupMessage, "Newscrux ishga tushdi! AI yangilik bildirishnomalari faol.");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/i18n.test.ts`
Expected: FAIL because `uz` language pack does not exist yet.

### Task 3: Implement the minimal language support

**Files:**
- Modify: `src/types.ts`
- Modify: `src/i18n.ts`
- Modify: `src/cli.ts`
- Test: `tests/cli.test.ts`
- Test: `tests/i18n.test.ts`

- [ ] **Step 1: Extend the supported language type**

```ts
export type SupportedLanguage = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'uz';
```

- [ ] **Step 2: Add the Uzbek language pack**

Implement a new `uz` entry in `src/i18n.ts` with:

```ts
name: 'Uzbek',
labels: {
  whatHappened: 'Yangilik:',
  whyItMatters: 'Nega muhim:',
  readArticle: "Maqolani ochish",
  startupMessage: 'Newscrux ishga tushdi! AI yangilik bildirishnomalari faol.'
}
```

Also add Uzbek feed kind labels and a full Uzbek summarizer prompt that requires Uzbek Latin JSON output and preserves the existing response schema.

- [ ] **Step 3: Update CLI help text if needed**

Ensure `SUPPORTED_LANGUAGES` and usage examples include `uz`.

- [ ] **Step 4: Run the targeted tests**

Run: `node --import tsx --test tests/cli.test.ts tests/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full test script**

Run: `npm test`
Expected: PASS

## Chunk 3: Documentation And Verification

### Task 4: Update public docs for Uzbek support

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Update README language references**

Change supported language count and examples so README mentions Uzbek and shows `--lang=uz` as a valid option.

- [ ] **Step 2: Update supported language tables**

Add Uzbek to the supported-language table and CLI/config examples.

- [ ] **Step 3: Update contribution guidance**

Ensure the language-extension instructions remain accurate now that Uzbek is built in.

- [ ] **Step 4: Run build verification**

Run: `npm run build`
Expected: PASS and emit `dist/` output without TypeScript errors.

- [ ] **Step 5: Run final verification**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Review git diff**

Run: `git diff -- src/types.ts src/i18n.ts src/cli.ts README.md CONTRIBUTING.md package.json tests/cli.test.ts tests/i18n.test.ts`
Expected: only Uzbek-support and test/doc changes relevant to this task.
