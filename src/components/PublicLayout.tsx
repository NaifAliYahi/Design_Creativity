import { Outlet } from 'react-router-dom';

/** واجهة عامة للزوار — تصميم فقط بدون تسجيل دخول (بدون أي روابط دخول) */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 lg:px-6">
          <div>
            <p className="text-xs text-brand-600">محفظة جيب</p>
            <h1 className="text-lg font-bold text-slate-900">مصمم بطاقات الشبكات</h1>
            <p className="text-xs text-slate-500">صمّم بطاقتك مجاناً — بدون تسجيل</p>
          </div>
        </div>
      </header>
      <main className="p-4 lg:p-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        محفظة جيب — كروت الشبكات © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
