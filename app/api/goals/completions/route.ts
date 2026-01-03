import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';

// Helper function to get local date in YYYY-MM-DD format (timezone-aware)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET - Fetch completion stats for a goal (today's completion and weekly stats)
export async function GET(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');

    if (!goalId) {
      return NextResponse.json(
        { error: 'goalId is required' },
        { status: 400 }
      );
    }

    const today = getLocalDateString(); // YYYY-MM-DD format (local timezone)
    
    // Get today's completion
    const { data: todayData, error: todayError } = await adminClient
      .from('goal_progress')
      .select('progress_value')
      .eq('goal_id', goalId)
      .eq('date', today)
      .single();

    if (todayError && todayError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching today completion:', todayError);
      return NextResponse.json(
        { error: 'Failed to fetch today completion' },
        { status: 500 }
      );
    }

    const todayCompletion = todayData ? Number(todayData.progress_value) : 0;

    // Get weekly stats (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);

    // Get goal target to determine if a day is "completed"
    const { data: goalData, error: goalError } = await adminClient
      .from('goals')
      .select('target')
      .eq('id', goalId)
      .single();

    if (goalError) {
      console.error('Error fetching goal:', goalError);
      return NextResponse.json(
        { error: 'Failed to fetch goal' },
        { status: 500 }
      );
    }

    const target = goalData?.target;
    if (!target) {
      return NextResponse.json({
        todayCompletion: 0,
        weeklyCompletedDays: 0,
        weeklyTotalDays: 7,
      });
    }

    // Get progress for last 7 days
    const { data: weeklyData, error: weeklyError } = await adminClient
      .from('goal_progress')
      .select('date, progress_value')
      .eq('goal_id', goalId)
      .gte('date', sevenDaysAgoStr)
      .lte('date', today);

    if (weeklyError) {
      console.error('Error fetching weekly stats:', weeklyError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly stats' },
        { status: 500 }
      );
    }

    // Count days where progress_value >= target
    const completedDays = (weeklyData || []).filter(
      (item: { progress_value: number }) => Number(item.progress_value) >= target
    ).length;

    return NextResponse.json({
      todayCompletion,
      weeklyCompletedDays: completedDays,
      weeklyTotalDays: 7,
      target,
    });
  } catch (error) {
    console.error('Error in GET /api/goals/completions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Increment completion count for today (up to 3 times per day)
export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId, increment = 1 } = body;

    if (!goalId) {
      return NextResponse.json(
        { error: 'goalId is required' },
        { status: 400 }
      );
    }

    // Get goal target
    const { data: goalData, error: goalError } = await adminClient
      .from('goals')
      .select('target')
      .eq('id', goalId)
      .single();

    if (goalError || !goalData) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    const target = goalData.target;
    if (!target) {
      return NextResponse.json(
        { error: 'Goal does not have a target' },
        { status: 400 }
      );
    }

    const today = getLocalDateString(); // YYYY-MM-DD format (local timezone)
    const progressId = `${goalId}_${today}`;

    // Get current completion
    const { data: currentData } = await adminClient
      .from('goal_progress')
      .select('progress_value')
      .eq('goal_id', goalId)
      .eq('date', today)
      .single();

    const currentCompletion = currentData ? Number(currentData.progress_value) : 0;
    const maxCompletions = Math.min(3, target); // Up to 3 completions per day, or target if less
    const newCompletion = Math.min(maxCompletions, currentCompletion + increment);

    // Upsert completion
    const { data, error } = await adminClient
      .from('goal_progress')
      .upsert({
        id: progressId,
        goal_id: goalId,
        date: today,
        progress_value: newCompletion,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'goal_id,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating completion:', error);
      return NextResponse.json(
        { error: 'Failed to update completion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completion: {
        goalId: data.goal_id,
        date: data.date,
        completionCount: Number(data.progress_value),
        target,
      }
    });
  } catch (error) {
    console.error('Error in POST /api/goals/completions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Set completion count for today
export async function PATCH(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId, completionCount } = body;

    if (!goalId || completionCount === undefined) {
      return NextResponse.json(
        { error: 'goalId and completionCount are required' },
        { status: 400 }
      );
    }

    // Get goal target
    const { data: goalData, error: goalError } = await adminClient
      .from('goals')
      .select('target')
      .eq('id', goalId)
      .single();

    if (goalError || !goalData) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    const target = goalData.target;
    if (!target) {
      return NextResponse.json(
        { error: 'Goal does not have a target' },
        { status: 400 }
      );
    }

    const maxCompletions = Math.min(3, target); // Up to 3 completions per day
    const clampedCount = Math.max(0, Math.min(maxCompletions, Math.floor(completionCount)));

    const today = getLocalDateString(); // YYYY-MM-DD format (local timezone)
    const progressId = `${goalId}_${today}`;

    // Upsert completion
    const { data, error } = await adminClient
      .from('goal_progress')
      .upsert({
        id: progressId,
        goal_id: goalId,
        date: today,
        progress_value: clampedCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'goal_id,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating completion:', error);
      return NextResponse.json(
        { error: 'Failed to update completion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completion: {
        goalId: data.goal_id,
        date: data.date,
        completionCount: Number(data.progress_value),
        target,
      }
    });
  } catch (error) {
    console.error('Error in PATCH /api/goals/completions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

