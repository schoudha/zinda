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

    // Fetch the page with better headers to avoid blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      // If direct fetch fails, we might try a fallback or just return error
      // But for now, let's return the error so we know what happened
      console.error('Failed to fetch URL:', response.status);
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    
    // Extract title using various methods
    let title: string | null = null;

    // 1. Try standard <title> tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]+?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // 2. Try Open Graph title
    if (!title) {
      const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || 
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogMatch && ogMatch[1]) {
        title = ogMatch[1].trim();
      }
    }

    // 3. Try Twitter title
    if (!title) {
      const twitterMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i);
      if (twitterMatch && twitterMatch[1]) {
        title = twitterMatch[1].trim();
      }
    }

    // 4. Try h1 tag if no meta title found
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]+?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        // Strip nested tags from h1 if any
        title = h1Match[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    // Decode HTML entities
    if (title) {
      title = title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2019;/g, "'")
        .replace(/&#x2018;/g, "'")
        .replace(/&#x2013;/g, "-")
        .replace(/&#x2014;/g, "-")
        .replace(/\s+/g, ' ');
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

