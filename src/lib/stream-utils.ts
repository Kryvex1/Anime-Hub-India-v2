/**
 * Helper to clean and normalize video streaming URLs (e.g. if user pastes iframe code, youtube watch link, etc.)
 */
export function cleanStreamUrl(input: string): string {
  if (!input) return "";
  let url = input.trim();

  // If user pasted an iframe embed code (e.g. <iframe src="https://..."></iframe>)
  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1].trim();
  }

  // If user pasted a YouTube watch URL
  const ytWatchMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i,
  );
  if (ytWatchMatch && ytWatchMatch[1]) {
    return `https://www.youtube.com/embed/${ytWatchMatch[1]}?autoplay=1`;
  }

  // If user pasted a YouTube short URL
  const ytShortMatch = url.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (ytShortMatch && ytShortMatch[1]) {
    return `https://www.youtube.com/embed/${ytShortMatch[1]}?autoplay=1`;
  }

  // If user pasted a Dailymotion video URL
  const dmMatch = url.match(/(?:https?:\/\/)?(?:www\.)?dailymotion\.com\/video\/([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
  }

  // Remove trailing and leading quotes if any
  url = url.replace(/^["']|["']$/g, "").trim();

  return url;
}

/**
 * Detects if a URL is a direct media source (m3u8 HLS or mp4/webm file)
 */
export function isDirectMediaUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split("?")[0];
  return (
    clean.endsWith(".m3u8") ||
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mkv") ||
    clean.includes(".m3u8")
  );
}
