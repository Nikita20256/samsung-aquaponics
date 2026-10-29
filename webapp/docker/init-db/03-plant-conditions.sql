-- Also safe to apply to an existing database without changing catalog records.
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS temperature TEXT,
  ADD COLUMN IF NOT EXISTS light TEXT;
