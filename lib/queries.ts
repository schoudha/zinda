import { adminClient } from '@/lib/supabase/server';
import { Goal, Note } from '@/types';

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await adminClient
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
    return [];
  }

  return (data || []).map((goal: any) => ({
    id: goal.id,
    text: goal.text,
    period: goal.period as 'week' | 'month' | 'year',
    tips: goal.tips || [],
    createdAt: new Date(goal.created_at),
    userId: goal.user_id || undefined,
    notificationTime: goal.notification_time as 'morning' | 'evening' | 'night' | undefined,
    notificationDays: goal.notification_days as 'everyday' | 'weekday' | 'weekend' | undefined,
  }));
}

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await adminClient
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }

  return (data || []).map((note: any) => ({
    id: note.id,
    text: note.text,
    checked: note.checked || false,
    checkedAt: note.checked_at ? new Date(note.checked_at) : null,
    createdAt: new Date(note.created_at),
    url: note.url || undefined,
    urlTitle: note.url_title || undefined,
    summary: note.summary || undefined,
  }));
}

