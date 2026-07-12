from pathlib import Path
import math
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "promocionales"
OUT.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://transmisiones-nunez.netlify.app/"
LOGO_PATH = ROOT / "public" / "tnlogo.png"

BLUE = (0, 78, 168)
BLUE_DARK = (5, 25, 55)
BLUE_MID = (13, 96, 190)
BLUE_LIGHT = (23, 139, 230)
WHITE = (255, 255, 255)
INK = (7, 22, 45)
CYAN = (119, 215, 255)


def font(size, bold=False, black=False):
    candidates = []
    if black:
        candidates.extend([
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/seguisb.ttf",
        ])
    elif bold:
        candidates.extend([
            "C:/Windows/Fonts/seguisb.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
        ])
    candidates.extend([
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ])
    for item in candidates:
        if Path(item).exists():
            return ImageFont.truetype(item, size=size)
    return ImageFont.load_default(size=size)


F_TITLE = font(72, black=True)
F_TITLE_SMALL = font(58, black=True)
F_SUB = font(33, bold=True)
F_BODY = font(30)
F_BODY_BOLD = font(30, bold=True)
F_TAG = font(24, bold=True)
F_SMALL = font(22, bold=True)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def gradient(size, start, end, diagonal=True):
    w, h = size
    img = Image.new("RGB", size, start)
    pix = img.load()
    denom = (w + h) if diagonal else h
    for y in range(h):
        for x in range(w):
            t = (x + y) / denom if diagonal else y / h
            pix[x, y] = tuple(int(start[i] * (1 - t) + end[i] * t) for i in range(3))
    return img


def paste_logo(base, x, y, w):
    logo = Image.open(LOGO_PATH).convert("RGBA")
    ratio = logo.height / logo.width
    logo = logo.resize((w, int(w * ratio)), Image.LANCZOS)
    base.alpha_composite(logo, (x, y))
    return logo.size


def qr_image(size=250):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=2, box_size=12)
    qr.add_data(SITE_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color=BLUE_DARK, back_color="white").convert("RGBA")
    img = img.resize((size, size), Image.Resampling.NEAREST)

    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo_w = int(size * 0.25)
    logo = logo.resize((logo_w, int(logo_w * logo.height / logo.width)), Image.LANCZOS)
    badge = Image.new("RGBA", (logo_w + 34, logo.height + 34), (255, 255, 255, 245))
    bd = ImageDraw.Draw(badge)
    bd.rounded_rectangle((0, 0, badge.width - 1, badge.height - 1), radius=20, fill=(255, 255, 255, 245))
    badge.alpha_composite(logo, ((badge.width - logo.width) // 2, (badge.height - logo.height) // 2))
    img.alpha_composite(badge, ((size - badge.width) // 2, (size - badge.height) // 2))
    return img


def draw_gear(draw, cx, cy, r, color, width=5):
    teeth = 12
    pts = []
    for i in range(teeth * 2):
        ang = i * math.pi / teeth
        rr = r if i % 2 == 0 else r * 0.82
        pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
    draw.line(pts + [pts[0]], fill=color, width=width, joint="curve")
    draw.ellipse((cx - r * 0.38, cy - r * 0.38, cx + r * 0.38, cy + r * 0.38), outline=color, width=width)


def draw_vehicle_line(draw, x, y, scale, color):
    w = int(520 * scale)
    h = int(130 * scale)
    draw.line((x + 35, y + h * 0.72, x + w - 45, y + h * 0.72), fill=color, width=int(7 * scale))
    draw.arc((x + 80, y + 30, x + 260, y + 150), 190, 345, fill=color, width=int(7 * scale))
    draw.arc((x + 230, y + 0, x + 435, y + 150), 195, 350, fill=color, width=int(7 * scale))
    draw.arc((x + 30, y + h * 0.45, x + 160, y + h * 1.45), 200, 340, fill=color, width=int(7 * scale))
    draw.arc((x + w - 170, y + h * 0.45, x + w - 40, y + h * 1.45), 200, 340, fill=color, width=int(7 * scale))
    draw.ellipse((x + 85, y + h * 0.65, x + 145, y + h * 1.1), outline=color, width=int(7 * scale))
    draw.ellipse((x + w - 145, y + h * 0.65, x + w - 85, y + h * 1.1), outline=color, width=int(7 * scale))


def card_shadow(base, box, radius):
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(box, radius=radius, fill=(0, 35, 85, 50))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    base.alpha_composite(shadow)


def label(draw, xy, text, fill=BLUE):
    x, y = xy
    bbox = draw.textbbox((x, y), text, font=F_TAG)
    rounded(draw, (x - 18, y - 12, bbox[2] + 18, bbox[3] + 12), 22, (232, 244, 255), outline=(180, 215, 255), width=2)
    draw.text((x, y), text, font=F_TAG, fill=fill)


def poster_refacciones():
    img = gradient((1080, 1080), (247, 251, 255), (222, 237, 255), diagonal=False).convert("RGBA")
    draw = ImageDraw.Draw(img)

    draw.polygon([(760, 0), (1080, 0), (1080, 1080), (595, 1080)], fill=(10, 71, 155, 255))
    draw.polygon([(835, 0), (1080, 0), (1080, 1080), (720, 1080)], fill=(13, 103, 205, 255))
    for i in range(0, 1180, 110):
        draw.line((690, i, 1080, i - 250), fill=(255, 255, 255, 28), width=3)
    draw_gear(draw, 895, 240, 145, (255, 255, 255, 50), 7)
    draw_gear(draw, 1010, 690, 170, (255, 255, 255, 35), 7)

    paste_logo(img, 62, 58, 235)
    draw.text((64, 230), "REFACCIONES", font=F_TITLE, fill=INK)
    draw.text((64, 306), "PARA", font=F_TITLE_SMALL, fill=BLUE)
    draw.text((64, 366), "TRANSMISIÓN", font=F_TITLE_SMALL, fill=BLUE)
    draw.text((68, 462), "Venta, diagnóstico y reparación", font=F_SUB, fill=(74, 92, 116))
    draw.text((68, 506), "de vehículos y transmisiones.", font=F_SUB, fill=(74, 92, 116))

    label(draw, (70, 590), "CATÁLOGO Y APARTADO EN LÍNEA")

    items = ["Refacciones seleccionadas", "Diagnóstico profesional", "Reparación de transmisiones", "Atención directa en taller"]
    y = 680
    for item in items:
        draw.ellipse((72, y + 7, 90, y + 25), fill=BLUE_LIGHT)
        draw.text((108, y), item, font=F_BODY_BOLD, fill=INK)
        y += 52

    card_shadow(img, (690, 642, 1016, 1015), 36)
    rounded(draw, (690, 642, 1016, 1015), 36, WHITE)
    qr = qr_image(240)
    img.alpha_composite(qr, (733, 676))
    draw.text((735, 940), "Escanea y visita", font=F_BODY_BOLD, fill=BLUE_DARK)
    draw.text((752, 976), "Transmisiones Núñez", font=F_SMALL, fill=BLUE)

    draw_vehicle_line(draw, 112, 890, 0.72, (6, 70, 145, 170))
    draw.text((66, 1004), "transmisiones-nunez.netlify.app", font=F_SMALL, fill=(67, 89, 116))
    img.save(OUT / "anuncio-refacciones-transmisiones-nunez.png")


def poster_reparacion():
    img = gradient((1080, 1080), BLUE_DARK, (5, 92, 184), diagonal=True).convert("RGBA")
    draw = ImageDraw.Draw(img)

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, 1080, 1080), fill=(4, 22, 54, 88))
    img.alpha_composite(overlay)
    for x in range(-100, 1180, 95):
        draw.line((x, 0, x - 360, 1080), fill=(255, 255, 255, 22), width=2)
    draw.ellipse((760, -150, 1280, 370), fill=(61, 160, 255, 70))
    draw_gear(draw, 830, 705, 210, (255, 255, 255, 72), 8)
    draw_gear(draw, 650, 850, 118, (119, 215, 255, 78), 7)

    draw.rounded_rectangle((54, 48, 1028, 1030), radius=34, outline=(255, 255, 255, 95), width=2)
    rounded(draw, (78, 82, 332, 172), 20, (255, 255, 255, 245))
    paste_logo(img, 98, 102, 205)

    draw.text((78, 248), "REPARACIÓN", font=F_TITLE, fill=WHITE)
    draw.text((78, 327), "Y DIAGNÓSTICO", font=F_TITLE, fill=CYAN)
    draw.text((82, 430), "Transmisiones automáticas, revisión de fallas,", font=F_BODY, fill=(222, 237, 255))
    draw.text((82, 470), "venta de refacciones y servicio preventivo.", font=F_BODY, fill=(222, 237, 255))

    rounded(draw, (82, 564, 615, 800), 26, (255, 255, 255, 245))
    draw.text((118, 602), "SERVICIOS DEL TALLER", font=F_TAG, fill=BLUE)
    services = ["Diagnóstico de vehículos", "Reparación de transmisiones", "Venta y apartado de refacciones"]
    y = 652
    for svc in services:
        draw.rounded_rectangle((118, y + 5, 140, y + 27), radius=7, fill=BLUE_LIGHT)
        draw.text((158, y), svc, font=F_SMALL, fill=INK)
        y += 42

    card_shadow(img, (681, 556, 986, 938), 32)
    rounded(draw, (681, 556, 986, 938), 32, WHITE)
    qr = qr_image(225)
    img.alpha_composite(qr, (721, 592))
    draw.text((722, 842), "Escanea para agendar", font=F_SMALL, fill=BLUE_DARK)
    draw.text((753, 875), "o ver catálogo", font=F_SMALL, fill=BLUE)

    rounded(draw, (82, 835, 584, 955), 24, (255, 255, 255, 245))
    draw.text((118, 862), "Visítanos en taller", font=F_SUB, fill=BLUE_DARK)
    draw.text((118, 910), "Consulta, aparta y agenda en línea", font=F_SMALL, fill=(65, 84, 110))

    draw.text((82, 980), "Transmisiones Núñez", font=F_SUB, fill=WHITE)
    draw.text((82, 1020), "Servicio automotriz especializado", font=F_SMALL, fill=(204, 226, 255))
    img.save(OUT / "anuncio-reparacion-transmisiones-nunez.png")


if __name__ == "__main__":
    poster_refacciones()
    poster_reparacion()
    print(OUT / "anuncio-refacciones-transmisiones-nunez.png")
    print(OUT / "anuncio-reparacion-transmisiones-nunez.png")
