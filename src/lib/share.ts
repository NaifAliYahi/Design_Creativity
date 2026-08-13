import { buildWhatsAppUrl, formatPhoneForWhatsApp } from './responses';

/** مشاركة ملف (صورة بطاقة) عبر Web Share API أو واتساب */
export async function shareCardViaWhatsApp(
  phone: string,
  message: string,
  blob: Blob,
  filename = 'بطاقة-شبكة.png'
): Promise<'shared' | 'whatsapp' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share) {
    try {
      const payload: ShareData = { text: message, files: [file] };
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
        return 'shared';
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);

  if (phone.trim()) {
    window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
    return 'whatsapp';
  }

  return 'downloaded';
}

export function buildCardShareMessage(name: string, code: string): string {
  const lines = ['مرحباً 👋', ''];
  if (name) lines.push(`🌐 ${name}`);
  if (code) lines.push(`🔢 كود الشبكة: ${code}`);
  lines.push('', 'بطاقة الشبكة مرفقة 📎');
  return lines.join('\n');
}

export function isValidWhatsAppPhone(phone: string): boolean {
  const p = formatPhoneForWhatsApp(phone);
  return p.length >= 11;
}
