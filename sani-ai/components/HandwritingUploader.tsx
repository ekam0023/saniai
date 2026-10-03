'use client';
import { useRef, useState } from 'react';
import { RefreshCw, Trash2, Upload } from 'lucide-react';
import { analyzeHandwriting } from '@/lib/client/api';
import { fileToDataUrl, handwritingTip, validateImageFile } from '@/lib/client/image';
import { DEFAULT_STYLE, type Handwriting, type StyleProfile } from '@/types';
import { LoadingState } from './ui';

const SLIDERS: { key: keyof StyleProfile; label: string; min: number; max: number; step: number }[] = [
  { key: 'slant', label: 'Slant', min: -10, max: 30, step: 1 },
  { key: 'size', label: 'Size', min: 0.7, max: 1.4, step: 0.05 },
  { key: 'thickness', label: 'Pen thickness', min: 0.5, max: 2, step: 0.05 },
  { key: 'spacing', label: 'Spacing', min: 0.7, max: 1.5, step: 0.05 },
  { key: 'wobble', label: 'Messiness', min: 0, max: 2, step: 0.05 },
];

export default function HandwritingUploader({ value, onChange, onError }: { value: Handwriting | null; onChange: (h: Handwriting | null) => void; onError: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<string | null>(null);

  const pick = async (f: File) => {
    const bad = await validateImageFile(f);
    if (bad) return onError(bad);
    setBusy(true); setTip(null);
    try {
      const image = await fileToDataUrl(f, 1400);
      setTip(await handwritingTip(image));
      let style = DEFAULT_STYLE;
      try { style = await analyzeHandwriting(image); } catch (e) { onError(`${(e as Error).message} Using a default handwriting style; you can adjust the sliders below.`); }
      onChange({ image, style });
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <section aria-label="Match my handwriting" className="space-y-2">
      <h3 className="text-sm font-semibold">Match My Handwriting</h3>
      <p className="text-xs text-slate-500">Upload a clear photo of several lines of your handwriting. We generate a notebook page <em>inspired by</em> this sample. Your sample stays on this device; to analyse it, the photo is sent once to your configured AI provider.</p>
      <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
      {busy && <LoadingState message="Analyzing handwriting reference…" />}
      {value ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.image} alt="Your handwriting sample" className="max-h-40 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
          {tip && <p className="text-xs text-amber-700 dark:text-amber-300">{tip}</p>}
          {value.style.notes && <p className="text-xs text-slate-500">Detected: {value.style.notes}</p>}
          <div className="grid grid-cols-1 gap-2">
            {SLIDERS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0">{s.label}</span>
                <input className="flex-1" type="range" min={s.min} max={s.max} step={s.step} value={value.style[s.key] as number} aria-label={s.label}
                  onChange={(e) => onChange({ ...value, style: { ...value.style, [s.key]: Number(e.target.value) } as StyleProfile })} />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => input.current?.click()}><RefreshCw className="h-4 w-4" /> Replace</button>
            <button className="btn-ghost flex-1" onClick={() => onChange(null)}><Trash2 className="h-4 w-4" /> Delete sample</button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost w-full" disabled={busy} onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> Upload handwriting photo</button>
      )}
      <p className="text-[11px] text-slate-500">Tip: use plain paper, good light, and hold the phone straight above the page.</p>
    </section>
  );
}
