import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const countryHeader =
    req.headers["x-vercel-ip-country"] ||
    req.headers["cf-ipcountry"] ||
    req.headers["x-country-code"] ||
    req.headers["x-appengine-country"];

  const countryCode =
    typeof countryHeader === "string" && countryHeader.length === 2
      ? countryHeader.toUpperCase()
      : null;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(
    JSON.stringify({
      country: countryCode || null,
      detected: Boolean(countryCode),
    }),
  );
}
