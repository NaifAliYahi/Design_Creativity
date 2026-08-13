import type { Customer, OrderStatus, ResponseTemplate } from '../types';
import { uid, nowISO } from '../constants';

/** تصنيفات الردود — من بنك أسئلة سند */
export const RESPONSE_CATEGORIES = [
  'التسجيل',
  'تسجيل الدخول',
  'كلمة المرور',
  'لوحة التحكم',
  'الكروت',
  'المبيعات',
  'المحفظة',
  'أسئلة العملاء',
  'متابعة الشبكة',
  'عام',
] as const;

/** ربط حالة الشبكة بالتصنيفات المناسبة */
export const STATUS_CATEGORY_HINTS: Record<OrderStatus, string[]> = {
  جديد: ['التسجيل', 'تسجيل الدخول', 'متابعة الشبكة'],
  'قيد التنفيذ': ['لوحة التحكم', 'الكروت', 'متابعة الشبكة'],
  'بانتظار العميل': ['أسئلة العملاء', 'متابعة الشبكة', 'التسجيل'],
  'بانتظار مرفقات': ['لوحة التحكم', 'الكروت', 'متابعة الشبكة'],
  'بانتظار مخزون': ['الكروت', 'المبيعات', 'متابعة الشبكة'],
  'بانتظار تصميم': ['لوحة التحكم', 'متابعة الشبكة'],
  'بانتظار دعم فني': ['كلمة المرور', 'تسجيل الدخول', 'أسئلة العملاء'],
  مكتمل: ['المحفظة', 'المبيعات', 'أسئلة العملاء'],
  مغلق: ['عام'],
  مفقود: ['متابعة الشبكة', 'عام'],
};

/** بيانات أولية من بنك أسئلة كروت الشبكات (سند) */
export function seedResponseTemplates(): ResponseTemplate[] {
  const rows: Omit<ResponseTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      kbId: 'KB-001',
      title: 'لماذا أستخدم خدمة كروت الشبكات وما هي أبرز مميزاتها؟',
      keywords: 'مميزات,كروت الشبكات,بيع إلكتروني,لوحة تحكم,محفظة جيب',
      category: 'التسجيل',
      orderStatuses: ['جديد', 'قيد التنفيذ'],
      responseSimple:
        'تمنحك بيعاً إلكترونياً على مدار 24 ساعة، وصولاً مباشراً للإيرادات، توفيراً لتكاليف الطباعة، ولوحة تحكم متكاملة لمتابعة مبيعاتك لحظة بلحظة.',
      responseDetailed:
        'القيمة الحقيقية للخدمة تكمن في توفير بيئة عمل احترافية تمنحك: بيعاً إلكترونياً على مدار الساعة، وصول قيمة المبيعات مباشرة إلى حسابك، توفير تكاليف الطباعة والتوزيع، متابعة المبيعات لحظة بلحظة، لوحة تحكم متكاملة لإدارة شبكتك، وسهولة وصول العملاء إلى كروتك من أي مكان.',
    },
    {
      kbId: 'KB-002',
      title: 'كيف يمكنني تفعيل خدمة سداد كروت الإنترنت عبر محفظة جيب؟',
      keywords: 'تفعيل,انضمام,استمارة,محفظة جيب,صاحب شبكة,SMS',
      category: 'التسجيل',
      orderStatuses: ['جديد'],
      responseSimple:
        'قم بتعبئة استمارة الانضمام عبر الرابط: https://kurootalshabakah.tabweeb.com.ye/referral/form وستصلك بيانات الدخول برسالة نصية فور تفعيل الحساب.',
      response2: 'رابط الانضمام: https://kurootalshabakah.tabweeb.com.ye/referral/form — بعد التفعيل ستصلك SMS ببيانات الدخول.',
      responseDetailed:
        'مرحباً بك في خدمة كروت الشبكات عبر محفظة جيب. لتفعيل الخدمة، يرجى الدخول عبر الرابط المخصص وتعبئة استمارة طلب الانضمام:\nhttps://kurootalshabakah.tabweeb.com.ye/referral/form\nبعد تفعيل الحساب، ستصلك بيانات الدخول (اسم المستخدم، كلمة المرور، وكود الشبكة) عبر رسالة نصية قصيرة (SMS).',
    },
    {
      kbId: 'KB-003',
      title: 'هل يمكنني تسجيل أكثر من شبكة بنفس بيانات المالك؟',
      keywords: 'أكثر من شبكة,نفس المالك,تسجيل شبكات',
      category: 'التسجيل',
      orderStatuses: ['جديد', 'قيد التنفيذ'],
      responseSimple: 'نعم، يمكنك ذلك باستخدام نفس بيانات المالك، حيث تدار كل شبكة بشكل منفصل.',
      responseDetailed:
        'نعم، يمكنك تسجيل عدة شبكات لنفس المالك باستخدام نفس بياناتك الأساسية، حيث يتم التعامل مع كل شبكة وإدارتها بشكل مستقل ومنفصل تماماً.',
    },
    {
      kbId: 'KB-004',
      title: 'كيف يمكنني تسجيل الدخول إلى لوحة التحكم الخاصة بشبكتي؟',
      keywords: 'تسجيل الدخول,لوحة التحكم,كلمة مرور,رابط',
      category: 'تسجيل الدخول',
      orderStatuses: ['جديد', 'قيد التنفيذ', 'بانتظار دعم فني'],
      responseSimple:
        'افتح رابط لوحة التحكم المُرسل في رسالة SMS (https://kurootAlShabakah.tabweeb.com.ye)، سجل دخولك، وحدد كلمة مرور جديدة لحسابك.',
      responseDetailed:
        'بعد اعتماد طلبك، ستصلك رسالة نصية (SMS) تحتوي على رابط لوحة التحكم وبيانات الدخول. يمكنك الدخول عبر الرابط المعتمد:\nhttps://kurootAlShabakah.tabweeb.com.ye\nوعند الدخول لأول مرة، سيُطلب منك تعيين كلمة مرور جديدة وقوية لضمان أمان حسابك.',
    },
    {
      kbId: 'KB-005',
      title: 'لم تصلني رسالة نصية تحتوي على كود الشبكة أو كلمة المرور، ماذا أفعل؟',
      keywords: 'SMS,كود الشبكة,كلمة المرور,لم تصل,إعادة تعيين,دعم فني',
      category: 'كلمة المرور',
      orderStatuses: ['بانتظار دعم فني', 'بانتظار العميل'],
      responseSimple:
        'تواصل مع الدعم الفني على الأرقام (784999804 - 783990095) ليتم إعادة إرسال بيانات الدخول لك فوراً.',
      response2: 'لا تقلق — تواصل مع الدعم على 784999804 أو 783990095 وسنعيد إرسال بياناتك.',
      responseDetailed:
        'لا تقلق، يرجى التواصل مع فريق الدعم الفني عبر الأرقام المعتمدة (784999804 - 783990095)، وسنقوم فوراً بإعادة تعيين كلمة السر وإرسال بياناتك إليك.',
    },
    {
      kbId: 'KB-006',
      title: 'كيف أستطيع تعديل بيانات شبكتي أو إضافة فئة كروت جديدة؟',
      keywords: 'تعديل بيانات,فئة كروت,طلب تعديل,عرض التفاصيل',
      category: 'لوحة التحكم',
      orderStatuses: ['قيد التنفيذ', 'بانتظار تصميم', 'بانتظار مرفقات'],
      responseSimple:
        'من لوحة التحكم، ادخل إلى "عرض التفاصيل"، ثم "طلب تعديل البيانات"، أدخل التعديلات المطلوبة وأرسلها ليتم اعتمادها.',
      responseDetailed:
        'لتعديل بيانات شبكتك أو إضافة فئة جديدة:\n1. تسجيل الدخول إلى لوحة التحكم.\n2. اختيار "عرض التفاصيل".\n3. الضغط على "طلب تعديل البيانات".\n4. إدخال البيانات الجديدة والضغط على "إرسال الطلب".',
    },
    {
      kbId: 'KB-007',
      title: 'ما هي الطريقة الصحيحة لرفع واستيراد الكروت إلى النظام؟',
      keywords: 'استيراد كروت,رفع كروت,MikroTik,فئة',
      category: 'الكروت',
      orderStatuses: ['بانتظار مخزون', 'بانتظار مرفقات', 'قيد التنفيذ'],
      responseSimple:
        'من لوحة التحكم، اختر "عرض التفاصيل" ثم "استيراد كروت"، حدد الفئة وارفع ملف الكروت الخاص بك بسهولة.',
      responseDetailed:
        'بعد تصدير ملف الكروت من نظام MikroTik، توجه إلى لوحة التحكم → "عرض التفاصيل" → "استيراد كروت". حدد الفئة الصحيحة وارفع الملف ثم اضغط استيراد.',
    },
    {
      kbId: 'KB-008',
      title: 'قمت برفع كروت فئة معينة داخل فئة أخرى بالخطأ، فكيف يمكنني تصحيح ذلك؟',
      keywords: 'رفع خطأ,فئة خاطئة,حذف دفعة,آخر دفعات الكروت',
      category: 'الكروت',
      orderStatuses: ['بانتظار مخزون', 'قيد التنفيذ'],
      responseSimple:
        'احذف الكروت الخاطئة من قسم "آخر دفعات الكروت" في لوحة التحكم، ثم أعد رفعها بالفئة الصحيحة.',
      responseDetailed:
        'انتقل إلى "آخر دفعات الكروت" في لوحة التحكم، احذف الدفعة المرفوعة بالخطأ، ثم أعد رفعها في الفئة المخصصة لها.',
    },
    {
      kbId: 'KB-009',
      title: 'هل يمكنني متابعة مبيعاتي ومخزوني لحظة بلحظة؟',
      keywords: 'مبيعات,مخزون,متابعة,إحصائيات',
      category: 'المبيعات',
      orderStatuses: ['بانتظار مخزون', 'مكتمل', 'قيد التنفيذ'],
      responseSimple: 'نعم، تمنحك لوحة التحكم إحصائيات دقيقة ومتابعة فورية للمبيعات والمخزون لحظة بلحظة.',
      responseDetailed:
        'نعم بكل تأكيد. تتيح لك لوحة التحكم مراقبة حركة المبيعات، معرفة المخزون المتبقي لحظة بلحظة، ومتابعة الإيرادات بدقة.',
    },
    {
      kbId: 'KB-010',
      title: 'كيف يتم تحويل وسحب الأرباح والإيرادات المالية؟',
      keywords: 'سحب,تحويل,أرباح,تحويل تلقائي,1000 ريال,محفظة جيب',
      category: 'المحفظة',
      orderStatuses: ['مكتمل', 'قيد التنفيذ'],
      responseSimple:
        'تتجمع المبيعات في لوحة التحكم، ويمكنك تحويلها يدوياً أو تفعيل التحويل التلقائي لمحفظة جيب عند بلوغ 1000 ريال أو أكثر.',
      responseDetailed:
        'جميع مبيعات الكروت تتجمع في رصيد لوحة التحكم. يمكنك السحب يدوياً أو تفعيل "التحويل التلقائي" لمحفظة جيب عند تجاوز 1000 ريال.',
    },
    {
      kbId: 'KB-011',
      title: 'كيف يمكن للعميل شراء كرت الإنترنت باستخدام محفظة جيب؟',
      keywords: 'شراء كرت,عميل,محفظة جيب,سداد الإنترنت,كود الشبكة',
      category: 'أسئلة العملاء',
      orderStatuses: ['بانتظار العميل', 'مكتمل', 'قيد التنفيذ'],
      responseSimple:
        'من محفظة جيب اختر "سداد الإنترنت" ثم "كرت شبكة"، أدخل كود الشبكة والفئة واضغط شراء.',
      responseDetailed:
        'من تطبيق محفظة جيب: (الشحن والسداد) → (سداد الإنترنت) → (كرت شبكة) → أدخل كود الشبكة → اختر الفئة → (شراء).',
    },
    {
      kbId: 'KB-012',
      title: 'كيف يستلم العميل كرت الإنترنت بعد الشراء من محفظة جيب؟',
      keywords: 'استلام كرت,SMS,إشعار,شراء لرقم آخر',
      category: 'أسئلة العملاء',
      orderStatuses: ['بانتظار العميل', 'مكتمل'],
      responseSimple:
        'يظهر الكرت في إشعار العملية إذا كان الشراء بنفس رقم المحفظة، أو يُرسل عبر SMS إذا كان لرقم آخر.',
      responseDetailed:
        'إذا الشراء لنفس رقم المحفظة: يظهر الكرت في إشعار العملية. إذا لرقم آخر: يُرسل الكرت عبر رسالة SMS.',
    },
    {
      kbId: 'KB-013',
      title: 'متابعة — نحتاج منك رفع المرفقات',
      keywords: 'مرفقات,متابعة,رفع,تذكير,واتساب',
      category: 'متابعة الشبكة',
      orderStatuses: ['بانتظار مرفقات', 'بانتظار العميل'],
      responseSimple:
        'مرحباً، نذكّركم برفع المرفقات المطلوبة لتفعيل شبكتكم. نحن جاهزون لمساعدتكم في أي خطوة.',
      response2: 'السلام عليكم — يرجى إكمال رفع المرفقات من لوحة التحكم. هل تحتاج مساعدة؟',
      response3: 'تذكير: المرفقات مطلوبة لإكمال تفعيل شبكتكم. تواصل معنا إن واجهت أي صعوبة.',
      responseDetailed:
        'مرحباً بكم، نود تذكيركم بإكمال رفع المرفقات المطلوبة من لوحة التحكم. يمكنكم الدخول عبر الرابط المرسل في SMS. نحن متواجدون للمساعدة.',
    },
    {
      kbId: 'KB-014',
      title: 'متابعة — رفع الكروت للمخزون',
      keywords: 'مخزون,كروت,رفع,استيراد,متابعة',
      category: 'متابعة الشبكة',
      orderStatuses: ['بانتظار مخزون', 'قيد التنفيذ'],
      responseSimple:
        'مرحباً، يرجى رفع ملف الكروت من لوحة التحكم (استيراد كروت) لإكمال تفعيل المخزون.',
      response2: 'تذكير: نحتاج رفع الكروت للفئة المحددة. هل تحتاج شرح الخطوات؟',
      responseDetailed:
        'لإكمال تفعيل المخزون: ادخل لوحة التحكم → عرض التفاصيل → استيراد كروت → حدد الفئة → ارفع الملف. نسعد بمساعدتكم.',
    },
    {
      kbId: 'KB-015',
      title: 'متابعة — التصميم قيد الإنجاز',
      keywords: 'تصميم,متابعة,لوحة,تحديث',
      category: 'متابعة الشبكة',
      orderStatuses: ['بانتظار تصميم', 'قيد التنفيذ'],
      responseSimple: 'مرحباً، التصميم قيد الإنجاز وسنوافيكم بالتحديث قريباً. شكراً لصبركم.',
      responseDetailed:
        'نود إعلامكم أن طلب التصميم قيد المعالجة. سنتواصل معكم فور الاكتمال أو إذا احتجنا أي معلومة إضافية.',
    },
  ];

  const now = nowISO();
  return rows.map((r) => ({
    ...r,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }));
}

export interface SearchResponsesOptions {
  query?: string;
  category?: string;
  customer?: Customer | null;
  limit?: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,،]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function scoreResponse(r: ResponseTemplate, query: string, customer?: Customer | null): number {
  let score = 0;
  const q = query.trim().toLowerCase();
  const tokens = tokenize(q);

  const haystack = [
    r.title,
    r.keywords,
    r.category,
    r.responseSimple,
    r.response2 ?? '',
    r.response3 ?? '',
    r.responseDetailed ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (!q && customer) {
    const hints = STATUS_CATEGORY_HINTS[customer.orderStatus] ?? [];
    if (hints.includes(r.category)) score += 50;
    if (r.orderStatuses.includes(customer.orderStatus)) score += 40;
    if (customer.attachmentsStatus === 'ناقص' && r.keywords.includes('مرفقات')) score += 20;
    if (customer.inventoryStatus === 'ناقص' && r.keywords.includes('مخزون')) score += 20;
    return score;
  }

  if (!q) return 0;

  if (r.title.toLowerCase().includes(q)) score += 100;
  if (r.keywords.toLowerCase().includes(q)) score += 80;
  if (r.category.toLowerCase().includes(q)) score += 60;

  for (const t of tokens) {
    if (haystack.includes(t)) score += 15;
  }

  if (customer) {
    const hints = STATUS_CATEGORY_HINTS[customer.orderStatus] ?? [];
    if (hints.includes(r.category)) score += 25;
    if (r.orderStatuses.includes(customer.orderStatus)) score += 20;
  }

  return score;
}

/** بحث الردود — يُرجع 2–3 نتائج */
export function searchResponses(
  templates: ResponseTemplate[],
  options: SearchResponsesOptions = {}
): ResponseTemplate[] {
  const { query = '', category, customer, limit = 3 } = options;
  const q = query.trim();

  let pool = templates;
  if (category && category !== 'الكل') {
    pool = pool.filter((r) => r.category === category);
  }

  const scored = pool
    .map((r) => ({ r, score: scoreResponse(r, q, customer) }))
    .filter(({ score }) => (q ? score > 0 : score > 0))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 && q) {
    return pool
      .filter((r) => {
        const h = `${r.title} ${r.keywords}`.toLowerCase();
        return tokenize(q).some((t) => h.includes(t));
      })
      .slice(0, limit);
  }

  if (scored.length === 0 && customer) {
    return pool
      .filter((r) => r.orderStatuses.includes(customer.orderStatus))
      .slice(0, limit);
  }

  if (scored.length === 0) {
    return pool.slice(0, limit);
  }

  return scored.slice(0, limit).map(({ r }) => r);
}

export type ResponseVariant = 'simple' | 'r2' | 'r3' | 'detailed';

export function getResponseText(r: ResponseTemplate, variant: ResponseVariant): string {
  switch (variant) {
    case 'simple':
      return r.responseSimple;
    case 'r2':
      return r.response2 || r.responseSimple;
    case 'r3':
      return r.response3 || r.responseSimple;
    case 'detailed':
      return r.responseDetailed || r.responseSimple;
  }
}

/** تنسيق رقم الجوال لواتساب (اليمن) */
export function formatPhoneForWhatsApp(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '967' + p.slice(1);
  else if (p.length === 9 && !p.startsWith('967')) p = '967' + p;
  return p;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const num = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string): void {
  window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
}

export function ensureResponseTemplates(data: { responseTemplates?: ResponseTemplate[] }): ResponseTemplate[] {
  if (data.responseTemplates?.length) return data.responseTemplates;
  return seedResponseTemplates();
}
