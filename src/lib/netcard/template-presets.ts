import {
  DEFAULT_FONT,
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_SIZE,
  FIELD_COLORS,
  FIELD_FONT_SIZES,
  layerUid,
  TEMPLATE_NAMES,
} from './constants';
import type { DesignLayer } from './types';

export interface LayerPreset {
  xRatio: number;
  yRatio: number;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  textAlign?: CanvasTextAlign;
  rotation?: number;
}

export type TemplateLayerPresets = Partial<Record<'name' | 'code' | 'phone', LayerPreset>>;

/** مواقع افتراضية احترافية — يُعدّلها الموظف لكل قالب من /studio */
export const GENERIC_LAYER_PRESETS: TemplateLayerPresets = {
  name: { xRatio: 0.5, yRatio: 0.24, fontSize: FIELD_FONT_SIZES.name, color: FIELD_COLORS.name, fontWeight: '700' },
  code: { xRatio: 0.5, yRatio: 0.54, fontSize: FIELD_FONT_SIZES.code, color: FIELD_COLORS.code, fontWeight: '800' },
  phone: { xRatio: 0.5, yRatio: 0.78, fontSize: FIELD_FONT_SIZES.phone, color: FIELD_COLORS.phone, fontWeight: '700' },
};

/** لا توجد إعدادات مسبقة لكل قالب — التصميم يدوي */
export const TEMPLATE_LAYER_PRESETS: Record<string, TemplateLayerPresets> = {};

function layerFromPreset(
  type: 'name' | 'code' | 'phone',
  preset: LayerPreset,
  w: number,
  h: number
): DesignLayer {
  return {
    id: layerUid(),
    type,
    x: w * preset.xRatio,
    y: h * preset.yRatio,
    fontSize: preset.fontSize ?? DEFAULT_FONT_SIZE,
    color: preset.color ?? DEFAULT_FONT_COLOR,
    fontFamily: DEFAULT_FONT,
    fontWeight: preset.fontWeight ?? 'bold',
    textAlign: preset.textAlign ?? 'center',
    rotation: preset.rotation ?? 0,
    opacity: 1,
    visible: true,
    shadowOn: true,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowBlur: 4,
    shadowOffsetX: 1,
    shadowOffsetY: 2,
    width: 120,
    height: 120,
    imageSrc: null,
  };
}

export function buildPresetLayers(templateId: string, w: number, h: number): DesignLayer[] {
  const presets = TEMPLATE_LAYER_PRESETS[templateId] ?? GENERIC_LAYER_PRESETS;
  return (['name', 'code', 'phone'] as const)
    .filter((type) => presets[type])
    .map((type) => layerFromPreset(type, presets[type]!, w, h));
}

export function hasBuiltinPreset(templateId: string): boolean {
  return TEMPLATE_NAMES.includes(templateId) || !!TEMPLATE_LAYER_PRESETS[templateId];
}
