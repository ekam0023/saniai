'use client';
import { Crop, X } from 'lucide-react';
import { fmtSize } from '@/lib/client/image';

export interface Attached { url: string; name: string; size: number }

/** Attachment chip: thumbnail, filename, size, edit (crop/rotate) and remove. */
export default function ImageUploader({ image, onEdit, onRemove }: { image: Attached; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="Attached question" className="h-12 w-12 rounded-lg object-cover" />
      <div className="min-w-0 flex-1 text-xs">
        <div className="truncate font-medium">{image.name}</div>
        <div className="text-slate-500">{fmtSize(image.size)}</div>
      </div>
      <button className="btn-icon" aria-label="Crop or rotate image" title="Crop / rotate" onClick={onEdit}><Crop className="h-4 w-4" /></button>
      <button className="btn-icon" aria-label="Remove image" title="Remove" onClick={onRemove}><X className="h-4 w-4" /></button>
    </div>
  );
}
