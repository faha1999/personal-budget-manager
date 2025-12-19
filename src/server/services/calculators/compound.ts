  // TODO: Implement compound interest math and return growth schedule.


export type CompoundInput = {
  principal: number;          // starting amount
  monthlyContribution: number;
  annualRatePct: number;      // e.g., 12 means 12%
  years: number;
  compoundsPerYear?: number;  // default 12 (monthly compounding)
};

export type CompoundYearRow = {
  year: number;
  start: number;
  contributions: number;
  interest: number;
  end: number;
};

export function compoundGrowth(input: CompoundInput) {
  const n = input.compoundsPerYear ?? 12;
  const r = input.annualRatePct / 100;
  const periods = Math.max(0, Math.round(input.years * n));
  const contribPerPeriod = input.monthlyContribution * (12 / n);

  let balance = input.principal;
  const rows: CompoundYearRow[] = [];

  for (let y = 1; y <= input.years; y++) {
    const start = balance;
    let contrib = 0;
    let interest = 0;

    for (let i = 0; i < n; i++) {
      // contribute at start of each period
      balance += contribPerPeriod;
      contrib += contribPerPeriod;

      const before = balance;
      balance = balance * (1 + r / n);
      interest += balance - before;
    }

    rows.push({
      year: y,
      start,
      contributions: contrib,
      interest,
      end: balance,
    });
  }

  const totalContrib = rows.reduce((a, b) => a + b.contributions, 0);
  const totalInterest = rows.reduce((a, b) => a + b.interest, 0);

  return {
    final: balance,
    totalContributions: totalContrib,
    totalInterest,
    table: rows,
  };
}
