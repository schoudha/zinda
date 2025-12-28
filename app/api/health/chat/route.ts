import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Format conversation history
    const previousMessages = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const systemPrompt = `You are a helpful health and fitness coach. 
The user is tracking their exercise and health data through Health Connect.
Help them understand their progress, provide motivation, suggest improvements, or answer questions about their health and fitness goals.
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

    return NextResponse.json({
      userMessage: {
        role: 'user',
        content: message,
      },
      aiMessage: {
        role: 'assistant',
        content: aiText,
      }
    });
  } catch (error) {
    console.error('Health chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
