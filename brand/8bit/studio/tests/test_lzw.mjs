// Isolate the LZW compressor: compress a known index stream, decompress it
// with an independent decoder, compare. Localises encoder bugs away from the
// GIF container.
await import("../export.js");
const { gifBytes } = globalThis.LCExport;

function decodeLzw(bytes, minCodeSize, expectPx) {
  const clear = 1 << minCodeSize, eoi = clear + 1;
  let codeSize = minCodeSize + 1, next = eoi + 1;
  let table = [];
  const reset = () => {
    table = [];
    for (let i = 0; i < clear; i++) table[i] = [i];
    table[clear] = null; table[eoi] = null;
    codeSize = minCodeSize + 1; next = eoi + 1;
  };
  reset();
  let acc = 0, accBits = 0, prev = null;
  const out = [];
  for (let bi = 0; bi <= bytes.length; bi++) {
    if (bi < bytes.length) { acc |= bytes[bi] << accBits; accBits += 8; }
    while (accBits >= codeSize) {
      const code = acc & ((1 << codeSize) - 1);
      acc >>>= codeSize; accBits -= codeSize;
      if (code === eoi) return out;
      if (code === clear) { reset(); prev = null; continue; }
      let entry;
      if (table[code]) entry = table[code];
      else if (prev) entry = prev.concat([prev[0]]);
      else throw new Error(`bad code ${code} at px ${out.length}`);
      out.push(...entry);
      if (prev) {
        table[next++] = prev.concat([entry[0]]);
        if (next === (1 << codeSize) && codeSize < 12) codeSize++;
      }
      prev = entry;
      if (out.length > expectPx * 2) throw new Error("runaway");
    }
  }
  return out;
}

// pull the LZW payload back out of the GIF we just wrote
function extractFirstFrame(gif) {
  let i = 13 + 12;                                  // header + LSD + 4-colour table
  while (i < gif.length) {
    if (gif[i] === 0x21) {                          // extension: skip its blocks
      i += 2;
      while (gif[i] !== 0) i += gif[i] + 1;
      i++;
    } else if (gif[i] === 0x2c) {                   // image descriptor
      i += 10;
      const min = gif[i++];
      const data = [];
      while (gif[i] !== 0) { const n = gif[i++]; for (let k = 0; k < n; k++) data.push(gif[i++]); }
      return { min, data };
    } else { i++; }
  }
  throw new Error("no image data found");
}

const W = 61, H = 37;
const idx = new Uint8Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    idx[y * W + x] = y < H / 3 ? 3 : y < (2 * H) / 3 ? (x * 7 + y * 13) % 4 : (x % 2 ? 1 : 0);

const gif = gifBytes([{ indices: idx }], W, H, [[0,0,0],[1,1,1],[2,2,2],[3,3,3]], 120);
const { min, data } = extractFirstFrame(gif);
const back = decodeLzw(data, min, W * H);

console.log(`min code size ${min}, ${data.length} compressed bytes`);
console.log(`decoded ${back.length} px, expected ${W * H}`);
let bad = 0, first = -1;
for (let i = 0; i < Math.min(back.length, idx.length); i++)
  if (back[i] !== idx[i]) { bad++; if (first < 0) first = i; }
if (back.length !== idx.length || bad) {
  console.log(`MISMATCH: ${bad} wrong px, first at ${first}`);
  process.exit(1);
}
console.log("LZW round-trip exact");
