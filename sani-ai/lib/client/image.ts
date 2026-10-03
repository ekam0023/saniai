'use client';
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function sniff(file: File): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const webp = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  return png || jpg || webp;
}

/** Returns an error message, or null if the file is acceptable. Does not trust the MIME type alone. */
export async function validateImageFile(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please choose a JPG, PNG or WEBP image.';
  if (file.size > MAX_FILE_BYTES) return 'That image is larger than 8 MB. Please choose a smaller one.';
  if (!(await sniff(file))) return 'That file does not look like a valid image.';
  return null;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Could not read that image.'));
    i.src = src;
  });
}

export async function fileToDataUrl(file: File, max = 1600, quality = 0.88): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return drawScaled(img, max, quality);
  } finally { URL.revokeObjectURL(url); }
}

export function drawScaled(img: HTMLImageElement, max: number, quality = 0.88): string {
  const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * r);
  c.height = Math.round(img.naturalHeight * r);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

export async function rotateDataUrl(src: string): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = img.naturalHeight; c.height = img.naturalWidth;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.9);
}

export async function cropDataUrl(src: string, a: { x: number; y: number; width: number; height: number }): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = Math.round(a.width); c.height = Math.round(a.height);
  c.getContext('2d')!.drawImage(img, a.x, a.y, a.width, a.height, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}

export async function thumbnail(src: string, max = 360): Promise<string> {
  return drawScaled(await loadImage(src), max, 0.8);
}

export async function toJpegDataUrl(png: string, quality = 0.95): Promise<string> {
  const img = await loadImage(png);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', quality);
}

/** Rough quality check for handwriting photos: returns a tip or null. */
export async function handwritingTip(src: string): Promise<string | null> {
  const img = await loadImage(src);
  if (Math.min(img.naturalWidth, img.naturalHeight) < 500) return 'This photo is small. A closer, sharper photo gives better results.';
  const c = document.createElement('canvas');
  c.width = 120; c.height = 120;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 120, 120);
  const d = ctx.getImageData(0, 0, 120, 120).data;
  let sum = 0, sq = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; sum += l; sq += l * l; }
  const mean = sum / n; const sd = Math.sqrt(sq / n - mean * mean);
  if (mean < 70) return 'The photo looks dark. Try better light.';
  if (sd < 22) return 'Low contrast. Use plain paper and a dark pen, and hold the phone straight above the page.';
  return null;
}

export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0a00-\u0a7f]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'notebook';
