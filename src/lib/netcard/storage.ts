import type { TemplateStoreEntry } from './types';

import { loadNetcardTemplateStore, saveNetcardTemplateEntry } from '../db';



export async function loadTemplateStore(): Promise<Record<string, TemplateStoreEntry>> {

  return loadNetcardTemplateStore();

}



export async function saveTemplateEntry(id: string, entry: TemplateStoreEntry): Promise<void> {

  await saveNetcardTemplateEntry(id, entry);

}



export async function getSavedTemplateSummary(): Promise<Record<string, number>> {

  const store = await loadTemplateStore();

  const summary: Record<string, number> = {};

  for (const [id, entry] of Object.entries(store)) {

    summary[id] = entry.layers?.length ?? 0;

  }

  return summary;

}


