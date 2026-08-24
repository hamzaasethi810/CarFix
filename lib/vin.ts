/**
 * VIN validation. Runs on both server and client, so it must not import
 * anything server-only.
 *
 * A VIN is 17 characters, excludes I/O/Q to avoid confusion with 1/0, and
 * (for North American vehicles) carries a check digit in position 9. Checking
 * it locally means an obvious typo never becomes a network round trip.
 */

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export const normalizeVin = (raw: string) => raw.trim().toUpperCase().replace(/[\s-]/g, "");

export function isWellFormedVin(vin: string) {
  return VIN_PATTERN.test(vin);
}

/**
 * Verifies the position-9 check digit. Vehicles built outside North America
 * often do not encode a valid one, so a false result is a warning rather than
 * a hard rejection — callers decide.
 */
export function hasValidCheckDigit(vin: string) {
  if (!isWellFormedVin(vin)) return false;

  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const value = TRANSLITERATION[vin[i]];
    if (value === undefined) return false;
    sum += value * WEIGHTS[i];
  }

  const expected = sum % 11;
  const actual = vin[8] === "X" ? 10 : Number(vin[8]);
  return expected === actual;
}
