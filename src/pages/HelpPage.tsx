import { Link } from 'react-router-dom';
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui';

const STEPS = [
  {
    n: '1',
    title: 'سجّل دخول',
    body: 'استخدم اسم المستخدم وكلمة المرور التي أعطاك إياها المشرف.',
  },
  {
    n: '2',
    title: 'اختر الشبكة',
    body: 'من «عملي اليوم» — اكتب الكود أو الاسم في مربع البحث. اختر من القائمة. إذا لم تجدها → «إضافة شبكة جديدة».',
  },
  {
    n: '3',
    title: 'ردود واتساب',
    body: 'من «ردود واتساب» — اختر الشبكة → ابحث عن السؤال → اختر (بسيط / تفصيلي) → «إرسال واتساب». يُحدَّث آخر إجراء تلقائياً.',
  },
  {
    n: '4',
    title: 'سجّل المتابعة',
    body: 'أو من «عملي اليوم» — «متابعة الآن». اكتب ماذا حدث. حدّد موعد المتابعة. احفظ.',
  },
  {
    n: '5',
    title: 'نهاية اليوم',
    body: 'اذهب إلى «تقرير اليوم» → اضغط «حفظ» → «نسخ» → أرسل للمشرف.',
  },
];

const FAQ = [
  {
    q: 'الصفحة بيضاء فارغة — ماذا أفعل؟',
    a: 'لا تفتح index.html مباشرة. انقر مرتين على «تشغيل-النظام.bat» داخل مجلد web ثم افتح http://localhost:5173',
  },
  {
    q: 'كيف أصمم بطاقة شبكة للعميل؟',
    a: 'من «قالب التصميم» — اختر قالب → أضف الاسم والكود والهاتف → صدّر PNG.',
  },
  {
    q: 'كيف أرسل رداً جاهزاً للعميل؟',
    a: 'من «ردود واتساب» — اختر الشبكة → ابحث → اضغط «إرسال واتساب».',
  },
  {
    q: 'كيف أضيف شبكات كثيرة دفعة واحدة؟',
    a: 'من «رفع Excel» — اختر ملف Excel → معاينة → استيراد.',
  },
  {
    q: 'الشبكة موجودة مسبقًا؟',
    a: 'ابحث عنها واخترها — لا تنشئ كودًا مكررًا.',
  },
  {
    q: 'ماذا يعني «متأخر»؟',
    a: 'موعد المتابعة فات — اتصل بالعميل فورًا.',
  },
  {
    q: 'متى أغلق الشبكة؟',
    a: 'عندما تكتمل كل العمليات (مرفقات + مخزون + استكمال) وتؤكد مع العميل.',
  },
  {
    q: 'أين تُحفظ البيانات؟',
    a: 'على جهازك في المتصفح. المشرف يأخذ نسخة Excel من الإعدادات.',
  },
];

export function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="دليل الاستخدام" subtitle="5 خطوات — للموظف المبتدئ" />

      <div className="mb-8 space-y-4">
        {STEPS.map((s) => (
          <Card key={s.n}>
            <CardBody className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {s.n}
              </span>
              <div>
                <p className="font-bold text-lg">{s.title}</p>
                <p className="text-slate-600">{s.body}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader title="أسئلة شائعة" />
        <CardBody className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.q}>
              <p className="font-semibold text-slate-800">{f.q}</p>
              <p className="text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card className="mb-8 border-rose-200 bg-rose-50">
        <CardHeader title="⚠️ طريقة التشغيل الصحيحة" />
        <CardBody className="text-sm space-y-2 text-rose-900">
          <p><strong>❌ خطأ:</strong> فتح <code className="bg-white px-1 rounded">index.html</code> مباشرة — تظهر صفحة بيضاء</p>
          <p><strong>✅ صح:</strong> انقر مرتين على <code className="bg-white px-1 rounded">web\تشغيل-النظام.bat</code></p>
          <p>ثم افتح المتصفح: <code className="bg-white px-1 rounded">http://localhost:5173</code></p>
          <p className="text-slate-600">لا تغلق نافذة التشغيل السوداء أثناء العمل</p>
        </CardBody>
      </Card>

      <Card className="mb-8 border-amber-200 bg-amber-50">
        <CardHeader title="تسجيل الدخول" />
        <CardBody className="text-sm space-y-1 text-amber-950">
          <p>استخدم اسم المستخدم أو رقم الهاتف وكلمة المرور التي زوّدك بها المشرف.</p>
          <p className="text-amber-800 mt-2">غيّر كلمة المرور من الإعدادات بعد أول دخول.</p>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Link to="/my-work">
          <button className="rounded-lg bg-brand-600 px-6 py-3 text-white font-medium hover:bg-brand-700">
            ابدأ العمل
          </button>
        </Link>
        <a
          href="/docs/دليل-الاستخدام-المبسط.pdf"
          className="hidden"
          download
        >
          PDF
        </a>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        نسخة مطبوعة: docs/دليل-الاستخدام-المبسط.md في مجلد المشروع
      </p>
    </div>
  );
}
