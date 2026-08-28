import { readSiteData } from "./storage/weather-db";

const port = Number(process.env.API_PORT ?? 3100);

export const server = Bun.serve({
  port,
  routes: {
    "/health": Response.json({ ok: true }),
    "/api/site-data": () => Response.json(readSiteData(), {
      headers: { "cache-control": "no-store" },
    }),
  },
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(`[server] Mausam data API listening on ${server.url}`);
