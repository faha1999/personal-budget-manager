  // TODO: render income vs expense bar chart (e.g., Recharts) with monthly breakdown.

  "use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Point = { bucket: string; income_minor: number; expense_minor: number };

function formatBDTMinor(v: number) {
  const bdt = v / 100;
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(bdt);
}

export function IncomeExpenseBar({ data }: { data: Point[] }) {
  const chartColors = {
    grid: "rgba(var(--border), 0.55)",
    axis: "rgb(var(--muted))",
    income: "rgb(var(--brand-2))",
    expense: "rgb(var(--brand-3))",
  };
  const tooltipStyle = {
    backgroundColor: "rgba(var(--surface), 0.95)",
    borderColor: "rgba(var(--border), 1)",
    borderRadius: 12,
    color: "rgb(var(--ink))",
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Income vs Expense</div>
          <div className="text-xs subtle">Trend breakdown for the selected period</div>
        </div>
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: chartColors.axis }} />
            <YAxis
              tick={{ fontSize: 12, fill: chartColors.axis }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value: any) => formatBDTMinor(Number(value))}
              contentStyle={tooltipStyle}
              labelStyle={{ color: "rgb(var(--muted))" }}
            />
            <Legend formatter={(value) => <span className="text-xs text-slate-700">{value}</span>} />
            <Bar dataKey="income_minor" name="Income" fill={chartColors.income} />
            <Bar dataKey="expense_minor" name="Expense" fill={chartColors.expense} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
