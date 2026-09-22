import { drawTextLayer, layerDisplayText } from './draw-text-layer';
import { sanitizeFilename, TEMPLATE_LABELS } from './constants';
import { resolveTemplateBackground } from './templates';
import { resolveTemplateLayers } from './template-layout';
import type { DesignLayer, NetworkFields } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load'));
    img.src = src;
  });
}

function layerText(layer: DesignLayer, fields: NetworkFields): string {
  return layerDisplayText(layer, fields, true);
}

function drawExportLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  fields: NetworkFields,
  imageCache: Record<string, HTMLImageElement>
) {
  if (!layer.visible) return;

  if (layer.type !== 'image') {
    drawTextLayer(ctx, layer, layerText(layer, fields));
    return;
  }

  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  const img = imageCache[layer.id];
  if (img?.complete) {
    ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  }
  ctx.restore();
}

async function preloadImages(layers: DesignLayer[]): Promise<Record<string, HTMLImageElement>> {
  const cache: Record<string, HTMLImageElement> = {};
  await Promise.all(
    layers
      .filter((l) => l.type === 'image' && l.imageSrc)
      .map(
        (l) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              cache[l.id] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = l.imageSrc!;
          })
      )
  );
  return cache;
}

export async function renderTemplateToBlob(
  templateId: string,
  fields: NetworkFields,
  options: { guestMode?: boolean; srcOverride?: string; label?: string } = {}
): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const src = options.srcOverride ?? (await resolveTemplateBackground(templateId));
    const bg = await loadImage(src);
    const w = bg.naturalWidth;
    const h = bg.naturalHeight;
    const layers = await resolveTemplateLayers(templateId, w, h);
    if (!layers.length) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageCache = await preloadImages(layers);
    ctx.drawImage(bg, 0, 0, w, h);
    layers.forEach((l) => drawExportLayer(ctx, l, fields, imageCache));

    const dataUrl = canvas.toDataURL('image/png');
    const bin = atob(dataUrl.split(',')[1] ?? '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const base = sanitizeFilename(fields.name || 'بطاقة');
    const label = options.label ?? TEMPLATE_LABELS[templateId] ?? templateId;
    return {
      blob: new Blob([arr], { type: 'image/png' }),
      filename: `${base}-${label}.png`,
    };
  } catch {
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function renderTemplatePreviewDataUrl(
  templateId: string,
  fields: NetworkFields,
  options: { maxWidth?: number } = {}
): Promise<string | null> {
  try {
    const src = await resolveTemplateBackground(templateId);
    const bg = await loadImage(src);
    const w = bg.naturalWidth;
    const h = bg.naturalHeight;
    const layers = await resolveTemplateLayers(templateId, w, h);
    if (!layers.length) return null;

    const maxW = options.maxWidth ?? 280;
    const scale = Math.min(1, maxW / w);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);
    const imageCache = await preloadImages(layers);
    ctx.drawImage(bg, 0, 0, w, h);
    layers.forEach((l) => drawExportLayer(ctx, l, fields, imageCache));

    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return null;
  }
}

export async function exportTemplatesBatch(
  templateIds: string[],
  fields: NetworkFields,
  options: { guestMode?: boolean; onProgress?: (current: number, total: number, id: string) => void } = {}
): Promise<number> {
  let ok = 0;
  for (let i = 0; i < templateIds.length; i++) {
    const id = templateIds[i]!;
    options.onProgress?.(i + 1, templateIds.length, id);
    const result = await renderTemplateToBlob(id, fields, { guestMode: options.guestMode });
    if (result) {
      downloadBlob(result.blob, result.filename);
      ok++;
      await new Promise((r) => setTimeout(r, 450));
    }
  }
  return ok;
}

export async function exportAllRowsAllTemplates(
  templateIds: string[],
  rows: NetworkFields[],
  options: { guestMode?: boolean } = {}
): Promise<number> {
  let ok = 0;
  for (const row of rows) {
    for (const id of templateIds) {
      const result = await renderTemplateToBlob(id, row, { guestMode: options.guestMode });
      if (result) {
        downloadBlob(result.blob, result.filename);
        ok++;
        await new Promise((r) => setTimeout(r, 450));
      }
    }
  }
  return ok;
}
