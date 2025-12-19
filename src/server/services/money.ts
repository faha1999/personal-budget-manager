/**
 * TODO: Helpers for converting between minor units (paisa) and display (BDT), plus formatting.
 */
/**
 * Money helpers:
 * - store BDT as integer minor units (paisa): 1 BDT = 100 minor
 */

export function bdtToMinor(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  return Math.round(amount * 100);
}

export function minorToBDT(minor: number): number {
  if (!Number.isFinite(minor)) throw new Error("Invalid minor amount");
  return minor / 100;
}

export function formatBDTFromMinor(minor: number): string {
  const bdt = minorToBDT(minor);
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(bdt);
}

export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
