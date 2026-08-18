"""
Task 2 (cont.) — the LamarCy WALK cycle, 4 frames.

Built by transformation, not by redrawing: the walk frames reuse the idle
torso/head (so the character can never drift between poses) and swap only
the legs plus a 1px body bob. Guitar moves to his back for walking — a man
walking with a guitar carries it slung, and it keeps the silhouette clean
at 1x.

Frame order: contact-left, pass-left(up), contact-right, pass-right(up).

Run:  python3 brand/8bit/src/sprite_lamarcy_walk.py
Out:  sprites/lamarcy/{teal,sepia}/walk{1..4}@{1,4,8}x.png + walk-sheet + walk.gif
"""

from PIL import Image

from pixel import EIGHTBIT, RAMPS, blank, overlay, parse_grid, render, save_scaled, save_sprite

# --- upper body: cap, face, denim jacket. Shared by every walk frame. -----
# 48 wide. Rows 0..29 (head through jacket hem); legs are appended per frame.
UPPER = parse_grid(
    """
................................................
................................................
......................KKKTKKK...................
....................KKKKKKKKKKK.................
...................KKKKKKKKKKKKK................
...................KKKKKKTKKKKKK................
...................KKKKKTTTKKKKK................
...................KKKKKTKTKKKKK................
.................KKKKKKKKKKKKKKKKK..............
...................KDDDDDDDDDDDK................
...................KDDKKDDDKKDDK................
...................KDDKKDDDKKDDK................
...................KDDDDDDDDDDDK................
...................KDDDDDKDDDDDK................
...................KKDDDKKKDDDKK................
...................KKKKKKKKKKKKK................
......................KDDDDDK...................
.................KKKKKKKDDDKKKKKKK..............
.................KTTTTTKCCCKTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTKKKTCCCCCTKKKTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KTTTTTCCCCCTTTTTK..............
.................KKKKKKKKKTKKKKKKK..............
"""
)

# --- the guitar, slung across his back ------------------------------------
# Drawn as a diagonal neck rising over his right shoulder plus a sliver of
# body at his left hip. The middle of the instrument is deliberately hidden
# behind the torso (the torso is stamped after it), which is what makes it
# read as "on his back" instead of a floating object beside him.

GUITAR_BODY = parse_grid(
    """
...KKKK...
..KTTTTK..
.KTTTTTTK.
KTTTTTTTTK
KTTTKTTTTK
KTTKKKTTTK
KTTTKTTTTK
KTTTTTTTTK
.KTTTTTTK.
..KTTTTK..
...KKKK...
"""
)

HEADSTOCK = parse_grid(
    """
.KKKK
DKTTK
.KTTK
DKTTK
.KKKK
"""
)


def guitar_layer() -> list[str]:
    """Body tucked behind his left side, short neck angling up, headstock."""
    grid = [["." for _ in range(48)] for _ in range(48)]
    _stamp(grid, 10, 22, GUITAR_BODY)          # cols 17+ get hidden by the torso
    for i in range(11):                        # neck: drifts one column left per 3 rows
        _stamp(grid, 13 - i // 3, 22 - i, ["KTTK"])
    _stamp(grid, 9, 8, HEADSTOCK)
    return ["".join(r) for r in grid]


# --- legs, drawn programmatically -----------------------------------------
# Hand-typed leg grids kept coming out symmetric (both legs splayed the same
# way), which reads as a bounce instead of a gait. Drawing them from column
# tracks instead guarantees the two contact frames are true mirrors.
#
# The torso spans cols 17..33, so its centre column is 25 and a horizontal
# mirror maps x -> 50 - x - (width-1). A 6-wide leg at x=19 mirrors to x=26.

LEG_W = 6          # KCCCCK
HIP_ROW = 30
LEG_BOTTOM = 42    # last row of denim before the sneaker
PLANTED_X, SWING_X = 27, 20


def _stamp(grid, x, y, cells):
    for dy, row in enumerate(cells):
        for dx, code in enumerate(row):
            if code == "." or not (0 <= y + dy < 48 and 0 <= x + dx < 48):
                continue
            grid[y + dy][x + dx] = code


def _leg(grid, track, bottom):
    """Draw one leg down a list of (row, x) columns, then a sneaker."""
    for row, x in track:
        _stamp(grid, x, row, ["K" + "C" * (LEG_W - 2) + "K"])
    foot_x = track[-1][1] - 1
    _stamp(grid, foot_x, bottom + 1, ["KKKKKKKK", "KCCCCCCK", "KKKKKKKK"])


def _vertical(x, top=HIP_ROW, bottom=LEG_BOTTOM):
    return [(r, x) for r in range(top, bottom + 1)]


def _stride(x0, direction, top=HIP_ROW, bottom=LEG_BOTTOM):
    """Leg swinging out: drifts one column every two rows."""
    return [(r, x0 + direction * ((r - top) // 2)) for r in range(top, bottom + 1)]


def legs_layer(key: str) -> list[list[str]]:
    grid = [["." for _ in range(48)] for _ in range(48)]
    if key == "contact_l":
        _leg(grid, _stride(SWING_X, -1), LEG_BOTTOM)
        _leg(grid, _vertical(PLANTED_X), LEG_BOTTOM)
    elif key == "contact_r":
        _leg(grid, _vertical(SWING_X), LEG_BOTTOM)
        _leg(grid, _stride(PLANTED_X, +1), LEG_BOTTOM)
    elif key == "pass_l":
        # left foot lifted 2px mid-stride, right planted
        _leg(grid, _vertical(SWING_X, bottom=LEG_BOTTOM - 2), LEG_BOTTOM - 2)
        _leg(grid, _vertical(PLANTED_X), LEG_BOTTOM)
    else:  # pass_r
        _leg(grid, _vertical(SWING_X), LEG_BOTTOM)
        _leg(grid, _vertical(PLANTED_X, bottom=LEG_BOTTOM - 2), LEG_BOTTOM - 2)
    return ["".join(r) for r in grid]


FRAMES = ["contact_l", "pass_l", "contact_r", "pass_r"]
BOB = {"contact_l": 0, "pass_l": -1, "contact_r": 0, "pass_r": -1}


def build_frame(key: str) -> list[str]:
    """Guitar on back, then torso over it, then legs. 48x48 out."""
    canvas = blank(48, 48)
    bob = BOB[key]
    canvas = overlay(canvas, guitar_layer(), ox=0, oy=bob)
    canvas = overlay(canvas, UPPER, ox=0, oy=bob)
    canvas = overlay(canvas, legs_layer(key), ox=0, oy=bob)
    return canvas


def main() -> None:
    frames = {k: build_frame(k) for k in FRAMES}
    for i, key in enumerate(FRAMES, start=1):
        rows = frames[key]
        assert len(rows) == 48 and len(rows[0]) == 48, f"{key} is not 48x48"
        save_sprite(rows, EIGHTBIT / "sprites" / "lamarcy", f"walk{i}")

    for ramp in RAMPS:
        imgs = [render(frames[k], ramp) for k in FRAMES]

        # horizontal 4-frame strip
        sheet = Image.new("RGBA", (48 * 4, 48), (0, 0, 0, 0))
        for i, im in enumerate(imgs):
            sheet.paste(im, (i * 48, 0), im)
        save_scaled(sheet, EIGHTBIT / "sprites" / "lamarcy" / ramp / "walk-sheet")

        # looping GIF at 4x — nearest-neighbor, 8 fps
        big = [im.resize((48 * 4, 48 * 4), Image.NEAREST) for im in imgs]
        flat = []
        for im in big:
            bg = Image.new("RGBA", im.size, RAMPS[ramp]["C"])
            bg.paste(im, (0, 0), im)
            flat.append(bg.convert("P", palette=Image.ADAPTIVE, colors=4))
        gif = EIGHTBIT / "sprites" / "lamarcy" / ramp / "walk.gif"
        flat[0].save(gif, save_all=True, append_images=flat[1:], duration=125, loop=0)

    print("wrote walk1-4, walk-sheet, walk.gif in both ramps")


if __name__ == "__main__":
    main()
