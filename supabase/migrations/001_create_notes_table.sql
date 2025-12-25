-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url TEXT,
  url_title TEXT,
  summary TEXT
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Create index on checked_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_notes_checked_at ON notes(checked_at);

