/**
 * Detects URLs in a text string
 * @param text The text to search for URLs
 * @returns Array of found URLs
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Checks if a string contains a URL
 * @param text The text to check
 * @returns True if text contains a URL
 */
export function containsUrl(text: string): boolean {
  return extractUrls(text).length > 0;
}

/**
 * Checks if a URL is a YouTube URL
 * @param url The URL to check
 * @returns True if URL is a YouTube URL
 */
export function isYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}

/**
 * Gets the first URL from text, if any
 * @param text The text to extract URL from
 * @returns The first URL found, or null
 */
export function getFirstUrl(text: string): string | null {
  const urls = extractUrls(text);
  return urls.length > 0 ? urls[0] : null;
}

