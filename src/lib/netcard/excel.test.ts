import { describe, it, expect } from 'vitest';
import { parseNetcardExcel } from './excel';
import * as XLSX from 'xlsx';

function makeBuf(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('parseNetcardExcel', () => {
  it('parses header rows', () => {
    const buf = makeBuf([
      ['اسم الشبكة', 'رقم الكود', 'رقم الهاتف'],
      ['شبكة أ', '111', '0551111111'],
    ]);
    const rows = parseNetcardExcel(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('شبكة أ');
    expect(rows[0].code).toBe('111');
  });
});
