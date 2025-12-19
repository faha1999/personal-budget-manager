"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS } from "@/shared/constants/categories";
import { formatCurrencyFromMinor } from "@/lib/format";

type TrendPoint = { label: string; income: number; expense: number };
type CategorySlice = { name: string; amount: number };
type Kpis = { income: number; expense: number; savings: number; netWorth: number };

export function BudgetVisuals({
  trends,
  categories,
  kpis,
}: {
  trends: TrendPoint[];
  categories: CategorySlice[];
  kpis: Kpis;
}) {
  const trendSeries = trends.length > 0 ? trends : [{ label: "This month", income: 0, expense: 0 }];
  const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount);

  const donutData = useMemo(() => {
    const top = sortedCategories.slice(0, 6);
    const total = sortedCategories.reduce((s, c) => s + c.amount, 0);
    if (total > 0 && sortedCategories.length > top.length) {
      const used = top.reduce((s, c) => s + c.amount, 0);
      top.push({ name: "Other", amount: Math.max(0, total - used) });
    }
    return top;
  }, [sortedCategories]);

  const sankeyData = useMemo(() => {
    const totalExpense = sortedCategories.reduce((s, c) => s + c.amount, 0);
    const savingsPositive = Math.max(0, kpis.savings);
    const incomeForFlow = kpis.income > 0 ? kpis.income : totalExpense;

    const nodes = [
      { name: "Income" },
      { name: "Expenses" },
      { name: "Savings" },
      ...sortedCategories.slice(0, 5).map((c) => ({ name: c.name })),
      ...(totalExpense > 0 && sortedCategories.length > 5
        ? [{ name: "Other" }]
        : []),
    ];

    const links: Array<{ source: number; target: number; value: number }> = [];

    if (incomeForFlow > 0) {
      links.push({ source: 0, target: 1, value: Math.max(totalExpense, incomeForFlow) });
    }
    if (savingsPositive > 0) {
      links.push({ source: 0, target: 2, value: savingsPositive });
    }

    const categoryStart = 3;
    const catLinks = sortedCategories.slice(0, 5).map((c, idx) => ({
      source: 1,
      target: categoryStart + idx,
      value: c.amount,
    }));
    links.push(...catLinks.filter((l) => l.value > 0));

    if (totalExpense > 0 && sortedCategories.length > 5) {
      const otherTotal = totalExpense - sortedCategories.slice(0, 5).reduce((s, c) => s + c.amount, 0);
      if (otherTotal > 0) {
        links.push({
          source: 1,
          target: nodes.length - 1,
          value: otherTotal,
        });
      }
    }

    return { nodes, links };
  }, [kpis.income, kpis.savings, sortedCategories]);

  const chartColors = {
    grid: "rgba(var(--border), 0.55)",
    axis: "rgb(var(--muted))",
    income: "rgb(var(--brand-2))",
    expense: "rgb(var(--brand-3))",
    net: "rgb(var(--ink))",
    flow: "rgba(var(--border), 0.7)",
    nodeStroke: "rgba(var(--border), 0.8)",
    nodeFill: "rgb(var(--ink))",
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Income vs Expense</p>
          <span className="text-[11px] text-slate-500">Bars + net line</span>
        </div>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendSeries}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend formatter={(val) => <span className="text-xs text-slate-700">{val}</span>} />
              <Bar dataKey="income" name="Income" fill={chartColors.income} radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={chartColors.expense} radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey={(d: TrendPoint) => d.income - d.expense}
                name="Net"
                stroke={chartColors.net}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Expense list</p>
          <span className="text-[11px] text-slate-500">Top categories</span>
        </div>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="amount"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {donutData.map((entry, index) => (
                  <Cell key={entry.name} fill={colorForCategory(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip content={<CurrencyTooltip />} />
              <Legend formatter={(val) => <span className="text-xs text-slate-700">{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 xl:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Cash flow</p>
          <span className="text-[11px] text-slate-500">Income → expenses → categories</span>
        </div>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodePadding={18}
              nodeWidth={12}
              margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
              link={{ stroke: chartColors.flow, strokeOpacity: 0.65 }}
              node={{
                cursor: "pointer",
                stroke: chartColors.nodeStroke,
                strokeWidth: 1,
                fill: chartColors.nodeFill,
              }}
            >
              <Tooltip content={<CurrencyTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function colorForCategory(name: string, index: number) {
  const fallbacks = ["#0ea5e9", "#f97316", "#10b981", "#6366f1", "#f43f5e", "#14b8a6"];
  return CATEGORY_COLORS[name] ?? fallbacks[index % fallbacks.length];
}

function CurrencyTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;

  const entries = payload.map((p) => ({
    name: p.name || p.dataKey,
    value: typeof p.value === "number" ? formatCurrencyFromMinor(p.value) : p.value,
    color: p.color,
  }));

  return (
    <div className="rounded-xl bg-white p-3 shadow ring-1 ring-black/10">
      <div className="space-y-1 text-xs">
        {entries.map((e) => (
          <div key={e.name} className="flex items-center gap-2">
            {e.color ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} /> : null}
            <span className="font-semibold text-slate-900">{e.name}</span>
            <span className="text-slate-700">{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
