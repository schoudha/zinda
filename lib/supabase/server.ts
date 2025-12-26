import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase environment variables are not set. Notes will not persist to database.');
}

// Use service role key for server-side operations (bypasses RLS)
// We export this as 'adminClient' to make it explicit that it bypasses RLS
export const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Deprecated: use adminClient instead
export const supabase = adminClient;
