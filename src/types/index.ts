export type IntakeType = 'جديد' | 'استكمال' | 'محوّل';
export type OperationStatus = 'ناقص' | 'جاري' | 'مكتمل' | 'غير مطلوب';
export type InventoryStatus = 'ناقص' | 'جاري' | 'مكتمل';
export type OrderStatus =
  | 'جديد'
  | 'قيد التنفيذ'
  | 'بانتظار العميل'
  | 'بانتظار مرفقات'
  | 'بانتظار مخزون'
  | 'بانتظار تصميم'
  | 'بانتظار دعم فني'
  | 'مكتمل'
  | 'مغلق'
  | 'مفقود';

export type LossCode = 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06' | 'L07' | '';
export type TicketPriority = 'P1' | 'P2' | 'P3';
export type TicketStatus = 'مفتوح' | 'قيد المعالجة' | 'محلول' | 'مغلق';
export type ComplaintImpact = 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
export type ComplaintStatus = 'مفتوح' | 'قيد المعالجة' | 'محلول' | 'مغلق';

export interface Customer {
  id: string;
  code: string;
  phone: string;
  networkName: string;
  intakeType: IntakeType;
  currentEmployee: string;
  previousEmployee: string;
  attachmentsStatus: OperationStatus;
  inventoryStatus: InventoryStatus;
  designStatus: OperationStatus;
  completionStatus: 'ناقص' | 'جاري' | 'مكتمل';
  orderStatus: OrderStatus;
  receivedDate: string;
  lastUpdated: string;
  lastAction: string;
  followUpDate: string;
  notes: string;
  ticketId: string;
  complaintId: string;
  csat: number | null;
  lossCode: LossCode;
}

export interface WhatsAppLog {
  id: string;
  date: string;
  time: string;
  customerCode: string;
  employee: string;
  direction: 'صادر' | 'وارد';
  messageType: 'WA-01' | 'WA-02' | 'WA-03' | 'WA-04' | 'WA-05' | 'مخصص' | 'رد عميل';
  summary: string;
  delivered: boolean;
  replied: boolean;
  replyResult: 'إيجابي' | 'محايد' | 'سلبي' | 'لا رد' | '';
  nextAction: string;
  followUpDate: string;
}

export interface CallLog {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  employee: string;
  customerCode: string;
  callType: 'وارد' | 'صادر';
  reason: string;
  answered: boolean;
  result: string;
  objection: string;
  solution: string;
  nextAction: string;
  followUpDate: string;
}

export interface LossRecord {
  id: string;
  date: string;
  customerCode: string;
  networkName: string;
  employee: string;
  stoppedAt: string;
  mainReason: LossCode;
  subReason: string;
  attempts: number;
  lastContact: string;
  lastChannel: string;
  canRetry: 'نعم' | 'لا' | 'لاحقًا';
  nextCampaignDate: string;
  notes: string;
  supervisorApproval: 'معتمد' | 'مرفوض' | 'معلق';
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  customerCode: string;
  phone: string;
  employee: string;
  description: string;
  steps: string;
  triedL1: string;
  priority: TicketPriority;
  status: TicketStatus;
  slaDeadline: string;
  createdAt: string;
  resolvedAt: string;
  confirmedWithCustomer: boolean;
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  customerCode: string;
  employee: string;
  text: string;
  expectedOutcome: string;
  impact: ComplaintImpact;
  status: ComplaintStatus;
  createdAt: string;
  updateDeadline: string;
  resolvedAt: string;
  csatAfter: number | null;
}

export interface DailyReport {
  id: string;
  date: string;
  employee: string;
  received: number;
  completed: number;
  closed: number;
  inProgress: number;
  waitingCustomer: number;
  callsOut: number;
  callsIn: number;
  whatsappCount: number;
  followUpsDone: number;
  followUpsLate: number;
  ticketsOpen: number;
  complaintsOpen: number;
  notes: string;
  tomorrowPlan: string;
  createdAt: string;
}

export interface AppSettings {
  employees: string[];
  currentEmployee: string;
  companyName: string;
}

/** قالب رد واتساب — من بنك معرفة سند */
export interface ResponseTemplate {
  id: string;
  kbId?: string;
  title: string;
  keywords: string;
  category: string;
  orderStatuses: OrderStatus[];
  responseSimple: string;
  response2?: string;
  response3?: string;
  responseDetailed?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  customers: Customer[];
  whatsappLogs: WhatsAppLog[];
  callLogs: CallLog[];
  lossRecords: LossRecord[];
  tickets: Ticket[];
  complaints: Complaint[];
  dailyReports: DailyReport[];
  responseTemplates: ResponseTemplate[];
  settings: AppSettings;
}
