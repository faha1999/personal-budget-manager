  // TODO: render expense breakdown donut chart with category colors.

  "use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Legend } from "recharts";

type Item = { category: string; total_minor: number };

function formatBDTMinor(v: number) {
  const bdt = v / 100;
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(bdt);
}

// consistent pleasant palette; no need to hardcode in Tailwind
const COLORS = [
  "rgb(var(--brand))",
  "rgb(var(--brand-2))",
  "rgb(var(--brand-3))",
  "rgba(var(--ink-strong), 0.9)",
  "rgba(var(--ink), 0.9)",
  "rgba(var(--muted), 0.9)",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#22c55e",
];

export function CategoryDonut({ data }: { data: Item[] }) {
  const total = data.reduce((a, b) => a + (b.total_minor || 0), 0);
  const tooltipStyle = {
    backgroundColor: "rgba(var(--surface), 0.95)",
    borderColor: "rgba(var(--border), 1)",
    borderRadius: 12,
    color: "rgb(var(--ink))",
  };

  return (
    <div className="card p-5">
      <div>
        <div className="text-sm font-semibold">Expense by Category</div>
        <div className="text-xs subtle">Total: {formatBDTMinor(total)}</div>
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total_minor"
              nameKey="category"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => formatBDTMinor(Number(value))}
              contentStyle={tooltipStyle}
              labelStyle={{ color: "rgb(var(--muted))" }}
            />
            <Legend formatter={(value) => <span className="text-xs text-slate-700">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
