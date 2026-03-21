import { OpenRouter } from '@openrouter/sdk';
import { config } from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('llm');

const openrouter = new OpenRouter({
  apiKey: config.openrouterApiKey,
});

type ProviderName = 'openrouter' | 'gemini';

interface SendWithFallbackArgs {
  systemPrompt: string;
  userPrompt: string;
  primaryProvider: (() => Promise<string>) | null;
  fallbackProvider: (() => Promise<string>) | null;
}

export async function sendWithFallback({
  primaryProvider,
  fallbackProvider,
}: SendWithFallbackArgs): Promise<{ text: string; provider: ProviderName }> {
  if (!primaryProvider && !fallbackProvider) {
    throw new Error('No LLM provider is configured.');
  }

  if (primaryProvider) {
    try {
      const text = await primaryProvider();
      return { text, provider: 'openrouter' };
    } catch (err) {
      if (!fallbackProvider) throw err;
      log.warn(`OpenRouter request failed, falling back to Gemini: ${err}`);
    }
  }

  if (!fallbackProvider) {
    throw new Error('No fallback provider is configured.');
  }

  const text = await fallbackProvider();
  return { text, provider: 'gemini' };
}

function extractOpenRouterText(result: any): string {
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

function extractGeminiText(result: any): string {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part: any): part is { text: string } => typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('');
}

async function sendViaOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const result = await openrouter.chat.send({
    model: config.openrouterModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return extractOpenRouterText(result);
}

async function sendViaGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
  }

  const result = await response.json();
  return extractGeminiText(result);
}

export async function sendTextPrompt(systemPrompt: string, userPrompt: string): Promise<{ text: string; provider: ProviderName }> {
  return sendWithFallback({
    systemPrompt,
    userPrompt,
    primaryProvider: config.openrouterApiKey
      ? () => sendViaOpenRouter(systemPrompt, userPrompt)
      : null,
    fallbackProvider: config.geminiApiKey
      ? () => sendViaGemini(systemPrompt, userPrompt)
      : null,
  });
}
