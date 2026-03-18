# Newscrux Global Release Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Internationalize, professionalize, and rename the project to Newscrux with 5-language support, CLI arg parsing, and GitHub Showcase README.

**Architecture:** Add `src/i18n.ts` (language packs) and `src/cli.ts` (arg parser) as new modules. Update summarizer and pushover to consume language packs. Rename all references from rssfeedy-pi to newscrux. Rewrite README in English. `config.ts` `as const` is preserved; a separate mutable `runtimeConfig` object holds the CLI-selected language.

**Tech Stack:** TypeScript 5.7, Node.js 18+ (ESM), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-18-global-release-design.md`

---

## File Structure

| File | Responsibility | Status |
|------|---------------|--------|
| `src/i18n.ts` | Language packs for 5 languages: summary prompts, notification labels | Create |
| `src/cli.ts` | CLI argument parser: --lang, --help, --version | Create |
| `src/types.ts` | Rename `title_tr` → `translated_title`, re-export `SupportedLanguage` | Modify |
| `src/config.ts` | Add `runtimeConfig` with mutable `language` field | Modify |
| `src/summarizer.ts` | Use i18n language pack for prompts, `translated_title` field | Modify |
| `src/pushover.ts` | Use i18n labels, `translated_title` with fallback | Modify |
| `src/index.ts` | CLI parsing, Newscrux branding, i18n startup message, shebang | Modify |
| `src/feeds.ts` | User-Agent → `Newscrux/2.0` | Modify |
| `src/extractor.ts` | User-Agent → `Newscrux/2.0` | Modify |
| `package.json` | Rename, metadata, bin entry | Modify |
| `newscrux.service` | systemd service file with %h paths | Create |
| `rssfeedy-pi.service` | Delete old service file | Delete |
| `.env.example` | Updated branding | Modify |
| `README.md` | Complete English rewrite, GitHub Showcase | Modify |
| `CONTRIBUTING.md` | Short contribution guide | Create |

---

## Chunk 1: Foundation — i18n, CLI, Types, Config

### Task 1: Create src/i18n.ts — Language packs for 5 languages

**Files:**
- Create: `src/i18n.ts`

- [ ] **Step 1: Create src/i18n.ts with all 5 language packs**

```typescript
// src/i18n.ts
import type { FeedKind } from './types.js';

export type SupportedLanguage = 'en' | 'tr' | 'de' | 'fr' | 'es';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'tr', 'de', 'fr', 'es'];

export interface LanguagePack {
  name: string;
  summarySystemPrompt: (kindLabel: string, sourceType: string) => string;
  kindLabels: Record<FeedKind, string>;
  labels: {
    whatHappened: string;
    whyItMatters: string;
    readMore: string;
    readArticle: string;
    startupMessage: string;
  };
}

const en: LanguagePack = {
  name: 'English',
  kindLabels: {
    official_blog: 'official blog post',
    media: 'news report',
    research: 'research paper',
    newsletter: 'technical newsletter',
  },
  labels: {
    whatHappened: 'What happened:',
    whyItMatters: 'Why it matters:',
    readMore: 'Read More',
    readArticle: 'Read Article',
    startupMessage: 'Newscrux started! AI news notifications active.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `You are a technology news analysis system.
You are given a ${kindLabel}. Analyze it and produce output in the following JSON format in English.

Required JSON format:
{
  "translated_title": "English headline (single line, concise)",
  "what_happened": "What happened — at least 2-3 sentences with details",
  "why_it_matters": "Why it matters — at least 1-2 sentences on practical impact",
  "key_detail": "One critical detail, number, or noteworthy fact",
  "source_type": "${sourceType}"
}

Rules:
- All text must be in English.
- what_happened must be at least 50 characters.
- why_it_matters must be at least 20 characters.
- Use standard English technical terminology.
- Return ONLY valid JSON, no other text.`,
};

const tr: LanguagePack = {
  name: 'Turkish',
  kindLabels: {
    official_blog: 'resmi blog/duyuru',
    media: 'medya haberi',
    research: 'araştırma makalesi',
    newsletter: 'teknik bülten',
  },
  labels: {
    whatHappened: 'Ne oldu:',
    whyItMatters: 'Neden önemli:',
    readMore: 'Devamını Oku',
    readArticle: 'Makaleyi Oku',
    startupMessage: 'Newscrux başlatıldı! AI haber bildirimleri aktif.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Sen bir teknoloji haberleri analiz sistemisin.
Sana bir ${kindLabel} veriliyor. Analiz edip aşağıdaki JSON formatında Türkçe çıktı üret.

Zorunlu JSON formatı:
{
  "translated_title": "Haberin Türkçe başlığı (tek satır, kısa ve öz)",
  "what_happened": "Ne oldu — en az 2-3 cümle detaylı açıklama",
  "why_it_matters": "Neden önemli — en az 1-2 cümle, pratik etki ve sonuçlar",
  "key_detail": "Bir kritik detay, rakam veya dikkat çeken bilgi",
  "source_type": "${sourceType}"
}

Kurallar:
- Tüm metin Türkçe olmalı.
- what_happened en az 50 karakter olmalı.
- why_it_matters en az 20 karakter olmalı.
- Teknik terimlerin Türkçe karşılığı varsa kullan, yoksa orijinalini koru.
- SADECE geçerli JSON döndür, başka metin ekleme.`,
};

const de: LanguagePack = {
  name: 'German',
  kindLabels: {
    official_blog: 'offizieller Blogbeitrag',
    media: 'Nachrichtenbericht',
    research: 'Forschungsarbeit',
    newsletter: 'technischer Newsletter',
  },
  labels: {
    whatHappened: 'Was passiert ist:',
    whyItMatters: 'Warum es wichtig ist:',
    readMore: 'Weiterlesen',
    readArticle: 'Artikel lesen',
    startupMessage: 'Newscrux gestartet! KI-Nachrichtenbenachrichtigungen aktiv.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Du bist ein Technologie-Nachrichtenanalysesystem.
Dir wird ein ${kindLabel} gegeben. Analysiere ihn und erstelle eine Ausgabe im folgenden JSON-Format auf Deutsch.

Erforderliches JSON-Format:
{
  "translated_title": "Deutsche Schlagzeile (eine Zeile, prägnant)",
  "what_happened": "Was passiert ist — mindestens 2-3 Sätze mit Details",
  "why_it_matters": "Warum es wichtig ist — mindestens 1-2 Sätze zur praktischen Auswirkung",
  "key_detail": "Ein kritisches Detail, eine Zahl oder bemerkenswerte Tatsache",
  "source_type": "${sourceType}"
}

Regeln:
- Der gesamte Text muss auf Deutsch sein.
- what_happened muss mindestens 50 Zeichen lang sein.
- why_it_matters muss mindestens 20 Zeichen lang sein.
- Verwende deutsche Fachbegriffe, wo verfügbar, sonst die englischen Originale.
- Gib NUR gültiges JSON zurück, keinen anderen Text.`,
};

const fr: LanguagePack = {
  name: 'French',
  kindLabels: {
    official_blog: 'article de blog officiel',
    media: 'article de presse',
    research: 'article de recherche',
    newsletter: 'newsletter technique',
  },
  labels: {
    whatHappened: 'Ce qui s\'est passé\u00A0:',
    whyItMatters: 'Pourquoi c\'est important\u00A0:',
    readMore: 'Lire la suite',
    readArticle: 'Lire l\'article',
    startupMessage: 'Newscrux démarré\u00A0! Notifications d\'actualités IA actives.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Tu es un système d'analyse d'actualités technologiques.
On te donne un ${kindLabel}. Analyse-le et produis une sortie au format JSON suivant en français.

Format JSON requis:
{
  "translated_title": "Titre en français (une ligne, concis)",
  "what_happened": "Ce qui s'est passé — au moins 2-3 phrases détaillées",
  "why_it_matters": "Pourquoi c'est important — au moins 1-2 phrases sur l'impact pratique",
  "key_detail": "Un détail critique, un chiffre ou un fait notable",
  "source_type": "${sourceType}"
}

Règles:
- Tout le texte doit être en français.
- what_happened doit contenir au moins 50 caractères.
- why_it_matters doit contenir au moins 20 caractères.
- Utilise la terminologie technique française quand elle existe, sinon garde l'original anglais.
- Renvoie UNIQUEMENT du JSON valide, pas d'autre texte.`,
};

const es: LanguagePack = {
  name: 'Spanish',
  kindLabels: {
    official_blog: 'publicación oficial del blog',
    media: 'artículo de prensa',
    research: 'artículo de investigación',
    newsletter: 'boletín técnico',
  },
  labels: {
    whatHappened: 'Qué pasó:',
    whyItMatters: 'Por qué importa:',
    readMore: 'Leer más',
    readArticle: 'Leer artículo',
    startupMessage: 'Newscrux iniciado. Notificaciones de noticias de IA activas.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Eres un sistema de análisis de noticias tecnológicas.
Se te da un ${kindLabel}. Analízalo y produce una salida en el siguiente formato JSON en español.

Formato JSON requerido:
{
  "translated_title": "Titular en español (una línea, conciso)",
  "what_happened": "Qué pasó — al menos 2-3 oraciones con detalles",
  "why_it_matters": "Por qué importa — al menos 1-2 oraciones sobre el impacto práctico",
  "key_detail": "Un detalle crítico, número o dato notable",
  "source_type": "${sourceType}"
}

Reglas:
- Todo el texto debe estar en español.
- what_happened debe tener al menos 50 caracteres.
- why_it_matters debe tener al menos 20 caracteres.
- Usa terminología técnica en español cuando exista, de lo contrario mantén el original en inglés.
- Devuelve SOLO JSON válido, sin otro texto.`,
};

const LANGUAGES: Record<SupportedLanguage, LanguagePack> = { en, tr, de, fr, es };

export function getLanguagePack(lang: SupportedLanguage): LanguagePack {
  return LANGUAGES[lang];
}
```

- [ ] **Step 2: Verify build (other files will have errors — that's expected)**

Run: `cd "/Users/alican/Desktop/Cursor Projects/AiNews-Pushover" && npx tsc --noEmit 2>&1 | grep i18n`

Expected: No errors from i18n.ts.

- [ ] **Step 3: Commit**

```bash
git add src/i18n.ts
git commit -m "feat: add i18n language packs for 5 languages (en, tr, de, fr, es)"
```

---

### Task 2: Create src/cli.ts — CLI argument parser

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Create src/cli.ts**

```typescript
// src/cli.ts
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function printHelp(): void {
  console.log(`Newscrux — AI-powered news aggregator with push notifications

Usage: newscrux [options]

Options:
  -l, --lang <code>   Summary language: ${SUPPORTED_LANGUAGES.join(', ')} (default: "en")
  -h, --help          Show this help message
  -v, --version       Show version number

Environment variables (.env):
  OPENROUTER_API_KEY    OpenRouter API key (required)
  PUSHOVER_USER_KEY     Pushover user key (required)
  PUSHOVER_APP_TOKEN    Pushover app token (required)
  OPENROUTER_MODEL      AI model (default: deepseek/deepseek-v3.2-speciale)
  POLL_INTERVAL_MINUTES Poll interval in minutes (default: 15)

Examples:
  newscrux --lang=tr    Start with Turkish summaries
  newscrux -l de        Start with German summaries
  newscrux              Start with English summaries (default)`);
}

export function parseArgs(): { lang: SupportedLanguage } {
  const args = process.argv.slice(2);
  let lang: SupportedLanguage = 'en';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    if (arg === '-v' || arg === '--version') {
      console.log(getVersion());
      process.exit(0);
    }

    // --lang=xx format
    if (arg.startsWith('--lang=')) {
      const value = arg.split('=')[1];
      if (!SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)) {
        console.error(`Error: Unsupported language "${value}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
        process.exit(1);
      }
      lang = value as SupportedLanguage;
      continue;
    }

    // --lang xx or -l xx format
    if (arg === '--lang' || arg === '-l') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`Error: --lang requires a language code. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
        process.exit(1);
      }
      if (!SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)) {
        console.error(`Error: Unsupported language "${value}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
        process.exit(1);
      }
      lang = value as SupportedLanguage;
      i++; // skip next arg (the value)
      continue;
    }
  }

  return { lang };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI argument parser (--lang, --help, --version)"
```

---

### Task 3: Update src/types.ts — Rename title_tr to translated_title

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Rename title_tr to translated_title in StructuredSummary**

In `src/types.ts`, change line 32 from:
```typescript
  title_tr: string;
```
to:
```typescript
  translated_title: string;
```

Also add re-export of SupportedLanguage at the top, after the existing imports. Add this line after the `FeedKind` type definition (after line 5):

```typescript
export type { SupportedLanguage } from './i18n.js';
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "refactor: rename title_tr to translated_title, re-export SupportedLanguage"
```

---

### Task 4: Update src/config.ts — Add mutable runtime config

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add runtimeConfig export**

Add these lines at the end of `src/config.ts` (after the `} as const;` line):

```typescript

// Mutable runtime config (set by CLI args at startup)
import type { SupportedLanguage } from './i18n.js';

export const runtimeConfig: { language: SupportedLanguage } = {
  language: 'en',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add mutable runtimeConfig for CLI-selected language"
```

---

## Chunk 2: Module Integration — Summarizer, Pushover, Index, Feeds, Extractor

### Task 5: Rewrite src/summarizer.ts — Use i18n language packs

**Files:**
- Modify: `src/summarizer.ts`

- [ ] **Step 1: Replace entire src/summarizer.ts**

```typescript
// src/summarizer.ts
import { OpenRouter } from '@openrouter/sdk';
import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { getLanguagePack } from './i18n.js';
import type { QueueEntry, StructuredSummary, FeedKind } from './types.js';

const log = createLogger('summarizer');

const openrouter = new OpenRouter({
  apiKey: config.openrouterApiKey,
});

const KIND_TO_SOURCE_TYPE: Record<FeedKind, StructuredSummary['source_type']> = {
  official_blog: 'official_announcement',
  media: 'media_report',
  research: 'research',
  newsletter: 'newsletter',
};

const MAX_RETRIES = 1;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractResponseText(result: any): string {
  const rawContent = result.choices?.[0]?.message?.content;
  if (typeof rawContent === 'string') return rawContent;
  if (Array.isArray(rawContent)) {
    return rawContent
      .filter((item: any): item is { type: 'text'; text: string } => item.type === 'text')
      .map((item: any) => item.text)
      .join('');
  }
  return '';
}

function parseAndValidateSummary(text: string, feedKind: FeedKind): StructuredSummary | null {
  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);

    // Accept both translated_title and title_tr (backward compat)
    const translatedTitle = parsed.translated_title || parsed.title_tr;

    const fields = { translated_title: translatedTitle, what_happened: parsed.what_happened, why_it_matters: parsed.why_it_matters, key_detail: parsed.key_detail, source_type: parsed.source_type };
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        log.warn(`Missing or empty field: ${field}`);
        return null;
      }
    }

    if (parsed.what_happened.length < 50) {
      log.warn(`what_happened too short: ${parsed.what_happened.length} chars (min 50)`);
      return null;
    }
    if (parsed.why_it_matters.length < 20) {
      log.warn(`why_it_matters too short: ${parsed.why_it_matters.length} chars (min 20)`);
      return null;
    }

    const expectedSourceType = KIND_TO_SOURCE_TYPE[feedKind];
    if (parsed.source_type !== expectedSourceType) {
      log.debug(`source_type mismatch: model="${parsed.source_type}" vs config="${expectedSourceType}" — using config`);
    }

    return {
      translated_title: translatedTitle.trim(),
      what_happened: parsed.what_happened.trim(),
      why_it_matters: parsed.why_it_matters.trim(),
      key_detail: parsed.key_detail.trim(),
      source_type: expectedSourceType,
    };
  } catch (err) {
    log.warn(`JSON parse error: ${err}`);
    return null;
  }
}

export async function summarizeEntry(entry: QueueEntry): Promise<StructuredSummary | null> {
  const content = entry.enrichedContent || entry.snippet;
  const pack = getLanguagePack(runtimeConfig.language);
  const kindLabel = pack.kindLabels[entry.feedKind];
  const sourceType = KIND_TO_SOURCE_TYPE[entry.feedKind];
  const systemPrompt = pack.summarySystemPrompt(kindLabel, sourceType);

  const userContent = `Title: ${entry.title}\nSource: ${entry.feedName}\nSource type: ${entry.feedKind}\n\nContent:\n${content}`;

  log.debug(`Summarizing: ${entry.title}`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await openrouter.chat.send({
        model: config.openrouterModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      });

      const text = extractResponseText(result);
      const summary = parseAndValidateSummary(text, entry.feedKind);

      if (summary) {
        log.info(`Summarized: ${entry.title} (${summary.what_happened.length} chars)`);
        return summary;
      }

      if (attempt < MAX_RETRIES) {
        log.warn(`Summary validation failed for "${entry.title}", retrying...`);
        await delay(2000);
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        log.warn(`Summarization attempt ${attempt + 1} failed for "${entry.title}", retrying: ${err}`);
        await delay(Math.pow(2, attempt + 1) * 1000);
      } else {
        log.error(`Summarization failed after retries: ${entry.title}`, err);
      }
    }
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/summarizer.ts
git commit -m "refactor: summarizer uses i18n language packs, translated_title field"
```

---

### Task 6: Update src/pushover.ts — Use i18n labels

**Files:**
- Modify: `src/pushover.ts`

- [ ] **Step 1: Replace entire src/pushover.ts**

```typescript
// src/pushover.ts
import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { getLanguagePack } from './i18n.js';
import type { QueueEntry, StructuredSummary } from './types.js';

const log = createLogger('pushover');

// --- HTML Escaping ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Smart Truncation ---

function trimToSentenceBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('!\n'),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('?\n'),
  );

  if (lastSentenceEnd > maxLength * 0.3) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated;
}

// --- Notification Rendering ---

interface RenderResult {
  title: string;
  message: string;
  truncated: boolean;
}

export function renderNotification(entry: QueueEntry, summary: StructuredSummary): RenderResult {
  const isArxiv = entry.feedName.startsWith(config.arxivFeedPrefix);
  const emoji = isArxiv ? '📄' : '📰';
  const { labels } = getLanguagePack(runtimeConfig.language);

  // Support both translated_title and legacy title_tr
  const titleRaw = summary.translated_title || (summary as any).title_tr || entry.title;
  const title = escapeHtml(titleRaw).slice(0, 250);

  const source = escapeHtml(entry.feedName);
  const whatHappened = escapeHtml(summary.what_happened);
  const whyItMatters = escapeHtml(summary.why_it_matters);
  const keyDetail = escapeHtml(summary.key_detail);

  const sourceLine = `${emoji} ${source}`;
  const whatLine = `\n\n<b>${labels.whatHappened}</b> ${whatHappened}`;
  const whyLine = `\n\n<b>${labels.whyItMatters}</b> ${whyItMatters}`;
  const detailLine = `\n\n💡 ${keyDetail}`;

  const MAX_MESSAGE = 1024;

  let message = sourceLine + whatLine + whyLine + detailLine;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: false };
  }

  message = sourceLine + whatLine + whyLine;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: true };
  }

  const whyFirstSentence = whyItMatters.split(/[.!?]\s/)[0] + '.';
  const whyLineShort = `\n\n<b>${labels.whyItMatters}</b> ${whyFirstSentence}`;
  message = sourceLine + whatLine + whyLineShort;
  if (message.length <= MAX_MESSAGE) {
    return { title, message, truncated: true };
  }

  const availableForWhat = MAX_MESSAGE - (sourceLine + `\n\n<b>${labels.whatHappened}</b> ` + whyLineShort).length;
  const whatTrimmed = trimToSentenceBoundary(whatHappened, Math.max(availableForWhat, 100));
  message = sourceLine + `\n\n<b>${labels.whatHappened}</b> ${whatTrimmed}` + whyLineShort;

  return { title, message: message.slice(0, MAX_MESSAGE), truncated: true };
}

// --- Pushover API ---

export async function sendNotification(
  title: string,
  message: string,
  url?: string,
  urlTitle?: string,
): Promise<boolean> {
  try {
    const params: Record<string, string> = {
      token: config.pushoverAppToken,
      user: config.pushoverUserKey,
      title: title.slice(0, 250),
      message: message.slice(0, 1024),
      html: '1',
    };

    if (url) params.url = url;
    if (urlTitle) params.url_title = urlTitle;

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    if (!response.ok) {
      const body = await response.text();
      log.error(`Pushover error (${response.status}): ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    log.error('Failed to send Pushover notification', err);
    return false;
  }
}

export async function sendArticleNotification(
  entry: QueueEntry,
  summary: StructuredSummary,
): Promise<{ success: boolean; truncated: boolean }> {
  const { title, message, truncated } = renderNotification(entry, summary);
  const isArxiv = entry.feedName.startsWith(config.arxivFeedPrefix);
  const { labels } = getLanguagePack(runtimeConfig.language);
  const urlTitle = isArxiv ? labels.readArticle : labels.readMore;

  const success = await sendNotification(title, message, entry.link, urlTitle);
  return { success, truncated };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pushover.ts
git commit -m "refactor: pushover uses i18n labels, translated_title with fallback"
```

---

### Task 7: Update src/index.ts — CLI, branding, i18n startup, shebang

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Replace entire src/index.ts**

Add shebang as first line, import CLI and i18n, use them in main():

```typescript
#!/usr/bin/env node
// src/index.ts
import { config, runtimeConfig } from './config.js';
import { createLogger } from './logger.js';
import { fetchAllArticles } from './feeds.js';
import { filterByRelevance } from './relevance.js';
import { enrichEntry } from './extractor.js';
import { summarizeEntry } from './summarizer.js';
import {
  loadArticleQueue,
  saveArticleQueue,
  getQueue,
  isKnown,
  discoverArticles,
  handleColdStart,
  getEntriesByState,
  transitionEntry,
  markFailed,
  removeEntry,
  countByState,
} from './queue.js';
import { sendNotification, sendArticleNotification } from './pushover.js';
import { parseArgs } from './cli.js';
import { getLanguagePack } from './i18n.js';
import type { PollMetrics } from './types.js';

const log = createLogger('main');

function validateConfig(): void {
  if (!config.openrouterApiKey) {
    log.error('OPENROUTER_API_KEY is required. Set it in .env file.');
    process.exit(1);
  }
  if (!config.pushoverUserKey || !config.pushoverAppToken) {
    log.error('PUSHOVER_USER_KEY and PUSHOVER_APP_TOKEN are required. Set them in .env file.');
    process.exit(1);
  }
}

let pollCycleCount = 0;

function emitMetrics(metrics: PollMetrics): void {
  const parts = Object.entries(metrics)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  log.info(`[METRICS] poll_cycle=${pollCycleCount} ${parts}`);
}

async function pollAndNotify(): Promise<void> {
  pollCycleCount++;
  log.info('Starting poll cycle...');

  const metrics: PollMetrics = {
    discovered: 0,
    enriched: 0,
    enrichment_scraped: 0,
    enrichment_snippet: 0,
    relevance_passed: 0,
    relevance_dropped: 0,
    relevance_bypassed: 0,
    summarized: 0,
    summary_failed: 0,
    sent: 0,
    send_failed: 0,
    truncated: 0,
    queue_pending: 0,
    queue_failed: 0,
  };

  try {
    loadArticleQueue();

    const allArticles = await fetchAllArticles();

    if (handleColdStart(allArticles)) {
      log.info('Cold start complete — no notifications this cycle');
      emitMetrics(metrics);
      return;
    }

    const newCount = discoverArticles(allArticles);
    metrics.discovered = newCount;
    saveArticleQueue();

    if (newCount === 0 && getEntriesByState('discovered').length === 0) {
      log.info('No new or pending articles');
      emitMetrics(metrics);
      return;
    }

    const relevancePassedIds = new Set<string>();
    const discovered = getEntriesByState('discovered');

    if (discovered.length > 0) {
      const result = await filterByRelevance(discovered);

      metrics.relevance_bypassed = result.bypassed.length;
      metrics.relevance_passed = result.passed.length;
      metrics.relevance_dropped = result.dropped.length;

      for (const { entry } of result.dropped) {
        removeEntry(entry.id);
      }

      for (const entry of result.passed) relevancePassedIds.add(entry.id);
      for (const entry of result.bypassed) relevancePassedIds.add(entry.id);

      if (result.parseError) {
        log.warn('Relevance parse error — skipping enrichment for affected entries this cycle');
      }

      saveArticleQueue();
    }

    const isArxiv = (name: string) => name.startsWith(config.arxivFeedPrefix);
    const eligibleForEnrich = getEntriesByState('discovered').filter(e => relevancePassedIds.has(e.id));
    const regularToEnrich = eligibleForEnrich.filter(e => !isArxiv(e.feedName));
    const arxivToEnrich = eligibleForEnrich.filter(e => isArxiv(e.feedName));

    const enrichBatch = [
      ...regularToEnrich.slice(0, config.maxArticlesPerPoll),
      ...arxivToEnrich.slice(0, config.arxivMaxPerPoll),
    ];

    for (const entry of enrichBatch) {
      try {
        const { enrichedContent, wasScraped } = await enrichEntry(entry);
        transitionEntry(entry.id, 'enriched', { enrichedContent });
        metrics.enriched++;
        if (wasScraped) metrics.enrichment_scraped++;
        else metrics.enrichment_snippet++;
      } catch (err) {
        markFailed(entry.id, `Enrichment error: ${err}`);
      }
    }
    saveArticleQueue();

    const toSummarize = getEntriesByState('enriched');
    for (const entry of toSummarize) {
      const summary = await summarizeEntry(entry);
      if (summary) {
        transitionEntry(entry.id, 'summarized', { structuredSummary: summary });
        metrics.summarized++;
      } else {
        markFailed(entry.id, 'Summarization failed');
        metrics.summary_failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    saveArticleQueue();

    const toSend = getEntriesByState('summarized');
    for (const entry of toSend) {
      if (!entry.structuredSummary) {
        markFailed(entry.id, 'No structured summary available');
        metrics.send_failed++;
        continue;
      }

      const { success, truncated } = await sendArticleNotification(entry, entry.structuredSummary);
      if (success) {
        transitionEntry(entry.id, 'sent');
        metrics.sent++;
        if (truncated) metrics.truncated++;
      } else {
        markFailed(entry.id, 'Pushover send failed');
        metrics.send_failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    saveArticleQueue();

    const counts = countByState();
    metrics.queue_pending = counts.discovered + counts.enriched + counts.summarized;
    metrics.queue_failed = counts.failed;

    emitMetrics(metrics);
    log.info(`Poll cycle complete: ${metrics.sent} sent, ${metrics.queue_pending} pending`);
  } catch (err) {
    log.error('Error in poll cycle', err);
    saveArticleQueue();
  }
}

function scheduleNextPoll(): void {
  const intervalMs = config.pollIntervalMinutes * 60 * 1000;
  log.info(`Next poll in ${config.pollIntervalMinutes} minutes`);
  setTimeout(async () => {
    await pollAndNotify();
    scheduleNextPoll();
  }, intervalMs);
}

function setupShutdown(): void {
  const shutdown = (signal: string) => {
    log.info(`Received ${signal}, shutting down...`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function main(): Promise<void> {
  // Parse CLI args before anything else
  const args = parseArgs();
  runtimeConfig.language = args.lang;

  const pack = getLanguagePack(runtimeConfig.language);
  log.info(`Newscrux v2.0 starting... (language: ${pack.name})`);
  validateConfig();
  setupShutdown();

  const startupSent = await sendNotification(
    '📡 Newscrux',
    pack.labels.startupMessage,
  );

  if (startupSent) {
    log.info('Startup notification sent');
  } else {
    log.error('Failed to send startup notification — check Pushover credentials');
  }

  await pollAndNotify();
  scheduleNextPoll();
}

main().catch((err) => {
  log.error('Fatal error', err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: CLI lang selection, Newscrux branding, i18n startup message, shebang"
```

---

### Task 8: Update src/feeds.ts and src/extractor.ts — User-Agent rename

**Files:**
- Modify: `src/feeds.ts`
- Modify: `src/extractor.ts`

- [ ] **Step 1: Update User-Agent in feeds.ts**

In `src/feeds.ts`, change line 11 from:
```typescript
  headers: { 'User-Agent': 'RSSfeedy-Pi/2.0' },
```
to:
```typescript
  headers: { 'User-Agent': 'Newscrux/2.0' },
```

- [ ] **Step 2: Update User-Agent in extractor.ts**

In `src/extractor.ts`, change line 47 from:
```typescript
        'User-Agent': 'Mozilla/5.0 (compatible; RSSfeedy-Pi/2.0; +https://github.com)',
```
to:
```typescript
        'User-Agent': 'Mozilla/5.0 (compatible; Newscrux/2.0; +https://github.com/alicankiraz1/newscrux)',
```

- [ ] **Step 3: Verify full build passes**

Run: `cd "/Users/alican/Desktop/Cursor Projects/AiNews-Pushover" && npx tsc --noEmit`

Expected: Clean build, zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/feeds.ts src/extractor.ts
git commit -m "refactor: update User-Agent strings to Newscrux/2.0"
```

---

## Chunk 3: Project Files — Package, Service, Env, README, Contributing

### Task 9: Update package.json — Rename and professionalize

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Replace entire package.json**

```json
{
  "name": "newscrux",
  "version": "2.0.0",
  "description": "AI-powered news aggregator with structured multilingual summaries and push notifications",
  "author": "Alican Kiraz",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/alicankiraz1/newscrux"
  },
  "homepage": "https://github.com/alicankiraz1/newscrux#readme",
  "bugs": {
    "url": "https://github.com/alicankiraz1/newscrux/issues"
  },
  "keywords": [
    "ai",
    "news",
    "rss",
    "pushover",
    "summarizer",
    "multilingual",
    "raspberry-pi",
    "typescript",
    "deepseek"
  ],
  "bin": {
    "newscrux": "./dist/index.js"
  },
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@openrouter/sdk": "^0.1.0",
    "cheerio": "^1.2.0",
    "dotenv": "^16.4.0",
    "rss-parser": "^3.13.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "refactor: rename to newscrux, add author/repo/keywords/bin, bump to 2.0.0"
```

---

### Task 10: Replace service file, update .env.example

**Files:**
- Delete: `rssfeedy-pi.service`
- Create: `newscrux.service`
- Modify: `.env.example`

- [ ] **Step 1: Delete old service file and create new one**

Delete `rssfeedy-pi.service` and create `newscrux.service`:

```ini
# Newscrux AI News Push Notification Service
# Edit --lang= flag and paths to match your setup

[Unit]
Description=Newscrux AI News Push Notification Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/newscrux
ExecStart=/usr/bin/node %h/newscrux/dist/index.js --lang=en
Restart=on-failure
RestartSec=30
StartLimitIntervalSec=300
StartLimitBurst=5

EnvironmentFile=%h/newscrux/.env

StandardOutput=journal
StandardError=journal
SyslogIdentifier=newscrux

NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=%h/newscrux/data

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Update .env.example**

Replace entire `.env.example`:

```bash
# ========================================
# Newscrux Configuration
# ========================================

# OpenRouter API Key (required)
# Get yours at https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# OpenRouter model (default: deepseek/deepseek-v3.2-speciale)
OPENROUTER_MODEL=deepseek/deepseek-v3.2-speciale

# Pushover credentials (required)
# Get yours at https://pushover.net
PUSHOVER_USER_KEY=your_pushover_user_key_here
PUSHOVER_APP_TOKEN=your_pushover_app_token_here

# RSS poll interval in minutes (default: 15)
POLL_INTERVAL_MINUTES=15

# Maximum articles to process per poll cycle (default: 10)
MAX_ARTICLES_PER_POLL=10

# arXiv papers per poll cycle (default: 15)
ARXIV_MAX_PER_POLL=15

# AI relevance filter threshold, 1-10 (default: 6)
RELEVANCE_THRESHOLD=6

# Log level: debug | info | warn | error (default: info)
LOG_LEVEL=info
```

- [ ] **Step 3: Commit**

```bash
git rm rssfeedy-pi.service
git add newscrux.service .env.example
git commit -m "refactor: rename service to newscrux, update .env.example branding"
```

---

### Task 11: Write README.md — GitHub Showcase quality

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace entire README.md**

Write the complete README as specified in the spec Section 6. The full content follows the structure from the spec: badges, What It Does, Notification Preview, Features, Quick Start, Architecture diagram, Supported Languages table, Configuration (CLI + env vars), RSS Sources table, Deployment (systemd), How It Works (9-step pipeline), Contributing link, Author section with social links using shield.io badges, and License.

Key points:
- All content in English
- Use real shield.io badge URLs for author social links:
  - `[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/alican-kiraz)`
  - `[![X](https://img.shields.io/badge/X-000000?style=flat&logo=x&logoColor=white)](https://x.com/AlicanKiraz0)`
  - `[![Medium](https://img.shields.io/badge/Medium-12100E?style=flat&logo=medium&logoColor=white)](https://alican-kiraz1.medium.com)`
  - `[![HuggingFace](https://img.shields.io/badge/HuggingFace-FFD21E?style=flat&logo=huggingface&logoColor=black)](https://huggingface.co/AlicanKiraz0)`
  - `[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/alicankiraz1)`
- Notification preview as text (before v1 vs after v2)
- Architecture as ASCII diagram from spec
- All tables filled with real data

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: complete English README with GitHub Showcase quality"
```

---

### Task 12: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create CONTRIBUTING.md**

```markdown
# Contributing to Newscrux

Thank you for your interest in contributing!

## How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Make** your changes
4. **Ensure** `npm run build` passes with zero errors
5. **Submit** a Pull Request

## Guidelines

- Follow the existing code style and patterns
- Keep files focused — one clear responsibility per file
- All code, comments, and documentation in English
- Test your changes with `npm run dev` before submitting

## Adding a New Language

To add a new language to the notification system:

1. Add a new `LanguagePack` entry in `src/i18n.ts`
2. Add the language code to the `SupportedLanguage` type
3. Add it to the `SUPPORTED_LANGUAGES` array
4. Test with `npm run dev -- --lang=<your-code>`

## Reporting Issues

Please use [GitHub Issues](https://github.com/alicankiraz1/newscrux/issues) to report bugs or suggest features.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md with contribution guide"
```

---

### Task 13: Final build verification

**Files:**
- All files

- [ ] **Step 1: Full TypeScript build**

Run: `cd "/Users/alican/Desktop/Cursor Projects/AiNews-Pushover" && npm run build`

Expected: Clean compilation, zero errors.

- [ ] **Step 2: Verify no old references remain**

Run: `grep -r "rssfeedy-pi\|RSSfeedy-Pi\|rssfeedy_pi\|title_tr" src/`

Expected: No matches for rssfeedy references. `title_tr` should only appear in backward-compat fallback code in summarizer.ts and pushover.ts.

- [ ] **Step 3: Verify CLI help works**

Run: `node dist/index.js --help`

Expected: Help text showing Newscrux usage with language options.

- [ ] **Step 4: Verify CLI version works**

Run: `node dist/index.js --version`

Expected: `2.0.0`

- [ ] **Step 5: Verify invalid language is rejected**

Run: `node dist/index.js --lang=xx`

Expected: Error message with supported languages list, exit code 1.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final build verification — Newscrux global release complete"
```
