"""
Task 1 — render the LamarCy 4-tone ramp swatch card.

Run:  python3 brand/8bit/src/palette.py
Out:  brand/8bit/palette-swatch.png
"""

from PIL import Image, ImageDraw, ImageFont

from pixel import (
    CREAM,
    DEEP,
    EIGHTBIT,
    FONT_ANTON,
    FONT_OSWALD,
    HEART,
    INK,
    SEPIA,
    TIFFANY,
    render,
)

W, H = 1240, 840
MARGIN = 46
BORDER = 10


def font(path, size, index=0):
    return ImageFont.truetype(str(path), size, index=index)


def mono(size):
    for candidate in ("/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/Monaco.ttf"):
        try:
            return font(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


RAMP_ROWS = [
    (
        "TIFFANY RAMP — DEFAULT",
        [
            (INK, "INK", "#141412"),
            (DEEP, "DEEP TEAL", "#067A76"),
            (TIFFANY, "TIFFANY", "#09B1AB"),
            (CREAM, "CREAM", "#F7F3E8"),
        ],
    ),
    (
        "SEPIA RAMP — LOWCOUNTRY / MONOCHROME BEATS",
        [
            (INK, "INK", "#141412"),
            (DEEP, "DEEP TEAL", "#067A76"),
            (TIFFANY, "TIFFANY", "#09B1AB"),
            (SEPIA, "HARBOR SEPIA", "#E3DECB"),
        ],
    ),
]


def main() -> None:
    img = Image.new("RGB", (W, H), CREAM[:3])
    d = ImageDraw.Draw(img)

    # Ben-Day dot field (actual dots, never a smooth gradient)
    pitch = 26
    for y in range(0, H, pitch):
        for x in range(0, W, pitch):
            offset = (y // pitch) % 2 * (pitch // 2)
            d.ellipse(
                [x + offset - 3, y - 3, x + offset + 3, y + 3],
                fill=SEPIA[:3],
            )

    # thick ink border — printed, not rendered
    for i in range(BORDER):
        d.rectangle([i, i, W - 1 - i, H - 1 - i], outline=INK[:3])

    anton = font(FONT_ANTON, 64)
    oswald = font(FONT_OSWALD, 26)
    oswald_sm = font(FONT_OSWALD, 20)
    mono_md = mono(22)
    mono_sm = mono(17)

    d.text((MARGIN, 40), "THE LAMARCY 4-TONE RAMPS", font=anton, fill=INK[:3])
    d.text(
        (MARGIN, 122),
        "FOUR VALUES PER SPRITE. HARD PIXELS ONLY. NO IN-BETWEENS.",
        font=oswald_sm,
        fill=DEEP[:3],
    )

    chip = 150
    gap = 44
    row_y = 190
    for label, chips in RAMP_ROWS:
        d.text((MARGIN, row_y), label, font=oswald, fill=INK[:3])
        cy = row_y + 44
        for i, (rgb, name, hexcode) in enumerate(chips):
            cx = MARGIN + i * (chip + gap)
            # hard offset shadow, then chip with ink border
            d.rectangle([cx + 8, cy + 8, cx + chip + 8, cy + chip + 8], fill=INK[:3])
            d.rectangle([cx, cy, cx + chip, cy + chip], fill=rgb[:3], outline=INK[:3], width=4)
            d.text((cx, cy + chip + 16), name, font=oswald_sm, fill=INK[:3])
            d.text((cx, cy + chip + 42), hexcode, font=mono_sm, fill=DEEP[:3])
        row_y = cy + chip + 86

    d.text(
        (MARGIN, H - 72),
        "LC-8BIT · PALETTE CARD · REC 2026 · CHS→ATL",
        font=mono_md,
        fill=INK[:3],
    )

    # exactly one heart mark
    heart = render(HEART, "teal").resize((7 * 8, 6 * 8), Image.NEAREST)
    img.paste(heart, (W - MARGIN - heart.width, H - 104), heart)

    out = EIGHTBIT / "palette-swatch.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
