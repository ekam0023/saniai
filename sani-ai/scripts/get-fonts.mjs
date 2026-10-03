// Downloads open-licence (OFL) handwriting fonts from the Google Fonts repository into public/fonts.
// File prefixes (latin-/devanagari-/gurmukhi-) tell the renderer which script a font covers.
import { mkdir, writeFile, access } from 'node:fs/promises';

const BASE = 'https://github.com/google/fonts/raw/main/ofl';
const FONTS = {
  'latin-patrick-hand.ttf': 'patrickhand/PatrickHand-Regular.ttf',
  'latin-indie-flower.ttf': 'indieflower/IndieFlower-Regular.ttf',
  'latin-shadows-into-light.ttf': 'shadowsintolight/ShadowsIntoLight.ttf',
  'latin-gochi-hand.ttf': 'gochihand/GochiHand-Regular.ttf',
  'devanagari-kalam.ttf': 'kalam/Kalam-Regular.ttf',
  'gurmukhi-mukta-mahee.ttf': 'muktamahee/MuktaMahee-Regular.ttf',
};
await mkdir('public/fonts', { recursive: true });
let ok = 0;
for (const [name, p] of Object.entries(FONTS)) {
  const out = `public/fonts/${name}`;
  try { await access(out); console.log('have', name); ok++; continue; } catch {}
  try {
    const res = await fetch(`${BASE}/${p}`);
    if (!res.ok) throw new Error(String(res.status));
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    console.log('downloaded', name); ok++;
  } catch (e) {
    console.warn('FAILED', name, '-', e.message, '(download it manually from fonts.google.com and save it with that file name)');
  }
}
console.log(`${ok}/${Object.keys(FONTS).length} fonts ready. All are SIL Open Font License.`);
