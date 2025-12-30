import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';

// GET - Fetch progress for goals
export async function GET(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    let query = adminClient
      .from('goal_progress')
      .select('goal_id, progress_value, date');

    if (period === 'history') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      query = query.gte('date', oneYearAgo.toISOString().split('T')[0]);
    } else {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      query = query.eq('date', today);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    if (period === 'history') {
      // Return list of all progress records
      return NextResponse.json({ 
        progress: data.map(item => ({
          goalId: item.goal_id,
          progressValue: Number(item.progress_value) || 0,
          date: item.date
        }))
      });
    }

    // Convert to a map for easy lookup (today's progress)
    const progressMap: Record<string, number> = {};
    (data || []).forEach((item: { goal_id: string; progress_value: number }) => {
      progressMap[item.goal_id] = Number(item.progress_value) || 0;
    });

    return NextResponse.json({ progress: progressMap });
  } catch (error) {
    console.error('Error in GET /api/goals/progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update today's progress for a goal
export async function PATCH(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId, progressValue } = body;

    if (!goalId || progressValue === undefined) {
      return NextResponse.json(
        { error: 'goalId and progressValue are required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const progressId = `${goalId}_${today}`;

    // Upsert progress for today
    const { data, error } = await adminClient
      .from('goal_progress')
      .upsert({
        id: progressId,
        goal_id: goalId,
        date: today,
        progress_value: Number(progressValue) || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'goal_id,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: {
        goalId: data.goal_id,
        date: data.date,
        progressValue: Number(data.progress_value),
      }
    });
  } catch (error) {
    console.error('Error in PATCH /api/goals/progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

