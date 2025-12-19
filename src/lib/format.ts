// TODO: Currency/date formatting helpers using BDT conventions.
import { CURRENCY } from "@/shared/constants/ui";

export function formatCurrencyFromMinor(minor: number, opts?: { withSymbol?: boolean }): string {
  const withSymbol = opts?.withSymbol ?? true;

  // minor is paisa; convert to taka.
  const taka = minor / 100;

  // Use Intl with en-BD if available; fallback gracefully.
  let formatted = "";
  try {
    formatted = new Intl.NumberFormat(CURRENCY.locale, {
      style: "currency",
      currency: CURRENCY.code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(taka);
  } catch {
    formatted = `${CURRENCY.symbol}${taka.toFixed(2)}`;
  }

  if (!withSymbol) {
    // remove symbol and whitespace (best-effort)
    return formatted.replace(CURRENCY.symbol, "").trim();
  }
  return formatted;
}

/**
 * Parse user input like: "1200", "1,200.50", "৳ 1,200.50"
 * Returns minor units (paisa) as integer.
 */
export function parseCurrencyToMinor(input: string): number | null {
  if (!input) return null;
  const cleaned = input
    .replaceAll(CURRENCY.symbol, "")
    .replaceAll(",", "")
    .trim();

  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;

  // Convert taka -> paisa
  return Math.round(num * 100);
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      ...(opts ?? {}),
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toString();
  }
}

/**
 * Useful for amount inputs to open numeric keypad on mobile.
 */
export const AMOUNT_INPUT_MODE = "decimal";
