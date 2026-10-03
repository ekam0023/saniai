import { AppError } from './errors';

const isSet = (v?: string) => !!v && !v.startsWith('YOUR_');

export function llmConfig(vision = false) {
  const provider = (process.env.LLM_PROVIDER || 'xai').toLowerCase();
  const key = process.env.LLM_API_KEY;
  const model = vision ? process.env.LLM_VISION_MODEL : process.env.LLM_MODEL;
  if (!isSet(key)) throw new AppError('AI provider is not configured. Add LLM_API_KEY to .env.local and restart the server.', 503);
  if (!isSet(model)) throw new AppError(`AI model is not configured. Set ${vision ? 'LLM_VISION_MODEL' : 'LLM_MODEL'} in .env.local and restart.`, 503);
  const base = process.env.LLM_BASE_URL || (provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1');
  return { key: key as string, model: model as string, base: base.replace(/\/$/, '') };
}

export function speechConfig() {
  const key = process.env.SPEECH_API_KEY;
  const model = process.env.SPEECH_MODEL;
  if (!isSet(key) || !isSet(model)) throw new AppError('Speech-to-text is not configured. Set SPEECH_API_KEY and SPEECH_MODEL in .env.local, or use a browser that supports voice input.', 503);
  const base = (process.env.SPEECH_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  return { key: key as string, model: model as string, base };
}
