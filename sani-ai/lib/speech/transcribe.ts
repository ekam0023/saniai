import { AppError } from '../errors';
import { speechConfig } from '../env';
import type { SpeechProvider } from '../ai/provider';

const CODES: Record<string, string> = { English: 'en', Hindi: 'hi', Punjabi: 'pa' };

export class OpenAISpeechProvider implements SpeechProvider {
  async transcribe(audio: Blob, language?: string) {
    const cfg = speechConfig();
    const form = new FormData();
    form.append('file', audio, 'speech.webm');
    form.append('model', cfg.model);
    if (language && CODES[language]) form.append('language', CODES[language]);
    let res: Response;
    try {
      res = await fetch(`${cfg.base}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.key}` }, body: form, signal: AbortSignal.timeout(45_000) });
    } catch {
      throw new AppError('Could not reach the speech service. Please try again.', 502);
    }
    if (res.status === 401 || res.status === 403) throw new AppError('The speech provider rejected the credentials. Check SPEECH_API_KEY.', 502);
    if (res.status === 429) throw new AppError('The speech service is busy. Please try again shortly.', 429);
    if (!res.ok) throw new AppError('Speech recognition failed. Please try again or type your question.', 502);
    const j = await res.json();
    const text = typeof j?.text === 'string' ? j.text.trim() : '';
    if (!text) throw new AppError('We could not hear anything. Please try again.', 422);
    return text;
  }
}
