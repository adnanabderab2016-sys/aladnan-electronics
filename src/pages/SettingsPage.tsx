import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Badge } from '@/components/ui';
import { Moon, Sun, User, Shield, Bell, Database, Cpu } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'مدير النظام', manager: 'مدير', warehouse: 'أمين مستودع',
  accountant: 'محاسب', viewer: 'مشاهد', customer: 'عميل',
};

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xl shrink-0">
            {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-app">{profile?.full_name || 'مستخدم'}</h3>
            <p className="text-muted text-sm">{profile?.email}</p>
            <div className="mt-1"><Badge variant="info">{ROLE_LABELS[profile?.role ?? 'viewer'] ?? profile?.role}</Badge></div>
          </div>
        </div>
        <button onClick={signOut} className="btn-danger">تسجيل الخروج</button>
      </div>

      {/* Appearance */}
      <div className="card p-5">
        <h3 className="font-semibold text-app mb-4">المظهر</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-muted" /> : <Sun className="w-5 h-5 text-muted" />}
            <div>
              <p className="text-sm font-medium text-app">الوضع الليلي</p>
              <p className="text-xs text-muted">تبديل بين الوضع الفاتح والداكن</p>
            </div>
          </div>
          <button onClick={toggleTheme} className="btn-secondary">
            {theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          </button>
        </div>
      </div>

      {/* System info */}
      <div className="card p-5">
        <h3 className="font-semibold text-app mb-4">معلومات النظام</h3>
        <div className="space-y-3">
          <InfoRow icon={<Database className="w-4 h-4" />} label="قاعدة البيانات" value="Supabase / PostgreSQL" />
          <InfoRow icon={<Cpu className="w-4 h-4" />} label="محرك التسعير" value="موحد — قاعدة واحدة" />
          <InfoRow icon={<Shield className="w-4 h-4" />} label="الأمان" value="RLS مفعّل على جميع الجداول" />
          <InfoRow icon={<Bell className="w-4 h-4" />} label="الإشعارات" value="داخل التطبيق" />
          <InfoRow icon={<User className="w-4 h-4" />} label="المصادقة" value="Supabase Auth — بريد إلكتروني/كلمة مرور" />
        </div>
      </div>

      {/* Design system */}
      <div className="card p-5">
        <h3 className="font-semibold text-app mb-4">نظام التصميم</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ColorToken name="أساسي" className="bg-primary-600" />
          <ColorToken name="ثانوي" className="bg-secondary-600" />
          <ColorToken name="نجاح" className="bg-success-500" />
          <ColorToken name="تحذير" className="bg-warning-500" />
          <ColorToken name="خطأ" className="bg-error-500" />
          <ColorToken name="معلومات" className="bg-info-500" />
          <ColorToken name="تمييز" className="bg-accent-500" />
          <ColorToken name="محايد" className="bg-secondary-400" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-app flex items-center justify-center text-muted shrink-0">{icon}</div>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-app mr-auto">{value}</span>
    </div>
  );
}

function ColorToken({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-xl ${className}`} />
      <span className="text-xs text-muted">{name}</span>
    </div>
  );
}
