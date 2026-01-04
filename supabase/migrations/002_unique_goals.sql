-- 1. Clean up duplicate FAITH goals (keep most recent)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, category 
           ORDER BY created_at DESC
         ) as row_num
  FROM goals
  WHERE category = 'faith'
)
DELETE FROM goals
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 2. Clean up duplicate SCREENTIME/FAMILY goals (keep most recent)
-- Note: 'family' and 'screentime' are seemingly treated as the same functional bucket in the UI logic,
-- but let's enforce uniqueness per strictly defined category string to be safe.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, category 
           ORDER BY created_at DESC
         ) as row_num
  FROM goals
  WHERE category IN ('screentime', 'family')
)
DELETE FROM goals
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 3. Add Unique Index for Faith Goals
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_unique_faith 
ON goals (user_id, category) 
WHERE category = 'faith';

-- 4. Add Unique Index for Screentime Goals
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_unique_screentime 
ON goals (user_id, category) 
WHERE category = 'screentime';

-- 5. Add Unique Index for Family Goals
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_unique_family 
ON goals (user_id, category) 
WHERE category = 'family';
