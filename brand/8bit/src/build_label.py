"""
Task 6 (cont.) — build the three cartridge-label deliverables.

  1. cartridge-print@300dpi.png   flattened, with 300dpi metadata written in
  2. cartridge.svg                editable: real text nodes for the title,
                                  company line and catalog line, so you can
                                  retype them without re-rendering anything
  3. cartridge-mockup.png         the label sitting on a cartridge shape

The PNG comes from headless Chrome (Playwright is not installed on this
machine). The SVG is authored here rather than exported from the browser so
the text stays text — a browser-exported SVG would have the type as paths.

Run:  python3 brand/8bit/src/build_label.py
"""

from __future__ import annotations

import base64
import subprocess

from PIL import Image

from pixel import EIGHTBIT

LABEL = EIGHTBIT / "label"
SHOOT = EIGHTBIT / "src" / "shoot.sh"

# 62mm x 36mm at 300dpi + 2mm bleed. MEASURE THE REAL CART — DMG and Game Boy
# Color label wells differ, and repro shells differ again.
MM_W, MM_H, MM_BLEED, DPI = 62, 36, 2, 300
TRIM_W = round(MM_W / 25.4 * DPI)      # 732
TRIM_H = round(MM_H / 25.4 * DPI)      # 425
BLEED = round(MM_BLEED / 25.4 * DPI)   # 24

INK, DEEP, TIFF, CREAM, SEPIA = "#141412", "#067A76", "#09B1AB", "#F7F3E8", "#E3DECB"


def shoot(src, out, width, scale=1, height=1200) -> None:
    subprocess.run(["bash", str(SHOOT), str(src), str(out), str(width),
                    str(scale), str(height)], check=True)


def data_uri(path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def build_png() -> None:
    out = LABEL / "cartridge-print@300dpi.png"
    shoot(LABEL / "cartridge.html", out, TRIM_W + BLEED * 2, 1, TRIM_H + BLEED * 2 + 8)
    im = Image.open(out).convert("RGB").crop((0, 0, TRIM_W + BLEED * 2, TRIM_H + BLEED * 2))
    # PNG carries physical size in pHYs; without this a printer treats it as 72dpi
    im.save(out, dpi=(DPI, DPI))
    print(f"wrote {out.name}  {im.width}x{im.height}px @ {DPI}dpi "
          f"({MM_W}x{MM_H}mm + {MM_BLEED}mm bleed)")


def build_svg() -> None:
    keeper = data_uri(EIGHTBIT / "sprites" / "keeper" / "teal" / "breach@8x.png")
    heart = data_uri(EIGHTBIT / "sprites" / "heart@8x.png")
    w, h = TRIM_W + BLEED * 2, TRIM_H + BLEED * 2
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<!-- Cha'Annolog cartridge label. Editable: the <text> nodes below are real
     text, so retype them freely. Sizes are in px at {DPI}dpi;
     trim is {MM_W}x{MM_H}mm with {MM_BLEED}mm bleed. MEASURE YOUR CARTRIDGE:
     DMG and Game Boy Color label wells are not the same. -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs>
    <pattern id="benday" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="2.6" fill="{SEPIA}"/>
    </pattern>
    <clipPath id="trim">
      <rect x="{BLEED}" y="{BLEED}" width="{TRIM_W}" height="{TRIM_H}"/>
    </clipPath>
  </defs>

  <rect width="{w}" height="{h}" fill="{CREAM}"/>
  <g clip-path="url(#trim)">
    <rect x="{BLEED}" y="{BLEED}" width="{TRIM_W}" height="{TRIM_H}" fill="{CREAM}"/>
    <rect x="{BLEED}" y="{BLEED}" width="{TRIM_W}" height="{TRIM_H}" fill="url(#benday)"/>
    <rect x="{BLEED + 4.5}" y="{BLEED + 4.5}" width="{TRIM_W - 9}" height="{TRIM_H - 9}"
          fill="none" stroke="{INK}" stroke-width="9"/>

    <text x="{BLEED + 39}" y="{BLEED + 58}" font-family="Oswald" font-size="25"
          letter-spacing="3.2" fill="{INK}">LAMARCY RECORDING CO.</text>

    <rect x="{BLEED + 494}" y="{BLEED + 30}" width="{200}" height="{38}"
          fill="{CREAM}" stroke="{INK}" stroke-width="4"/>
    <text x="{BLEED + 508}" y="{BLEED + 57}" font-family="Oswald" font-size="21"
          letter-spacing="2.3" fill="{DEEP}">FULL STEREO &#183; HI-FI</text>

    <!-- off-register two-pass print: tiffany ghost plate, then the ink plate -->
    <text x="{BLEED + 43}" y="{BLEED + 258}" font-family="Anton" font-size="132"
          letter-spacing="-1.6" fill="{TIFF}">CHA&#8217;ANNOLOG</text>
    <text x="{BLEED + 36}" y="{BLEED + 251}" font-family="Anton" font-size="132"
          letter-spacing="-1.6" fill="{INK}">CHA&#8217;ANNOLOG</text>

    <text x="{BLEED + 39}" y="{BLEED + 386}" font-family="monospace" font-size="22"
          letter-spacing="0.9" fill="{INK}">LC-001 &#183; REC 2026 &#183; CHS&#8594;ATL</text>

    <!-- exactly one heart mark on this layout -->
    <image xlink:href="{heart}" x="{BLEED + 372}" y="{BLEED + 364}"
           width="42" height="36" style="image-rendering:pixelated"/>
    <image xlink:href="{keeper}" x="{BLEED + 546}" y="{BLEED + 252}"
           width="144" height="144" style="image-rendering:pixelated"/>
  </g>
</svg>
"""
    (LABEL / "cartridge.svg").write_text(svg)
    print(f"wrote cartridge.svg  {w}x{h}  (title/company/catalog are live text)")


def build_mockup() -> None:
    out = LABEL / "cartridge-mockup.png"
    shoot(LABEL / "mockup.html", out, 820, 2, 900)
    print(f"wrote {out.name}")


if __name__ == "__main__":
    build_png()
    build_svg()
    build_mockup()
