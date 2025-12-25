# Database Setup Instructions

To persist notes in the database, you need to set up Supabase:

## 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

## 2. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from the Supabase dashboard
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Run Database Migration

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/001_create_notes_table.sql`

Or execute this SQL directly:

```sql
-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url TEXT,
  url_title TEXT
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Create index on checked_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_notes_checked_at ON notes(checked_at);
```

## 4. Enable Row Level Security (Optional but Recommended)

If you want to add authentication later, you can enable RLS. For now, the table will work without it for a single-user app.

## Notes

- The app will work without Supabase (notes will be stored in memory), but they will be lost on page reload
- Once Supabase is configured, all notes will be persisted to the database
- The cleanup feature (removing notes checked more than 1 week ago) will also work with the database

