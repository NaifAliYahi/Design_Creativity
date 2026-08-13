import { BUILTIN_TEMPLATES, TEMPLATE_NAMES } from './constants';
import { loadNetcardCustomTemplates } from '../db';
import type { TemplateThumb } from './types';
import { assetUrl } from '../assetUrl';
import { loadTemplateStore } from './storage';

const chunkCache = new Map<string, string>();
const thumbCache = new Map<string, string>();

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed: ${src}`));
    document.head.appendChild(s);
  });
}

function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`failed: ${url}`));
    img.src = url;
  });
}

async function loadJsTemplate(name: string): Promise<string> {
  (window as unknown as { __tplChunk?: string }).__tplChunk = undefined;
  await loadScript(assetUrl(`netcard/templates-data/${name}.js`));
  const data = (window as unknown as { __tplChunk?: string }).__tplChunk;
  (window as unknown as { __tplChunk?: string }).__tplChunk = undefined;
  if (!data) throw new Error(`تعذر تحميل ${name}`);
  return data;
}

/** تحميل خلفية أي قالب — مدمج أو مخصص */
export async function resolveTemplateBackground(templateId: string): Promise<string> {
  const cached = chunkCache.get(templateId);
  if (cached) return cached;

  if (!templateId.startsWith('custom-')) {
    try {
      return await loadTemplateImage(templateId);
    } catch {
      /* fall through to store / custom */
    }
  }

  const store = await loadTemplateStore();
  const savedBg = store[templateId]?.background;
  if (savedBg) {
    chunkCache.set(templateId, savedBg);
    return savedBg;
  }

  if (templateId.startsWith('custom-')) {
    const customs = await loadNetcardCustomTemplates();
    const custom = customs.find((t) => t.id === templateId);
    if (custom) {
      chunkCache.set(templateId, custom.base64);
      return custom.base64;
    }
  }

  throw new Error(`تعذر تحميل القالب: ${templateId}`);
}

/** تحميل صورة القالب المدمج — PNG أو JPG أو JS */
export async function loadTemplateImage(name: string): Promise<string> {
  const cached = chunkCache.get(name);
  if (cached) return cached;

  const meta = BUILTIN_TEMPLATES.find((t) => t.id === name);
  let data: string;

  if (meta?.source === 'png') {
    data = await loadImageAsDataUrl(assetUrl(`netcard/templates/${name}.png`));
  } else if (meta?.source === 'jpg') {
    data = await loadImageAsDataUrl(assetUrl(`netcard/templates/${name}.jpg`));
  } else {
    data = await loadJsTemplate(name);
  }

  chunkCache.set(name, data);
  return data;
}

export async function loadTemplateThumb(name: string): Promise<string> {
  const cached = thumbCache.get(name);
  if (cached) return cached;
  const img = await loadTemplateImage(name);
  thumbCache.set(name, img);
  return img;
}

export async function loadAllTemplateThumbs(): Promise<TemplateThumb[]> {
  const results = await Promise.all(
    TEMPLATE_NAMES.map(async (name) => {
      try {
        const thumb = await loadTemplateThumb(name);
        return { name, thumb };
      } catch {
        return { name, thumb: '' };
      }
    })
  );
  return results.filter((t) => t.thumb);
}

export function preloadTemplates(): void {
  loadTemplateImage('template1').catch(() => {});
}
