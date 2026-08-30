/*
  Walks the site at every breakpoint and writes PNGs to tmp/shots/.

  Exists because the redesign's failure modes are invisible to the test suite:
  a form field that lost its border, a panel left over from the white theme, a
  header that wraps at 360px. None of those throw, and none of them fail an
  assertion — you have to look.

  The landscape phone viewport is here deliberately. It has broken this site
  twice: a landscape phone is 852pt wide and 393pt tall, so anything gated on
  width alone treats it as a desktop and anything gated on height runs out of
  room.

    node scripts/screenshot-pages.mjs

  Set CHROME_PATH if Chrome lives somewhere else.
*/

import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const EXECUTABLE =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "phone-landscape", width: 844, height: 390 },
  { name: "tablet", width: 820, height: 1180 },
  /*
    A laptop as the BROWSER sees it, not as the display measures.

    This list said 1440x900 — a screen size. A browser gives the page far less
    than that once its own chrome is subtracted, around 780px on the same
    machine. The gap hid a real bug: a `max-height: 800px` rule collapsed the
    globe to 150px for most desktop visitors while this audit, testing a
    900px-tall viewport, reported everything fine.

    So both are here now. The 900 row keeps the tall-window case; the 780 row
    is what people actually have.
  */
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1440, height: 780 },
  /*
    Larger than the road composition itself.

    Every other viewport here is smaller than the background art, so a
    background that tiles, seams, or runs out looks perfect in all of them.
    That is not hypothetical: roads.svg repeated at 1600x1000 and showed hard
    rectangular seams on any window bigger than that, invisible to this audit
    for exactly this reason. This row is the one that looks.
  */
  { name: "wide", width: 2560, height: 1440 },
];

/** Signed-out routes. Anything behind auth redirects to /login, which is itself worth seeing. */
const ROUTES = [
  ["/", "home"],
  ["/login", "login"],
  ["/register", "register"],
  ["/shops/add", "shops-add"],
  ["/policies/privacy", "privacy"],
  ["/policies/receipts", "receipts"],
];

const problems = [];

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox"],
});

await mkdir("tmp/shots", { recursive: true });

for (const [route, slug] of ROUTES) {
  for (const view of VIEWPORTS) {
    const page = await browser.newPage();

    // Console noise is a finding in its own right, so collect it per page.
    const noise = [];
    page.on("console", (m) => {
      if (m.type() === "error") noise.push(m.text().slice(0, 160));
    });
    page.on("pageerror", (e) => noise.push(String(e).slice(0, 160)));

    await page.setViewport({
      width: view.width,
      height: view.height,
      deviceScaleFactor: 2,
    });

    try {
      await page.goto(`${BASE}${route}`, {
        waitUntil: "networkidle2",
        timeout: 60_000,
      });
    } catch {
      problems.push(`${route} @ ${view.name}: did not finish loading`);
      await page.close();
      continue;
    }

    /*
      Let the map settle, entrance animations finish, and — the reason this is
      not 1.4s — React finish hydrating.

      Some layout decisions here are made in an effect after mount: the filter
      panel measures itself and collapses when it would swallow a short window.
      Under the dev server hydration can take longer than 1.4s, so shots taken
      at that mark caught the panel in its pre-collapse state and showed a
      landscape phone buried under filters with no globe visible. The page was
      fine; the photograph was early. Waiting past hydration means these shots
      show what a person actually ends up looking at.
    */
    await new Promise((r) => setTimeout(r, 3_000));

    /*
      Two checks worth making while the page is open, because both are easy to
      miss by eye and unambiguous to measure.
    */
    const audit = await page.evaluate(() => {
      const doc = document.documentElement;
      const tooSmall = [...document.querySelectorAll("a,button,input,select,textarea")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (r.width === 0 || r.height === 0) return false;
          // The skip link is 1x1 until focused, and attribution is not a control.
          if (el.textContent.trim() === "Skip to content") return false;
          if (el.closest(".maplibregl-ctrl-attrib")) return false;
          /*
            Inline links inside a sentence are exempt from the target-size
            rule — WCAG 2.5.5 carves them out, because you cannot pad a word
            in the middle of a paragraph to 44px without wrecking the line
            height around it. Only standalone controls are held to the floor.
          */
          if (el.tagName === "A" && getComputedStyle(el).display === "inline")
            return false;
          return r.width < 44 || r.height < 44;
        })
        .map((el) => `${el.tagName.toLowerCase()}"${el.textContent.trim().slice(0, 14)}"`);

      return {
        // A page that scrolls sideways is broken, not merely ugly.
        horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        tooSmall: [...new Set(tooSmall)],
      };
    });

    if (audit.horizontalOverflow)
      problems.push(
        `${route} @ ${view.name}: scrolls horizontally (${audit.scrollWidth} > ${audit.clientWidth})`,
      );
    if (audit.tooSmall.length)
      problems.push(`${route} @ ${view.name}: under 44px — ${audit.tooSmall.join(", ")}`);
    if (noise.length) problems.push(`${route} @ ${view.name}: console — ${noise[0]}`);

    await page.screenshot({ path: `tmp/shots/${slug}-${view.name}.png` });
    await page.close();
  }
}

await browser.close();

console.log(`wrote ${ROUTES.length * VIEWPORTS.length} shots to tmp/shots/`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
} else {
  console.log("no overflow, undersized targets, or console errors");
}
