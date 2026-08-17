import React from 'react';
import { Building2, Calculator, History, BookOpen, Sun, Moon, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface HeaderProps {
  activeTab: 'calculator' | 'history' | 'guide' | 'admin';
  setActiveTab: (tab: 'calculator' | 'history' | 'guide' | 'admin') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: UserProfile | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  user,
  onLoginClick,
  onLogoutClick,
  savedCount,
}) => {
  const isAdmin = user?.role === 'admin';

  return (
    <header dir="rtl" className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-[#0F0F12]/95 border-b border-slate-200 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div dir="rtl" className="flex items-center justify-between h-16">
          {/* 1. Logo & Title (Far Right in RTL) */}
          <div className="flex items-center gap-3 text-right">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-black shadow-md shadow-amber-500/20 shrink-0">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-right">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>سامانه ارزش منطقه‌ای املاک</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  ماده ۶۴
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-right">
                برآورد رسمی ارزش معاملاتی عرصه و اعیانی
              </p>
            </div>
          </div>

          {/* 2, 3, 4. Center Navigation Tabs (Middle in RTL) */}
          <nav dir="rtl" className="hidden md:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#16161A] border border-slate-200/60 dark:border-white/10">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'calculator'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>محاسبه‌گر</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 relative ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سوابق محاسبات</span>
              {savedCount > 0 && (
                <span className="mr-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-black/10 dark:bg-amber-500/20 text-slate-800 dark:text-amber-400 border border-amber-500/30">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'guide'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>راهنما و جدول قوانین</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-amber-600 dark:text-amber-400 hover:text-amber-500 font-black'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>اطلاعات پایه و مدیریت</span>
              </button>
            )}
          </nav>

          {/* 5, 6. Left Controls: Theme Toggle & User Auth (Far Left in RTL) */}
          <div dir="rtl" className="flex items-center gap-2 sm:gap-3">
            {/* 5. Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 hover:border-amber-500/40 transition-colors shrink-0"
              title={darkMode ? 'تغییر به تم روشن' : 'تغییر به تم تاریک'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* 6. Auth Button (Far left edge) */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px] flex items-center gap-1 justify-end">
                    {user.name || user.email.split('@')[0]}
                    {user.role === 'admin' && <span className="text-[9px] text-amber-500 font-black">(ادمین)</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px] text-right">{user.email}</span>
                </div>
                <button
                  onClick={onLogoutClick}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 transition-all tracking-wide shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود / ثبت‌نام</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200/60 dark:border-white/10">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
              activeTab === 'calculator'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>محاسبه‌گر</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold relative ${
              activeTab === 'history'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سوابق</span>
            {savedCount > 0 && (
              <span className="px-1 py-0.2 text-[9px] font-bold rounded-full bg-black/10 text-slate-800 dark:text-amber-400 border border-amber-500/30">
                {savedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
              activeTab === 'guide'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>قوانین</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-amber-600 dark:text-amber-400 font-bold'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>مدیریت</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
