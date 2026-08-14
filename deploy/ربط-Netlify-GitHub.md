# ربط Netlify بـ GitHub — خطوة بخطوة

> المستودع: https://github.com/NaifAliYahi/mahfazat-jeeb-design

---

## ما الذي يعمل على Netlify؟

| ✅ يعمل | ❌ لا يعمل على Netlify |
|---------|------------------------|
| `/design` — تصميم بطاقات للعملاء | تسجيل دخول الموظفين + بيانات مشتركة |
| اختيار القوالب والتصدير | API السيرفر (Express) |

**الموظفون:** استخدموا Windows Server أو `npm run dev` محلياً، أو Render للنسخة الكاملة.

---

## الخطوات (5 دقائق)

### 1) سجّل في Netlify

1. افتح https://app.netlify.com
2. **Sign up** → **GitHub** (نفس حساب NaifAliYahi)

### 2) ربط المستودع

1. **Add new site** → **Import an existing project**
2. **Deploy with GitHub**
3. إذا طُلب: **Authorize Netlify** على GitHub
4. اختر المستودع: **mahfazat-jeeb-design**

### 3) إعدادات البناء (تُملأ تلقائياً من netlify.toml)

| الحقل | القيمة |
|-------|--------|
| Branch | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |

5. **Deploy site**

### 4) انتظر البناء (~2–3 دقائق)

عند النجاح ✅ يظهر رابط مثل:
`https://random-name-123.netlify.app`

### 5) غيّر اسم الموقع (اختياري)

1. **Site configuration** → **Domain management**
2. **Options** → **Edit site name**
3. مثلاً: `mahfazat-jeeb` → الرابط: `https://mahfazat-jeeb.netlify.app`

### 6) اجعل الموقع عاماً (مهم)

1. **Site configuration** → **Access control**
2. تأكد أن الموقع **Public** (ليس Password protected)

---

## روابط المشاركة

| لمن | الرابط |
|-----|--------|
| **العملاء** | `https://اسم-موقعك.netlify.app/design` |
| **الموظفون** | السيرفر المحلي أو Render — `/login` |

---

## تحديث تلقائي

أي `git push` على فرع `main` يعيد بناء Netlify تلقائياً خلال دقائق.

```powershell
cd "D:\windsurf\appCustomer\web"
git add .
git commit -m "وصف التعديل"
git push
```

---

## تسجيل دخول الموظفين (محلي / سيرفر)

| المستخدم | كلمة المرور |
|----------|-------------|
| `777465157` | `1234` |
| `user1` | `1234` |
| `admin` | `1234` |

**بعد التحديث:** أعد تشغيل السيرفر:

```powershell
cd "D:\windsurf\appCustomer\web"
npm run dev
```
