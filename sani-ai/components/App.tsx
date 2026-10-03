'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, NotebookPen, Settings as Cog } from 'lucide-react';
import { analyzeImage, generateNotebook, streamAnswer } from '@/lib/client/api';
import { fileToDataUrl, thumbnail, validateImageFile } from '@/lib/client/image';
import { clearStore, deleteItem, getItem, listItems, putItem } from '@/lib/client/storage';
import { DEFAULT_SETTINGS, type AppSettings, type Chat, type Handwriting, type SavedPage, type Turn } from '@/types';
import CameraInput from './CameraInput';
import ChatWindow from './ChatWindow';
import ImageEditor from './ImageEditor';
import type { Attached } from './ImageUploader';
import InputBar from './InputBar';
import MyNotebookGrid from './MyNotebookGrid';
import NotebookPanel from './NotebookPanel';
import QuestionPicker from './QuestionPicker';
import SettingsPanel from './SettingsPanel';
import Sidebar from './Sidebar';
import { ErrorBanner, LoadingState } from './ui';

const NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Sani AI';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const titleFrom = (q: string) => { const t = q.replace(/^Q[.:)]\s*/i, '').replace(/\s+/g, ' ').trim(); return (t.length > 44 ? t.slice(0, 44).trim() + '…' : t) || 'New chat'; };
const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [saved, setSaved] = useState<SavedPage[]>([]);
  const [hw, setHwState] = useState<Handwriting | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'saved'>('chat');
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<Attached | null>(null);
  const [editingImage, setEditingImage] = useState(false);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [nbBusyId, setNbBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ questions: string[]; hasDiagram: boolean; instruction: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const camInput = useRef<HTMLInputElement>(null);
  const chatsRef = useRef<Chat[]>([]);
  chatsRef.current = chats;

  // ---------- load / persist ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sani.settings');
      if (raw) { const s = JSON.parse(raw); setSettings({ ...DEFAULT_SETTINGS, ...s, notebook: { ...DEFAULT_SETTINGS.notebook, ...(s.notebook || {}) } }); }
    } catch { /* ignore corrupt settings */ }
    listItems<Chat>('chats').then((c) => setChats(c.sort((a, b) => b.createdAt - a.createdAt))).catch(() => {});
    listItems<SavedPage>('pages').then((p) => setSaved(p.sort((a, b) => b.createdAt - a.createdAt))).catch(() => {});
    getItem<Handwriting & { id: string }>('kv', 'handwriting').then((h) => { if (h) setHwState({ image: h.image, style: h.style }); }).catch(() => {});
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem('sani.settings', JSON.stringify(settings)); } catch { /* storage full/blocked */ } }, [settings, loaded]);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && mq.matches));
    apply(); mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  const setHw = (h: Handwriting | null) => {
    setHwState(h);
    (h ? putItem('kv', { id: 'handwriting', ...h }) : deleteItem('kv', 'handwriting')).catch(() => setError('Could not store the handwriting sample on this device.'));
  };

  const chat = chats.find((c) => c.id === activeId) ?? null;
  const turn = chat?.turns.find((t) => t.id === selectedTurnId) ?? chat?.turns[chat.turns.length - 1] ?? null;

  const updateTurn = useCallback((cid: string, tid: string, patch: Partial<Turn>, persist = true) => {
    setChats((prev) => {
      const next = prev.map((c) => (c.id !== cid ? c : { ...c, turns: c.turns.map((t) => (t.id !== tid ? t : { ...t, ...patch })) }));
      if (persist) { const c = next.find((x) => x.id === cid); if (c) putItem('chats', c).catch(() => {}); }
      return next;
    });
  }, []);

  const removeTurn = (cid: string, tid: string) => setChats((prev) => {
    const next = prev.map((c) => (c.id !== cid ? c : { ...c, turns: c.turns.filter((t) => t.id !== tid) })).filter((c) => c.turns.length || c.id !== cid);
    const c = next.find((x) => x.id === cid);
    (c ? putItem('chats', c) : deleteItem('chats', cid)).catch(() => {});
    return next;
  });

  // ---------- answers ----------
  const streamInto = async (cid: string, t: Turn, removeOnFail: boolean) => {
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setStreamingId(t.id); setBusy('Thinking…'); setError(null);
    try {
      const full = await streamAnswer({ question: t.question, additionalInstructions: t.instructions, subject: t.subject, grade: t.grade, language: t.language, length: t.length },
        (txt) => updateTurn(cid, t.id, { answer: txt }, false), ctrl.signal);
      updateTurn(cid, t.id, { answer: full });
      if (settings.autoNotebook) await makeNotebook(cid, { ...t, answer: full }, false);
    } catch (e) {
      if (!isAbort(e)) setError((e as Error).message);
      const cur = chatsRef.current.find((c) => c.id === cid)?.turns.find((x) => x.id === t.id);
      if (cur && !cur.answer.trim() && removeOnFail) removeTurn(cid, t.id);
      else updateTurn(cid, t.id, {}); // persist whatever was received
    } finally { setStreamingId(null); setBusy(null); }
  };

  const startTurn = async (question: string, instructions: string, cid: string) => {
    const t: Turn = { id: uid(), question, answer: '', instructions, subject: settings.subject, grade: settings.grade, language: settings.language, length: settings.length, createdAt: Date.now(), pages: [], seed: Math.floor(Math.random() * 1e9) };
    setChats((prev) => prev.some((c) => c.id === cid)
      ? prev.map((c) => (c.id === cid ? { ...c, turns: [...c.turns, t] } : c))
      : [{ id: cid, title: titleFrom(question), createdAt: Date.now(), turns: [t] }, ...prev]);
    setActiveId(cid); setSelectedTurnId(t.id); setView('chat');
    await streamInto(cid, t, true);
  };

  const submit = async (override?: string) => {
    if (busy) return;
    const text = (override ?? input).trim();
    setError(null);
    if (image) {
      const ctrl = new AbortController(); abortRef.current = ctrl;
      setBusy('Reading your question…');
      try {
        const r = await analyzeImage(image.url, ctrl.signal);
        if (!r.questions.length) setError("We couldn't find a question in that photo. Try cropping closer or retaking it in better light.");
        else setDetected({ questions: r.questions, hasDiagram: r.hasDiagram, instruction: text });
      } catch (e) { if (!isAbort(e)) setError((e as Error).message); } finally { setBusy(null); }
      return;
    }
    if (text.length < 2) return setError('Please type a question first.');
    setInput('');
    await startTurn(text, '', activeId ?? uid());
  };

  const answerDetected = async (qs: string[]) => {
    const instruction = detected?.instruction ?? '';
    setDetected(null); setImage(null); setInput('');
    const cid = activeId ?? uid();
    for (const q of qs) await startTurn(q, instruction, cid);
  };

  const regenerateAnswer = async (t: Turn) => {
    if (!chat || busy) return;
    updateTurn(chat.id, t.id, { answer: '', pages: [] }, false);
    await streamInto(chat.id, { ...t, answer: '', pages: [] }, false);
  };

  // ---------- notebook ----------
  async function makeNotebook(cid: string, t: Turn, newLook: boolean) {
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const seed = newLook ? Math.floor(Math.random() * 1e9) : t.seed;
    setNbBusyId(t.id); setError(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) setSheet(true);
    try {
      const pages = await generateNotebook({ answer: t.answer, language: t.language, settings: settings.notebook, style: hw?.style, seed }, ctrl.signal);
      updateTurn(cid, t.id, { pages, seed });
    } catch (e) { if (!isAbort(e)) setError((e as Error).message); } finally { setNbBusyId(null); }
  }

  const savePages = async () => {
    if (!turn || !turn.pages.length) return;
    try {
      const item: SavedPage = { id: turn.id, title: titleFrom(turn.question), subject: turn.subject === 'Auto Detect' ? 'General' : turn.subject, createdAt: Date.now(), thumb: await thumbnail(turn.pages[0]), pages: turn.pages };
      await putItem('pages', item);
      setSaved((p) => [item, ...p.filter((x) => x.id !== item.id)]);
    } catch { setError('Could not save this page on your device. Storage may be full.'); }
  };

  // ---------- images ----------
  const pickFile = async (f: File) => {
    const bad = await validateImageFile(f);
    if (bad) return setError(bad);
    try { setImage({ url: await fileToDataUrl(f), name: f.name, size: f.size }); setError(null); } catch (e) { setError((e as Error).message); }
  };

  const cancel = () => abortRef.current?.abort();
  const newChat = () => { setActiveId(null); setSelectedTurnId(null); setView('chat'); setDrawer(false); setDetected(null); setImage(null); setInput(''); };

  return (
    <div className="flex h-[100dvh] overflow-hidden"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <Sidebar name={NAME} chats={chats} activeId={activeId} view={view} onNew={newChat}
          onOpen={(id) => { setActiveId(id); setSelectedTurnId(null); setView('chat'); }}
          onRename={(id, t) => setChats((p) => p.map((c) => { if (c.id !== id) return c; const n = { ...c, title: t }; putItem('chats', n).catch(() => {}); return n; }))}
          onDelete={(id) => { setChats((p) => p.filter((c) => c.id !== id)); deleteItem('chats', id).catch(() => {}); if (id === activeId) setActiveId(null); }}
          onView={setView} onSettings={() => setShowSettings(true)} onHandwriting={() => setSheet(true)} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl dark:bg-slate-900">
            <Sidebar name={NAME} chats={chats} activeId={activeId} view={view} onNew={newChat} onClose={() => setDrawer(false)}
              onOpen={(id) => { setActiveId(id); setSelectedTurnId(null); setView('chat'); setDrawer(false); }}
              onRename={(id, t) => setChats((p) => p.map((c) => { if (c.id !== id) return c; const n = { ...c, title: t }; putItem('chats', n).catch(() => {}); return n; }))}
              onDelete={(id) => { setChats((p) => p.filter((c) => c.id !== id)); deleteItem('chats', id).catch(() => {}); if (id === activeId) setActiveId(null); }}
              onView={(v) => { setView(v); setDrawer(false); }} onSettings={() => { setShowSettings(true); setDrawer(false); }} onHandwriting={() => { setSheet(true); setDrawer(false); }} />
          </aside>
        </div>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-slate-900">
          <button className="btn-icon lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></button>
          <div className="flex-1 truncate px-1 py-2"><span className="font-bold text-indigo-600">{NAME}</span> <span className="hidden text-xs text-slate-500 sm:inline">Turn questions into notebook-ready answers.</span></div>
          <button className="btn-ghost !px-3 xl:hidden" onClick={() => setSheet(true)}><NotebookPen className="h-4 w-4" /> <span className="hidden sm:inline">Notebook</span></button>
          <button className="btn-icon" aria-label="Settings" onClick={() => setShowSettings(true)}><Cog className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {view === 'saved' ? (
            <MyNotebookGrid items={saved} onError={setError} onDelete={(id) => { setSaved((p) => p.filter((s) => s.id !== id)); deleteItem('pages', id).catch(() => {}); }} />
          ) : (
            <ChatWindow name={NAME} chat={chat} streamingId={streamingId} selectedId={turn?.id ?? null} nbBusyId={nbBusyId}
              onSelect={setSelectedTurnId} onRegenerate={regenerateAnswer}
              onSaveEdit={(t, text) => chat && updateTurn(chat.id, t.id, { answer: text, pages: [] })}
              onGenerateNotebook={(t) => { setSelectedTurnId(t.id); if (chat) makeNotebook(chat.id, t, false); }} onExample={setInput}>
              {busy && !streamingId && <LoadingState message={busy} onCancel={cancel} />}
              {streamingId && <LoadingState message="Thinking…" onCancel={cancel} />}
              {detected && <QuestionPicker questions={detected.questions} hasDiagram={detected.hasDiagram} onAnswer={answerDetected} onCancel={() => setDetected(null)} />}
              {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
            </ChatWindow>
          )}
        </div>

        {view === 'chat' && (
          <InputBar value={input} onChange={setInput} onSubmit={() => submit()} busy={!!busy} image={image}
            onPickFile={pickFile} onCamera={() => setCamera(true)} onEditImage={() => setEditingImage(true)} onRemoveImage={() => setImage(null)}
            voiceLang={settings.voiceLang} onVoiceLang={(l) => setSettings({ ...settings, voiceLang: l })} onError={setError} onCancel={cancel}
            onVoiceText={(t) => (settings.autoSend ? submit(t) : setInput((p) => (p ? `${p} ${t}` : t)))} />
        )}
        {view === 'saved' && error && <div className="p-3"><ErrorBanner message={error} onClose={() => setError(null)} /></div>}

        {dragging && <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-indigo-600/20 text-lg font-semibold text-indigo-700 backdrop-blur-sm">Drop your image here</div>}
      </main>

      {sheet && <div className="fixed inset-0 z-30 bg-black/40 xl:hidden" onClick={() => setSheet(false)} />}
      <aside aria-label="Notebook generator" className={`${sheet ? 'fixed inset-x-0 bottom-0 z-40 block max-h-[88dvh] rounded-t-3xl shadow-2xl' : 'hidden'} overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] dark:bg-slate-900 xl:static xl:z-auto xl:block xl:max-h-none xl:w-[380px] xl:shrink-0 xl:rounded-none xl:border-l xl:border-slate-200 xl:shadow-none xl:dark:border-slate-800`}>
        <NotebookPanel settings={settings.notebook} onSettings={(n) => setSettings({ ...settings, notebook: n })} hw={hw} onHw={setHw}
          turn={turn} busy={!!turn && nbBusyId === turn.id} onGenerate={(nl) => chat && turn && makeNotebook(chat.id, turn, nl)}
          onSave={savePages} saved={!!turn && saved.find((s) => s.id === turn.id)?.pages[0] === turn.pages[0] && turn.pages.length > 0} onError={setError} onClose={() => setSheet(false)} />
      </aside>

      {camera && <CameraInput onClose={() => setCamera(false)} onFallback={() => camInput.current?.click()}
        onCapture={(url) => { setCamera(false); setImage({ url, name: 'camera-photo.jpg', size: Math.round(url.length * 0.75) }); setEditingImage(true); }} />}
      <input ref={camInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
      {editingImage && image && <ImageEditor src={image.url} onCancel={() => setEditingImage(false)} onRetake={() => { setEditingImage(false); setImage(null); setCamera(true); }}
        onDone={(url) => { setImage({ ...image, url, size: Math.round(url.length * 0.75) }); setEditingImage(false); }} />}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)}
        onClearHistory={() => { setChats([]); setActiveId(null); clearStore('chats').catch(() => {}); }}
        onClearPages={() => { const next = chats.map((c) => ({ ...c, turns: c.turns.map((t) => ({ ...t, pages: [] as string[] })) })); setChats(next); next.forEach((c) => putItem('chats', c).catch(() => {})); setSaved([]); clearStore('pages').catch(() => {}); }}
        onDeleteHandwriting={() => setHw(null)} />}
    </div>
  );
}
