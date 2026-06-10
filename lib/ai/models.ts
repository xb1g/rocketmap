import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

export const flashModel: LanguageModel = deepseek.chat('deepseek-v4-flash');
export const proModel: LanguageModel = deepseek.chat('deepseek-v4-pro');

export type ModelPurpose = 'fast' | 'reasoning';

/**
 * Select the appropriate model for a given purpose.
 * - 'fast': chat, drafting, guided-create (flash)
 * - 'reasoning': analysis, consistency checker, deep-dive, viability (pro)
 */
export function getModelForPurpose(purpose: ModelPurpose): LanguageModel {
  return purpose === 'reasoning' ? proModel : flashModel;
}

/**
 * Get model ID string for logging/pricing purposes.
 */
export function getModelIdForPurpose(purpose: ModelPurpose): string {
  return purpose === 'reasoning' ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
}
