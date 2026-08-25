# LamarCy 8-bit world — handoff

Written 2026-08-18 for Durrell Lamar Smith (LamarCy / D.LAMAR).

This file exists so a **new Claude account, with no memory of the chat that built
this, can pick the work up cold** — not just find the files, but understand why
they look the way they do and which decisions are still open.

Three sections:

- **Part 1** — the prompt to paste into the new account. Start there.
- **Part 2** — backing up to the external drive, and restoring from it.
- **Part 3** — the decision log: what was tried, what was rejected, and why.
  This is the part that can't be recovered from the files alone.

---

# Part 1 · Paste this into the new Claude account

Copy everything between the rules. It is written to be pasted as a first
message, with no prior context.

---

> I'm Durrell Lamar Smith. I record as LamarCy — a Black Southern songwriter and
> guitarist from Atlanta. I'm also a painter (as D.LAMAR) and a designer.
>
> I'm continuing work that was built in a previous Claude account. Everything is
> committed to git at `~/Documents/dash-creatives`, in `brand/8bit/`. Before you
> touch anything, read these three files in this order — they carry the context
> you're missing:
>
> 1. `brand/8bit/HANDOFF.md` — why every decision was made, what I rejected, and
>    what's still open. Read all of it, especially Part 3.
> 2. `brand/8bit/studio/README.md` — how the app runs and what's been verified.
> 3. `brand/8bit/palette.md` — the colour rules, which are non-negotiable.
>
> Then run `git log --oneline --grep='^8bit' | tail -20` to see the build order.
>
> **What this is.** I make a video series called Game Boy Blues — I run 90s
> hardware through vintage guitar gear and build blues songs around it. This
> project is an original 8-bit visual world I own outright, plus a local app that
> composes it into reel-ready posts. It's in two phases, both built:
>
> - **Phase 1** — the asset library: a 4-tone palette, a character sprite, an
>   original creature (a dolphin, "the Keeper"), a layered Charleston tideline
>   scene, a hero animation, a Game Boy cartridge label, and a gear card.
> - **Phase 2** — the LamarCy World Studio: a dependency-free browser app at
>   `brand/8bit/studio/` that composes those assets and exports PNG, GIF, MP4,
>   WebM and PNG frame sequences, plus a batch CLI.
>
> **The hard constraint, and it is the reason this project exists.** Nothing may
> reference, derive from, or resemble the characters, creature designs, logos,
> trade dress or UI of any existing game franchise. Original silhouettes only. If
> a shape starts looking like somebody else's mascot, change it. I need to own
> this forever so it can become video texture, album art, merch, Substack headers
> and eventually a game-styled music video nobody can take down.
>
> **My brand system, from the Cha'Annolog Brand Book — non-negotiable.**
>
> - Palette: Tiffany `#09B1AB` (signature accent) · Seafoam `#5CB9AE` · Cream
>   `#F7F3E8` (paper/default field) · Ink `#141412` (type, borders, darkest) ·
>   Harbor sepia `#E3DECB` · Heritage red `#D82128` (deluxe/vinyl only, and NEVER
>   at full strength beside Tiffany blue).
> - The 8-bit work uses a constrained 4-value ramp built from those: Ink →
>   Deep teal `#067A76` → Tiffany `#09B1AB` → Cream `#F7F3E8`. A warm alternate
>   swaps Harbor sepia for cream. **Only those four values are ever drawn.**
> - Type roles: Anton = display caps (titles) · Oswald = secondary caps (labels,
>   small print) · monospace = dates and catalog metadata · serif = body prose.
>   The script "LamarCy" is a logo, never a font.
> - Ben-Day halftone dots are the era texture. Thick ink borders, hard offset
>   shadows — "printed, not rendered." Date-stamp things (`LC-001 · REC 2026 ·
>   CHS→ATL`). **Exactly one heart mark per layout.** No gradients, no glow, no
>   AI-styled effects, no stock imagery.
> - Photography rule: **first-hand or not at all.** My own frames are in
>   `~/Downloads/LamarCy Imagery and Branding/ChaAnnolog Album/Moodboard/`.
>
> **How I want you to work.** Show me renders as you go — screenshot every visual
> asset and put it in front of me rather than building the whole set and
> revealing it at the end. Commit with clear messages and push to `main`
> yourself, then tell me. Ask before anything destructive. When you claim
> something works, verify it by actually running it, not by reasoning that it
> should.
>
> **Where we left off.** Phase 1 and Phase 2 are both built and pushed. The open
> items are listed at the end of HANDOFF.md. The immediate one: the character
> sprite is on revision 6 and I'm still not settled on it — we were iterating on
> the figure when the account changed over. Music notes radiating from him while
> playing, and the figure moving as he plays, are done (a 4-frame `play1..play4`
> cycle with drifting eighth notes).
>
> Start by reading those files and telling me what you understand the state to
> be. Don't start changing things until we've agreed on what's next.

---

# Part 2 · The external drive

## What to back up

Two things, and the second is the one people forget:

1. **The working files** — `brand/8bit/` (~19MB): the generator scripts, every
   exported sprite and scene, the label, the cards, and the Studio app.
2. **The git history** — a *bundle*. A single file containing every commit,
   branch and tag. This is what lets the new account "backtrack everything": it
   can read the whole build order, every message, and every intermediate state.
   A plain folder copy loses all of that.

## Make the backup

```bash
cd ~/Documents/dash-creatives
DEST="/Volumes/New Drive/DASH CREATIVES/lamarcy-8bit-handoff-$(date +%Y-%m-%d)"
mkdir -p "$DEST"

# 1. the whole history, as one file
git bundle create "$DEST/dash-creatives.bundle" --all

# 2. the working files
rsync -a --delete brand/8bit/ "$DEST/brand-8bit/"

# 3. the fonts, so the Studio renders correctly anywhere
rsync -a web/public/gateway/Anton.ttf web/public/gateway/Oswald.ttf "$DEST/fonts/"

# 4. this document, alongside the files it describes
cp brand/8bit/HANDOFF.md "$DEST/"

# 5. prove the bundle is readable BEFORE you trust it
git bundle verify "$DEST/dash-creatives.bundle"
du -sh "$DEST"
```

`git bundle verify` is the step that matters. An unverified backup is a hope,
not a backup.

## Restore on a new machine

```bash
git clone "/Volumes/New Drive/DASH CREATIVES/lamarcy-8bit-handoff-YYYY-MM-DD/dash-creatives.bundle" dash-creatives
cd dash-creatives
git log --oneline | head -30          # the full build order is right there
```

The GitHub remote (`github.com/LamarCy/dash-creatives`) also has everything on
`main`, so the drive is the offline belt to that braces.

## Running the Studio from the drive copy

`brand-8bit/studio/` is self-contained — the fonts live inside it. Double-click
`Open LamarCy Studio.command`. If macOS refuses after the copy:

```bash
chmod +x "Open LamarCy Studio.command"
```

---

# Part 3 · Decision log

The files can't tell you what was rejected. This can.

## The palette

Four values, darkest to lightest: Ink `#141412`, Deep teal `#067A76`, Tiffany
`#09B1AB`, Cream `#F7F3E8`. Warm alternate swaps cream for Harbor sepia
`#E3DECB`.

**The load-bearing rule nobody guesses:** in a 4-value ramp you separate objects
by *value*, not by outline. This caused real failures. A cream guitar against a
cream shirt vanished; a tiffany guitar against a tiffany jacket vanished. Deep
teal separates from both. Same lesson at night: ink rigging on an ink sky
disappeared entirely, so night outlines are drawn in tiffany.

Skin is deep teal — the ramp's dark mid. That's a deliberate value decision so
the figure reads as Black against a cream field.

## The character sprite — six revisions, still unsettled

This is the most-iterated asset. In order:

1. **Elder portrait** — wide-brim hat, beard, jacket, guitar standing at his
   side. Durrell: *"he looks Amish."* Rejected.
2. **Braves cap, white jeans, jean jacket** — his direction. Accepted as "a good
   version for now," full 48×48 resolution.
3. **Chibi / perler-bead style** — from a reference photo of bead figures.
   Authored on a 24×24 bead grid doubled into the 48×48 cell so every bead is a
   visible 2×2 unit. Head was nearly half the figure. Too blobby.
4. **Cut entirely.** Durrell: *"lets get rid of the LamarCy sprite entirely."*
   The Keeper became the world's only character for a stretch.
5. **A leaning guitar instead of a person**, then specifically *"stratocaster,
   white."* Built it. Durrell: *"no, dont do that guitar it doesnt look good."*
   Rejected.
6. **Current: a standing figure in 1996-handheld overworld proportions** —
   roughly one head to four of body, real arms and legs, planted stance. Bead
   construction retained from revision 3. This is where it stands.

**Shipped late in the session:** music notes radiating from the figure while
playing, and the figure moving as he plays — a 4-frame `play1..play4` cycle with
drifting eighth notes, alongside the still `play` pose. What remains open is the
figure itself, which Durrell hasn't signed off on.

**The cap** carries an original block "A", not the Atlanta Braves mark. He asked
for a Braves cap; real MLB trade dress would break the own-it-forever rule, so
it's an original letterform. He should know that's a substitution, not an
oversight.

**Why the guitar kept failing:** at ~20 beads wide it read as a lollipop, a
padlock or a key across six placements. What finally worked was a deep-teal body
worn low across the waist with the neck angled up — value separation plus a
strap-like geometry.

## The Keeper

The creature is a dolphin, from the opening of Durrell's song *Lowcountry
Beach*: *"I bet it's dolphins who know / where the ocean gon' hide / the
treasures of my soul."* It's the one who knows where the treasures are — it
guards, it doesn't fight.

Generated from a spine curve plus a thickness profile rather than typed as ASCII,
because hand-typing an organic curve came out lumpy. The payoff: the arc frames
fall out of one parameter (`slope`), so the breach pose and the rotation through
an arc are the same knob.

**Open decision — the name.** Four candidates are in
`sprites/keeper/NOTES.md`: **the Keeper** (current), **Treasure**, **Sable**,
**Pilot**. Durrell hasn't picked. Renaming means files and folders too.

## The scene

A layered Charleston tideline: sky (halftone dots) → horizon + boat → water with
an animated wave line → shore → marsh grass. Day and night, multiple aspect
ratios, exported both as separate layers and flattened.

**Derived from Durrell's own photographs**, per the first-hand rule. The boat is
the Corps of Engineers vessel *Robert Gray* from `IMG_2894.jpg` — squat hull,
sheer rising to a high bow, boxy wheelhouse with a window row, mast with two
crosstrees, A-frame boom. Pier rhythm from `IMG_2922.heic`. Horizon and water
from `IMG_2916` / `IMG_2925` / `IMG_2940`.

**Honest gap:** no moodboard frame shows marsh grass. The marsh is the only
element not derived from a photograph. It's flagged in the source docstring.
Durrell should shoot one.

**The dock became a beach shore** at his request — foam line, wet sand, dry sand
— replacing the pier over water. **The harbor scene was then made visually
distinct** because he said it looked too similar to the tideline.

**Note the path discrepancy:** he gave the moodboard path as being on
`/Volumes/New Drive`. That folder doesn't exist there. The frames are in
`~/Downloads/LamarCy Imagery and Branding/ChaAnnolog Album/Moodboard/`.

## The Studio app

Vanilla HTML/CSS/JS with a `<canvas>`. No framework, no build step, no
dependencies — it must still open and run in five years. Art is baked into
`assets.js` as run-length-encoded indexed grids, which is why it works from
`file://` with exports intact (a `file://` image would taint the canvas and break
every export).

**Brand rules the app enforces automatically** — this matters more than the
features, because the app is the guardrail:

- Integer scaling and nearest-neighbour only; `imageSmoothingEnabled = false`.
- Only the four active ramp values are ever drawn. There is no colour picker.
- Maximum one heart mark; adding a second is refused.
- Anton, Oswald and monospace only.
- No gradients, glow or blur anywhere.

Verified by a sweep that renders every format × ramp × scene combination and
counts distinct colours: **104/104 checks passing**.

## Bugs worth remembering

These are the ones that would otherwise be rediscovered the hard way:

- **Nothing in the app was ever looping.** Layer pan was `frame × layerSpeed ×
  speed`, which needed 540 frames to come around at speed 1, while the loop
  length was clamped to 240. Every GIF, WebM and MP4 jumped when it repeated, in
  every format. Fixed by deriving each layer's offset *from* the loop length so
  every layer travels a whole number of scene widths — closure now holds by
  construction. Verified 16/16 across formats and speeds.
- **Black frames at the start of recordings.** `renderTo` assigns
  `canvas.width` every call, which resets the bitmap; doing that to a canvas with
  a live `captureStream` makes Chrome emit a black frame. Frames are now composed
  offscreen and blitted in, and frame 0 is primed before recording starts.
- **The batch CLI was silently using the wrong typeface.** `render.html` had no
  `@font-face` at all, so every CLI render fell back to Impact instead of Anton.
  Caught by diffing the same job before and after: 66,000 pixels changed.
- **Lyric videos rendered no lyrics** when lines had no timestamps — the cue list
  was empty and it drew nothing. Now untimed lines are spread evenly across the
  track so a first export is always visible.
- **Seamless-loop maths depends on scene width.** Pattern periods have to divide
  the actual width; numbers hardcoded for a 480-wide scene never looped at 270.
- **A float-rounding trap:** `sin(2π·28/48)` is exactly −0.5 and rounds to 0, but
  the same angle plus 20 full turns carries float error and rounds to −1, which
  shifted a wave 1px across the loop seam. Reduce angles modulo the period first.

## Environment notes

- Python 3.9 with Pillow. `from __future__ import annotations` is needed for
  modern type syntax.
- **Playwright and `/opt/pw-browsers` do not exist on this machine.** Screenshots
  run through the installed Google Chrome headless via `src/shoot.sh`.
- ffmpeg is at `/opt/homebrew/bin/ffmpeg`. Node is Homebrew-installed and not on
  the PATH that Finder gives a double-clicked script — the launcher looks in the
  usual places.
- Chrome records `video/mp4;codecs=avc1` natively, so MP4 export needs no ffmpeg.

## Open items

1. **Name the Keeper** — four candidates in `sprites/keeper/NOTES.md`.
2. **The sprite is unsettled** at revision 6. He has never said "that's the
   one" about any version of the figure. Six revisions in, treat a redraw as
   likely and keep it parameterised.
3. **Shoot marsh grass** — the one element with no photo reference.
4. **Measure a real cartridge** before printing the label. It's built at
   62×36mm + 2mm bleed at 300dpi, but DMG and Game Boy Color label wells differ
   and repro shells differ again. The dimensions are in one place in the HTML.
5. **A full-loop GIF at 1080px is ~6MB.** Use MP4 or the frame sequence for
   reels.

`LC-8BIT · HANDOFF · REC 2026 · CHS→ATL`
