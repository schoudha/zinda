import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

// PATCH - Update notification settings for a goal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notificationTime, notificationDays } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (notificationTime !== undefined) {
      if (notificationTime !== null && !['morning', 'evening', 'night'].includes(notificationTime)) {
        return NextResponse.json(
          { error: 'notificationTime must be morning, evening, or night' },
          { status: 400 }
        );
      }
      updateData.notification_time = notificationTime;
    }
    
    if (notificationDays !== undefined) {
      if (notificationDays !== null && !['everyday', 'weekday', 'weekend'].includes(notificationDays)) {
        return NextResponse.json(
          { error: 'notificationDays must be everyday, weekday, or weekend' },
          { status: 400 }
        );
      }
      updateData.notification_days = notificationDays;
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal notifications:', error);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
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
    };

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error in PATCH /api/goals/[id]/notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

