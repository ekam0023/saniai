'use client';
import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { RotateCw } from 'lucide-react';
import { cropDataUrl, loadImage, rotateDataUrl } from '@/lib/client/image';
import { Modal } from './ui';

export default function ImageEditor({ src, onDone, onCancel, onRetake }: { src: string; onDone: (url: string) => void; onCancel: () => void; onRetake?: () => void }) {
  const [img, setImg] = useState(src);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [natural, setNatural] = useState(4 / 3);
  const [aspect, setAspect] = useState(4 / 3);
  useEffect(() => { loadImage(img).then((i) => { const r = i.naturalWidth / i.naturalHeight; setNatural(r); setAspect(r); }).catch(() => {}); }, [img]);
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const rotate = async () => { setBusy(true); setImg(await rotateDataUrl(img)); setCrop({ x: 0, y: 0 }); setZoom(1); setBusy(false); };
  const done = async () => { setBusy(true); onDone(area ? await cropDataUrl(img, area) : img); };

  return (
    <Modal title="Adjust photo" onClose={onCancel} wide>
      <div className="relative h-[55dvh] overflow-hidden rounded-2xl bg-slate-900">
        <Cropper image={img} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} objectFit="contain" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {([['Full', natural], ['4:3', 4 / 3], ['3:4', 3 / 4], ['1:1', 1]] as [string, number][]).map(([l, a]) => (
          <button key={l} className={`btn-ghost !px-3 ${Math.abs(aspect - a) < 0.001 ? '!border-indigo-500 !text-indigo-600' : ''}`} onClick={() => setAspect(a)} aria-label={`Crop shape ${l}`}>{l}</button>
        ))}
        <button className="btn-ghost" onClick={rotate} disabled={busy}><RotateCw className="h-4 w-4" /> Rotate</button>
        {onRetake && <button className="btn-ghost" onClick={onRetake}>Retake</button>}
        <label className="ml-auto flex items-center gap-2 text-xs">Zoom
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
        </label>
        <button className="btn-primary" onClick={done} disabled={busy}>Use photo</button>
      </div>
    </Modal>
  );
}
