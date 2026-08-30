/*
  Asserts that the globe's rendered sphere fills its circular stage.

  This relationship used to be a magic constant (`zoom: 2.05`) guarded only by
  a comment reading "if the globe ever looks detached from its shadow again,
  check this first". It broke exactly as that comment feared and nothing
  caught it, because nothing rendered the page and looked.

  So this renders the page and looks. It measures the sphere by scanning the
  middle row of a screenshot of .globe-stage for pixels brighter than the
  surrounding page, and compares that span to the stage's own width.

  Needs the dev server up:

    npm run dev
    node scripts/verify-globe-fit.mjs

  Exits non-zero on any viewport where the sphere is not within TOLERANCE of
  its stage. Set CHROME_PATH if Chrome lives somewhere else.
*/

import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXECUTABLE =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/*
  1% of the stage. Tight enough to catch the 4% shortfall that solving against
  project() alone would leave, loose enough to absorb antialiasing on the limb
  and the half-pixel rounding of a fractional stage width.
*/
const TOLERANCE = 0.01;

const VIEWPORTS = [
  { name: "wide", width: 2560, height: 1440 },
  { name: "fullhd", width: 1920, height: 1080 },
  { name: "laptop", width: 1440, height: 780 },
  { name: "small-laptop", width: 1280, height: 700 },
  { name: "phone", width: 390, height: 844 },
];

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox"],
});

const failures = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 60000 });
  // The globe fades its texture in; give it a beat to settle before measuring.
  await new Promise((r) => setTimeout(r, 5000));

  const stage = await page.$(".globe-stage");
  if (!stage) {
    failures.push(`${vp.name}: no .globe-stage on the page`);
    await page.close();
    continue;
  }

  const box = await stage.boundingBox();
  const shot = await stage.screenshot({ encoding: "base64" });

  /*
    Measured inside the page rather than with an image library: the project
    already runs Chrome for its screenshots, and a canvas 2D context decodes
    the PNG for free. Adding a native image dependency to scan one row of
    pixels is a poor trade.
  */
  const span = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = "data:image/png;base64," + src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const row = Math.floor(c.height / 2);
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < c.width; x++) {
      const i = (row * c.width + x) * 4;
      /*
        Blue dominance, not brightness.

        The first version of this summed the channels and asked for > 18. That
        check PASSED against the very defect it was written to catch, because
        the dead ring is not black: it is the road background at about
        rgb(11,15,13), which sums to 39 and sailed over the threshold. The
        check was measuring the ring as though it were the globe.

        The sphere's darkest ocean is rgb(0,0,28) — nearly pure blue — while
        the ring and the ground behind it are neutral-to-green. Asking whether
        blue leads the other two channels separates them cleanly where
        brightness cannot.
      */
      if (d[i + 2] - Math.max(d[i], d[i + 1]) > 6) {
        if (lo < 0) lo = x;
        hi = x;
      }
    }
    return lo < 0 ? 0 : hi - lo + 1;
  }, shot);

  const stageWidth = Math.round(box.width);
  const drift = Math.abs(span - stageWidth) / stageWidth;
  const ok = drift <= TOLERANCE;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${vp.name.padEnd(13)} ${vp.width}x${vp.height}  ` +
      `stage=${stageWidth}px sphere=${span}px  drift=${(drift * 100).toFixed(1)}%`,
  );
  if (!ok) {
    failures.push(
      `${vp.name} (${vp.width}x${vp.height}): stage ${stageWidth}px but sphere ${span}px ` +
        `— ${(drift * 100).toFixed(1)}% off, tolerance ${(TOLERANCE * 100).toFixed(0)}%`,
    );
  }
  await page.close();
}

await browser.close();

if (failures.length > 0) {
  console.error("\nThe globe does not fill its stage:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("\nthe sphere fills its stage at every viewport");
