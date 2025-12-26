import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeBlock } = await request.json();

    if (!timeBlock || !['morning', 'evening', 'night'].includes(timeBlock)) {
      return NextResponse.json(
        { error: 'timeBlock must be one of: morning, evening, night' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    // Extract project ref from URL
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Invalid Supabase URL format' },
        { status: 500 }
      );
    }

    const projectRef = urlMatch[1];
    const functionUrl = `https://${projectRef}.supabase.co/functions/v1/notify-users?testTime=${timeBlock}`;

    // Call the Edge Function with test parameter
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to trigger notifications', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    console.error('Error testing notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

