/**
 * Strips markup (markdown/HTML/extra whitespace) only. Never changes words, numbers, punctuation or formulas.
 * Table rows become "cell | cell" lines so they stay readable when handwritten.
 */
export function normalizeAnswer(raw: string): string {
  const out: string[] = [];
  const text = raw.replace(/\r\n?/g, '\n').replace(/<\/?[a-zA-Z][^>]*>/g, '');
  for (let line of text.split('\n')) {
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('|')) continue; // table separator row
    if (/^\s*\|.*\|\s*$/.test(line)) {
      line = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).filter(Boolean).join(' | ');
    }
    line = line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/\*\*|__/g, '')
      .replace(/`/g, '')
      .replace(/\$/g, '')
      .replace(/^\s*\*\s+/, '- ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
