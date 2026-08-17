import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfile } from '../types.ts';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Mail, Lock, User, Key, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  onSyncUser: (idToken: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser,
  onSyncUser,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('لطفاً ایمیل و کلمه عبور را وارد کنید.');
      return;
    }

    setLoading(true);
    setError(null);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        onClose();
      } else {
        setError(data.error || 'خطا در احراز هویت.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickFill = () => {
    setEmail('admin@maddah64.ir');
    setPassword('admin123456');
    setAuthMode('login');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem('firebase_token', token);
      await onSyncUser(token);
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'خطا در ورود با گوگل. لطفاً مجدداً تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn dir-rtl">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-[#0F0F12] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">حساب کاربری و احراز هویت</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ورود با حساب کاربری عادی یا ادمین برای مدیریت و ذخیره محاسبات املاک
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {user ? (
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">شما با حساب زیر وارد شده‌اید:</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-mono dir-ltr">{user.email}</p>
            {user.role === 'admin' && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
                سطح دسترسی: مدیر ارشد (ادمین)
              </span>
            )}
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/10"
            >
              متوجه شدم
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Login / Register Mode Tabs */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-[#16161A] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-black shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ورود به حساب
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-black shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ثبت‌نام جدید
              </button>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثلا: علی محمدی"
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs text-slate-900 dark:text-white"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ایمیل کاربری
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs text-slate-900 dark:text-white font-mono dir-ltr text-right"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  کلمه عبور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs text-slate-900 dark:text-white font-mono dir-ltr text-right"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'در حال پردازش...' : authMode === 'login' ? 'ورود به حساب' : 'ایجاد حساب کاربری'}</span>
              </button>
            </form>

            {/* Quick Admin Helper Button */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Key className="w-4 h-4 shrink-0" />
                <span className="font-bold">حساب مدیر ارشد (ادمین):</span>
              </div>
              <button
                type="button"
                onClick={handleAdminQuickFill}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors"
              >
                درج اطلاعات ادمین
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-[#0F0F12] px-2 text-slate-400 font-bold">یا</span>
              </div>
            </div>

            {/* Google Sign In Option */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] hover:bg-slate-100 dark:hover:bg-white/10 font-bold text-xs text-slate-800 dark:text-white shadow-sm transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>ورود سریع با حساب گوگل</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
