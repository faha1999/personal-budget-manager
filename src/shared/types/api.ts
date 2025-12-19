// TODO: Define API request/response types shared between client and server.
import type {
  AccountModel,
  GoalModel,
  InvestmentModel,
  InvestmentValueModel,
  LoanModel,
  LoanPaymentModel,
  TransactionModel,
  TxType,
} from "./models";

export type ApiError = {
  error: {
    code: "UNAUTHORIZED" | "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
};

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false } & ApiError;
export type ApiResponse<T> = ApiOk<T> | ApiFail;

// -------------------- Auth --------------------

export type LoginRequest = { email: string; password: string };
export type LoginResponse = {
  user: { id: string; email: string; name: string | null };
  expiresAt: string;
};

export type RegisterRequest = { email: string; password: string; name?: string | null };
export type RegisterResponse = LoginResponse;

// -------------------- Accounts --------------------

export type AccountsListResponse = { items: (AccountModel & { balance_minor?: number })[] };

export type AccountCreateRequest = {
  name: string;
  bank_name?: string | null;
  type: AccountModel["type"];
  opening_balance_minor?: number;
  currency?: "BDT";
};

export type AccountUpdateRequest = Partial<AccountCreateRequest>;

export type AccountDetailResponse = {
  account: AccountModel & { balance_minor: number };
};

// -------------------- Expenses --------------------

export type ExpensesListQuery = {
  limit?: number;
  offset?: number;
  start?: string; // ISO
  end?: string; // ISO
  type?: TxType;
  category?: string;
  accountId?: string;
};

export type ExpensesListResponse = {
  items: TransactionModel[];
  total: number;
};

export type ExpenseCreateRequest = {
  account_id: string;
  type: TxType;
  category: string;
  amount_minor: number;
  note?: string | null;
  occurred_at: string; // ISO
};

export type ExpenseUpdateRequest = Partial<Omit<ExpenseCreateRequest, "occurred_at">> & {
  occurred_at?: string;
};

// -------------------- Investments --------------------

export type InvestmentsListResponse = {
  items: (InvestmentModel & { latest_value_minor: number })[];
};

export type InvestmentCreateRequest = {
  name: string;
  type: InvestmentModel["type"];
  provider?: string | null;
  note?: string | null;
  currency?: "BDT";
  units?: number | null;
};

export type InvestmentUpdateRequest = Partial<InvestmentCreateRequest>;

export type InvestmentDetailResponse = {
  investment: InvestmentModel;
  values: InvestmentValueModel[]; // newest first
  latest_value_minor: number;
};

export type AddInvestmentValueRequest = {
  value_minor: number;
  valued_at: string; // ISO
};

// -------------------- Goals --------------------

export type GoalsListResponse = {
  items: (GoalModel & { saved_minor: number; progress_pct: number })[];
};

export type GoalCreateRequest = {
  title: string;
  target_minor: number;
  target_date?: string | null; // ISO date
  note?: string | null;
};

export type GoalUpdateRequest = Partial<GoalCreateRequest>;

export type GoalDetailResponse = {
  goal: GoalModel;
  saved_minor: number;
  progress_pct: number;
  contributions: {
    items: { id: string; amount_minor: number; contributed_at: string; note: string | null }[];
    total: number;
  };
};

export type AddGoalContributionRequest = {
  amount_minor: number;
  contributed_at: string; // ISO
  note?: string | null;
};

// -------------------- Loans --------------------

export type LoansListResponse = {
  items: (LoanModel & { paid_minor: number; outstanding_minor: number; progress_pct: number })[];
};

export type LoanCreateRequest = {
  lender: string;
  principal_minor: number;
  interest_rate?: number | null;
  start_date?: string | null;
  note?: string | null;
};

export type LoanUpdateRequest = Partial<LoanCreateRequest>;

export type LoanDetailResponse = {
  loan: LoanModel;
  paid_minor: number;
  outstanding_minor: number;
  progress_pct: number;
  payments: {
    items: LoanPaymentModel[];
    total: number;
  };
};

export type AddLoanPaymentRequest = {
  amount_minor: number;
  paid_at: string; // ISO
  note?: string | null;
};

// -------------------- Analytics --------------------

export type AnalyticsSummaryResponse = {
  period: { start: string; end: string };
  income_minor: number;
  expense_minor: number;
  savings_minor: number;
  cash_net_minor: number;
  investments_minor: number;
  investments_realized_gain_minor: number;
  outstanding_loans_minor: number;
  outstanding_receivables_minor: number;
  net_worth_minor: number;
};

export type AnalyticsTrendsResponse = {
  granularity: "day" | "week" | "month";
  series: { bucket: string; income_minor: number; expense_minor: number }[];
};

export type AnalyticsCategoriesResponse = { category: string; total_minor: number }[];
