# نشر مجاني 100% — GitHub Pages

> **لا تحتاج Render المدفوع.** GitHub Pages مجاني للأبد ولا يطلب بطاقة ائتمان.

---

## لماذا Render يظهر «مدفوع»؟

عند إنشاء Web Service في Render، الخطة الافتراضية **Starter ($7/شهر)**.

للاستخدام المجاني على Render (اختياري):
1. عند إنشاء الخدمة → **Instance Type**
2. اختر **Free** (وليس Starter)
3. قد ينام الموقع بعد 15 دقيقة بدون زوار (أول فتح بطيء ~30 ثانية)

**الأفضل لكم:** GitHub Pages — مجاني، سريع، لا ينام.

---

## ما الذي يعمل على GitHub Pages؟

| ✅ يعمل | ❌ لا يعمل (استخدموا التثبيت المحلي) |
|---------|--------------------------------------|
| `/design` — تصميم العملاء بدون دخول | قاعدة بيانات مشتركة بين الموظفين |
| اختيار/رفع قالب | |
| إدخال الاسم والكود والهاتف | |
| تصدير PNG وواتساب | |

**الموظفون:** يستمرون باستخدام **MahfazatJeeb-Installer** على أجهزتهم.

---

## خطوات النشر المجاني (5 دقائق)

### 1) ارفع المشروع على GitHub

(كما في `خطوات-رفع-GitHub.md`)

```powershell
cd "d:\windsurf\appCustomer\web"
git init
git add .
git commit -m "مصمم بطاقات — نسخة مجانية"
git branch -M main
git remote add origin https://github.com/اسمك/mahfazat-jeeb-design.git
git push -u origin main
```

### 2) فعّل GitHub Pages

1. افتح المستودع على GitHub
2. **Settings** → **Pages** (من القائمة الجانبية)
3. **Source:** اختر **GitHub Actions**
4. احفظ

### 3) انتظر البناء

1. تبويب **Actions** في المستودع
2. انتظر workflow **Deploy GitHub Pages** ✅ أخضر (~2 دقيقة)

### 4) الرابط الجاهز

```
https://اسمك.github.io/mahfazat-jeeb-design/design
```

(غيّر `اسمك` و `mahfazat-jeeb-design` حسب مستودعك)

---

## مشاركة الرابط

| لمن | الرابط |
|-----|--------|
| **العملاء** | `https://اسمك.github.io/اسم-المستودع/design` |
| **الموظفون** | التثبيت المحلي — `Setup.bat` |

---

## تحديث الموقع لاحقاً

```powershell
git add .
git commit -m "تحديث"
git push
```

GitHub يعيد النشر تلقائياً خلال دقيقتين.

---

## Root Directory على Render؟

**لا تحتاج Render** إذا استخدمت GitHub Pages.

إذا أردت Render مجاناً لاحقاً:
- **Root Directory:** فارغ (إذا `package.json` في جذر المستودع)
- **Instance Type:** **Free** فقط
