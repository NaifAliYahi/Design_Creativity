import * as XLSX from 'xlsx';
import type { NetworkFields } from './types';

export function downloadNetcardExcelTemplate(): void {
  const rows = [
    ['اسم الشبكة', 'رقم الكود', 'رقم الهاتف'],
    ['شبكة انترنت', '12345', '777465157'],
    ['شبكة الحي', '67890', '777123456'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, 'mahfazat-jeeb-template.xlsx');
}

export function parseNetcardExcel(file: ArrayBuffer): NetworkFields[] {
  const wb = XLSX.read(new Uint8Array(file), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
  });
  const first = (rows[0] || []).map((c) => String(c).toLowerCase());
  const hasHeader = first.some((c) => c.includes('اسم') || c.includes('name') || c.includes('كود'));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows
    .map((r) => ({
      name: String(r[0] ?? '').trim(),
      code: String(r[1] ?? '').trim(),
      phone: String(r[2] ?? '').trim(),
    }))
    .filter((r) => r.name || r.code || r.phone);
}
