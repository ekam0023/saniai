import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { AppError } from '../errors';
import { DEFAULT_STYLE, type Ink, type Language, type Margin, type PageSize, type Paper, type Spacing, type StyleProfile, type Writing } from '../../types';
import { buildLines, paginate, verifyFidelity } from './layout';
import { normalizeAnswer } from './normalize';

export interface RenderInput {
  answer: string; language: Language; paper: Paper; ink: Ink; pageSize: PageSize;
  writing: Writing; lineSpacing: Spacing; margin: Margin; style?: StyleProfile; seed: number;
}

type Script = 'latin' | 'devanagari' | 'gurmukhi';
const registry: Record<Script, string[]> = { latin: [], devanagari: [], gurmukhi: [] };
let loaded = false;

function loadFonts() {
  if (loaded) return;
  loaded = true;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(latin|devanagari|gurmukhi)-.+\.(ttf|otf)$/i);
    if (!m) continue;
    const alias = f.replace(/\.(ttf|otf)$/i, '');
    if (GlobalFonts.registerFromPath(path.join(dir, f), alias)) registry[m[1].toLowerCase() as Script].push(alias);
  }
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function drawPaper(ctx: SKRSContext2D, W: number, H: number, o: { paper: Paper; lh: number; left: number; top: number; bottom: number; scale: number }, rand: () => number) {
  const { paper, lh, left, top, bottom, scale } = o;
  ctx.fillStyle = '#fbf8f0';
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = Math.max(1, 1.6 * scale);
  if (paper === 'Ruled' || paper === 'Exam Sheet') {
    ctx.strokeStyle = 'rgba(80,130,195,0.55)';
    for (let y = top; y <= H - bottom; y += lh) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(205,70,70,0.6)';
    ctx.beginPath(); ctx.moveTo(left - 16 * scale, 0); ctx.lineTo(left - 16 * scale, H); ctx.stroke();
  }
  if (paper === 'Exam Sheet') {
    ctx.strokeStyle = 'rgba(60,60,60,0.55)';
    ctx.strokeRect(34 * scale, 50 * scale, W - 68 * scale, H - 100 * scale);
    ctx.strokeRect(34 * scale, 50 * scale, W - 68 * scale, top - 110 * scale);
  }
  if (paper === 'Graph') {
    ctx.strokeStyle = 'rgba(95,155,115,0.38)';
    const step = lh / 2;
    for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = top % step; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  // paper grain
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // soft lighting
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(1, 'rgba(120,100,70,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function renderNotebook(inp: RenderInput): { pages: Buffer[]; lineCount: number } {
  loadFonts();
  const script: Script = inp.language === 'Hindi' ? 'devanagari' : inp.language === 'Punjabi' ? 'gurmukhi' : 'latin';
  const fonts = registry[script];
  if (!fonts.length) {
    throw new AppError(
      script === 'latin'
        ? 'No handwriting fonts found. Run "npm run fonts" (or add latin-*.ttf files to public/fonts) and restart.'
        : `No ${script} handwriting font found for ${inp.language}. Add a ${script}-*.ttf file to public/fonts, or choose another language.`,
      503,
    );
  }
  const rand = rng(inp.seed);
  const family = fonts[inp.seed % fonts.length];
  const style = inp.style ?? DEFAULT_STYLE;

  const W = inp.pageSize === 'A4' ? 1240 : inp.pageSize === 'A5' ? 874 : 1000;
  const H = inp.pageSize === 'A4' ? 1754 : inp.pageSize === 'A5' ? 1240 : 1400;
  const scale = W / 1240;
  const lh = Math.round({ Compact: 44, Normal: 54, Wide: 66 }[inp.lineSpacing] * scale);
  const left = Math.round({ Normal: 150, Wide: 210, Narrow: 90 }[inp.margin] * scale);
  const right = Math.round(60 * scale);
  const top = Math.round((inp.paper === 'Exam Sheet' ? 300 : 150) * scale);
  const bottom = Math.round(90 * scale);
  const perPage = Math.max(3, Math.floor((H - top - bottom) / lh));

  const match = inp.writing === 'Match Reference';
  const jit = match ? clamp(style.wobble, 0.2, 2) : { Neat: 0.35, Natural: 1, 'Slightly Casual': 1.7, 'Match Reference': 1 }[inp.writing];
  const slant = match ? style.slant : { Neat: 3, Natural: 7, 'Slightly Casual': 11, 'Match Reference': 7 }[inp.writing];
  const sizeF = match ? clamp(style.size, 0.7, 1.4) : 1;
  const fontSize = lh * 0.64 * sizeF;
  const thick = match ? style.thickness : 1;
  const spacingF = match ? style.spacing : 1;
  const extra = fontSize * 0.03 * (spacingF - 1);
  const perChar = script === 'latin';

  const scratch = createCanvas(10, 10).getContext('2d');
  scratch.font = `${fontSize}px "${family}"`;
  const measure = (s: string) => (scratch.measureText(s).width + (perChar ? s.length * extra : 0)) * 1.03;

  const text = normalizeAnswer(inp.answer);
  const maxWidth = W - left - right - 12 * scale;
  const pages = paginate(buildLines(text, maxWidth, measure), perPage);
  verifyFidelity(text, pages);

  const ink = inp.ink === 'Blue' ? '27,58,150' : '28,28,32';
  const bufs: Buffer[] = [];
  let lineCount = 0;

  pages.forEach((lines, pi) => {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    drawPaper(ctx, W, H, { paper: inp.paper, lh, left, top, bottom, scale }, rand);
    ctx.globalCompositeOperation = 'multiply';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${fontSize}px "${family}"`;
    const slantTan = Math.tan((slant * Math.PI) / 180);
    const lineW = Math.max(0, fontSize * 0.016 * (thick - 0.55));
    const phase = rand() * 6.28;

    const glyph = (s: string, x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rand() - 0.5) * 0.06 * jit);
      ctx.transform(1, 0, -slantTan, 1, 0, 0);
      const sc = 1 + (rand() - 0.5) * 0.07 * jit;
      ctx.scale(sc, sc);
      ctx.fillText(s, 0, 0);
      if (lineW > 0.2) ctx.strokeText(s, 0, 0);
      ctx.restore();
    };

    lines.forEach((ln, i) => {
      lineCount++;
      if (ln.blank || !ln.text) return;
      const baseY = top + (i + 1) * lh - lh * 0.22;
      let x = left + 10 * scale + ln.indent + (rand() - 0.5) * jit * 6 * scale;
      const words = ln.text.split(' ');
      const spaceW = scratch.measureText(' ').width * 1.03 + extra;
      for (const w of words) {
        const a = 0.82 + rand() * 0.14;
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgba(${ink},1)`;
        ctx.strokeStyle = `rgba(${ink},1)`;
        ctx.lineWidth = lineW;
        const drift = (xx: number) => Math.sin(xx / (90 * scale) + phase + i) * jit * fontSize * 0.02 + (rand() - 0.5) * jit * fontSize * 0.03;
        if (perChar) {
          for (const ch of Array.from(w)) {
            glyph(ch, x, baseY + drift(x));
            x += scratch.measureText(ch).width * 1.03 + extra + (rand() - 0.5) * 0.04 * fontSize * jit;
          }
        } else {
          glyph(w, x, baseY + drift(x));
          x += scratch.measureText(w).width * 1.03;
        }
        x += spaceW * (1 + (rand() - 0.5) * 0.25 * jit);
      }
      ctx.globalAlpha = 1;
    });

    if (pages.length > 1) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = `rgba(${ink},1)`;
      ctx.font = `${fontSize * 0.7}px "${family}"`;
      ctx.fillText(String(pi + 1), W - right - 40 * scale, H - bottom * 0.35);
    }
    bufs.push(canvas.toBuffer('image/png'));
  });
  return { pages: bufs, lineCount };
}
