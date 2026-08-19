# The LamarCy World Studio

Durrell — this is the thing that turns `brand/8bit/` into finished posts. Sit
down on a Sunday, pick a preset, type a title, export. No design decisions, no
Illustrator, no subscriptions. Written assuming you have forgotten everything.

---

## 1. Run it

**Double-click `Open LamarCy Studio.command`.** That is the whole answer. It
starts the local server, waits for it, and opens the app in your browser. Leave
the Terminal window it opens alone while you work; close it when you're done.
If it's already running it just opens the browser again.

If that file ever stops being double-clickable (macOS does this after some
copies), run once in Terminal:

```bash
chmod +x "Open LamarCy Studio.command"
```

**Without Node.** Open `index.html` directly. Everything works — including all
four exports — except loading your edits to `presets.json`, because browsers
refuse to read local files over `file://`. The app notices, says so in the
status line, and uses the five presets compiled into `ui.js`. The launcher falls
back to this automatically if it can't find Node.

**From a terminal**, if you prefer:

```bash
npm run dev            # -> http://localhost:4173/
```

No `npm install`, ever. There are no dependencies — that command just runs
`serve.mjs`, about ninety lines of Node's own http module.

**Taking it with you.** The `studio/` folder is self-contained: Anton and Oswald
live in `studio/fonts/`, and the art is inside `assets.js`. Copy the folder to a
USB stick or another machine and it renders identically. (It also looks for the
repo's copy of the fonts as a fallback, so both locations work.)

## 2. Make a post

Left is the canvas at true export size, scaled to fit. Right is the panel, top
to bottom:

| Group | What it does |
| --- | --- |
| **Preset** | Load a full composition. `Randomize` shuffles scene, sprite placement and parallax inside brand-safe bounds. |
| **Format** | 9:16 (1080×1920) · 1:1 (1080×1080) · 16:9 (1920×1080) |
| **Palette** | Tiffany ramp or Sepia ramp |
| **Scene** | Tideline day · Tideline night · Open water · Harbor · Blank cream · Blank ink |
| **Parallax** | `Motion` on/off, speed (which sets the loop length — 240 frames at speed 1, 60 at speed 4), and per-layer **X and Y** offset sliders — nudge the horizon down, lift the water, slide the skyline. `Preview ▶` animates in place. |
| **Sprites** | Add LamarCy or the Keeper. Each gets pose, X/Y, integer scale 1–8, animate, flip, and layer order (↑/↓). |
| **Text** | Title (Anton) · Subtitle (Oswald) · Date stamp (mono, pre-filled with today as `REC M.DD.YY`). Colour comes from four ramp swatches. |
| **Texture** | Halftone dots on/off, density, pitch. |
| **Frame** | Ink border + thickness, hard offset shadow. |
| **Heart** | One per composition. |

Positions and text sizes are **percentages**, not pixels, so a composition you
build in 9:16 still lands sensibly when you flip it to 1:1 or 16:9.

Layer offsets are in native pixels and move in both axes. X wraps around the
scene width; Y does not — sliding a band up or down reveals what's behind it
rather than tiling vertically, which is what you want when you're recomposing a
horizon.

## 3. Export

Four buttons. What each is for:

- **PNG still** — exact pixel dimensions for the chosen format. Your default.
- **MP4 video** — H.264 / yuv420p, recorded straight by Chrome. This is the one
  to upload; recorded at 40Mbps because pixel art is all high-frequency detail
  and a lower rate smears the halftone dots into mush. Note it is captured in
  *real time*, so on a heavy composition the
  measured frame rate can land under 12 and the clip plays a touch slow. When
  that matters use the CLI, which is frame-exact.
- **Lyric video (MP4)** — your track plus timed lyrics over the world. See §5.
- **Animated GIF** — looping, 12fps, good for a quick post. The encoder is
  written into `export.js`; no library. **Expect a big file**: a full parallax
  loop at 1080px is 130+ frames, which lands around 6MB. That's fine for
  Substack or a DM, but for a reel use WebM or the frame sequence instead. A
  faster parallax speed means fewer frames and a smaller GIF.
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

## 4. Your own photographs

**Import photo…** in the panel. Pick one or several. Each frame is reduced to
the four-value ramp with a **Ben-Day halftone screen** — a clustered dot that
grows outward from the centre of each cell as the tone darkens, the same
texture as the brand's dot rule. It is a real screen, not a photo pasted on
top of pixel art, so rule 2 still holds: a halftoned photograph renders in
exactly four colours.

Each import gives you two buttons:

- **Backdrop** — full-bleed behind everything, in place of Tideline/Harbor.
  Also appears at the bottom of the Scene dropdown.
- **+ Panel** — behaves like a sprite: X/Y, integer scale, layer order. Good
  for an inset or a Polaroid in a corner.

Two knobs per photo. **Tone** shifts it lighter or darker — reach for this
first, since four values is a narrow ladder. **Dot size** sets the screen cell:
small for detail, large for a coarse printed look. Panels also have **Detail
px**, the native size the photo is screened at before being scaled up; smaller
means chunkier dots.

Imports live in this browser's local storage, so they survive a reload. They
are **not** in the repo and **not** in `presets.json` — if you clear browser
data they're gone, and re-importing takes seconds. The original is kept (a
downscaled JPEG) rather than the screened result, because the halftone has to
be recomputed whenever the format, ramp or tone changes; re-screening an
already-screened image turns to mush.

For the CLI, pass a file instead: `--photo=path/to/frame.jpg`. The headless
renderer loads and screens it the same way.

## 5. Add a preset

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

## 6. Add a sprite or a scene

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

## 7. Batch mode

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

## 8. The rules it enforces for you

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

## 10. Tests

```bash
npm test
```

Round-trips the hand-written GIF encoder: `tests/test_lzw.mjs` compresses a
known pixel stream and decompresses it with an independent decoder;
`tests/test_gif.mjs` writes a real GIF and `tests/verify_gif.py` decodes it with
Pillow and compares every pixel. Worth keeping — the first version of that
encoder bumped its LZW code width one dictionary entry too early and produced a
file that decoded to 8 pixels instead of 2257.

## 11. Files

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
  ui/             the LamarCy heart logo (real artwork, never pixelated)
  fonts/          Anton + Oswald, so the folder is portable
  samples/        one render per preset, for the contact sheet
  Open LamarCy Studio.command    double-click this
```

`LC-8BIT · STUDIO · REC 2026 · CHS→ATL`
