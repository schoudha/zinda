-- Add notification fields to goals table
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS notification_time TEXT CHECK (notification_time IN ('morning', 'evening', 'night')),
ADD COLUMN IF NOT EXISTS notification_days TEXT CHECK (notification_days IN ('everyday', 'weekday', 'weekend'));

-- Create index on notification fields for filtering
CREATE INDEX IF NOT EXISTS idx_goals_notification_time ON goals(notification_time);
CREATE INDEX IF NOT EXISTS idx_goals_notification_days ON goals(notification_days);

