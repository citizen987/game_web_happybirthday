"""Generate the PWA icons from assets/head.png.

Usage (from anywhere): python3 -I assets/icons/generate_icons.py
Requires Pillow. Output files are written next to this script.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ICONS_DIR = Path(__file__).resolve().parent
SOURCE = ICONS_DIR.parent / "head.png"

SKY_TOP = (0x2A, 0x4F, 0xC4)
SKY_BOTTOM = (0x6F, 0x9B, 0xF0)
GOLD = (0xFF, 0xD2, 0x3A)

# (filename, size, face scale relative to the icon, rounded corners, opaque)
# Maskable: the face must fit in the central safe circle (radius 40%), so a
# square of side <= 0.8 / sqrt(2) ~= 0.56 of the icon is always visible.
ICONS = [
    ("icon-192.png", 192, 0.78, True, False),
    ("icon-512.png", 512, 0.78, True, False),
    ("icon-512-maskable.png", 512, 0.56, False, True),
    ("apple-touch-icon.png", 180, 0.74, False, True),
]


def sky_gradient(size):
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(SKY_TOP, SKY_BOTTOM))
        draw.line([(0, y), (size, y)], fill=color + (255,))
    return img


def load_face():
    head = Image.open(SOURCE).convert("RGBA")
    bbox = head.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"{SOURCE} is fully transparent")
    return head.crop(bbox)


def build_icon(face, size, scale, rounded, opaque):
    icon = sky_gradient(size)

    # Gold ground strip, a nod to the game's coins.
    ground = round(size * 0.1)
    ImageDraw.Draw(icon).rectangle([0, size - ground, size, size], fill=GOLD + (255,))

    box = round(size * scale)
    ratio = min(box / face.width, box / face.height)
    resized = face.resize(
        (max(1, round(face.width * ratio)), max(1, round(face.height * ratio))),
        Image.LANCZOS,
    )
    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    icon.alpha_composite(resized, offset)

    if rounded and not opaque:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=round(size * 0.2), fill=255
        )
        icon.putalpha(mask)
    if opaque:
        icon = icon.convert("RGB")
    return icon


def main():
    face = load_face()
    for name, size, scale, rounded, opaque in ICONS:
        out = ICONS_DIR / name
        build_icon(face, size, scale, rounded, opaque).save(out, optimize=True)
        print(f"{out.relative_to(ICONS_DIR.parent.parent)}: {size}x{size}")


if __name__ == "__main__":
    main()
