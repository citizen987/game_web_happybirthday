"""Generate the Open Graph / link-preview image (assets/og-image.png, 1200x630).

Shown by WhatsApp, Telegram, etc. when someone pastes the game URL.
Run from the repo root:  python3 -I assets/og/generate_og.py
Requires Pillow and a bold sans font (Noto Sans or DejaVu Sans).
"""
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
HEAD = ROOT / "assets" / "head.png"
OUT = ROOT / "assets" / "og-image.png"
W, H = 1200, 630

SKY = ["#2a4fc4", "#3460d0", "#3f72dc", "#4b84e6", "#5a97ee", "#6aa9f4", "#7dbaf8", "#92caf9"]
CONFETTI = ["#ff5a5a", "#ffd23a", "#5affb0", "#6ab8ff", "#ff8af0", "#ffffff"]
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit(f"No bold font found; install one of: {FONT_CANDIDATES}")


def outlined(draw, xy, text, font, fill, outline, width):
    draw.text(xy, text, font=font, fill=fill, stroke_width=width, stroke_fill=outline)


def main():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)

    band = H // len(SKY) + 1
    for i, color in enumerate(SKY):
        d.rectangle([0, i * band, W, (i + 1) * band], fill=color)

    ground_y = 540
    cell = 30
    for x in range(0, W, cell):
        for y in range(ground_y, H, cell):
            d.rectangle([x, y, x + cell, y + cell], fill="#9a5224" if ((x + y) // cell) % 2 else "#b8682e")
    d.rectangle([0, ground_y - 12, W, ground_y + 2], fill="#4cbc38")
    d.rectangle([0, ground_y - 12, W, ground_y - 8], fill="#a6f06a")

    rng = random.Random(42)
    for _ in range(120):
        x, y = rng.randrange(W), rng.randrange(ground_y - 20)
        w = rng.choice([8, 14])
        d.rectangle([x, y, x + w, y + 8], fill=rng.choice(CONFETTI))

    # Essentials (title + face) inside the central 630x630 square: WhatsApp often
    # crops link thumbnails to a centered square. Secondary text goes on the sides.
    def centered(y, text, font, fill, outline, width):
        tw = d.textlength(text, font=font)
        outlined(d, ((W - tw) / 2, y), text, font, fill, outline, width)

    centered(18, "¡FELICIDADES,", load_font(74), "#ffd23a", "#1d2b8f", 9)
    centered(98, "DAVID!", load_font(104), "#ffd23a", "#1d2b8f", 11)

    head = Image.open(HEAD).convert("RGBA").crop((0, 18, 256, 238))
    head_h = 320
    head = head.resize((int(head.width * head_h / head.height), head_h), Image.LANCZOS)
    hx, hy = (W - head.width) // 2, ground_y - head_h + 6
    shadow = Image.new("RGBA", head.size, (0, 0, 0, 0))
    shadow.putalpha(head.getchannel("A").point(lambda a: int(a * 0.35)))
    img.paste((0, 0, 0), (hx + 10, hy + 14), shadow)
    img.paste(head, (hx, hy), head)

    # Side texts stay fully outside the central square (x < 285 and x > 915).
    side = load_font(30)
    outlined(d, (28, 300), "David Dash", load_font(42), "#ffffff", "#1d2b8f", 7)
    outlined(d, (30, 360), "un juego para", side, "#ffffff", "#1d2b8f", 6)
    outlined(d, (30, 398), "su cumpleaños", side, "#ffffff", "#1d2b8f", 6)
    outlined(d, (935, 330), "Un regalo de", side, "#ffe9a8", "#1d2b8f", 6)
    outlined(d, (935, 368), "Rubén Codina", side, "#ffe9a8", "#1d2b8f", 6)

    # "Play" call to action on the ground, with a drawn triangle (not a font glyph)
    cta = "Juega y felicítale"
    cta_font = load_font(34)
    cw = d.textlength(cta, font=cta_font)
    cx = (W - cw) / 2 + 18
    d.polygon([(cx - 40, 574), (cx - 40, 606), (cx - 14, 590)], fill="#ffffff", outline="#3e230f")
    outlined(d, (cx, 568), cta, cta_font, "#ffffff", "#3e230f", 6)

    img.save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} {img.size} {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
