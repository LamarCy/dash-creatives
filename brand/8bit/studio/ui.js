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
      sprites: [{ kind: "lamarcy", pose: "idle", x: 72, y: 37.4, scale: 2, z: 1 },
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
    for (const name of layers) {
      const l = document.createElement("label");
      l.textContent = name + " offset";
      const inp = document.createElement("input");
      inp.type = "range";
      inp.min = -A().formats[state.format].w;
      inp.max = A().formats[state.format].w;
      inp.step = 1;
      inp.value = state.parallax.offsets[name] || 0;
      inp.oninput = () => {
        state.parallax.offsets[name] = parseInt(inp.value, 10);
        render();
      };
      host.appendChild(l);
      host.appendChild(inp);
    }
  }

  // ---- build all --------------------------------------------------------
  function build() {
    segmented($("format"), Object.keys(A().formats).map((k) => [k, k.replace("x", ":")]),
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

  async function exportWebm() {
    if (!window.MediaRecorder) {
      status("MediaRecorder unavailable in this browser — use Frames .zip.", true);
      return;
    }
    const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      status("No WebM codec here — use Frames .zip and ffmpeg.", true);
      return;
    }
    const n = Math.max(frameCount(), 12);
    const fps = 12;
    const stream = cv.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });
    rec.start();
    status(`recording WebM, ${n} frames…`);
    for (let f = 0; f < n; f++) {
      E().renderTo(cv, state, f);
      if (track.requestFrame) track.requestFrame();
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: mime });
    X().download(blob, `lamarcy-${state.format}-${stamp()}.webm`);
    render();
    status(`WebM exported (${mime.split(";")[0]}, ${(blob.size / 1e6).toFixed(1)}MB). ` +
      "Convert to MP4 with the ffmpeg line in README.md.");
  }

  // ---- boot -------------------------------------------------------------
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
    $("eWebm").onclick = exportWebm;
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
