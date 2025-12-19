  // TODO: render net worth line chart over time with hover details.

  "use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Point = { bucket: string; net_worth_minor: number };

function formatBDTMinor(v: number) {
  const bdt = v / 100;
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(bdt);
}

export function NetWorthLine({ data }: { data: Point[] }) {
  const chartColors = {
    grid: "rgba(var(--border), 0.55)",
    axis: "rgb(var(--muted))",
    line: "rgb(var(--brand))",
  };
  const tooltipStyle = {
    backgroundColor: "rgba(var(--surface), 0.95)",
    borderColor: "rgba(var(--border), 1)",
    borderRadius: 12,
    color: "rgb(var(--ink))",
  };

  return (
    <div className="card p-5">
      <div>
        <div className="text-sm font-semibold">Net Worth Over Time</div>
        <div className="text-xs subtle">Accounts + Investments + Receivables − Outstanding Loans</div>
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
            <Line
              type="monotone"
              dataKey="net_worth_minor"
              name="Net Worth"
              dot={false}
              stroke={chartColors.line}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
