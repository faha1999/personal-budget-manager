  // TODO: Implement FIRE projection logic and return estimated FIRE date/age.


export type FireInput = {
  currentNetWorth: number;
  monthlyExpense: number;
  safeWithdrawalRatePct: number; // e.g., 4
  monthlyInvestment: number;
  annualReturnPct: number;       // growth of invested capital
};

export function fireCalculator(input: FireInput) {
  const swr = input.safeWithdrawalRatePct / 100;
  const annualExpense = input.monthlyExpense * 12;
  const target = swr > 0 ? annualExpense / swr : Infinity;

  // simple simulation monthly
  const monthlyR = input.annualReturnPct / 100 / 12;

  let months = 0;
  let nw = input.currentNetWorth;

  // cap to avoid infinite loops
  const MAX_MONTHS = 100 * 12;

  while (nw < target && months < MAX_MONTHS) {
    nw += input.monthlyInvestment;
    nw *= 1 + monthlyR;
    months++;
  }

  return {
    targetNumber: target,
    reached: nw >= target,
    monthsToFire: months >= MAX_MONTHS ? null : months,
    yearsToFire: months >= MAX_MONTHS ? null : months / 12,
    projectedNetWorth: nw,
  };
}
