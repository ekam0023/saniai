'use client';
import { useRef } from 'react';
import { Camera, Paperclip, Send, X } from 'lucide-react';
import ImageUploader, { type Attached } from './ImageUploader';
import VoiceInput from './VoiceInput';

interface Props {
  value: string; onChange: (v: string) => void; onSubmit: () => void; busy: boolean;
  image: Attached | null; onPickFile: (f: File) => void; onCamera: () => void; onEditImage: () => void; onRemoveImage: () => void;
  voiceLang: 'English' | 'Hindi' | 'Punjabi'; onVoiceLang: (l: 'English' | 'Hindi' | 'Punjabi') => void;
  onVoiceText: (t: string) => void; onError: (m: string) => void; onCancel: () => void;
}

export default function InputBar(p: Props) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="border-t border-slate-200 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto max-w-3xl">
        {p.image && <ImageUploader image={p.image} onEdit={p.onEditImage} onRemove={p.onRemoveImage} />}
        <div className="flex items-end gap-1 rounded-2xl border border-slate-300 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onPickFile(f); e.target.value = ''; }} />
          <button className="btn-icon" aria-label="Attach an image" title="Attach image" onClick={() => file.current?.click()}><Paperclip className="h-5 w-5" /></button>
          <button className="btn-icon" aria-label="Take a photo" title="Camera" onClick={p.onCamera}><Camera className="h-5 w-5" /></button>
          <VoiceInput lang={p.voiceLang} onText={p.onVoiceText} onError={p.onError} disabled={p.busy} />
          <textarea
            rows={1} value={p.value} aria-label="Your question" disabled={p.busy}
            placeholder={p.image ? 'Add an instruction (optional)…' : 'Type your question…'}
            className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] focus:outline-none"
            onChange={(e) => { p.onChange(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onSubmit(); } }}
            onPaste={(e) => { const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); p.onPickFile(f); } }}
          />
          {p.busy ? (
            <button className="btn-ghost !px-3" aria-label="Cancel" onClick={p.onCancel}><X className="h-5 w-5" /></button>
          ) : (
            <button className="btn-primary !px-3" aria-label="Ask Sani" title="Ask Sani" disabled={!p.value.trim() && !p.image} onClick={p.onSubmit}><Send className="h-5 w-5" /></button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-500">
          <label className="flex items-center gap-1">Voice language
            <select className="rounded bg-transparent" value={p.voiceLang} onChange={(e) => p.onVoiceLang(e.target.value as Props['voiceLang'])} aria-label="Voice language">
              <option>English</option><option>Hindi</option><option>Punjabi</option>
            </select>
          </label>
          <span>Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
