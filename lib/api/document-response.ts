import "server-only";

/*
  Serving a reviewer's document through our own origin.

  Two things have to hold at once. The file must render rather than download —
  a download outlives the 120-second window and the destruction of the record,
  which is the whole reason the previous signed-link approach was wrong. And a
  file somebody uploaded must not be able to execute, which is what the
  `attachment` disposition on the stored object was protecting against.

  Both are satisfied by serving it inline from a route that pins the content
  type to a short whitelist, forbids sniffing, and sends a sandboxing CSP. An
  HTML or SVG payload cannot reach this response at all: it is served as a
  download instead, so it renders nowhere.
*/

const RENDERABLE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function documentResponse(bytes: Uint8Array, contentType: string) {
  const safe = RENDERABLE.has(contentType);

  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": safe ? contentType : "application/octet-stream",
      // Inline is the point — but only for types we know render harmlessly.
      "Content-Disposition": safe ? "inline" : "attachment",
      "Content-Length": String(bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
      // Nothing in the document may load or run anything.
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self' data:; object-src 'none'; sandbox",
      // Never cached anywhere: the file is meant to stop existing on decision.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
    },
  });
}
