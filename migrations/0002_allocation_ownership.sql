-- Align existing allocations tables with the server DDL without deleting data.
ALTER TABLE allocations ADD COLUMN user_id TEXT;

UPDATE allocations
SET user_id = (
  SELECT p.user_id FROM paychecks p WHERE p.id = allocations.paycheck_id
)
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_allocations_user_id ON allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_paychecks_user_id ON paychecks(user_id);
