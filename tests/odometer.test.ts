import { describe, expect, it } from "vitest";
import { nextFrame, type Frame } from "../components/landing/rolling-figure";

const frame = (v: string): Frame => ({
  chars: v.split(""),
  dirs: v.split("").map(() => null),
  id: 0,
});

/*
  The odometer's decision logic, which is the part that can actually be wrong.

  Two rules carry the whole effect and both are silent failures if broken: only
  the digits that really changed may move, and the direction has to match
  whether the value rose or fell. Everyone has watched a real trip meter, so a
  digit rolling the wrong way reads as fake even when nobody can say why.
*/
describe("the odometer", () => {
  it("moves only the digits that actually changed", () => {
    const f = nextFrame(frame("$1,690"), "$1,740", true);
    // "$1,690" -> "$1,740": the 6 and the 9 change, the rest hold.
    expect(f.chars.join("")).toBe("$1,740");
    expect(f.dirs).toEqual([null, null, null, 1, -1, null]);
  });

  it("rolls up when a digit grew and down when it shrank", () => {
    expect(nextFrame(frame("$100"), "$900", true).dirs).toEqual([null, 1, null, null]);
    expect(nextFrame(frame("$900"), "$100", true).dirs).toEqual([null, -1, null, null]);
  });

  it("aligns from the right when the value gains a digit", () => {
    /*
      Money grows leftwards. Comparing "$990" to "$1,040" left to right would
      mark every column changed; aligning by the last character compares like
      with like, so only the genuinely different columns move.
    */
    const f = nextFrame(frame("$990"), "$1,040", true);
    expect(f.chars.join("")).toBe("$1,040");
    expect(f.dirs.filter((d) => d !== null).length).toBeLessThan(f.chars.length);
  });

  it("never marks a separator or currency mark as rolling", () => {
    const f = nextFrame(frame("$1,111"), "$2,222", true);
    expect(f.dirs[0]).toBeNull(); // $
    expect(f.dirs[2]).toBeNull(); // ,
  });

  it("holds everything still under reduced motion", () => {
    const f = nextFrame(frame("$100"), "$900", false);
    expect(f.chars.join("")).toBe("$900");
    expect(f.dirs.every((d) => d === null)).toBe(true);
  });

  it("bumps the frame id so a digit landing on its own character still remounts", () => {
    const a = nextFrame(frame("$110"), "$120", true);
    const b = nextFrame(a, "$130", true);
    expect(b.id).toBeGreaterThan(a.id);
  });
});
