import { describe, expect, it } from "vitest";
import { screenText } from "../lib/moderation/text";

const pass = (s: string) => {
  const r = screenText(s);
  if (!r.ok) throw new Error(`expected pass, got ${r.reason}`);
  return r.text;
};
const fail = (s: string) => {
  const r = screenText(s);
  if (r.ok) throw new Error("expected rejection");
  return r.reason;
};

describe("screenText", () => {
  it("leaves an ordinary review alone", () => {
    expect(pass("Fair price, done in a day. Would go back.")).toBe(
      "Fair price, done in a day. Would go back.",
    );
  });

  it("masks profanity but keeps the sentence", () => {
    expect(pass("they did a shit job on my brakes")).toBe(
      "they did a s*** job on my brakes",
    );
  });

  it("masks profanity that has been obfuscated", () => {
    // The whole point of normalisation. Without it the filter is decorative.
    expect(pass("what a sh1t job")).toBe("what a s*** job");
    expect(pass("what a s h i t job")).toBe("what a s*** job");
  });

  it("leaves a real leading word out of a spaced-out run", () => {
    // Regression test for collapseLetterSpacing's a/I carve-out. Without it,
    // the leading real word gets fused into the obfuscated run instead of
    // staying a separate token: "I s h i t you not" -> "Is*** you not"
    // rather than "I s*** you not". A `toContain("*")` assertion can't tell
    // those two apart, which is exactly how this regressed once already —
    // assert the exact output so it can't happen silently again.
    expect(pass("what a s h i t job")).toBe("what a s*** job");
    expect(pass("I s h i t you not")).toBe("I s*** you not");
  });

  it("does not trip on real place and word names", () => {
    // The Scunthorpe problem. A false positive here means a real shop
    // cannot be listed or reviewed.
    for (const s of [
      "Great garage in Scunthorpe, fair price.",
      "They assess the car before quoting.",
      "Best in class service.",
      "Picked it up in Penistone.",
      "Spoke to Mr Cockburn about the quote.",
    ]) {
      expect(pass(s)).toBe(s);
    }
  });

  it("rejects a link", () => {
    expect(fail("great work, see https://cheap-parts.example.com")).toBe("link");
    expect(fail("visit www.spam.example.com now")).toBe("link");
  });

  it("rejects a pasted image blob", () => {
    expect(fail("look at this data:image/png;base64,iVBORw0KGgo=")).toBe(
      "embedded-file",
    );
  });

  it("rejects a long base64 run even without a data: prefix", () => {
    expect(fail("aGVsbG8".repeat(40))).toBe("embedded-file");
  });

  it("rejects shouting and character walls as spam", () => {
    expect(fail("CHEAP TYRES CALL NOW BEST DEAL IN TOWN GUARANTEED")).toBe("spam");
    expect(fail("greeeeeeeeeeaaaaaaaaat")).toBe("spam");
  });

  it("rejects contact harvesting", () => {
    expect(fail("call me on 555-018-2299 for a better price")).toBe("spam");
    expect(fail("email deals@example.com")).toBe("spam");
  });

  it("does not reject a phone number cited as a fact rather than solicited", () => {
    // A number is only spam when it comes with a solicitation cue (see
    // SOLICITATION_CUE). Cited on its own — the garage's own number, a
    // date, a part number, a registration — it is ordinary review content.
    for (const s of [
      "Serviced on 2024-03-15, all good.",
      "They fitted a Bosch 0 986 452 044 pad set.",
      "Rang the shop at 020 7946 0958 before booking.",
      "Reg plate is AB12 CDE, phone is 07911 123456 if you need to.",
    ]) {
      expect(pass(s)).toBe(s);
    }
  });

  it("does not trip shouting detection on acronym-dense automotive text", () => {
    // Automotive writing is unusually acronym-heavy; short all-caps words
    // must not count toward the shouting ratio.
    expect(pass("BMW MOT ABS ECU OBD DPF EGR replaced ASAP")).toBe(
      "BMW MOT ABS ECU OBD DPF EGR replaced ASAP",
    );
  });

  it("passes a realistic sweep of ordinary review content", () => {
    for (const s of [
      "Serviced on 2024-03-15, all good.",
      "Mileage was 123456 when they did the timing belt.",
      "Paid 1,200.00 for parts and 450.00 for labour.",
      "They fitted a Bosch 0 986 452 044 pad set.",
      "Rang the shop at 020 7946 0958 before booking.",
      "Postcode DN15 6JT, easy to find.",
      "VIN WBA8E9G59GNT12345 if that helps.",
      "BMW MOT ABS ECU OBD DPF EGR replaced ASAP",
      "Fixed the AC compressor on my 4x4.",
    ]) {
      expect(pass(s)).toBe(s);
    }
  });

  it("still rejects the full spam/link/embedded-file sweep", () => {
    expect(fail("call me on 555-018-2299 for a better price")).toBe("spam");
    expect(fail("email deals@example.com")).toBe("spam");
    expect(fail("great work, see https://cheap-parts.example.com")).toBe("link");
    expect(fail("CHEAP TYRES CALL NOW BEST DEAL IN TOWN GUARANTEED")).toBe("spam");
    expect(fail("greeeeeeeeeeaaaaaaaaat")).toBe("spam");
    expect(fail("look at this data:image/png;base64,iVBORw0KGgo=")).toBe(
      "embedded-file",
    );
  });

  it("returns a message that does not echo the term back", () => {
    const r = screenText("they did a shit job");
    expect(r.ok).toBe(true);
    // Masking, not rejection — so no message at all.
  });

  it("leaves an empty string alone", () => {
    expect(pass("")).toBe("");
  });

  it("does not corrupt a clean post with three or more consecutive single letters", () => {
    // Normalisation exists to defeat evasion during detection. It must never
    // be what gets stored — these are real, harmless car-site sentences that
    // happen to contain runs of single-letter words (acronyms spelled out).
    for (const s of [
      "I S O a good mechanic near me",
      "Got my M O T done here",
      "Ask for B M W specialist parts",
    ]) {
      expect(pass(s)).toBe(s);
    }
  });
});
