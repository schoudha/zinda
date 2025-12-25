import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import webpush from "npm:web-push@3.6.6";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = "mailto:admin@example.com";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // 1. Determine current "time block" (morning, evening, night) based on UTC time
    // Adjust these based on your target timezone preference or user settings if stored
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Mapping days to our types
    // Weekend: Friday evening (5 > 16:00), Saturday (6), Sunday (0)
    // Weekday: Monday (1) - Friday morning (5 < 16:00)
    
    let timeBlock = null;
    
    // Simple UTC logic (Assuming UTC roughly matches usage or adjusting for offset)
    // Morning: 8 AM UTC
    // Evening: 4 PM UTC (16:00)
    // Night: 7:30 PM UTC (19:00 - rounding to hour for cron)
    
    if (hour === 8) timeBlock = 'morning';
    if (hour === 16) timeBlock = 'evening';
    if (hour === 19) timeBlock = 'night';

    if (!timeBlock) {
       return new Response(JSON.stringify({ message: `No notifications scheduled for hour ${hour}` }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Query goals matching this time block
    const { data: goals, error } = await supabase
      .from('goals')
      .select('id, text, user_id, notification_time, notification_days')
      .eq('notification_time', timeBlock);

    if (error) {
       throw error;
    }

    console.log(`Found ${goals?.length || 0} goals for ${timeBlock}`);

    let sentCount = 0;

    // 3. For each goal, find the user's subscription and send push
    for (const goal of goals || []) {
       // Day logic check
       const isWeekend = day === 0 || day === 6 || (day === 5 && hour >= 16); // Sun, Sat, Fri Evening
       const isWeekday = !isWeekend;

       const goalDays = goal.notification_days;
       
       let shouldNotify = false;
       if (goalDays === 'everyday') shouldNotify = true;
       if (goalDays === 'weekday' && isWeekday) shouldNotify = true;
       if (goalDays === 'weekend' && isWeekend) shouldNotify = true;

       if (!shouldNotify) continue;

       // Fetch subscriptions (in a real app, filter by user_id)
       const { data: subscriptions } = await supabase
         .from('push_subscriptions')
         .select('*');
         // .eq('user_id', goal.user_id) 

       for (const sub of subscriptions || []) {
          try {
             const payload = JSON.stringify({
                title: "Goal Reminder",
                body: `Time for your goal: ${goal.text}`,
                url: `/goals/${goal.id}`
             });
             
             await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
             }, payload);
             sentCount++;
          } catch (e) {
             console.error("Push failed for subscription", sub.id, e);
             // Cleanup invalid subscriptions
             if (e.statusCode === 410 || e.statusCode === 404) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
             }
          }
       }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

