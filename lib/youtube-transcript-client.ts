/**
 * Client-side YouTube transcript fetcher
 * Uses CORS proxy to bypass server IP blocking
 */

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

/**
 * Fetch YouTube transcript on the client side using CORS proxy
 */
export async function fetchYouTubeTranscript(url: string): Promise<string | null> {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error('Could not extract video ID from URL');
      return null;
    }

    // Use a CORS proxy service to bypass server IP blocking
    // Using allorigins.win as it's free and reliable
    // Note: For production, consider using your own proxy service
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(youtubeUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.error('Proxy request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const html = data.contents;
    
    if (!html) {
      console.error('No HTML content received from proxy');
      return null;
    }
    
    // Extract ytInitialPlayerResponse which contains caption tracks
    // Handle both single-line and multiline JSON
    let playerResponseMatch = html.match(/var ytInitialPlayerResponse = ([\s\S]+?});/);
    if (!playerResponseMatch) {
      // Try alternative pattern without semicolon (may be at end of script tag)
      playerResponseMatch = html.match(/var ytInitialPlayerResponse = ([\s\S]+?)\s*<\/script>/);
    }
    
    if (!playerResponseMatch) {
      console.error('Could not find player response data in HTML');
      return null;
    }
    
    let playerData;
    try {
      playerData = JSON.parse(playerResponseMatch[1]);
    } catch (parseError) {
      console.error('Could not parse player response data:', parseError);
      return null;
    }
    
    const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captions || captions.length === 0) {
      console.error('No captions available for this video');
      return null;
    }
    
    // Try to find English captions first, otherwise use the first available
    const captionTrack = captions.find((track: { languageCode: string }) => 
      track.languageCode === 'en' || track.languageCode?.startsWith('en')
    ) || captions[0];
    
    if (!captionTrack?.baseUrl) {
      console.error('No valid caption track URL found');
      return null;
    }
    
    // Fetch the caption XML (this should work from browser without proxy)
    const captionResponse = await fetch(captionTrack.baseUrl, {
      headers: {
        'Accept': '*/*',
      },
    });
    
    if (!captionResponse.ok) {
      console.error('Caption fetch failed:', captionResponse.status);
      return null;
    }
    
    const captionXml = await captionResponse.text();
    
    // Parse XML to extract text
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
      console.error('No text found in captions');
      return null;
    }
    
    const transcript = textParts.join(' ');
    
    // Limit transcript length
    return transcript.length > 20000 ? transcript.substring(0, 20000) : transcript;
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return null;
  }
}

