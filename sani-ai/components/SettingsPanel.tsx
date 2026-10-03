'use client';
import { GRADES, LANGUAGES, LENGTHS, SUBJECTS, type AppSettings } from '@/types';
import { Modal, Sel } from './ui';

export default function SettingsPanel({ settings, onChange, onClose, onClearHistory, onClearPages, onDeleteHandwriting }: {
  settings: AppSettings; onChange: (s: AppSettings) => void; onClose: () => void; onClearHistory: () => void; onClearPages: () => void; onDeleteHandwriting: () => void;
}) {
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => onChange({ ...settings, [k]: v });
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Sel id="subject" label="Subject" value={settings.subject} options={SUBJECTS} onChange={(v) => set('subject', v)} />
          <Sel id="grade" label="Class" value={settings.grade} options={GRADES} onChange={(v) => set('grade', v)} />
          <Sel id="lang" label="Answer language" value={settings.language} options={LANGUAGES} onChange={(v) => set('language', v)} />
          <Sel id="length" label="Answer length" value={settings.length} options={LENGTHS} onChange={(v) => set('length', v)} />
        </div>
        <Sel id="theme" label="Theme" value={settings.theme} options={['light', 'dark', 'system'] as const} onChange={(v) => set('theme', v)} />
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={settings.autoSend} onChange={(e) => set('autoSend', e.target.checked)} /> Auto-send after voice input</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={settings.autoNotebook} onChange={(e) => set('autoNotebook', e.target.checked)} /> Also generate the notebook page after each answer</label>
        <p className="text-xs text-slate-500">Hindi and Punjabi notebook pages need matching fonts in <code>public/fonts</code>; the app tells you if one is missing.</p>
        <section className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold">Privacy</h3>
          <p className="text-xs text-slate-500">Chats, saved pages and your handwriting sample are stored only in this browser. Questions, photos and handwriting samples you submit are sent to the AI provider configured by the site owner to produce results.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => { if (confirm('Delete your handwriting sample?')) onDeleteHandwriting(); }}>Delete handwriting sample</button>
            <button className="btn-ghost" onClick={() => { if (confirm('Clear all generated pages from chats and My Notebook?')) onClearPages(); }}>Clear generated pages</button>
            <button className="btn-ghost" onClick={() => { if (confirm('Delete all chat history?')) onClearHistory(); }}>Clear history</button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
