import type { AppData, Customer } from '../types';
import { KPI_TARGETS, daysSince, todayDate } from '../constants';

export interface KpiSnapshot {
  totalActive: number;
  newToday: number;
  completed: number;
  closed: number;
  inProgress: number;
  waitingCustomer: number;
  overdue: number;
  stale: number;
  contactRate: number;
  completionRate: number;
  closeRate: number;
  followUpDueToday: number;
  followUpOverdue: number;
  lossCount: number;
  lossRate: number;
  openTickets: number;
  openComplaints: number;
  avgCsat: number;
  pipeline: {
    attachments: { done: number; total: number };
    inventory: { done: number; total: number };
    design: { done: number; total: number };
    completion: { done: number; total: number };
  };
  byEmployee: EmployeeStats[];
  lossByCode: Record<string, number>;
}

export interface EmployeeStats {
  name: string;
  received: number;
  completed: number;
  inProgress: number;
  overdue: number;
  score: number;
}

function isActive(c: Customer): boolean {
  return !['مغلق', 'مفقود'].includes(c.orderStatus);
}

function isCompleted(c: Customer): boolean {
  return c.orderStatus === 'مكتمل' || c.orderStatus === 'مغلق';
}

function isOverdue(c: Customer): boolean {
  if (!c.followUpDate || ['مغلق', 'مفقود', 'مكتمل'].includes(c.orderStatus)) return false;
  return new Date(c.followUpDate) < new Date();
}

function isStale(c: Customer): boolean {
  return daysSince(c.lastUpdated) > 3 && isActive(c);
}

function pipelineCount(customers: Customer[], field: keyof Customer, doneValues: string[]): { done: number; total: number } {
  const active = customers.filter(isActive);
  const relevant = active.filter((c) => c[field] !== 'غير مطلوب');
  const done = relevant.filter((c) => doneValues.includes(String(c[field]))).length;
  return { done, total: relevant.length || 1 };
}

export function computeKpis(data: AppData, employeeFilter?: string): KpiSnapshot {
  let customers = data.customers;
  if (employeeFilter && employeeFilter !== 'الكل') {
    customers = customers.filter((c) => c.currentEmployee === employeeFilter);
  }

  const active = customers.filter(isActive);
  const today = todayDate();
  const newToday = customers.filter((c) => c.receivedDate === today).length;
  const completed = customers.filter((c) => c.orderStatus === 'مكتمل').length;
  const closed = customers.filter((c) => c.orderStatus === 'مغلق').length;
  const inProgress = customers.filter((c) => c.orderStatus === 'قيد التنفيذ').length;
  const waitingCustomer = customers.filter((c) =>
    ['بانتظار العميل', 'بانتظار مرفقات'].includes(c.orderStatus)
  ).length;
  const overdue = active.filter(isOverdue).length;
  const stale = active.filter(isStale).length;

  const received = customers.length;
  const contacted = customers.filter((c) => c.lastAction.trim().length > 0).length;
  const contactRate = received ? Math.round((contacted / received) * 100) : 0;
  const completionRate = received ? Math.round((completed / received) * 100) : 0;
  const readyToClose = customers.filter((c) => c.orderStatus === 'مكتمل').length;
  const closeRate = readyToClose ? Math.round((closed / (readyToClose + closed || 1)) * 100) : 0;

  const followUpDueToday = active.filter((c) => c.followUpDate?.slice(0, 10) === today).length;
  const followUpOverdue = overdue;

  const lost = customers.filter((c) => c.orderStatus === 'مفقود');
  const lossCount = lost.length;
  const lossRate = received ? Math.round((lossCount / received) * 100) : 0;

  const csatScores = customers.filter((c) => c.csat != null).map((c) => c.csat!);
  const avgCsat = csatScores.length
    ? Math.round((csatScores.reduce((a, b) => a + b, 0) / csatScores.length / 5) * 100)
    : 0;

  const lossByCode: Record<string, number> = {};
  lost.forEach((c) => {
    const code = c.lossCode || 'L07';
    lossByCode[code] = (lossByCode[code] || 0) + 1;
  });

  const employees = [...new Set(data.customers.map((c) => c.currentEmployee).filter(Boolean))];
  const byEmployee: EmployeeStats[] = employees.map((name) => {
    const empCustomers = data.customers.filter((c) => c.currentEmployee === name);
    const empActive = empCustomers.filter(isActive);
    const empCompleted = empCustomers.filter(isCompleted).length;
    const empOverdue = empActive.filter(isOverdue).length;
    const empReceived = empCustomers.length;
    const conv = empReceived ? Math.round((empCompleted / empReceived) * 100) : 0;
    const overduePenalty = empActive.length ? Math.round((empOverdue / empActive.length) * 100) : 0;
    const score = Math.max(0, Math.min(100, Math.round(conv * 0.6 + (100 - overduePenalty) * 0.4)));
    return {
      name,
      received: empReceived,
      completed: empCompleted,
      inProgress: empActive.length,
      overdue: empOverdue,
      score,
    };
  });

  return {
    totalActive: active.length,
    newToday,
    completed,
    closed,
    inProgress,
    waitingCustomer,
    overdue,
    stale,
    contactRate,
    completionRate,
    closeRate,
    followUpDueToday,
    followUpOverdue,
    lossCount,
    lossRate,
    openTickets: data.tickets.filter((t) => t.status !== 'مغلق' && t.status !== 'محلول').length,
    openComplaints: data.complaints.filter((c) => c.status !== 'مغلق' && c.status !== 'محلول').length,
    avgCsat,
    pipeline: {
      attachments: pipelineCount(customers, 'attachmentsStatus', ['مكتمل']),
      inventory: pipelineCount(customers, 'inventoryStatus', ['مكتمل']),
      design: pipelineCount(customers, 'designStatus', ['مكتمل']),
      completion: pipelineCount(customers, 'completionStatus', ['مكتمل']),
    },
    byEmployee,
    lossByCode,
  };
}

export function kpiStatus(value: number, target: number, inverse = false): 'good' | 'warn' | 'bad' {
  if (inverse) {
    if (value <= target) return 'good';
    if (value <= target * 1.5) return 'warn';
    return 'bad';
  }
  if (value >= target) return 'good';
  if (value >= target * 0.85) return 'warn';
  return 'bad';
}

export { KPI_TARGETS };

export function canCloseCustomer(c: Customer, data: AppData): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (c.attachmentsStatus !== 'مكتمل' && c.attachmentsStatus !== 'غير مطلوب') {
    reasons.push('المرفقات غير مكتملة');
  }
  if (c.inventoryStatus !== 'مكتمل') reasons.push('المخزون غير مكتمل');
  if (c.designStatus !== 'مكتمل' && c.designStatus !== 'غير مطلوب') {
    reasons.push('التصميم غير مكتمل');
  }
  if (c.completionStatus !== 'مكتمل') reasons.push('استكمال الطلب غير مكتمل');
  const openTicket = data.tickets.find(
    (t) => t.customerCode === c.code && !['محلول', 'مغلق'].includes(t.status)
  );
  if (openTicket) reasons.push(`تذكرة مفتوحة: ${openTicket.ticketNumber}`);
  const openComplaint = data.complaints.find(
    (co) => co.customerCode === c.code && !['محلول', 'مغلق'].includes(co.status)
  );
  if (openComplaint) reasons.push(`شكوى مفتوحة: ${openComplaint.complaintNumber}`);
  if (!c.lastAction.trim()) reasons.push('آخر إجراء فارغ');
  return { ok: reasons.length === 0, reasons };
}
