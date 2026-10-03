import { AppError, errorResponse } from '@/lib/errors';
import { rateLimit } from '@/lib/security/rateLimit';
import { OpenAISpeechProvider } from '@/lib/speech/transcribe';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, 'transcribe', 12);
    const form = await req.formData().catch(() => null);
    const audio = form?.get('audio');
    if (!(audio instanceof Blob) || audio.size === 0) throw new AppError('No audio received.', 400);
    if (audio.size > 10 * 1024 * 1024) throw new AppError('That recording is too long.', 413);
    const lang = String(form?.get('language') ?? 'English');
    const text = await new OpenAISpeechProvider().transcribe(audio, lang);
    return Response.json({ text });
  } catch (e) {
    return errorResponse(e);
  }
}
