import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';

const NAV_EMPLOYEE = [
  { path: '/my-work', label: 'عملي اليوم', icon: '🏠' },
  { path: '/replies', label: 'ردود واتساب', icon: '💬' },
  { path: '/studio', label: 'قالب التصميم', icon: '🎨' },
  { path: '/customers', label: 'كل الشبكات', icon: '📋' },
  { path: '/import', label: 'رفع Excel', icon: '📥' },
  { path: '/reports', label: 'تقرير اليوم', icon: '📊' },
  { path: '/help', label: 'دليل الاستخدام', icon: '❓' },
];

const NAV_ADMIN = [
  { path: '/admin', label: 'لوحة الإدارة', icon: '▣' },
  { path: '/settings', label: 'إعدادات', icon: '⚙' },
];

export function Layout() {
  const { data } = useApp();
  const { session, logout, isManager } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 right-0 z-40 flex w-56 flex-col border-l border-slate-200 bg-brand-900 text-white lg:w-60">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-xs text-blue-200">محفظة جيب</p>
          <h1 className="text-sm font-bold leading-snug">{data.settings.companyName}</h1>
          {session && (
            <p className="mt-2 text-sm">
              {session.displayName}
              <span className="mr-1 text-xs text-blue-300">({session.role})</span>
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {NAV_EMPLOYEE.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </ul>
          {isManager && (
            <>
              <p className="mb-1 mt-4 px-2 text-xs text-blue-300">الإدارة</p>
              <ul className="space-y-0.5">
                {NAV_ADMIN.map((item) => (
                  <NavItem key={item.path} {...item} />
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-2">
          <p className="text-center text-xs text-blue-200">{data.customers.length} شبكة</p>
          <Button variant="secondary" className="w-full text-sm" onClick={() => { logout(); navigate('/login'); }}>
            خروج
          </Button>
        </div>
      </aside>

      <main className="mr-56 min-h-screen flex-1 p-4 lg:mr-60 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ path, label, icon }: { path: string; label: string; icon: string }) {
  return (
    <li>
      <NavLink
        to={path}
        end={path === '/admin'}
        className={({ isActive }) =>
          `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
            isActive ? 'bg-white/15 font-semibold' : 'text-blue-100 hover:bg-white/10'
          }`
        }
      >
        <span>{icon}</span>
        {label}
      </NavLink>
    </li>
  );
}
