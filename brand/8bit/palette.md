# The LamarCy 4-Tone Ramps

The original Game Boy drew its whole world in four greens. The LamarCy world
draws in four Tiffanys. Every sprite and scene in `brand/8bit` uses **only
the four values of the active ramp** — no anti-aliasing, no intermediate
tones, no alpha blending against the art. Hard pixel edges only, upscaled
exclusively with nearest-neighbor.

## Tiffany ramp — default

| Value | Role | Hex |
| --- | --- | --- |
| Ink | darkest — outlines, type, hats, shadows | `#141412` |
| Deep teal | dark mid — skin, water shade, form shading | `#067A76` |
| Tiffany | light mid — the signature accent, denim jacket, sky, guitar body | `#09B1AB` |
| Cream | lightest — paper field, tees, white jeans, highlights | `#F7F3E8` |

Deep teal is derived from Tiffany (same hue family, dropped value) so the
ramp reads as one material — like a Game Boy screen made of Tiffany glass.

## Sepia ramp — Lowcountry / monochrome beats

Identical grids, one swap: the lightest value trades cream for harbor sepia.

| Value | Role | Hex |
| --- | --- | --- |
| Ink | darkest | `#141412` |
| Deep teal | dark mid | `#067A76` |
| Tiffany | light mid | `#09B1AB` |
| Harbor sepia | lightest — warm paper, archival tone | `#E3DECB` |

Use it for heritage/Lowcountry beats and anywhere the cream ramp feels too
bright next to graded photography. Because both ramps share the same three
dark values, sprites swap ramps without redrawing — the toolkit
(`src/pixel.py`) renders every asset in both automatically.

## Usage notes

- **Skin** in the LamarCy world is deep teal `#067A76` with ink features —
  the darker mid value, deliberately, so the figure reads Black in a
  4-tone palette the way GB sprites read through value, not color.
- **Heritage red `#D82128` does not exist in the 8-bit world.** It stays a
  deluxe/vinyl print color; it never appears in sprites or scenes.
- **Halftone** stays era-accurate: dots are drawn as dots in a ramp value,
  never as opacity or gradients.
- **One heart per layout**, enforced later by the Studio app. The shared
  pixel heart lives in `src/pixel.py` (`HEART`).
- Scale factors are integers only (1x/4x/8x standard). If an export ever
  looks soft, something used a smooth filter — that's a bug, not a style.

`LC-8BIT · PALETTE · REC 2026 · CHS→ATL`
_(CHS→ATL is the heritage line — Lowcountry roots, Atlanta born-and-based.)_
