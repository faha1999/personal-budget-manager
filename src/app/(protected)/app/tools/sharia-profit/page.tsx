// Sharia-compliant profit-sharing calculator with chart/table.
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ProfitMode = "reinvest" | "withdraw";

type Row = {
  year: number;
  contributed: number;
  profit: number;
  value: number;
};

export default function ShariaProfitPage() {
  const [principal, setPrincipal] = useState("100000");
  const [monthly, setMonthly] = useState("5000");
  const [profitRate, setProfitRate] = useState("10"); // expected annual profit rate
  const [profitShare, setProfitShare] = useState("70"); // investor share %
  const [years, setYears] = useState("10");
  const [profitMode, setProfitMode] = useState<ProfitMode>("reinvest");
  const [inputsOpen, setInputsOpen] = useState(false);

  const model = useMemo(() => {
    const P = clampNum(principal);
    const PMT = clampNum(monthly);
    const rAnnual = clampNum(profitRate) / 100;
    const sharePct = clampPct(profitShare);
    const nYears = Math.max(0, Math.floor(clampNum(years)));
    const share = sharePct / 100;

    const rows: Row[] = [];

    let balance = P;
    let contributed = P;
    let profitEarned = 0;
    let withdrawnProfit = 0;

    for (let y = 1; y <= nYears; y++) {
      for (let m = 1; m <= 12; m++) {
        balance += PMT;
        contributed += PMT;

        const poolProfit = balance * (rAnnual / 12);
        const investorProfit = poolProfit * share;

        profitEarned += investorProfit;

        if (profitMode === "reinvest") {
          balance += investorProfit;
        } else {
          withdrawnProfit += investorProfit;
        }
      }

      rows.push({
        year: y,
        contributed,
        profit: profitEarned,
        value: balance + withdrawnProfit,
      });
    }

    return {
      rows,
      final: rows.at(-1) ?? {
        year: 0,
        contributed,
        profit: profitEarned,
        value: balance + withdrawnProfit,
      },
      managerShare: Math.max(0, 100 - sharePct),
    };
  }, [principal, monthly, profitRate, profitShare, years, profitMode]);

  const resetDefaults = () => {
    setPrincipal("100000");
    setMonthly("5000");
    setProfitRate("10");
    setProfitShare("70");
    setYears("10");
    setProfitMode("reinvest");
  };

  const setGrowth = () => {
    setPrincipal("150000");
    setMonthly("12000");
    setProfitRate("12");
    setProfitShare("75");
    setYears("15");
    setProfitMode("reinvest");
  };

  return (
    <div className="space-y-6">
      <Header
        title="Sharia Profit Sharing"
        subtitle="Estimate halal investment growth with Mudarabah-style profit sharing (no interest)."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Inputs"
          subtitle="Adjust assumptions"
          action={
            <Button
              size="sm"
              variant={inputsOpen ? "secondary" : "primary"}
              onClick={() => setInputsOpen((v) => !v)}
            >
              {inputsOpen ? "Close" : "Edit"}
            </Button>
          }
        >
          {inputsOpen ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>Edit or use quick presets</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetDefaults}
                    className="rounded-lg bg-white px-3 py-1 font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={setGrowth}
                    className="rounded-lg bg-slate-900 px-3 py-1 font-semibold text-white hover:bg-slate-800"
                  >
                    Growth
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Initial capital (BDT)">
                  <input
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className={input()}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Monthly contribution (BDT)">
                  <input
                    value={monthly}
                    onChange={(e) => setMonthly(e.target.value)}
                    className={input()}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Expected annual profit rate (%)">
                  <input
                    value={profitRate}
                    onChange={(e) => setProfitRate(e.target.value)}
                    className={input()}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Investor profit share (%)">
                  <input
                    value={profitShare}
                    onChange={(e) => setProfitShare(e.target.value)}
                    className={input()}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Years">
                  <input
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    className={input()}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Profit handling">
                  <select
                    value={profitMode}
                    onChange={(e) => setProfitMode(e.target.value as ProfitMode)}
                    className={input()}
                  >
                    <option value="reinvest">Reinvest profits</option>
                    <option value="withdraw">Withdraw profits</option>
                  </select>
                </Field>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <p className="text-xs font-semibold text-slate-900">Result</p>
                <div className="mt-2 grid gap-2 text-sm">
                  <KV label="Projected value" value={money(model.final.value)} strong />
                  <KV label="Capital contributed" value={money(model.final.contributed)} />
                  <KV label="Profit earned (investor share)" value={money(model.final.profit)} />
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Investor share: {clampPct(profitShare).toFixed(0)}% / Manager share: {model.managerShare.toFixed(0)}%
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Profit is not guaranteed. This model assumes a stable expected profit rate.
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-600">Click Edit to adjust the assumptions for this calculation.</p>
          )}
        </Card>

        <Card title="Value preview" subtitle="Projected portfolio value">
          <Sparkline points={model.rows.map((r) => r.value)} />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Year 1</span>
            <span className="font-semibold text-slate-900">{money(model.final.value)}</span>
            <span>Year {model.final.year}</span>
          </div>
        </Card>
      </div>

      <Card title="Year-by-year table" subtitle="Detailed breakdown">
        <div className="overflow-x-auto rounded-2xl ring-1 ring-black/5">
          <table className="w-full min-w-[720px] bg-white text-left">
            <thead>
              <tr className="border-b border-black/5 text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Capital contributed</th>
                <th className="px-4 py-3 font-medium">Profit earned</th>
                <th className="px-4 py-3 text-right font-medium">Total value</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {model.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-600">
                    Increase “Years” to see results.
                  </td>
                </tr>
              ) : (
                model.rows.map((r) => (
                  <tr key={r.year} className="border-b border-black/5 last:border-none">
                    <td className="px-4 py-3 text-slate-700">{r.year}</td>
                    <td className="px-4 py-3 text-slate-700">{money(r.contributed)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(r.profit)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(r.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------- UI ---------- */

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function KV({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className={strong ? "text-sm font-semibold text-slate-900" : "text-sm text-slate-800"}>{value}</span>
    </div>
  );
}

function input() {
  return "w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 ring-1 ring-black/10 outline-none transition placeholder:text-slate-400 focus:ring-slate-900/25";
}

function Sparkline({ points }: { points: number[] }) {
  const w = 640;
  const h = 160;
  const pad = 12;

  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);

  const sx = (i: number) => (i / Math.max(points.length - 1, 1)) * (w - pad * 2) + pad;
  const sy = (v: number) => {
    const t = (v - min) / Math.max(max - min, 1);
    return h - pad - t * (h - pad * 2);
  };

  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`).join(" ");

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-900" />
        <path
          d={`${d} L ${sx(points.length - 1)} ${h - pad} L ${sx(0)} ${h - pad} Z`}
          fill="currentColor"
          className="text-slate-900/10"
        />
      </svg>
    </div>
  );
}

function clampNum(v: string) {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clampPct(v: string) {
  const n = clampNum(v);
  return Math.min(100, Math.max(0, n));
}

function money(n: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);
}
