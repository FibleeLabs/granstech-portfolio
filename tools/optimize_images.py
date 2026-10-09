"""
Builds the web-ready image set in assets/img/ from the source files in images/.

Run from the project root:   python tools/optimize_images.py
Requires Pillow (pip install pillow). Safe to re-run; outputs are overwritten.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images"
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)


def load(name, crop=None, bg=(255, 255, 255)):
    im = Image.open(SRC / name)
    if crop:
        im = im.crop(crop)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        flat = Image.new("RGB", im.size, bg)
        flat.paste(im, mask=im.split()[-1])
        im = flat
    return im.convert("RGB")


def _runs(idx):
    out, start, prev = [], None, None
    for i in idx:
        if start is None:
            start = prev = i
        elif i == prev + 1:
            prev = i
        else:
            out.append((start, prev))
            start = prev = i
    if start is not None:
        out.append((start, prev))
    return out


def frame_crop(im, edge=48):
    """Remove the black picture frames that were drawn around photos in the slide deck."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    def dark_frac_row(y):
        return sum(px[x, y] < 60 for x in range(0, w, 2)) / (w / 2)
    def dark_frac_col(x):
        return sum(px[x, y] < 60 for y in range(0, h, 2)) / (h / 2)
    top = max([y + 1 for y in range(edge) if dark_frac_row(y) > 0.55], default=0)
    bottom = min([y for y in range(h - edge, h) if dark_frac_row(y) > 0.55], default=h)
    left = max([x + 1 for x in range(edge) if dark_frac_col(x) > 0.55], default=0)
    right = min([x for x in range(w - edge, w) if dark_frac_col(x) > 0.55], default=w)
    return im.crop((left, top, right, bottom))


def trim_islands(im, pad=0.06):
    """Crop product shots to the main object, dropping slivers of neighbouring photos at the edges."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    cols = [x for x in range(w) if any(px[x, y] < 225 for y in range(0, h, 3))]
    rows = [y for y in range(h) if any(px[x, y] < 225 for x in range(0, w, 3))]
    def main_span(idx, gap=6):
        spans = []
        for a, b in _runs(idx):
            if spans and a - spans[-1][1] <= gap:
                spans[-1] = (spans[-1][0], b)
            else:
                spans.append((a, b))
        return max(spans, key=lambda s: s[1] - s[0]) if spans else None
    cx, cy = main_span(cols), main_span(rows)
    if not cx or not cy:
        return im
    box = im.crop((cx[0], cy[0], cx[1] + 1, cy[1] + 1))
    bw, bh = box.size
    side_w, side_h = round(bw * (1 + 2 * pad)), round(bh * (1 + 2 * pad))
    canvas = Image.new("RGB", (side_w, side_h), (255, 255, 255))
    canvas.paste(box, ((side_w - bw) // 2, (side_h - bh) // 2))
    return canvas


def save_webp(im, out_name, max_w=None, max_h=None, quality=80):
    im = im.copy()
    w, h = im.size
    scale = 1.0
    if max_w and w > max_w:
        scale = min(scale, max_w / w)
    if max_h and h > max_h:
        scale = min(scale, max_h / h)
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    path = OUT / out_name
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"{out_name:40s} {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB")
    return im.size


# Plant aerial photo, cropped out of the original deck cover slide
aerial = load("page_1.png", crop=(86, 44, 2460, 1124))
for w in (2000, 1280, 800):
    save_webp(aerial, f"plant-aerial-{w}.webp", max_w=w, quality=78)

# Open Graph / social share image (1200x630, JPEG for widest support)
og = aerial.copy()
ow, oh = og.size
target_ratio = 1200 / 630
if ow / oh > target_ratio:
    nw = round(oh * target_ratio)
    og = og.crop(((ow - nw) // 2, 0, (ow - nw) // 2 + nw, oh))
else:
    nh = round(ow / target_ratio)
    og = og.crop((0, (oh - nh) // 2, ow, (oh - nh) // 2 + nh))
og = og.resize((1200, 630), Image.LANCZOS)
og.save(OUT / "og-image.jpg", "JPEG", quality=82, optimize=True, progressive=True)
print("og-image.jpg 1200x630")

save_webp(load("hero_red_godown_enhanced.png"), "plant-shed.webp", max_w=1200)

# People & partner interaction collage from the deck
save_webp(load("page_21.png", crop=(36, 318, 2636, 1458)), "people-collage.webp", max_w=1600, quality=76)

# Casting simulation screenshots and fab-to-cast photo from the deck
save_webp(load("page_13.png", crop=(53, 373, 1140, 1387)), "casting-simulation.webp", max_w=1000)
save_webp(load("page_24.png", crop=(106, 568, 900, 1122)), "fab-to-cast-strainer.webp", max_w=900)

# Process floor (real photographs)
for name, out in [
    ("moulding_co2.png", "process-moulding.webp"),
    ("induction_furnace.png", "process-melting.webp"),
    ("heat_treatment.png", "process-heat-treatment.webp"),
    ("fettling_stations.png", "process-fettling.webp"),
    ("pickling_tanks.png", "process-pickling.webp"),
    ("welding_operator.png", "process-welding.webp"),
]:
    save_webp(frame_crop(load(name)), out, max_w=1100)

# Quality labs and NDE (crop boxes cut away the slide frames and baked-in captions)
for name, out, box in [
    ("quality_lab_1.png", "lab-spectro.webp", (13, 17, 621, 470)),
    ("quality_lab_2.png", "lab-utm-impact.webp", (65, 16, 713, 484)),
    ("quality_lab_3.png", "lab-xray-film.webp", (140, 16, 772, 499)),
    ("quality_lab_4.png", "lab-hardness.webp", (13, 52, 613, 567)),
    ("quality_lab_5.png", "lab-wet-chemical.webp", (60, 54, 707, 537)),
    ("quality_lab_6.png", "lab-sieve.webp", (170, 54, 770, 537)),
    ("nde_mpi.png", "nde-mpi.webp", (6, 17, 585, 487)),
    ("nde_ut.png", "nde-ut.webp", (12, 20, 549, 516)),
    ("nde_dp_spray.png", "nde-dp.webp", None),
    ("nde_visual.png", "nde-visual.webp", None),
]:
    save_webp(load(name, crop=box), out, max_w=900)

# Product photographs
products = [f"valve_prod_{i}.png" for i in range(1, 9)]
products += [f"pump_prod_{i}.png" for i in range(1, 9)]
products += [f"defense_prod_{i}.png" for i in range(1, 9)]
products += [f"defense_component_{i}.png" for i in range(1, 4)]
products += [f"offhighway_prod_{i}.png" for i in range(1, 7)]
for name in products:
    save_webp(trim_islands(load(name)), name.replace("_", "-").replace(".png", ".webp"), max_w=720)

# Customer appreciation letters
for name in ("cert_thermax.png", "cert_propel.png", "cert_magtorq.png"):
    save_webp(load(name), name.replace("_", "-").replace(".png", ".webp"), max_h=900, quality=82)

# Partner logos (keep on white)
save_webp(load("client_partner_logos.png"), "partner-logos.webp", max_w=1024, quality=88)

# Default org-chart avatar
save_webp(load("profile_avatar.jpg"), "avatar.webp", max_w=160)

# Logo, favicons and app icons
logo = Image.open(SRC / "gt_logo.png").convert("RGBA")
for size in (96, 192):
    l = logo.resize((size, size), Image.LANCZOS)
    l.save(OUT / f"logo-{size}.png", optimize=True)
    l.save(OUT / f"logo-{size}.webp", "WEBP", quality=90)
logo.resize((48, 48), Image.LANCZOS).save(
    ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
)
logo.resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png", optimize=True)
for size, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    inner = round(size * 0.86)
    canvas.paste(logo.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2,
                 logo.resize((inner, inner), Image.LANCZOS))
    canvas.convert("RGB").save(OUT / name, optimize=True)
print("logo + icons done")

# Record final dimensions so the build can write exact width/height attributes
import json
sizes = {}
for f in sorted(OUT.iterdir()):
    if f.suffix.lower() in (".webp", ".png", ".jpg"):
        with Image.open(f) as im:
            sizes[f.name] = list(im.size)
(OUT / "sizes.json").write_text(json.dumps(sizes, indent=0))
print("sizes.json written")
