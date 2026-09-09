/*
  Builds the two landing-hero framings from assets/911-source.jpg.

  The photograph is a 3840x2160 studio shot: a green 911 Targa, centred, on a
  near-white ground, under a large black "911" wordmark. Three things have to
  happen to it before it can be a hero.

  The wordmark goes. It is Porsche's trademark, and a marketplace that is not
  affiliated with them should not open with it — quite apart from it being a
  second piece of display type arguing with the headline. It sits in its own
  band well above the car, so a straight top crop removes it and costs nothing.

  The car has to move right. It is centred in the source, which leaves nowhere
  to put a headline that is not across the doors. Rather than crop the car, the
  ground is grown to its left: replicating the edge column continues the studio
  wall exactly, and here that is close to free, because the ground is almost
  flat horizontally — measured across the first 300px it moves about one level
  of luma. (The previous, dark studio shot needed a slope-matched falloff to
  avoid a Mach band; at this gradient there is no band to avoid.)

  And a band layout needs its own crop. In the wide framing most of the frame
  is deliberately empty, to hold the words. On a phone there are no words
  beside the car, so that emptiness is just dead space.

  Every measurement below is taken from the image rather than typed in, so a
  re-export of the source cannot silently shift the framing.
*/
import sharp from "sharp";

const SRC = "assets/911-source.jpg";
const WIDE_OUT = "public/img/hero-911.webp";
const BAND_OUT = "public/img/hero-911-band.webp";

// Working width for the wide asset. Beyond this the hero is never displayed
// larger, and the file is mostly flat ground that gains nothing from more.
const WORK_W = 1920;

// Where the car should sit in the finished wide frame, as a fraction of width.
const CAR_LEFT = 0.46;
const CAR_RIGHT = 0.89;
const CANVAS_ASPECT = 1.79;

const base = await sharp(SRC).removeAlpha().resize(WORK_W).toBuffer();
const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const luma = (x, y) => {
  const i = (y * W + x) * C;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};

/* Bands of rows holding dark content: the wordmark, then the car. */
const bands = [];
let run = null;
for (let y = 0; y < H; y++) {
  let dark = 0;
  for (let x = 0; x < W; x++) if (luma(x, y) < 140) dark += 1;
  if (dark > 3) run = run ? ((run.y1 = y), run) : { y0: y, y1: y };
  else if (run) { bands.push(run); run = null; }
}
if (run) bands.push(run);
if (bands.length < 2) throw new Error(`expected a wordmark band and a car band, found ${bands.length}`);

const wordmark = bands[0];
const carBand = bands[bands.length - 1];
let carX0 = W, carX1 = 0;
for (let y = carBand.y0; y <= carBand.y1; y++)
  for (let x = 0; x < W; x++)
    if (luma(x, y) < 170) { if (x < carX0) carX0 = x; if (x > carX1) carX1 = x; }

// The car's shadow fades out below the body; keep the rows under it.
const carY0 = carBand.y0;
const carY1 = carBand.y1;
console.log(`source ${W}x${H} · wordmark y ${wordmark.y0}..${wordmark.y1} · car x ${carX0}..${carX1} y ${carY0}..${carY1}`);

/* 1. Crop the wordmark away, keeping clear headroom above the car. */
const topCrop = Math.round((wordmark.y1 + carY0) / 2);
if (topCrop <= wordmark.y1) throw new Error("top crop would keep part of the wordmark");
const cropped = await sharp(base)
  .extract({ left: 0, top: topCrop, width: W, height: H - topCrop })
  .toBuffer();
const cropH = H - topCrop;
const cy0 = carY0 - topCrop;
const cy1 = carY1 - topCrop;

/*
  2. Work out the canvas that puts the car where it belongs.

  Car width is fixed, so the target fractions fix the canvas width; the left
  extension follows, and whatever is left over on the right is trimmed off the
  source's own margin.
*/
const carW = carX1 - carX0;
const canvasW = Math.round(carW / (CAR_RIGHT - CAR_LEFT));
const canvasH = Math.round(canvasW / CANVAS_ASPECT);
const extendLeft = Math.round(canvasW * CAR_LEFT) - carX0;
const trimRight = W + extendLeft - canvasW;
if (extendLeft < 0) throw new Error("car already sits right of its target");
if (trimRight > W - carX1) throw new Error("trimming the right edge would cut the car");

// 3. Centre the car vertically in the taller canvas.
const extendTop = Math.round(canvasH / 2 - (cy0 + cy1) / 2);
const extendBottom = canvasH - cropH - extendTop;
if (extendTop < 0 || extendBottom < 0) throw new Error("canvas is shorter than the crop");

const wide = await sharp(cropped)
  .extract({ left: 0, top: 0, width: W - trimRight, height: cropH })
  .extend({ left: extendLeft, top: extendTop, bottom: extendBottom, extendWith: "copy" })
  .webp({ quality: 88 })
  .toFile(WIDE_OUT);

console.log(`${WIDE_OUT} ${wide.width}x${wide.height} ${(wide.size / 1024).toFixed(0)}KB`);
console.log(`  car at ${((carX0 + extendLeft) / wide.width * 100).toFixed(0)}%..${((carX1 + extendLeft) / wide.width * 100).toFixed(0)}% of the width`);

/*
  4. The band framing: a 3:2 crop around the car, which is the band's aspect at
  its narrowest, so the car fills the frame rather than floating in it.
*/
const bandH = cropH;
const bandW = Math.round(bandH * 1.5);
const bandLeft = Math.min(W - bandW, Math.max(0, Math.round((carX0 + carX1) / 2 - bandW / 2)));
if (bandW > W) throw new Error("source is too narrow for a 3:2 band crop");

const band = await sharp(cropped)
  .extract({ left: bandLeft, top: 0, width: bandW, height: bandH })
  .webp({ quality: 88 })
  .toFile(BAND_OUT);

console.log(`${BAND_OUT} ${band.width}x${band.height} ${(band.size / 1024).toFixed(0)}KB`);
console.log(`  car at ${((carX0 - bandLeft) / bandW * 100).toFixed(0)}%..${((carX1 - bandLeft) / bandW * 100).toFixed(0)}% of the width`);
