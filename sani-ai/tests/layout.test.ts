import { describe, expect, it } from 'vitest';
import { buildLines, paginate, verifyFidelity } from '../lib/notebook/layout';
import { normalizeAnswer } from '../lib/notebook/normalize';

const measure = (s: string) => s.length * 10;

describe('normalize', () => {
  it('strips markdown but keeps words and numbers', () => {
    expect(normalizeAnswer('**Given:**\nSpeed = 100 / 20 m/s')).toBe('Given:\nSpeed = 100 / 20 m/s');
  });
  it('converts tables', () => {
    expect(normalizeAnswer('| A | B |\n|---|---|\n| x | y |')).toBe('A | B\nx | y');
  });
});

describe('layout', () => {
  const text = 'Q. What is force?\nAns. Force is a push or pull acting on an object.\n1. First point is here.\n2. Second point is also here.';
  it('wraps without breaking words and preserves words exactly', () => {
    const lines = buildLines(text, 250, measure);
    expect(lines.every((l) => measure(l.text) <= 250 || !l.text.includes(' '))).toBe(true);
    verifyFidelity(text, paginate(lines, 4));
  });
  it('paginates and keeps all text', () => {
    const long = Array.from({ length: 30 }, (_, i) => `${i + 1}. Point number ${i + 1} is written here.`).join('\n');
    const pages = paginate(buildLines(long, 400, measure), 8);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((p) => p.length <= 8)).toBe(true);
    verifyFidelity(long, pages);
  });
  it('detects tampering', () => {
    const pages = paginate(buildLines('one two three', 400, measure), 5);
    expect(() => verifyFidelity('one two four', pages)).toThrow();
  });
});
