import { AppError, errorResponse } from '@/lib/errors';
import { getImageProvider } from '@/lib/image/generate';
import { rateLimit } from '@/lib/security/rateLimit';
import { notebookSchema, readJson } from '@/lib/security/validate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, 'generate-notebook', 15);
    const body = notebookSchema.parse(await readJson(req, 2 * 1024 * 1024));
    const pages = await getImageProvider().generateNotebookPages(body);
    if (pages.length > 12) throw new AppError('That answer is too long for one notebook. Please shorten it.', 422);
    return Response.json({ mode: 'programmatic', pages: pages.map((b) => `data:image/png;base64,${b.toString('base64')}`) });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Notebook text did not match')) {
      console.error('[fidelity] layout mismatch');
      return errorResponse(new AppError('Could not lay out the page safely. Please simplify unusual formatting and try again.', 422));
    }
    return errorResponse(e);
  }
}
