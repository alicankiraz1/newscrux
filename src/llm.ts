// src/llm.ts
import OpenAI from 'openai';
import { config } from './config.js';

export const llm = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmBaseUrl,
});
