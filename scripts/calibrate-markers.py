#!/usr/bin/env python3
"""Find N/C/P markers: white-box scan + manual fallback anchors."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "public" / "netcard" / "templates"
DEBUG_DIR = ROOT / "scripts" / "debug-markers"
TEMPLATE_IDS = [f"template{i}" for i in range(1, 18)]

# نقاط مرجعية عند فشل الاكتشاف التلقائي
FALLBACK: dict[str, dict[str, tuple[float, float]]] = {
    "template1": {"name": (0.512, 0.202), "code": (0.275, 0.855), "phone": (0.725, 0.855)},
    "template2": {"name": (0.512, 0.202), "code": (0.275, 0.855), "phone": (0.725, 0.855)},
    "template3": {"name": (0.485, 0.224), "code": (0.185, 0.878), "phone": (0.815, 0.878)},
    "template4": {"name": (0.512, 0.200), "code": (0.265, 0.850), "phone": (0.735, 0.850)},
    "template5": {"name": (0.500, 0.210), "code": (0.180, 0.865), "phone": (0.820, 0.865)},
    "template6": {"name": (0.505, 0.185), "code": (0.170, 0.855), "phone": (0.830, 0.855)},
    "template7": {"name": (0.490, 0.210), "code": (0.175, 0.870), "phone": (0.825, 0.870)},
    "template8": {"name": (0.512, 0.202), "code": (0.275, 0.855), "phone": (0.725, 0.855)},
    "template9": {"name": (0.512, 0.202), "code": (0.275, 0.855), "phone": (0.725, 0.855)},
    "template10": {"name": (0.490, 0.220), "code": (0.185, 0.878), "phone": (0.815, 0.878)},
    "template11": {"name": (0.620, 0.520), "code": (0.620, 0.420), "phone": (0.220, 0.880)},
    "template12": {"name": (0.120, 0.120), "code": (0.780, 0.580), "phone": (0.500, 0.920)},
    "template13": {"name": (0.720, 0.260), "code": (0.720, 0.550), "phone": (0.550, 0.880)},
    "template14": {"name": (0.720, 0.280), "code": (0.720, 0.480), "phone": (0.720, 0.720)},
    "template15": {"name": (0.520, 0.520), "code": (0.520, 0.420), "phone": (0.220, 0.880)},
    "template16": {"name": (0.520, 0.500), "code": (0.520, 0.380), "phone": (0.520, 0.660)},
    "template17": {"name": (0.720, 0.220), "code": (0.220, 0.520), "phone": (0.780, 0.520)},
}


def lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_red(r, g, b):
    return r > 140 and g < 120 and b < 120 and r > g + 20


def is_light_bg(r, g, b):
    if is_red(r, g, b):
        return False
    return lum(r, g, b) > 172 and max(r, g, b) - min(r, g, b) < 55


def is_letter(r, g, b, light=False):
    if is_red(r, g, b):
        return False
    l = lum(r, g, b)
    return (l > 160 and max(r, g, b) - min(r, g, b) < 50) if light else (l < 100 and max(r, g, b) - min(r, g, b) < 75)


def find_letter_near(img, ax, ay, radius_ratio=0.08):
    w, h = img.size
    cx, cy = int(ax * w), int(ay * h)
    radius = int(min(w, h) * radius_ratio)
    px = img.convert("RGB").load()
    x0, y0 = max(0, cx - radius), max(0, cy - radius)
    x1, y1 = min(w - 1, cx + radius), min(h - 1, cy + radius)
    best = None
    visited = [[False] * w for _ in range(h)]

    for light in (False, True):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if visited[y][x] or not is_letter(*px[x, y], light):
                    continue
                stack = [(x, y)]
                visited[y][x] = True
                min_x = max_x = x
                min_y = max_y = y
                coords = []
                while stack:
                    sx, sy = stack.pop()
                    coords.append((sx, sy))
                    min_x, max_x = min(min_x, sx), max(max_x, sx)
                    min_y, max_y = min(min_y, sy), max(max_y, sy)
                    for nx, ny in ((sx + 1, sy), (sx - 1, sy), (sx, sy + 1), (sx, sy - 1)):
                        if x0 <= nx <= x1 and y0 <= ny <= y1 and not visited[ny][nx] and is_letter(*px[nx, ny], light):
                            visited[ny][nx] = True
                            stack.append((nx, ny))
                area = len(coords)
                bw, bh = max_x - min_x + 1, max_y - min_y + 1
                if area < 25 or bw < 5 or bh < 6:
                    continue
                # حرف واحد N/C/P — حجم مدمج فقط (ليس الصندوق كاملاً)
                if bw > radius * 1.2 or bh > radius * 1.2:
                    continue
                if bw > w * 0.12 or bh > h * 0.08:
                    continue
                lcx = sum(c[0] for c in coords) / area
                lcy = sum(c[1] for c in coords) / area
                dist = ((lcx - cx) ** 2 + (lcy - cy) ** 2) ** 0.5
                cand = {"min_x": min_x, "min_y": min_y, "max_x": max_x, "max_y": max_y,
                        "cx": lcx, "cy": lcy, "w": bw, "h": bh, "light": light, "dist": dist, "area": area}
                # الأقرب للمركز + حجم مناسب لحرف واحد
                score = dist - min(area, 800) * 0.02
                if best is None or score < best.get("score", 1e9):
                    cand["score"] = score
                    best = cand

    if best is None:
        fs = int(min(w, h) * 0.04)
        return {"cx": cx, "cy": cy, "w": fs, "h": fs,
                "min_x": cx - fs // 2, "min_y": cy - fs // 2,
                "max_x": cx + fs // 2, "max_y": cy + fs // 2, "light": False}
    return best


def expand_box(img, letter):
    w, h = img.size
    px = img.convert("RGB").load()
    cx, cy = int(letter["cx"]), int(letter["cy"])

    def light_at(x, y):
        if x < 0 or y < 0 or x >= w or y >= h:
            return False
        return is_light_bg(*px[x, y])

    max_w, max_h = int(w * 0.44), int(h * 0.1)
    left = cx
    while left > 0 and light_at(left - 1, cy):
        left -= 1
        if cx - left > max_w:
            break
    right = cx
    while right < w - 1 and light_at(right + 1, cy):
        right += 1
        if right - cx > max_w:
            break
    top = cy
    while top > 0 and light_at(cx, top - 1):
        top -= 1
        if cy - top > max_h:
            break
    bottom = cy
    while bottom < h - 1 and light_at(cx, bottom + 1):
        bottom += 1
        if bottom - cy > max_h:
            break

    bw, bh = right - left + 1, bottom - top + 1
    left = max(0, left)
    top = max(0, top)
    right = min(w - 1, right)
    bottom = min(h - 1, bottom)
    bw, bh = right - left + 1, bottom - top + 1
    if bw < letter["w"] * 2:
        half = max(int(letter["w"] * 2.2), int(w * 0.16))
        left, right = cx - half, cx + half
        bw = right - left + 1
    if bh < letter["h"] * 1.5:
        half = max(int(letter["h"] * 1.3), int(h * 0.04))
        top, bottom = cy - half, cy + half
        bh = bottom - top + 1

    return {"min_x": left, "max_x": right, "min_y": top, "max_y": bottom, "w": bw, "h": bh}


def sample_bg(img, box, letter):
    px = img.convert("RGB").load()
    w, h = img.size
    x0 = max(0, box["min_x"])
    y0 = max(0, box["min_y"])
    x1 = min(w - 1, box["max_x"])
    y1 = min(h - 1, box["max_y"])
    samples = []
    for y in range(y0, y1 + 1, 2):
        for x in range(x0, x1 + 1, 2):
            if letter["min_x"] <= x <= letter["max_x"] and letter["min_y"] <= y <= letter["max_y"]:
                continue
            r, g, b = px[x, y]
            if lum(r, g, b) > 140:
                samples.append((r, g, b))
    if not samples:
        return "#ffffff"
    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return f"#{r:02x}{g:02x}{b:02x}"


def letter_color(img, letter):
    px = img.convert("RGB").load()
    light = letter.get("light", False)
    samples = []
    for y in range(letter["min_y"], letter["max_y"] + 1):
        for x in range(letter["min_x"], letter["max_x"] + 1):
            r, g, b = px[x, y]
            if is_letter(r, g, b, light):
                samples.append((r, g, b))
    if not samples:
        return "#ffffff" if light else "#101010"
    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return f"#{r:02x}{g:02x}{b:02x}"


def calibrate(tid, debug=False):
    img = Image.open(TEMPLATES / f"{tid}.jpg")
    w, h = img.size
    anchors = FALLBACK[tid]
    preset = {"width": w, "height": h}
    dbg = img.copy()
    draw = ImageDraw.Draw(dbg) if debug else None

    for lt, (ax, ay) in anchors.items():
        letter = find_letter_near(img, ax, ay)
        box = expand_box(img, letter)
        bg = sample_bg(img, box, letter)
        color = letter_color(img, letter)
        if lum(int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)) > 185:
            color = "#101010" if not letter.get("light") else "#ffffff"
        fs = max(26, min(72, int(letter["h"] * 1.15)))
        preset[lt] = {
            "xRatio": round(letter["cx"] / w, 4),
            "yRatio": round(letter["cy"] / h, 4),
            "markerWRatio": round(letter["w"] / w, 4),
            "markerHRatio": round(letter["h"] / h, 4),
            "boxWRatio": round(box["w"] / w, 4),
            "boxHRatio": round(box["h"] / h, 4),
            "fontSize": fs,
            "color": color,
            "coverFill": bg,
        }
        if draw:
            lbl = {"name": "N", "code": "C", "phone": "P"}[lt]
            draw.rectangle([letter["min_x"], letter["min_y"], letter["max_x"], letter["max_y"]], outline="lime", width=4)
            draw.rectangle([box["min_x"], box["min_y"], box["max_x"], box["max_y"]], outline="cyan", width=2)
            draw.text((letter["min_x"], max(0, letter["min_y"] - 14)), lbl, fill="yellow")

    if debug and draw:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        dbg.save(DEBUG_DIR / f"{tid}.jpg", quality=92)
    return preset


def emit_ts(all_p):
    lines = [
        "import { DEFAULT_FONT, DEFAULT_FONT_COLOR, DEFAULT_FONT_SIZE, layerUid, TEMPLATE_NAMES } from './constants';",
        "import type { DesignLayer } from './types';",
        "export interface LayerPreset { xRatio: number; yRatio: number; fontSize?: number; color?: string;",
        "  fontWeight?: string; textAlign?: CanvasTextAlign; rotation?: number; coverFill?: string;",
        "  markerWRatio?: number; markerHRatio?: number; boxWRatio?: number; boxHRatio?: number; }",
        "export type TemplateLayerPresets = Partial<Record<'name' | 'code' | 'phone', LayerPreset>>;",
        "/** مواقع حروف N/C/P — مُستخرجة من كل قالب */",
        "export const TEMPLATE_LAYER_PRESETS: Record<string, TemplateLayerPresets> = {",
    ]
    for tid, p in all_p.items():
        lines.append(f"  {tid}: {{")
        for lt in ("name", "code", "phone"):
            m = p[lt]
            lines.append(
                f"    {lt}: {{ xRatio: {m['xRatio']}, yRatio: {m['yRatio']}, fontSize: {m['fontSize']}, "
                f"color: '{m['color']}', coverFill: '{m['coverFill']}', markerWRatio: {m['markerWRatio']}, "
                f"markerHRatio: {m['markerHRatio']}, boxWRatio: {m['boxWRatio']}, boxHRatio: {m['boxHRatio']} }},"
            )
        lines.append("  },")
    lines += [
        "};",
        "export const GENERIC_LAYER_PRESETS: TemplateLayerPresets = {",
        "  name: { xRatio: 0.5, yRatio: 0.22, fontSize: 48, coverFill: '#ffffff', markerWRatio: 0.035, markerHRatio: 0.028, boxWRatio: 0.24, boxHRatio: 0.055 },",
        "  code: { xRatio: 0.5, yRatio: 0.52, fontSize: 48, coverFill: '#ffffff', markerWRatio: 0.035, markerHRatio: 0.028, boxWRatio: 0.24, boxHRatio: 0.055 },",
        "  phone: { xRatio: 0.5, yRatio: 0.72, fontSize: 48, coverFill: '#ffffff', markerWRatio: 0.035, markerHRatio: 0.028, boxWRatio: 0.24, boxHRatio: 0.055 },",
        "};",
        "function layerFromPreset(type: 'name' | 'code' | 'phone', preset: LayerPreset, w: number, h: number): DesignLayer {",
        "  return { id: layerUid(), type, x: w * preset.xRatio, y: h * preset.yRatio,",
        "    fontSize: preset.fontSize ?? DEFAULT_FONT_SIZE, color: preset.color ?? DEFAULT_FONT_COLOR,",
        "    fontFamily: DEFAULT_FONT, fontWeight: preset.fontWeight ?? 'bold', textAlign: preset.textAlign ?? 'center',",
        "    rotation: preset.rotation ?? 0, opacity: 1, visible: true, shadowOn: false,",
        "    shadowColor: '#000000', shadowBlur: 6, shadowOffsetX: 3, shadowOffsetY: 3,",
        "    width: 120, height: 120, imageSrc: null, coverFill: preset.coverFill,",
        "    markerWRatio: preset.markerWRatio, markerHRatio: preset.markerHRatio,",
        "    boxWRatio: preset.boxWRatio, boxHRatio: preset.boxHRatio };",
        "}",
        "export function buildPresetLayers(templateId: string, w: number, h: number): DesignLayer[] {",
        "  const presets = TEMPLATE_LAYER_PRESETS[templateId] ?? GENERIC_LAYER_PRESETS;",
        "  return (['name', 'code', 'phone'] as const).map((t) => layerFromPreset(t, presets[t]!, w, h));",
        "}",
        "export function hasBuiltinPreset(templateId: string): boolean {",
        "  return TEMPLATE_NAMES.includes(templateId) || !!TEMPLATE_LAYER_PRESETS[templateId];",
        "}",
        "",
    ]
    (ROOT / "src" / "lib" / "netcard" / "template-presets.ts").write_text("\n".join(lines), encoding="utf-8")


def main():
    all_p = {}
    for tid in TEMPLATE_IDS:
        p = calibrate(tid, debug=True)
        all_p[tid] = p
        n, c, ph = p["name"], p["code"], p["phone"]
        print(f"{tid}: N=({n['xRatio']},{n['yRatio']}) C=({c['xRatio']},{c['yRatio']}) P=({ph['xRatio']},{ph['yRatio']})")
    (ROOT / "scripts" / "template-markers.json").write_text(json.dumps(all_p, indent=2), encoding="utf-8")
    emit_ts(all_p)
    print(f"Debug: {DEBUG_DIR}")


if __name__ == "__main__":
    main()
