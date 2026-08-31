"use client";

import { useEffect, useRef } from "react";

/*
  A scroll-scrubbed frame sequence.

  Fifty-one WebP frames of a real car, drawn to a canvas at whatever frame the
  scroll position picks. This is the technique Apple uses for the same kind of
  shot, and it is chosen over the two alternatives for concrete reasons:

  - A <video> scrubbed with `currentTime` would be ~400KB rather than 1.2MB,
    but seeking is genuinely unreliable on iOS Safari: it stutters and
    sometimes does not land. Frames always land.
  - A live 3D model would need ~150KB of three.js plus a multi-megabyte GLB,
    would need a WebGL fallback, and would render on the device rather than
    offline. Frames are smaller, work everywhere, and look as good as the
    render rather than as good as the phone.

  The sequence itself came from a 97MB PNG export: 152 frames at 24fps, cut to
  every third frame, held at the source's own 1152px rather than upscaled, and
  encoded as WebP q76. 1.23MB for the set, 25KB a frame.
*/

const FRAME_COUNT = 51;
const frameSrc = (i: number) =>
  `/car/f${String(Math.min(FRAME_COUNT, Math.max(1, i))).padStart(3, "0")}.webp`;

export function CarSequence({ progress }: { progress: React.RefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const drawnRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let alive = true;
    let raf = 0;

    const draw = (i: number) => {
      const img = framesRef.current[i - 1];
      if (!img?.complete || img.naturalWidth === 0) return;
      if (canvas.width !== img.naturalWidth) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.drawImage(img, 0, 0);
      drawnRef.current = i;
    };

    /*
      The first frame is loaded and painted on its own, before the rest are
      even requested. A visitor sees a car immediately instead of an empty
      box while 1.2MB arrives, and the remaining frames then load in the
      background without blocking anything.
    */
    const first = new Image();
    first.decoding = "async";
    first.src = frameSrc(1);
    framesRef.current[0] = first;
    first.onload = () => {
      if (!alive) return;
      draw(1);
      for (let i = 2; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = frameSrc(i);
        framesRef.current[i - 1] = img;
      }
    };

    const tick = () => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const p = Math.min(1, Math.max(0, progress.current ?? 0));
      const i = Math.min(FRAME_COUNT, Math.floor(p * FRAME_COUNT) + 1);
      // Only touch the canvas when the frame actually changes: scroll fires
      // far more often than the sequence advances.
      if (i !== drawnRef.current) draw(i);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [progress]);

  return (
    <canvas
      ref={canvasRef}
      /*
        Decorative. The panels beside it carry the meaning; a screen reader
        announcing "car" 51 times would be noise.
      */
      aria-hidden="true"
      /*
        Bounded by HEIGHT, not width.

        A 16:9 canvas at full width is 648px tall on a 1152px page, which
        together with the copy above it overflowed a 900px viewport and pushed
        the heading off the top of the sticky frame. Capping the height and
        letting width follow keeps the whole beat on screen at any window
        shape.
      */
      className="block mx-auto w-auto h-auto max-w-full max-h-[44vh] rounded-[10px]"
    />
  );
}
