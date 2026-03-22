import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getExerciseTypeName } from "@/lib/exercise-type-map";
import { isYoutubeUrl } from "@/lib/url-utils";
import type { ChatContext, Goal } from "@/types";

type GoalPayload = Goal & { minutes_per_day?: number };

function minutesPerDayOf(goal: GoalPayload): number | undefined {
  return goal.minutesPerDay ?? goal.minutes_per_day;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: goalId } = await params;
    const body = await request.json();
    const {
      message,
      goal: rawGoal,
      previousMessages = [],
      progressData,
      healthData,
      healthSessions,
      learnNotes,
      usageStats,
      quote,
    } = body as {
      message?: string;
      goal?: GoalPayload;
      previousMessages?: Array<{ role: string; content: string }>;
    } & ChatContext;

    if (!goalId || !message || typeof message !== "string") {
      return NextResponse.json({ error: "Goal ID and message are required" }, { status: 400 });
    }

    if (!rawGoal || typeof rawGoal.text !== "string") {
      return NextResponse.json({ error: "Goal context is required" }, { status: 400 });
    }

    const goal = rawGoal;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    const geminiHistory = (previousMessages || []).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    let contextString = "";

    if (progressData) {
      if (goal.category === "health" && healthData) {
        const { totalMinutes, goalMinutes, percentage, periodLabel } = healthData;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const totalTimeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        const goalHours = Math.floor(goalMinutes / 60);
        const goalMins = goalMinutes % 60;
        const goalTimeFormatted = goalHours > 0 ? `${goalHours}h ${goalMins}m` : `${goalMins}m`;

        contextString = `
Current Progress (${periodLabel}):
- Total Exercise Time: ${totalTimeFormatted}
- Goal: ${goalTimeFormatted}
- Progress: ${percentage}%
- Minutes per day target: ${minutesPerDayOf(goal) ?? "Not set"}`;
      } else if (progressData.todayProgress !== undefined) {
        contextString = `
Current Progress:
- Today's progress: ${progressData.todayProgress}${goal.target ? ` out of ${goal.target}` : "%"}`;

        if (progressData.completionStats) {
          contextString += `
- Today's completions: ${progressData.completionStats.todayCompletion || 0}${goal.target ? ` out of ${goal.target}` : ""}
- Weekly completed days: ${progressData.completionStats.weeklyCompletedDays || 0} out of 7`;
        }
      }
    }

    if (goal.category === "health" && healthSessions && Array.isArray(healthSessions) && healthSessions.length > 0) {
      contextString += `\n\nExercise Sessions (${healthSessions.length} session${healthSessions.length !== 1 ? "s" : ""}):`;
      healthSessions.forEach((session, index) => {
        const exerciseName = session.title || getExerciseTypeName(session.exerciseType, session.exerciseTypeValue);
        const date = new Date(session.startTime);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        const durationHours = Math.floor(session.durationMinutes / 60);
        const durationMins = session.durationMinutes % 60;
        const durationStr = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins}m`;

        contextString += `\n${index + 1}. ${exerciseName}`;
        contextString += `\n   - Date: ${dateStr} at ${timeStr}`;
        contextString += `\n   - Duration: ${durationStr}`;
        if (session.notes) {
          contextString += `\n   - Notes: ${session.notes}`;
        }
      });
    }

    if (goal.category === "learn" && learnNotes && Array.isArray(learnNotes) && learnNotes.length > 0) {
      const articles = learnNotes.filter((note) => note.url && !isYoutubeUrl(note.url));
      const videos = learnNotes.filter((note) => note.url && isYoutubeUrl(note.url));

      if (articles.length > 0) {
        contextString += `\n\nArticles to Read (${articles.length}):`;
        articles.forEach((note, index) => {
          contextString += `\n${index + 1}. ${note.urlTitle || note.text || note.url}`;
          if (note.url) {
            contextString += `\n   - URL: ${note.url}`;
          }
          if (note.summary) {
            contextString += `\n   - Summary: ${note.summary.substring(0, 200)}${note.summary.length > 200 ? "..." : ""}`;
          }
          contextString += `\n   - Status: ${note.checked ? "Completed" : "Not completed"}`;
        });
      }

      if (videos.length > 0) {
        contextString += `\n\nVideos to Watch (${videos.length}):`;
        videos.forEach((note, index) => {
          contextString += `\n${index + 1}. ${note.urlTitle || note.text || note.url}`;
          if (note.url) {
            contextString += `\n   - URL: ${note.url}`;
          }
          if (note.summary) {
            contextString += `\n   - Summary: ${note.summary.substring(0, 200)}${note.summary.length > 200 ? "..." : ""}`;
          }
          contextString += `\n   - Status: ${note.checked ? "Completed" : "Not completed"}`;
        });
      }
    }

    if ((goal.category === "family" || goal.category === "screentime") && usageStats) {
      const { totalTime, apps, goalMinutes, periodLabel } = usageStats;

      const totalMinutes = Math.floor(totalTime / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const totalTimeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      const goalHours = Math.floor(goalMinutes / 60);
      const goalMins = goalMinutes % 60;
      const goalTimeFormatted = goalHours > 0 ? `${goalHours}h ${goalMins}m` : `${goalMins}m`;

      contextString += `\n\nScreen Time Usage (${periodLabel}):`;
      contextString += `\n- Total Screen Time: ${totalTimeFormatted}`;
      contextString += `\n- Daily Goal Limit: ${goalTimeFormatted}`;
      contextString += `\n- Progress: ${usageStats.percentage}% of daily limit`;

      if (apps && Array.isArray(apps) && apps.length > 0) {
        const topApps = apps.slice(0, 10);

        const getAppName = (pkg: string): string => {
          if (pkg.includes("instagram")) return "Instagram";
          if (pkg.includes("tiktok")) return "TikTok";
          if (pkg.includes("youtube")) return "YouTube";
          if (pkg.includes("facebook")) return "Facebook";
          if (pkg.includes("whatsapp")) return "WhatsApp";
          if (pkg.includes("chrome")) return "Chrome";
          if (pkg.includes("twitter") || pkg.includes("com.twitter.android")) return "X";
          if (pkg.includes("gmail")) return "Gmail";
          if (pkg.includes("netflix")) return "Netflix";
          if (pkg.includes("spotify")) return "Spotify";
          return pkg.split(".").pop() || pkg;
        };

        contextString += `\n\nTop Apps Used (${topApps.length}):`;
        topApps.forEach((app, index) => {
          const appMinutes = Math.floor(app.timeInForeground / 60000);
          const appHours = Math.floor(appMinutes / 60);
          const appMins = appMinutes % 60;
          const appTimeFormatted = appHours > 0 ? `${appHours}h ${appMins}m` : `${appMins}m`;

          const appName = getAppName(app.packageName);
          contextString += `\n${index + 1}. ${appName}: ${appTimeFormatted}`;
        });
      }
    }

    if (quote) {
      contextString += `\n\nCurrent Quran Quote for Inspiration:\n"${quote.english}"\nReference: ${quote.reference}`;
    }

    if (goal.target) {
      contextString += `
- Goal target: ${goal.target}`;
    }
    const mpd = minutesPerDayOf(goal);
    if (mpd) {
      contextString += `
- Minutes per day target: ${mpd}`;
    }

    const tipsLine = Array.isArray(goal.tips) ? goal.tips.join("; ") : "";

    const systemPrompt = `You are a helpful and supportive goal coaching assistant. 
The user has set the following goal: "${goal.text}".
The time period for this goal is: ${goal.period}.
Category: ${goal.category || "general"}.
Here are the initial tips generated for this goal: ${tipsLine}.${contextString}

Your task is to help the user achieve this goal by answering their questions, providing motivation, breaking down steps, or offering advice.
Keep your responses concise, encouraging, and actionable. Use bold and italics for emphasis where appropriate.
When referencing their progress or stats, use the actual numbers provided above.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            ...geminiHistory,
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json({ error: "Failed to get response from AI" }, { status: 500 });
    }

    const aiData = await response.json();
    const aiText =
      aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I apologize, but I could not generate a response at this time.";

    const aiMessageId = randomUUID();

    return NextResponse.json({
      aiText,
      aiMessageId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
