import { PDFDocument } from 'pdf-lib';
import { AppError, errorResponse } from '@/lib/errors';
import { rateLimit } from '@/lib/security/rateLimit';
import { parseImageDataUrl, pdfSchema, readJson } from '@/lib/security/validate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    rateLimit(req, 'generate-pdf', 10);
    const body = pdfSchema.parse(await readJson(req));
    const pdf = await PDFDocument.create();
    for (const p of body.pages) {
      const { mime, buffer } = parseImageDataUrl(p, 12 * 1024 * 1024);
      if (mime === 'image/webp') throw new AppError('Unsupported page format.', 400);
      const img = mime === 'image/png' ? await pdf.embedPng(buffer) : await pdf.embedJpg(buffer);
      const page = pdf.addPage([img.width, img.height]); // 1px = 1pt keeps aspect ratio and full resolution
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const bytes = await pdf.save();
    const name = body.filename.replace(/[^a-z0-9-_]/gi, '-').slice(0, 60) || 'sani-notes';
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` } });
  } catch (e) {
    return errorResponse(e);
  }
}
