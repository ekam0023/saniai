import { AppError } from '../errors';
import { llmConfig } from '../env';
import { answerSystemPrompt, VISION_HANDWRITING_PROMPT, VISION_QUESTION_PROMPT } from '../prompts/answerPrompt';
import type { AnswerBody } from '../security/validate';
import { DEFAULT_STYLE, type StyleProfile } from '../../types';
import type { AIProvider, ImageAnalysisResult } from './provider';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string | unknown[] };

function mapStatus(status: number): AppError {
  if (status === 401 || status === 403) return new AppError('The AI provider rejected the credentials. Check LLM_API_KEY in .env.local.', 502);
  if (status === 429) return new AppError('The AI service is busy right now. Please try again in a moment.', 429);
  if (status === 404 || status === 400) return new AppError('The AI model could not process this request. Check LLM_MODEL / LLM_VISION_MODEL in .env.local.', 502);
  return new AppError('The AI service had a problem. Please try again.', 502);
}

async function call(vision: boolean, messages: Msg[], opts: { json?: boolean; stream?: boolean; signal?: AbortSignal; temperature?: number } = {}) {
  const cfg = llmConfig(vision);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  opts.signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        stream: !!opts.stream,
        max_tokens: 900,
        ...(/qwen/i.test(cfg.model) ? { reasoning_effort: 'none' } : {}),
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch { /* ignore */ }
      const base = mapStatus(res.status);
      throw new AppError(`${base.message} [Groq ${res.status} | model: ${cfg.model}] ${detail}`, base.status);
    }
    return { res, done: () => clearTimeout(timer) };
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof AppError) throw e;
    if ((e as Error).name === 'AbortError') throw new AppError('The AI took too long to respond. Please try again.', 504);
    throw new AppError('Could not reach the AI service. Please try again.', 502);
  }
}

function userContent(text: string, image?: string) {
  return image ? [{ type: 'text', text }, { type: 'image_url', image_url: { url: image } }] : text;
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    throw new AppError('The AI returned an unreadable response. Please try again.', 502);
  }
}

const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

export class OpenAICompatibleProvider implements AIProvider {
  private build(b: AnswerBody): { vision: boolean; messages: Msg[] } {
    return {
      vision: !!b.image,
      messages: [
        { role: 'system', content: answerSystemPrompt(b) },
        { role: 'user', content: userContent(`Question: ${b.question}`, b.image) },
      ],
    };
  }

  async answerQuestion(b: AnswerBody) {
    const { vision, messages } = this.build(b);
    const { res, done } = await call(vision, messages);
    try {
      const j = await res.json();
      const text = j?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new AppError('The AI returned an empty answer. Please try again.', 502);
      return text.trim();
    } finally { done(); }
  }

  async *streamAnswer(b: AnswerBody, signal?: AbortSignal) {
    const { vision, messages } = this.build(b);
    const { res, done } = await call(vision, messages, { stream: true, signal });
    if (!res.body) { done(); throw new AppError('The AI returned an empty answer.', 502); }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done: fin } = await reader.read();
        if (fin) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n');
        buf = parts.pop() ?? '';
        for (const line of parts) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) yield delta;
          } catch { /* ignore partial frames */ }
        }
      }
    } finally { done(); }
  }

  async analyzeImage(image: string): Promise<ImageAnalysisResult> {
    const { res, done } = await call(true, [
      { role: 'system', content: VISION_QUESTION_PROMPT },
      { role: 'user', content: userContent('Extract the question(s) from this image.', image) },
    ], { json: true, temperature: 0 });
    try {
      const j = parseJson((await res.json())?.choices?.[0]?.message?.content ?? '');
      const raw = Array.isArray(j.questions) ? (j.questions as unknown[]) : [];
      const questions = raw.filter((q): q is string => typeof q === 'string' && q.trim().length > 1).map((q) => q.trim()).slice(0, 15);
      return { questions, hasDiagram: !!j.hasDiagram, notes: typeof j.notes === 'string' ? j.notes : '' };
    } finally { done(); }
  }

  async analyzeHandwriting(image: string): Promise<StyleProfile> {
    const { res, done } = await call(true, [
      { role: 'system', content: VISION_HANDWRITING_PROMPT },
      { role: 'user', content: userContent('Describe this handwriting style.', image) },
    ], { json: true, temperature: 0 });
    try {
      const j = parseJson((await res.json())?.choices?.[0]?.message?.content ?? '');
      return {
        slant: num(j.slant, DEFAULT_STYLE.slant, -20, 35),
        size: num(j.size, 1, 0.6, 1.6),
        thickness: num(j.thickness, 1, 0.4, 2.5),
        spacing: num(j.spacing, 1, 0.6, 1.8),
        wobble: num(j.wobble, 1, 0, 2.5),
        notes: typeof j.notes === 'string' ? j.notes.slice(0, 300) : undefined,
      };
    } finally { done(); }
  }
}
