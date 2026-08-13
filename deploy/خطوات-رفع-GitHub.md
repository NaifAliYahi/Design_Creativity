# خطوات رفع المشروع على GitHub (خطوة بخطوة)

## ما الذي يُرفع؟

| يُرفع ✅ | لا يُرفع ❌ (كبير أو مؤقت) |
|---------|---------------------------|
| `src/` — كود البرنامج | `node_modules/` (~110 MB) |
| `public/` — قوالب التصميم | `dist/` — يُبنى على السحابة |
| `server/index.js` | `release/` — حزمة الموظفين |
| `package.json` + `package-lock.json` | `server/data/store.json` — بياناتكم |
| `render.yaml` | ملفات `.zip` |
| ملفات الإعداد (`vite.config.ts` …) | |

**حجم الرفع المتوقع:** حوالي 5–10 MB فقط (بدون node_modules).

---

## الخطوة 1 — تثبيت Git (مرة واحدة)

1. حمّل Git من: https://git-scm.com/download/win
2. ثبّته بالإعدادات الافتراضية (Next → Next).
3. افتح **PowerShell** أو **Terminal**.

---

## الخطوة 2 — إنشاء حساب GitHub (مرة واحدة)

1. ادخل https://github.com وسجّل حساباً.
2. من الصفحة الرئيسية اضغط **New repository** (مستودع جديد).
3. **Repository name:** مثلاً `mahfazat-jeeb-design`
4. اختر **Public** (مجاني للمواقع العامة).
5. **لا** تضع علامة على README أو .gitignore (موجودان عندنا).
6. اضغط **Create repository**.
7. **انسخ الرابط** الذي يظهر، مثل:  
   `https://github.com/اسمك/mahfazat-jeeb-design.git`

---

## الخطوة 3 — رفع الملفات من جهازك

افتح PowerShell واكتب الأوامر **بالترتيب** (غيّر المسار إذا لزم):

```powershell
cd "d:\windsurf\appCustomer\web"
```

```powershell
git init
```

```powershell
git add .
```

```powershell
git status
```

تأكد أن القائمة **لا تحتوي** على `node_modules` أو `dist` أو `release`.

```powershell
git commit -m "مصمم بطاقات محفظة جيب — نسخة سحابية"
```

```powershell
git branch -M main
```

```powershell
git remote add origin https://github.com/اسمك/mahfazat-jeeb-design.git
```

(استبدل الرابط برابط مستودعك الحقيقي)

```powershell
git push -u origin main
```

- إذا طلب **اسم مستخدم وكلمة مرور:** استخدم اسم GitHub + **Personal Access Token** (ليس كلمة مرور الحساب).
- لإنشاء Token: GitHub → Settings → Developer settings → Personal access tokens → Generate.

---

## الخطوة 4 — النشر على Render (الرابط للعملاء)

1. ادخل https://render.com وسجّل بحساب GitHub.
2. **New +** → **Blueprint** (أو Web Service).
3. اختر المستودع `mahfazat-jeeb-design`.
4. Render يقرأ `render.yaml` تلقائياً.
5. اضغط **Apply** وانتظر 5–10 دقائق.
6. عند النجاح تحصل على رابط مثل:  
   `https://mahfazat-jeeb-design.onrender.com`

---

## الخطوة 5 — مشاركة الرابط

| لمن | الرابط |
|-----|--------|
| **العملاء** (تصميم بدون دخول) | `https://موقعك.onrender.com/design` |
| **الموظفين** (تسجيل دخول) | `https://مويتك.onrender.com/login` |

---

## تحديث المشروع لاحقاً

بعد أي تعديل على الكود:

```powershell
cd "d:\windsurf\appCustomer\web"
git add .
git commit -m "وصف التعديل"
git push
```

Render يعيد البناء تلقائياً خلال دقائق.

---

## ملاحظات مهمة

- **لا ترفع** `server/data/store.json` — فيه بيانات العملاء.
- **node_modules** لا تُرفع — Render يشغّل `npm install` لوحده.
- **حزمة الموظفين المحلية** (`release/`) تبقى على جهازك — تُنشأ بـ `build-installer.bat` ولا تُرفع على GitHub.
