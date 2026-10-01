"""Generate MandarinPath icons: green field, burgundy Chinese dragon (龙).

Draws a serpentine Chinese dragon rather than the round mascot face used in
the earlier demo: horned head facing left, undulating scaled body, clawed
legs, dorsal spines, whiskers and a pearl. Supersampled 4x and downsampled
with LANCZOS so the curves stay clean at icon sizes.
"""
from PIL import Image, ImageDraw
import math

GREEN = (34, 150, 94)          # field
BURGUNDY = (128, 24, 46)       # dragon body
BURGUNDY_DK = (92, 14, 32)     # shadow / outline
BURGUNDY_LT = (168, 52, 74)    # belly + scale highlights
GOLD = (222, 178, 74)
BONE = (247, 240, 230)
SS = 4  # supersample factor


def body_path(t):
    """Serpentine spine from head (t=0, left) to tail tip (t=1, right)."""
    u = 0.26 + 0.62 * t
    amp = 0.155 * (1.0 - 0.45 * t)
    v = 0.50 + amp * math.sin(2 * math.pi * (1.35 * t - 0.15))
    return u, v


def body_width(t):
    """Thick at the shoulders, tapering to a point at the tail."""
    return 0.150 * (1.0 - 0.62 * t) * (1.0 - 0.22 * math.sin(math.pi * t))


def draw_dragon(size, pad_ratio=0.0):
    N = size * SS
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = int(N * pad_ratio)
    w = N - 2 * pad
    radius = int(w * 0.22)
    d.rounded_rectangle((pad, pad, N - pad, N - pad), radius=radius, fill=GREEN + (255,))

    def P(u, v):
        return (pad + u * w, pad + v * w)

    # ── body: a tapering polyline built from overlapping discs ──────────
    steps = 260
    for i in range(steps + 1):
        t = i / steps
        u, v = body_path(t)
        r = body_width(t) * w / 2
        x, y = P(u, v)
        d.ellipse((x - r, y - r, x + r, y + r), fill=BURGUNDY + (255,))

    # belly highlight along the underside
    for i in range(steps + 1):
        t = i / steps
        u, v = body_path(t)
        r = body_width(t) * w / 2
        x, y = P(u, v)
        hr = r * 0.34
        d.ellipse((x - hr, y + r * 0.34 - hr, x + hr, y + r * 0.34 + hr), fill=BURGUNDY_LT + (255,))

    # scale arcs across the back
    for i in range(2, steps, 7):
        t = i / steps
        u, v = body_path(t)
        r = body_width(t) * w / 2
        x, y = P(u, v)
        sr = r * 0.46
        d.arc((x - sr, y - sr * 1.5, x + sr, y + sr * 1.5), start=200, end=340,
              fill=BURGUNDY_DK + (255,), width=max(2, int(w * 0.011)))

    # dorsal spines along the top edge
    for i in range(4, steps - 10, 11):
        t = i / steps
        u, v = body_path(t)
        x, y = P(u, v - body_width(t) * 0.46)
        spike = body_width(t) * w * 0.62
        d.polygon([(x - spike * 0.42, y + spike * 0.20),
                   (x + spike * 0.42, y + spike * 0.20),
                   (x, y - spike * 0.92)], fill=BURGUNDY_DK + (255,))

    # ── legs: three clawed limbs ───────────────────────────────────────
    for (lt, lu, lv) in [(0.36, 0.72, 0.74), (0.58, 0.40, 0.38), (0.76, 0.84, 0.86)]:
        tu, tv = body_path(lt)
        ax, ay = P(tu, tv + body_width(lt) * 0.35)
        kx, ky = P(lu * 0.5 + tu * 0.5, (tv + lv) / 2 + 0.06)
        fx, fy = P(lu, lv)
        lw = max(3, int(w * 0.030))
        d.line([ax, ay, kx, ky, fx, fy], fill=BURGUNDY_DK + (255,), width=lw, joint="curve")
        for ang in (-0.42, 0.0, 0.42):
            cx2 = fx + math.cos(math.pi / 2 + ang) * w * 0.055
            cy2 = fy + abs(math.sin(math.pi / 2 + ang)) * w * 0.055
            d.line([fx, fy, cx2, cy2], fill=GOLD + (255,), width=max(2, int(w * 0.016)))

    # ── mane: spiky fur collar behind the head ─────────────────────────
    hu, hv = 0.245, 0.450
    hx, hy = P(hu, hv)
    mane_r = w * 0.150
    for a in range(0, 360, 24):
        rad = math.radians(a)
        axp = hx + math.cos(rad) * mane_r * 1.42
        ayp = hy + math.sin(rad) * mane_r * 1.42
        d.polygon([(axp + math.cos(rad + 1.57) * w * 0.050,
                    ayp + math.sin(rad + 1.57) * w * 0.050),
                   (axp + math.cos(rad - 1.57) * w * 0.050,
                    ayp + math.sin(rad - 1.57) * w * 0.050),
                   (axp, ayp)], fill=BURGUNDY_DK + (255,))
    d.ellipse((hx - mane_r, hy - mane_r, hx + mane_r, hy + mane_r), fill=BURGUNDY + (255,))

    # ── head ───────────────────────────────────────────────────────────
    # Elongated, not round: a circle here reads as a frog. The skull is wide
    # but short, and the snout does most of the work.
    head_r = w * 0.108
    d.ellipse((hx - head_r * 1.18, hy - head_r * 0.98,
               hx + head_r * 0.86, hy + head_r * 0.86), fill=BURGUNDY + (255,))

    snout_len = w * 0.150
    snout_h = head_r * 0.86
    sx = hx - head_r * 0.70
    sy = hy + head_r * 0.08
    # upper muzzle, tapering to the nose
    d.polygon([(sx + head_r * 0.30, sy - snout_h * 0.74),
               (sx - snout_len, sy - snout_h * 0.40),
               (sx - snout_len, sy + snout_h * 0.18),
               (sx + head_r * 0.30, sy + snout_h * 0.52)], fill=BURGUNDY + (255,))

    # lower jaw, hinged open
    d.polygon([(sx - snout_len * 0.86, sy + snout_h * 0.30),
               (sx - snout_len * 0.24, sy + snout_h * 0.56),
               (sx + head_r * 0.42, sy + snout_h * 0.94),
               (sx + head_r * 0.16, sy + snout_h * 1.16)], fill=BURGUNDY_DK + (255,))

    # teeth
    tw = max(2, int(w * 0.010))
    for k in range(4):
        tx = sx - snout_len * (0.84 - 0.22 * k)
        d.polygon([(tx - tw * 0.9, sy + snout_h * 0.26),
                   (tx + tw * 0.9, sy + snout_h * 0.26),
                   (tx, sy + snout_h * 0.26 + tw * 2.4)], fill=BONE + (255,))
    for k in range(3):
        tx = sx - snout_len * (0.78 - 0.24 * k)
        d.polygon([(tx - tw * 0.9, sy + snout_h * 0.62),
                   (tx + tw * 0.9, sy + snout_h * 0.62),
                   (tx, sy + snout_h * 0.62 - tw * 2.2)], fill=BONE + (255,))

    # nostrils + brow ridges
    for dx in (0.10, 0.30):
        nx = sx - snout_len * (0.90 - dx)
        d.ellipse((nx, sy - snout_h * 0.30,
                   nx + tw * 1.7, sy - snout_h * 0.30 + tw * 1.7), fill=BURGUNDY_DK + (255,))
    d.line([(hx - head_r * 1.05, hy - head_r * 0.44), (hx - head_r * 0.22, hy - head_r * 0.60)],
           fill=BURGUNDY_DK + (255,), width=max(2, int(w * 0.018)))

    # eyes: two, set wide and slanted — dragons are not cyclopses
    er = w * 0.030
    for ex_off, ey_off, tilt in ((-0.86, -0.20, -1), (-0.30, -0.30, 1)):
        ex, ey = hx + head_r * ex_off, hy + head_r * ey_off
        d.ellipse((ex - er * 1.15, ey - er * 0.86, ex + er * 1.15, ey + er * 0.86), fill=GOLD + (255,))
        pr = er * 0.40
        d.ellipse((ex - pr + tilt * er * 0.22, ey - pr * 1.5, ex + pr + tilt * er * 0.22, ey + pr * 0.5),
                  fill=(24, 16, 12, 255))

    # horns, swept back and branched
    hw = max(3, int(w * 0.024))
    for sign, hx_off in ((1, -0.52), (-1, -0.16)):
        bx = hx + head_r * hx_off
        by = hy - head_r * 0.80
        d.line([bx, by,
                bx + sign * w * 0.048, by - w * 0.066,
                bx + sign * w * 0.014, by - w * 0.124],
               fill=BURGUNDY_DK + (255,), width=hw, joint="curve")
        # small back-swept barb
        d.line([bx + sign * w * 0.026, by - w * 0.048,
                bx + sign * w * 0.070, by - w * 0.040],
               fill=BURGUNDY_DK + (255,), width=max(2, int(w * 0.014)))

    # whiskers curling forward
    ww = max(2, int(w * 0.012))
    for k, off in enumerate((-0.34, 0.10)):
        wx = sx - snout_len * 0.94
        wy = sy + snout_h * (off + 0.12)
        d.line([wx, wy,
                wx - w * 0.066, wy - w * 0.048 + k * w * 0.026,
                wx - w * 0.112, wy + w * 0.020 + k * w * 0.030],
               fill=BURGUNDY_DK + (255,), width=ww, joint="curve")

    # ── pearl orb held before the mouth ────────────────────────────────
    prr = w * 0.046
    pxp, pyp = sx - snout_len - prr * 1.55, sy + snout_h * 0.04
    d.ellipse((pxp - prr, pyp - prr, pxp + prr, pyp + prr), fill=GOLD + (255,))
    d.ellipse((pxp - prr * 0.42, pyp - prr * 0.54, pxp - prr * 0.04, pyp - prr * 0.18),
              fill=(255, 246, 218, 255))

    # ── tail flame ─────────────────────────────────────────────────────
    tu, tv = body_path(1.0)
    tx, ty = P(tu, tv)
    fl = w * 0.088
    d.polygon([(tx - fl * 0.30, ty + fl * 0.20),
               (tx + fl * 0.95, ty - fl * 0.72),
               (tx + fl * 0.34, ty - fl * 0.10),
               (tx + fl * 1.02, ty + fl * 0.34),
               (tx - fl * 0.24, ty + fl * 0.52)], fill=BURGUNDY_DK + (255,))

    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    import os
    os.makedirs("icons", exist_ok=True)

    for size in (192, 512):
        draw_dragon(size).save(f"icons/icon-{size}.png")

    # Maskable keeps art inside the 80% safe zone.
    draw_dragon(512, pad_ratio=0.10).save("icons/icon-maskable-512.png")

    # Apple touch icon: opaque, no rounded corners (iOS masks it).
    touch = draw_dragon(180)
    bg = Image.new("RGB", (180, 180), GREEN)
    bg.paste(touch, (0, 0), touch)
    bg.save("icons/apple-touch-icon.png")

    draw_dragon(1024).save("icons/icon-1024.png")
    print("dragon icons written")