import type { CatalogPersistResult } from './catalog';

export function catalogPersistMessage(result: CatalogPersistResult): string | null {
  if (result === 'server') return null;
  if (result === 'local-only') {
    return 'تم الحفظ في هذا المتصفح فقط. سجّل دخول الموظف ليظهر لجميع العملاء والمتصفحات.';
  }
  return 'لا يوجد سيرفر — التعديل محلي على هذا الجهاز فقط (Netlify بدون API لا يشارك الكatalog).';
}
