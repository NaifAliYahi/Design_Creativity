import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { computeKpis, kpiStatus, KPI_TARGETS } from '../lib/kpi';
import { Badge, Button, Card, CardBody, CardHeader, PageHeader, ProgressBar, StatCard } from '../components/ui';
import { formatDateTime, LOSS_CODES, ORDER_STATUS_COLORS } from '../constants';

export function DashboardPage() {
  const { data, currentEmployee } = useApp();
  const [filter, setFilter] = useState<'الكل' | string>('الكل');

  const kpis = useMemo(
    () => computeKpis(data, filter === 'الكل' ? undefined : filter),
    [data, filter]
  );

  const overdueCustomers = data.customers
    .filter((c) => {
      if (['مغلق', 'مفقود'].includes(c.orderStatus)) return false;
      if (!c.followUpDate) return false;
      return new Date(c.followUpDate) < new Date();
    })
    .slice(0, 8);

  const staleCustomers = data.customers
    .filter((c) => {
      if (['مغلق', 'مفقود'].includes(c.orderStatus)) return false;
      const days = Math.floor((Date.now() - new Date(c.lastUpdated).getTime()) / 86400000);
      return days > 3;
    })
    .slice(0, 5);

  const best = [...kpis.byEmployee].sort((a, b) => b.score - a.score)[0];
  const worst = [...kpis.byEmployee].sort((a, b) => a.score - b.score)[0];

  const toneMap = { good: 'good' as const, warn: 'warn' as const, bad: 'bad' as const };

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`مرحبًا ${currentEmployee} — نظرة عامة على العمليات`}
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="الكل">كل الموظفين</option>
            {data.settings.employees.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="طلبات نشطة" value={kpis.totalActive} tone="accent" />
        <StatCard label="جديدة اليوم" value={kpis.newToday} />
        <StatCard
          label="نسبة الإنجاز"
          value={`${kpis.completionRate}%`}
          sub={`الهدف ${KPI_TARGETS.completionRate}%`}
          tone={toneMap[kpiStatus(kpis.completionRate, KPI_TARGETS.completionRate)]}
        />
        <StatCard
          label="متأخرة / متابعات"
          value={kpis.overdue}
          sub={`${kpis.stale} بلا تحديث +3 أيام`}
          tone={kpis.overdue > 0 ? 'bad' : 'good'}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <StatCard
          label="نسبة التواصل"
          value={`${kpis.contactRate}%`}
          tone={toneMap[kpiStatus(kpis.contactRate, KPI_TARGETS.contactRate)]}
        />
        <StatCard
          label="CSAT"
          value={kpis.avgCsat ? `${kpis.avgCsat}%` : '—'}
          tone={toneMap[kpiStatus(kpis.avgCsat, KPI_TARGETS.csat)]}
        />
        <StatCard
          label="نسبة الفقد"
          value={`${kpis.lossRate}%`}
          tone={toneMap[kpiStatus(kpis.lossRate, KPI_TARGETS.lossRate, true)]}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline — حالة العمليات" />
          <CardBody className="space-y-4">
            <ProgressBar
              label="المرفقات"
              value={Math.round((kpis.pipeline.attachments.done / kpis.pipeline.attachments.total) * 100)}
            />
            <ProgressBar
              label="المخزون"
              value={Math.round((kpis.pipeline.inventory.done / kpis.pipeline.inventory.total) * 100)}
            />
            <ProgressBar
              label="التصميم"
              value={Math.round((kpis.pipeline.design.done / kpis.pipeline.design.total) * 100)}
            />
            <ProgressBar
              label="الاستكمال"
              value={Math.round((kpis.pipeline.completion.done / kpis.pipeline.completion.total) * 100)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="أداء الموظفين" />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-right">الموظف</th>
                    <th className="px-4 py-3">مستلم</th>
                    <th className="px-4 py-3">مكتمل</th>
                    <th className="px-4 py-3">متأخر</th>
                    <th className="px-4 py-3">النتيجة</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.byEmployee.map((e) => (
                    <tr key={e.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-center">{e.received}</td>
                      <td className="px-4 py-3 text-center">{e.completed}</td>
                      <td className="px-4 py-3 text-center text-rose-600">{e.overdue}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={e.score >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                          {e.score}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {best && worst && best.name !== worst.name && (
              <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
                <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                  <p className="font-semibold text-emerald-800">الأفضل: {best.name}</p>
                  <p className="text-emerald-700">النتيجة {best.score}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-amber-800">يحتاج دعم: {worst.name}</p>
                  <p className="text-amber-700">النتيجة {worst.score}</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="متابعات متأخرة"
            action={
              <Link to="/customers?filter=overdue">
                <Button variant="ghost" size="sm">
                  عرض الكل
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {overdueCustomers.length === 0 ? (
              <p className="p-5 text-center text-slate-500">لا توجد متابعات متأخرة</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {overdueCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <Link to={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.code} — {c.networkName}
                      </Link>
                      <p className="text-xs text-slate-500">{c.lastAction}</p>
                    </div>
                    <Badge className={ORDER_STATUS_COLORS[c.orderStatus]}>{c.orderStatus}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="تنبيهات + توصيات" />
          <CardBody className="space-y-3">
            {kpis.openTickets > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
                {kpis.openTickets} تذكرة فنية مفتوحة —{' '}
                <Link to="/tickets" className="font-medium text-rose-700 underline">
                  مراجعة
                </Link>
              </div>
            )}
            {kpis.openComplaints > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                {kpis.openComplaints} شكوى مفتوحة —{' '}
                <Link to="/complaints" className="font-medium text-amber-800 underline">
                  مراجعة
                </Link>
              </div>
            )}
            {staleCustomers.map((c) => (
              <div key={c.id} className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
                كود {c.code}: +3 أيام بلا تحديث — آخر: {formatDateTime(c.lastUpdated)}
              </div>
            ))}
            {Object.entries(kpis.lossByCode).map(([code, count]) => (
              <div key={code} className="text-sm text-slate-600">
                {LOSS_CODES.find((l) => l.code === code)?.label ?? code}: {count} عميل
              </div>
            ))}
            <Link to="/daily-plan">
              <Button className="w-full">فتح خطة اليوم</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
