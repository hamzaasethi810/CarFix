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

  125 frames at 1280px, WebP q68, 2.97MB — DENOISED, then Lanczos-downscaled
  from a 2560x1440 master.

  The denoise is the part that matters. Two rounds of tuning encoder settings
  failed to fix a grainy picture, so the master frame was pulled out raw — no
  scaling, no compression — and the noise was plainly already in it: mottled
  blocking across the flat studio wall and artefacts around the car's edges.
  17MB for ten seconds at 2560x1440 is about 14 Mbit/s, which is a thin
  bitrate for that resolution.

  No encoder setting removes noise that was recorded. nlmeans does, and the
  difference on the flat background is the whole complaint. It costs about
  200s to run over the sequence, offline, once.

  Denoised frames do NOT compress cheaper, which was the hope: nlmeans
  preserves detail rather than flattening it, so per-frame cost stayed around
  24KB and the 3MB budget still caps this at ~125 frames. Measured, not
  extrapolated — a 15-frame sample had suggested 124 frames at 1280 would fit
  and the real set came out at 3.28MB.
*/

const FRAME_COUNT = 125;
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

    /*
      Fit the backing store to the element, at device resolution.

      A canvas has two sizes: the CSS box and the pixel buffer. Leaving the
      buffer at the frame's own 1152px and stretching it across a 2560px
      window is what makes a full-bleed canvas look soft. Re-measured whenever
      the window changes.
    */
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w === 0 || h === 0) return false;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        drawnRef.current = -1; // the buffer was cleared; force a redraw
      }
      return true;
    };

    const draw = (i: number) => {
      const img = framesRef.current[i - 1];
      if (!img?.complete || img.naturalWidth === 0) return;
      if (!resize()) return;

      /*
        Cover, not stretch.

        The frames are 16:9 and the window is whatever it is, so the image is
        scaled to fill the larger axis and centred, cropping the other. Fitting
        instead would letterbox the car inside its own black band, which is
        the boxed-in look this replaced.
      */
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      drawnRef.current = i;
    };

    /*
      Loaded in two passes.

      152 frames is 5MB, and waiting for all of it before the sequence responds
      to scroll would be worse than being choppy. So: every 4th frame first —
      38 images, about 1.3MB — which alone is denser than the 68-frame version
      this replaces and makes the scroll usable almost immediately. The
      remaining 114 fill in behind it, and the sequence sharpens up in place
      without ever having blocked.

      `draw` already falls back to doing nothing for a frame that has not
      arrived, and the rAF loop retries every frame, so a gap simply holds the
      previous image for a moment rather than flashing.
    */
    const load = (i: number) => {
      if (framesRef.current[i - 1]) return;
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(i);
      framesRef.current[i - 1] = img;
      return img;
    };

    const startRest = () => {
      if (!alive) return;
      draw(1);
      for (let i = 5; i <= FRAME_COUNT; i += 4) load(i);
      // The gaps, once the coarse pass is requested.
      setTimeout(() => {
        if (!alive) return;
        for (let i = 2; i <= FRAME_COUNT; i++) load(i);
      }, 600);
    };

    /*
      Two ways this start path fails, and both did.

      `load` returns nothing when the frame is already held, and framesRef
      survives a remount — so under StrictMode's double-invoke the second run
      got `undefined` here, attached no handler, and the page sat on frame 1
      with the other 151 never requested. Reuse the held image instead of
      relying on a fresh one.

      And `complete` has to be checked BEFORE attaching onload rather than
      instead of it: a cached image finishes decoding before this line runs,
      so its load event has already fired and a handler attached afterwards
      never sees it. That is every visit after the first.
    */
    const first = framesRef.current[0] ?? load(1);
    if (first?.complete && first.naturalWidth > 0) startRest();
    else if (first) first.onload = startRest;

    const onResize = () => {
      drawnRef.current = -1;
    };
    window.addEventListener("resize", onResize, { passive: true });

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
      window.removeEventListener("resize", onResize);
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
        Fills its container. The sticky frame it sits in is the viewport, so
        this is the whole screen; the copy is laid over it.
      */
      className="absolute inset-0 block h-full w-full"
    />
  );
}
