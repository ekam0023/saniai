'use client';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export function Sel<T extends string>({ label, value, options, onChange, id }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; id: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function LoadingState({ message, onCancel }: { message: string; onCancel?: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span className="flex-1">{message}</span>
      {onCancel && <button className="rounded-lg px-2 py-1 text-xs font-medium underline" onClick={onCancel}>Cancel</button>}
    </div>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      <button className="btn-icon !h-6 !w-6 !min-h-0" aria-label="Dismiss message" onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-icon" aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
