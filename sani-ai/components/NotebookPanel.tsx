'use client';
import { NotebookPen, RefreshCw, X } from 'lucide-react';
import { INKS, MARGINS, PAGE_SIZES, PAPERS, SPACINGS, WRITINGS, type Handwriting, type NotebookSettings, type Turn } from '@/types';
import HandwritingUploader from './HandwritingUploader';
import NotebookPreview from './NotebookPreview';
import { LoadingState, Sel } from './ui';

export default function NotebookPanel({ settings, onSettings, hw, onHw, turn, busy, onGenerate, onSave, saved, onError, onClose }: {
  settings: NotebookSettings; onSettings: (s: NotebookSettings) => void; hw: Handwriting | null; onHw: (h: Handwriting | null) => void;
  turn: Turn | null; busy: boolean; onGenerate: (newLook: boolean) => void; onSave: () => void; saved: boolean; onError: (m: string) => void; onClose?: () => void;
}) {
  const set = <K extends keyof NotebookSettings>(k: K, v: NotebookSettings[K]) => onSettings({ ...settings, [k]: v });
  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Notebook Generator</h2>
        {onClose && <button className="btn-icon xl:hidden" aria-label="Close panel" onClick={onClose}><X className="h-5 w-5" /></button>}
      </div>
      <HandwritingUploader value={hw} onChange={onHw} onError={onError} />
      <section aria-label="Notebook settings" className="space-y-2">
        <h3 className="text-sm font-semibold">Notebook settings</h3>
        <div className="grid grid-cols-2 gap-2">
          <Sel id="paper" label="Paper" value={settings.paper} options={PAPERS} onChange={(v) => set('paper', v)} />
          <Sel id="ink" label="Ink" value={settings.ink} options={INKS} onChange={(v) => set('ink', v)} />
          <Sel id="page" label="Page" value={settings.pageSize} options={PAGE_SIZES} onChange={(v) => set('pageSize', v)} />
          <Sel id="writing" label="Writing" value={settings.writing} options={WRITINGS} onChange={(v) => set('writing', v)} />
          <Sel id="spacing" label="Line spacing" value={settings.lineSpacing} options={SPACINGS} onChange={(v) => set('lineSpacing', v)} />
          <Sel id="margin" label="Margin" value={settings.margin} options={MARGINS} onChange={(v) => set('margin', v)} />
        </div>
        {settings.writing === 'Match Reference' && !hw && <p className="text-xs text-amber-700 dark:text-amber-300">Upload a handwriting sample to use “Match Reference”. Until then a default style is used.</p>}
      </section>
      {turn ? (
        <div className="space-y-2">
          <button className="btn-primary w-full" disabled={busy || !turn.answer} onClick={() => onGenerate(false)}><NotebookPen className="h-4 w-4" /> {turn.pages.length ? 'Regenerate with new settings' : 'Generate Notebook'}</button>
          {turn.pages.length > 0 && <button className="btn-ghost w-full" disabled={busy} onClick={() => onGenerate(true)}><RefreshCw className="h-4 w-4" /> New handwriting variation (same text)</button>}
          {busy && <LoadingState message="Writing your answer into the notebook…" />}
          {turn.pages.length > 0 && <NotebookPreview pages={turn.pages} title={turn.question.slice(0, 40)} saved={saved} onSave={onSave} onError={onError} />}
        </div>
      ) : <p className="text-sm text-slate-500">Ask a question first, then generate your notebook page here.</p>}
    </div>
  );
}
