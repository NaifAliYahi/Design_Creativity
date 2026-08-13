import { MAX_CUSTOM_TEMPLATE_BYTES } from './constants';
import type { CustomTemplate } from './types';
import {
  deleteNetcardCustomTemplate,
  loadNetcardCustomTemplates,
  saveNetcardCustomTemplate,
} from '../db';

export function makeUploadThumb(dataUrl: string, maxW = 160): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      try {
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function validateTemplateFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'يرجى اختيار صورة PNG أو JPG';
  if (file.size > MAX_CUSTOM_TEMPLATE_BYTES) {
    return 'الصورة كبيرة جداً (أكثر من 8MB). استخدم صورة أصغر.';
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

export async function loadCustomTemplates(): Promise<CustomTemplate[]> {
  return loadNetcardCustomTemplates();
}

export async function addCustomTemplate(file: File): Promise<CustomTemplate> {
  const err = validateTemplateFile(file);
  if (err) throw new Error(err);

  const base64 = await readFileAsDataUrl(file);
  return addCustomTemplateFromDataUrl(file.name.replace(/\.[^.]+$/, '') || 'قالب مخصص', base64);
}

export async function addCustomTemplateFromDataUrl(label: string, base64: string): Promise<CustomTemplate> {
  const thumb = await makeUploadThumb(base64);
  const id = `custom-${Date.now()}`;

  const entry: CustomTemplate = {
    id,
    label: label || 'قالب مخصص',
    base64,
    thumb,
    createdAt: Date.now(),
  };

  await saveNetcardCustomTemplate(entry);
  return entry;
}

export async function removeCustomTemplate(id: string): Promise<void> {
  await deleteNetcardCustomTemplate(id);
}
