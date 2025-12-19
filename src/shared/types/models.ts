// TODO: Define domain models (User, Transaction, Account, Investment, Goal, Loan, etc.).
export type CurrencyCode = "BDT";

export type TxType = "INCOME" | "EXPENSE";

export type AccountType = "BANK" | "CASH" | "MOBILE_WALLET" | "OTHER";

export type InvestmentType = "STOCK" | "FUND" | "DPS" | "FDR" | "CRYPTO" | "GOLD" | "OTHER";

export type UserModel = {
  id: string;
  email: string;
  name: string | null;
  data_expires_at?: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
};

export type AccountModel = {
  id: string;
  user_id: string;
  name: string;
  bank_name: string | null;
  type: AccountType;
  currency: CurrencyCode;
  opening_balance_minor: number; // paisa
  created_at: string;
  updated_at: string;
};

export type TransactionModel = {
  id: string;
  user_id: string;
  account_id: string;
  type: TxType;
  category: string;
  amount_minor: number; // paisa
  note: string | null;
  occurred_at: string; // ISO
  created_at: string;
  updated_at: string;
};

export type InvestmentModel = {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentType;
  provider: string | null;
  currency: CurrencyCode;
  units: number | null;
  note: string | null;
  status: "ACTIVE" | "CLOSED";
  closed_at: string | null;
  final_value_minor: number | null;
  realized_gain_minor: number | null;
  created_at: string;
  updated_at: string;
};

export type InvestmentValueModel = {
  id: string;
  user_id: string;
  investment_id: string;
  value_minor: number;
  valued_at: string; // ISO
  created_at: string;
};

export type GoalModel = {
  id: string;
  user_id: string;
  title: string;
  target_minor: number;
  saved_minor: number;
  status: "ACTIVE" | "COMPLETED";
  target_date: string | null; // ISO date or ISO datetime
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalContributionModel = {
  id: string;
  user_id: string;
  goal_id: string;
  amount_minor: number;
  contributed_at: string; // ISO
  note: string | null;
  created_at: string;
};

export type LoanModel = {
  id: string;
  user_id: string;
  lender: string;
  principal_minor: number;
  outstanding_minor: number;
  interest_rate: number | null; // annual %
  start_date: string | null; // ISO date or ISO datetime
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type LoanPaymentModel = {
  id: string;
  user_id: string;
  loan_id: string;
  amount_minor: number;
  paid_at: string; // ISO
  note: string | null;
  created_at: string;
};
