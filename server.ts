import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import config from "./zosite.json";
import { Hono } from "hono";
import { getRecentRegistrations, createRegistration } from "./backend-lib/db";
import apiRoutes from "./src/backend/routes";

type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

/**
 * Add any API routes here.
 */
app.get("/api/hello-zo", (c) => c.json({ msg: "Hello from Zo" }));

// Health check endpoint - required for Cloudflare 520 diagnosis
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: mode,
    service: "neighborgigs",
  });
});

// Event registration endpoints (namespaced under _zo to avoid conflicts)
app.get("/api/_zo/demo/registrations", (c) => {
  const registrations = getRecentRegistrations();
  return c.json(registrations);
});

app.post("/api/_zo/demo/register", async (c) => {
  const body = await c.req.json();
  const { name, email, company, notes } = body;

  if (!name || !email) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const registration = createRegistration(name, email, company, notes);
  return c.json(registration, 201);
});

// Mount NeighborGigs Phase One API routes
app.route("/", apiRoutes);

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

/**
 * Determine port based on mode. In production, use the published_port if available.
 * In development, always use the local_port.
 * Ports are managed by the system and injected via the PORT environment variable.
 */
const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, idleTimeout: 255 };

/**
 * Configure routing for production builds.
 *
 * - Streams prebuilt assets from `dist`.
 * - Static files from `public/` are copied to `dist/` by Vite and served at root paths.
 * - Falls back to `index.html` for any other GET so the SPA router can resolve the request.
 */
function configureProduction(app: Hono) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.get("/favicon.ico", (c) => c.redirect("/favicon.svg", 302));
  app.use(async (c, next) => {
    if (c.req.method !== "GET") return next();

    const path = c.req.path;
    if (path.startsWith("/api/") || path.startsWith("/assets/")) return next();

    const file = Bun.file(`./dist${path}`);
    if (await file.exists()) {
      const stat = await file.stat();
      if (stat && !stat.isDirectory()) {
        return new Response(file);
      }
    }

    return serveStatic({ path: "./dist/index.html" })(c, next);
  });
}

/**
 * Configure routing for development builds.
 *
 * - Boots Vite in middleware mode for transforms.
 * - Static files from `public/` are served at root paths (matching Vite convention).
 * - Mirrors production routing semantics so SPA routes behave consistently.
 */
async function configureDevelopment(app: Hono): Promise<ViteDevServer | null> {
  // In development, frontend is served by separate Vite dev server
  // This server only handles API routes

  // Set up proxy to Vite for SPA routes during development
  // This ensures index.html is served for all non-API routes
  app.on(["GET", "HEAD"], "*", async (c, next) => {
    // Only handle requests for non-API paths
    if (c.req.path.startsWith("/api/")) return next();

    // For SPA routes in development, proxy to Vite dev server
    try {
      // Fetch from Vite dev server (running on different port)
      const vitePort = process.env.VITE_PORT || "3000";
      
      // Normalize HEAD → GET for Vite (the core fix)
      const method = c.req.method === "HEAD" ? "GET" : c.req.method;
      
      // Use the normalized method when fetching from Vite
      const viteUrl = `http://localhost:${vitePort}${c.req.path}`;
      const response = await fetch(viteUrl, { method });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        const headers: Record<string, string> = { "Cache-Control": "no-cache" };
        if (contentType) {
          headers["Content-Type"] = contentType;
        }
        
        // When returning to client, respect the original HEAD request
        // and return no body (that's the whole point of HEAD)
        if (c.req.method === "HEAD") {
          // For HEAD requests, we need to get the content-length from Vite
          // but return no body
          const body = await response.text();
          headers["Content-Length"] = body.length.toString();
          
          return new Response(null, {
            status: response.status,
            headers,
          });
        }
        
        // For GET requests, proxy the full body
        const body = await response.text();
        
        return new Response(body, {
          status: response.status,
          headers,
        });
      }
    } catch (e) {
      // If Vite isn't running, serve a helpful error
      console.error("Vite dev server not accessible:", e);
      return c.html(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vite Dev Server Not Running</title>
          </head>
          <body>
            <div style="padding: 40px; font-size: 16px; font-family: system-ui;">
              <h1>Vite Dev Server Not Running</h1>
              <p>Please start Vite in a separate terminal:</p>
              <pre style="background: #f4f4f4; padding: 12px; border-radius: 4px;">bunx vite --host --port 3000</pre>
              <p>Or check that the server is running on port 3000.</p>
            </div>
          </body>
        </html>
      `);
    }

    return next();
  });

  return null;
}
