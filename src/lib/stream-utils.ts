/**
 * Helper to clean and normalize video streaming URLs (e.g. if user pastes iframe code, video tag, youtube watch link, direct MP4/MKV etc.)
 */
export function cleanStreamUrl(input: string): string {
  if (!input) return "";
  let url = input.trim();

  // If user pasted a video tag or source tag (e.g. <video src="..."></video> or <source src="..." />)
  const videoTagMatch = url.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
  if (videoTagMatch && videoTagMatch[1]) {
    url = videoTagMatch[1].trim();
  }

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
 * Detects if a URL is a direct media source (m3u8 HLS, mp4, mkv, webm, mov, ogg, or direct stream)
 */
export function isDirectMediaUrl(url: string): boolean {
  if (!url) return false;
  const raw = url.trim().toLowerCase();

  // If proxied through our stream proxy
  if (raw.includes("/api/stream-proxy")) {
    try {
      const parsed = new URL(url, "http://localhost:3000");
      const targetUrl = parsed.searchParams.get("url") || "";
      if (targetUrl) {
        return isDirectMediaUrl(targetUrl);
      }
    } catch {
      // ignore
    }
    return true;
  }

  const clean = raw.split("?")[0].split("#")[0];

  // Direct video file extensions (with or without query string, hash, or tokens)
  const hasDirectExt = /\.(mp4|m3u8|mkv|webm|mov|ogg|ts|m4v)(\?|#|$)/i.test(raw);
  if (hasDirectExt) return true;

  return (
    clean.endsWith(".m3u8") ||
    clean.endsWith(".mp4") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".ts") ||
    clean.endsWith(".m4v") ||
    raw.includes(".m3u8") ||
    raw.includes(".mp4?") ||
    raw.includes(".mkv?") ||
    raw.includes(".webm?") ||
    raw.includes("format=m3u8") ||
    raw.includes("mime=video") ||
    raw.includes("type=video") ||
    raw.includes("video/mp4")
  );
}

/**
 * Safely converts insecure HTTP media URLs through our streaming proxy
 * so HTTPS browsers don't block them as Mixed Content.
 */
export function getSafeStreamUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // If already proxied, return as is
  if (trimmed.startsWith("/api/stream-proxy") || trimmed.includes("/api/stream-proxy?url=")) {
    return trimmed;
  }

  // If plain HTTP, route through our streaming proxy to bypass mixed content
  if (trimmed.startsWith("http://")) {
    return `/api/stream-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}
