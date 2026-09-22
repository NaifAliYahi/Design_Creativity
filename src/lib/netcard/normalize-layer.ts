import { DEFAULT_FONT, DEFAULT_FONT_SIZE, FIELD_COLORS, layerUid } from './constants';
import type { DesignLayer, LayerType } from './types';

const TEXT_TYPES: LayerType[] = ['name', 'code', 'phone'];

function num(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validColor(value: unknown, fallback: string): string {
  const s = String(value || '');
  return /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
}

/** توحيد طبقة قادمة من Odoo أو bundled-layouts */
export function normalizeDesignLayer(
  raw: Partial<DesignLayer> & { type: LayerType },
  index: number,
  canvasW: number,
  canvasH: number
): DesignLayer {
  const type = raw.type;
  const posY: Record<string, number> = { name: 0.24, code: 0.54, phone: 0.78 };
  let x = num(raw.x, NaN);
  let y = num(raw.y, NaN);
  if (!Number.isFinite(x)) x = canvasW * 0.42;
  if (!Number.isFinite(y)) y = canvasH * (posY[type] ?? 0.5);

  const boxWidth = num(raw.boxWidth, 0);
  const boxHeight = num(raw.boxHeight, 0);
  const coverFill = raw.coverFill;
  const boxEnabled =
    raw.boxEnabled ?? Boolean(coverFill || (boxWidth > 0 && boxHeight > 0));

  const colorDefault =
    type === 'name' || type === 'code' || type === 'phone' ? FIELD_COLORS[type] : '#111827';

  return {
    id: raw.id || `layer-${index}-${layerUid()}`,
    type,
    x,
    y,
    fontSize: num(raw.fontSize, DEFAULT_FONT_SIZE),
    color: validColor(raw.color, colorDefault),
    fontFamily: raw.fontFamily || DEFAULT_FONT,
    fontWeight: String(raw.fontWeight || '700'),
    textAlign: (raw.textAlign as CanvasTextAlign) || 'center',
    rotation: num(raw.rotation, 0),
    opacity: num(raw.opacity, 1),
    visible: raw.visible !== false,
    shadowOn: Boolean(raw.shadowOn),
    shadowColor: raw.shadowColor || 'rgba(0,0,0,0.42)',
    shadowBlur: num(raw.shadowBlur, 5),
    shadowOffsetX: num(raw.shadowOffsetX, 1),
    shadowOffsetY: num(raw.shadowOffsetY, 2),
    scaleX: num(raw.scaleX, 1),
    scaleY: num(raw.scaleY, 1),
    boxEnabled,
    boxWidth,
    boxHeight,
    boxColor: validColor(raw.boxColor || coverFill, '#ffffff'),
    width: num(raw.width, 120),
    height: num(raw.height, 120),
    imageSrc: raw.imageSrc ?? null,
    coverFill: raw.coverFill,
    markerWRatio: raw.markerWRatio,
    markerHRatio: raw.markerHRatio,
    boxWRatio: raw.boxWRatio,
    boxHRatio: raw.boxHRatio,
  };
}

export function normalizeDesignLayers(
  source: Partial<DesignLayer>[] | undefined,
  canvasW: number,
  canvasH: number
): DesignLayer[] {
  if (!source?.length) return [];
  return source
    .filter((l) => l && TEXT_TYPES.includes(l.type as LayerType))
    .map((l, i) => normalizeDesignLayer(l as DesignLayer, i, canvasW, canvasH));
}
