'use client';
import { useEffect, useRef } from 'react';
import { BookOpenCheck, Camera, Mic, PenLine } from 'lucide-react';
import type { Chat, Turn } from '@/types';
import AnswerCard from './AnswerCard';

const EXAMPLES = ['What is photosynthesis?', 'Difference between mass and weight', 'A car travels 100 m in 20 s. Find its speed.', 'Write any four effects of force.'];

export default function ChatWindow({ name, chat, streamingId, selectedId, nbBusyId, onSelect, onRegenerate, onSaveEdit, onGenerateNotebook, onExample, children }: {
  name: string; chat: Chat | null; streamingId: string | null; selectedId: string | null; nbBusyId: string | null;
  onSelect: (id: string) => void; onRegenerate: (t: Turn) => void; onSaveEdit: (t: Turn, text: string) => void; onGenerateNotebook: (t: Turn) => void; onExample: (q: string) => void; children?: React.ReactNode;
}) {
  const end = useRef<HTMLDivElement>(null);
  const lastLen = chat?.turns.length ? chat.turns[chat.turns.length - 1].answer.length : 0;
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chat?.id, chat?.turns.length, streamingId, lastLen]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {!chat?.turns.length && (
        <div className="space-y-5 py-8 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">Turn questions into notebook-ready answers.</h1>
          <p className="text-sm text-slate-500">Type, snap a photo or speak your question. {name} writes a textbook-style answer, then puts it on a notebook page in handwriting inspired by yours.</p>
          <ol className="mx-auto grid max-w-xl grid-cols-1 gap-2 text-left text-sm sm:grid-cols-3">
            <li className="card flex items-center gap-2 !p-3"><Camera className="h-4 w-4 text-indigo-600" /> Ask by type, photo or voice <Mic className="h-4 w-4 text-indigo-600" /></li>
            <li className="card flex items-center gap-2 !p-3"><PenLine className="h-4 w-4 text-indigo-600" /> Add your handwriting</li>
            <li className="card flex items-center gap-2 !p-3"><BookOpenCheck className="h-4 w-4 text-indigo-600" /> Download PNG / PDF</li>
          </ol>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e) => <button key={e} className="btn-ghost !min-h-0 !py-1.5 text-xs" onClick={() => onExample(e)}>{e}</button>)}
          </div>
        </div>
      )}
      {chat?.turns.map((t) => (
        <AnswerCard key={t.id} turn={t} streaming={streamingId === t.id} selected={selectedId === t.id} onSelect={() => onSelect(t.id)}
          onRegenerate={() => onRegenerate(t)} onSaveEdit={(x) => onSaveEdit(t, x)} onGenerateNotebook={() => onGenerateNotebook(t)} notebookBusy={nbBusyId === t.id} />
      ))}
      {children}
      <div ref={end} />
    </div>
  );
}
