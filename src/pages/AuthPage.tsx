import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Cpu, Loader2, Lock, Mail, User } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-elevated mb-4">
            <Cpu className="w-9 h-9 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-app">إنجاز للإلكترونيات</h1>
          <p className="text-muted text-sm mt-1">منصة تجارة وإدارة متكاملة</p>
        </div>

        <div className="card p-6 sm:p-8 animate-fade-in">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-app rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-surface text-app shadow-sm'
                  : 'text-muted hover:text-app'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-surface text-app shadow-sm'
                  : 'text-muted hover:text-app'
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="fullName">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input pr-10"
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pr-10"
                  placeholder="name@example.com"
                  required
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  dir="ltr"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'signin' ? (
                'تسجيل الدخول'
              ) : (
                'إنشاء حساب'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          © 2026 إنجاز للإلكترونيات — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
