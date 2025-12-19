// Sharia-compliant profit-sharing math and growth schedule.

export type ShariaProfitInput = {
  principal: number; // starting capital
  monthlyContribution: number;
  annualProfitRatePct: number; // expected (not guaranteed)
  years: number;
  investorSharePct: number; // share of profit for investor (0-100)
  profitHandling?: "reinvest" | "withdraw";
  distributionsPerYear?: number; // default 12 (monthly)
};

export type ShariaProfitYearRow = {
  year: number;
  contributed: number;
  profit: number;
  value: number;
};

export function shariaProfitGrowth(input: ShariaProfitInput) {
  const years = Math.max(0, Math.floor(input.years));
  const n = input.distributionsPerYear ?? 12;
  const r = input.annualProfitRatePct / 100;
  const share = Math.min(1, Math.max(0, input.investorSharePct / 100));
  const contribPerPeriod = input.monthlyContribution * (12 / n);
  const reinvest = input.profitHandling !== "withdraw";

  let balance = input.principal;
  let contributed = input.principal;
  let profitEarned = 0;
  let withdrawnProfit = 0;

  const rows: ShariaProfitYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    for (let i = 0; i < n; i++) {
      balance += contribPerPeriod;
      contributed += contribPerPeriod;

      const poolProfit = balance * (r / n);
      const investorProfit = poolProfit * share;

      profitEarned += investorProfit;

      if (reinvest) {
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
    final: rows.at(-1) ?? {
      year: 0,
      contributed,
      profit: profitEarned,
      value: balance + withdrawnProfit,
    },
    totalContributions: contributed,
    totalProfit: profitEarned,
    table: rows,
  };
}
