//       TODO: FIRE calculator using current net worth, expenses, and assumptions.
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function FirePage() {
  const [netWorth, setNetWorth] = useState("1250000");
  const [monthlyExpense, setMonthlyExpense] = useState("45000");
  const [monthlyInvest, setMonthlyInvest] = useState("20000");
  const [returnRate, setReturnRate] = useState("10"); // annual %
  const [withdrawRate, setWithdrawRate] = useState("4"); // %
  const [inputsOpen, setInputsOpen] = useState(false);

  const resetDefaults = () => {
    setNetWorth("1250000");
    setMonthlyExpense("45000");
    setMonthlyInvest("20000");
    setReturnRate("10");
    setWithdrawRate("4");
  };

  const leanScenario = () => {
    setNetWorth("800000");
    setMonthlyExpense("35000");
    setMonthlyInvest("15000");
    setReturnRate("9");
    setWithdrawRate("3.5");
  };

  const model = useMemo(() => {
    const NW0 = num(netWorth);
    const expM = Math.max(0, num(monthlyExpense));
    const invM = Math.max(0, num(monthlyInvest));
    const r = Math.max(0, num(returnRate) / 100);
    const wr = Math.max(0.001, num(withdrawRate) / 100);

    const annualExpense = expM * 12;
    const fireNumber = annualExpense / wr;

    // Projection: month-by-month with compounding
    const rMonthly = r / 12;

    let months = 0;
    let nw = NW0;

    const capMonths = 12 * 80; // safety cap: 80 years
    while (months < capMonths && nw < fireNumber) {
      nw += invM; // contribution
      nw += nw * rMonthly; // growth
      months++;
    }

    const years = months / 12;

    return {
      annualExpense,
      fireNumber,
      months,
      years,
      reached: nw >= fireNumber,
      projectedNetWorth: nw,
    };
  }, [netWorth, monthlyExpense, monthlyInvest, returnRate, withdrawRate]);

  return (
    <div className="space-y-6">
      <Header
        title="FIRE Calculator"
        subtitle="Estimate your Financial Independence timeline using clean assumptions."
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
                <span>Edit or load a preset</span>
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
                    onClick={leanScenario}
                    className="rounded-lg bg-slate-900 px-3 py-1 font-semibold text-white hover:bg-slate-800"
                  >
                    Lean FIRE
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current net worth (BDT)">
                  <input value={netWorth} onChange={(e) => setNetWorth(e.target.value)} className={input()} inputMode="numeric" />
                </Field>
                <Field label="Monthly expense (BDT)">
                  <input value={monthlyExpense} onChange={(e) => setMonthlyExpense(e.target.value)} className={input()} inputMode="numeric" />
                </Field>
                <Field label="Monthly investment (BDT)">
                  <input value={monthlyInvest} onChange={(e) => setMonthlyInvest(e.target.value)} className={input()} inputMode="numeric" />
                </Field>
                <Field label="Expected annual return (%)">
                  <input value={returnRate} onChange={(e) => setReturnRate(e.target.value)} className={input()} inputMode="decimal" />
                </Field>
                <Field label="Withdrawal rate (%)">
                  <input value={withdrawRate} onChange={(e) => setWithdrawRate(e.target.value)} className={input()} inputMode="decimal" />
                </Field>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <p className="text-xs font-semibold text-slate-900">Results</p>
                <div className="mt-2 grid gap-2 text-sm">
                  <KV label="Annual expense" value={money(model.annualExpense)} />
                  <KV label="FIRE number" value={money(model.fireNumber)} strong />
                  <KV
                    label="Time to FIRE"
                    value={model.reached ? `${model.years.toFixed(1)} years` : "Not reached (cap reached)"}
                    strong
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">Estimation only. Not financial advice.</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-600">Click Edit to adjust your FIRE assumptions.</p>
          )}
        </Card>

        <Card title="Snapshot" subtitle="Minimal visual summary">
          <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-black/5">
            <p className="text-xs font-medium text-slate-600">Projected net worth at FIRE</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {money(model.projectedNetWorth)}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{
                  width: `${Math.min(100, Math.round((num(netWorth) / Math.max(model.fireNumber, 1)) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Current progress:{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(100, Math.round((num(netWorth) / Math.max(model.fireNumber, 1)) * 100))}%
              </span>
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniStat title="Return" value={`${num(returnRate).toFixed(1)}%/yr`} />
              <MiniStat title="Withdrawal" value={`${num(withdrawRate).toFixed(1)}%`} />
              <MiniStat title="Invest" value={`${money(num(monthlyInvest))}/mo`} />
              <MiniStat title="Spend" value={`${money(num(monthlyExpense))}/mo`} />
            </div>
          </div>
        </Card>
      </div>
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

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function input() {
  return "w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 ring-1 ring-black/10 outline-none transition placeholder:text-slate-400 focus:ring-slate-900/25";
}

function num(v: string) {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);
}
