import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 is the error code when no rows are returned
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Goal not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching goal:', error);
      return NextResponse.json(
        { error: 'Failed to fetch goal' },
        { status: 500 }
      );
    }

    const goal = {
      id: data.id,
      text: data.text,
      period: data.period,
      tips: data.tips || [],
      createdAt: new Date(data.created_at),
      userId: data.user_id || undefined,
      notificationTime: data.notification_time as 'morning' | 'evening' | 'night' | undefined,
      notificationDays: data.notification_days as 'everyday' | 'weekday' | 'weekend' | undefined,
      target: data.target || undefined,
      category: data.category as 'health' | 'faith' | 'learn' | 'family' | undefined,
      minutesPerDay: data.minutes_per_day || undefined,
    };

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error in GET /api/goals/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

