import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { exportCustomersToExcel } from '../lib/excel';
import { getStorageInfo } from '../lib/db';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
} from '../components/ui';
import type { UserRole } from '../types/auth';
import type { UserAccount } from '../types/auth';

export function SettingsPage() {
  const { data, updateSettings, exportJson, importJson, resetAll } = useApp();
  const { session, isManager, users, refreshUsers, changeUserPassword, createUser, updateUserAccount, removeUser } =
    useAuth();
  const [companyName, setCompanyName] = useState(data.settings.companyName);
  const [msg, setMsg] = useState('');
  const [storageLabel, setStorageLabel] = useState('…');
  const fileRef = useRef<HTMLInputElement>(null);

  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    role: 'موظف' as UserRole,
    password: '1234',
  });

  useEffect(() => {
    if (isManager) refreshUsers();
  }, [isManager, refreshUsers]);

  useEffect(() => {
    getStorageInfo().then((info) => setStorageLabel(info.label));
  }, [data]);

  const saveCompany = () => {
    updateSettings({ companyName });
    setMsg('تم الحفظ');
  };

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إدارة النظام والمستخدمين" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="الشركة" />
          <CardBody className="space-y-4">
            <Field label="اسم المشروع">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
            <Button onClick={saveCompany}>حفظ</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="كلمة مروري" />
          <CardBody>
            <ChangePasswordForm
              userId={session?.userId ?? ''}
              onSave={async (p) => {
                await changeUserPassword(session!.userId, p);
                setMsg('تم تغيير كلمة المرور');
              }}
            />
          </CardBody>
        </Card>

        {isManager && (
          <Card className="lg:col-span-2">
            <CardHeader title="المستخدمون — تعديل / حذف" />
            <CardBody>
              <table className="mb-6 w-full text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2 text-right">المستخدم</th>
                    <th className="py-2">الاسم</th>
                    <th className="py-2">الدور</th>
                    <th className="py-2">الحالة</th>
                    <th className="py-2 text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      isSelf={u.id === session?.userId}
                      onSave={async (patch) => {
                        await updateUserAccount(u.id, patch);
                        setMsg('تم تحديث المستخدم');
                      }}
                      onDelete={async () => {
                        if (u.id === session?.userId) {
                          alert('لا يمكن حذف حسابك أثناء تسجيل الدخول');
                          return;
                        }
                        const admins = users.filter((x) => x.role === 'مدير' && x.active);
                        if (u.role === 'مدير' && admins.length <= 1) {
                          alert('لا يمكن حذف آخر مدير');
                          return;
                        }
                        if (!confirm(`حذف المستخدم «${u.displayName}» (${u.username})؟`)) return;
                        await removeUser(u.id);
                        setMsg('تم حذف المستخدم');
                      }}
                    />
                  ))}
                </tbody>
              </table>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input placeholder="username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                <Input placeholder="الاسم العربي" value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} />
                <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                  <option value="موظف">موظف</option>
                  <option value="مشرف">مشرف</option>
                  <option value="مدير">مدير</option>
                </Select>
                <Button
                  onClick={async () => {
                    await createUser({ ...newUser, active: true }, newUser.password);
                    setNewUser({ username: '', displayName: '', role: 'موظف', password: '1234' });
                    setMsg('تم إضافة المستخدم');
                  }}
                >
                  + مستخدم
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader title="نسخ احتياطي" />
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">
              التخزين: <strong>{storageLabel}</strong>
            </p>
            <p className="text-xs text-slate-500">
              شغّل «تشغيل-النظام.bat» لحفظ البيانات في ملف داخل المشروع — تبقى بعد حذف الكاش أو تغيير المتصفح.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => exportCustomersToExcel(data.customers)}>
                تصدير Excel
              </Button>
              <Button variant="secondary" onClick={exportJson}>
                تصدير JSON (كامل)
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                استيراد JSON
              </Button>
              {isManager && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (confirm('حذف كل البيانات؟')) await resetAll();
                  }}
                >
                  إعادة تعيين
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  await importJson(f);
                  setMsg('تم استيراد JSON');
                }
              }}
            />
            <p className="text-sm text-slate-500">
              {data.customers.length} عميل · {data.tickets.length} تذكرة · {data.complaints.length} شكوى
            </p>
            {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onSave,
  onDelete,
}: {
  user: UserAccount;
  isSelf: boolean;
  onSave: (patch: Partial<UserAccount>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.active);

  if (!editing) {
    return (
      <tr className="border-t">
        <td className="py-2 font-mono">{user.username}</td>
        <td className="py-2 text-center">{user.displayName}</td>
        <td className="py-2 text-center">{user.role}</td>
        <td className="py-2 text-center">{user.active ? 'نشط' : 'معطّل'}</td>
        <td className="py-2 text-left">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              تعديل
            </Button>
            {!isSelf && (
              <Button size="sm" variant="danger" onClick={() => void onDelete()}>
                حذف
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t bg-slate-50">
      <td className="py-2 font-mono">{user.username}</td>
      <td className="py-2">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </td>
      <td className="py-2">
        <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="موظف">موظف</option>
          <option value="مشرف">مشرف</option>
          <option value="مدير">مدير</option>
        </Select>
      </td>
      <td className="py-2 text-center">
        <label className="inline-flex items-center gap-1 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          نشط
        </label>
      </td>
      <td className="py-2 text-left">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={async () => {
              await onSave({ displayName, role, active });
              setEditing(false);
            }}
          >
            حفظ
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
            إلغاء
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ChangePasswordForm({
  userId,
  onSave,
}: {
  userId: string;
  onSave: (p: string) => Promise<void>;
}) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');

  if (!userId) return null;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (p1.length < 4) return setErr('4 أحرف على الأقل');
        if (p1 !== p2) return setErr('غير متطابقة');
        await onSave(p1);
        setP1('');
        setP2('');
        setErr('');
      }}
    >
      <Input type="password" placeholder="كلمة مرور جديدة" value={p1} onChange={(e) => setP1(e.target.value)} />
      <Input type="password" placeholder="تأكيد" value={p2} onChange={(e) => setP2(e.target.value)} />
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <Button type="submit" size="sm">تغيير</Button>
    </form>
  );
}
