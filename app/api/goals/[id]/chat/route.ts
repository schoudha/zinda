import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params;
    const { message } = await request.json();

    if (!goalId || !message) {
      return NextResponse.json(
        { error: 'Goal ID and message are required' },
        { status: 400 }
      );
    }

    // 1. Save user message
    const userMessageId = Date.now().toString();
    const { error: userMsgError } = await supabase
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
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      throw new Error('Failed to fetch goal context');
    }

    // 3. Fetch recent history (last 10 messages) for context
    const { data: history } = await supabase
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

    const systemPrompt = `You are a helpful and supportive goal coaching assistant. 
The user has set the following goal: "${goal.text}".
The time period for this goal is: ${goal.period}.
Here are the initial tips generated for this goal: ${Array.isArray(goal.tips) ? goal.tips.join('; ') : ''}.

Your task is to help the user achieve this goal by answering their questions, providing motivation, breaking down steps, or offering advice.
Keep your responses concise, encouraging, and actionable. Use bold and italics for emphasis where appropriate.`;

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
    const { error: aiMsgError } = await supabase
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

