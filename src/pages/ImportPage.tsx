import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  parseExcelFile,
  downloadExcelTemplate,
  exportCustomersToExcel,
} from '../lib/excel';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  PageHeader,
  Select,
} from '../components/ui';

export function ImportPage() {
  const { data, importCustomers, currentEmployee } = useApp();
  const { isManager } = useAuth();
  const [preview, setPreview] = useState<ReturnType<typeof parseExcelFile> | null>(null);
  const [mode, setMode] = useState<'skip' | 'update'>('update');
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(
    (file: File) => {
      setResult(null);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const codes = new Set(data.customers.map((c) => c.code));
        const parsed = parseExcelFile(reader.result as ArrayBuffer, codes);
        setPreview(parsed);
      };
      reader.readAsArrayBuffer(file);
    },
    [data.customers]
  );

  const doImport = () => {
    if (!preview) return;
    const valid = preview.rows.filter((r) => r.errors.length === 0).map((r) => r.customer);
    const res = importCustomers(valid, mode);
    setResult(res);
    setPreview(null);
  };

  const validCount = preview?.rows.filter((r) => r.errors.length === 0).length ?? 0;
  const errorCount = preview?.rows.filter((r) => r.errors.length > 0).length ?? 0;

  return (
    <div>
      <PageHeader
        title="استيراد من Excel"
        subtitle="ارفع ملف Excel وسيتعرف النظام على الأعمدة تلقائيًا"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="الخطوة 1 — اختر الملف" />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer">
                <span className="inline-flex rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white hover:bg-brand-700">
                  اختر ملف Excel (.xlsx)
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
              <Button variant="secondary" onClick={downloadExcelTemplate}>
                تحميل نموذج فارغ
              </Button>
              {isManager && (
                <Button variant="secondary" onClick={() => exportCustomersToExcel(data.customers)}>
                  تصدير العملاء الحاليين
                </Button>
              )}
            </div>
            {fileName && <p className="text-sm text-slate-600">الملف: {fileName}</p>}

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">أسماء الأعمدة المدعومة:</p>
              <p>كود العميل · رقم الجوال · اسم الشبكة · حالة المرفقات · حالة المخزون · حالة الطلب · آخر إجراء · موعد المتابعة</p>
              <p className="mt-2 text-blue-700">نفس أسماء ملف Excel الحالي لديك — لا حاجة لتغيير الأعمدة</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="الخطوة 2 — خيارات" />
          <CardBody className="space-y-4">
            <Field label="إذا الكود موجود">
              <Select value={mode} onChange={(e) => setMode(e.target.value as 'skip' | 'update')}>
                <option value="update">حدّث البيانات (موصى به)</option>
                <option value="skip">تخطّى — لا تغيّر</option>
              </Select>
            </Field>
            <p className="text-xs text-slate-500">الموظف الافتراضي للجدد: {currentEmployee}</p>
          </CardBody>
        </Card>
      </div>

      {preview && preview.rows.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title={`معاينة — ${validCount} صالح · ${errorCount} به أخطاء`}
            action={
              <Button onClick={doImport} disabled={validCount === 0}>
                استيراد {validCount} عميل
              </Button>
            }
          />
          <CardBody className="p-0 max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">كود</th>
                  <th className="px-3 py-2">شبكة</th>
                  <th className="px-3 py-2">جوال</th>
                  <th className="px-3 py-2">حالة</th>
                  <th className="px-3 py-2">نوع</th>
                  <th className="px-3 py-2">ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 100).map((r) => (
                  <tr
                    key={r.rowNum}
                    className={`border-t ${r.errors.length ? 'bg-rose-50' : r.isNew ? 'bg-emerald-50/50' : 'bg-amber-50/30'}`}
                  >
                    <td className="px-3 py-2">{r.rowNum}</td>
                    <td className="px-3 py-2 font-mono">{r.customer.code}</td>
                    <td className="px-3 py-2">{r.customer.networkName}</td>
                    <td className="px-3 py-2 font-mono">{r.customer.phone}</td>
                    <td className="px-3 py-2">{r.customer.orderStatus ?? '—'}</td>
                    <td className="px-3 py-2">{r.isNew ? 'جديد' : 'تحديث'}</td>
                    <td className="px-3 py-2 text-xs text-rose-600">{r.errors.join('، ') || '✓'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 100 && (
              <p className="p-3 text-center text-sm text-slate-500">عرض أول 100 صف — الباقي سيُستورد</p>
            )}
          </CardBody>
        </Card>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-bold text-emerald-800">تم الاستيراد بنجاح</p>
          <p className="mt-2 text-emerald-700">
            أُضيف {result.added} · حُدّث {result.updated} · تُخطّى {result.skipped}
          </p>
          <Link to="/customers">
            <Button className="mt-4">عرض العملاء</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
