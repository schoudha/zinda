import { NextRequest, NextResponse } from "next/server";
import { dashboardPeriodLabel } from "@/lib/build-dashboard-goals-context";

type Period = "today" | "week" | "month" | "year";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const period = body?.period as Period | undefined;
    const goalsContext = typeof body?.goalsContext === "string" ? body.goalsContext : "";

    if (!period || !["today", "week", "month", "year"].includes(period)) {
      return NextResponse.json({ error: "period must be today, week, month, or year" }, { status: 400 });
    }

    const periodLabel = dashboardPeriodLabel(period);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    const prompt = `You are a motivational life coach providing personalized daily summaries.

User's goals and progress ${periodLabel}:
${goalsContext.length > 0 ? goalsContext : "No active goals yet."}

Task: Generate a brief, warm, and motivational summary message (2-3 sentences, maximum 100 words) that:
- Acknowledges their progress ${periodLabel}
- Highlights what they're doing well
- Provides gentle encouragement to continue or improve
- Uses a friendly, supportive tone
- References the time period naturally (e.g., "today", "this week", "this month")
- Focuses on the positive and is uplifting

If they have no goals or no progress, encourage them to get started in a warm way.

Provide only the summary message, no additional commentary or formatting.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      console.error("Gemini API error:", error);
      return NextResponse.json({ error: "Failed to get response from Gemini API" }, { status: response.status });
    }

    const data = await response.json();
    const summary =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Keep up the great work ${periodLabel}!`;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Dashboard summary API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
