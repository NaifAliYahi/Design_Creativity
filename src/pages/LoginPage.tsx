import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetServerCheck } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

export function LoginPage() {
  const { login, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/my-work';
  const needServer = Boolean((location.state as { needServerLogin?: boolean } | null)?.needServerLogin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    resetServerCheck();
  }, []);

  useEffect(() => {
    if (session) navigate(from, { replace: true });
  }, [session, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setError(
        needServer
          ? 'فشل الدخول على السيرفر. شغّل npm run dev وتأكد من 777465157 / 1234'
          : 'اسم المستخدم أو كلمة المرور غير صحيحة'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">
            CS
          </div>
          <h1 className="text-2xl font-bold text-slate-900">نظام متابعة العملاء</h1>
          <p className="mt-1 text-sm text-slate-500">كروت الشبكات — محفظة جيب</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="اسم المستخدم / رقم الهاتف">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              autoComplete="username"
              className="text-base py-3"
            />
          </Field>
          <Field label="كلمة المرور">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              autoComplete="current-password"
              className="text-base py-3"
            />
          </Field>

          {error && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          <Button type="submit" className="w-full py-3 text-base" disabled={submitting}>
            {submitting ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/design" className="text-sm font-medium text-brand-600 hover:underline">
            🎨 تصميم بطاقة بدون تسجيل دخول
          </Link>
          <p className="mt-1 text-xs text-slate-500">شارك هذا الرابط مع العملاء</p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          البيانات محمية — تسجيل الدخول مطلوب للموظفين
        </p>
      </div>
    </div>
  );
}
