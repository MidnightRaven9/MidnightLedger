CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paychecks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  date TEXT NOT NULL,
  amount REAL,
  allocated REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_day INTEGER,
  category TEXT,
  recurring TEXT DEFAULT 'monthly',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocations (
  id TEXT PRIMARY KEY,
  paycheck_id TEXT,
  bill_id TEXT,
  amount REAL,
  paid BOOLEAN DEFAULT 0,
  paid_date TEXT,
  FOREIGN KEY(paycheck_id) REFERENCES paychecks(id),
  FOREIGN KEY(bill_id) REFERENCES bills(id)
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  bill_id TEXT,
  paycheck_id TEXT,
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
