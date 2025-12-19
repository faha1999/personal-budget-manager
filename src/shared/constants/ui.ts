// TODO: Define UI constants (breakpoints, spacing scale, chart colors).
/**
 * UI constants (light-mode first, premium minimal aesthetic).
 * Tailwind will map these via CSS variables in globals.css.
 */

export const APP_NAME = "Budget Manager";
export const APP_TAGLINE = "Personal finance, simplified for Bangladesh.";

export const CURRENCY = {
  code: "BDT",
  symbol: "৳",
  locale: "en-BD",
} as const;

export const DEFAULTS = {
  pagination: { limit: 20, maxLimit: 100 },
  sessionDays: 30,
  dateRangePresetDays: 30,
} as const;

/**
 * Navigation config for Sidebar/MobileNav.
 * Keep routes stable; labels are English-only as per requirement.
 */
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/app" },
  { label: "Transactions", href: "/app/transactions" },
  { label: "Accounts", href: "/app/accounts" },
  { label: "Investments", href: "/app/investments" },
  { label: "Goals", href: "/app/goals" },
  { label: "Loans", href: "/app/loans" },
  { label: "Sharia Profit Sharing", href: "/app/tools/sharia-profit" },
  { label: "FIRE Calculator", href: "/app/tools/fire" },
  { label: "Settings", href: "/app/settings" },
] as const;

/**
 * Date granularity options for analytics.
 */
export const ANALYTICS_GRANULARITY = ["day", "week", "month"] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITY)[number];
