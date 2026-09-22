# نقل طريقة التصميم من Odoo إلى مشروع React

## ما الذي تُم نقله؟

| Odoo (`jaib_netcard`) | React (`web`) |
|----------------------|---------------|
| `static/src/data/layouts/*.json` | `public/netcard/layouts/*.json` |
| `normalizeLayers` + `drawLayer` | `normalize-layer.ts` + `draw-text-layer.ts` |
| صندوق + scaleX/Y | حقول في الليبل + لوحة الخصائص |
| حفظ layout في DB | **IndexedDB** + `server/data/store.json` (بدون Odoo) |

## ترتيب تحميل الليبلات

1. **محفوظ محلياً** — IndexedDB أو `store.json` (موظف / عميل)
2. **ملفات Odoo** — `public/netcard/layouts/templateN.json`
3. **افتراضي** — `template-presets.ts`

## تحديث layouts من Odoo

```powershell
cd "D:\windsurf\appCustomer\web"
npm run sync:odoo-layouts
```

أو عيّن مساراً مختلفاً:

```powershell
$env:ODOO_NETCARD_LAYOUTS="D:\tempodoo\server\custom_addons\jaib_netcard\static\src\data\layouts"
npm run sync:odoo-layouts
```

## إعادة القالب للتصميم الاحترافي (Odoo)

من **منطقة التصميم** → **↺ إعادة القالب**  
أو احذف التخطيط من IndexedDB (إعدادات المتصفح) لقالب معيّن.

## ما لم يُنقل بعد (اختياري لاحقاً)

- كود إضافي / extraCodes
- فلاتر نوع/محفظة/مجموعة
- كشف تلقائي PIL للslots (`netcard_layout_detect.py`)
- استيراد شبكات Excel من تبويب Odoo
