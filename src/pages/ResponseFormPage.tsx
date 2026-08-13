import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui';
import { ORDER_STATUSES } from '../constants';
import { RESPONSE_CATEGORIES } from '../lib/responses';
import type { OrderStatus, ResponseTemplate } from '../types';

type FormState = Omit<ResponseTemplate, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm = (prefill = ''): FormState => ({
  title: prefill,
  keywords: prefill,
  category: 'عام',
  orderStatuses: ['قيد التنفيذ'],
  responseSimple: '',
  response2: '',
  response3: '',
  responseDetailed: '',
  notes: '',
});

export function ResponseFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get('q') ?? '';
  const navigate = useNavigate();
  const { data, addResponse, updateResponse, deleteResponse } = useApp();

  const existing = id && id !== 'new' ? data.responseTemplates.find((r) => r.id === id) : undefined;
  const isEdit = !!existing;

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? {
          kbId: existing.kbId,
          title: existing.title,
          keywords: existing.keywords,
          category: existing.category,
          orderStatuses: [...existing.orderStatuses],
          responseSimple: existing.responseSimple,
          response2: existing.response2 ?? '',
          response3: existing.response3 ?? '',
          responseDetailed: existing.responseDetailed ?? '',
          notes: existing.notes ?? '',
        }
      : emptyForm(prefill)
  );
  const [error, setError] = useState('');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleStatus = (status: OrderStatus) => {
    setForm((f) => ({
      ...f,
      orderStatuses: f.orderStatuses.includes(status)
        ? f.orderStatuses.filter((s) => s !== status)
        : [...f.orderStatuses, status],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.keywords.trim() || !form.responseSimple.trim()) {
      setError('العنوان والكلمات المفتاحية والرد البسيط مطلوبة');
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      keywords: form.keywords.trim(),
      responseSimple: form.responseSimple.trim(),
      response2: form.response2?.trim() || undefined,
      response3: form.response3?.trim() || undefined,
      responseDetailed: form.responseDetailed?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      orderStatuses: form.orderStatuses.length ? form.orderStatuses : (['قيد التنفيذ'] as OrderStatus[]),
    };

    if (isEdit && existing) {
      updateResponse(existing.id, payload);
    } else {
      addResponse(payload);
    }
    navigate('/replies');
  };

  if (id && id !== 'new' && !existing) {
    return (
      <div className="text-center py-12">
        <p>الرد غير موجود</p>
        <Link to="/replies">
          <Button className="mt-4">عودة</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={isEdit ? 'تعديل الرد' : 'إضافة رد جديد'}
        subtitle="الرد الأول (البسيط) إلزامي — باقي الردود اختيارية"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <Field label="عنوان / السؤال" required>
              <Input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="مثال: لم تصلني رسالة SMS"
                className="py-3"
              />
            </Field>
            <Field label="كلمات مفتاحية (مفصولة بفاصلة)" required>
              <Input
                value={form.keywords}
                onChange={(e) => set('keywords', e.target.value)}
                placeholder="SMS,كلمة المرور,تسجيل"
                className="py-3"
              />
            </Field>
            <Field label="التصنيف">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)} className="py-3">
                {RESPONSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="حالات الشبكة المناسبة">
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.filter((s) => !['مغلق', 'مفقود'].includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      form.orderStatuses.includes(s)
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <p className="font-semibold text-slate-700">الردود (3 صيغ + شرح)</p>
            <Field label="① الرد البسيط — إلزامي" required>
              <Textarea
                value={form.responseSimple}
                onChange={(e) => set('responseSimple', e.target.value)}
                rows={3}
                placeholder="رد قصير للنسخ السريع..."
              />
            </Field>
            <Field label="② رد بديل (اختياري)">
              <Textarea value={form.response2 ?? ''} onChange={(e) => set('response2', e.target.value)} rows={2} />
            </Field>
            <Field label="③ رد ثالث (اختياري)">
              <Textarea value={form.response3 ?? ''} onChange={(e) => set('response3', e.target.value)} rows={2} />
            </Field>
            <Field label="شرح تفصيلي (اختياري)">
              <Textarea
                value={form.responseDetailed ?? ''}
                onChange={(e) => set('responseDetailed', e.target.value)}
                rows={4}
                placeholder="خطوات مفصلة للعميل..."
              />
            </Field>
            <Field label="ملاحظات داخلية (اختياري)">
              <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </Field>
          </CardBody>
        </Card>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="flex-1 py-3">
            {isEdit ? 'حفظ التعديلات' : 'إضافة الرد'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/replies')}>
            إلغاء
          </Button>
          {isEdit && existing && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm('حذف هذا الرد؟')) {
                  deleteResponse(existing.id);
                  navigate('/replies');
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
