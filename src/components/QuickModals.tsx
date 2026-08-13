import { useEffect, useState } from 'react';
import type { Customer } from '../types';
import { Button, Field, Input, Modal, Select, Textarea } from './ui';
import { ORDER_STATUSES } from '../constants';

const QUICK_ACTIONS = [
  'اتصلت بالعميل — ',
  'راسلت واتساب — ',
  'بانتظار رفع المرفقات — ',
  'بانتظار المخزون — ',
  'تم التأكيد — ',
];

interface QuickFollowUpModalProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Customer>) => void;
}

export function QuickFollowUpModal({ customer, open, onClose, onSave }: QuickFollowUpModalProps) {
  const [lastAction, setLastAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [orderStatus, setOrderStatus] = useState<Customer['orderStatus']>('قيد التنفيذ');

  useEffect(() => {
    if (customer && open) {
      setLastAction('');
      const tomorrow = new Date(Date.now() + 86400000);
      tomorrow.setHours(10, 0, 0, 0);
      setFollowUpDate(tomorrow.toISOString().slice(0, 16));
      setOrderStatus(customer.orderStatus === 'جديد' ? 'قيد التنفيذ' : customer.orderStatus);
    }
  }, [customer, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastAction.trim()) return;
    onSave({
      lastAction: lastAction.trim(),
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      orderStatus,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={customer ? `متابعة — ${customer.code}` : 'متابعة'} wide>
      {customer && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="text-xl font-bold">{customer.networkName}</p>
            <p className="font-mono text-slate-600">{customer.phone}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">اختر نوع التواصل (اختياري):</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((prefix) => (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => setLastAction(prefix)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-brand-50"
                >
                  {prefix.replace(' — ', '')}
                </button>
              ))}
            </div>
          </div>

          <Field label="ماذا حدث؟ (اكتب هنا)" required>
            <Textarea
              value={lastAction}
              onChange={(e) => setLastAction(e.target.value)}
              placeholder="مثال: اتصلت — العميل سيرفع المرفقات غدًا 10 ص"
              rows={3}
              className="text-base"
              autoFocus
            />
          </Field>

          <Field label="موعد المتابعة القادمة">
            <Input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="py-3 text-base"
            />
          </Field>

          <Field label="حالة الطلب">
            <Select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value as Customer['orderStatus'])}
              className="py-3"
            >
              {ORDER_STATUSES.filter((s) => s !== 'مفقود').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" className="w-full py-3.5 text-base">
            حفظ المتابعة
          </Button>
        </form>
      )}
    </Modal>
  );
}
