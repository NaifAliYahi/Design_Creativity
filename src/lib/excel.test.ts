import { describe, it, expect } from 'vitest';
import { parseExcelFile, rowToCustomer } from '../lib/excel';
import * as XLSX from 'xlsx';

function makeExcelBuffer(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('Excel import', () => {
  it('parses Arabic headers and rows', () => {
    const buf = makeExcelBuffer([
      ['كود العميل', 'رقم الجوال', 'اسم الشبكة', 'حالة الطلب', 'آخر إجراء'],
      ['55101', '0551111111', 'شبكة تجريب', 'جديد', 'تم الاستلام'],
      ['55102', '0552222222', 'شبكة 2', 'قيد التنفيذ', 'متابعة'],
    ]);
    const result = parseExcelFile(buf, new Set());
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].customer.code).toBe('55101');
    expect(result.rows[0].customer.networkName).toBe('شبكة تجريب');
    expect(result.rows[0].errors).toHaveLength(0);
    expect(result.rows[0].isNew).toBe(true);
  });

  it('marks existing codes as not new', () => {
    const buf = makeExcelBuffer([
      ['code', 'phone', 'networkName'],
      ['22540', '0551234567', 'Test'],
    ]);
    const result = parseExcelFile(buf, new Set(['22540']));
    expect(result.rows[0].isNew).toBe(false);
  });

  it('reports missing required fields', () => {
    const buf = makeExcelBuffer([
      ['كود العميل'],
      ['123'],
    ]);
    const result = parseExcelFile(buf, new Set());
    expect(result.rows[0].errors.length).toBeGreaterThan(0);
  });
});

describe('rowToCustomer', () => {
  it('creates customer with defaults', () => {
    const c = rowToCustomer({ code: '999', phone: '0559999999', networkName: 'X' }, 'محمد');
    expect(c.currentEmployee).toBe('محمد');
    expect(c.orderStatus).toBe('جديد');
    expect(c.attachmentsStatus).toBe('ناقص');
  });
});

describe('Customer search logic', () => {
  it('filters by code phone and name', () => {
    const customers = [
      { code: '22540', phone: '0551234567', networkName: 'شبكة النور' },
      { code: '33421', phone: '0559876543', networkName: 'الأمل' },
    ];
    const q = '22540';
    const found = customers.filter(
      (c) => c.code.includes(q) || c.phone.includes(q) || c.networkName.includes(q)
    );
    expect(found).toHaveLength(1);
    expect(found[0].code).toBe('22540');
  });
});
