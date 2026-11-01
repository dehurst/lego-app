"""Builds every app icon from design/logo-original.png.

Run from the repo root:  python3 design/make-icons.py

Why not use the logo file directly? It has rounded corners on a white
background. iOS and Android round icons themselves, so we rebuild it as a
full square of navy with the lettering centered.
"""
from PIL import Image

NAVY = (24, 33, 56, 255)  # #182138, sampled from the logo
SRC = "design/logo-original.png"
# Area of the original that holds the lettering plus some navy around it.
CROP = (60, 160, 534, 444)
MASTER = 600

logo = Image.open(SRC).convert("RGBA").crop(CROP)


def square(text_scale: float) -> Image.Image:
    """A navy square with the lettering centered, scaled to `text_scale`."""
    canvas = Image.new("RGBA", (MASTER, MASTER), NAVY)
    w, h = logo.size
    art = logo.resize((round(w * text_scale), round(h * text_scale)), Image.LANCZOS)
    canvas.paste(art, ((MASTER - art.width) // 2, (MASTER - art.height) // 2))
    return canvas


def save(img: Image.Image, path: str, size: int) -> None:
    img.resize((size, size), Image.LANCZOS).convert("RGB").save(path, optimize=True)
    print("wrote", path)


regular = square(1.0)
# Android "maskable" icons can be cropped to a circle, so shrink the text
# to keep it inside the safe zone.
maskable = square(0.8)

save(regular, "public/icon-512.png", 512)
save(regular, "public/icon-192.png", 192)
save(regular, "src/app/apple-icon.png", 180)
save(regular, "src/app/icon.png", 64)
save(maskable, "public/icon-maskable-512.png", 512)

# On-screen logo: just the lettering, on a transparent background. Imported from src/assets so Next.js fingerprints its URL and
# browsers never show a stale copy.
def knock_out_navy(img: Image.Image) -> Image.Image:
    """Turn the navy background transparent, keeping soft letter edges."""
    out = img.convert("RGBA")
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, _ = px[x, y]
            dist = max(abs(r - NAVY[0]), abs(g - NAVY[1]), abs(b - NAVY[2]))
            alpha = min(1.0, max(0.0, (dist - 12) / 60))
            if alpha == 0:
                px[x, y] = (0, 0, 0, 0)
            else:
                # "Un-blend" the navy out of edge pixels so they don't look dark.
                px[x, y] = tuple(
                    max(0, min(255, round(n + (c - n) / alpha)))
                    for c, n in zip((r, g, b), NAVY[:3])
                ) + (round(alpha * 255),)
    return out


knock_out_navy(logo).save("src/assets/logo-wordmark.png", optimize=True)
print("wrote src/assets/logo-wordmark.png")
