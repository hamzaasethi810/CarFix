import Image from "next/image";
import Link from "next/link";
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

  The scrim exists because the caption sits on the image. It is the page's own
  ink at high alpha rather than black, so the panel belongs to the same world
  as everything else.
*/
export function AuthPanel({
  title,
  subtitle,
  children,
  aside,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** The line set over the photograph. Says why the account is worth having. */
  aside: string;
  footer?: React.ReactNode;
}) {
  const image = "/img/gt3rs.webp";

  return (
    <div className="auth-root grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* The form. Always first in the DOM, so it is first for a screen reader. */}
      <div className="flex items-center justify-center px-5 py-14 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="auth-enter">
            <h1 className="text-title1 font-semibold tracking-tight text-balance">{title}</h1>
            {subtitle && (
              <p className="text-subhead text-secondary mt-1.5 text-pretty">{subtitle}</p>
            )}
          </div>

          <div className="auth-enter mt-8" style={{ ["--enter-delay" as string]: "80ms" }}>
            {children}
          </div>

          {footer && (
            <div
              className="auth-enter mt-8 text-footnote text-secondary"
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
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--label)_88%,transparent),color-mix(in_srgb,var(--label)_20%,transparent)_55%,transparent)]"
          />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <Link
              href="/"
              className="text-title3 font-bold tracking-tight text-[var(--on-accent)]"
            >
              Gaari
            </Link>
            <p className="mt-3 max-w-sm text-body text-[color-mix(in_srgb,var(--on-accent)_82%,transparent)] text-pretty">
              {aside}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
