#!/usr/bin/env node
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SRC = process.argv[2] ?? join(ROOT, 'legacy', 'index.html');
const IMAGES_DIR = process.argv[3] ?? join(ROOT, 'web', 'public', 'images');
const STRIPPED_HTML = process.argv[4] ?? join(ROOT, 'tools', 'index.stripped.html');
const MANIFEST = join(ROOT, 'tools', 'image-manifest.json');

const DATA_URI_RE = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,(.+)$/i;

const EXT_FROM_MIME = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
  'svg+xml': 'svg',
};

function slugify(input) {
  return (input ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Reading ${SRC}…`);
  const html = await readFile(SRC, 'utf8');
  const sizeMB = (Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(1);
  console.log(`  ${sizeMB} MB source HTML`);

  console.log('Parsing…');
  const root = parse(html, { comment: true, blockTextElements: { script: true, style: true } });

  await mkdir(IMAGES_DIR, { recursive: true });

  const imgs = root.querySelectorAll('img');
  console.log(`Found ${imgs.length} <img> elements`);

  // sha1 -> { filename, alt, bytes, mime }
  const bySha = new Map();
  // slug -> count (for collision suffixing)
  const slugCounts = new Map();
  // manifest entries
  const entries = [];

  let dataCount = 0;
  let writtenCount = 0;
  let skippedDuplicates = 0;
  let totalBytes = 0;

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const src = img.getAttribute('src');
    if (!src) continue;
    const m = src.match(DATA_URI_RE);
    if (!m) continue;

    dataCount++;
    const mime = m[1].toLowerCase();
    const ext = EXT_FROM_MIME[mime] ?? mime;
    const base64 = m[2];
    const buf = Buffer.from(base64, 'base64');
    const sha = createHash('sha1').update(buf).digest('hex');

    let filename;
    if (bySha.has(sha)) {
      filename = bySha.get(sha).filename;
      skippedDuplicates++;
    } else {
      const alt = img.getAttribute('alt');
      const dataArtwork = img.getAttribute('data-artwork');
      const baseSlug =
        slugify(alt) ||
        (dataArtwork ? `artwork-${dataArtwork}` : `artwork-${String(i).padStart(3, '0')}`);

      // Resolve slug collisions across DIFFERENT sha1s
      let slug = baseSlug;
      const prior = slugCounts.get(baseSlug) ?? 0;
      if (prior > 0) slug = `${baseSlug}-${prior + 1}`;
      slugCounts.set(baseSlug, prior + 1);

      filename = `${slug}.${ext}`;
      const dest = join(IMAGES_DIR, filename);

      let writeFileFlag = true;
      if (await fileExists(dest)) {
        const existing = await readFile(dest);
        const existingSha = createHash('sha1').update(existing).digest('hex');
        if (existingSha === sha) writeFileFlag = false; // idempotent skip
      }
      if (writeFileFlag) {
        await writeFile(dest, buf);
        writtenCount++;
      }
      totalBytes += buf.length;
      bySha.set(sha, { filename, alt, bytes: buf.length, mime });
    }

    // Rewrite element
    img.setAttribute('src', `/images/${filename}`);
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');

    entries.push({
      index: i,
      dataArtwork: img.getAttribute('data-artwork') ?? null,
      alt: img.getAttribute('alt') ?? null,
      filename,
      sha1: sha,
    });
  }

  console.log(`\n${dataCount} data: images, ${bySha.size} unique, ${skippedDuplicates} duplicates`);
  console.log(`Wrote ${writtenCount} new files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB on disk`);

  // Manifest: keyed by data-artwork id when available
  const byArtwork = {};
  for (const e of entries) {
    if (e.dataArtwork != null && !byArtwork[e.dataArtwork]) {
      byArtwork[e.dataArtwork] = { filename: e.filename, alt: e.alt, sha1: e.sha1 };
    }
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: SRC,
    totalImages: dataCount,
    uniqueImages: bySha.size,
    byArtwork,
    entries,
  };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`Manifest → ${MANIFEST}`);

  await writeFile(STRIPPED_HTML, root.toString());
  const strippedMB = ((await stat(STRIPPED_HTML)).size / 1024).toFixed(1);
  console.log(`Stripped HTML → ${STRIPPED_HTML} (${strippedMB} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
