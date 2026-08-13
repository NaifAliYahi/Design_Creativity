import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  CallLog,
  Complaint,
  Customer,
  DailyReport,
  LossRecord,
  ResponseTemplate,
  Ticket,
  WhatsAppLog,
} from '../types';
import { loadAppData, saveAppData, resetAllData } from '../lib/db';
import { defaultData, exportData, importData } from '../lib/storage';
import { uid, nowISO, todayDate } from '../constants';
import { mergeImportRow, rowToCustomer } from '../lib/excel';
import { ensureResponseTemplates, getResponseText, openWhatsApp, type ResponseVariant } from '../lib/responses';

interface AppContextValue {
  ready: boolean;
  data: AppData;
  currentEmployee: string;
  setCurrentEmployee: (name: string) => void;
  addCustomer: (c: Omit<Customer, 'id' | 'lastUpdated'>) => Customer | null;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerByCode: (code: string) => Customer | undefined;
  importCustomers: (
    rows: Partial<Customer>[],
    mode: 'skip' | 'update'
  ) => { added: number; updated: number; skipped: number };
  addWhatsApp: (log: Omit<WhatsAppLog, 'id'>) => void;
  addCall: (log: Omit<CallLog, 'id'>) => void;
  addLoss: (record: Omit<LossRecord, 'id'>) => void;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt'>) => Ticket;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addComplaint: (c: Omit<Complaint, 'id' | 'createdAt'>) => Complaint;
  updateComplaint: (id: string, patch: Partial<Complaint>) => void;
  addDailyReport: (r: Omit<DailyReport, 'id' | 'createdAt'>) => void;
  addResponse: (r: Omit<ResponseTemplate, 'id' | 'createdAt' | 'updatedAt'>) => ResponseTemplate;
  updateResponse: (id: string, patch: Partial<ResponseTemplate>) => void;
  deleteResponse: (id: string) => void;
  sendWhatsAppResponse: (
    customer: Customer,
    template: ResponseTemplate,
    variant: ResponseVariant
  ) => void;
  updateSettings: (patch: Partial<AppData['settings']>) => void;
  reload: () => Promise<void>;
  replaceData: (data: AppData) => void;
  exportJson: () => void;
  importJson: (file: File) => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(defaultData());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadAppData().then((d) => {
      setData(d);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveAppData(data).catch(console.error);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data, ready]);

  const setCurrentEmployee = useCallback((name: string) => {
    setData((d) => ({
      ...d,
      settings: { ...d.settings, currentEmployee: name },
    }));
  }, []);

  const addCustomer = useCallback((c: Omit<Customer, 'id' | 'lastUpdated'>): Customer | null => {
    let created: Customer | null = null;
    setData((d) => {
      if (d.customers.some((x) => x.code === c.code)) return d;
      const customer: Customer = { ...c, id: uid(), lastUpdated: nowISO() };
      created = customer;
      return { ...d, customers: [...d.customers, customer] };
    });
    return created;
  }, []);

  const updateCustomer = useCallback((id: string, patch: Partial<Customer>) => {
    setData((d) => ({
      ...d,
      customers: d.customers.map((c) =>
        c.id === id ? { ...c, ...patch, lastUpdated: nowISO() } : c
      ),
    }));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setData((d) => ({ ...d, customers: d.customers.filter((c) => c.id !== id) }));
  }, []);

  const getCustomerByCode = useCallback(
    (code: string) => data.customers.find((c) => c.code === code),
    [data.customers]
  );

  const importCustomers = useCallback(
    (rows: Partial<Customer>[], mode: 'skip' | 'update') => {
      let added = 0;
      let updated = 0;
      let skipped = 0;
      setData((d) => {
        const map = new Map(d.customers.map((c) => [c.code, c]));
        for (const partial of rows) {
          if (!partial.code) continue;
          const existing = map.get(partial.code);
          if (existing) {
            if (mode === 'update') {
              map.set(partial.code, mergeImportRow(existing, partial));
              updated++;
            } else {
              skipped++;
            }
          } else {
            const full = rowToCustomer(partial, d.settings.currentEmployee);
            const customer: Customer = { ...full, id: uid(), lastUpdated: nowISO() };
            map.set(partial.code, customer);
            added++;
          }
        }
        return { ...d, customers: Array.from(map.values()) };
      });
      return { added, updated, skipped };
    },
    []
  );

  const addWhatsApp = useCallback((log: Omit<WhatsAppLog, 'id'>) => {
    setData((d) => ({ ...d, whatsappLogs: [{ ...log, id: uid() }, ...d.whatsappLogs] }));
  }, []);

  const addCall = useCallback((log: Omit<CallLog, 'id'>) => {
    setData((d) => ({ ...d, callLogs: [{ ...log, id: uid() }, ...d.callLogs] }));
  }, []);

  const addLoss = useCallback((record: Omit<LossRecord, 'id'>) => {
    setData((d) => ({
      ...d,
      customers: d.customers.map((c) =>
        c.code === record.customerCode
          ? { ...c, orderStatus: 'مفقود' as const, lossCode: record.mainReason, lastUpdated: nowISO() }
          : c
      ),
      lossRecords: [{ ...record, id: uid() }, ...d.lossRecords],
    }));
  }, []);

  const addTicket = useCallback((ticket: Omit<Ticket, 'id' | 'createdAt'>): Ticket => {
    const full: Ticket = { ...ticket, id: uid(), createdAt: nowISO() };
    setData((d) => ({
      ...d,
      tickets: [full, ...d.tickets],
      customers: d.customers.map((c) =>
        c.code === ticket.customerCode
          ? {
              ...c,
              ticketId: ticket.ticketNumber,
              orderStatus: c.orderStatus === 'مغلق' ? c.orderStatus : 'بانتظار دعم فني',
              lastUpdated: nowISO(),
            }
          : c
      ),
    }));
    return full;
  }, []);

  const updateTicket = useCallback((id: string, patch: Partial<Ticket>) => {
    setData((d) => ({
      ...d,
      tickets: d.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const addComplaint = useCallback((c: Omit<Complaint, 'id' | 'createdAt'>): Complaint => {
    const full: Complaint = { ...c, id: uid(), createdAt: nowISO() };
    setData((d) => ({
      ...d,
      complaints: [full, ...d.complaints],
      customers: d.customers.map((cu) =>
        cu.code === c.customerCode
          ? { ...cu, complaintId: c.complaintNumber, lastUpdated: nowISO() }
          : cu
      ),
    }));
    return full;
  }, []);

  const updateComplaint = useCallback((id: string, patch: Partial<Complaint>) => {
    setData((d) => ({
      ...d,
      complaints: d.complaints.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const addDailyReport = useCallback((r: Omit<DailyReport, 'id' | 'createdAt'>) => {
    setData((d) => ({
      ...d,
      dailyReports: [{ ...r, id: uid(), createdAt: nowISO() }, ...d.dailyReports],
    }));
  }, []);

  const addResponse = useCallback(
    (r: Omit<ResponseTemplate, 'id' | 'createdAt' | 'updatedAt'>): ResponseTemplate => {
      const now = nowISO();
      const full: ResponseTemplate = { ...r, id: uid(), createdAt: now, updatedAt: now };
      setData((d) => ({
        ...d,
        responseTemplates: [full, ...d.responseTemplates],
      }));
      return full;
    },
    []
  );

  const updateResponse = useCallback((id: string, patch: Partial<ResponseTemplate>) => {
    setData((d) => ({
      ...d,
      responseTemplates: d.responseTemplates.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: nowISO() } : r
      ),
    }));
  }, []);

  const deleteResponse = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      responseTemplates: d.responseTemplates.filter((r) => r.id !== id),
    }));
  }, []);

  const sendWhatsAppResponse = useCallback(
    (customer: Customer, template: ResponseTemplate, variant: ResponseVariant) => {
      const message = getResponseText(template, variant);
      const summary = `واتساب: ${template.title.slice(0, 60)}`;
      const today = todayDate();
      const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      setData((d) => ({
        ...d,
        customers: d.customers.map((c) =>
          c.id === customer.id
            ? {
                ...c,
                lastAction: `${message.slice(0, 120)}${message.length > 120 ? '…' : ''}`,
                lastUpdated: nowISO(),
              }
            : c
        ),
        whatsappLogs: [
          {
            id: uid(),
            date: today,
            time,
            customerCode: customer.code,
            employee: d.settings.currentEmployee,
            direction: 'صادر',
            messageType: 'مخصص',
            summary: `${summary} (${variant})`,
            delivered: true,
            replied: false,
            replyResult: '',
            nextAction: template.title,
            followUpDate: customer.followUpDate,
          },
          ...d.whatsappLogs,
        ],
      }));

      openWhatsApp(customer.phone, message);
    },
    []
  );

  const updateSettings = useCallback((patch: Partial<AppData['settings']>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const reload = useCallback(async () => {
    const d = await loadAppData();
    setData(d);
  }, []);

  const replaceData = useCallback((newData: AppData) => setData(newData), []);

  const exportJson = useCallback(() => exportData(data), [data]);

  const importJson = useCallback(async (file: File) => {
    const imported = await importData(file);
    const patched = { ...imported, responseTemplates: ensureResponseTemplates(imported) };
    setData(patched);
    await saveAppData(patched);
  }, []);

  const resetAll = useCallback(async () => {
    const d = await resetAllData();
    setData(d);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      data,
      currentEmployee: data.settings.currentEmployee,
      setCurrentEmployee,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomerByCode,
      importCustomers,
      addWhatsApp,
      addCall,
      addLoss,
      addTicket,
      updateTicket,
      addComplaint,
      updateComplaint,
      addDailyReport,
      addResponse,
      updateResponse,
      deleteResponse,
      sendWhatsAppResponse,
      updateSettings,
      reload,
      replaceData,
      exportJson,
      importJson,
      resetAll,
    }),
    [
      ready,
      data,
      setCurrentEmployee,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomerByCode,
      importCustomers,
      addWhatsApp,
      addCall,
      addLoss,
      addTicket,
      updateTicket,
      addComplaint,
      updateComplaint,
      addDailyReport,
      addResponse,
      updateResponse,
      deleteResponse,
      sendWhatsAppResponse,
      updateSettings,
      reload,
      replaceData,
      exportJson,
      importJson,
      resetAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
