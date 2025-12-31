import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth';
import { getExerciseTypeName } from '@/lib/exercise-type-map';
import { isYoutubeUrl } from '@/lib/url-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: goalId } = await params;
    const { message, progressData, healthData, healthSessions, learnNotes, usageStats } = await request.json();

    if (!goalId || !message) {
      return NextResponse.json(
        { error: 'Goal ID and message are required' },
        { status: 400 }
      );
    }

    // 1. Save user message
    const userMessageId = Date.now().toString();
    const { error: userMsgError } = await adminClient
      .from('goal_messages')
      .insert({
        id: userMessageId,
        goal_id: goalId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      });

    if (userMsgError) {
      throw new Error(`Failed to save user message: ${userMsgError.message}`);
    }

    // 2. Fetch goal context
    const { data: goal, error: goalError } = await adminClient
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      throw new Error('Failed to fetch goal context');
    }

    // 3. Fetch recent history (last 10 messages) for context
    const { data: history } = await adminClient
      .from('goal_messages')
      .select('role, content')
      .eq('goal_id', goalId)
      .neq('id', userMessageId) // Exclude current message as we'll add it manually if needed, or api takes it
      .order('created_at', { ascending: false })
      .limit(10);

    // Reverse history to be chronological
    const previousMessages = (history || []).reverse().map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model', // Gemini uses 'model'
      parts: [{ text: msg.content }]
    }));

    // 4. Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    // Build additional context string
    let contextString = '';
    
    // Add progress data if available
    if (progressData) {
      if (goal.category === 'health' && healthData) {
        // Health-specific context
        const { totalMinutes, goalMinutes, period, percentage, periodLabel } = healthData;
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
- Minutes per day target: ${goal.minutes_per_day || 'Not set'}`;
      } else if (progressData.todayProgress !== undefined) {
        // General progress context
        contextString = `
Current Progress:
- Today's progress: ${progressData.todayProgress}${goal.target ? ` out of ${goal.target}` : '%'}`;
        
        if (progressData.completionStats) {
          contextString += `
- Today's completions: ${progressData.completionStats.todayCompletion || 0}${goal.target ? ` out of ${goal.target}` : ''}
- Weekly completed days: ${progressData.completionStats.weeklyCompletedDays || 0} out of 7`;
        }
      }
    }
    
    // Add exercise sessions for health goals
    if (goal.category === 'health' && healthSessions && Array.isArray(healthSessions) && healthSessions.length > 0) {
      contextString += `\n\nExercise Sessions (${healthSessions.length} session${healthSessions.length !== 1 ? 's' : ''}):`;
      healthSessions.forEach((session: any, index: number) => {
        const exerciseName = session.title || getExerciseTypeName(session.exerciseType, session.exerciseTypeValue);
        const date = new Date(session.startTime);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
    
    // Add learn notes (articles and videos) for learn goals
    if (goal.category === 'learn' && learnNotes && Array.isArray(learnNotes) && learnNotes.length > 0) {
      const articles = learnNotes.filter((note: any) => note.url && !isYoutubeUrl(note.url));
      const videos = learnNotes.filter((note: any) => note.url && isYoutubeUrl(note.url));
      
      if (articles.length > 0) {
        contextString += `\n\nArticles to Read (${articles.length}):`;
        articles.forEach((note: any, index: number) => {
          contextString += `\n${index + 1}. ${note.urlTitle || note.text || note.url}`;
          if (note.url) {
            contextString += `\n   - URL: ${note.url}`;
          }
          if (note.summary) {
            contextString += `\n   - Summary: ${note.summary.substring(0, 200)}${note.summary.length > 200 ? '...' : ''}`;
          }
          contextString += `\n   - Status: ${note.checked ? 'Completed' : 'Not completed'}`;
        });
      }
      
      if (videos.length > 0) {
        contextString += `\n\nVideos to Watch (${videos.length}):`;
        videos.forEach((note: any, index: number) => {
          contextString += `\n${index + 1}. ${note.urlTitle || note.text || note.url}`;
          if (note.url) {
            contextString += `\n   - URL: ${note.url}`;
          }
          if (note.summary) {
            contextString += `\n   - Summary: ${note.summary.substring(0, 200)}${note.summary.length > 200 ? '...' : ''}`;
          }
          contextString += `\n   - Status: ${note.checked ? 'Completed' : 'Not completed'}`;
        });
      }
    }
    
    // Add usage stats for screentime/family goals
    if ((goal.category === 'family' || goal.category === 'screentime') && usageStats) {
      const { totalTime, apps, goalMinutes, period, percentage, periodLabel } = usageStats;
      
      // Format total time
      const totalMinutes = Math.floor(totalTime / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const totalTimeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      
      // Format goal time
      const goalHours = Math.floor(goalMinutes / 60);
      const goalMins = goalMinutes % 60;
      const goalTimeFormatted = goalHours > 0 ? `${goalHours}h ${goalMins}m` : `${goalMins}m`;
      
      contextString += `\n\nScreen Time Usage (${periodLabel}):`;
      contextString += `\n- Total Screen Time: ${totalTimeFormatted}`;
      contextString += `\n- Daily Goal Limit: ${goalTimeFormatted}`;
      contextString += `\n- Progress: ${percentage}% of daily limit`;
      
      // Add top apps if available
      if (apps && Array.isArray(apps) && apps.length > 0) {
        const topApps = apps.slice(0, 10); // Top 10 apps
        
        // Helper function to get app name from package name
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
          return pkg.split('.').pop() || pkg;
        };
        
        contextString += `\n\nTop Apps Used (${topApps.length}):`;
        topApps.forEach((app: any, index: number) => {
          const appMinutes = Math.floor(app.timeInForeground / 60000);
          const appHours = Math.floor(appMinutes / 60);
          const appMins = appMinutes % 60;
          const appTimeFormatted = appHours > 0 ? `${appHours}h ${appMins}m` : `${appMins}m`;
          
          const appName = getAppName(app.packageName);
          contextString += `\n${index + 1}. ${appName}: ${appTimeFormatted}`;
        });
      }
    }
    
    // Add goal target/category specific info
    if (goal.target) {
      contextString += `
- Goal target: ${goal.target}`;
    }
    if (goal.minutes_per_day) {
      contextString += `
- Minutes per day target: ${goal.minutes_per_day}`;
    }

    const systemPrompt = `You are a helpful and supportive goal coaching assistant. 
The user has set the following goal: "${goal.text}".
The time period for this goal is: ${goal.period}.
Category: ${goal.category || 'general'}.
Here are the initial tips generated for this goal: ${Array.isArray(goal.tips) ? goal.tips.join('; ') : ''}.${contextString}

Your task is to help the user achieve this goal by answering their questions, providing motivation, breaking down steps, or offering advice.
Keep your responses concise, encouraging, and actionable. Use bold and italics for emphasis where appropriate.
When referencing their progress or stats, use the actual numbers provided above.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            ...previousMessages,
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Failed to get response from AI');
    }

    const aiData = await response.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response at this time.';

    // 5. Save AI response
    const aiMessageId = (Date.now() + 1).toString();
    const { error: aiMsgError } = await adminClient
      .from('goal_messages')
      .insert({
        id: aiMessageId,
        goal_id: goalId,
        role: 'assistant',
        content: aiText,
        created_at: new Date().toISOString(),
      });

    if (aiMsgError) {
      console.error('Failed to save AI message:', aiMsgError);
      // We still return the response even if save failed, though ideally we'd want consistency
    }

    return NextResponse.json({ 
      userMessage: { id: userMessageId, role: 'user', content: message, createdAt: new Date() },
      aiMessage: { id: aiMessageId, role: 'assistant', content: aiText, createdAt: new Date() }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

