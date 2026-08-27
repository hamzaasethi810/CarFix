/*
  WCAG 2.1 relative luminance and contrast ratio.

  Exists so the palette can be checked automatically. A dark repaint is very
  easy to get wrong in a way nobody notices until a user cannot read a form
  label, and "it looked fine on my monitor" is not a check.
*/

type Rgb = { r: number; g: number; b: number; a: number };

function parse(colour: string): Rgb {
  const value = colour.trim();

  const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const [r, g, b, a = 1] = parts;
    return { r, g, b, a };
  }

  const hex = value.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
  };
}

/** Flattens a translucent colour onto an opaque one. */
function over(top: Rgb, bottom: Rgb): Rgb {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const bg = parse(background);
  const fg = over(parse(foreground), bg);
  const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
