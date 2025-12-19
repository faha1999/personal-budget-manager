"use client";

import { useId, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { formatCurrencyFromMinor } from "@/lib/format";

type Holding = { id: string; name: string; type: string; status: "ACTIVE" | "CLOSED"; value: number };
type TrendPoint = { day: string; total: number };

export function PortfolioSnapshot({
  total,
  realizedGain,
  holdings,
  trend,
}: {
  total: number;
  realizedGain: number;
  holdings: Holding[];
  trend: TrendPoint[];
}) {
  const topHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [holdings]);

  const chartTrend = useMemo(() => trend.slice(-12), [trend]);
  const gradientId = `portfolioFill-${useId().replace(/:/g, "")}`;
  const chartColors = {
    grid: "rgba(var(--border), 0.55)",
    axis: "rgb(var(--muted))",
    line: "rgb(var(--brand))",
    bar: "rgb(var(--brand))",
  };
  const tooltipStyle = {
    backgroundColor: "rgba(var(--surface), 0.95)",
    borderColor: "rgba(var(--border), 1)",
    borderRadius: 12,
    color: "rgb(var(--ink))",
  };
  const tooltipLabelStyle = { color: "rgb(var(--muted))" };

  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Investment portfolio</p>
          <p className="mt-1 text-xs text-slate-600">Latest values across active and closed investments.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-600">Total value</p>
          <p className="text-lg font-semibold text-slate-900">{formatCurrencyFromMinor(total)}</p>
          <p className="text-[11px] font-semibold text-emerald-600">
            Realized P/L: {formatCurrencyFromMinor(realizedGain)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-xs font-semibold text-slate-700">Portfolio trend</p>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.line} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={chartColors.line} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartColors.axis }} />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrencyFromMinor(Number(value))}
                  labelFormatter={(v) => `Date: ${v}`}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={chartColors.line}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-xs font-semibold text-slate-700">Top holdings</p>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHoldings}>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: any, _: any, item: any) => [formatCurrencyFromMinor(Number(value)), item.payload.type]}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Bar dataKey="value" fill={chartColors.bar} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-700">
            {topHoldings.map((h) => {
              const pct = total > 0 ? Math.round((h.value / total) * 100) : 0;
              return (
                <li key={h.id} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    {h.name} <span className="text-[11px] font-medium text-slate-500">({h.type}{h.status === "CLOSED" ? " • Closed" : ""})</span>
                  </span>
                  <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(h.value)}</span>
                  <span className="text-[11px] text-slate-500">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
