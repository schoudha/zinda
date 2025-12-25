import { NextRequest, NextResponse } from 'next/server';
import { isYoutubeUrl } from '@/lib/url-utils';

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

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
        const videoId = extractVideoId(url);
        if (!videoId) {
          throw new Error('Could not extract video ID');
        }

        // Fetch the YouTube watch page
        const ytResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        });

        if (!ytResponse.ok) {
          throw new Error(`YouTube request failed: ${ytResponse.status}`);
        }

        const html = await ytResponse.text();
        
        // Extract ytInitialPlayerResponse which contains caption tracks
        // Handle both single-line and multiline JSON - use [\s\S] to match any character including newlines
        let playerResponseMatch = html.match(/var ytInitialPlayerResponse = ([\s\S]+?});/);
        if (!playerResponseMatch) {
          // Try alternative pattern without semicolon (may be at end of script tag)
          playerResponseMatch = html.match(/var ytInitialPlayerResponse = ([\s\S]+?)\s*<\/script>/);
        }
        
        if (!playerResponseMatch) {
          throw new Error('Could not find player response data');
        }

        let playerData;
        try {
          playerData = JSON.parse(playerResponseMatch[1]);
        } catch (parseError) {
          throw new Error('Could not parse player response data');
        }

        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!captions || captions.length === 0) {
          throw new Error('No captions available for this video');
        }

        // Try to find English captions first, otherwise use the first available
        let captionTrack = captions.find((track: { languageCode: string }) => 
          track.languageCode === 'en' || track.languageCode?.startsWith('en')
        ) || captions[0];

        if (!captionTrack?.baseUrl) {
          throw new Error('No valid caption track URL found');
        }

        // Fetch the caption XML
        const captionResponse = await fetch(captionTrack.baseUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
          },
        });

        if (!captionResponse.ok) {
          throw new Error(`Caption fetch failed: ${captionResponse.status}`);
        }

        const captionXml = await captionResponse.text();
        
        // Parse XML to extract text - handle both <text> tags and <transcript> structure
        const textRegex = /<text[^>]*>([^<]+)<\/text>/gi;
        const matches = captionXml.matchAll(textRegex);
        const textParts: string[] = [];
        
        for (const match of matches) {
          const text = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
          if (text) {
            textParts.push(text);
          }
        }

        if (textParts.length === 0) {
          throw new Error('No text found in captions');
        }

        pageContent = textParts.join(' ');
        
        // Limit transcript length
        if (pageContent.length > 20000) {
          pageContent = pageContent.substring(0, 20000);
        }
      } catch (error) {
        console.error('Error fetching YouTube transcript:', error);
        // Fallback to regular summary if transcript fails
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

