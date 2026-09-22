import type { LayerType, DesignLayer } from './types';
export const STORAGE_KEY = 'cs-netcard-layers-v5';
export const CUSTOM_TEMPLATES_LS_KEY = 'mahfazat-jeeb-custom-templates-v1';
export const MAX_CUSTOM_TEMPLATE_BYTES = 8 * 1024 * 1024;

export const DEFAULT_FONT = 'Cairo';
export const DEFAULT_FONT_SIZE = 52;
export const DEFAULT_FONT_COLOR = '#111827';

export const FIELD_COLORS = {
  name: '#111827',
  code: '#b91c1c',
  phone: '#0f766e',
} as const;

export const FIELD_FONT_SIZES = {
  name: 52,
  code: 56,
  phone: 46,
} as const;

export interface TemplatePosition {
  xRatio: number;
  yRatio: number;
}

export interface BuiltinTemplate {
  id: string;
  label: string;
  source: 'png' | 'jpg' | 'js';
  featured?: boolean;
  positions?: Partial<Record<'name' | 'code' | 'phone', TemplatePosition>>;
}

/** قوالب جاهزة — ضع ملفات JPG في public/netcard/templates/ */
export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  { id: 'template1', label: 'قالب 1', source: 'jpg', featured: true },
  { id: 'template2', label: 'قالب 2', source: 'jpg', featured: true },
  { id: 'template3', label: 'قالب 3', source: 'jpg', featured: true },
  { id: 'template4', label: 'قالب 4', source: 'jpg', featured: true },
  { id: 'template5', label: 'قالب 5', source: 'jpg' },
  { id: 'template6', label: 'قالب 6', source: 'jpg' },
  { id: 'template7', label: 'قالب 7', source: 'jpg' },
  { id: 'template8', label: 'قالب 8', source: 'jpg' },
  { id: 'template9', label: 'قالب 9', source: 'jpg' },
  { id: 'template10', label: 'قالب 10', source: 'jpg' },
  { id: 'template11', label: 'قالب 11', source: 'jpg' },
  { id: 'template12', label: 'قالب 12', source: 'jpg' },
  { id: 'template13', label: 'قالب 13', source: 'jpg' },
  { id: 'template14', label: 'قالب 14', source: 'jpg' },
  { id: 'template15', label: 'قالب 15', source: 'jpg' },
  { id: 'template16', label: 'قالب 16', source: 'jpg' },
  { id: 'template17', label: 'قالب 17', source: 'jpg' },
];

export const BUILTIN_TEMPLATE_COUNT = BUILTIN_TEMPLATES.length;

export const TEMPLATE_NAMES = BUILTIN_TEMPLATES.map((t) => t.id);
export const DEFAULT_TEMPLATE = 'template1';

export const TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(
  BUILTIN_TEMPLATES.map((t) => [t.id, t.label])
);

export const TYPE_LABELS: Record<LayerType, string> = {
  name: 'اسم الشبكة',
  code: 'رقم الكود',
  phone: 'رقم الهاتف',
  image: 'صورة',
};

export const TYPE_COLORS: Record<LayerType, string> = {
  name: FIELD_COLORS.name,
  code: FIELD_COLORS.code,
  phone: FIELD_COLORS.phone,
  image: '#8b5cf6',
};

export const PLACEHOLDERS: Record<Exclude<LayerType, 'image'>, string> = {
  name: '[اسم الشبكة]',
  code: '[رقم الكود]',
  phone: '[رقم الهاتف]',
};

export const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial (افتراضي)' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Segoe UI', label: 'Segoe UI' },
  { value: 'Cairo', label: 'كايرو' },
  { value: 'Tajawal', label: 'تجوال' },
  { value: 'Almarai', label: 'المراعي' },
];

export function layerUid(): string {
  return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getTemplateMeta(id: string): BuiltinTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function defaultLayer(
  type: LayerType,
  w: number,
  h: number,
  templateId?: string
): DesignLayer {
  const meta = templateId ? getTemplateMeta(templateId) : undefined;
  const positions: Record<Exclude<LayerType, 'image'>, { x: number; y: number }> = {
    name: { x: w * 0.5, y: h * 0.32 },
    code: { x: w * 0.5, y: h * 0.52 },
    phone: { x: w * 0.5, y: h * 0.72 },
  };

  if (type !== 'image' && meta?.positions?.[type]) {
    positions[type] = {
      x: w * meta.positions[type]!.xRatio,
      y: h * meta.positions[type]!.yRatio,
    };
  }

  const p = type === 'image' ? { x: w * 0.5, y: h * 0.5 } : positions[type];
  const textColor = type !== 'image' ? FIELD_COLORS[type] : DEFAULT_FONT_COLOR;
  const textSize = type !== 'image' ? FIELD_FONT_SIZES[type] : DEFAULT_FONT_SIZE;

  return {
    id: layerUid(),
    type,
    x: p.x,
    y: p.y,
    fontSize: textSize,
    color: textColor,
    fontFamily: DEFAULT_FONT,
    fontWeight: type === 'code' ? '800' : '700',
    textAlign: 'center',
    rotation: 0,
    opacity: 1,
    visible: true,
    shadowOn: false,
    shadowColor: '#000000',
    shadowBlur: 6,
    shadowOffsetX: 3,
    shadowOffsetY: 3,
    scaleX: 1,
    scaleY: 1,
    boxEnabled: false,
    boxWidth: 0,
    boxHeight: 0,
    boxColor: '#ffffff',
    width: 120,
    height: 120,
    imageSrc: null,
  };
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'بطاقة';
}
