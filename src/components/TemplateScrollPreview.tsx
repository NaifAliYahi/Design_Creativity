import { useEffect, useRef, useState } from 'react';
import { TEMPLATE_LABELS } from '../lib/netcard/constants';
import { renderTemplatePreviewDataUrl } from '../lib/netcard/canvas-export';
import type { NetworkFields } from '../lib/netcard/types';

type TemplateScrollPreviewProps = {
  fields: NetworkFields;
  templateIds: string[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  enabled?: boolean;
};

type PreviewItem = {
  id: string;
  label: string;
  src: string;
};

export function TemplateScrollPreview({
  fields,
  templateIds,
  activeId,
  onSelect,
  enabled = true,
}: TemplateScrollPreviewProps) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }

    const hasData = Boolean(fields.name.trim() || fields.code.trim() || fields.phone.trim());
    if (!hasData) {
      setItems([]);
      return;
    }

    const currentRun = ++runId.current;
    setLoading(true);

    const timer = window.setTimeout(async () => {
      const next: PreviewItem[] = [];
      for (const id of templateIds) {
        if (runId.current !== currentRun) return;
        const src = await renderTemplatePreviewDataUrl(id, fields, { maxWidth: 240 });
        if (src) {
          next.push({ id, label: TEMPLATE_LABELS[id] ?? id, src });
        }
      }
      if (runId.current === currentRun) {
        setItems(next);
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, fields.name, fields.code, fields.phone, templateIds]);

  if (!enabled) return null;

  return (
    <div className="netcard-scroll-preview">
      <div className="netcard-scroll-preview-head">
        <p className="netcard-section-title" style={{ marginBottom: 0 }}>
          معاينة القوالب ({templateIds.length})
        </p>
        {loading && <span className="netcard-hint">جاري التحديث…</span>}
      </div>
      {!fields.name.trim() && !fields.code.trim() && !fields.phone.trim() ? (
        <p className="netcard-hint">أدخل البيانات لمعاينة القوالب بالاسم والكود والهاتف</p>
      ) : (
        <div className="netcard-scroll-preview-track" role="list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={`netcard-scroll-preview-card ${activeId === item.id ? 'active' : ''}`}
              onClick={() => onSelect?.(item.id)}
              title={item.label}
            >
              <img src={item.src} alt={item.label} loading="lazy" />
              <span>{item.label}</span>
            </button>
          ))}
          {loading && items.length === 0 && (
            <p className="netcard-hint" style={{ padding: '12px 0' }}>
              جاري إنشاء المعاينات…
            </p>
          )}
        </div>
      )}
      <p className="netcard-hint" style={{ marginTop: 8 }}>
        مرّر أفقياً — المعاينة تعرض البيانات كما ستظهر عند التصدير (بعد تصميم مواقع النص من الموظف)
      </p>
    </div>
  );
}
