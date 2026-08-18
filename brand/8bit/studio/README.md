# The LamarCy World Studio

Durrell — this is the thing that turns `brand/8bit/` into finished posts. Sit
down on a Sunday, pick a preset, type a title, export. No design decisions, no
Illustrator, no subscriptions. Written assuming you have forgotten everything.

---

## 1. Run it

**The lazy way.** Double-click `brand/8bit/studio/index.html`. It opens in your
browser and works — offline, on a plane, anywhere. Everything except one thing:
your edits to `presets.json` won't load, because browsers refuse to read local
files over `file://`. The app notices, says so in the status line at the bottom
right, and falls back to the same five presets compiled in. Fine for making
posts.

**The full way.** From this folder:

```bash
npm run dev            # -> http://localhost:4173/
```

No `npm install`. There are no dependencies — `npm run dev` just runs
`serve.mjs`, about eighty lines of Node's own http module. Use this whenever
you want to edit `presets.json` and see it live.

## 2. Make a post

Left is the canvas at true export size, scaled to fit. Right is the panel, top
to bottom:

| Group | What it does |
| --- | --- |
| **Preset** | Load a full composition. `Randomize` shuffles scene, sprite placement and parallax inside brand-safe bounds. |
| **Format** | 9:16 (1080×1920) · 1:1 (1080×1080) · 16:9 (1920×1080) |
| **Palette** | Tiffany ramp or Sepia ramp |
| **Scene** | Tideline day · Tideline night · Open water · Harbor · Blank cream · Blank ink |
| **Parallax** | `Motion` on/off, speed, and a per-layer offset slider. `Preview ▶` animates in place. |
| **Sprites** | Add LamarCy or the Keeper. Each gets pose, X/Y, integer scale 1–8, animate, flip, and layer order (↑/↓). |
| **Text** | Title (Anton) · Subtitle (Oswald) · Date stamp (mono, pre-filled with today as `REC M.DD.YY`). Colour comes from four ramp swatches. |
| **Texture** | Halftone dots on/off, density, pitch. |
| **Frame** | Ink border + thickness, hard offset shadow. |
| **Heart** | One per composition. |

Positions and text sizes are **percentages**, not pixels, so a composition you
build in 9:16 still lands sensibly when you flip it to 1:1 or 16:9.

## 3. Export

Four buttons. What each is for:

- **PNG still** — exact pixel dimensions for the chosen format. Your default.
- **Animated GIF** — looping, 12fps, good for a quick post. The encoder is
  written into `export.js`; no library.
- **WebM video** — via `MediaRecorder`.
- **Frames .zip** — every frame as a numbered PNG. Drop the folder straight
  into Premiere as an image sequence.

**Be honest about video, because browsers are not.** `MediaRecorder` reliably
gives you **WebM** in Chrome/Chromium. **MP4 support varies** by browser and
build — Safari may hand you one, Chrome usually won't, and there is no way to
promise it. So: export WebM, then convert.

```bash
ffmpeg -i input.webm -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart output.mp4
```

`yuv420p` is the part that matters — without it some players and Instagram's
uploader choke. `+faststart` puts the index at the front so it starts playing
before it finishes downloading.

If a browser export ever misbehaves — a codec vanishes, a GIF looks wrong,
Chrome changes something in 2027 — **use Frames .zip.** That path is just PNGs
in a zip file and cannot really break. Rebuild the video with:

```bash
ffmpeg -framerate 12 -i frame_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 out.mp4
```

## 4. Add a preset

Edit `presets.json`, add an entry under `"presets"`, reload. You only list what
differs from the defaults — everything else is inherited.

```json
"gear-card": {
  "label": "Gear Card",
  "state": {
    "format": "9x16",
    "scene": "blank-cream",
    "text": {
      "title": { "v": "STEAL THIS\nCHAIN", "x": 7, "y": 8, "size": 9, "color": 0, "ghost": true }
    },
    "heart": { "on": true, "x": 86, "y": 91, "scale": 3 }
  }
}
```

Rules of the road: `color` is an **index into the active ramp** — `0` ink,
`1` deep teal, `2` tiffany, `3` cream/harbor sepia. There is no hex field
anywhere, on purpose. `size` is a percentage of canvas height. `scale` must be
a whole number 1–8.

Remember `presets.json` needs `npm run dev` to load. If you want a new preset
available when you double-click the file, also add it to `BUILTIN_PRESETS` near
the top of `ui.js`.

## 5. Add a sprite or a scene

The Studio does **not** read the PNGs in `sprites/` and `scenes/`. It reads
`assets.js`, which is generated. So the flow is always: change the Python,
regenerate, reload.

**A new sprite pose.** Draw it in `brand/8bit/src/` (the sprites are ASCII
grids — change a character, change a pixel), then register it in
`brand/8bit/src/build_studio_assets.py` inside `build()` along`idle`/`play`,
and add it to the `POSES` table near the top of `ui.js` so it appears in the
dropdown. Then:

```bash
python3 brand/8bit/src/build_studio_assets.py
```

**A new scene.** Add an entry to `STUDIO_SCENES` in
`brand/8bit/src/scene_tideline.py` — pick which layers it uses and whether
it's a night variant — then add it to the `SCENES` list in `ui.js`. Regenerate
as above.

**Why generated?** Two reasons worth remembering. First, if the app loaded
sprites as `<img src="…png">` from a local file, Chrome would treat the canvas
as tainted and **every export would fail** with a security error. Second, the
grids let the batch CLI use the exact same data with no image decoder. The
whole bundle is ~112KB.

## 6. Batch mode

Six episode cards in one command:

```bash
node brand/8bit/studio/generate.mjs --preset=gbb-title \
     --text="GAME BOY BLUES 01" --format=9x16 --out=exports/gbb-01.png

node brand/8bit/studio/generate.mjs --jobs=brand/8bit/studio/episodes.example.json
```

Flags: `--preset --text --subtitle --stamp --format --ramp --scene --frame
--out --jobs --chrome`. Use `\n` inside `--text` for a line break. A jobs file
is just an array of objects using those same keys — copy
`episodes.example.json`.

**It drives your installed Chrome in headless mode** rather than re-implementing
the renderer in Node. That is deliberate: one renderer means batch output can
never drift from what you saw on screen, and Anton/Oswald need a real font
engine, which Node doesn't have without native dependencies. If Chrome lives
somewhere unusual, pass `--chrome=/path/to/chrome`.

## 7. The rules it enforces for you

This is the actual point of the tool. You cannot go off-brand with it, even
carelessly:

1. **Integer scaling, nearest-neighbour only.** Scenes and sprites composite
   into an indexed buffer at native size (270×480 / 270×270 / 480×270) and blow
   up by exactly 4×. `imageSmoothingEnabled = false` everywhere. Pixels cannot
   blur — there is no non-integer scaling code path.
2. **Only the four active ramp values, ever.** Guaranteed by a final pass that
   snaps every pixel to the nearest ramp colour. It exists because browsers
   antialias text: without it, Anton's edges would smuggle in dozens of
   in-between colours. Verified — every preset and all 36
   format×ramp×scene combinations render exactly 4 distinct colours.
3. **One heart per composition.** A single toggle in the UI, and a guard that
   drops extras coming from a preset or the CLI.
4. **Anton, Oswald, monospace.** Fixed per text role. There is no font control.
5. **No gradients, no glow, no blur.** Nothing calls `createLinearGradient`,
   `shadowBlur` or `filter`. The halftone **density** slider varies dot *size*,
   not opacity — you asked for opacity, but alpha blending would manufacture a
   fifth colour and break rule 2. Ben-Day dots worked by dot size anyway.

## 8. Tests

```bash
npm test
```

Round-trips the hand-written GIF encoder: `tests/test_lzw.mjs` compresses a
known pixel stream and decompresses it with an independent decoder;
`tests/test_gif.mjs` writes a real GIF and `tests/verify_gif.py` decodes it with
Pillow and compares every pixel. Worth keeping — the first version of that
encoder bumped its LZW code width one dictionary entry too early and produced a
file that decoded to 8 pixels instead of 2257.

## 9. Files

```
studio/
  index.html      the app shell and panel
  ui.js           controls, presets, exports
  engine.js       the renderer — all five brand rules live here
  export.js       PNG / GIF / WebM / ZIP encoders
  assets.js       GENERATED — sprites + scenes as indexed grids (~112KB)
  presets.json    yours to edit
  render.html     bare renderer the CLI screenshots
  generate.mjs    batch CLI
  serve.mjs       dev server for `npm run dev`
  tests/          GIF encoder round-trip
```

`LC-8BIT · STUDIO · REC 2026 · CHS→ATL`
