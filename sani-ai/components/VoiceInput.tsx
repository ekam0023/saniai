'use client';
import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { transcribe } from '@/lib/client/api';

const CODES = { English: 'en-IN', Hindi: 'hi-IN', Punjabi: 'pa-IN' } as const;
type Lang = keyof typeof CODES;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any;

/** Browser speech recognition when available; otherwise records audio and uses /api/transcribe. */
export default function VoiceInput({ lang, onText, onError, disabled }: { lang: Lang; onText: (t: string) => void; onError: (m: string) => void; disabled?: boolean }) {
  const [on, setOn] = useState(false);
  const [working, setWorking] = useState(false);
  const rec = useRef<Rec>(null);
  const mr = useRef<MediaRecorder | null>(null);

  const denied = () => onError('Microphone permission was denied. Allow microphone access in your browser settings, or type your question.');

  const start = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = CODES[lang]; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e: Rec) => onText(String(e.results[0][0].transcript));
      r.onerror = (e: Rec) => { setOn(false); e.error === 'not-allowed' || e.error === 'service-not-allowed' ? denied() : e.error === 'no-speech' ? onError('We did not hear anything. Please try again.') : onError('Voice recognition failed. Please try again or type your question.'); };
      r.onend = () => setOn(false);
      rec.current = r; setOn(true); r.start();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return onError('Voice input is not supported in this browser. Please type your question.');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const m = new MediaRecorder(s);
      m.ondataavailable = (e) => chunks.push(e.data);
      m.onstop = async () => {
        s.getTracks().forEach((t) => t.stop());
        setOn(false); setWorking(true);
        try { onText(await transcribe(new Blob(chunks, { type: m.mimeType || 'audio/webm' }), lang)); } catch (e) { onError((e as Error).message); } finally { setWorking(false); }
      };
      mr.current = m; m.start(); setOn(true);
    } catch { denied(); }
  };

  const stop = () => { rec.current?.stop(); if (mr.current?.state === 'recording') mr.current.stop(); };

  return (
    <button type="button" className={`btn-icon ${on ? '!bg-red-100 !text-red-600 dark:!bg-red-950' : ''}`} disabled={disabled || working} aria-pressed={on}
      aria-label={on ? 'Stop listening' : working ? 'Transcribing' : 'Speak your question'} title={on ? 'Listening… tap to stop' : 'Voice input'} onClick={on ? stop : start}>
      {on ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}
