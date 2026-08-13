/** مسار ملف ثابت — يعمل محلياً وعلى GitHub Pages وNetlify */
export function assetUrl(path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${clean}`;
}
