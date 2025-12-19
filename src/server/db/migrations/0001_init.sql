-- TODO: Initial migration to create all tables with user_id scoping and indexes.

PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  password_hash   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Sessions (cookie auth)
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at      TEXT NOT NULL,
  last_seen_at    TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  name                  TEXT NOT NULL,
  bank_name             TEXT,
  type                  TEXT NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'BDT',
  opening_balance_minor INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  account_id      TEXT NOT NULL,
  type            TEXT NOT NULL,
  category        TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL,
  note            TEXT,
  occurred_at     TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_tx_user_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_tx_user_account ON transactions(user_id, account_id);

-- Investments
CREATE TABLE IF NOT EXISTS investments (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  provider        TEXT,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  units           REAL,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);

CREATE TABLE IF NOT EXISTS investment_values (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  investment_id   TEXT NOT NULL,
  value_minor     INTEGER NOT NULL,
  valued_at       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(investment_id) REFERENCES investments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_inv_values_user_inv_date ON investment_values(user_id, investment_id, valued_at);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  target_minor    INTEGER NOT NULL,
  saved_minor     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  target_date     TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  goal_id         TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL,
  contributed_at  TEXT NOT NULL,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_user_goal_date ON goal_contributions(user_id, goal_id, contributed_at);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  lender          TEXT NOT NULL,
  principal_minor INTEGER NOT NULL,
  outstanding_minor INTEGER NOT NULL DEFAULT 0,
  interest_rate   REAL,
  start_date      TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

CREATE TABLE IF NOT EXISTS loan_payments (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  loan_id         TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL,
  paid_at         TEXT NOT NULL,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(loan_id) REFERENCES loans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_loan_pay_user_loan_date ON loan_payments(user_id, loan_id, paid_at);

-- Receivables (money others owe you)
CREATE TABLE IF NOT EXISTS receivables (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  person            TEXT NOT NULL,
  principal_minor   INTEGER NOT NULL,
  outstanding_minor INTEGER NOT NULL DEFAULT 0,
  start_date        TEXT,
  note              TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_receivables_user_id ON receivables(user_id);

CREATE TABLE IF NOT EXISTS receivable_payments (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  receivable_id   TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL,
  received_at     TEXT NOT NULL,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(receivable_id) REFERENCES receivables(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rec_pay_user_rec_date ON receivable_payments(user_id, receivable_id, received_at);
