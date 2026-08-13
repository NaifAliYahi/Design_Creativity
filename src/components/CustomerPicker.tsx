import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../types';
import { ORDER_STATUS_COLORS } from '../constants';
import { Badge } from './ui';

export interface CustomerPickerProps {
  customers: Customer[];
  selected: Customer | null;
  onSelect: (customer: Customer) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** عند عدم وجود نتيجة — ينقل لصفحة الإضافة */
  createPath?: string;
  className?: string;
}

/**
 * اختيار شبكة/عميل — نفس فكرة Odoo:
 * اكتب للبحث → اختر من القائمة → أو «إضافة شبكة جديدة»
 */
export function CustomerPicker({
  customers,
  selected,
  onSelect,
  onClear,
  placeholder = 'ابحث بالكود أو اسم الشبكة أو الجوال...',
  autoFocus,
  createPath = '/customers/new',
  className = '',
}: CustomerPickerProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeCustomers = useMemo(
    () => customers.filter((c) => !['مغلق'].includes(c.orderStatus)),
    [customers]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeCustomers.slice(0, 12);
    return activeCustomers
      .filter(
        (c) =>
          c.code.includes(q) ||
          c.phone.includes(q) ||
          c.networkName.toLowerCase().includes(q) ||
          c.currentEmployee.includes(q)
      )
      .slice(0, 12);
  }, [query, activeCustomers]);

  const exactCode = query.trim()
    ? customers.find((c) => c.code === query.trim())
    : undefined;

  const showCreate =
    query.trim().length > 0 && !exactCode;

  const displayValue = selected && !open
    ? `${selected.code} — ${selected.networkName}`
    : query;

  const handleSelect = (c: Customer) => {
    onSelect(c);
    setQuery('');
    setOpen(false);
  };

  const handleCreate = () => {
    const code = query.trim().replace(/\D/g, '') || query.trim();
    setOpen(false);
    navigate(`${createPath}?code=${encodeURIComponent(code)}`);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && onClear) onClear();
          }}
          onFocus={() => {
            setOpen(true);
            if (selected) {
              setQuery('');
              onClear?.();
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-xl border-2 border-brand-200 px-4 py-3.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {selected && !open && (
          <button
            type="button"
            onClick={() => {
              onClear?.();
              setQuery('');
            }}
            className="shrink-0 rounded-xl border border-slate-300 px-3 text-slate-500 hover:bg-slate-50"
            title="مسح الاختيار"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 && !showCreate && (
            <p className="p-4 text-center text-sm text-slate-500">لا توجد شبكات — ابدأ بالكتابة</p>
          )}

          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 text-right hover:bg-brand-50"
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono text-base font-bold text-brand-800">{c.code}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span className="text-sm text-slate-700">{c.networkName}</span>
                <p className="truncate text-xs text-slate-400">{c.phone} · {c.currentEmployee}</p>
              </div>
              <Badge className={ORDER_STATUS_COLORS[c.orderStatus]}>{c.orderStatus}</Badge>
            </button>
          ))}

          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center gap-2 bg-emerald-50 px-4 py-4 text-right text-emerald-800 hover:bg-emerald-100"
            >
              <span className="text-xl">+</span>
              <div>
                <p className="font-bold">إضافة شبكة جديدة</p>
                <p className="text-sm">
                  {query.trim().match(/^\d+$/) ? `كود ${query.trim()}` : `"${query.trim()}"`}
                </p>
              </div>
            </button>
          )}

          {!query.trim() && activeCustomers.length > 12 && (
            <p className="p-2 text-center text-xs text-slate-400">اكتب للبحث بين {activeCustomers.length} شبكة</p>
          )}
        </div>
      )}
    </div>
  );
}
