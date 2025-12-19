/**
 * TODO: Orchestrate analytics calculations and map repository outputs to API responses.
 */
import { getCategories, getSummary, getTrends } from "@/server/db/repositories/analytics.repo";

export async function summaryForDashboard(input: { userId: string; start: string; end: string }) {
  return getSummary(input);
}

export async function trendsForDashboard(input: {
  userId: string;
  start: string;
  end: string;
  granularity: "day" | "week" | "month";
}) {
  return getTrends(input);
}

export async function categoriesForDashboard(input: {
  userId: string;
  start: string;
  end: string;
  type?: "EXPENSE" | "INCOME";
}) {
  return getCategories(input);
}
