import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/*
  The tab icon: the same diagonal wrench as the mark, redrawn flat.

  Not the WrenchMark component itself — that carries gradients and inset
  highlights that vanish at 32px and only muddy the silhouette. At favicon
  size the only thing that survives is shape, so this is one solid colour on
  the site's ground.
*/
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050A14",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 64 64">
          <g transform="rotate(-38 32 32)" fill="#dfe4e1">
            <rect x="27.5" y="13" width="9" height="37" rx="4.5" />
            <path d="M21.5 15 L21.5 6.5 L26.5 3 L26.5 11.5 L37.5 11.5 L37.5 3 L42.5 6.5 L42.5 15 C42.5 19.8 38.5 22.5 32 22.5 C25.5 22.5 21.5 19.8 21.5 15 Z" />
            <circle cx="32" cy="49.5" r="11" />
            <circle cx="32" cy="49.5" r="5.4" fill="#050A14" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
