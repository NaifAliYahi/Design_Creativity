import type {
  ComplaintImpact,
  IntakeType,
  LossCode,
  OperationStatus,
  OrderStatus,
  TicketPriority,
} from '../types';

export const STORAGE_KEY = 'cs-operations-data-v1';

export const INTAKE_TYPES: IntakeType[] = ['جديد', 'استكمال', 'محوّل'];

export const OPERATION_STATUSES: OperationStatus[] = ['ناقص', 'جاري', 'مكتمل', 'غير مطلوب'];

export const INVENTORY_STATUSES = ['ناقص', 'جاري', 'مكتمل'] as const;

export const COMPLETION_STATUSES = ['ناقص', 'جاري', 'مكتمل'] as const;

export const ORDER_STATUSES: OrderStatus[] = [
  'جديد',
  'قيد التنفيذ',
  'بانتظار العميل',
  'بانتظار مرفقات',
  'بانتظار مخزون',
  'بانتظار تصميم',
  'بانتظار دعم فني',
  'مكتمل',
  'مغلق',
  'مفقود',
];

export const LOSS_CODES: { code: LossCode; label: string }[] = [
  { code: 'L01', label: 'لا يرد' },
  { code: 'L02', label: 'رفض نهائي' },
  { code: 'L03', label: 'منافس' },
  { code: 'L04', label: 'سعر' },
  { code: 'L05', label: 'تعقيد تقني' },
  { code: 'L06', label: 'تأخر داخلي' },
  { code: 'L07', label: 'أخرى' },
];

export const WA_TYPES = ['WA-01', 'WA-02', 'WA-03', 'WA-04', 'WA-05', 'مخصص', 'رد عميل'] as const;

export const CALL_REASONS = [
  'استلام جديد',
  'متابعة مرفقات',
  'متابعة مخزون/تصميم',
  'متابعة استكمال',
  'دعم فني L1',
  'تأكيد حل',
  'شكوى',
  'إغلاق + CSAT',
  'إعادة تواصل',
  'handoff',
  'أخرى',
];

export const TICKET_PRIORITIES: TicketPriority[] = ['P1', 'P2', 'P3'];

export const COMPLAINT_IMPACTS: ComplaintImpact[] = ['منخفض', 'متوسط', 'عالي', 'حرج'];

export const KPI_TARGETS = {
  contactRate: 95,
  completionRate: 85,
  closeRate: 90,
  followUpRate: 95,
  documentationRate: 95,
  csat: 90,
  lossRate: 10,
  frtMinutes: 15,
  attendance: 98,
};

export const NAV_ITEMS = [
  { path: '/admin', label: 'لوحة التحكم', icon: 'dashboard' },
  { path: '/customers', label: 'العملاء', icon: 'users' },
  { path: '/daily-plan', label: 'خطة اليوم', icon: 'calendar' },
  { path: '/whatsapp', label: 'واتساب', icon: 'message' },
  { path: '/calls', label: 'الاتصالات', icon: 'phone' },
  { path: '/tickets', label: 'التذاكر الفنية', icon: 'ticket' },
  { path: '/complaints', label: 'الشكاوى', icon: 'alert' },
  { path: '/loss', label: 'فقد العملاء', icon: 'loss' },
  { path: '/reports', label: 'التقارير', icon: 'report' },
  { path: '/settings', label: 'الإعدادات', icon: 'settings' },
];

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  'جديد': 'bg-blue-100 text-blue-800',
  'قيد التنفيذ': 'bg-amber-100 text-amber-800',
  'بانتظار العميل': 'bg-orange-100 text-orange-800',
  'بانتظار مرفقات': 'bg-yellow-100 text-yellow-800',
  'بانتظار مخزون': 'bg-purple-100 text-purple-800',
  'بانتظار تصميم': 'bg-indigo-100 text-indigo-800',
  'بانتظار دعم فني': 'bg-red-100 text-red-800',
  'مكتمل': 'bg-emerald-100 text-emerald-800',
  'مغلق': 'bg-slate-200 text-slate-700',
  'مفقود': 'bg-rose-100 text-rose-800',
};

export function uid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA');
  } catch {
    return iso;
  }
}

export function daysSince(iso: string): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function nextTicketNumber(tickets: { ticketNumber: string }[]): string {
  const nums = tickets
    .map((t) => parseInt(t.ticketNumber.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `TICKET-${String(next).padStart(4, '0')}`;
}

export function nextComplaintNumber(complaints: { complaintNumber: string }[]): string {
  const nums = complaints
    .map((c) => parseInt(c.complaintNumber.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `COM-${String(next).padStart(4, '0')}`;
}
