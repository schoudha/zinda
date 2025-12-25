-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('week', 'month', 'year')),
  tips TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);

-- Create index on period for filtering
CREATE INDEX IF NOT EXISTS idx_goals_period ON goals(period);

