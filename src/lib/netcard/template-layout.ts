import { BUILTIN_TEMPLATES, defaultLayer } from './constants';
import { loadTemplateStore, saveTemplateEntry } from './storage';
import { resolveTemplateBackground } from './templates';
import { buildPresetLayers } from './template-presets';
import type { DesignLayer, LayerType } from './types';

const TEXT_TYPES = ['name', 'code', 'phone'] as const;
type TextType = (typeof TEXT_TYPES)[number];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load'));
    img.src = src;
  });
}

export function isTextLayerType(type: LayerType): type is TextType {
  return TEXT_TYPES.includes(type as TextType);
}

/** إزالة التكرار — ليبل واحد لكل نوع */
export function normalizeTextLayers(layers: DesignLayer[]): DesignLayer[] {
  const images = layers.filter((l) => l.type === 'image');
  const text: DesignLayer[] = [];
  for (const type of TEXT_TYPES) {
    const matches = layers.filter((l) => l.type === type);
    if (matches.length) text.push({ ...matches[matches.length - 1]! });
  }
  return [...text, ...images];
}

/** تحميل طبقات القالب: محفوظ → افتراضي */
export async function resolveTemplateLayers(
  templateId: string,
  w: number,
  h: number,
  ensureAll = true
): Promise<DesignLayer[]> {
  const store = await loadTemplateStore();
  let layers: DesignLayer[] =
    store[templateId]?.layers?.length > 0
      ? JSON.parse(JSON.stringify(store[templateId]!.layers))
      : buildPresetLayers(templateId, w, h);
  layers = normalizeTextLayers(layers);
  if (ensureAll) layers = ensureThreeTextLayers(layers, w, h, templateId);
  return layers;
}

/** تأكد من وجود اسم + كود + هاتف */
export function ensureThreeTextLayers(
  layers: DesignLayer[],
  w: number,
  h: number,
  templateId: string
): DesignLayer[] {
  const next = layers.map((l) => ({ ...l }));
  for (const type of TEXT_TYPES) {
    if (!next.some((l) => l.type === type)) {
      next.push(defaultLayer(type, w, h, templateId));
    }
  }
  return next;
}

export function layerStylePatch(layer: DesignLayer): Partial<DesignLayer> {
  return {
    fontSize: layer.fontSize,
    color: layer.color,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    textAlign: layer.textAlign,
    rotation: layer.rotation,
  };
}

/** تطبيق موقع/خط/لون ليبل على كل القوالب (نسب x/y) */
export async function applyTextLayerToAllTemplates(
  sourceLayer: DesignLayer,
  canvasW: number,
  canvasH: number,
  templateIds: string[] = BUILTIN_TEMPLATES.map((t) => t.id)
): Promise<number> {
  if (!isTextLayerType(sourceLayer.type)) return 0;
  const type = sourceLayer.type;
  const xRatio = sourceLayer.x / canvasW;
  const yRatio = sourceLayer.y / canvasH;
  const style = layerStylePatch(sourceLayer);
  const store = await loadTemplateStore();
  let count = 0;

  for (const id of templateIds) {
    try {
      const src = await resolveTemplateBackground(id);
      const img = await loadImage(src);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let layers: DesignLayer[] =
        store[id]?.layers?.length > 0
          ? JSON.parse(JSON.stringify(store[id]!.layers))
          : buildPresetLayers(id, w, h);
      layers = ensureThreeTextLayers(layers, w, h, id);
      layers = layers.map((l) =>
        l.type === type
          ? { ...l, x: w * xRatio, y: h * yRatio, ...style }
          : l
      );
      await saveTemplateEntry(id, { layers, background: src, updatedAt: Date.now() });
      count++;
    } catch {
      /* skip broken template */
    }
  }
  return count;
}

/** إعادة قالب واحد للإعدادات الافتراضية */
export async function resetTemplateLayout(templateId: string): Promise<void> {
  const src = await resolveTemplateBackground(templateId);
  const img = await loadImage(src);
  const layers = buildPresetLayers(templateId, img.naturalWidth, img.naturalHeight);
  await saveTemplateEntry(templateId, {
    layers,
    background: src,
    updatedAt: Date.now(),
  });
}

/** إعادة كل القوالب للافتراضي */
export async function resetAllTemplateLayouts(
  templateIds: string[] = BUILTIN_TEMPLATES.map((t) => t.id)
): Promise<number> {
  let n = 0;
  for (const id of templateIds) {
    try {
      await resetTemplateLayout(id);
      n++;
    } catch {
      /* skip */
    }
  }
  return n;
}

/** نسخ كل طبقات النص الحالية إلى كل القوالب */
export async function applyAllTextLayersToAllTemplates(
  sourceLayers: DesignLayer[],
  canvasW: number,
  canvasH: number,
  templateIds: string[] = BUILTIN_TEMPLATES.map((t) => t.id)
): Promise<void> {
  for (const type of TEXT_TYPES) {
    const layer = sourceLayers.find((l) => l.type === type);
    if (layer) await applyTextLayerToAllTemplates(layer, canvasW, canvasH, templateIds);
  }
}
