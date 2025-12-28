ALTER TABLE goals ADD COLUMN IF NOT EXISTS category TEXT;
-- Optional: Update existing goals to have a default category if needed, or leave null
-- UPDATE goals SET category = 'health' WHERE category IS NULL;

