import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';

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
    }) => ({
      id: goal.id,
      text: goal.text,
      period: goal.period as 'week' | 'month' | 'year',
      tips: goal.tips || [],
      createdAt: new Date(goal.created_at),
      userId: goal.user_id || undefined,
      notificationTime: goal.notification_time as 'morning' | 'evening' | 'night' | undefined,
      notificationDays: goal.notification_days as 'everyday' | 'weekday' | 'weekend' | undefined,
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
    const { id, text, period, tips, createdAt } = body;

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

    const { data, error } = await adminClient
      .from('goals')
      .insert({
        id,
        text,
        period,
        tips: tips || [],
        created_at: createdAt || new Date().toISOString(),
      })
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
    const { id, text, period, tips } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (text !== undefined) {
      updateData.text = text;
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

