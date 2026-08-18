import { useAuth } from '@/context/AuthContext';
import { useStoreRouter } from '@/context/StoreRouterContext';
import { Badge } from '@/components/ui';
import { User, LogOut, Mail, Shield } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'مدير النظام', manager: 'مدير', warehouse: 'أمين مستودع',
  accountant: 'محاسب', viewer: 'مشاهد', customer: 'عميل',
};

export default function StoreAccountPage() {
  const { profile, signOut } = useAuth();
  const { navigate } = useStoreRouter();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-app">حسابي</h1>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xl shrink-0">
            {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-app">{profile?.full_name || 'مستخدم'}</h3>
            <p className="text-muted text-sm">{profile?.email}</p>
            <div className="mt-1"><Badge variant="info">{ROLE_LABELS[profile?.role ?? 'customer'] ?? profile?.role}</Badge></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2 border-b border-app">
            <Mail className="w-4 h-4 text-muted shrink-0" />
            <span className="text-sm text-muted">البريد الإلكتروني</span>
            <span className="text-sm font-medium text-app mr-auto truncate" dir="ltr">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-app">
            <Shield className="w-4 h-4 text-muted shrink-0" />
            <span className="text-sm text-muted">الصلاحية</span>
            <span className="text-sm font-medium text-app mr-auto">{ROLE_LABELS[profile?.role ?? 'customer'] ?? profile?.role}</span>
          </div>
          <div className="flex items-center gap-3 py-2">
            <User className="w-4 h-4 text-muted shrink-0" />
            <span className="text-sm text-muted">الاسم</span>
            <span className="text-sm font-medium text-app mr-auto">{profile?.full_name || '—'}</span>
          </div>
        </div>
      </div>

      <button onClick={signOut} className="btn-danger w-full">
        <LogOut className="w-4 h-4" />
        تسجيل الخروج
      </button>

      <button onClick={() => navigate('home')} className="btn-secondary w-full">
        العودة للرئيسية
      </button>
    </div>
  );
}
