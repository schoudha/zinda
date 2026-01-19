import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';

// GET - Fetch all thoughts
export async function GET(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await adminClient
      .from('thoughts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching thoughts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch thoughts' },
        { status: 500 }
      );
    }

    // Convert database records to Thought format
    const thoughts = (data || []).map((thought: {
      id: string;
      text: string;
      created_at: string;
      date: string;
    }) => ({
      id: thought.id,
      text: thought.text,
      createdAt: new Date(thought.created_at),
      date: thought.date,
    }));

    return NextResponse.json({ thoughts });
  } catch (error) {
    console.error('Error in GET /api/thoughts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new thought
export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, text, createdAt, date } = body;

    if (!id || !text) {
      return NextResponse.json(
        { error: 'id and text are required' },
        { status: 400 }
      );
    }

    // Use provided date or default to today
    const thoughtDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await adminClient
      .from('thoughts')
      .insert({
        id,
        text,
        created_at: createdAt || new Date().toISOString(),
        date: thoughtDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating thought:', error);
      return NextResponse.json(
        { error: 'Failed to create thought' },
        { status: 500 }
      );
    }

    const thought = {
      id: data.id,
      text: data.text,
      createdAt: new Date(data.created_at),
      date: data.date,
    };

    return NextResponse.json({ thought }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/thoughts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

