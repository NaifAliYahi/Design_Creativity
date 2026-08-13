import * as XLSX from 'xlsx';
import type { Customer } from '../types';
import { uid, nowISO, todayDate } from '../constants';
import type { IntakeType, OperationStatus, OrderStatus } from '../types';

/** أسماء الأعمدة المدعومة — عربي أو إنجليزي */
const COLUMN_MAP: Record<string, keyof Customer | 'skip'> = {
  // كود
  'كود': 'code',
  'كود العميل': 'code',
  'رقم الكود': 'code',
  code: 'code',
  // جوال
  'جوال': 'phone',
  'الجوال': 'phone',
  'رقم الجوال': 'phone',
  phone: 'phone',
  mobile: 'phone',
  // شبكة
  'شبكة': 'networkName',
  'اسم الشبكة': 'networkName',
  network: 'networkName',
  networkname: 'networkName',
  // استلام
  'نوع الاستلام': 'intakeType',
  intaketype: 'intakeType',
  // موظف
  'الموظف': 'currentEmployee',
  'الموظف الحالي': 'currentEmployee',
  employee: 'currentEmployee',
  currentemployee: 'currentEmployee',
  // موظف سابق
  'الموظف السابق': 'previousEmployee',
  previousemployee: 'previousEmployee',
  // عمليات
  'المرفقات': 'attachmentsStatus',
  'حالة المرفقات': 'attachmentsStatus',
  attachments: 'attachmentsStatus',
  attachmentsstatus: 'attachmentsStatus',
  'المخزون': 'inventoryStatus',
  'حالة المخزون': 'inventoryStatus',
  inventory: 'inventoryStatus',
  inventorystatus: 'inventoryStatus',
  'التصميم': 'designStatus',
  'حالة التصميم': 'designStatus',
  design: 'designStatus',
  designstatus: 'designStatus',
  'الاستكمال': 'completionStatus',
  'حالة الاستكمال': 'completionStatus',
  'استكمال الطلب': 'completionStatus',
  completion: 'completionStatus',
  completionstatus: 'completionStatus',
  // حالة
  'حالة الطلب': 'orderStatus',
  'الحالة': 'orderStatus',
  status: 'orderStatus',
  orderstatus: 'orderStatus',
  // تواريخ
  'تاريخ الاستلام': 'receivedDate',
  receiveddate: 'receivedDate',
  'موعد المتابعة': 'followUpDate',
  followupdate: 'followUpDate',
  'آخر إجراء': 'lastAction',
  lastaction: 'lastAction',
  // أخرى
  'ملاحظات': 'notes',
  notes: 'notes',
};

function normHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function mapHeader(h: string): keyof Customer | 'skip' | null {
  const n = normHeader(h);
  if (COLUMN_MAP[n]) return COLUMN_MAP[n];
  if (COLUMN_MAP[h.trim()]) return COLUMN_MAP[h.trim()];
  // try without spaces
  const compact = n.replace(/\s/g, '');
  for (const [mapKey, val] of Object.entries(COLUMN_MAP)) {
    if (mapKey.replace(/\s/g, '') === compact) return val;
  }
  return null;
}

function cellStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(Math.round(v));
  return String(v).trim();
}

function parseDate(v: unknown): string {
  if (!v) return todayDate();
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = cellStr(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return todayDate();
}

function parseDateTime(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0).toISOString();
    }
  }
  const s = cellStr(v);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return '';
}

const VALID = {
  intakeType: ['جديد', 'استكمال', 'محوّل'] as IntakeType[],
  attachmentsStatus: ['ناقص', 'جاري', 'مكتمل', 'غير مطلوب'] as OperationStatus[],
  inventoryStatus: ['ناقص', 'جاري', 'مكتمل'],
  designStatus: ['ناقص', 'جاري', 'مكتمل', 'غير مطلوب'] as OperationStatus[],
  completionStatus: ['ناقص', 'جاري', 'مكتمل'],
  orderStatus: [
    'جديد', 'قيد التنفيذ', 'بانتظار العميل', 'بانتظار مرفقات',
    'بانتظار مخزون', 'بانتظار تصميم', 'بانتظار دعم فني', 'مكتمل', 'مغلق', 'مفقود',
  ] as OrderStatus[],
};

function pickValid<T extends string>(val: string, options: readonly T[], fallback: T): T {
  const found = options.find((o) => o === val || val.includes(o));
  return found ?? fallback;
}

export interface ImportRow {
  rowNum: number;
  customer: Partial<Customer>;
  errors: string[];
  isNew: boolean;
}

export interface ImportResult {
  rows: ImportRow[];
  headers: string[];
  mapped: string[];
}

export function parseExcelFile(buffer: ArrayBuffer, existingCodes: Set<string>): ImportResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length < 2) {
    return { rows: [], headers: [], mapped: [] };
  }

  const headers = (raw[0] as unknown[]).map((h) => cellStr(h));
  const fieldIndexes: (keyof Customer | 'skip' | null)[] = headers.map(mapHeader);
  const mapped = headers.map((h, i) => {
    const f = fieldIndexes[i];
    return f && f !== 'skip' ? `${h} → ${f}` : h;
  });

  const rows: ImportRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const line = raw[i] as unknown[];
    if (!line.some((c) => cellStr(c))) continue;

    const partial: Partial<Customer> = {};
    const errors: string[] = [];

    fieldIndexes.forEach((field, colIdx) => {
      if (!field || field === 'skip') return;
      const val = line[colIdx];
      const str = cellStr(val);

      switch (field) {
        case 'code':
          partial.code = str.replace(/\D/g, '').slice(0, 10) || str;
          break;
        case 'phone':
          partial.phone = str.replace(/\s/g, '');
          break;
        case 'networkName':
          partial.networkName = str;
          break;
        case 'intakeType':
          partial.intakeType = pickValid(str, VALID.intakeType, 'جديد');
          break;
        case 'currentEmployee':
        case 'previousEmployee':
          partial[field] = str;
          break;
        case 'attachmentsStatus':
          partial.attachmentsStatus = pickValid(str, VALID.attachmentsStatus, 'ناقص');
          break;
        case 'inventoryStatus':
          partial.inventoryStatus = pickValid(str, VALID.inventoryStatus, 'ناقص') as Customer['inventoryStatus'];
          break;
        case 'designStatus':
          partial.designStatus = pickValid(str, VALID.designStatus, 'غير مطلوب');
          break;
        case 'completionStatus':
          partial.completionStatus = pickValid(str, VALID.completionStatus, 'ناقص') as Customer['completionStatus'];
          break;
        case 'orderStatus':
          partial.orderStatus = pickValid(str, VALID.orderStatus, 'جديد');
          break;
        case 'receivedDate':
          partial.receivedDate = parseDate(val);
          break;
        case 'followUpDate':
          partial.followUpDate = parseDateTime(val);
          break;
        case 'lastAction':
          partial.lastAction = str;
          break;
        case 'notes':
          partial.notes = str;
          break;
      }
    });

    if (!partial.code) errors.push('الكود مطلوب');
    if (!partial.phone) errors.push('الجوال مطلوب');
    if (!partial.networkName) errors.push('اسم الشبكة مطلوب');

    rows.push({
      rowNum: i + 1,
      customer: partial,
      errors,
      isNew: partial.code ? !existingCodes.has(partial.code) : true,
    });
  }

  return { rows, headers, mapped };
}

export function rowToCustomer(
  partial: Partial<Customer>,
  currentEmployee: string
): Omit<Customer, 'id' | 'lastUpdated'> {
  return {
    code: partial.code ?? '',
    phone: partial.phone ?? '',
    networkName: partial.networkName ?? '',
    intakeType: partial.intakeType ?? 'جديد',
    currentEmployee: partial.currentEmployee || currentEmployee,
    previousEmployee: partial.previousEmployee ?? '',
    attachmentsStatus: partial.attachmentsStatus ?? 'ناقص',
    inventoryStatus: partial.inventoryStatus ?? 'ناقص',
    designStatus: partial.designStatus ?? 'غير مطلوب',
    completionStatus: partial.completionStatus ?? 'ناقص',
    orderStatus: partial.orderStatus ?? 'جديد',
    receivedDate: partial.receivedDate ?? todayDate(),
    lastAction: partial.lastAction ?? 'مستورد من Excel',
    followUpDate: partial.followUpDate || new Date(Date.now() + 86400000).toISOString(),
    notes: partial.notes ?? '',
    ticketId: '',
    complaintId: '',
    csat: null,
    lossCode: '',
  };
}

export function exportCustomersToExcel(customers: Customer[], filename = 'customers-export.xlsx'): void {
  const headers = [
    'كود العميل', 'رقم الجوال', 'اسم الشبكة', 'نوع الاستلام',
    'الموظف الحالي', 'الموظف السابق', 'حالة المرفقات', 'حالة المخزون',
    'حالة التصميم', 'حالة استكمال الطلب', 'حالة الطلب', 'تاريخ الاستلام',
    'آخر إجراء', 'موعد المتابعة', 'ملاحظات',
  ];

  const data = customers.map((c) => [
    c.code, c.phone, c.networkName, c.intakeType,
    c.currentEmployee, c.previousEmployee, c.attachmentsStatus, c.inventoryStatus,
    c.designStatus, c.completionStatus, c.orderStatus, c.receivedDate,
    c.lastAction, c.followUpDate ? c.followUpDate.slice(0, 16) : '', c.notes,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  XLSX.writeFile(wb, filename);
}

export function downloadExcelTemplate(): void {
  const headers = [
    'كود العميل', 'رقم الجوال', 'اسم الشبكة', 'نوع الاستلام',
    'الموظف الحالي', 'حالة المرفقات', 'حالة المخزون', 'حالة التصميم',
    'حالة استكمال الطلب', 'حالة الطلب', 'تاريخ الاستلام', 'آخر إجراء', 'موعد المتابعة',
  ];
  const example = [
    '22540', '0551234567', 'شبكة النور', 'جديد',
    'محمد', 'ناقص', 'ناقص', 'غير مطلوب',
    'ناقص', 'جديد', '2026-08-01', 'تم التواصل — بانتظار المرفقات', '2026-08-02 10:00',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'نموذج');
  XLSX.writeFile(wb, 'نموذج-العملاء.xlsx');
}

export function mergeImportRow(existing: Customer, partial: Partial<Customer>): Customer {
  return {
    ...existing,
    ...partial,
    id: existing.id,
    lastUpdated: nowISO(),
  };
}

export { uid };
