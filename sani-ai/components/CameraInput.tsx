'use client';
import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui';

/** Live camera capture. Falls back to the device's native camera/file picker when unavailable. */
export default function CameraInput({ onCapture, onClose, onFallback }: { onCapture: (dataUrl: string) => void; onClose: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    if (!navigator.mediaDevices?.getUserMedia) { onFallback(); onClose(); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => { if (dead) { s.getTracks().forEach((t) => t.stop()); return; } stream.current = s; if (video.current) video.current.srcObject = s; })
      .catch(() => setErr('Camera access was blocked or unavailable. You can pick a photo from your device instead.'));
    return () => { dead = true; stream.current?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const r = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * r); c.height = Math.round(v.videoHeight * r);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    onCapture(c.toDataURL('image/jpeg', 0.9));
  };

  return (
    <Modal title="Take a photo" onClose={onClose} wide>
      {err ? (
        <div className="space-y-3 text-sm"><p>{err}</p><button className="btn-primary" onClick={() => { onClose(); onFallback(); }}>Choose a photo</button></div>
      ) : (
        <>
          <video ref={video} autoPlay playsInline muted className="max-h-[60dvh] w-full rounded-2xl bg-black" aria-label="Camera preview" />
          <div className="mt-3 flex justify-between gap-2">
            <button className="btn-ghost" onClick={() => { onClose(); onFallback(); }}>Use gallery</button>
            <button className="btn-primary" onClick={snap}>Capture</button>
          </div>
        </>
      )}
    </Modal>
  );
}
