import { z } from 'zod';
import { AppError } from '../errors';
import { GRADES, INKS, LANGUAGES, LENGTHS, MARGINS, PAGE_SIZES, PAPERS, SPACINGS, SUBJECTS, WRITINGS } from '../../types';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function readJson(req: Request, maxBytes = 40 * 1024 * 1024): Promise<unknown> {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) throw new AppError('That request is too large.', 413);
  try {
    return await req.json();
  } catch {
    throw new AppError('Invalid request body.', 400);
  }
}

function sniff(b: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Validates a data URL by decoding it and checking magic bytes (the MIME header is not trusted). */
export function parseImageDataUrl(s: string, maxBytes = MAX_IMAGE_BYTES) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) throw new AppError('Unsupported image. Please use a JPG, PNG or WEBP photo.', 400);
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > maxBytes) throw new AppError('That image is too large. Please use a smaller photo.', 413);
  const real = sniff(buffer);
  if (!real || real !== m[1]) throw new AppError('That file does not look like a valid image.', 400);
  return { mime: real, buffer };
}

const dataUrl = z.string().max(14_000_000);

export const answerSchema = z.object({
  question: z.string().trim().min(2, 'is too short').max(4000, 'is too long'),
  image: dataUrl.optional(),
  subject: z.enum(SUBJECTS).default('Auto Detect'),
  grade: z.enum(GRADES).default('Class 8'),
  length: z.enum(LENGTHS).default('Exam Ready'),
  language: z.enum(LANGUAGES).default('English'),
  additionalInstructions: z.string().max(500).default(''),
  stream: z.boolean().default(true),
});
export type AnswerBody = z.infer<typeof answerSchema>;

export const imageSchema = z.object({ image: dataUrl });

export const styleSchema = z.object({
  slant: z.number().min(-20).max(35),
  size: z.number().min(0.6).max(1.6),
  thickness: z.number().min(0.4).max(2.5),
  spacing: z.number().min(0.6).max(1.8),
  wobble: z.number().min(0).max(2.5),
  notes: z.string().max(300).optional(),
});

export const notebookSchema = z.object({
  answer: z.string().trim().min(1).max(15000),
  language: z.enum(LANGUAGES).default('English'),
  paper: z.enum(PAPERS).default('Ruled'),
  ink: z.enum(INKS).default('Blue'),
  pageSize: z.enum(PAGE_SIZES).default('A4'),
  writing: z.enum(WRITINGS).default('Natural'),
  lineSpacing: z.enum(SPACINGS).default('Normal'),
  margin: z.enum(MARGINS).default('Normal'),
  style: styleSchema.optional(),
  seed: z.number().int().min(0).max(2_000_000_000).default(1),
});

export const pdfSchema = z.object({
  pages: z.array(dataUrl).min(1).max(20),
  filename: z.string().max(80).default('sani-notes'),
});
