'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Maximize2, Minimize2, Save, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { downloadPdf } from '@/lib/client/api';
import { slug, toJpegDataUrl } from '@/lib/client/image';

function save(href: string, name: string) { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }

export default function NotebookPreview({ pages, title, saved, onSave, onError }: { pages: string[]; title: string; saved?: boolean; onSave?: () => void; onError: (m: string) => void }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const idx = Math.min(i, pages.length - 1);
  const base = slug(title);

  const png = () => save(pages[idx], `${base}-notebook-page-${idx + 1}.png`);
  const jpg = async () => save(await toJpegDataUrl(pages[idx]), `${base}-notebook-page-${idx + 1}.jpg`);
  const pdf = async () => { try { await downloadPdf(pages, `${base}-notes`); } catch (e) { onError((e as Error).message); } };
  const share = async () => {
    try {
      const blob = await (await fetch(pages[idx])).blob();
      const file = new File([blob], `${base}-notebook-page-${idx + 1}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
      else png();
    } catch { /* user cancelled */ }
  };

  const view = (
    <div className={full ? 'fixed inset-0 z-[60] flex flex-col bg-slate-900/95 p-3' : 'space-y-2'}>
      <div className={`overflow-auto rounded-xl bg-slate-200 p-2 dark:bg-slate-800 ${full ? 'flex-1' : 'max-h-[60dvh]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pages[idx]} alt={`Notebook page ${idx + 1} of ${pages.length}: ${title}`} loading="lazy" style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} className="mx-auto block shadow-lg" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
        <button className="btn-icon" aria-label="Previous page" disabled={idx === 0} onClick={() => setI(idx - 1)}><ChevronLeft className="h-5 w-5" /></button>
        <span className={`px-2 ${full ? 'text-white' : ''}`} aria-live="polite">Page {idx + 1} / {pages.length}</span>
        <button className="btn-icon" aria-label="Next page" disabled={idx === pages.length - 1} onClick={() => setI(idx + 1)}><ChevronRight className="h-5 w-5" /></button>
        <button className="btn-icon" aria-label="Zoom out" disabled={zoom <= 0.6} onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}><ZoomOut className="h-5 w-5" /></button>
        <button className="btn-icon" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}><ZoomIn className="h-5 w-5" /></button>
        <button className="btn-icon" aria-label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFull(!full)}>{full ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}</button>
      </div>
      {!full && (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={png}><Download className="h-4 w-4" /> PNG</button>
          <button className="btn-ghost" onClick={jpg}><Download className="h-4 w-4" /> JPG</button>
          <button className="btn-ghost" onClick={pdf}><FileText className="h-4 w-4" /> PDF{pages.length > 1 ? ` (${pages.length})` : ''}</button>
          <button className="btn-ghost" onClick={share}><Share2 className="h-4 w-4" /> Share</button>
          {onSave && <button className="btn-primary col-span-2" disabled={saved} onClick={onSave}><Save className="h-4 w-4" /> {saved ? 'Saved to My Notebook' : 'Save to My Notebook'}</button>}
        </div>
      )}
    </div>
  );
  return view;
}
