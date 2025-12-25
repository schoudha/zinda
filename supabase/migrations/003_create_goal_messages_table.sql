-- Create goal_messages table
CREATE TABLE IF NOT EXISTS goal_messages (
  id TEXT PRIMARY KEY,
  goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on goal_id for faster queries
CREATE INDEX IF NOT EXISTS idx_goal_messages_goal_id ON goal_messages(goal_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_goal_messages_created_at ON goal_messages(created_at);

