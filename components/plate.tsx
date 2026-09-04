import Image from "next/image";

/*
  A photograph bound into the document.

  This is the only place imagery appears in the system, and it is deliberately
  framed rather than bled: a photograph run to the viewport edge reads as
  pasted onto a document, and one given a ruled frame and a margin caption
  reads as a plate bound into it.

  The frame is square, like every other ruled region. The caption sits outside
  the image, never overlaid on it.
*/
export function Plate({
  src,
  alt,
  width,
  height,
  sizes,
  caption,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  caption?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="border border-separator bg-grouped p-1.5">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className="w-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-caption text-tertiary-label">{caption}</figcaption>
      )}
    </figure>
  );
}
