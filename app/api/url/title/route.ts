import { NextRequest, NextResponse } from 'next/server';
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

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Special handling for YouTube URLs using oEmbed
    if (isYoutubeUrl(url)) {
        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await fetch(oembedUrl);
            if (response.ok) {
                const data = await response.json();
                return NextResponse.json({ 
                    title: data.title || 'YouTube Video', 
                    url 
                });
            }
        } catch (error) {
            console.error('Error fetching YouTube oEmbed:', error);
            // Fallback to regular fetch
        }
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch URL' },
        { status: response.status }
      );
    }

    const html = await response.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Fallback: try to extract from og:title or other meta tags
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitleMatch) {
        return NextResponse.json({ title: ogTitleMatch[1].trim(), url });
      }
    }

    return NextResponse.json({ 
      title: title || 'Untitled Page', 
      url 
    });
  } catch (error) {
    console.error('Error fetching URL title:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

