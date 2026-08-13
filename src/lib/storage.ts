import type { AppData, Customer } from '../types';
import { uid, todayDate, nowISO } from '../constants';
import { seedResponseTemplates } from './responses';

const DEFAULT_SETTINGS = {
  employees: ['محمد', 'سارة', 'نايف'],
  currentEmployee: 'محمد',
  companyName: 'كروت الشبكات — محفظة جيب',
};

function sampleCustomers(): Customer[] {
  const emp = 'محمد';
  return [
    {
      id: uid(),
      code: '22540',
      phone: '0551234567',
      networkName: 'شبكة النور',
      intakeType: 'محوّل',
      currentEmployee: emp,
      previousEmployee: 'نايف',
      attachmentsStatus: 'مكتمل',
      inventoryStatus: 'مكتمل',
      designStatus: 'جاري',
      completionStatus: 'ناقص',
      orderStatus: 'قيد التنفيذ',
      receivedDate: '2026-07-28',
      lastUpdated: nowISO(),
      lastAction: 'التصميم قيد الإنجاز — متابعة غدًا 10 ص',
      followUpDate: new Date(Date.now() + 86400000).toISOString(),
      notes: '',
      ticketId: '',
      complaintId: '',
      csat: null,
      lossCode: '',
    },
    {
      id: uid(),
      code: '33421',
      phone: '0559876543',
      networkName: 'شبكة الأمل',
      intakeType: 'جديد',
      currentEmployee: emp,
      previousEmployee: '',
      attachmentsStatus: 'ناقص',
      inventoryStatus: 'ناقص',
      designStatus: 'غير مطلوب',
      completionStatus: 'ناقص',
      orderStatus: 'بانتظار العميل',
      receivedDate: todayDate(),
      lastUpdated: nowISO(),
      lastAction: 'تم التواصل — العميل سيرفع المرفقات غدًا',
      followUpDate: new Date(Date.now() + 86400000).toISOString(),
      notes: '',
      ticketId: '',
      complaintId: '',
      csat: null,
      lossCode: '',
    },
    {
      id: uid(),
      code: '88990',
      phone: '0555551234',
      networkName: 'شبكة السلام',
      intakeType: 'استكمال',
      currentEmployee: 'سارة',
      previousEmployee: '',
      attachmentsStatus: 'مكتمل',
      inventoryStatus: 'جاري',
      designStatus: 'غير مطلوب',
      completionStatus: 'ناقص',
      orderStatus: 'بانتظار مخزون',
      receivedDate: '2026-07-20',
      lastUpdated: new Date(Date.now() - 4 * 86400000).toISOString(),
      lastAction: 'تصعيد SLA مخزون — يوم 4',
      followUpDate: new Date().toISOString(),
      notes: 'متأخر — يحتاج تصعيد',
      ticketId: '',
      complaintId: '',
      csat: null,
      lossCode: '',
    },
  ];
}

export function defaultData(): AppData {
  return {
    customers: sampleCustomers(),
    whatsappLogs: [],
    callLogs: [],
    lossRecords: [],
    tickets: [],
    complaints: [],
    dailyReports: [],
    responseTemplates: seedResponseTemplates(),
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** JSON backup only — primary storage is IndexedDB (lib/db.ts) */

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cs-backup-${todayDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as AppData;
        resolve(parsed);
      } catch {
        reject(new Error('ملف غير صالح'));
      }
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsText(file);
  });
}

export function resetData(): AppData {
  return defaultData();
}
