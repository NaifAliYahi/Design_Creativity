import { Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerPicker } from '../components/CustomerPicker';
import { QuickFollowUpModal } from '../components/QuickModals';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FilterBar,
  PageHeader,
  Select,
} from '../components/ui';
import { ORDER_STATUSES, ORDER_STATUS_COLORS, formatDateTime, daysSince } from '../constants';
import type { Customer, OrderStatus } from '../types';

const PAGE_SIZE = 30;

export function CustomersPage() {
  const { data, currentEmployee, updateCustomer, deleteCustomer } = useApp();
  const [searchParams] = useSearchParams();
  const [pickerCustomer, setPickerCustomer] = useState<Customer | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'الكل'>('الكل');
  const [mineOnly, setMineOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [quickCustomer, setQuickCustomer] = useState<Customer | null>(null);
  const filterParam = searchParams.get('filter');

  const customers = useMemo(() => {
    let list = [...data.customers];
    if (mineOnly) list = list.filter((c) => c.currentEmployee === currentEmployee);
    if (statusFilter !== 'الكل') list = list.filter((c) => c.orderStatus === statusFilter);
    if (filterParam === 'overdue') {
      list = list.filter((c) => {
        if (['مغلق', 'مفقود'].includes(c.orderStatus)) return false;
        return c.followUpDate && new Date(c.followUpDate) < new Date();
      });
    }
    return list.sort((a, b) => {
      const aOver = a.followUpDate && new Date(a.followUpDate) < new Date();
      const bOver = b.followUpDate && new Date(b.followUpDate) < new Date();
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });
  }, [data.customers, mineOnly, currentEmployee, statusFilter, filterParam]);

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const paged = customers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="كل الشبكات"
        subtitle={`${customers.length} شبكة`}
        action={
          <Link to="/customers/new">
            <Button>+ شبكة جديدة</Button>
          </Link>
        }
      />

      <FilterBar>
        <div className="min-w-[280px] flex-1">
          <Field label="بحث واختيار">
            <CustomerPicker
              customers={data.customers}
              selected={pickerCustomer}
              onSelect={(c) => {
                setPickerCustomer(c);
                setQuickCustomer(c);
              }}
              onClear={() => setPickerCustomer(null)}
            />
          </Field>
        </div>
        <Field label="الحالة">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus | 'الكل');
              setPage(0);
            }}
          >
            <option value="الكل">الكل</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          شبكاتي فقط
        </label>
      </FilterBar>

      {customers.length === 0 ? (
        <EmptyState message="لا شبكات — ارفع Excel أو أضف شبكة جديدة" />
      ) : (
        <>
          <div className="space-y-2">
            {paged.map((c) => {
              const overdue =
                c.followUpDate &&
                new Date(c.followUpDate) < new Date() &&
                !['مغلق', 'مفقود'].includes(c.orderStatus);
              const stale = daysSince(c.lastUpdated) > 3 && !['مغلق', 'مفقود'].includes(c.orderStatus);
              return (
                <div
                  key={c.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                    overdue ? 'border-rose-300 bg-rose-50/30' : stale ? 'border-orange-200' : 'border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-bold">{c.code}</span>
                      <span className="text-slate-600">{c.networkName}</span>
                      <Badge className={ORDER_STATUS_COLORS[c.orderStatus]}>{c.orderStatus}</Badge>
                      {overdue && <Badge className="bg-rose-100 text-rose-800">متأخر</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 truncate">{c.phone} · {c.lastAction}</p>
                    {c.followUpDate && (
                      <p className="text-xs text-slate-400">متابعة: {formatDateTime(c.followUpDate)}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => setQuickCustomer(c)} className="py-2.5 px-4">
                      متابعة
                    </Button>
                    <Link to={`/customers/${c.id}`}>
                      <Button variant="secondary" className="py-2.5">
                        تفاصيل
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      className="py-2.5 px-3"
                      onClick={() => {
                        if (window.confirm(`حذف شبكة «${c.networkName}» (${c.code})؟`)) {
                          deleteCustomer(c.id);
                        }
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <span className="text-sm text-slate-600">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}

      <QuickFollowUpModal
        customer={quickCustomer}
        open={!!quickCustomer}
        onClose={() => setQuickCustomer(null)}
        onSave={(patch) => quickCustomer && updateCustomer(quickCustomer.id, patch)}
      />
    </div>
  );
}
