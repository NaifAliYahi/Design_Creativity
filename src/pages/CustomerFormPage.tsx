import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { canCloseCustomer } from '../lib/kpi';
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Badge,
} from '../components/ui';
import { ORDER_STATUSES, ORDER_STATUS_COLORS, formatDateTime } from '../constants';
import type { Customer } from '../types';

type FormState = Omit<Customer, 'id' | 'lastUpdated'>;

export function CustomerFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preCode = searchParams.get('code') ?? '';
  const navigate = useNavigate();
  const { data, currentEmployee, addCustomer, updateCustomer, getCustomerByCode, deleteCustomer } =
    useApp();

  const existing = id && id !== 'new' ? data.customers.find((c) => c.id === id) : undefined;
  const isEdit = !!existing;
  const isNew = id === 'new';

  const existingByCode = preCode ? getCustomerByCode(preCode) : undefined;

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? { ...existing }
      : {
          code: preCode.replace(/\D/g, '') || preCode,
          phone: '',
          networkName: preCode && !preCode.match(/^\d+$/) ? preCode : '',
          intakeType: 'جديد',
          currentEmployee,
          previousEmployee: '',
          attachmentsStatus: 'ناقص',
          inventoryStatus: 'ناقص',
          designStatus: 'غير مطلوب',
          completionStatus: 'ناقص',
          orderStatus: 'جديد',
          receivedDate: new Date().toISOString().slice(0, 10),
          lastAction: 'تم استلام الشبكة',
          followUpDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
          notes: '',
          ticketId: '',
          complaintId: '',
          csat: null,
          lossCode: '',
        }
  );
  const [error, setError] = useState('');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (isNew && existingByCode) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-lg font-bold">الشبكة {existingByCode.code} موجودة مسبقًا</p>
        <p className="mt-2 text-slate-600">{existingByCode.networkName}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to={`/customers/${existingByCode.id}`}>
            <Button>فتح الشبكة</Button>
          </Link>
          <Link to="/my-work">
            <Button variant="secondary">عودة</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.code || !form.phone || !form.networkName) {
      setError('الكود والجوال واسم الشبكة مطلوبة');
      return;
    }
    if (!form.lastAction.trim()) {
      setError('اكتب آخر إجراء');
      return;
    }
    if (form.orderStatus === 'مغلق' && existing) {
      const check = canCloseCustomer({ ...existing, ...form }, data);
      if (!check.ok) {
        setError(`لا يمكن الإغلاق: ${check.reasons.join('، ')}`);
        return;
      }
    }
    if (isNew && getCustomerByCode(form.code)) {
      setError('الكود موجود — ابحث عنه من «عملي اليوم»');
      return;
    }

    const followUp = form.followUpDate.includes('T')
      ? new Date(form.followUpDate).toISOString()
      : form.followUpDate
        ? new Date(form.followUpDate).toISOString()
        : new Date(Date.now() + 86400000).toISOString();

    if (isEdit && existing) {
      updateCustomer(existing.id, { ...form, followUpDate: followUp });
      navigate('/my-work');
    } else {
      const created = addCustomer({ ...form, followUpDate: followUp });
      if (created) navigate('/my-work');
      else setError('الكود مكرر');
    }
  };

  const closeCheck = isEdit && existing ? canCloseCustomer({ ...existing, ...form }, data) : null;

  if (isEdit && !existing) {
    return (
      <div className="text-center py-12">
        <p>الشبكة غير موجودة</p>
        <Link to="/customers">
          <Button className="mt-4">عودة</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={isEdit ? `شبكة ${form.code}` : 'إضافة شبكة جديدة'}
        subtitle={isEdit ? form.networkName : 'املأ البيانات الأساسية فقط'}
        action={
          isEdit && (
            <Badge className={ORDER_STATUS_COLORS[form.orderStatus]}>{form.orderStatus}</Badge>
          )
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <Field label="كود الشبكة" required>
              <Input
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                disabled={isEdit}
                className="text-lg font-mono py-3"
                placeholder="22540"
              />
            </Field>
            <Field label="اسم الشبكة" required>
              <Input value={form.networkName} onChange={(e) => set('networkName', e.target.value)} className="py-3" />
            </Field>
            <Field label="الجوال" required>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="font-mono py-3" placeholder="05XXXXXXXX" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <p className="font-semibold text-slate-700">حالة العمليات</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['attachmentsStatus', 'المرفقات', ['ناقص', 'جاري', 'مكتمل', 'غير مطلوب']],
                  ['inventoryStatus', 'المخزون', ['ناقص', 'جاري', 'مكتمل']],
                  ['designStatus', 'التصميم', ['ناقص', 'جاري', 'مكتمل', 'غير مطلوب']],
                  ['completionStatus', 'الاستكمال', ['ناقص', 'جاري', 'مكتمل']],
                ] as const
              ).map(([key, label, opts]) => (
                <Field key={key} label={label}>
                  <Select value={form[key]} onChange={(e) => set(key, e.target.value as never)}>
                    {opts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
              ))}
              <Field label="حالة الطلب">
                <Select value={form.orderStatus} onChange={(e) => set('orderStatus', e.target.value as FormState['orderStatus'])}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <Field label="آخر إجراء" required>
              <Textarea value={form.lastAction} onChange={(e) => set('lastAction', e.target.value)} rows={2} />
            </Field>
            <Field label="موعد المتابعة">
              <Input
                type="datetime-local"
                value={form.followUpDate ? String(form.followUpDate).slice(0, 16) : ''}
                onChange={(e) => set('followUpDate', e.target.value)}
              />
            </Field>
            <Field label="ملاحظات (اختياري)">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </Field>
            {isEdit && existing && (
              <p className="text-xs text-slate-400">آخر تحديث: {formatDateTime(existing.lastUpdated)}</p>
            )}
          </CardBody>
        </Card>

        {closeCheck && !closeCheck.ok && form.orderStatus === 'مغلق' && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">لا يمكن الإغلاق قبل:</p>
            <ul className="mt-1 list-inside list-disc">
              {closeCheck.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="flex-1 py-3 text-base">
            {isEdit ? 'حفظ' : 'إضافة الشبكة'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            إلغاء
          </Button>
          {isEdit && existing && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm('حذف الشبكة؟')) {
                  deleteCustomer(existing.id);
                  navigate('/customers');
                }
              }}
            >
              حذف
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
