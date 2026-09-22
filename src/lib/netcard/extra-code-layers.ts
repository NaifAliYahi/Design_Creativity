import { defaultLayer, layerUid } from './constants';
import type { DesignLayer } from './types';

const MAX_EXTRA = 19;

export function layerListLabel(layer: DesignLayer, extraCodes: string[]): string {
  if (layer.type === 'code' && layer.codeIndex && layer.codeIndex > 0) {
    return extraCodes.length > 1 ? `كود/نص إضافي ${layer.codeIndex}` : 'كود آخر أو نص';
  }
  const labels: Record<string, string> = {
    name: 'اسم الشبكة',
    code: 'رقم الكود',
    phone: 'رقم الهاتف',
    image: 'صورة',
  };
  return labels[layer.type] ?? layer.type;
}

/** مزامنة طبقات code مع extraCodes (مثل Odoo ensureExtraCodeLayers) */
export function syncExtraCodeLayers(
  layers: DesignLayer[],
  canvasW: number,
  canvasH: number,
  extraCodes: string[]
): DesignLayer[] {
  const capped = extraCodes.slice(0, MAX_EXTRA);
  const needExtra = capped.length;
  let next = [...layers];
  const codeLayers = next.filter((l) => l.type === 'code');
  const primary = codeLayers.find((l) => !l.codeIndex || l.codeIndex === 0) ?? codeLayers[0];

  while (next.filter((l) => l.type === 'code').length < needExtra + 1) {
    const index = next.filter((l) => l.type === 'code').length;
    const base = primary ?? defaultLayer('code', canvasW, canvasH);
    const clone: DesignLayer = {
      ...JSON.parse(JSON.stringify(base)),
      id: layerUid(),
      codeIndex: index,
      y: base.y + base.fontSize * 1.2 * index,
    };
    next.push(clone);
  }

  return next.filter((l) => l.type !== 'code' || (l.codeIndex ?? 0) <= needExtra);
}
