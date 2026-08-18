"""Decode tests/out.gif with PIL and assert it matches what the encoder was
given. This is the check that the hand-written LZW is actually spec-correct."""
import json
import pathlib
import sys

from PIL import Image

here = pathlib.Path(__file__).parent
exp = json.loads((here / "expected.json").read_text())
im = Image.open(here / "out.gif")

assert im.size == (exp["w"], exp["h"]), f"size {im.size} != {(exp['w'], exp['h'])}"
n = getattr(im, "n_frames", 1)
assert n == len(exp["frames"]), f"{n} frames decoded, {len(exp['frames'])} encoded"

want_rgb = [tuple(c) for c in exp["palette"]]
for i, want in enumerate(exp["frames"]):
    im.seek(i)
    got = list(im.convert("RGB").getdata())
    bad = [(j, got[j], want_rgb[want[j]]) for j in range(len(want))
           if got[j] != want_rgb[want[j]]]
    if bad:
        j, g, w = bad[0]
        sys.exit(f"frame {i}: {len(bad)} wrong px; first at {j} got {g} want {w}")
    print(f"frame {i}: {len(want)} px exact")
print(f"GIF round-trip OK — {n} frames, {im.size[0]}x{im.size[1]}, 4 colours")
