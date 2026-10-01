import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import https from "node:https";

interface CustomRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

/**
 * High-performance streaming proxy for HTTP media links:
 * - Bypasses browser HTTPS Mixed-Content blocking for insecure HTTP media sources
 * - Forwards Range requests for seamless video seeking and chunked streaming
 * - Preserves video Content-Type, Content-Range, Content-Length, and Accept-Ranges
 */
export default function handler(req: CustomRequest, res: ServerResponse) {
  try {
    const rawUrl = req.url || "";
    const parsedReq = new URL(rawUrl, `http://${req.headers.host || "localhost:3000"}`);
    const targetUrl =
      parsedReq.searchParams.get("url") ||
      (typeof req.query?.url === "string" ? req.query.url : "");

    if (!targetUrl) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing 'url' parameter" }));
      return;
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid target URL" }));
      return;
    }

    const isTargetHttps = parsedTarget.protocol === "https:";
    const client = isTargetHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range as string;
    }

    const upstreamReq = client.request(
      {
        protocol: parsedTarget.protocol,
        hostname: parsedTarget.hostname,
        port: parsedTarget.port || (isTargetHttps ? 443 : 80),
        path: parsedTarget.pathname + parsedTarget.search,
        method: req.method || "GET",
        headers,
      },
      (upstreamRes) => {
        const statusCode = upstreamRes.statusCode || 200;
        res.statusCode = statusCode;

        const forwardHeaders = [
          "content-type",
          "content-length",
          "content-range",
          "accept-ranges",
          "content-disposition",
          "cache-control",
        ];

        for (const h of forwardHeaders) {
          if (upstreamRes.headers[h]) {
            res.setHeader(h, upstreamRes.headers[h] as string);
          }
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Origin, Accept");

        upstreamRes.pipe(res);
      },
    );

    upstreamReq.on("error", (err) => {
      console.error("Stream proxy upstream connection error:", err);
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to connect to media host: " + err.message }));
      }
    });

    req.on("close", () => {
      upstreamReq.destroy();
    });

    upstreamReq.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: msg }));
    }
  }
}
