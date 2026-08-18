/*
  LamarCy World Studio — exporters. Defines globalThis.LCExport.

  Four paths, all dependency-free:

    png    canvas.toBlob
    gif    a GIF89a encoder written here. Viable because the engine's
           quantise() pass guarantees exactly four colours, so the global
           colour table is 4 entries and the LZW stream codes 2-bit indices.
    webm   MediaRecorder on a canvas stream. Chromium gives WebM reliably;
           MP4 support varies by browser and build, which is why the README
           ships an ffmpeg one-liner instead of pretending otherwise.
    zip    a store-only (uncompressed) ZIP of the PNG frame sequence. PNG is
           already deflated, so a second pass would buy almost nothing, and
           store-only keeps the writer to a few dozen lines.

  If a browser export ever misbehaves, the frame sequence is the bulletproof
  path — see the README.
*/
(function () {
  "use strict";

  // ---- CRC32, shared by PNG-in-ZIP ------------------------------------
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // ---- GIF89a ----------------------------------------------------------
  /**
   * LZW-compress an index stream at the given colour depth, per the GIF spec:
   * variable-width codes, literals pre-seeded in the table, clear code on
   * overflow at 4096.
   *
   * The code-size bump is the subtle part. A DECODER bumps when its table
   * reaches 1 << codeSize — but the decoder adds no entry for the first code
   * after a clear, so its table forever lags the encoder's by one entry. The
   * encoder must therefore bump one entry LATER, at (1 << codeSize) + 1, or
   * the two sides disagree about how wide the next code is.
   *
   * Getting this wrong the obvious way (bumping at 1 << codeSize) produced a
   * stream that decoded to 8 pixels instead of 2257. That is what
   * tests/test_lzw.mjs and tests/test_gif.mjs exist to catch.
   */
  function lzw(indices, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    function freshDict() {
      const d = new Map();
      for (let i = 0; i < clearCode; i++) d.set(String(i), i);
      return d;
    }
    let dict = freshDict();

    const out = [];
    let acc = 0;
    let accBits = 0;

    function emit(code) {
      acc |= code << accBits;
      accBits += codeSize;
      while (accBits >= 8) {
        out.push(acc & 0xff);
        acc >>>= 8;
        accBits -= 8;
      }
    }

    emit(clearCode);

    let prefix = String(indices[0]);
    for (let i = 1; i < indices.length; i++) {
      const k = String(indices[i]);
      const cand = prefix + "," + k;
      if (dict.has(cand)) {
        prefix = cand;
        continue;
      }
      emit(dict.get(prefix));
      if (nextCode < 4096) {
        dict.set(cand, nextCode++);
        if (nextCode === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        dict = freshDict();
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
      }
      prefix = k;
    }
    emit(dict.get(prefix));
    emit(eoiCode);
    if (accBits > 0) out.push(acc & 0xff);
    return out;
  }

  function blocks(bytes) {
    const out = [];
    for (let i = 0; i < bytes.length; i += 255) {
      const chunk = bytes.slice(i, i + 255);
      out.push(chunk.length, ...chunk);
    }
    out.push(0);
    return out;
  }

  /**
   * frames: array of {indices: Uint8Array} at w x h, palette: array of [r,g,b].
   * delayMs: per-frame delay.
   */
  function gifBytes(frames, w, h, palette, delayMs) {
    const bytes = [];
    const push = (...b) => bytes.push(...b);
    const short = (v) => push(v & 0xff, (v >> 8) & 0xff);

    // header + logical screen descriptor
    push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
    short(w);
    short(h);
    // 4-colour global table => size field 1 (2^(1+1) = 4 entries)
    const tableBits = 1;
    push(0x80 | tableBits, 0, 0);
    for (let i = 0; i < 4; i++) {
      const c = palette[i] || [0, 0, 0];
      push(c[0], c[1], c[2]);
    }

    // Netscape looping extension
    push(0x21, 0xff, 0x0b);
    push(...[..."NETSCAPE2.0"].map((ch) => ch.charCodeAt(0)));
    push(0x03, 0x01, 0x00, 0x00, 0x00);

    const delay = Math.max(2, Math.round(delayMs / 10)); // GIF ticks = 10ms
    for (const f of frames) {
      push(0x21, 0xf9, 0x04, 0x04); // graphic control, disposal = background
      short(delay);
      push(0, 0);
      push(0x2c); // image descriptor
      short(0);
      short(0);
      short(w);
      short(h);
      push(0);
      const minCodeSize = 2; // 4 colours
      push(minCodeSize);
      push(...blocks(lzw(f.indices, minCodeSize)));
    }
    push(0x3b); // trailer
    return new Uint8Array(bytes);
  }

  function encodeGif(frames, w, h, palette, delayMs) {
    return new Blob([gifBytes(frames, w, h, palette, delayMs)], {
      type: "image/gif",
    });
  }

  /** Read a rendered canvas back as palette indices for the GIF encoder. */
  function canvasToIndices(canvas, palette) {
    const ctx = canvas.getContext("2d");
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const out = new Uint8Array(canvas.width * canvas.height);
    const key = new Map();
    palette.forEach((c, i) => key.set(c[0] + "," + c[1] + "," + c[2], i));
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const k = d[i] + "," + d[i + 1] + "," + d[i + 2];
      const v = key.get(k);
      out[p] = v === undefined ? 0 : v;
    }
    return out;
  }

  // ---- store-only ZIP --------------------------------------------------
  function encodeZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;

    function u32(v) {
      return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
    }
    function u16(v) {
      return [v & 0xff, (v >> 8) & 0xff];
    }

    for (const f of files) {
      const name = enc.encode(f.name);
      const data = f.data;
      const crc = crc32(data);
      const local = [
        ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0),                      // no timestamp: deterministic
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), ...u16(0),
      ];
      chunks.push(new Uint8Array(local), name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += local.length + name.length + data.length;
    }

    const dir = [];
    for (const c of central) {
      dir.push(
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0),
        ...u32(c.crc), ...u32(c.size), ...u32(c.size),
        ...u16(c.name.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)
      );
      dir.push(...c.name);
    }
    const dirBytes = new Uint8Array(dir);
    const end = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0),
      ...u16(central.length), ...u16(central.length),
      ...u32(dirBytes.length), ...u32(offset), ...u16(0),
    ]);
    return new Blob([...chunks, dirBytes, end], { type: "application/zip" });
  }

  // ---- helpers ---------------------------------------------------------
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function canvasBlob(canvas) {
    return new Promise((res) => canvas.toBlob(res, "image/png"));
  }

  async function blobBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }

  globalThis.LCExport = {
    encodeGif: encodeGif,
    gifBytes: gifBytes,
    canvasToIndices: canvasToIndices,
    encodeZip: encodeZip,
    download: download,
    canvasBlob: canvasBlob,
    blobBytes: blobBytes,
  };
})();
