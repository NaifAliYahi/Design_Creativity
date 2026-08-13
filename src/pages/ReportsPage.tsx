import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { computeKpis } from '../lib/kpi';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  PageHeader,
  Textarea,
} from '../components/ui';
import { todayDate } from '../constants';

export function ReportsPage() {
  const { data, currentEmployee, addDailyReport } = useApp();
  const [notes, setNotes] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [saved, setSaved] = useState(false);

  const mine = useMemo(
    () => data.customers.filter((c) => c.currentEmployee === currentEmployee),
    [data.customers, currentEmployee]
  );

  const kpis = useMemo(() => computeKpis(data, currentEmployee), [data, currentEmployee]);
  const today = todayDate();

  const followUpsDue = mine.filter((c) => {
    if (['مغلق', 'مفقود'].includes(c.orderStatus)) return false;
    return c.followUpDate?.slice(0, 10) === today;
  });

  const followUpsLate = mine.filter((c) => {
    if (['مغلق', 'مفقود'].includes(c.orderStatus) || !c.followUpDate) return false;
    return new Date(c.followUpDate) < new Date();
  });

  const generateReport = () => {
    addDailyReport({
      date: today,
      employee: currentEmployee,
      received: mine.filter((c) => c.receivedDate === today).length,
      completed: mine.filter((c) => c.orderStatus === 'مكتمل').length,
      closed: mine.filter((c) => c.orderStatus === 'مغلق').length,
      inProgress: mine.filter((c) => c.orderStatus === 'قيد التنفيذ').length,
      waitingCustomer: mine.filter((c) => ['بانتظار العميل', 'بانتظار مرفقات'].includes(c.orderStatus)).length,
      callsOut: 0,
      callsIn: 0,
      whatsappCount: 0,
      followUpsDone: Math.max(0, followUpsDue.length - followUpsLate.length),
      followUpsLate: followUpsLate.length,
      ticketsOpen: 0,
      complaintsOpen: 0,
      notes,
      tomorrowPlan,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const reportText = `
📊 تقرير يومي — ${today} — ${currentEmployee}
━━━━━━━━━━━━━━━━━━━━
📥 مستلم اليوم: ${mine.filter((c) => c.receivedDate === today).length}
✅ مكتمل: ${mine.filter((c) => c.orderStatus === 'مكتمل').length}
🔒 مغلق: ${mine.filter((c) => c.orderStatus === 'مغلق').length}
⏳ قيد التنفيذ: ${mine.filter((c) => c.orderStatus === 'قيد التنفيذ').length}
📅 متابعات: ${followUpsDue.length} | متأخرة: ${followUpsLate.length}
📈 نسبة الإنجاز: ${kpis.completionRate}%
${notes ? `\n📝 ${notes}` : ''}
${tomorrowPlan ? `\n📋 غدًا: ${tomorrowPlan}` : ''}
`.trim();

  return (
    <div>
      <PageHeader
        title="تقرير اليوم"
        subtitle="احفظ وانسخ — أرسل للمشرف قبل 5 مساءً"
        action={
          <Button onClick={generateReport}>{saved ? '✓ تم الحفظ' : 'حفظ التقرير'}</Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['مستلم اليوم', mine.filter((c) => c.receivedDate === today).length],
          ['مكتمل', mine.filter((c) => c.orderStatus === 'مكتمل').length],
          ['متابعات اليوم', followUpsDue.length],
          ['متأخرة', followUpsLate.length],
        ].map(([label, val]) => (
          <Card key={String(label)}>
            <CardBody>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold">{val}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="معاينة — انسخ وأرسل" />
          <CardBody>
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">{reportText}</pre>
            <Button variant="secondary" className="mt-4" onClick={() => navigator.clipboard.writeText(reportText)}>
              نسخ للإرسال
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="ملاحظات" />
          <CardBody className="space-y-4">
            <Field label="ملاحظة اليوم">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
            <Field label="خطة الغد">
              <Textarea value={tomorrowPlan} onChange={(e) => setTomorrowPlan(e.target.value)} rows={3} placeholder="كود 22540 — متابعة تصميم" />
            </Field>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
