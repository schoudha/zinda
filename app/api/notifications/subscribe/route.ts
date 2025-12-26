import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // Upsert subscription
    const { error } = await adminClient
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        last_used: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/notifications/subscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

