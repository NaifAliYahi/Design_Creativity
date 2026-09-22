import { assetUrl } from '../assetUrl';
import { normalizeDesignLayers } from './normalize-layer';
import type { DesignLayer } from './types';

type LayoutFilePayload = {
  template_code?: string;
  layers?: Partial<DesignLayer>[];
  version?: number;
};

const fileCache = new Map<string, DesignLayer[] | null>();

/** ملفات JSON من مديول Odoo — public/netcard/layouts/templateN.json */
export async function loadOdooLayoutFile(
  templateId: string,
  canvasW: number,
  canvasH: number
): Promise<DesignLayer[] | null> {
  const key = `${templateId}@${canvasW}x${canvasH}`;
  if (fileCache.has(key)) return fileCache.get(key)!;

  try {
    const url = assetUrl(`netcard/layouts/${templateId}.json`);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      fileCache.set(key, null);
      return null;
    }
    const payload = (await res.json()) as LayoutFilePayload;
    const layers = normalizeDesignLayers(payload.layers, canvasW, canvasH);
    fileCache.set(key, layers.length ? layers : null);
    return layers.length ? layers : null;
  } catch {
    fileCache.set(key, null);
    return null;
  }
}

export function clearLayoutFileCache(): void {
  fileCache.clear();
}
