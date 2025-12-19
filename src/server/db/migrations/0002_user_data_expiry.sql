-- Add per-user data expiry for automatic cleanup.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN data_expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_data_expires_at ON users(data_expires_at);
