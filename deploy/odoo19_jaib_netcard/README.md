# Jaib Netcard — Odoo 19 Community

مجلد الوحدة جاهز للنسخ إلى `addons` في Odoo:

```
deploy/odoo19_jaib_netcard/   →   /odoo/addons/jaib_netcard/
```

## التثبيت

1. انسخ المجلد باسم **`jaib_netcard`** (اسم المجلد = technical name).
2. حدّث قائمة التطبيقات → **Install** «Jaib Netcard Designer».
3. امنح المستخدمين مجموعة **موظف — تصميم وتصدير** أو **مدير**.

## Models (جدول)

| Model | Technical name | يطابق React |
|-------|----------------|-------------|
| قالب | `netcard.template` | `template1` … + صورة JPG |
| تخطيط ليبلات | `netcard.template.layout` | `bundled-layouts.json` → `layers` |
| قالب مستورد | `netcard.custom.template` | `CustomTemplate` |
| سجل تصدير | `netcard.export.log` | اختياري |

## استيراد bundled-layouts.json

1. أنشئ سجل `netcard.template` لكل مفتاح (مثل `template3`) مع رفع الصورة.
2. أنشئ `netcard.template.layout` واربطه بالقالب.
3. الصق محتوى `layers` في حقل **طبقات (نص)** أو استخدم سكربت import لاحقاً.

## الخطوة التالية (لم تُنفَّذ هنا)

- Controller `/netcard/design` للعامة
- OWL widget Canvas (من `useNetCardDesigner.ts`)
- Record rules للفصل بين الشركات

## الملفات

```
jaib_netcard/
  __manifest__.py
  models/
    netcard_template.py
    netcard_template_layout.py
    netcard_custom_template.py
    netcard_export_log.py
  security/
  views/
```
