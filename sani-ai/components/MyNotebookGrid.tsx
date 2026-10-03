'use client';
import { useState } from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';
import { downloadPdf } from '@/lib/client/api';
import { slug } from '@/lib/client/image';
import type { SavedPage } from '@/types';
import NotebookPreview from './NotebookPreview';
import { Modal } from './ui';

export default function MyNotebookGrid({ items, onDelete, onError }: { items: SavedPage[]; onDelete: (id: string) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState<SavedPage | null>(null);
  const [q, setQ] = useState('');
  const shown = items.filter((s) => (s.title + s.subject).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">My Notebook</h1>
        <input className="field max-w-xs" placeholder="Search saved pages…" aria-label="Search saved pages" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {shown.length === 0 && <p className="text-sm text-slate-500">{items.length ? 'Nothing matches your search.' : 'No saved pages yet. Generate a notebook page and tap “Save to My Notebook”.'}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((s) => (
          <div key={s.id} className="card !p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.thumb} alt={`Thumbnail of ${s.title}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-cover object-top" />
            <div className="mt-2 px-1 text-xs">
              <div className="truncate font-medium">{s.title}</div>
              <div className="text-slate-500">{s.subject} · {new Date(s.createdAt).toLocaleDateString()} · {s.pages.length} page{s.pages.length > 1 ? 's' : ''}</div>
            </div>
            <div className="mt-2 flex">
              <button className="btn-icon" aria-label="Open" onClick={() => setOpen(s)}><Eye className="h-4 w-4" /></button>
              <button className="btn-icon" aria-label="Download PDF" onClick={() => downloadPdf(s.pages, `${slug(s.title)}-notes`).catch((e) => onError((e as Error).message))}><Download className="h-4 w-4" /></button>
              <button className="btn-icon ml-auto" aria-label="Delete" onClick={() => { if (window.confirm('Delete this saved page?')) onDelete(s.id); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {open && <Modal title={open.title} onClose={() => setOpen(null)} wide><NotebookPreview pages={open.pages} title={open.title} onError={onError} /></Modal>}
    </div>
  );
}
