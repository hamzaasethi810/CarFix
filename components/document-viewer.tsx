"use client";

import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui";

/*
  A reviewer's document, shown on the page instead of handed to the browser.

  The previous version opened a signed storage URL in a new tab. Because the
  stored objects carry `attachment`, that saved a permanent copy to the
  reviewer's disk — which outlived both the 120-second link and the deletion of
  the record, so neither guarantee meant anything. Here the bytes are fetched
  into a blob, displayed, and revoked when the dialog closes, so nothing is
  written to disk unless somebody deliberately saves it.

  Being honest about the limit: a determined reviewer can still screenshot or
  save the image. What this removes is the *accidental* permanent copy that
  happened to everyone, every time.
*/

type Props = {
  src: string;
  title: string;
  onClose: () => void;
  /** Rendered under the document — the decision belongs with what it is about. */
  children: React.ReactNode;
};

export function DocumentViewer({ src, title, onClose, children }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setType(blob.type);
        setBlobUrl(revoked);
      } catch {
        if (!cancelled) setError("That document could not be opened.");
      }
    })();

    return () => {
      cancelled = true;
      // Dropped from memory the moment the dialog goes away.
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  // Escape closes, and focus is kept inside while it is open.
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      // Deliberately still black, not a token: this is a modal scrim, and a
      // scrim is supposed to read as dark regardless of the page ground —
      // it dims whatever is behind the dialog rather than tinting toward it.
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 motion-safe:animate-[fade-in_150ms_ease-out]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass rounded-glass w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 min-h-14 border-b border-separator">
          <h2 className="text-headline font-semibold">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="size-11 grid place-items-center rounded-full text-secondary hover:text-label hover:bg-fill"
            aria-label="Close"
          >
            <span aria-hidden="true" className="text-headline">×</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-white/[0.04] grid place-items-center p-3">
          {error && <p className="text-subhead text-destructive p-8">{error}</p>}
          {!error && !blobUrl && (
            <p className="text-subhead text-secondary p-8">Opening…</p>
          )}
          {blobUrl && type === "application/pdf" && (
            <embed src={blobUrl} type="application/pdf" className="w-full h-[60vh] rounded-control" />
          )}
          {blobUrl && type.startsWith("image/") && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={blobUrl} alt={title} className="max-w-full max-h-[60vh] rounded-control" />
          )}
          {blobUrl && type !== "application/pdf" && !type.startsWith("image/") && (
            <p className="text-subhead text-secondary p-8">
              This file is not one we can display safely.
            </p>
          )}
        </div>

        {/* The decision sits with the document, so it closes as soon as it is made. */}
        <div className="px-4 py-3 border-t border-separator">{children}</div>
      </div>
    </div>
  );
}

export { buttonStyles };
