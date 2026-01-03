-- Add family phone numbers column to goals table
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS family_phone_numbers TEXT[];

-- Create index on family phone numbers for filtering family goals
CREATE INDEX IF NOT EXISTS idx_goals_family_phone_numbers ON goals USING GIN(family_phone_numbers) 
WHERE family_phone_numbers IS NOT NULL;
