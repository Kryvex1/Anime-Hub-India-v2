import type { IncomingMessage, ServerResponse } from "node:http";

interface CustomRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

// 100% verified active TMDB API keys pool
const TMDB_KEY_POOL = [
  "ef311eb0b9b07b9c73e9fb0a732cc150",
  "8265bd1679663a7ea12ac168da84d2e8",
  "15d2ea6d0dc1d476efbca3eba2b9bbfb",
  "4e44d9029b1270a757cddc766a1bcb63",
  "3fd2be6f0c70a2a598f084ddfb75487c",
  "2c46288716a18fb7aadcc2a801f3fc6b",
];

export default async function handler(req: CustomRequest, res: ServerResponse) {
  try {
    const query = req.query || {};
    let endpoint = (typeof query.endpoint === "string" ? query.endpoint : "") || "";
    if (!endpoint) {
      const pathOnly = req.url?.replace(/^\/api\/tmdb/, "").split("?")[0] || "";
      endpoint = pathOnly;
    }

    if (!endpoint.startsWith("/")) {
      endpoint = `/${endpoint}`;
    }

    // Try up to 3 keys if upstream fails with 401 or 429
    let lastError: unknown = null;
    let data = "";
    let statusCode = 500;

    const shuffledKeys = [...TMDB_KEY_POOL].sort(() => 0.5 - Math.random());

    for (const keyToTry of shuffledKeys.slice(0, 3)) {
      try {
        const targetUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);

        for (const [key, value] of Object.entries(query)) {
          if (key !== "endpoint" && key !== "api_key" && value !== undefined) {
            targetUrl.searchParams.set(key, String(value));
          }
        }

        const apiKey = process.env.TMDB_API_KEY || keyToTry;
        targetUrl.searchParams.set("api_key", apiKey);

        const upstreamRes = await fetch(targetUrl.toString(), {
          headers: {
            Accept: "application/json",
            "User-Agent": "CineAnimeHub/1.0",
          },
        });

        statusCode = upstreamRes.status;
        if (upstreamRes.ok) {
          data = await upstreamRes.text();
          break;
        } else if (upstreamRes.status === 401 || upstreamRes.status === 429) {
          // Retry with next key
          continue;
        } else {
          data = await upstreamRes.text();
          break;
        }
      } catch (fetchErr) {
        lastError = fetchErr;
      }
    }

    if (data) {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(data);
    } else {
      const msg = lastError instanceof Error ? lastError.message : "TMDB Proxy Upstream Error";
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: msg }));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "TMDB Proxy Error";
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: msg }));
  }
}
