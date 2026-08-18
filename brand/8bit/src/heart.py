"""Export the shared 8-bit heart mark. Exactly one per layout — see palette.md.

Run:  python3 brand/8bit/src/heart.py
Out:  brand/8bit/sprites/heart@{1,4,8}x.png (tiffany) + heart-ink@{1,4,8}x.png
"""

from pixel import EIGHTBIT, HEART, render, save_scaled

def main() -> None:
    out = EIGHTBIT / "sprites"
    save_scaled(render(HEART, "teal"), out / "heart")
    save_scaled(render([r.replace("T", "K") for r in HEART], "teal"), out / "heart-ink")
    print("wrote heart@{1,4,8}x.png and heart-ink@{1,4,8}x.png")

if __name__ == "__main__":
    main()
