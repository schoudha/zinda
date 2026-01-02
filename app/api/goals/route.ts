import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';
import { extractIntegerTarget } from '@/lib/utils';

// GET - Fetch all goals
export async function GET() {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await adminClient
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      );
    }

    // Convert database records to Goal format
    const goals = (data || []).map((goal: {
      id: string;
      text: string;
      period: string;
      tips: string[] | null;
      created_at: string;
      user_id: string | null;
      notification_time: string | null;
      notification_days: string | null;
      target: number | null;
      category: string | null;
      minutes_per_day: number | null;
      screentime_start_hour: number | null;
      screentime_end_hour: number | null;
    }) => ({
      id: goal.id,
      text: goal.text,
      period: goal.period as 'week' | 'month' | 'year',
      tips: goal.tips || [],
      createdAt: new Date(goal.created_at),
      userId: goal.user_id || undefined,
      notificationTime: goal.notification_time as 'morning' | 'evening' | 'night' | undefined,
      notificationDays: goal.notification_days as 'everyday' | 'weekday' | 'weekend' | undefined,
      target: goal.target || undefined,
      category: goal.category as 'health' | 'faith' | 'learn' | 'family' | 'screentime' | undefined,
      minutesPerDay: goal.minutes_per_day || undefined,
      screentimeStartHour: goal.screentime_start_hour || undefined,
      screentimeEndHour: goal.screentime_end_hour || undefined,
    }));

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Error in GET /api/goals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new goal
export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, text, period, tips, createdAt, category, minutesPerDay, target: explicitTarget, screentimeStartHour, screentimeEndHour } = body;

    if (!id || !text || !period) {
      return NextResponse.json(
        { error: 'id, text, and period are required' },
        { status: 400 }
      );
    }

    if (!['week', 'month', 'year'].includes(period)) {
      return NextResponse.json(
        { error: 'period must be week, month, or year' },
        { status: 400 }
      );
    }

    if (category && !['health', 'faith', 'learn', 'family', 'screentime'].includes(category)) {
      return NextResponse.json(
        { error: 'category must be health, faith, learn, family, or screentime' },
        { status: 400 }
      );
    }

    // Determine target: explicit > extracted > default (faith=3)
    let target = explicitTarget;
    if (target === undefined || target === null) {
      target = extractIntegerTarget(text);
    }
    if ((target === undefined || target === null) && category === 'faith') {
      target = 3;
    }

    // Set default time window for screentime goals (6pm-8pm)
    const insertData: Record<string, unknown> = {
      id,
      text,
      period,
      tips: tips || [],
      target: target || null,
      category: category || null,
      minutes_per_day: minutesPerDay && (category === 'health' || category === 'family' || category === 'screentime') ? minutesPerDay : null,
      created_at: createdAt || new Date().toISOString(),
    };
    
    // Set time window defaults for screentime goals
    if (category === 'screentime' || category === 'family') {
      insertData.screentime_start_hour = screentimeStartHour !== undefined ? screentimeStartHour : 18;
      insertData.screentime_end_hour = screentimeEndHour !== undefined ? screentimeEndHour : 20;
    } else if (screentimeStartHour !== undefined || screentimeEndHour !== undefined) {
      insertData.screentime_start_hour = screentimeStartHour || null;
      insertData.screentime_end_hour = screentimeEndHour || null;
    }
    
    const { data, error } = await adminClient
      .from('goals')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json(
        { error: 'Failed to create goal' },
        { status: 500 }
      );
    }

    const goal = {
      id: data.id,
      text: data.text,
      period: data.period as 'week' | 'month' | 'year',
      tips: data.tips || [],
      createdAt: new Date(data.created_at),
      userId: data.user_id || undefined,
      notificationTime: data.notification_time as 'morning' | 'evening' | 'night' | undefined,
      notificationDays: data.notification_days as 'everyday' | 'weekday' | 'weekend' | undefined,
      target: data.target || undefined,
      category: data.category as 'health' | 'faith' | 'learn' | 'family' | undefined,
      minutesPerDay: data.minutes_per_day || undefined,
      screentimeStartHour: data.screentime_start_hour || undefined,
      screentimeEndHour: data.screentime_end_hour || undefined,
    };

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/goals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a goal
export async function PATCH(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, text, period, tips, minutesPerDay, target, screentimeStartHour, screentimeEndHour } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (text !== undefined) {
      updateData.text = text;
      // Only re-extract if target is NOT explicitly provided in this update
      if (target === undefined) {
        const extracted = extractIntegerTarget(text);
        if (extracted) updateData.target = extracted;
      }
    }
    
    if (target !== undefined) {
       updateData.target = target;
    }

    if (period !== undefined) {
      if (!['week', 'month', 'year'].includes(period)) {
        return NextResponse.json(
          { error: 'period must be week, month, or year' },
          { status: 400 }
        );
      }
      updateData.period = period;
    }
    if (tips !== undefined) {
      updateData.tips = tips;
    }
    if (body.category !== undefined) {
      if (body.category !== null && !['health', 'faith', 'learn', 'family'].includes(body.category)) {
        return NextResponse.json(
          { error: 'category must be health, faith, learn, or family' },
          { status: 400 }
        );
      }
      updateData.category = body.category;
    }
    if (body.notificationTime !== undefined) {
      if (body.notificationTime !== null && !['morning', 'evening', 'night'].includes(body.notificationTime)) {
        return NextResponse.json(
          { error: 'notificationTime must be morning, evening, or night' },
          { status: 400 }
        );
      }
      updateData.notification_time = body.notificationTime;
    }
    if (body.notificationDays !== undefined) {
      if (body.notificationDays !== null && !['everyday', 'weekday', 'weekend'].includes(body.notificationDays)) {
        return NextResponse.json(
          { error: 'notificationDays must be everyday, weekday, or weekend' },
          { status: 400 }
        );
      }
      updateData.notification_days = body.notificationDays;
    }
    if (minutesPerDay !== undefined) {
      // Allow minutesPerDay for health, screentime, and family goals
      if (minutesPerDay !== null && (!Number.isInteger(minutesPerDay) || minutesPerDay < 1)) {
        return NextResponse.json(
          { error: 'minutesPerDay must be a positive integer' },
          { status: 400 }
        );
      }
      updateData.minutes_per_day = minutesPerDay;
    }
    if (screentimeStartHour !== undefined) {
      if (screentimeStartHour !== null && (!Number.isInteger(screentimeStartHour) || screentimeStartHour < 0 || screentimeStartHour > 23)) {
        return NextResponse.json(
          { error: 'screentimeStartHour must be an integer between 0 and 23' },
          { status: 400 }
        );
      }
      updateData.screentime_start_hour = screentimeStartHour;
    }
    if (screentimeEndHour !== undefined) {
      if (screentimeEndHour !== null && (!Number.isInteger(screentimeEndHour) || screentimeEndHour < 0 || screentimeEndHour > 23)) {
        return NextResponse.json(
          { error: 'screentimeEndHour must be an integer between 0 and 23' },
          { status: 400 }
        );
      }
      updateData.screentime_end_hour = screentimeEndHour;
    }

    const { data, error } = await adminClient
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal:', error);
      return NextResponse.json(
        { error: 'Failed to update goal' },
        { status: 500 }
      );
    }

    const goal = {
      id: data.id,
      text: data.text,
      period: data.period as 'week' | 'month' | 'year',
      tips: data.tips || [],
      createdAt: new Date(data.created_at),
      userId: data.user_id || undefined,
      notificationTime: data.notification_time as 'morning' | 'evening' | 'night' | undefined,
      notificationDays: data.notification_days as 'everyday' | 'weekday' | 'weekend' | undefined,
      target: data.target || undefined,
      minutesPerDay: data.minutes_per_day || undefined,
      screentimeStartHour: data.screentime_start_hour || undefined,
      screentimeEndHour: data.screentime_end_hour || undefined,
    };

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error in PATCH /api/goals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a goal
export async function DELETE(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting goal:', error);
      return NextResponse.json(
        { error: 'Failed to delete goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/goals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

