import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';
import { generateId } from '@/lib/id-utils';

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      faith: false,
      screentime: false,
      learn: false,
    };

    // 1. Ensure Faith Goal (Daily Prayers)
    // First check if it exists
    const { data: faithGoals } = await adminClient
      .from('goals')
      .select('id')
      .eq('category', 'faith')
      .limit(1);

    if (!faithGoals || faithGoals.length === 0) {
      const { error } = await adminClient.from('goals').insert({
        id: generateId(),
        text: 'Daily Prayers',
        period: 'week',
        category: 'faith',
        tips: [],
        target: 3,
        created_at: new Date().toISOString(),
      });
      
      if (!error) results.faith = true;
      else console.error('Error creating default faith goal:', error);
    }

    // 2. Ensure Screentime Goal (Screen Time)
    // Check if duplicate exists (category 'family' or 'screentime')
    const { data: screentimeGoals } = await adminClient
      .from('goals')
      .select('id')
      .in('category', ['family', 'screentime'])
      .limit(1);

    if (!screentimeGoals || screentimeGoals.length === 0) {
      const { error } = await adminClient.from('goals').insert({
        id: generateId(),
        text: 'Screen Time',
        period: 'week',
        category: 'family',
        tips: [],
        minutes_per_day: 150, // 2.5 hours
        created_at: new Date().toISOString(),
      });

      if (!error) results.screentime = true;
      else console.error('Error creating default screentime goal:', error);
    }

    // 3. Ensure Learn Goal (if relevant notes exist)
    const { data: learnGoals } = await adminClient
      .from('goals')
      .select('id')
      .eq('category', 'learn')
      .limit(1);

    if (!learnGoals || learnGoals.length === 0) {
      // Check if we have any notes with URLs
      const { count } = await adminClient
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .not('url', 'is', null);

      if (count && count > 0) {
        const { error } = await adminClient.from('goals').insert({
          id: generateId(),
          text: 'Learn',
          period: 'week',
          category: 'learn',
          tips: [],
          created_at: new Date().toISOString(),
        });

        if (!error) results.learn = true;
        else console.error('Error creating default learn goal:', error);
      }
    }

    return NextResponse.json({ success: true, created: results });
  } catch (error) {
    console.error('Error in POST /api/goals/defaults:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
