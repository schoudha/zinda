-- Create goal_progress table to track daily progress for goals
CREATE TABLE IF NOT EXISTS goal_progress (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  progress_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, date)
);

-- Create index on goal_id for faster queries
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);

-- Create index on date for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);

-- Create index on goal_id and date for efficient lookups
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_date ON goal_progress(goal_id, date);

