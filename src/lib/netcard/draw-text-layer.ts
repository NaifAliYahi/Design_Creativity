import { PLACEHOLDERS } from './constants';
import type { DesignLayer, NetworkFields } from './types';

export function layerDisplayText(
  layer: DesignLayer,
  fields: NetworkFields,
  preview: boolean
): string {
  if (layer.type === 'image') return '';
  const val = fields[layer.type as keyof NetworkFields];
  if (preview) return String(val || '');
  return val ? String(val) : PLACEHOLDERS[layer.type as keyof typeof PLACEHOLDERS];
}

export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  text: string
): void {
  if (layer.type === 'image' || !text) return;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  if (layer.shadowOn) {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  }
  ctx.fillStyle = layer.color;
  ctx.textAlign = layer.textAlign;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function measureTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  text: string
): { w: number; h: number } {
  ctx.save();
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  const w = Math.max(ctx.measureText(text || '…').width, 40);
  const h = layer.fontSize * 1.4;
  ctx.restore();
  return { w, h };
}
