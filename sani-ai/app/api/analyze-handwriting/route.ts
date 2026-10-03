import { errorResponse } from '@/lib/errors';
import { getAIProvider } from '@/lib/ai/provider';
import { rateLimit } from '@/lib/security/rateLimit';
import { imageSchema, parseImageDataUrl, readJson } from '@/lib/security/validate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, 'analyze-handwriting', 8);
    const { image } = imageSchema.parse(await readJson(req));
    parseImageDataUrl(image);
    return Response.json({ style: await getAIProvider().analyzeHandwriting(image) });
  } catch (e) {
    return errorResponse(e);
  }
}
