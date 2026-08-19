/*
  LamarCy World Studio — UI wiring. Vanilla JS, no framework.

  All brand enforcement lives in engine.js; this file's job is to make sure
  the UI can never ask the engine for something off-brand in the first place:

    * scale inputs are integer steppers 1..8, never free numbers
    * colour is chosen from four ramp swatches — there is no colour input
    * fonts are fixed per text role, so there is no font control
    * the heart is a single toggle, and addHeart refuses a second
*/
(function () {
  "use strict";

  const A = () => globalThis.LC_ASSETS;
  const E = () => globalThis.LCEngine;
  const X = () => globalThis.LCExport;
  const $ = (id) => document.getElementById(id);

  const SCENES = [
    ["tideline-day", "Tideline day"],
    ["tideline-night", "Tideline night"],
    ["open-water", "Open water"],
    ["harbor", "Harbor"],
    ["blank-cream", "Blank cream"],
    ["blank-ink", "Blank ink"],
  ];
  const POSES = {
    lamarcy: [["idle", "Idle"], ["walk", "Walk"], ["play", "Playing"]],
    keeper: [["idle", "Idle"], ["swim", "Swim"], ["breach", "Breaching"]],
  };
  const RAMP_NAMES = { teal: "Tiffany", sepia: "Sepia" };
  const TEXT_ROLES = [
    ["title", "Title (Anton)"],
    ["subtitle", "Subtitle (Oswald)"],
    ["stamp", "Date stamp (mono)"],
  ];

  /** Today as REC M.DD.YY — the brand's date-stamp form. */
  function todayStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `REC ${d.getMonth() + 1}.${pad(d.getDate())}.${pad(d.getFullYear() % 100)}`;
  }

  const DEFAULT_STATE = {
    format: "9x16",
    ramp: "teal",
    scene: "tideline-day",
    parallax: { on: false, speed: 1, offsets: {} },
    sprites: [],
    text: {
      title: { v: "", x: 7, y: 7, size: 9, color: 0, ghost: true },
      subtitle: { v: "", x: 7, y: 25, size: 3.4, color: 1, ghost: false },
      stamp: { v: todayStamp(), x: 7, y: 92, size: 2.1, color: 0, ghost: false },
    },
    texture: { on: false, density: 0.35, pitch: 16, value: 1 },
    frameStyle: { border: false, thickness: 18, shadow: false },
    heart: { on: false, x: 86, y: 91, scale: 3 },
  };

  // ---- the photo library ------------------------------------------------
  /*
    Durrell's own frames. Stored as a downscaled JPEG data URL in
    localStorage, NOT as the dithered result — because the halftone has to be
    recomputed whenever the format, ramp, tone or screen changes, and
    re-screening an already-screened image turns to mush.

    They live in localStorage rather than in a preset because they are a
    library, not part of one composition, and because the app has no server to
    put them on.
  */
  const PHOTO_KEY = "LC_PHOTOS_V1";
  const PHOTO_MAX = 1280;            // longest side kept; plenty for a 480px screen
  let photoLib = {};

  function loadPhotoLib() {
    try {
      photoLib = JSON.parse(localStorage.getItem(PHOTO_KEY) || "{}");
    } catch (e) {
      photoLib = {};
    }
  }

  function savePhotoLib() {
    try {
      localStorage.setItem(PHOTO_KEY, JSON.stringify(photoLib));
    } catch (e) {
      status("Couldn't save photos locally — browser storage is full. " +
        "They'll work until you reload.", true);
    }
  }

  /** Decode, downscale, re-encode as JPEG, and hand the element to the engine. */
  function ingest(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("could not read " + file.name));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("not an image: " + file.name));
        img.onload = () => {
          const k = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * k));
          c.height = Math.max(1, Math.round(img.height * k));
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
          photoLib[id] = {
            label: file.name.replace(/\.[^.]+$/, "").slice(0, 28),
            src: c.toDataURL("image/jpeg", 0.86),
            ar: c.width / c.height,
            tone: 0,
            screen: 6,
          };
          resolve(id);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /** Give the engine a loaded <img> for every photo it may be asked to draw. */
  function primePhotos() {
    const jobs = Object.keys(photoLib).map((id) => new Promise((res) => {
      if (E().hasPhoto(id)) return res();
      const img = new Image();
      img.onload = () => { E().registerPhoto(id, img); res(); };
      img.onerror = () => res();
      img.src = photoLib[id].src;
    }));
    return Promise.all(jobs);
  }

  let state = structuredClone(DEFAULT_STATE);
  let presets = null;
  let presetsFromFile = false;
  let frame = 0;
  let playing = false;
  let rafId = 0;
  const cv = $("cv");

  // ---- fallback presets, used when fetch is blocked on file:// ---------
  const BUILTIN_PRESETS = {
    "gbb-title": { label: "GBB Title Card", state: {
      format: "9x16", scene: "tideline-day", parallax: { on: true, speed: 1 },
      sprites: [{ kind: "lamarcy", pose: "walk", x: 14, y: 48.1, scale: 2, animate: true, z: 1 },
                { kind: "keeper", pose: "breach", x: 58, y: 30, scale: 2, z: 2 }],
      text: {
        title: { v: "GAME BOY\nBLUES", x: 7, y: 6, size: 9, color: 0, ghost: true },
        subtitle: { v: "EPISODE 01", x: 7, y: 24, size: 3.4, color: 1 },
        stamp: { v: todayStamp(), x: 7, y: 92, size: 2.1, color: 0 } },
      texture: { on: true, density: 0.3, pitch: 18, value: 1 },
      frameStyle: { border: true, thickness: 18, shadow: false },
      heart: { on: true, x: 86, y: 91, scale: 3 } } },
    "lyric-card": { label: "Lyric Card", state: {
      format: "9x16", scene: "tideline-night", parallax: { on: true, speed: 0.5 },
      sprites: [{ kind: "keeper", pose: "breach", x: 46, y: 36, scale: 3, z: 1 }],
      text: {
        title: { v: "I BET IT'S\nDOLPHINS\nWHO KNOW", x: 7, y: 8, size: 8.4, color: 3, ghost: true },
        subtitle: { v: "LOWCOUNTRY BEACH", x: 7, y: 86, size: 3, color: 2 },
        stamp: { v: "LC-001", x: 7, y: 92, size: 2.1, color: 3 } },
      texture: { on: false }, frameStyle: { border: true, thickness: 18, shadow: false },
      heart: { on: true, x: 86, y: 91, scale: 3 } } },
    release: { label: "Release Announcement", state: {
      format: "1x1", scene: "blank-cream", parallax: { on: false, speed: 1 },
      sprites: [{ kind: "keeper", pose: "breach", x: 56, y: 52, scale: 2, z: 1 }],
      text: {
        title: { v: "CHA'ANNOLOG", x: 7, y: 22, size: 12, color: 0, ghost: true },
        subtitle: { v: "LAMARCY RECORDING CO.", x: 7, y: 12, size: 3.2, color: 0 },
        stamp: { v: "LC-001 - REC 2026 - CHS>ATL", x: 7, y: 86, size: 2.6, color: 0 } },
      texture: { on: true, density: 0.34, pitch: 16, value: 1 },
      frameStyle: { border: true, thickness: 22, shadow: true },
      heart: { on: true, x: 87, y: 87, scale: 3 } } },
    "substack-header": { label: "Substack Header", state: {
      format: "16x9", ramp: "sepia", scene: "harbor", parallax: { on: true, speed: 1 },
      sprites: [{ kind: "lamarcy", pose: "idle", x: 72, y: 42.2, scale: 2, z: 1 },
                { kind: "keeper", pose: "breach", x: 40, y: 26, scale: 2, z: 2 }],
      text: {
        title: { v: "LAMARCY", x: 5, y: 12, size: 15, color: 0, ghost: true },
        subtitle: { v: "GAME BOY BLUES - 90s HARDWARE, VINTAGE GEAR", x: 5, y: 40, size: 3.6, color: 1 },
        stamp: { v: "CHS>ATL", x: 5, y: 86, size: 3, color: 0 } },
      texture: { on: true, density: 0.26, pitch: 20, value: 1 },
      frameStyle: { border: true, thickness: 14, shadow: false },
      heart: { on: true, x: 90, y: 82, scale: 3 } } },
    blank: { label: "Blank", state: structuredClone(DEFAULT_STATE) },
  };

  function deepMerge(base, patch) {
    const out = structuredClone(base);
    for (const k of Object.keys(patch || {})) {
      const v = patch[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = deepMerge(out[k] || {}, v);
      } else {
        out[k] = structuredClone(v);
      }
    }
    return out;
  }

  // ---- render ----------------------------------------------------------
  function render() {
    state.photos = photoLib;          // engine reads tone/screen/ar from here
    E().renderTo(cv, state, frame);
    const s = E().outputSize(state.format);
    // fit the preview to the stage without ever scaling the canvas pixels
    const stage = $("stage");
    const maxH = stage.clientHeight - 60;
    const maxW = stage.clientWidth - 60;
    const k = Math.min(maxW / s.w, maxH / s.h, 1);
    cv.style.width = Math.floor(s.w * k) + "px";
    cv.style.height = Math.floor(s.h * k) + "px";
    $("badge").textContent = `${s.w}x${s.h}  native ${s.nw}x${s.nh}  x${s.scale}`;
  }

  function status(msg, bad) {
    const el = $("status");
    const src = presetsFromFile ? "presets.json" : "built-in presets";
    el.innerHTML =
      `<b>${state.format}</b> &middot; ${RAMP_NAMES[state.ramp]} ramp &middot; ` +
      `${state.sprites.length} sprite(s) &middot; heart ${state.heart.on ? "1/1" : "0/1"}<br>` +
      `source: ${src}<br>` +
      (msg ? `<span class="${bad ? "bad" : ""}">${msg}</span>` : "");
  }

  // ---- control builders -------------------------------------------------
  function segmented(host, options, get, set) {
    host.innerHTML = "";
    for (const [val, label] of options) {
      const b = document.createElement("button");
      b.textContent = label;
      b.setAttribute("aria-pressed", String(get() === val));
      b.onclick = () => { set(val); build(); render(); status(""); };
      host.appendChild(b);
    }
  }

  function toggle(id, get, set) {
    const b = $(id);
    b.setAttribute("aria-pressed", String(!!get()));
    b.onclick = () => { set(!get()); build(); render(); status(""); };
  }

  function slider(id, valId, get, set, fmt) {
    const el = $(id);
    el.value = get();
    if (valId) $(valId).textContent = fmt ? fmt(get()) : get();
    el.oninput = () => {
      set(parseFloat(el.value));
      if (valId) $(valId).textContent = fmt ? fmt(get()) : get();
      render();
    };
  }

  /** Four ramp swatches. This is the entire colour vocabulary of the UI. */
  function swatches(host, get, set) {
    host.innerHTML = "";
    const ramp = A().ramps[state.ramp];
    ramp.forEach((hex, i) => {
      const b = document.createElement("button");
      b.className = "sw";
      b.style.background = hex;
      b.title = hex;
      b.setAttribute("aria-pressed", String(get() === i));
      b.onclick = () => { set(i); build(); render(); };
      host.appendChild(b);
    });
  }

  function numRow(label, get, set, min, max, step) {
    const wrap = document.createElement("div");
    const l = document.createElement("label");
    l.textContent = label;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = min; inp.max = max; inp.step = step == null ? 1 : step;
    inp.value = get();
    inp.oninput = () => {
      let v = parseFloat(inp.value);
      if (isNaN(v)) return;
      v = Math.max(min, Math.min(max, v));
      set(v);
      render();
    };
    wrap.appendChild(l);
    wrap.appendChild(inp);
    return wrap;
  }

  // ---- sprite list ------------------------------------------------------
  function buildSprites() {
    const host = $("sprites");
    host.innerHTML = "";
    state.sprites.forEach((sp, i) => {
      const box = document.createElement("div");
      box.className = "sprite";

      const hd = document.createElement("div");
      hd.className = "hd";
      const name = document.createElement("b");
      name.textContent = sp.kind === "lamarcy" ? "LamarCy"
        : sp.kind === "keeper" ? "Keeper"
        : (photoLib[sp.photoId] && photoLib[sp.photoId].label) || "Photo";
      hd.appendChild(name);

      const btns = document.createElement("div");
      btns.className = "row tight";
      const mk = (txt, fn, pressed) => {
        const b = document.createElement("button");
        b.textContent = txt;
        if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
        b.onclick = () => { fn(); build(); render(); };
        return b;
      };
      if (sp.kind !== "photo") {
        btns.appendChild(mk("Anim", () => { sp.animate = !sp.animate; }, !!sp.animate));
      }
      btns.appendChild(mk("Flip", () => { sp.flip = !sp.flip; }, !!sp.flip));
      btns.appendChild(mk("↑", () => { sp.z = (sp.z || 0) + 1; }));
      btns.appendChild(mk("↓", () => { sp.z = (sp.z || 0) - 1; }));
      btns.appendChild(mk("✕", () => { state.sprites.splice(i, 1); }));
      hd.appendChild(btns);
      box.appendChild(hd);

      if (sp.kind === "photo") {
        const g2 = document.createElement("div");
        g2.className = "mini";
        g2.appendChild(numRow("X %", () => sp.x, (v) => { sp.x = v; }, -50, 150, 1));
        g2.appendChild(numRow("Y %", () => sp.y, (v) => { sp.y = v; }, -50, 150, 1));
        g2.appendChild(numRow("Scale 1-8", () => sp.scale,
          (v) => { sp.scale = Math.round(v); }, 1, 8, 1));
        g2.appendChild(numRow("Detail px", () => sp.base,
          (v) => { sp.base = Math.round(v); }, 16, 160, 4));
        g2.appendChild(numRow("Layer", () => sp.z || 0,
          (v) => { sp.z = Math.round(v); }, -9, 9, 1));
        box.appendChild(g2);
        host.appendChild(box);
        return;
      }

      const pl = document.createElement("label");
      pl.textContent = "Pose";
      box.appendChild(pl);
      const sel = document.createElement("select");
      for (const [v, t] of POSES[sp.kind]) {
        const o = document.createElement("option");
        o.value = v; o.textContent = t; o.selected = sp.pose === v;
        sel.appendChild(o);
      }
      sel.onchange = () => { sp.pose = sel.value; render(); };
      box.appendChild(sel);

      const grid = document.createElement("div");
      grid.className = "mini";
      grid.appendChild(numRow("X %", () => sp.x, (v) => { sp.x = v; }, -50, 150, 1));
      grid.appendChild(numRow("Y %", () => sp.y, (v) => { sp.y = v; }, -50, 150, 1));
      // integer scale only, 1x-8x — rule 1
      grid.appendChild(numRow("Scale 1-8", () => sp.scale, (v) => { sp.scale = Math.round(v); }, 1, 8, 1));
      grid.appendChild(numRow("Layer", () => sp.z || 0, (v) => { sp.z = Math.round(v); }, -9, 9, 1));
      box.appendChild(grid);
      host.appendChild(box);
    });
    if (!state.sprites.length) {
      host.innerHTML = '<p class="note">No sprites. Add LamarCy or the Keeper above.</p>';
    }
  }

  // ---- photo library UI -------------------------------------------------
  function buildPhotos() {
    const host = $("photoList");
    host.innerHTML = "";
    const ids = Object.keys(photoLib);
    if (!ids.length) {
      host.innerHTML = '<p class="note">No photographs imported yet.</p>';
      return;
    }
    for (const id of ids) {
      const meta = photoLib[id];
      const box = document.createElement("div");
      box.className = "sprite";

      const hd = document.createElement("div");
      hd.className = "hd";
      const b = document.createElement("b");
      b.textContent = meta.label || "photo";
      hd.appendChild(b);

      const thumb = document.createElement("img");
      thumb.src = meta.src;
      thumb.style.cssText = "width:52px;height:auto;border:3px solid var(--ink);image-rendering:auto";
      hd.appendChild(thumb);
      box.appendChild(hd);

      const row = document.createElement("div");
      row.className = "row tight";
      row.style.marginTop = "7px";

      const backdrop = document.createElement("button");
      const isBack = state.scene === "photo:" + id;
      backdrop.textContent = "Backdrop";
      backdrop.setAttribute("aria-pressed", String(isBack));
      backdrop.onclick = () => {
        state.scene = isBack ? "blank-cream" : "photo:" + id;
        build(); render();
        status(isBack ? "Backdrop cleared." : `"${meta.label}" set as the backdrop.`);
      };
      row.appendChild(backdrop);

      const panel = document.createElement("button");
      panel.textContent = "+ Panel";
      panel.onclick = () => {
        state.sprites.push({
          kind: "photo", photoId: id, x: 52, y: 34, scale: 2, base: 56,
          flip: false, z: state.sprites.length + 1,
        });
        build(); render();
        status(`Added "${meta.label}" as a panel.`);
      };
      row.appendChild(panel);

      const del = document.createElement("button");
      del.textContent = "✕";
      del.onclick = () => {
        delete photoLib[id];
        savePhotoLib();
        if (state.scene === "photo:" + id) state.scene = "blank-cream";
        state.sprites = state.sprites.filter((sp) => sp.photoId !== id);
        build(); render();
        status("Photo removed.");
      };
      row.appendChild(del);
      box.appendChild(row);

      const grid = document.createElement("div");
      grid.className = "mini";
      grid.appendChild(numRow("Tone", () => meta.tone,
        (v) => { meta.tone = v; savePhotoLib(); }, -0.5, 0.5, 0.05));
      grid.appendChild(numRow("Dot size", () => meta.screen,
        (v) => { meta.screen = Math.round(v); savePhotoLib(); }, 2, 10, 1));
      box.appendChild(grid);
      host.appendChild(box);
    }
  }

  // ---- text controls ----------------------------------------------------
  function buildText() {
    const host = $("text");
    host.innerHTML = "";
    for (const [role, label] of TEXT_ROLES) {
      const t = state.text[role];
      const box = document.createElement("div");
      box.style.marginBottom = "12px";

      const l = document.createElement("label");
      l.textContent = label;
      box.appendChild(l);

      if (role === "title") {
        const ta = document.createElement("textarea");
        ta.value = t.v;
        ta.placeholder = "Line one\nLine two";
        ta.oninput = () => { t.v = ta.value; render(); };
        box.appendChild(ta);
      } else {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.value = t.v;
        if (role === "stamp") inp.placeholder = todayStamp();
        inp.oninput = () => { t.v = inp.value; render(); };
        box.appendChild(inp);
      }

      const grid = document.createElement("div");
      grid.className = "mini";
      grid.appendChild(numRow("X %", () => t.x, (v) => { t.x = v; }, -20, 120, 1));
      grid.appendChild(numRow("Y %", () => t.y, (v) => { t.y = v; }, -20, 120, 1));
      grid.appendChild(numRow("Size % of H", () => t.size, (v) => { t.size = v; }, 1, 30, 0.2));
      box.appendChild(grid);

      const cl = document.createElement("label");
      cl.textContent = "Colour (active ramp only)";
      box.appendChild(cl);
      const sw = document.createElement("div");
      sw.className = "swatches";
      box.appendChild(sw);
      swatches(sw, () => t.color || 0, (i) => { t.color = i; });

      if (role === "title") {
        const g = document.createElement("button");
        g.textContent = "Off-register ghost";
        g.style.marginTop = "7px";
        g.setAttribute("aria-pressed", String(!!t.ghost));
        g.onclick = () => { t.ghost = !t.ghost; build(); render(); };
        box.appendChild(g);
      }
      host.appendChild(box);
    }
  }

  // ---- parallax offsets -------------------------------------------------
  function buildOffsets() {
    const host = $("offsets");
    host.innerHTML = "";
    const layers = A().sceneLayers[state.scene];
    if (!layers) {
      host.innerHTML = '<p class="note">Blank scenes have no layers to offset.</p>';
      return;
    }
    state.parallax.offsets = state.parallax.offsets || {};
    const fmt = A().formats[state.format];
    for (const name of layers) {
      // migrate the old single-number form to {x, y}
      const cur = state.parallax.offsets[name];
      if (typeof cur === "number") {
        state.parallax.offsets[name] = { x: cur, y: 0 };
      } else if (!cur) {
        state.parallax.offsets[name] = { x: 0, y: 0 };
      }
      const off = state.parallax.offsets[name];

      const l = document.createElement("label");
      l.textContent = name + " offset";
      host.appendChild(l);

      const mk = (axis, extent) => {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;align-items:center;gap:7px";
        const tag = document.createElement("span");
        tag.textContent = axis.toUpperCase();
        tag.style.cssText = "font-size:11px;width:10px;color:#4a4a44";
        const inp = document.createElement("input");
        inp.type = "range";
        inp.min = -extent;
        inp.max = extent;
        inp.step = 1;
        inp.value = off[axis] || 0;
        const out = document.createElement("span");
        out.style.cssText =
          "font-family:ui-monospace,Menlo,monospace;font-size:11px;width:34px;text-align:right";
        out.textContent = off[axis] || 0;
        inp.oninput = () => {
          off[axis] = parseInt(inp.value, 10);
          out.textContent = off[axis];
          render();
        };
        wrap.appendChild(tag);
        wrap.appendChild(inp);
        wrap.appendChild(out);
        return wrap;
      };
      host.appendChild(mk("x", fmt.w));
      host.appendChild(mk("y", Math.round(fmt.h / 2)));
    }
  }

  // ---- build all --------------------------------------------------------
  function build() {
    segmented($("format"),
      Object.keys(A().formats).map((k) => [k, A().formats[k].label || k.replace("x", ":")]),
      () => state.format, (v) => { state.format = v; });
    segmented($("ramp"), Object.keys(A().ramps).map((k) => [k, RAMP_NAMES[k]]),
      () => state.ramp, (v) => { state.ramp = v; });

    const sc = $("scene");
    sc.innerHTML = "";
    for (const [v, t] of SCENES) {
      const o = document.createElement("option");
      o.value = v; o.textContent = t;
      sc.appendChild(o);
    }
    for (const id of Object.keys(photoLib)) {
      const o = document.createElement("option");
      o.value = "photo:" + id;
      o.textContent = "Photo — " + (photoLib[id].label || id);
      sc.appendChild(o);
    }
    sc.onchange = () => { state.scene = sc.value; build(); render(); };
    sc.value = state.scene;

    toggle("parOn", () => state.parallax.on, (v) => { state.parallax.on = v; });
    slider("parSpeed", "parSpeedV", () => state.parallax.speed,
      (v) => { state.parallax.speed = v; }, (v) => v + "x");
    buildOffsets();

    buildPhotos();
    buildSprites();
    buildText();

    toggle("texOn", () => state.texture.on, (v) => { state.texture.on = v; });
    slider("texDen", "texDenV", () => state.texture.density,
      (v) => { state.texture.density = v; }, (v) => Math.round(v * 100) + "%");
    slider("texPitch", "texPitchV", () => state.texture.pitch,
      (v) => { state.texture.pitch = Math.round(v); }, (v) => Math.round(v) + "px");

    toggle("brdOn", () => state.frameStyle.border, (v) => { state.frameStyle.border = v; });
    toggle("shdOn", () => state.frameStyle.shadow, (v) => { state.frameStyle.shadow = v; });
    slider("brd", "brdV", () => state.frameStyle.thickness,
      (v) => { state.frameStyle.thickness = Math.round(v); }, (v) => Math.round(v) + "px");
    toggle("heartOn", () => state.heart.on, (v) => { state.heart.on = v; });
  }

  // ---- one heart, enforced ---------------------------------------------
  /**
   * Rule 3. The UI models the heart as a single toggle, so a second one is
   * unreachable by construction; this guard exists for presets and the CLI,
   * which can hand us arbitrary state.
   */
  function clampHearts(st) {
    if (Array.isArray(st.hearts)) {
      if (st.hearts.length > E().MAX_HEARTS) {
        st.hearts = st.hearts.slice(0, E().MAX_HEARTS);
        status("Refused a second heart mark — one per composition.", true);
      }
      st.heart = st.hearts[0] || st.heart;
      delete st.hearts;
    }
    return st;
  }

  // ---- presets ----------------------------------------------------------
  async function loadPresets() {
    try {
      const res = await fetch("presets.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      presets = json.presets;
      presetsFromFile = true;
    } catch (e) {
      presets = BUILTIN_PRESETS;
      presetsFromFile = false;
    }
    const sel = $("preset");
    sel.innerHTML = "";
    for (const key of Object.keys(presets)) {
      const o = document.createElement("option");
      o.value = key;
      o.textContent = presets[key].label || key;
      sel.appendChild(o);
    }
  }

  function applyPreset(key) {
    const p = presets[key];
    if (!p) return;
    state = clampHearts(deepMerge(DEFAULT_STATE, p.state));
    // a preset with an empty stamp still gets today's date
    if (!state.text.stamp.v) state.text.stamp.v = todayStamp();
    frame = 0;
    build();
    render();
    status(`Loaded "${p.label || key}".`);
  }

  // ---- randomize, within brand-safe bounds ------------------------------
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function randomize() {
    const scenes = SCENES.map((s) => s[0]).filter((s) => !s.startsWith("blank"));
    state.scene = pick(scenes);
    state.parallax.on = true;
    state.parallax.speed = pick([0.5, 0.75, 1, 1.5, 2]);
    state.parallax.offsets = {};
    // sprite placement stays inside the frame and on integer scales
    state.sprites = state.sprites.length ? state.sprites : [
      { kind: "lamarcy", pose: "walk", x: 12, y: 54, scale: 2, animate: true, z: 1 },
    ];
    for (const sp of state.sprites) {
      sp.x = 4 + Math.floor(Math.random() * 60);
      sp.y = 34 + Math.floor(Math.random() * 30);
      sp.scale = pick([2, 2, 3]);
      sp.flip = Math.random() < 0.3;
    }
    state.texture.on = Math.random() < 0.7;
    state.texture.pitch = pick([12, 16, 18, 22]);
    state.frameStyle.border = Math.random() < 0.8;
    state.frameStyle.thickness = pick([14, 18, 22]);
    build();
    render();
    status("Randomized within brand-safe bounds.");
  }

  // ---- animation preview ------------------------------------------------
  function tick() {
    if (!playing) return;
    frame++;
    render();
    rafId = setTimeout(tick, 1000 / 12);
  }

  // ---- exports ----------------------------------------------------------
  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  async function exportPng() {
    status("rendering PNG…");
    render();
    const blob = await X().canvasBlob(cv);
    X().download(blob, `lamarcy-${state.format}-${stamp()}.png`);
    status(`PNG exported at ${cv.width}x${cv.height}.`);
  }

  function frameCount() {
    return state.parallax.on ? E().loopFrames(state) : 1;
  }

  async function exportGif() {
    const n = frameCount();
    status(`encoding GIF, ${n} frame(s)…`);
    const palette = A().ramps[state.ramp].map(E().hexToRgb);
    const frames = [];
    for (let f = 0; f < n; f++) {
      E().renderTo(cv, state, f);
      frames.push({ indices: X().canvasToIndices(cv, palette) });
      if (f % 12 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const blob = X().encodeGif(frames, cv.width, cv.height, palette, 1000 / 12);
    X().download(blob, `lamarcy-${state.format}-${stamp()}.gif`);
    render();
    status(`GIF exported — ${n} frames, ${(blob.size / 1e6).toFixed(1)}MB.`);
  }

  async function exportZip() {
    const n = frameCount();
    status(`rendering ${n} PNG frame(s)…`);
    const files = [];
    for (let f = 0; f < n; f++) {
      E().renderTo(cv, state, f);
      const bytes = await X().blobBytes(await X().canvasBlob(cv));
      files.push({ name: `frame_${String(f).padStart(4, "0")}.png`, data: bytes });
      if (f % 6 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const blob = X().encodeZip(files);
    X().download(blob, `lamarcy-${state.format}-frames-${stamp()}.zip`);
    render();
    status(`Frame sequence exported — ${n} PNGs, ${(blob.size / 1e6).toFixed(1)}MB.`);
  }

  // Container preference order. Chrome on macOS records H.264 in MP4 directly,
  // which is what Instagram wants, so MP4 is a first-class button rather than a
  // WebM-then-convert dance. The list degrades if a browser lacks a codec.
  const VIDEO_TYPES = {
    mp4: [
      "video/mp4;codecs=avc1.42E01E",   // baseline — widest player support
      "video/mp4;codecs=avc1.640028",   // high profile
      "video/mp4",
    ],
    webm: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"],
  };

  async function exportVideo(kind) {
    if (!window.MediaRecorder) {
      status("MediaRecorder unavailable in this browser — use Frames .zip.", true);
      return;
    }
    const mime = VIDEO_TYPES[kind].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      status(
        kind === "mp4"
          ? "This browser can't record MP4. Use Frames .zip, or the CLI: " +
            "node generate.mjs --out=clip.mp4 (frame-exact, needs ffmpeg)."
          : "No WebM codec here — use Frames .zip and ffmpeg.",
        true
      );
      return;
    }
    const n = Math.max(frameCount(), 12);
    const fps = 12;
    /*
      Two things caused a glitch at the START of a recording, both fixed here.

      1. renderTo() assigns canvas.width every call, and assigning width RESETS
         the bitmap — do that to a canvas with a live captureStream and Chrome
         emits a black frame and renegotiates the track. So frames are composed
         on an OFFSCREEN canvas and blitted in, and the visible canvas is sized
         once, before the stream exists.
      2. rec.start() used to run before the first render, so the recorder's
         opening frame was whatever happened to be on the canvas. Frame 0 is now
         primed before recording begins.
    */
    const size = E().outputSize(state.format);
    cv.width = size.w;
    cv.height = size.h;
    const off = document.createElement("canvas");
    const vctx = cv.getContext("2d");
    vctx.imageSmoothingEnabled = false;
    E().renderTo(off, state, 0);
    vctx.drawImage(off, 0, 0);

    const stream = cv.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 40e6 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });
    rec.start();
    status(`recording ${kind.toUpperCase()}, ${n} frames…`);
    for (let f = 0; f < n; f++) {
      E().renderTo(off, state, f);
      vctx.drawImage(off, 0, 0);            // one atomic blit, no resize
      if (track.requestFrame) track.requestFrame();
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: mime });
    X().download(blob, `lamarcy-${state.format}-${stamp()}.${kind}`);
    render();
    const codec = (mime.match(/codecs=([\w.]+)/) || [, mime.split("/")[1]])[1];
    status(`${kind.toUpperCase()} exported — ${codec}, ${n} frames, ` +
      `${(blob.size / 1e6).toFixed(1)}MB.`);
  }


  // ---- boot -------------------------------------------------------------

  // ==== music + lyric video ================================================
  /*
    Durrell's constraint, verbatim: "my own original music only". Import is
    therefore gated behind an explicit attestation — the picker stays disabled
    until the box is ticked, and the claim is echoed back on the track note.
    This is a guardrail in the same spirit as the four-colour rule: the tool
    refuses to help you post something you don't own.

    SYNC. The lyric video drives every frame from audio.currentTime rather than
    from a frame counter. That makes MediaRecorder's real-time capture the
    CORRECT approach here instead of a compromise — picture and sound come off
    the same clock, so they cannot drift apart however slow rendering gets.
    (The plain MP4 button does use a frame counter, which is why its measured
    frame rate can land under 12.)
  */
  // Percent of frame height. Instagram Reels' top chrome eats roughly the first
  // 12%; this sits just below it and still reads as "at the top".
  const LYRIC_SAFE_TOP = 15;

  let audioEl = null;
  let audioName = "";
  let actx = null;
  let audioDest = null;
  let lyricRaf = 0;

  function parseLyrics(text) {
    // [m:ss.cc] or [m:ss] prefix; lines without one are ignored
    const out = [];
    for (const raw of String(text || "").split("\n")) {
      const m = raw.match(/^\s*\[(\d+):(\d{1,2}(?:\.\d+)?)\]\s*(.*)$/);
      if (!m) continue;
      const t = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      const line = m[3].trim();
      if (line) out.push({ t: t, line: line });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  /*
    Cues for playback/export. If nothing is timestamped yet we spread the typed
    lines evenly across the track instead of drawing nothing — requiring
    timestamps first meant a first-time export came out silent-looking, with the
    world animating and no words on it at all. Evenly spaced is rarely perfect
    but it is always visible, and Auto-time / Tap sync refine from there.
  */
  function lyricCues() {
    const raw = $("lyrics").value;
    const timed = parseLyrics(raw);
    if (timed.length) return { cues: timed, spread: false };
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return { cues: [], spread: false };
    const total = audioEl && isFinite(audioEl.duration) ? audioEl.duration : lines.length * 3;
    const lead = 0.35;
    const span = Math.max(0.8, (total - lead) / lines.length);
    return {
      cues: lines.map((line, i) => ({ t: lead + i * span, line: line })),
      spread: true,
    };
  }

  function lyricAt(cues, t) {
    let cur = "";
    for (const c of cues) {
      if (c.t <= t) cur = c.line;
      else break;
    }
    return cur;
  }

  /* State with the active lyric swapped into the title slot, so it inherits
     Anton, the auto-fit and the ramp colours already wired up. */
  function stateWithLyric(line) {
    const st = JSON.parse(JSON.stringify(state));
    st.text = st.text || {};
    // The engine reads t.v, NOT t.value. Setting .value silently skipped the
    // lyric on every frame — the whole reason the first lyric videos came out
    // with the world animating and no words on it.
    st.text.title = st.text.title ||
      { v: "", x: 7, y: LYRIC_SAFE_TOP, size: 9, color: 0, ghost: true };
    st.text.title.v = line;
    // Keep the lyric clear of Instagram's chrome. Reels puts its header and
    // account line across the top of the frame, so anything at 6-8% gets
    // covered. Clamped DOWN to the safe line but never pushed up, so if you
    // deliberately move the title lower that choice is kept.
    st.text.title.y = Math.max(LYRIC_SAFE_TOP, st.text.title.y || 0);
    return st;
  }

  function ensureAudioGraph() {
    if (!audioEl) return null;
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaElementSource(audioEl);
      audioDest = actx.createMediaStreamDestination();
      src.connect(audioDest);          // the copy that gets recorded
      src.connect(actx.destination);   // the copy Durrell hears
    }
    return audioDest;
  }

  function musicStatus() {
    const note = $("musicNote");
    if (!audioEl) {
      note.textContent = "No track loaded. MP3, WAV, M4A or FLAC.";
      $("eLyric").disabled = true;
      return;
    }
    const d = audioEl.duration;
    const len = isFinite(d)
      ? Math.floor(d / 60) + ":" + String(Math.round(d % 60)).padStart(2, "0")
      : "…";
    note.textContent = audioName + " — " + len +
      ". Declared as your own original recording.";
    $("eLyric").disabled = false;
  }

  function loadMusic(file) {
    if (audioEl) {
      URL.revokeObjectURL(audioEl.src);
      audioEl.pause();
    }
    actx = null;                       // a new element needs a new graph
    audioDest = null;
    audioEl = new Audio();
    audioEl.src = URL.createObjectURL(file);
    audioEl.preload = "auto";
    audioName = file.name;
    audioEl.onloadedmetadata = musicStatus;
    audioEl.onended = stopLyricPreview;
    musicStatus();
    status("Loaded " + file.name + " — your own original recording.");
  }

  function stopLyricPreview() {
    if (lyricRaf) cancelAnimationFrame(lyricRaf);
    lyricRaf = 0;
    if (audioEl) audioEl.pause();
    render();
  }

  function playLyricPreview() {
    if (!audioEl) { status("Import a track first.", true); return; }
    ensureAudioGraph();
    if (actx.state === "suspended") actx.resume();
    const lc = lyricCues();
    if (!lc.cues.length) { status("Type your lyrics first, one line each.", true); return; }
    if (lc.spread) {
      $("lyricNote").textContent =
        "No timestamps yet — spacing " + lc.cues.length +
        " line(s) evenly for now. Auto-time or Tap sync to place them properly.";
    }
    audioEl.play();
    const tick = () => {
      const t = audioEl.currentTime;
      E().renderTo(cv, stateWithLyric(lyricAt(lc.cues, t)), Math.round(t * 12));
      if (!audioEl.paused) lyricRaf = requestAnimationFrame(tick);
    };
    tick();
  }

  function tapSync() {
    if (!audioEl) { status("Import a track first.", true); return; }
    const ta = $("lyrics");
    const lines = ta.value.split("\n");
    const t = audioEl.currentTime;
    const mm = Math.floor(t / 60);
    const ss = (t % 60).toFixed(1).padStart(4, "0");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() && !/^\s*\[\d+:/.test(lines[i])) {
        lines[i] = "[" + mm + ":" + ss + "] " + lines[i].trim();
        ta.value = lines.join("\n");
        $("lyricNote").textContent = "Stamped line " + (i + 1) + " at " + mm + ":" + ss + ".";
        return;
      }
    }
    $("lyricNote").textContent = "Every line already has a timestamp.";
  }


  /*
    AUTO-TIMING. Durrell asked for the app to "auto-detect when the words are
    spoken and time them correctly".

    BE CLEAR ABOUT WHAT THIS IS. True word-level alignment means speech
    recognition, which would mean either shipping a multi-megabyte model or
    calling a cloud service — and this tool's whole promise is that it runs
    offline, with no accounts, and still opens in five years. So instead of
    recognising words, this finds where PHRASES START in the audio and places
    the typed lines on them in order.

    How: decode the track, band-pass it to roughly the vocal range so bass and
    cymbals stop dominating, take a short-time RMS envelope, then mark an onset
    wherever energy jumps after a quiet gap. Lines land on successive onsets.
    On a sparse blues vocal that is usually close; on a dense mix it will need
    nudging, which is what Tap sync and hand-editing are for.
  */
  /* Iterative radix-2 FFT, in place. Needed because onset detection on a dense
     mix has to look at how the SPECTRUM changes, not just how loud it is. */
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wr = Math.cos(ang);
      const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1;
        let ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ar = re[i + k];
          const ai = im[i + k];
          const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ar + br;
          im[i + k] = ai + bi;
          re[i + k + len / 2] = ar - br;
          im[i + k + len / 2] = ai - bi;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
  }

  /*
    Onset detection by SPECTRAL FLUX with an adaptive threshold.

    The first version gated on absolute energy dropping to near-silence to
    re-arm. On a solo vocal that works; on a full band mix the floor never gets
    that low, so it found three phrase starts in forty seconds and the lines
    bunched at the end. Flux measures how much the spectrum CHANGES frame to
    frame, which is what a sung entrance actually looks like, and the threshold
    is a local median so it adapts to a loud chorus or a quiet verse.
  */
  async function detectOnsets() {
    const res = await fetch(audioEl.src);
    const raw = await res.arrayBuffer();
    const tmp = new (window.AudioContext || window.webkitAudioContext)();
    const buf = await tmp.decodeAudioData(raw);
    tmp.close();

    // band-pass toward the vocal range so bass and cymbals stop dominating
    const off = new OfflineAudioContext(1, buf.length, buf.sampleRate);
    const src = off.createBufferSource();
    src.buffer = buf;
    const hp = off.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;
    const lp = off.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4500;
    src.connect(hp); hp.connect(lp); lp.connect(off.destination);
    src.start();
    const filtered = await off.startRendering();
    const d = filtered.getChannelData(0);
    const sr = filtered.sampleRate;

    const N = 2048;
    const HOP = 512;
    const secPerFrame = HOP / sr;
    const frames = Math.max(1, Math.floor((d.length - N) / HOP));
    const win = new Float32Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

    const kLo = Math.max(1, Math.floor((200 / sr) * N));
    const kHi = Math.min(N / 2, Math.ceil((4500 / sr) * N));

    const flux = new Float32Array(frames);
    let prev = new Float32Array(kHi - kLo);
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let f = 0; f < frames; f++) {
      const s0 = f * HOP;
      for (let i = 0; i < N; i++) { re[i] = d[s0 + i] * win[i]; im[i] = 0; }
      fft(re, im);
      let sum = 0;
      for (let k = kLo; k < kHi; k++) {
        const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        const diff = mag - prev[k - kLo];
        if (diff > 0) sum += diff;
        prev[k - kLo] = mag;
      }
      flux[f] = sum;
    }

    // normalise, then pick peaks above a local-median threshold
    let mx = 1e-9;
    for (let i = 0; i < frames; i++) if (flux[i] > mx) mx = flux[i];
    for (let i = 0; i < frames; i++) flux[i] /= mx;

    const W = Math.round(0.6 / secPerFrame);        // ±0.6s median window
    const MIN_GAP = Math.round(0.28 / secPerFrame); // no two onsets closer than 280ms
    const onsets = [];
    const scores = [];
    let lastIdx = -MIN_GAP;
    const scratch = [];
    for (let i = 1; i < frames - 1; i++) {
      if (flux[i] <= flux[i - 1] || flux[i] < flux[i + 1]) continue;   // local max only
      scratch.length = 0;
      for (let j = Math.max(0, i - W); j < Math.min(frames, i + W); j++) scratch.push(flux[j]);
      scratch.sort((a, b) => a - b);
      const median = scratch[scratch.length >> 1];
      const thresh = median * 1.7 + 0.012;
      if (flux[i] < thresh) continue;
      if (i - lastIdx < MIN_GAP) {
        // keep the stronger of two close candidates
        if (onsets.length && flux[i] > scores[scores.length - 1]) {
          onsets[onsets.length - 1] = i * secPerFrame;
          scores[scores.length - 1] = flux[i];
          lastIdx = i;
        }
        continue;
      }
      onsets.push(i * secPerFrame);
      scores.push(flux[i]);
      lastIdx = i;
    }
    return { onsets: onsets, scores: scores, duration: buf.duration };
  }

  async function autoTimeLyrics() {
    if (!audioEl) { status("Import a track first.", true); return; }
    const ta = $("lyrics");
    const lines = ta.value.split("\n").map((l) => l.replace(/^\s*\[\d+:\d{1,2}(?:\.\d+)?\]\s*/, "").trim());
    const words = lines.filter((l) => l);
    if (!words.length) { status("Type your lyrics first, one line each.", true); return; }

    $("lyricNote").textContent = "Listening for phrase starts…";
    let onsets, scores, duration;
    try {
      const r = await detectOnsets();
      onsets = r.onsets;
      scores = r.scores;
      duration = r.duration;
    } catch (e) {
      status("Couldn't analyse that file: " + e.message, true);
      return;
    }

    // If the detector found more phrase starts than there are lines, keep the
    // strongest-spaced subset by walking evenly through them; if it found
    // fewer, space the remainder out across what's left of the track.
    const times = [];
    if (onsets.length >= words.length) {
      /*
        Strongest onsets, but SPACED. Picking purely by strength put lines one
        and two a second apart, because a drum hit can out-score a vocal
        entrance. A sung line lasts seconds, so candidates are taken greedily by
        strength while refusing anything too close to one already chosen; the
        floor relaxes if that leaves too few.
      */
      const idx = onsets.map((t, i) => i);
      idx.sort((a, b) => scores[b] - scores[a]);
      let minGap = Math.max(1.0, duration / (words.length * 2.5));
      let keep = [];
      for (let relax = 0; relax < 6 && keep.length < words.length; relax++) {
        keep = [];
        for (const i of idx) {
          if (keep.length >= words.length) break;
          if (keep.every((j) => Math.abs(onsets[j] - onsets[i]) >= minGap)) keep.push(i);
        }
        minGap *= 0.65;
      }
      keep.sort((a, b) => a - b);
      for (const i of keep) times.push(onsets[i]);
      while (times.length < words.length) {
        times.push(Math.min(duration - 0.4, (times[times.length - 1] || 0) + 2));
      }
    } else {
      times.push(...onsets);
      const last = onsets.length ? onsets[onsets.length - 1] : 0;
      const gap = Math.max(1.2, (duration - last) / (words.length - onsets.length + 1));
      for (let i = onsets.length; i < words.length; i++) {
        times.push(Math.min(duration - 0.4, last + gap * (i - onsets.length + 1)));
      }
    }

    const out = words.map((line, i) => {
      const t = Math.max(0, times[i]);
      const mm = Math.floor(t / 60);
      const ss = (t % 60).toFixed(1).padStart(4, "0");
      return "[" + mm + ":" + ss + "] " + line;
    });
    ta.value = out.join("\n");
    $("lyricNote").textContent =
      "Timed " + words.length + " line(s) against " + onsets.length +
      " detected phrase start(s). Press Play to check, Tap sync to fix any line.";
    status("Auto-timed " + words.length + " lyric line(s).");
  }

  function clearLyricTimes() {
    const ta = $("lyrics");
    ta.value = ta.value
      .split("\n")
      .map((l) => l.replace(/^\s*\[\d+:\d{1,2}(?:\.\d+)?\]\s*/, ""))
      .join("\n");
    $("lyricNote").textContent = "Timestamps cleared.";
  }

  async function exportLyricVideo() {
    if (!audioEl) { status("Import a track first.", true); return; }
    if (!window.MediaRecorder) { status("MediaRecorder unavailable here.", true); return; }
    const withAudio = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=avc1.640028,mp4a.40.2",
      "video/webm;codecs=vp9,opus",
      "video/webm",
    ];
    const mime = withAudio.find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      status("No container here can carry video plus audio — use Frames .zip " +
        "and mux with ffmpeg.", true);
      return;
    }
    const ext = mime.indexOf("video/mp4") === 0 ? "mp4" : "webm";
    const lc = lyricCues();
    if (!lc.cues.length) { status("Type your lyrics first, one line each.", true); return; }
    const cues = lc.cues;
    const dest = ensureAudioGraph();
    if (actx.state === "suspended") await actx.resume();

    /*
      FRAME ATOMICITY — this is what made the first lyric videos glitchy.
      captureStream(24) samples the visible canvas on its own schedule, which can
      land midway through a render: after the background blit but before the text
      is drawn, giving torn frames and flickering type. So each frame is composed
      on an OFFSCREEN canvas, blitted to the visible one in a single drawImage,
      and only then handed to the recorder via requestFrame. Nothing is ever
      captured half-drawn.
    */
    const lsize = E().outputSize(state.format);
    cv.width = lsize.w;
    cv.height = lsize.h;
    const off = document.createElement("canvas");
    const vctx = cv.getContext("2d");
    vctx.imageSmoothingEnabled = false;
    // prime frame 0 so the recorder's opening frame is a real one, not black
    E().renderTo(off, stateWithLyric(lyricAt(cues, 0)), 0);
    vctx.drawImage(off, 0, 0);
    const vStream = cv.captureStream(0);
    const vTrack = vStream.getVideoTracks()[0];
    const stream = new MediaStream(
      vStream.getVideoTracks().concat(dest.stream.getAudioTracks())
    );
    // Pixel art is pathological for H.264: 1px halftone dots and hard edges are
    // all high-frequency detail, and at 12Mbps 1080x1920 came back smeared and
    // glitchy. 40Mbps keeps the dots crisp.
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 40e6 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });

    audioEl.currentTime = 0;
    rec.start();
    await audioEl.play();
    const total = isFinite(audioEl.duration) ? audioEl.duration : 0;
    let timer = 0;
    const FPS = 20;                 // steady cadence; content still comes from audio time
    await new Promise((finish) => {
      const stop = () => { clearTimeout(timer); finish(); };
      const tick = () => {
        const t = audioEl.currentTime;
        E().renderTo(off, stateWithLyric(lyricAt(cues, t)), Math.round(t * 12));
        vctx.drawImage(off, 0, 0);              // one atomic blit
        if (vTrack.requestFrame) vTrack.requestFrame();
        if (total) status("recording lyric video — " + t.toFixed(1) + "s / " + total.toFixed(1) + "s");
        if (audioEl.paused || audioEl.ended) { stop(); return; }
        timer = setTimeout(tick, 1000 / FPS);
      };
      audioEl.onended = stop;
      tick();
    });
    rec.stop();
    await done;
    audioEl.onended = stopLyricPreview;

    const blob = new Blob(chunks, { type: mime });
    X().download(blob, "lamarcy-lyric-" + state.format + "-" + stamp() + "." + ext);
    render();
    status("Lyric video exported — " + ext.toUpperCase() + " with audio, " +
      total.toFixed(1) + "s, " + (blob.size / 1e6).toFixed(1) + "MB, " +
      cues.length + " lyric line(s)" + (lc.spread ? " (evenly spaced)" : "") + ".");
  }

  async function boot() {
    loadPhotoLib();
    await primePhotos();
    await loadPresets();
    // wait for Anton/Oswald before the first paint, or the title renders in
    // a fallback face and the quantise pass bakes that in
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.load('16px Anton'); } catch (e) {}
      try { await document.fonts.load('16px Oswald'); } catch (e) {}
      await document.fonts.ready;
    }
    applyPreset($("preset").value || "gbb-title");

    $("load").onclick = () => applyPreset($("preset").value);
    $("rand").onclick = randomize;
    $("addL").onclick = () => {
      state.sprites.push({ kind: "lamarcy", pose: "walk", x: 14, y: 48.1, scale: 2, animate: true, z: state.sprites.length + 1 });
      build(); render(); status("Added LamarCy.");
    };
    $("addK").onclick = () => {
      state.sprites.push({ kind: "keeper", pose: "swim", x: 52, y: 40, scale: 2, animate: true, z: state.sprites.length + 1 });
      build(); render(); status("Added the Keeper.");
    };
    $("play").onclick = () => {
      playing = !playing;
      $("play").setAttribute("aria-pressed", String(playing));
      $("play").textContent = playing ? "Pause ▮▮" : "Preview ▶";
      clearTimeout(rafId);
      if (playing) tick();
    };
    $("photoPick").onclick = () => $("photoFile").click();
    $("photoFile").onchange = async (e) => {
      const files = [...e.target.files];
      e.target.value = "";
      if (!files.length) return;
      status(`importing ${files.length} photo(s)…`);
      let last = null;
      for (const f of files) {
        try {
          last = await ingest(f);
        } catch (err) {
          status(err.message, true);
        }
      }
      savePhotoLib();
      await primePhotos();
      if (last) state.scene = "photo:" + last;   // show it straight away
      build();
      render();
      status(`Imported ${files.length} photo(s), halftoned into the ramp.`);
    };

    $("ePng").onclick = exportPng;
    $("eGif").onclick = exportGif;
    $("eMp4").onclick = () => exportVideo("mp4");
    $("eLyric").onclick = exportLyricVideo;
    // The button stays clickable and explains itself; a dead disabled button
    // just reads as broken, which is exactly how it read to Durrell.
    $("musicPick").disabled = false;
    $("ownMusic").onchange = () => {};
    $("musicPick").onclick = () => {
      if (!$("ownMusic").checked) {
        status("Tick the box above first — this tool only takes your own recordings.", true);
        $("ownMusic").focus();
        return;
      }
      $("musicFile").click();
    };
    $("musicFile").onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) loadMusic(f);
      e.target.value = "";
    };
    $("musicClear").onclick = () => {
      stopLyricPreview();
      if (audioEl) URL.revokeObjectURL(audioEl.src);
      audioEl = null; actx = null; audioDest = null; audioName = "";
      musicStatus();
      status("Track cleared.");
    };
    $("lyricPlay").onclick = playLyricPreview;
    $("lyricTap").onclick = tapSync;
    $("lyricStop").onclick = stopLyricPreview;
    $("lyricAuto").onclick = autoTimeLyrics;
    $("lyricClear").onclick = clearLyricTimes;
    $("eWebm").onclick = () => exportVideo("webm");
    $("eZip").onclick = exportZip;
    window.addEventListener("resize", render);

    if (!presetsFromFile) {
      status("presets.json not readable over file:// — using built-in presets. " +
        "Run `npm run dev` to edit presets live.");
    }
    // signal for the headless renderer / tests
    window.__LC_READY = true;
  }

  // exposed so render.html and tests can drive the same code
  globalThis.LCStudio = {
    get state() { return state; },
    set state(v) { state = clampHearts(deepMerge(DEFAULT_STATE, v)); },
    render: render,
    build: build,
    DEFAULT_STATE: DEFAULT_STATE,
    todayStamp: todayStamp,
    deepMerge: deepMerge,
    BUILTIN_PRESETS: BUILTIN_PRESETS,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
