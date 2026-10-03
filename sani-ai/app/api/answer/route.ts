import { errorResponse } from '@/lib/errors';
import { getAIProvider } from '@/lib/ai/provider';
import { rateLimit } from '@/lib/security/rateLimit';
import { answerSchema, parseImageDataUrl, readJson } from '@/lib/security/validate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, 'answer', 20);
    const body = answerSchema.parse(await readJson(req));
    if (body.image) parseImageDataUrl(body.image);
    const ai = getAIProvider();
    if (!body.stream) return Response.json({ answer: await ai.answerQuestion(body) });

    const it = ai.streamAnswer(body, req.signal);
    const first = await it.next(); // surfaces auth/config errors as JSON before streaming starts
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!first.done) controller.enqueue(enc.encode(first.value));
          if (!first.done) for await (const chunk of it) controller.enqueue(enc.encode(chunk));
          controller.close();
        } catch {
          controller.error(new Error('stream failed'));
        }
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
