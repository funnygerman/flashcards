#!/usr/bin/env node
/**
 * Minimal static file server for local development.
 *
 * D4 chose no bundler, so there is no dev server in the toolchain and nothing
 * to bundle — the browser loads the compiled ESM directly. This exists only
 * because `file://` cannot load ES modules or import maps (APP-17.6).
 *
 *   npm run serve            → http://localhost:8000/app/
 *   PORT=3000 npm run serve
 *
 * Deliberately dependency-free. It serves the repository root, so the app at
 * /app/ can reach the built library at /library/dist/.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PORT = Number(process.env.PORT ?? 8000);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".csv": "text/csv; charset=utf-8",
};

/** Resolve a URL path to a file inside ROOT, or null if it escapes ROOT. */
function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const candidate = resolve(join(ROOT, normalize(decoded)));

  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;
  return candidate;
}

const server = createServer(async (req, res) => {
  const target = resolvePath(req.url ?? "/");

  if (!target) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    let file = target;
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");

    const type = MIME[extname(file)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(PORT, () => {
  process.stdout.write(`serving ${ROOT}\n  http://localhost:${PORT}/app/\n`);
});
