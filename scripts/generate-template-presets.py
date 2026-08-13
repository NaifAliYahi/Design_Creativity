#!/usr/bin/env python3
"""Generate template-presets.ts from template-markers.json with full manual positions."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKERS = ROOT / "scripts" / "template-markers.json"

# Verified positions for all 17 templates (xRatio, yRatio, fontSize, color)
PRESETS = {
    "template1": {
        "name": {"xRatio": 0.512, "yRatio": 0.202, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.275, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.725, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template2": {
        "name": {"xRatio": 0.512, "yRatio": 0.202, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.275, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.725, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template3": {
        "name": {"xRatio": 0.485, "yRatio": 0.224, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.185, "yRatio": 0.878, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.815, "yRatio": 0.878, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template4": {
        "name": {"xRatio": 0.512, "yRatio": 0.200, "fontSize": 50, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.265, "yRatio": 0.850, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.735, "yRatio": 0.850, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template5": {
        "name": {"xRatio": 0.500, "yRatio": 0.210, "fontSize": 50, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.180, "yRatio": 0.865, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.820, "yRatio": 0.865, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template6": {
        "name": {"xRatio": 0.505, "yRatio": 0.185, "fontSize": 50, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.170, "yRatio": 0.855, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.830, "yRatio": 0.855, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template7": {
        "name": {"xRatio": 0.490, "yRatio": 0.210, "fontSize": 50, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.175, "yRatio": 0.870, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.825, "yRatio": 0.870, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template8": {
        "name": {"xRatio": 0.512, "yRatio": 0.202, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.275, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.725, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template9": {
        "name": {"xRatio": 0.512, "yRatio": 0.202, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.275, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.725, "yRatio": 0.855, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template10": {
        "name": {"xRatio": 0.490, "yRatio": 0.220, "fontSize": 50, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.185, "yRatio": 0.878, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.815, "yRatio": 0.878, "fontSize": 46, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template11": {
        "name": {"xRatio": 0.620, "yRatio": 0.520, "fontSize": 44, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.620, "yRatio": 0.420, "fontSize": 44, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.220, "yRatio": 0.880, "fontSize": 40, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template12": {
        "name": {"xRatio": 0.120, "yRatio": 0.120, "fontSize": 56, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.780, "yRatio": 0.580, "fontSize": 40, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.500, "yRatio": 0.920, "fontSize": 40, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template13": {
        "name": {"xRatio": 0.720, "yRatio": 0.260, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.720, "yRatio": 0.550, "fontSize": 48, "color": "#ffffff", "coverFill": "#c4121b"},
        "phone": {"xRatio": 0.550, "yRatio": 0.880, "fontSize": 44, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template14": {
        "name": {"xRatio": 0.720, "yRatio": 0.280, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.720, "yRatio": 0.480, "fontSize": 48, "color": "#ffffff", "coverFill": "#c4121b"},
        "phone": {"xRatio": 0.720, "yRatio": 0.720, "fontSize": 44, "color": "#ffffff", "coverFill": "#c4121b"},
    },
    "template15": {
        "name": {"xRatio": 0.520, "yRatio": 0.520, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.520, "yRatio": 0.420, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.220, "yRatio": 0.880, "fontSize": 40, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template16": {
        "name": {"xRatio": 0.520, "yRatio": 0.500, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.520, "yRatio": 0.380, "fontSize": 48, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.520, "yRatio": 0.660, "fontSize": 44, "color": "#000000", "coverFill": "#ffffff"},
    },
    "template17": {
        "name": {"xRatio": 0.720, "yRatio": 0.220, "fontSize": 52, "color": "#000000", "coverFill": "#ffffff"},
        "code": {"xRatio": 0.220, "yRatio": 0.520, "fontSize": 44, "color": "#000000", "coverFill": "#ffffff"},
        "phone": {"xRatio": 0.780, "yRatio": 0.520, "fontSize": 44, "color": "#000000", "coverFill": "#ffffff"},
    },
}


def main() -> None:
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
        "/** إعدادات كل ليبل — نسب من عرض/ارتفاع القالب */",
        "export interface LayerPreset {",
        "  xRatio: number;",
        "  yRatio: number;",
        "  fontSize?: number;",
        "  color?: string;",
        "  fontWeight?: string;",
        "  textAlign?: CanvasTextAlign;",
        "  rotation?: number;",
        "  /** لون تعبئة منطقة الحرف N/C/P قبل رسم النص */",
        "  coverFill?: string;",
        "  coverWRatio?: number;",
        "  coverHRatio?: number;",
        "}",
        "",
        "export type TemplateLayerPresets = Partial<Record<'name' | 'code' | 'phone', LayerPreset>>;",
        "",
        "/**",
        " * مواقع الليبلات المُجهّزة مسبقاً لكل قالب (17 قالباً — TempNew).",
        " * الحروف N/C/P في الصورة = اسم الشبكة / الكود / الهاتف.",
        " */",
        "export const TEMPLATE_LAYER_PRESETS: Record<string, TemplateLayerPresets> = {",
    ]

    for tid, layers in PRESETS.items():
        lines.append(f"  {tid}: {{")
        for layer_type, p in layers.items():
            parts = [
                f"xRatio: {p['xRatio']}",
                f"yRatio: {p['yRatio']}",
                f"fontSize: {p['fontSize']}",
                f"color: '{p['color']}'",
                f"coverFill: '{p['coverFill']}'",
                "coverWRatio: 0.22",
                "coverHRatio: 0.045",
            ]
            lines.append(f"    {layer_type}: {{ {', '.join(parts)} }},")
        lines.append("  },")

    lines.extend(
        [
            "};",
            "",
            "/** مواقع افتراضية لأي قالب مخصص جديد */",
            "export const GENERIC_LAYER_PRESETS: TemplateLayerPresets = {",
            "  name: { xRatio: 0.5, yRatio: 0.22, fontSize: 48, coverFill: '#ffffff', coverWRatio: 0.22, coverHRatio: 0.045 },",
            "  code: { xRatio: 0.5, yRatio: 0.52, fontSize: 48, coverFill: '#ffffff', coverWRatio: 0.22, coverHRatio: 0.045 },",
            "  phone: { xRatio: 0.5, yRatio: 0.72, fontSize: 48, coverFill: '#ffffff', coverWRatio: 0.22, coverHRatio: 0.045 },",
            "};",
            "",
            "function layerFromPreset(",
            "  type: 'name' | 'code' | 'phone',",
            "  preset: LayerPreset,",
            "  w: number,",
            "  h: number",
            "): DesignLayer {",
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
            "    opacity: 1,",
            "    visible: true,",
            "    shadowOn: false,",
            "    shadowColor: '#000000',",
            "    shadowBlur: 6,",
            "    shadowOffsetX: 3,",
            "    shadowOffsetY: 3,",
            "    width: 120,",
            "    height: 120,",
            "    imageSrc: null,",
            "    coverFill: preset.coverFill,",
            "    coverWRatio: preset.coverWRatio ?? 0.22,",
            "    coverHRatio: preset.coverHRatio ?? 0.045,",
            "  };",
            "}",
            "",
            "/** بناء طبقات اسم + كود + هاتف جاهزة للقالب */",
            "export function buildPresetLayers(templateId: string, w: number, h: number): DesignLayer[] {",
            "  const presets = TEMPLATE_LAYER_PRESETS[templateId] ?? GENERIC_LAYER_PRESETS;",
            "  return (['name', 'code', 'phone'] as const)",
            "    .filter((type) => presets[type])",
            "    .map((type) => layerFromPreset(type, presets[type]!, w, h));",
            "}",
            "",
            "export function hasBuiltinPreset(templateId: string): boolean {",
            "  return TEMPLATE_NAMES.includes(templateId) || !!TEMPLATE_LAYER_PRESETS[templateId];",
            "}",
            "",
        ]
    )

    out = ROOT / "src" / "lib" / "netcard" / "template-presets.ts"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
