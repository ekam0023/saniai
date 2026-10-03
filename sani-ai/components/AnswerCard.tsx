'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Check, Copy, NotebookPen, Pencil, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import type { Turn } from '@/types';

const VOICE: Record<string, string> = { English: 'en-IN', Hindi: 'hi-IN', Punjabi: 'pa-IN', Hinglish: 'en-IN' };

export default function AnswerCard({ turn, streaming, selected, onSelect, onRegenerate, onSaveEdit, onGenerateNotebook, notebookBusy }: {
  turn: Turn; streaming: boolean; selected: boolean; onSelect: () => void; onRegenerate: () => void; onSaveEdit: (t: string) => void; onGenerateNotebook: () => void; notebookBusy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(turn.answer); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(turn.answer);
    u.lang = VOICE[turn.language] || 'en-IN';
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setSpeaking(true); speechSynthesis.speak(u);
  };

  return (
    <article className={`card space-y-3 ${selected ? 'ring-2 ring-indigo-400' : ''}`} onClick={onSelect} aria-label="Answer">
      <div>
        <div className="label">Question</div>
        <p className="text-sm font-medium">{turn.question}</p>
      </div>
      <hr className="border-slate-200 dark:border-slate-800" />
      <div className="label">Answer</div>
      {editing ? (
        <div className="space-y-2">
          <textarea className="field min-h-[200px] font-mono" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit answer" />
          <p className="text-xs text-slate-500">Each line break you type here is kept in the notebook. The notebook uses exactly this text.</p>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => { onSaveEdit(draft); setEditing(false); }}>Save changes</button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="md text-[15px] leading-relaxed" aria-live={streaming ? 'polite' : 'off'}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{turn.answer || '…'}</ReactMarkdown>
          {streaming && <span className="inline-block h-4 w-1.5 animate-pulse bg-indigo-500 align-middle" />}
        </div>
      )}
      {!streaming && !editing && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied!' : 'Copy'}</button>
          <button className="btn-ghost" onClick={() => { setDraft(turn.answer); setEditing(true); }}><Pencil className="h-4 w-4" /> Edit</button>
          <button className="btn-ghost" onClick={onRegenerate}><RefreshCw className="h-4 w-4" /> Regenerate</button>
          <button className="btn-ghost" onClick={speak} aria-label={speaking ? 'Stop reading' : 'Read aloud'}>{speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {speaking ? 'Stop' : 'Read Aloud'}</button>
          <button className="btn-primary ml-auto" disabled={notebookBusy} onClick={(e) => { e.stopPropagation(); onGenerateNotebook(); }}><NotebookPen className="h-4 w-4" /> Generate Notebook</button>
        </div>
      )}
    </article>
  );
}
