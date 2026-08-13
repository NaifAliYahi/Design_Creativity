#!/usr/bin/env python3
"""
Detect exact N/C/P letter bounding boxes in template images.
Outputs precise marker ratios + background fill color per field.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "public" / "netcard" / "templates"

TEMPLATE_IDS = [f"template{i}" for i in range(1, 18)]


def lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_red(r: int, g: int, b: int) -> bool:
    return r > 145 and g < 115 and b < 115 and r > g + 25


def is_letter_pixel(r: int, g: int, b: int, light_letters: bool) -> bool:
    if is_red(r, g, b):
        return False
    l = lum(r, g, b)
    if light_letters:
        return l > 175 and max(r, g, b) - min(r, g, b) < 45
    return l < 80 and max(r, g, b) - min(r, g, b) < 70


def is_box_pixel(r: int, g: int, b: int) -> bool:
    if is_red(r, g, b):
        return False
    l = lum(r, g, b)
    return l > 200 and max(r, g, b) - min(r, g, b) < 50


def find_light_boxes(img: Image.Image) -> list[dict]:
    w, h = img.size
    px = img.convert("RGB").load()
    visited = [[False] * w for _ in range(h)]
    boxes: list[dict] = []

    for y in range(h):
        for x in range(w):
            if visited[y][x] or not is_box_pixel(*px[x, y]):
                continue
            stack = [(x, y)]
            visited[y][x] = True
            min_x = max_x = x
            min_y = max_y = y
            count = 0
            while stack:
                cx, cy = stack.pop()
                count += 1
                min_x, max_x = min(min_x, cx), max(max_x, cx)
                min_y, max_y = min(min_y, cy), max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_box_pixel(*px[nx, ny]):
                        visited[ny][nx] = True
                        stack.append((nx, ny))

            bw, bh = max_x - min_x + 1, max_y - min_y + 1
            if count < 600 or bw < w * 0.08 or bh < h * 0.02:
                continue
            if bw > w * 0.9 or bh > h * 0.35:
                continue
            boxes.append(
                {
                    "min_x": min_x,
                    "min_y": min_y,
                    "max_x": max_x,
                    "max_y": max_y,
                    "cx": (min_x + max_x) / 2,
                    "cy": (min_y + max_y) / 2,
                    "w": bw,
                    "h": bh,
                    "xRatio": (min_x + max_x) / 2 / w,
                    "yRatio": (min_y + max_y) / 2 / h,
                }
            )
    return boxes


def find_letter_in_box(img: Image.Image, box: dict, light_letters: bool) -> dict | None:
    w, h = img.size
    px = img.convert("RGB").load()
    pad = max(4, int(min(box["w"], box["h"]) * 0.08))
    x0 = max(0, box["min_x"] + pad)
    y0 = max(0, box["min_y"] + pad)
    x1 = min(w - 1, box["max_x"] - pad)
    y1 = min(h - 1, box["max_y"] - pad)

    visited = [[False] * w for _ in range(h)]
    best: dict | None = None

    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if visited[y][x] or not is_letter_pixel(*px[x, y], light_letters):
                continue
            stack = [(x, y)]
            visited[y][x] = True
            min_x = max_x = x
            min_y = max_y = y
            coords: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                coords.append((cx, cy))
                min_x, max_x = min(min_x, cx), max(max_x, cx)
                min_y, max_y = min(min_y, cy), max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if x0 <= nx <= x1 and y0 <= ny <= y1 and not visited[ny][nx]:
                        if is_letter_pixel(*px[nx, ny], light_letters):
                            visited[ny][nx] = True
                            stack.append((nx, ny))

            area = len(coords)
            bw, bh = max_x - min_x + 1, max_y - min_y + 1
            if area < 30 or area > 4000:
                continue
            if bw < 6 or bh < 8 or bw > box["w"] * 0.85 or bh > box["h"] * 0.9:
                continue
            aspect = bw / max(bh, 1)
            if aspect > 2.2 or aspect < 0.3:
                continue

            cx = sum(c[0] for c in coords) / area
            cy = sum(c[1] for c in coords) / area
            cand = {
                "min_x": min_x,
                "min_y": min_y,
                "max_x": max_x,
                "max_y": max_y,
                "cx": cx,
                "cy": cy,
                "w": bw,
                "h": bh,
                "area": area,
                "xRatio": cx / w,
                "yRatio": cy / h,
                "box": box,
            }
            if best is None or cand["area"] > best["area"]:
                best = cand
    return best


def sample_box_bg(img: Image.Image, box: dict, letter: dict | None) -> str:
    px = img.convert("RGB").load()
    samples: list[tuple[int, int, int]] = []
    for y in range(box["min_y"], box["max_y"] + 1, 2):
        for x in range(box["min_x"], box["max_x"] + 1, 2):
            if letter and letter["min_x"] <= x <= letter["max_x"] and letter["min_y"] <= y <= letter["max_y"]:
                continue
            r, g, b = px[x, y]
            if is_box_pixel(r, g, b) or lum(r, g, b) > 160:
                samples.append((r, g, b))
    if not samples:
        return "#ffffff"
    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return f"#{r:02x}{g:02x}{b:02x}"


def sample_letter_color(img: Image.Image, letter: dict, light: bool) -> str:
    px = img.convert("RGB").load()
    samples = []
    for y in range(letter["min_y"], letter["max_y"] + 1):
        for x in range(letter["min_x"], letter["max_x"] + 1):
            r, g, b = px[x, y]
            if is_letter_pixel(r, g, b, light):
                samples.append((r, g, b))
    if not samples:
        return "#ffffff" if light else "#000000"
    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return f"#{r:02x}{g:02x}{b:02x}"


def classify_letters(letters: list[dict], w: int, h: int) -> dict[str, dict]:
    if not letters:
        return {}
    landscape = w > h * 1.12
    result: dict[str, dict] = {}

    if landscape:
        # N top, C middle, P bottom (right side boxes)
        right = [l for l in letters if l["xRatio"] > 0.45]
        right.sort(key=lambda l: l["yRatio"])
        keys = ["name", "code", "phone"]
        for key, letter in zip(keys, right[:3]):
            result[key] = letter
        if len(result) < 3:
            all_s = sorted(letters, key=lambda l: l["yRatio"])
            for key, letter in zip(keys, all_s[:3]):
                result.setdefault(key, letter)
        return result

    upper = [l for l in letters if l["yRatio"] < 0.42]
    lower = [l for l in letters if l["yRatio"] >= 0.58]

    if upper:
        result["name"] = max(upper, key=lambda l: l["w"] * l["h"])

    if len(lower) >= 2:
        lower.sort(key=lambda l: l["xRatio"])
        result["code"] = lower[0]
        result["phone"] = lower[-1]
    elif len(lower) == 1:
        b = lower[0]
        result["code" if b["xRatio"] < 0.5 else "phone"] = b

    used = set(id(v) for v in result.values())
    rest = [l for l in letters if id(l) not in used]
    for key in ("name", "code", "phone"):
        if key not in result and rest:
            if key == "name":
                result[key] = min(rest, key=lambda l: l["yRatio"])
            elif key == "code":
                result[key] = min(rest, key=lambda l: l["xRatio"])
            else:
                result[key] = max(rest, key=lambda l: l["xRatio"])
            used.add(id(result[key]))
            rest = [l for l in letters if id(l) not in used]

    return result


def detect_template(path: Path) -> dict:
    img = Image.open(path)
    w, h = img.size
    boxes = find_light_boxes(img)

    letters: list[dict] = []
    for box in boxes:
        for light in (False, True):
            letter = find_letter_in_box(img, box, light)
            if letter:
                letter["light"] = light
                letters.append(letter)
                break

    # dedupe overlapping letters
    unique: list[dict] = []
    for l in sorted(letters, key=lambda x: -x["area"]):
        if any(abs(l["cx"] - u["cx"]) < 20 and abs(l["cy"] - u["cy"]) < 20 for u in unique):
            continue
        unique.append(l)

    markers = classify_letters(unique, w, h)
    preset: dict = {"width": w, "height": h, "boxes": len(boxes), "letters": len(unique)}

    for layer_type, letter in markers.items():
        box = letter["box"]
        bg = sample_box_bg(img, box, letter)
        color = sample_letter_color(img, letter, letter.get("light", False))
        font_size = max(28, min(72, int(letter["h"] * 1.05)))

        preset[layer_type] = {
            "xRatio": round(letter["xRatio"], 4),
            "yRatio": round(letter["yRatio"], 4),
            "markerWRatio": round(letter["w"] / w, 4),
            "markerHRatio": round(letter["h"] / h, 4),
            "boxWRatio": round(box["w"] / w, 4),
            "boxHRatio": round(box["h"] / h, 4),
            "fontSize": font_size,
            "color": color,
            "coverFill": bg,
        }

    return preset


def emit_presets_ts(all_presets: dict[str, dict]) -> None:
    lines = [
        "import {",
        "  DEFAULT_FONT,",
        "  DEFAULT_FONT_COLOR,",
        "  DEFAULT_FONT_SIZE,",
        "  layerUid,",
        "  TEMPLATE_NAMES,",
        "} from './constants';",
        "import type { DesignLayer } from './types';",
        "",
        "export interface LayerPreset {",
        "  xRatio: number;",
        "  yRatio: number;",
        "  fontSize?: number;",
        "  color?: string;",
        "  fontWeight?: string;",
        "  textAlign?: CanvasTextAlign;",
        "  rotation?: number;",
        "  coverFill?: string;",
        "  /** حجم الحرف N/C/P الأصلي */",
        "  markerWRatio?: number;",
        "  markerHRatio?: number;",
        "  /** حجم صندوق الإدخال الأبيض */",
        "  boxWRatio?: number;",
        "  boxHRatio?: number;",
        "}",
        "",
        "export type TemplateLayerPresets = Partial<Record<'name' | 'code' | 'phone', LayerPreset>>;",
        "",
        "/** مواقع دقيقة — مُستخرجة من حروف N/C/P في كل قالب */",
        "export const TEMPLATE_LAYER_PRESETS: Record<string, TemplateLayerPresets> = {",
    ]

    for tid, p in all_presets.items():
        lines.append(f"  {tid}: {{")
        for lt in ("name", "code", "phone"):
            if lt not in p:
                continue
            m = p[lt]
            parts = [
                f"xRatio: {m['xRatio']}",
                f"yRatio: {m['yRatio']}",
                f"fontSize: {m['fontSize']}",
                f"color: '{m['color']}'",
                f"coverFill: '{m['coverFill']}'",
                f"markerWRatio: {m['markerWRatio']}",
                f"markerHRatio: {m['markerHRatio']}",
                f"boxWRatio: {m.get('boxWRatio', 0.22)}",
                f"boxHRatio: {m.get('boxHRatio', 0.05)}",
            ]
            lines.append(f"    {lt}: {{ {', '.join(parts)} }},")
        lines.append("  },")

    lines += [
        "};",
        "",
        "export const GENERIC_LAYER_PRESETS: TemplateLayerPresets = {",
        "  name: { xRatio: 0.5, yRatio: 0.22, fontSize: 48, coverFill: '#ffffff', markerWRatio: 0.04, markerHRatio: 0.035, boxWRatio: 0.22, boxHRatio: 0.05 },",
        "  code: { xRatio: 0.5, yRatio: 0.52, fontSize: 48, coverFill: '#ffffff', markerWRatio: 0.04, markerHRatio: 0.035, boxWRatio: 0.22, boxHRatio: 0.05 },",
        "  phone: { xRatio: 0.5, yRatio: 0.72, fontSize: 48, coverFill: '#ffffff', markerWRatio: 0.04, markerHRatio: 0.035, boxWRatio: 0.22, boxHRatio: 0.05 },",
        "};",
        "",
        "function layerFromPreset(type: 'name' | 'code' | 'phone', preset: LayerPreset, w: number, h: number): DesignLayer {",
        "  return {",
        "    id: layerUid(),",
        "    type,",
        "    x: w * preset.xRatio,",
        "    y: h * preset.yRatio,",
        "    fontSize: preset.fontSize ?? DEFAULT_FONT_SIZE,",
        "    color: preset.color ?? DEFAULT_FONT_COLOR,",
        "    fontFamily: DEFAULT_FONT,",
        "    fontWeight: preset.fontWeight ?? 'bold',",
        "    textAlign: preset.textAlign ?? 'center',",
        "    rotation: preset.rotation ?? 0,",
        "    opacity: 1, visible: true, shadowOn: false,",
        "    shadowColor: '#000000', shadowBlur: 6, shadowOffsetX: 3, shadowOffsetY: 3,",
        "    width: 120, height: 120, imageSrc: null,",
        "    coverFill: preset.coverFill,",
        "    markerWRatio: preset.markerWRatio,",
        "    markerHRatio: preset.markerHRatio,",
        "    boxWRatio: preset.boxWRatio,",
        "    boxHRatio: preset.boxHRatio,",
        "  };",
        "}",
        "",
        "export function buildPresetLayers(templateId: string, w: number, h: number): DesignLayer[] {",
        "  const presets = TEMPLATE_LAYER_PRESETS[templateId] ?? GENERIC_LAYER_PRESETS;",
        "  return (['name', 'code', 'phone'] as const).filter((t) => presets[t]).map((t) => layerFromPreset(t, presets[t]!, w, h));",
        "}",
        "",
        "export function hasBuiltinPreset(templateId: string): boolean {",
        "  return TEMPLATE_NAMES.includes(templateId) || !!TEMPLATE_LAYER_PRESETS[templateId];",
        "}",
        "",
    ]

    out = ROOT / "src" / "lib" / "netcard" / "template-presets.ts"
    out.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    all_presets: dict[str, dict] = {}
    for tid in TEMPLATE_IDS:
        path = TEMPLATES / f"{tid}.jpg"
        if not path.exists():
            print(f"MISSING {path}", file=sys.stderr)
            continue
        p = detect_template(path)
        all_presets[tid] = p
        n, c, ph = p.get("name", {}), p.get("code", {}), p.get("phone", {})
        print(
            f"{tid}: boxes={p.get('boxes')} letters={p.get('letters')} "
            f"N=({n.get('xRatio')},{n.get('yRatio')}) "
            f"C=({c.get('xRatio')},{c.get('yRatio')}) "
            f"P=({ph.get('xRatio')},{ph.get('yRatio')})"
        )

    json_path = ROOT / "scripts" / "template-markers.json"
    json_path.write_text(json.dumps(all_presets, indent=2, ensure_ascii=False), encoding="utf-8")
    emit_presets_ts(all_presets)
    print(f"\nWrote {json_path} + template-presets.ts")


if __name__ == "__main__":
    main()
