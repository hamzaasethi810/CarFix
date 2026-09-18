import Image from "next/image";
import { hasImage } from "@/lib/design/assets";

/*
  The split-screen auth card.

  Both auth screens were a form on an empty page: correct, and completely
  characterless, which on the two screens where somebody decides whether to
  bother is the wrong place to be characterless. This is the pattern that
  dominates the category for a reason — form on one side, the product's own
  subject on the other — and for a site about cars the subject is a car.

  The photograph is decoration in the strict sense: it carries no information,
  so it is aria-hidden and the entire panel is hidden below the large
  breakpoint rather than stacked. A phone gets the form and nothing between it
  and the keyboard.

  Nothing is written over it. Type on a photograph needs a scrim to stay
  legible, the scrim then dims the photograph it was added to protect, and the
  words themselves were saying something the form beside them already says. The
  image is left to be an image.

  The screen never scrolls. It is sized to the viewport below the header and
  the form column scrolls inside itself if a browser's chrome leaves too little
  room, so the page itself does not move.
*/
export function AuthPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  /*
    The AMG rather than the Porsche: the Porsche now sits behind the landing
    hero, and the same car on both screens makes them look like one page that
    failed to change.
  */
  const image = "/img/gtr.webp";

  return (
    <div className="auth-root grid h-full min-h-0 overflow-hidden lg:grid-cols-2">
      {/* The form. Always first in the DOM, so it is first for a screen reader. */}
      {/*
        Safe centring, not plain centring.

        items-center vertically centres the form, which is right when it fits —
        but when it does not (a short or notched phone, where the header's
        safe-area inset eats into the height), plain centring pushes the top of
        the form up under the header and clips the title, and the scroll needed
        to see it starts already cut off. `safe center` centres only while there
        is room and falls back to top-alignment when there is not, so the title
        is always reachable and nothing is clipped.
      */}
      <div className="flex [align-items:safe_center] justify-center overflow-y-auto px-5 py-4 sm:px-8 sm:py-6">
        <div className="w-full max-w-sm">
          <div className="auth-enter">
            <h1 className="text-title2 font-semibold tracking-tight text-balance">{title}</h1>
            {subtitle && (
              <p className="text-subhead text-secondary mt-1.5 text-pretty">{subtitle}</p>
            )}
          </div>

          <div className="auth-enter mt-5" style={{ ["--enter-delay" as string]: "80ms" }}>
            {children}
          </div>

          {footer && (
            <div
              className="auth-enter mt-4 text-footnote text-secondary"
              style={{ ["--enter-delay" as string]: "160ms" }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>

      {/* The panel. Decoration, and hidden rather than stacked on a phone. */}
      {hasImage(image) && (
        <div className="relative hidden lg:block overflow-hidden border-l border-separator">
          <Image
            src={image}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 1024px) 0px, 50vw"
            className="object-cover"
            priority
          />
        </div>
      )}
    </div>
  );
}
