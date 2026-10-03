'use client';
import { BookOpen, MessageSquare, Pencil, PenLine, Plus, Settings, Trash2, X } from 'lucide-react';
import type { Chat } from '@/types';

export default function Sidebar({ name, chats, activeId, view, onNew, onOpen, onRename, onDelete, onView, onSettings, onHandwriting, onClose }: {
  name: string; chats: Chat[]; activeId: string | null; view: 'chat' | 'saved'; onNew: () => void; onOpen: (id: string) => void;
  onRename: (id: string, t: string) => void; onDelete: (id: string) => void; onView: (v: 'chat' | 'saved') => void; onSettings: () => void; onHandwriting: () => void; onClose?: () => void;
}) {
  const nav = 'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800';
  return (
    <nav aria-label="Sidebar" className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-lg font-bold text-indigo-600">{name}</span>
        {onClose && <button className="btn-icon lg:hidden" aria-label="Close menu" onClick={onClose}><X className="h-5 w-5" /></button>}
      </div>
      <button className="btn-primary w-full" onClick={onNew}><Plus className="h-4 w-4" /> New Chat</button>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="label px-3">Recent</div>
        {chats.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No chats yet.</p>}
        <ul>
          {chats.map((c) => (
            <li key={c.id} className={`group flex items-center rounded-xl ${c.id === activeId && view === 'chat' ? 'bg-indigo-50 dark:bg-indigo-950' : ''}`}>
              <button className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm" onClick={() => onOpen(c.id)}><MessageSquare className="h-4 w-4 shrink-0" /><span className="truncate">{c.title}</span></button>
              <button className="btn-icon !h-9 !w-9" aria-label={`Rename ${c.title}`} onClick={() => { const t = window.prompt('Rename chat', c.title)?.trim(); if (t) onRename(c.id, t.slice(0, 60)); }}><Pencil className="h-3.5 w-3.5" /></button>
              <button className="btn-icon !h-9 !w-9" aria-label={`Delete ${c.title}`} onClick={() => { if (window.confirm('Delete this chat?')) onDelete(c.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
        <div className="label px-3">My Notebook</div>
        <button className={nav} onClick={() => onView('saved')}><BookOpen className="h-4 w-4" /> Saved Pages</button>
        <button className={nav} onClick={onHandwriting}><PenLine className="h-4 w-4" /> Handwriting</button>
        <button className={nav} onClick={onSettings}><Settings className="h-4 w-4" /> Settings</button>
      </div>
    </nav>
  );
}
