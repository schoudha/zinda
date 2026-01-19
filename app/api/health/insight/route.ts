import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { totalMinutes, goalMinutes, period, minutesPerDay } = await request.json();

    if (typeof totalMinutes !== 'number' || typeof goalMinutes !== 'number') {
      return NextResponse.json(
        { error: 'totalMinutes and goalMinutes are required' },
        { status: 400 }
      );
    }

    if (!['today', 'week', 'month', 'year'].includes(period)) {
      return NextResponse.json(
        { error: 'period must be today, week, month, or year' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    const percentage = Math.round((totalMinutes / goalMinutes) * 100);
    const periodLabel = period === "today" ? "today" :
                        period === "week" ? "this week" :
                        period === "month" ? "this month" :
                        "this year";

    // Format minutes for display
    const formatMinutes = (mins: number): string => {
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    const prompt = `
You are a health and fitness coach providing personalized insights.

Context:
- User's exercise time ${periodLabel}: ${formatMinutes(totalMinutes)}
- Goal: ${formatMinutes(goalMinutes)} ${periodLabel}
- Progress: ${percentage}% of goal
- Daily target: ${minutesPerDay || 'not set'} minutes per day

Task: Provide an encouraging, actionable 3-sentence insight about their exercise progress ${periodLabel}.
- First sentence: Acknowledge their current progress with specific numbers
- Second sentence: Provide context or comparison (e.g., how this compares to their goal, trends, or what this means)
- Third sentence: Offer encouragement or a practical tip to maintain or improve
- Reference the time period naturally (e.g., "today", "this week", "this month", "this year")
- Be warm, supportive, and specific to their actual numbers
- Total length should be approximately 3 sentences (around 60-90 words)

Example for good progress: "You've achieved ${formatMinutes(totalMinutes)} of exercise ${periodLabel}, which puts you at ${percentage}% of your goal. This consistent effort shows real dedication to your health journey. Keep up this momentum - you're building a sustainable routine that will benefit you long-term!"

Example for behind: "You're currently at ${formatMinutes(totalMinutes)} ${periodLabel}, which is ${Math.round(goalMinutes - totalMinutes)} minutes away from your goal. Every bit of movement counts, so don't be discouraged. Consider breaking your daily target into smaller chunks - even a 10-minute walk can make a meaningful difference!"

Provide only the insight text, no additional commentary.
`;

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
    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
      'Keep moving towards your health goals!';

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('Health insight API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

