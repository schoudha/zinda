import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { usage, goals, period } = await request.json();

    if (!usage) {
      return NextResponse.json(
        { error: 'Usage data is required' },
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

    // Format goals for context
    const goalsText = goals && goals.length > 0
      ? goals.map((g: any) => `- ${g.text} (${g.period})`).join('\n')
      : "No specific goals set.";

    // Format top apps
    const topApps = usage.apps
      .slice(0, 5)
      .map((app: any) => `${app.packageName}: ${Math.round(app.timeInForeground / 60000)} mins`)
      .join(', ');

    const totalMinutes = Math.round(usage.totalTime / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeString = `${hours}h ${mins}m`;

    const prompt = `
You are a wellbeing coach.
Context:
- User's goals:
${goalsText}
- Screen time usage for ${period}: ${timeString}
- Top apps: ${topApps}

Task: Provide a SHORT, impactful 1-2 sentence interpretation of this usage. 
Compare the time spent to something productive the user could have done instead (family, work, exercise, reading), specifically linking to their goals if possible. 
If the usage is low/good, praise them. If it's high, gently nudge them.
Keep it under 50 words.
`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Keep focused on your goals!';

    return NextResponse.json({ interpretation: text });
  } catch (error) {
    console.error('Wellbeing interpretation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

