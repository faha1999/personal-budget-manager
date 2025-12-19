/**
 * Small sanitization helpers for user-supplied input.
 * These functions are intentionally lightweight (no DOM dependencies)
 * so they can be shared across server and client code.
 */

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

type SanitizeOptions = {
  maxLength?: number;
  preserveNewLines?: boolean;
};

export function sanitizeText(value: unknown, options: SanitizeOptions = {}) {
  if (typeof value !== "string") return "";
  const maxLength = options.maxLength ?? 256;

  let cleaned = value.replace(CONTROL_CHARS, "").replace(/[<>]/g, "");
  cleaned = options.preserveNewLines ? cleaned.replace(/[ \t]+/g, " ") : cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.trim();

  if (!cleaned) return "";
  return cleaned.slice(0, maxLength);
}

export function sanitizeEmail(value: unknown) {
  const cleaned = sanitizeText(value, { maxLength: 254 }).toLowerCase();
  if (!cleaned) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned;
}

export function toPositiveInteger(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

export function toPositiveNumber(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function toISODate(value: unknown) {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
