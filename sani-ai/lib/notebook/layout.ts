export interface LayoutLine { text: string; indent: number; heading: boolean; blank: boolean; para: number }
export type Measure = (s: string) => number;

const HEADING = /^(Q\.|Q\d*[.)]|Ans\.?|Answer\s*:|Given\s*:|Formula\s*:|Substitution\s*:|Calculation\s*:|Solution\s*:)/i;

/** Wraps text into notebook lines using real text metrics. Never splits a word; hanging indent for list items. */
export function buildLines(text: string, maxWidth: number, measure: Measure): LayoutLine[] {
  const lines: LayoutLine[] = [];
  let para = 0;
  for (const raw of text.split('\n')) {
    para++;
    const s = raw.trim();
    if (!s) {
      if (lines.length && !lines[lines.length - 1].blank) lines.push({ text: '', indent: 0, heading: false, blank: true, para });
      continue;
    }
    const m = s.match(/^(\d+[.)]|[-•])\s+/);
    const indent = m ? measure(m[0]) : 0;
    const heading = (HEADING.test(s) && s.length <= 30) || (/:$/.test(s) && s.length <= 40);
    let cur = '';
    let first = true;
    const push = () => {
      lines.push({ text: cur, indent: first ? 0 : indent, heading: heading && first, blank: false, para });
      first = false;
    };
    for (const w of s.split(/\s+/)) {
      const trial = cur ? `${cur} ${w}` : w;
      if (!cur || measure(trial) <= maxWidth - (first ? 0 : indent)) cur = trial;
      else { push(); cur = w; }
    }
    if (cur) push();
  }
  while (lines.length && lines[lines.length - 1].blank) lines.pop();
  return lines;
}

/** Splits lines into pages. Keeps paragraphs together when they fit, keeps headings with the next paragraph, avoids widows. */
export function paginate(lines: LayoutLine[], perPage: number): LayoutLine[][] {
  const blocks: LayoutLine[][] = [];
  for (let i = 0; i < lines.length; ) {
    const p = lines[i].para;
    const blk: LayoutLine[] = [];
    while (i < lines.length && lines[i].para === p) blk.push(lines[i++]);
    blocks.push(blk);
  }
  const merged: LayoutLine[][] = [];
  for (let b = 0; b < blocks.length; b++) {
    const blk = blocks[b];
    if (blk.length === 1 && blk[0].heading && b + 1 < blocks.length && !blocks[b + 1][0].blank) merged.push([...blk, ...blocks[++b]]);
    else merged.push(blk);
  }
  const pages: LayoutLine[][] = [[]];
  for (const blk of merged) {
    let cur = pages[pages.length - 1];
    if (blk[0].blank) { if (cur.length > 0 && cur.length < perPage) cur.push(...blk); continue; }
    if (cur.length + blk.length <= perPage) { cur.push(...blk); continue; }
    if (blk.length <= perPage) { pages.push([...blk]); continue; }
    const rest = [...blk];
    while (rest.length) {
      cur = pages[pages.length - 1];
      const space = perPage - cur.length;
      if (space < 1 || (space === 1 && rest.length > 1 && cur.length > 0)) { pages.push([]); continue; }
      let take = Math.min(space, rest.length);
      if (rest.length - take === 1 && take > 2) take--;
      cur.push(...rest.splice(0, take));
      if (rest.length) pages.push([]);
    }
  }
  for (const p of pages) while (p.length && p[p.length - 1].blank) p.pop();
  const out = pages.filter((p) => p.length);
  return out.length ? out : [[]];
}

export const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);

/** Throws if the words on the pages differ from the approved text. */
export function verifyFidelity(approved: string, pages: LayoutLine[][]) {
  const a = wordsOf(approved);
  const b = wordsOf(pages.flat().map((l) => l.text).join(' '));
  if (a.length !== b.length || a.some((w, i) => w !== b[i])) throw new Error('Notebook text did not match the approved answer.');
}
