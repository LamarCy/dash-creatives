// Round-trip test for the hand-written GIF encoder in export.js.
// Writes a GIF with known content; verify_gif.py decodes it with PIL and
// compares every pixel. Run:  node tests/test_gif.mjs && python3 tests/verify_gif.py
import { writeFileSync } from "node:fs";
await import("../export.js");

const W = 61, H = 37;                      // deliberately not multiples of 8
const PALETTE = [[20,20,18],[6,122,118],[9,177,171],[247,243,232]];

// three frames of a pattern that exercises long runs AND high-entropy areas,
// because LZW bugs usually only show up once the code size grows
const frames = [];
for (let f = 0; f < 3; f++) {
  const idx = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = y < H / 3 ? 3                       // flat run
        : y < (2 * H) / 3 ? ((x * 7 + y * 13 + f * 5) % 4)   // noisy
        : (x + f) % 2 ? 1 : 0;                      // alternating
      idx[y * W + x] = v;
    }
  }
  frames.push({ indices: idx });
}

const bytes = globalThis.LCExport.gifBytes(frames, W, H, PALETTE, 120);
writeFileSync(new URL("./out.gif", import.meta.url), bytes);
writeFileSync(new URL("./expected.json", import.meta.url), JSON.stringify({
  w: W, h: H, palette: PALETTE,
  frames: frames.map((f) => Array.from(f.indices)),
}));
console.log(`wrote tests/out.gif (${bytes.length} bytes, ${frames.length} frames)`);
