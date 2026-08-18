/*
  Tiny zero-dependency static server, so `npm run dev` works with nothing
  installed. Its only real job is making presets.json fetchable — browsers
  block fetch() on file:// URLs, and everything else in the Studio already
  works from a bare file open.

  It serves two roots, in order:
    1. this studio/ directory       (index.html, assets.js, presets.json, ...)
    2. the repo root three levels up (so ../../../web/public/gateway/*.ttf,
       and the Phase 1 scenes/ and sprites/, resolve)

  node serve.mjs [port]
*/
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(ROOT, "..", "..", "..");
const PORT = Number(process.argv[2] || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Confine a resolved path to a root — no ../ escapes. */
function inside(root, path) {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !normalize(rel).startsWith(".."));
}

/**
 * First candidate that is an actual readable FILE wins. The first version of
 * this picked a candidate by prefix and then stat()ed a different one, so it
 * happily returned a path that did not exist — and because the error surfaced
 * asynchronously from createReadStream, it took the whole process down.
 */
async function resolveFile(rel) {
  for (const root of [ROOT, REPO]) {
    const candidate = normalize(join(root, rel));
    if (!inside(root, candidate)) continue;
    try {
      const s = await stat(candidate);
      if (s.isFile()) return candidate;
    } catch {
      /* try the next root */
    }
  }
  return null;
}

createServer(async (req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }
  if (rel === "/" || rel.endsWith("/")) rel += "index.html";

  const file = await resolveFile(rel);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found: " + rel);
    return;
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store",
  });
  const stream = createReadStream(file);
  // stream errors are asynchronous; without this the process exits
  stream.on("error", (e) => {
    console.error("read error", file, e.message);
    res.destroy();
  });
  stream.pipe(res);
}).listen(PORT, () => {
  console.log(`LamarCy World Studio -> http://localhost:${PORT}/`);
  console.log(`  studio root: ${ROOT}`);
  console.log(`  repo root:   ${REPO}`);
  console.log("(Ctrl+C to stop. The app also works by opening index.html directly.)");
});
