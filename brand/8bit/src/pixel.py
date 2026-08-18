"""
LamarCy 8-bit toolkit — shared palette + grid rendering.

Every sprite/scene in brand/8bit is authored as an ASCII grid using the
letter codes below, rendered at native resolution, and upscaled with
Image.NEAREST only. Four values per ramp, plus transparency. No
anti-aliasing, no intermediate tones, ever.

Codes:
  .  transparent
  K  Ink        #141412
  D  Deep teal  #067A76   (derived from Tiffany; reads as the dark mid)
  T  Tiffany    #09B1AB   (the signature accent)
  C  Light      #F7F3E8 cream (teal ramp) / #E3DECB harbor sepia (sepia ramp)
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

# --- the two LamarCy ramps (darkest → lightest) ---------------------------

INK = (0x14, 0x14, 0x12, 255)
DEEP = (0x06, 0x7A, 0x76, 255)
TIFFANY = (0x09, 0xB1, 0xAB, 255)
CREAM = (0xF7, 0xF3, 0xE8, 255)
SEPIA = (0xE3, 0xDE, 0xCB, 255)
CLEAR = (0, 0, 0, 0)

RAMPS = {
    "teal": {".": CLEAR, "K": INK, "D": DEEP, "T": TIFFANY, "C": CREAM},
    # warm alternate: identical grids, lightest value swaps cream → sepia
    "sepia": {".": CLEAR, "K": INK, "D": DEEP, "T": TIFFANY, "C": SEPIA},
}

VALID = set(".KDTC")

REPO = Path(__file__).resolve().parents[3]
EIGHTBIT = REPO / "brand" / "8bit"
FONT_ANTON = REPO / "web" / "public" / "gateway" / "Anton.ttf"
FONT_OSWALD = REPO / "web" / "public" / "gateway" / "Oswald.ttf"


def parse_grid(grid: str) -> list[str]:
    """Strip blank edges, validate width consistency and legal codes."""
    rows = [r for r in grid.splitlines() if r.strip("")]
    rows = [r for r in rows if r != ""]
    width = max(len(r) for r in rows)
    out = []
    for r in rows:
        r = r.ljust(width, ".")
        bad = set(r) - VALID
        if bad:
            raise ValueError(f"illegal codes {bad!r} in row: {r}")
        out.append(r)
    return out


def render(grid: str | list[str], ramp: str = "teal") -> Image.Image:
    """ASCII grid → native-resolution RGBA image."""
    rows = parse_grid(grid) if isinstance(grid, str) else grid
    palette = RAMPS[ramp]
    img = Image.new("RGBA", (len(rows[0]), len(rows)), CLEAR)
    px = img.load()
    for y, row in enumerate(rows):
        for x, code in enumerate(row):
            px[x, y] = palette[code]
    return img


def overlay(base: list[str], layer: list[str], ox: int = 0, oy: int = 0) -> list[str]:
    """Stamp a smaller grid onto a base grid ('.' is transparent)."""
    out = [list(r) for r in base]
    for y, row in enumerate(layer):
        for x, code in enumerate(row):
            if code == ".":
                continue
            ty, tx = y + oy, x + ox
            if 0 <= ty < len(out) and 0 <= tx < len(out[0]):
                out[ty][tx] = code
    return ["".join(r) for r in out]


def blank(width: int, height: int) -> list[str]:
    return ["." * width for _ in range(height)]


def hflip(rows: list[str]) -> list[str]:
    return [r[::-1] for r in rows]


def save_scaled(img: Image.Image, stem: Path, scales=(1, 4, 8)) -> None:
    """Export 1x/4x/8x PNGs. Nearest-neighbor only — pixels never blur."""
    stem.parent.mkdir(parents=True, exist_ok=True)
    for s in scales:
        out = img.resize((img.width * s, img.height * s), Image.NEAREST)
        out.save(f"{stem}@{s}x.png")


def save_sprite(grid: str | list[str], out_dir: Path, name: str) -> None:
    """Standard sprite export: both ramps at 1x/4x/8x."""
    for ramp in RAMPS:
        img = render(grid, ramp)
        save_scaled(img, out_dir / ramp / name)


# One shared 8-bit heart mark (7×6) — the brand allows exactly ONE per layout.
HEART = parse_grid(
    """
.TT.TT.
TTTTTTT
TTTTTTT
.TTTTT.
..TTT..
...T...
"""
)
