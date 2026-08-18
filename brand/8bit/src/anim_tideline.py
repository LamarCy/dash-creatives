"""
Task 4 (cont.) — seamless horizontal parallax scroll, GIF + MP4.

Loop maths lives in Scene.pan_for / Scene.loop_frames — the scene owns it
because the safe numbers depend on the scene width. Each layer pans a whole
multiple of its own pattern period, and the frame count is chosen so every
layer advances a whole number of pixels per frame. Both conditions must hold
or the loop ticks at the seam; the check at the bottom of this file asserts
frame 0 equals the wrapped frame.

Run:  python3 brand/8bit/src/anim_tideline.py
Out:  scenes/tideline/{day,night}/{16x9,9x16}/scroll@4x.{gif,mp4}
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from pixel import EIGHTBIT, RAMPS, render
from scene_tideline import FORMATS, Scene

FPS = 12
SCALE = 4
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


def frame(sc: Scene, f: int, ramp: str = "teal") -> Image.Image:
    grid = sc.flat(sc.pans(f))
    img = render(grid, ramp)
    return img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)


def write_gif(frames: list, out: Path) -> None:
    pal = [f.convert("P", palette=Image.ADAPTIVE, colors=4) for f in frames]
    pal[0].save(out, save_all=True, append_images=pal[1:],
                duration=int(1000 / FPS), loop=0, optimize=True, disposal=2)


def write_mp4(frames: list, out: Path) -> None:
    with tempfile.TemporaryDirectory() as td:
        for i, im in enumerate(frames):
            im.convert("RGB").save(Path(td) / f"f{i:04d}.png")
        cmd = [
            FFMPEG, "-y", "-loglevel", "error", "-framerate", str(FPS),
            "-i", str(Path(td) / "f%04d.png"),
            "-c:v", "libx264", "-preset", "slow", "-crf", "16",
            # yuv420p + even dimensions so it plays everywhere and uploads clean
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(out),
        ]
        subprocess.run(cmd, check=True)


def main() -> None:
    for variant, night in (("day", False), ("night", True)):
        for fmt, (w, h, hf) in FORMATS.items():
            sc = Scene(w, h, hf, night)
            L = sc.loop_frames
            frames = [frame(sc, f) for f in range(L)]
            out = EIGHTBIT / "scenes" / "tideline" / variant / fmt
            out.mkdir(parents=True, exist_ok=True)
            write_gif(frames, out / "scroll@4x.gif")
            write_mp4(frames, out / "scroll@4x.mp4")
            g = (out / "scroll@4x.gif").stat().st_size / 1e6
            m = (out / "scroll@4x.mp4").stat().st_size / 1e6
            print(f"{variant}/{fmt}: gif {g:.1f}MB  mp4 {m:.1f}MB  "
                  f"({frames[0].width}x{frames[0].height}, {L}f @ {FPS}fps "
                  f"= {L / FPS:.1f}s)")


def assert_seamless() -> None:
    """Frame 0 must be pixel-identical to the frame one full loop later."""
    for fmt, (w, h, hf) in FORMATS.items():
        for night in (False, True):
            sc = Scene(w, h, hf, night)
            L = sc.loop_frames
            if frame(sc, 0).tobytes() != frame(sc, L).tobytes():
                raise AssertionError(f"{fmt} {'night' if night else 'day'} does not loop")


if __name__ == "__main__":
    assert_seamless()
    main()
