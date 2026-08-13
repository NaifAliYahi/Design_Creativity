import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { MyWorkPage } from './pages/MyWorkPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { ImportPage } from './pages/ImportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { RepliesPage } from './pages/RepliesPage';
import { ResponseFormPage } from './pages/ResponseFormPage';
import { DesignTemplatePage } from './pages/DesignTemplatePage';

/** الزائر: /design — الموظف المسجّل يُوجَّه إلى /studio */
function GuestDesignRoute() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">جاري التحميل...</p>
      </div>
    );
  }
  if (session) return <Navigate to="/studio" replace />;
  return <DesignTemplatePage guestMode />;
}

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter basename={routerBase}>
          <Routes>
            {/* ——— عام: تصميم بدون تسجيل (للعملاء / الرابط العام) ——— */}
            <Route element={<PublicLayout />}>
              <Route index element={<Navigate to="/design" replace />} />
              <Route path="design" element={<GuestDesignRoute />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />

            {/* ——— موظفين: يتطلب تسجيل دخول ——— */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="portal" element={<Navigate to="/my-work" replace />} />
                <Route path="my-work" element={<MyWorkPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerFormPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="replies" element={<RepliesPage />} />
                <Route path="replies/:id" element={<ResponseFormPage />} />
                <Route path="studio" element={<DesignTemplatePage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* لوحة الإدارة — للمدير فقط */}
                <Route path="admin" element={<DashboardPage />} />
              </Route>
            </Route>

            {/* روابط قديمة */}
            <Route path="/design-old" element={<Navigate to="/studio" replace />} />

            <Route path="*" element={<Navigate to="/design" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
