// TODO: Seed default categories for Bangladesh context (food, transport, utilities, etc.).
/**
 * Opinionated default categories for Bangladesh personal finance.
 * Users can still type their own categories (we don't hard-enforce).
 */

export const INCOME_CATEGORIES = [
  "Salary",
  "Business",
  "Freelance",
  "Bonus",
  "Gift",
  "Interest",
  "Rental Income",
  "Refund",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Rent",
  "Utilities",
  "Mobile & Internet",
  "Health",
  "Education",
  "Shopping",
  "Family Support",
  "Entertainment",
  "Travel",
  "Subscriptions",
  "Charity (Zakat/Sadaqah)",
  "Loan Payment",
  "Investment",
  "Other Expense",
] as const;

export const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])) as string[];

// Premium-friendly category colors for charts (light-mode first).
// Keep it small and consistent; UI should look calm and modern.
export const CATEGORY_COLORS: Record<string, string> = {
  Salary: "#0F766E",
  Business: "#1D4ED8",
  Freelance: "#7C3AED",
  Bonus: "#B45309",
  Gift: "#BE123C",
  Interest: "#0369A1",
  "Rental Income": "#065F46",
  Refund: "#0E7490",

  "Food & Groceries": "#DC2626",
  Transport: "#0EA5E9",
  Rent: "#111827",
  Utilities: "#6B7280",
  "Mobile & Internet": "#8B5CF6",
  Health: "#F43F5E",
  Education: "#2563EB",
  Shopping: "#DB2777",
  "Family Support": "#B45309",
  Entertainment: "#9333EA",
  Travel: "#0891B2",
  Subscriptions: "#4B5563",
  "Charity (Zakat/Sadaqah)": "#15803D",
  "Loan Payment": "#7F1D1D",
  Investment: "#0F766E",
};
