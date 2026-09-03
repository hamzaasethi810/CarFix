import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

/*
  Whether an image has actually been dropped into public/.

  The page is designed to hold photography it does not have yet. Rather than
  shipping a broken <img> or a grey rectangle labelled "image", each slot asks
  this and composes without it: the hero falls back to a tonal band, and the
  trade rows simply run as type. Adding the file is the whole activation step.
*/
export function hasImage(publicPath: string) {
  return existsSync(join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}
