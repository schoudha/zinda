import { NextRequest, NextResponse } from 'next/server';
import { isYoutubeUrl } from '@/lib/url-utils';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, transcript } = await request.json();

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
    const isYoutube = isYoutubeUrl(url);

    // Skip YouTube URLs - transcript fetching is disabled
    if (isYoutube) {
      return NextResponse.json(
        { 
          error: 'Summary generation is not available for YouTube videos at this time.',
          url 
        },
        { status: 400 }
      );
    }

    // If not YouTube, fetch regular page content
    if (!isYoutube && !pageContent) {
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
        } else {
          console.error('Failed to fetch page content:', response.status);
        }
      } catch (error) {
        console.error('Error fetching page content:', error);
      }
    }

    // If we still don't have content, return an error
    if (!pageContent || pageContent.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not extract content from the URL. Please make sure the URL is accessible and contains readable content.',
          url 
        },
        { status: 400 }
      );
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

