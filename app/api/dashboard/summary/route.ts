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

export async function GET(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    if (!['today', 'week', 'month', 'year'].includes(period)) {
      return NextResponse.json(
        { error: 'period must be today, week, month, or year' },
        { status: 400 }
      );
    }

    // Fetch all goals
    const { data: goalsData, error: goalsError } = await adminClient
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      );
    }

    const goals = goalsData || [];

    // Calculate date range for the period
    const now = new Date();
    let periodStart: Date;
    const periodLabel = period === "today" ? "today" :
                       period === "week" ? "this week" :
                       period === "month" ? "this month" :
                       "this year";

    if (period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      periodStart = new Date(now);
      const dayOfWeek = now.getDay();
      periodStart.setDate(now.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1);
    }

    const periodStartStr = getLocalDateString(periodStart);
    const nowStr = getLocalDateString(now);

    // Fetch progress for the period
    const { data: progressData, error: progressError } = await adminClient
      .from('goal_progress')
      .select('goal_id, progress_value, date')
      .gte('date', periodStartStr)
      .lte('date', nowStr);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    // Build summary of goals and their progress
    const goalsSummary: Array<{
      text: string;
      category: string;
      target?: number;
      progress: number;
      progressPercentage: number;
    }> = [];

    goals.forEach((goal: any) => {
      const goalProgress = (progressData || []).filter((p: any) => p.goal_id === goal.id);
      
      if (period === 'today') {
        const todayProgress = goalProgress.find((p: any) => p.date === nowStr);
        const progressValue = todayProgress ? Number(todayProgress.progress_value) : 0;
        const target = goal.target || goal.minutes_per_day || 100;
        const progressPercentage = target > 0 ? Math.round((progressValue / target) * 100) : 0;
        
        goalsSummary.push({
          text: goal.text,
          category: goal.category || 'general',
          target,
          progress: progressValue,
          progressPercentage,
        });
      } else {
        // For week/month/year, calculate aggregate progress
        // For target-based goals (faith), count days where progress >= target
        // For time-based goals (health), sum up the progress values
        if (goal.target) {
          // Target-based goal (e.g., prayers)
          const completedDays = goalProgress.filter((p: any) => 
            Number(p.progress_value) >= goal.target
          ).length;
          const totalDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const progressPercentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
          
          goalsSummary.push({
            text: goal.text,
            category: goal.category || 'general',
            target: goal.target,
            progress: completedDays,
            progressPercentage,
          });
        } else if (goal.minutes_per_day) {
          // Time-based goal (health)
          const totalProgress = goalProgress.reduce((sum: number, p: any) => 
            sum + Number(p.progress_value), 0
          );
          const daysInPeriod = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const targetTotal = goal.minutes_per_day * (period === 'week' ? 7 : period === 'month' ? 30 : 365);
          const progressPercentage = targetTotal > 0 ? Math.round((totalProgress / targetTotal) * 100) : 0;
          
          goalsSummary.push({
            text: goal.text,
            category: goal.category || 'general',
            target: targetTotal,
            progress: totalProgress,
            progressPercentage,
          });
        } else {
          // Percentage-based goal
          const totalProgress = goalProgress.reduce((sum: number, p: any) => 
            sum + Number(p.progress_value), 0
          );
          const daysInPeriod = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const avgProgress = daysInPeriod > 0 ? totalProgress / daysInPeriod : 0;
          
          goalsSummary.push({
            text: goal.text,
            category: goal.category || 'general',
            progress: avgProgress,
            progressPercentage: Math.round(avgProgress),
          });
        }
      }
    });

    // Generate motivational message using Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    // Build context string for Gemini
    const goalsContext = goalsSummary.map(g => {
      if (g.target) {
        if (g.category === 'faith') {
          return `- ${g.text}: ${g.progress} days completed out of ${period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? '~30' : '365'} (${g.progressPercentage}% of goal)`;
        } else {
          return `- ${g.text}: ${g.progress}/${g.target} (${g.progressPercentage}% of goal)`;
        }
      } else {
        return `- ${g.text}: ${g.progressPercentage}% progress`;
      }
    }).join('\n');

    const prompt = `You are a motivational life coach providing personalized daily summaries.

User's goals and progress ${periodLabel}:
${goalsContext.length > 0 ? goalsContext : 'No active goals yet.'}

Task: Generate a brief, warm, and motivational summary message (2-3 sentences, maximum 100 words) that:
- Acknowledges their progress ${periodLabel}
- Highlights what they're doing well
- Provides gentle encouragement to continue or improve
- Uses a friendly, supportive tone
- References the time period naturally (e.g., "today", "this week", "this month")
- Focuses on the positive and is uplifting

If they have no goals or no progress, encourage them to get started in a warm way.

Provide only the summary message, no additional commentary or formatting.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from Gemini API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
      `Keep up the great work ${periodLabel}!`;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Dashboard summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

