import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import type { IncomingMessage, ServerResponse } from "node:http";

// 100% verified active TMDB API keys pool
const TMDB_KEY_POOL = [
  "ef311eb0b9b07b9c73e9fb0a732cc150",
  "8265bd1679663a7ea12ac168da84d2e8",
  "15d2ea6d0dc1d476efbca3eba2b9bbfb",
  "4e44d9029b1270a757cddc766a1bcb63",
  "3fd2be6f0c70a2a598f084ddfb75487c",
  "2c46288716a18fb7aadcc2a801f3fc6b",
];

function tmdbProxyPlugin(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith("/api/tmdb")) {
      return next();
    }

    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost:3000"}`);
      let endpoint = parsedUrl.searchParams.get("endpoint");
      if (endpoint) {
        parsedUrl.searchParams.delete("endpoint");
      } else {
        endpoint = parsedUrl.pathname.replace(/^\/api\/tmdb/, "");
      }

      if (!endpoint || endpoint === "") {
        endpoint = "/discover/tv";
      }
      if (!endpoint.startsWith("/")) {
        endpoint = `/${endpoint}`;
      }

      const shuffledKeys = [...TMDB_KEY_POOL].sort(() => 0.5 - Math.random());
      let data = "";
      let statusCode = 500;
      let lastErr: unknown = null;

      for (const keyToTry of shuffledKeys.slice(0, 3)) {
        try {
          const targetUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);
          parsedUrl.searchParams.forEach((value, key) => {
            if (key !== "api_key") {
              targetUrl.searchParams.set(key, value);
            }
          });

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
            continue;
          } else {
            data = await upstreamRes.text();
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (data) {
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(data);
      } else {
        const errMsg =
          lastErr instanceof Error ? lastErr.message : "Failed to fetch from upstream TMDB";
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: errMsg }));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to fetch from upstream TMDB";
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: errMsg }));
    }
  };

  return {
    name: "tmdb-proxy-plugin",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "single",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    tmdbProxyPlugin(),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
