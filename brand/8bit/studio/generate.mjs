#!/usr/bin/env node
/*
  Batch renderer for the LamarCy World Studio.

    node brand/8bit/studio/generate.mjs --preset=gbb-title \
         --text="GAME BOY BLUES 01" --format=9x16 --out=exports/gbb-01.png

    node brand/8bit/studio/generate.mjs --jobs=episodes.json

  HOW IT WORKS, and why. It drives render.html in headless Chrome rather than
  reimplementing the renderer in Node. Two reasons:

    1. One renderer. A second implementation would drift from the app, and
       the whole point of the Studio is that what you see is what ships.
    2. Real type. Anton and Oswald have to be rasterised by something. Node
       has no font engine without native dependencies, and this project is
       meant to still run in five years with nothing installed.

  So the only requirement is a Chrome/Chromium on the machine, which the
  Phase 1 scripts already assume. No npm install, ever.

  Flags
    --preset=KEY         preset from presets.json (default: gbb-title)
    --text="..."         overrides the title; use \n for a line break
    --subtitle="..."     overrides the subtitle
    --stamp="..."        overrides the date stamp (default: today, REC M.DD.YY)
    --format=9x16|1x1|16x9
    --ramp=teal|sepia
    --scene=KEY
    --frame=N            which animation frame to render (default 0)
    --out=path.png
    --jobs=file.json     array of job objects using the same keys
    --chrome=path        override Chrome location
*/

import { spawn } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/opt/pw-browsers/chromium/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

async function findChrome(override) {
  const list = override ? [override, ...CHROME_CANDIDATES] : CHROME_CANDIDATES;
  for (const p of list) {
    try {
      await stat(p);
      return p;
    } catch {}
  }
  throw new Error(
    "No Chrome found. Pass --chrome=/path/to/chrome. Looked in:\n  " +
      list.join("\n  ")
  );
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=([\s\S]*))?$/.exec(a);
    if (!m) continue;
    out[m[1]] = m[2] === undefined ? true : m[2];
  }
  return out;
}

function todayStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `REC ${d.getMonth() + 1}.${p(d.getDate())}.${p(d.getFullYear() % 100)}`;
}

function deepMerge(base, patch) {
  const out = structuredClone(base);
  for (const k of Object.keys(patch || {})) {
    const v = patch[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] ?? {}, v);
    } else {
      out[k] = structuredClone(v);
    }
  }
  return out;
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

async function loadPresets() {
  const raw = await readFile(resolve(HERE, "presets.json"), "utf8");
  return JSON.parse(raw).presets;
}

/** Rule 3, enforced on the batch path too. */
function clampHearts(state) {
  if (Array.isArray(state.hearts)) {
    if (state.hearts.length > 1) {
      console.warn("  ! refused extra heart marks — one per composition");
    }
    state.heart = state.hearts[0] ?? state.heart;
    delete state.hearts;
  }
  return state;
}

function buildState(job, presets) {
  const key = job.preset || "gbb-title";
  const preset = presets[key];
  if (!preset) {
    throw new Error(
      `Unknown preset "${key}". Available: ${Object.keys(presets).join(", ")}`
    );
  }
  let state = deepMerge(DEFAULT_STATE, preset.state);

  if (job.format) state.format = job.format;
  if (job.ramp) state.ramp = job.ramp;
  if (job.scene) state.scene = job.scene;
  if (job.text != null) state.text.title.v = String(job.text).replace(/\\n/g, "\n");
  if (job.subtitle != null) state.text.subtitle.v = String(job.subtitle);
  if (job.stamp != null) state.text.stamp.v = String(job.stamp);
  if (!state.text.stamp.v) state.text.stamp.v = todayStamp();
  if (job.state) state = deepMerge(state, job.state);

  return clampHearts(state);
}

function toB64Url(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const SIZES = {
  "9x16": [1080, 1920],
  "1x1": [1080, 1080],
  "16x9": [1920, 1080],
};

function runChrome(chrome, url, out, w, h) {
  return new Promise((res, rej) => {
    const args = [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${w},${h}`,
      "--virtual-time-budget=8000",
      "--default-background-color=00000000",
      `--screenshot=${out}`,
      url,
    ];
    const p = spawn(chrome, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(err || `chrome exited ${code}`))));
  });
}

async function renderJob(chrome, job, presets, i, total) {
  const state = buildState(job, presets);
  const [w, h] = SIZES[state.format] || SIZES["9x16"];
  const out = resolve(process.cwd(), job.out || `exports/lamarcy-${i + 1}.png`);
  await mkdir(dirname(out), { recursive: true });

  const frame = parseInt(job.frame || 0, 10) || 0;
  const url =
    pathToFileURL(resolve(HERE, "render.html")).href +
    `?state=${toB64Url(JSON.stringify(state))}&frame=${frame}`;

  await runChrome(chrome, url, out, w, h);
  const { size } = await stat(out);
  console.log(
    `  [${i + 1}/${total}] ${state.format} ${w}x${h}  ${state.scene}  ` +
      `${(size / 1024).toFixed(0)}KB  ->  ${job.out || out}`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(await readFile(fileURLToPath(import.meta.url), "utf8").then((s) =>
      s.slice(s.indexOf("/*") + 2, s.indexOf("*/"))
    ));
    return;
  }

  const chrome = await findChrome(typeof args.chrome === "string" ? args.chrome : null);
  const presets = await loadPresets();

  let jobs;
  if (args.jobs) {
    const raw = await readFile(resolve(process.cwd(), args.jobs), "utf8");
    const parsed = JSON.parse(raw);
    jobs = Array.isArray(parsed) ? parsed : parsed.jobs;
    if (!Array.isArray(jobs)) throw new Error("--jobs file must be an array, or {jobs:[...]}");
  } else {
    jobs = [args];
  }

  console.log(`LamarCy Studio — ${jobs.length} job(s) via ${chrome}`);
  for (let i = 0; i < jobs.length; i++) {
    await renderJob(chrome, jobs[i], presets, i, jobs.length);
  }
  console.log("done.");
}

main().catch((e) => {
  console.error("generate.mjs failed:", e.message);
  process.exit(1);
});
