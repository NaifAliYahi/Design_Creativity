import { PLACEHOLDERS } from './constants';
import type { DesignLayer, NetworkFields } from './types';

export function layerDisplayText(
  layer: DesignLayer,
  fields: NetworkFields,
  preview: boolean
): string {
  if (layer.type === 'image') return '';
  if (layer.type === 'code' && layer.codeIndex && layer.codeIndex > 0) {
    const extra = fields.extraCodes?.[layer.codeIndex - 1] ?? '';
    if (preview) return String(extra);
    return extra ? String(extra) : '[كود/نص إضافي]';
  }
  const val = layer.type === 'name' || layer.type === 'code' || layer.type === 'phone' ? fields[layer.type] : '';
  if (preview) return String(val || '');
  return val ? String(val) : PLACEHOLDERS[layer.type as keyof typeof PLACEHOLDERS];
}

function canvasFont(layer: DesignLayer): string {
  const family = layer.fontFamily || 'Cairo';
  const weight = layer.fontWeight || '700';
  return `${weight} ${layer.fontSize}px "${family}", "Tajawal", Tahoma, Arial, sans-serif`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, r);
  } else {
    ctx.rect(x, y, width, height);
  }
}

export function measureTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  text: string
): { w: number; h: number } {
  ctx.save();
  ctx.font = canvasFont(layer);
  const measuredWidth = Math.max(ctx.measureText(text || '…').width, 40);
  const width = layer.boxWidth || measuredWidth + 24;
  const height = layer.boxHeight || layer.fontSize * 1.45;
  ctx.restore();
  const sx = layer.scaleX ?? 1;
  const sy = layer.scaleY ?? 1;
  return { w: width * sx, h: height * sy };
}

export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  text: string
): void {
  if (layer.type === 'image' || !text) return;

  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
  ctx.globalAlpha = layer.opacity;
  ctx.font = canvasFont(layer);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  const measuredWidth = Math.max(ctx.measureText(text).width, 40);
  const width = layer.boxWidth || measuredWidth + 24;
  const height = layer.boxHeight || layer.fontSize * 1.45;

  if (layer.boxEnabled) {
    ctx.fillStyle = layer.boxColor || layer.coverFill || '#ffffff';
    roundedRect(ctx, -width / 2, -height / 2, width, height, Math.min(14, height / 4));
    ctx.fill();
  }

  if (layer.shadowOn) {
    ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.42)';
    ctx.shadowBlur = layer.shadowBlur ?? 5;
    ctx.shadowOffsetX = layer.shadowOffsetX ?? 1;
    ctx.shadowOffsetY = layer.shadowOffsetY ?? 2;
  }

  ctx.fillStyle = layer.color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
