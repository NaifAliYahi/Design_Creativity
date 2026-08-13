import { describe, it, expect } from 'vitest';
import { searchResponses, seedResponseTemplates, getResponseText, formatPhoneForWhatsApp } from '../lib/responses';
import type { Customer } from '../types';

const templates = seedResponseTemplates();

const sampleCustomer: Customer = {
  id: '1',
  code: '22540',
  phone: '0551234567',
  networkName: 'شبكة النور',
  intakeType: 'جديد',
  currentEmployee: 'محمد',
  previousEmployee: '',
  attachmentsStatus: 'ناقص',
  inventoryStatus: 'ناقص',
  designStatus: 'غير مطلوب',
  completionStatus: 'ناقص',
  orderStatus: 'بانتظار مرفقات',
  receivedDate: '2026-08-01',
  lastUpdated: '',
  lastAction: '',
  followUpDate: '',
  notes: '',
  ticketId: '',
  complaintId: '',
  csat: null,
  lossCode: '',
};

describe('searchResponses', () => {
  it('finds by keyword', () => {
    const results = searchResponses(templates, { query: 'كلمة المرور', limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.title.includes('كلمة المرور') || r.keywords.includes('كلمة المرور'))).toBe(true);
  });

  it('returns max 3 results', () => {
    const results = searchResponses(templates, { query: 'كروت', limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('suggests by customer status when no query', () => {
    const results = searchResponses(templates, { customer: sampleCustomer, limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.category === 'متابعة الشبكة' || r.keywords.includes('مرفقات'))).toBe(true);
  });
});

describe('getResponseText', () => {
  it('returns simple answer', () => {
    const t = templates[0];
    expect(getResponseText(t, 'simple')).toBe(t.responseSimple);
  });

  it('falls back to simple for missing r2', () => {
    const t = { ...templates[0], response2: undefined };
    expect(getResponseText(t, 'r2')).toBe(t.responseSimple);
  });
});

describe('formatPhoneForWhatsApp', () => {
  it('converts local Yemen number', () => {
    expect(formatPhoneForWhatsApp('0551234567')).toBe('967551234567');
  });
});
