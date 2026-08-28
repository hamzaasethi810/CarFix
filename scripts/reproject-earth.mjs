/*
  Reprojects the Earth texture from equirectangular to Web Mercator.

  Why this is needed at all: MapLibre's `image` source drapes a picture between
  four lng/lat corners and interpolates it linearly in MERCATOR space. An
  equirectangular image is linear in LATITUDE. Those two agree at the equator
  and diverge steadily toward the poles, so hanging the raw NASA texture on the
  globe squeezed the mid-latitudes together and stretched everything near the
  top and bottom — continents visibly squashed through the middle of the
  sphere.

  Pre-warping the image so its rows are already spaced by Mercator y means the
  linear interpolation lands correctly, and the geography comes out true.

  Done in a browser rather than with an image library so the project keeps its
  dependency list short — the canvas is doing nothing here that ImageMagick
  would do better, and adding a native module to resample one file at build
  time is a poor trade.

    node scripts/reproject-earth.mjs

  Reads public/earth-dark.jpg, writes public/earth-dark-mercator.jpg.
*/

import { readFile, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const EXECUTABLE =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* Web Mercator is clipped here; beyond it y runs to infinity. */
const LAT_LIMIT = 85.05112878;

const source = await readFile("public/earth-dark.jpg");
const dataUrl = `data:image/jpeg;base64,${source.toString("base64")}`;

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();

const out = await page.evaluate(async (src, latLimit) => {
  const img = new Image();
  img.src = src;
  await img.decode();

  const W = img.width;
  const H = img.height;

  const read = document.createElement("canvas");
  read.width = W;
  read.height = H;
  const rctx = read.getContext("2d", { willReadFrequently: true });
  rctx.drawImage(img, 0, 0);
  const srcData = rctx.getImageData(0, 0, W, H).data;

  const write = document.createElement("canvas");
  write.width = W;
  write.height = H;
  const wctx = write.getContext("2d");
  const dst = wctx.createImageData(W, H);

  /*
    For each output row, work out which latitude it represents under Mercator,
    then sample the equirectangular source at that latitude. Linear blend
    between the two nearest source rows so the result does not band.
  */
  const maxY = Math.log(Math.tan(Math.PI / 4 + (latLimit * Math.PI) / 180 / 2));

  for (let y = 0; y < H; y++) {
    // Normalised Mercator y, +maxY at the top row to -maxY at the bottom.
    const my = maxY * (1 - (2 * y) / (H - 1));
    const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) * (180 / Math.PI);
    // Latitude back to a source row: +90 at row 0, -90 at the last row.
    const sy = ((90 - lat) / 180) * (H - 1);
    const y0 = Math.max(0, Math.min(H - 1, Math.floor(sy)));
    const y1 = Math.min(H - 1, y0 + 1);
    const t = sy - y0;

    for (let x = 0; x < W; x++) {
      const a = (y0 * W + x) * 4;
      const b = (y1 * W + x) * 4;
      const o = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        dst.data[o + c] = srcData[a + c] * (1 - t) + srcData[b + c] * t;
      }
      dst.data[o + 3] = 255;
    }
  }

  wctx.putImageData(dst, 0, 0);
  return write.toDataURL("image/jpeg", 0.88);
}, dataUrl, LAT_LIMIT);

await browser.close();

const bytes = Buffer.from(out.split(",")[1], "base64");
await writeFile("public/earth-dark-mercator.jpg", bytes);
console.log(`wrote public/earth-dark-mercator.jpg — ${bytes.length} bytes`);
