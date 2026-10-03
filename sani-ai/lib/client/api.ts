'use client';
import type { AnswerSettings, StyleProfile, NotebookSettings } from '../../types';

export class ApiError extends Error {}

async function errMsg(res: Response) {
  try { return (await res.json()).error || 'Something went wrong. Please try again.'; } catch { return 'Something went wrong. Please try again.'; }
}
async function send(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try { res = await fetch(url, init); } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('Network problem. Check your connection and try again.');
  }
  if (!res.ok) throw new ApiError(await errMsg(res));
  return res;
}
const json = (body: unknown, signal?: AbortSignal): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });

export async function streamAnswer(body: AnswerSettings & { question: string; additionalInstructions: string; image?: string }, onChunk: (full: string) => void, signal?: AbortSignal) {
  const res = await send('/api/answer', json({ ...body, stream: true }, signal));
  if (!res.body) throw new ApiError('The AI returned an empty answer.');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onChunk(full);
  }
  if (!full.trim()) throw new ApiError('The AI returned an empty answer. Please try again.');
  return full.trim();
}

export async function analyzeImage(image: string, signal?: AbortSignal): Promise<{ questions: string[]; hasDiagram: boolean; notes: string }> {
  return (await send('/api/analyze-image', json({ image }, signal))).json();
}
export async function analyzeHandwriting(image: string, signal?: AbortSignal): Promise<StyleProfile> {
  return (await (await send('/api/analyze-handwriting', json({ image }, signal))).json()).style;
}
export async function generateNotebook(args: { answer: string; language: string; settings: NotebookSettings; style?: StyleProfile; seed: number }, signal?: AbortSignal): Promise<string[]> {
  const { settings, ...rest } = args;
  return (await (await send('/api/generate-notebook', json({ ...rest, ...settings }, signal))).json()).pages;
}
export async function transcribe(audio: Blob, language: string): Promise<string> {
  const f = new FormData();
  f.append('audio', audio, 'speech.webm');
  f.append('language', language);
  return (await (await send('/api/transcribe', { method: 'POST', body: f })).json()).text;
}
export async function downloadPdf(pages: string[], filename: string) {
  const res = await send('/api/generate-pdf', json({ pages, filename }));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
