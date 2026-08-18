/*
  LamarCy World Studio — rendering engine.

  Plain script, no modules, no build step, no dependencies. Defines
  globalThis.LCEngine. Loaded by index.html (the app) and render.html (the
  headless renderer the CLI drives), so there is exactly one renderer.

  THE FIVE BRAND RULES ARE ENFORCED HERE, NOT IN THE UI:

  1. Integer scaling, nearest-neighbour only. The scene and sprites are
     composited into an INDEXED buffer at native resolution (270x480, 270x270
     or 480x270) and then blown up by exactly 4x. imageSmoothingEnabled is
     false on every context. There is no code path that scales by a
     non-integer.

  2. Only the four active ramp values are ever drawn. Guaranteed by a final
     quantise() pass that snaps every pixel to the nearest ramp colour. That
     pass exists because the browser antialiases text: without it, Anton
     edges would introduce dozens of in-between colours. It also means no
     accidental blend anywhere can survive to the export.

  3. One heart mark maximum — see addHeart().

  4. Anton, Oswald and monospace only. FONTS below is the whole vocabulary;
     the UI has no font field.

  5. No gradients, no glow, no blur. Nothing in this file calls
     createLinearGradient, createRadialGradient, shadowBlur or filter. The
     halftone "density" control varies DOT SIZE, not alpha — see texture().
     Alpha blending would manufacture a fifth colour, which rule 2 forbids.
*/
(function () {
  "use strict";

  const A = () => globalThis.LC_ASSETS;

  const FONTS = {
    title: '"Anton", "Anton Fallback", Impact, sans-serif',
    subtitle: '"Oswald", "Oswald Fallback", Arial, sans-serif',
    stamp: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
  };

  // ---- packed-grid decoding -------------------------------------------
  // assets.js stores each grid as run-length-encoded rows plus a table of
  // unique rows. Decoded lazily and cached, because the same sprite is drawn
  // many times per animation.
  const cache = new Map();

  function unpack(packed, key) {
    if (cache.has(key)) return cache.get(key);
    const rows = new Array(packed.h);
    const decoded = packed.t.map((enc) => {
      let out = "";
      const re = /(\d+)(.)/g;
      let m;
      while ((m = re.exec(enc))) out += m[2].repeat(+m[1]);
      return out;
    });
    for (let y = 0; y < packed.h; y++) rows[y] = decoded[packed.r[y]];
    const grid = { w: packed.w, h: packed.h, rows };
    cache.set(key, grid);
    return grid;
  }

  function spriteGrid(kind, pose) {
    const p = A().sprites[kind][pose];
    return p ? unpack(p, kind + "/" + pose) : null;
  }

  function layerGrid(scene, format, layer) {
    const p = A().scenes[scene][format].layers[layer];
    return p ? unpack(p, scene + "/" + format + "/" + layer) : null;
  }

  // ---- indexed native buffer ------------------------------------------
  // Values are indices into ".KDTC": 0 transparent, 1 ink, 2 deep teal,
  // 3 tiffany, 4 light (cream or harbor sepia).
  const CODE_INDEX = { ".": 0, K: 1, D: 2, T: 3, C: 4 };

  function makeBuffer(w, h) {
    return { w: w, h: h, px: new Uint8Array(w * h) };
  }

  function fillBuffer(buf, idx) {
    buf.px.fill(idx);
  }

  /** Stamp a grid, wrapping horizontally. dx may be any integer. */
  function blit(buf, grid, dx, dy, opts) {
    opts = opts || {};
    const flip = !!opts.flip;
    const scale = opts.scale || 1;
    const wrap = !!opts.wrap;
    for (let gy = 0; gy < grid.h; gy++) {
      const row = grid.rows[gy];
      for (let sy = 0; sy < scale; sy++) {
        const ty = dy + gy * scale + sy;
        if (ty < 0 || ty >= buf.h) continue;
        const rowBase = ty * buf.w;
        for (let gx = 0; gx < grid.w; gx++) {
          const code = row[flip ? grid.w - 1 - gx : gx];
          if (code === ".") continue;
          const idx = CODE_INDEX[code];
          for (let sx = 0; sx < scale; sx++) {
            let tx = dx + gx * scale + sx;
            if (wrap) {
              tx = ((tx % buf.w) + buf.w) % buf.w;
            } else if (tx < 0 || tx >= buf.w) {
              continue;
            }
            buf.px[rowBase + tx] = idx;
          }
        }
      }
    }
  }

  // ---- scene ----------------------------------------------------------
  function drawScene(buf, state, frame) {
    const scene = state.scene;
    if (scene === "blank-cream") return fillBuffer(buf, 4);
    if (scene === "blank-ink") return fillBuffer(buf, 1);

    // an imported photograph, halftoned, used as a full-bleed backdrop
    if (scene.startsWith("photo:")) {
      const id = scene.slice(6);
      const meta = (state.photos && state.photos[id]) || {};
      const grid = ditherToGrid(id, buf.w, buf.h, state.ramp,
        { tone: meta.tone, screen: meta.screen });
      if (grid) blit(buf, grid, 0, 0, {});
      else fillBuffer(buf, 4);
      return;
    }

    const layers = A().sceneLayers[scene] || [];
    const par = A().parallax;
    for (const name of layers) {
      const grid = layerGrid(scene, state.format, name);
      if (!grid) continue;
      let dx = 0;
      if (state.parallax && state.parallax.on) {
        const speed = par[name] || 1;
        dx = -Math.round(frame * speed * (state.parallax.speed || 1));
      }
      const manual = (state.parallax && state.parallax.offsets) || {};
      dx += Math.round(manual[name] || 0);
      blit(buf, grid, dx, 0, { wrap: true });
    }
  }

  // ---- sprites --------------------------------------------------------
  const WALK = ["walk1", "walk2", "walk3", "walk4"];
  const SWIM = ["swim1", "swim2", "swim3", "swim4"];

  function poseFor(sp, frame) {
    if (!sp.animate) return sp.pose;
    const cycle = sp.kind === "lamarcy" ? WALK : SWIM;
    if (!cycle.includes(sp.pose) && sp.pose !== "walk" && sp.pose !== "swim") {
      return sp.pose; // idle / play / breach do not animate
    }
    return cycle[Math.floor(frame / 3) % 4];
  }

  // Positions are stored as PERCENTAGES of the canvas, not pixels, so a
  // preset composed in 9:16 still lands sensibly in 1:1 and 16:9. Percentages
  // are converted and rounded to whole native pixels here, which keeps every
  // sprite on the pixel grid (rule 1).
  function pctToPx(pct, extent) {
    return Math.round(((pct || 0) / 100) * extent);
  }

  function drawSprites(buf, state, frame) {
    const list = (state.sprites || []).slice();
    list.sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const sp of list) {
      let grid;
      if (sp.kind === "photo") {
        // panels are dithered small then blown up by an integer factor, so the
        // dots stay chunky instead of turning into fine grain
        const meta = (state.photos && state.photos[sp.photoId]) || {};
        const base = Math.max(16, Math.min(160, Math.round(sp.base || 56)));
        const ar = meta.ar || 1;
        const pw = ar >= 1 ? base : Math.round(base * ar);
        const ph = ar >= 1 ? Math.round(base / ar) : base;
        grid = ditherToGrid(sp.photoId, pw, ph, state.ramp,
          { tone: meta.tone, screen: meta.screen });
      } else {
        grid = spriteGrid(sp.kind, poseFor(sp, frame));
      }
      if (!grid) continue;
      // scale is clamped to an integer 1..8 — rule 1
      const scale = Math.max(1, Math.min(8, Math.round(sp.scale || 1)));
      blit(buf, grid, pctToPx(sp.x, buf.w), pctToPx(sp.y, buf.h), {
        scale: scale,
        flip: !!sp.flip,
      });
    }
  }

  function drawHeart(buf, state) {
    if (!state.heart || !state.heart.on) return;
    const grid = unpack(A().sprites.heart, "heart");
    const scale = Math.max(1, Math.min(8, Math.round(state.heart.scale || 2)));
    blit(buf, grid, pctToPx(state.heart.x, buf.w), pctToPx(state.heart.y, buf.h), {
      scale: scale,
    });
  }


  // ---- photographs ------------------------------------------------------
  /*
    Durrell's own frames, reduced to the four-value ramp on the way in. A
    photograph has thousands of colours; rule 2 allows four. So the import
    path is a genuine halftone screen, not a paste.

    The screen is CLUSTERED-DOT, built by ordering each cell's pixels by
    distance from its centre, so as a tone darkens the dot grows outward from
    the middle. That is what makes it read as Ben-Day rather than as the
    scattered noise a Bayer/dispersed matrix would give. Alternate cell rows
    are staggered half a cell so the dots sit on a diagonal lattice, the same
    way the scene's sky dots do.

    Tones are matched against the ramp's ACTUAL luminances (ink .08, deep
    teal .38, tiffany .55, cream .95) rather than four equal steps — the ramp
    is not evenly spaced, and pretending otherwise crushes the midtones.
  */
  const screenCache = new Map();

  function halftoneScreen(n) {
    if (screenCache.has(n)) return screenCache.get(n);
    const c = (n - 1) / 2;
    const cells = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - c;
        const dy = y - c;
        // tiny bias breaks ties deterministically so the dot grows smoothly
        cells.push({ x: x, y: y, d: dx * dx + dy * dy + x * 0.001 + y * 0.0007 });
      }
    }
    cells.sort((a, b) => a.d - b.d);
    const m = Array.from({ length: n }, () => new Array(n));
    cells.forEach((cell, i) => { m[cell.y][cell.x] = (i + 0.5) / (n * n); });
    screenCache.set(n, m);
    return m;
  }

  function luminance(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  const photos = new Map();          // id -> HTMLImageElement
  const gridCache = new Map();       // id|w|h|ramp|tone|screen -> grid

  function registerPhoto(id, img) {
    photos.set(id, img);
    for (const k of [...gridCache.keys()]) {
      if (k.startsWith(id + "|")) gridCache.delete(k);
    }
  }

  function hasPhoto(id) {
    return photos.has(id);
  }

  /** Cover-fit, auto-level, then halftone into a 4-value grid. */
  function ditherToGrid(id, w, h, rampName, opts) {
    opts = opts || {};
    const tone = opts.tone == null ? 0 : opts.tone;
    const n = Math.max(2, Math.min(10, Math.round(opts.screen || 6)));
    const key = [id, w, h, rampName, tone, n].join("|");
    if (gridCache.has(key)) return gridCache.get(key);

    const img = photos.get(id);
    if (!img || !img.width) return null;

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    // cover-fit with a centre crop
    const k = Math.max(w / img.width, h / img.height);
    const dw = img.width * k;
    const dh = img.height * k;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const d = ctx.getImageData(0, 0, w, h).data;

    // luminance pass + auto-levels on the 2nd..98th percentile, or photos
    // land muddy once they are squeezed into four values
    const lums = new Float32Array(w * h);
    const hist = new Uint32Array(256);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const L = luminance(d[i], d[i + 1], d[i + 2]);
      lums[p] = L;
      hist[Math.min(255, Math.round(L * 255))]++;
    }
    const total = w * h;
    let lo = 0;
    let hi = 255;
    let acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.02) { lo = i / 255; break; } }
    acc = 0;
    for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.02) { hi = i / 255; break; } }
    const span = Math.max(0.05, hi - lo);

    const rampLum = A().ramps[rampName].map((hex) => {
      const rgb = hexToRgb(hex);
      return luminance(rgb[0], rgb[1], rgb[2]);
    });
    const M = halftoneScreen(n);
    const CODES = ["K", "D", "T", "C"];

    const rows = new Array(h);
    for (let y = 0; y < h; y++) {
      const stagger = (Math.floor(y / n) % 2) * (n >> 1);
      let row = "";
      for (let x = 0; x < w; x++) {
        let L = (lums[y * w + x] - lo) / span + tone;
        L = L < 0 ? 0 : L > 1 ? 1 : L;
        // find which pair of ramp values this tone falls between
        let i = 0;
        while (i < 2 && L > rampLum[i + 1]) i++;
        const a = rampLum[i];
        const b = rampLum[i + 1];
        const frac = b > a ? (L - a) / (b - a) : 0;
        const t = M[y % n][(x + stagger) % n];
        row += CODES[frac > t ? i + 1 : i];
      }
      rows[y] = row;
    }
    const grid = { w: w, h: h, rows: rows };
    gridCache.set(key, grid);
    return grid;
  }

  // ---- indexed buffer -> canvas --------------------------------------
  function bufferToCanvas(buf, ramp) {
    const colors = A().ramps[ramp].map(hexToRgb);
    const c = document.createElement("canvas");
    c.width = buf.w;
    c.height = buf.h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(buf.w, buf.h);
    const d = img.data;
    for (let i = 0; i < buf.px.length; i++) {
      const idx = buf.px[i];
      const o = i * 4;
      if (idx === 0) {
        d[o + 3] = 0;
        continue;
      }
      const rgb = colors[idx - 1];
      d[o] = rgb[0];
      d[o + 1] = rgb[1];
      d[o + 2] = rgb[2];
      d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function hexToRgb(h) {
    return [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
  }

  // ---- halftone texture ----------------------------------------------
  // Ben-Day dots. `density` (0..1) drives DOT RADIUS, never alpha: alpha
  // would blend a fifth colour into the output and rule 2 forbids it.
  function texture(ctx, state, W, H) {
    const t = state.texture;
    if (!t || !t.on) return;
    const pitch = Math.max(4, Math.round(t.pitch || 16));
    const density = Math.max(0.05, Math.min(1, t.density == null ? 0.35 : t.density));
    const r = Math.max(0.5, (pitch / 2) * density);
    const ramp = A().ramps[state.ramp];
    ctx.save();
    ctx.fillStyle = ramp[t.value == null ? 1 : t.value]; // default deep teal
    for (let y = pitch / 2; y < H; y += pitch) {
      const stagger = (Math.round(y / pitch) % 2) * (pitch / 2);
      for (let x = pitch / 2 + stagger; x < W; x += pitch) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---- frame + hard offset shadow ------------------------------------
  function frameAndShadow(ctx, state, W, H) {
    const f = state.frameStyle || {};
    const ramp = A().ramps[state.ramp];
    const t = Math.max(0, Math.round(f.thickness || 0));
    if (f.shadow) {
      // hard offset shadow: a solid rectangle, no blur. "Printed, not rendered."
      const off = Math.max(2, Math.round(t * 0.75)) || 8;
      ctx.fillStyle = ramp[0];
      ctx.fillRect(off, H - off, W - off, off);
      ctx.fillRect(W - off, off, off, H - off);
    }
    if (f.border && t > 0) {
      ctx.strokeStyle = ramp[0];
      ctx.lineWidth = t;
      ctx.strokeRect(t / 2, t / 2, W - t, H - t);
    }
  }

  // ---- text -----------------------------------------------------------
  function drawText(ctx, state, W, H) {
    const ramp = A().ramps[state.ramp];
    const roles = [
      ["title", 1.0],
      ["subtitle", 1.0],
      ["stamp", 1.0],
    ];
    for (const [role] of roles) {
      const t = state.text && state.text[role];
      if (!t || !t.v) continue;
      // size is a percentage of canvas height, so type scales with the format
      let size = Math.max(8, Math.round(((t.size || 6) / 100) * H));
      const lines = String(t.v).split("\n");
      const x = pctToPx(t.x, W);

      // AUTO-FIT. Whatever gets typed here — a CLI --text, a long lyric — must
      // not run off the canvas. Batch-rendering "GAME BOY BLUES" at 9% of a
      // 1080px frame clipped to "GAME BOY BLU". So measure the widest line and
      // shrink the whole block until it fits inside a right margin equal to
      // the left one. The requested size is a MAXIMUM, never a promise.
      const avail = Math.max(40, W - x * 2);
      ctx.font = size + "px " + FONTS[role];
      let widest = 0;
      for (const line of lines) widest = Math.max(widest, ctx.measureText(line).width);
      if (widest > avail) size = Math.max(8, Math.floor(size * (avail / widest)));

      ctx.font = size + "px " + FONTS[role];
      ctx.textBaseline = "top";
      ctx.fillStyle = ramp[Math.max(0, Math.min(3, t.color == null ? 0 : t.color))];
      const lh = Math.round(size * (role === "title" ? 0.92 : 1.25));
      // off-register ghost: the second plate landing a few px off, in tiffany
      lines.forEach((line, i) => {
        const y = pctToPx(t.y, H) + i * lh;
        if (t.ghost) {
          ctx.save();
          ctx.fillStyle = ramp[2];
          ctx.fillText(line, x + Math.round(size * 0.05), y + Math.round(size * 0.05));
          ctx.restore();
        }
        ctx.fillText(line, x, y);
      });
      ctx.restore();
    }
  }

  // ---- the four-value guarantee ---------------------------------------
  /**
   * Snap every pixel to the nearest active ramp colour. This is what makes
   * rule 2 true of the finished export rather than merely intended: browser
   * text antialiasing, and any blending, gets thresholded away here.
   */
  function quantise(ctx, state, W, H) {
    const colors = A().ramps[state.ramp].map(hexToRgb);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      let best = 0, bestD = Infinity;
      for (let c = 0; c < colors.length; c++) {
        const dr = r - colors[c][0], dg = g - colors[c][1], db = b - colors[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestD) { bestD = dist; best = c; }
      }
      d[i] = colors[best][0];
      d[i + 1] = colors[best][1];
      d[i + 2] = colors[best][2];
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---- top level -------------------------------------------------------
  function outputSize(format) {
    const f = A().formats[format];
    return { w: f.out[0], h: f.out[1], nw: f.w, nh: f.h, scale: f.out[0] / f.w };
  }

  /** Render one frame of `state` into `canvas` at exact export pixels. */
  function renderTo(canvas, state, frame) {
    frame = frame || 0;
    const size = outputSize(state.format);
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;

    // 1. native indexed buffer
    const buf = makeBuffer(size.nw, size.nh);
    fillBuffer(buf, state.scene === "blank-ink" ? 1 : 4);
    drawScene(buf, state, frame);
    drawSprites(buf, state, frame);
    drawHeart(buf, state);

    // 2. exact integer upscale
    const native = bufferToCanvas(buf, state.ramp);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(native, 0, 0, size.nw, size.nh, 0, 0, size.w, size.h);

    // 3. overlays drawn at export scale
    texture(ctx, state, size.w, size.h);
    drawText(ctx, state, size.w, size.h);
    frameAndShadow(ctx, state, size.w, size.h);

    // 4. four-value guarantee
    quantise(ctx, state, size.w, size.h);
    return canvas;
  }

  /** Frames in one full parallax loop, so exports come back around cleanly. */
  function loopFrames(state) {
    if (!state.parallax || !state.parallax.on) return 1;
    const size = outputSize(state.format);
    const speed = state.parallax.speed || 1;
    // marsh is the fastest layer at 4x base; a full loop is the scene width
    // travelled by the slowest MOVING layer, in whole frames
    const n = Math.round(size.nw / (0.5 * speed));
    return Math.max(8, Math.min(240, n));
  }

  globalThis.LCEngine = {
    renderTo: renderTo,
    registerPhoto: registerPhoto,
    hasPhoto: hasPhoto,
    ditherToGrid: ditherToGrid,
    outputSize: outputSize,
    loopFrames: loopFrames,
    quantise: quantise,
    hexToRgb: hexToRgb,
    FONTS: FONTS,
    MAX_HEARTS: 1,
  };
})();
