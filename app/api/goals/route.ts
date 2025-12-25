import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

// GET - Fetch all goals
export async function GET() {
  try {
    const { data, error } = await supabase
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
    }) => ({
      id: goal.id,
      text: goal.text,
      period: goal.period as 'week' | 'month' | 'year',
      tips: goal.tips || [],
      createdAt: new Date(goal.created_at),
      userId: goal.user_id || undefined,
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
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

