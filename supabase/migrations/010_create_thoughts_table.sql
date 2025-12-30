-- Create thoughts table for daily thoughts
CREATE TABLE IF NOT EXISTS thoughts (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);

-- Create index on date for filtering by day
CREATE INDEX IF NOT EXISTS idx_thoughts_date ON thoughts(date DESC);

