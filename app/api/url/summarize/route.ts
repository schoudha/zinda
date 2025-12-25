import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { isYoutubeUrl } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
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

    let pageContent = '';
    let isYoutube = isYoutubeUrl(url);

    if (isYoutube) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        pageContent = transcript.map((item: { text: string }) => item.text).join(' ');
        // Limit transcript length if needed, though Gemini Flash handles large context
        if (pageContent.length > 20000) {
            pageContent = pageContent.substring(0, 20000);
        }
      } catch (error) {
        console.error('Error fetching YouTube transcript:', error);
        // Fallback to regular summary if transcript fails (might get metadata)
        isYoutube = false; 
      }
    }

    // If not YouTube or transcript failed, fetch regular page content
    if (!pageContent) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          const html = await response.text();
          // Simple text extraction - remove script and style tags
          pageContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 10000); // Limit to 10k chars
        }
      } catch (error) {
        console.error('Error fetching page content:', error);
      }
    }

    // Call Gemini API to summarize
    let prompt = '';
    
    if (isYoutube && pageContent) {
        prompt = `Please provide a comprehensive summary of this YouTube video transcript in under 500 words. Include the main points, key takeaways, and important details. The content is a transcript, so ignore timestamps or conversational filler:\n\n${pageContent}\n\nVideo URL: ${url}`;
    } else if (pageContent) {
        prompt = `Please provide a comprehensive summary of this webpage content in under 500 words. Include the main points, key takeaways, and important details:\n\n${pageContent}\n\nURL: ${url}`;
    } else {
        prompt = `Please provide a comprehensive summary (under 500 words) of what this URL is about: ${url}`;
    }

    const geminiResponse = await fetch(
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

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: 'Failed to get summary from Gemini API' },
        { status: geminiResponse.status }
      );
    }

    const data = await geminiResponse.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary';

    return NextResponse.json({ summary, url });
  } catch (error) {
    console.error('URL summarize API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

