-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the notification function to run every hour
-- IMPORTANT: Replace the following placeholders before running:
-- 1. YOUR_PROJECT_REF with your Supabase project reference (found in your project URL)
-- 2. YOUR_SERVICE_ROLE_KEY with your Supabase service role key (from Project Settings > API)

-- To find your project reference: Check your Supabase project URL
-- Example: https://abcdefghijklmnop.supabase.co -> project_ref is "abcdefghijklmnop"
--
-- To find your service role key: Go to Supabase Dashboard > Project Settings > API > service_role key

SELECT cron.schedule(
  'notify-users-hourly',
  '0 * * * *', -- Runs every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

