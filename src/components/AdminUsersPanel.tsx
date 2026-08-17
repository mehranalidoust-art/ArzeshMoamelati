import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types.ts';
import { getAuthToken } from '../utils/authClient.ts';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ShieldAlert,
  User,
  Key,
  Mail,
  Shield,
  Clock,
  Filter,
} from 'lucide-react';
import { toPersianDigits } from '../utils/calculator.ts';

interface AdminUsersPanelProps {
  user: UserProfile | null;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ user }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Modal State for Add/Edit User
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<{
    id?: number;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'user';
  } | null>(null);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);

  // Modal State for Delete User Confirmation
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Alerts
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در دریافت لیست کاربران از سرور' });
      }
    } catch (err) {
      console.error('Error fetching users list:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور جهت دریافت لیست کاربران' });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAddUserModal = () => {
    setUserModalError(null);
    setEditingUser({
      name: '',
      email: '',
      password: '',
      role: 'user',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: UserProfile) => {
    setUserModalError(null);
    setEditingUser({
      id: u.id,
      name: u.name || '',
      email: u.email,
      password: '',
      role: u.role || 'user',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    setUserModalError(null);
    if (!editingUser?.email || !editingUser.email.trim()) {
      setUserModalError('لطفاً ایمیل کاربر را وارد کنید.');
      return;
    }

    if (!editingUser.id && (!editingUser.password || editingUser.password.length < 6)) {
      setUserModalError('کلمه عبور برای کاربر جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    setIsSavingUser(true);
    try {
      const token = await getAuthToken();
      const isEdit = !!editingUser.id;
      const url = isEdit ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editingUser),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: isEdit ? 'اطلاعات کاربر با موفقیت ویرایش شد.' : 'کاربر جدید با موفقیت ایجاد گردید.',
        });
        setIsUserModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        setUserModalError(err.error || 'خطا در ذخیره اطلاعات کاربر');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setUserModalError('خطا در ارتباط با سرور');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleRoleToggle = async (userId: number, currentRole?: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `سطح دسترسی کاربر به «${newRole === 'admin' ? 'مدیر سیستم (ادمین)' : 'کاربر عادی'}» تغییر یافت.`,
        });
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در تغییر سطح دسترسی' });
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete || !userToDelete.id) return;
    setIsDeletingUser(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `حساب کاربری «${userToDelete.name || userToDelete.email}» با موفقیت حذف گردید.` });
        setUserToDelete(null);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در حذف کاربر' });
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Filtered Users List
  const filteredUsers = usersList.filter((u) => {
    const matchQuery =
      !userSearch ||
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));

    const matchRole =
      roleFilter === 'all' ? true : roleFilter === 'admin' ? u.role === 'admin' : u.role !== 'admin';

    return matchQuery && matchRole;
  });

  const totalUsersCount = usersList.length;
  const adminUsersCount = usersList.filter((u) => u.role === 'admin').length;
  const normalUsersCount = totalUsersCount - adminUsersCount;

  return (
    <div className="space-y-6 animate-fadeIn dir-rtl text-right font-['Vazirmatn',sans-serif] max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 dark:bg-slate-900/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>مدیریت کاربران و سطوح دسترسی</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                USER MANAGEMENT
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              تعریف کاربر جدید، ویرایش مشخصات، تنظیم کلمه عبور، مدیریت نقش‌های کاربری (مدیر سیستم / کاربر عادی) و حذف حساب‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white transition-colors cursor-pointer"
            title="بروزرسانی لیست کاربران"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>

          <button
            onClick={handleOpenAddUserModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>تعریف کاربر جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Messages Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2 border shadow-sm transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            )}
            <span className="font-bold">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">کل حساب‌های کاربری</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(totalUsersCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">مدیران سیستم (ادمین)</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {toPersianDigits(adminUsersCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">کاربران عادی سامانه</span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">
              {toPersianDigits(normalUsersCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="جستجو بر اساس نام کاربر یا نشانی ایمیل..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              همه نقش‌ها ({toPersianDigits(totalUsersCount)})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleFilter === 'admin'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              مدیران ({toPersianDigits(adminUsersCount)})
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleFilter === 'user'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              کاربران عادی ({toPersianDigits(normalUsersCount)})
            </button>
          </div>
        </div>
      </div>

      {/* 5. Users Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-4 text-center w-12">#</th>
                <th className="p-4">مشخصات کاربر</th>
                <th className="p-4">ایمیل / شناسه ورود</th>
                <th className="p-4 text-center">سطح دسترسی (نقش)</th>
                <th className="p-4 text-center">تاریخ عضویت</th>
                <th className="p-4 text-center">عملیات و مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-800 dark:text-slate-200 font-medium">
              {loadingUsers ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                      <span className="text-xs font-bold">در حال بارگذاری لیست کاربران...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-xs">
                    {userSearch ? 'هیچ کاربری با عبارت جستجو شده یافت نشد.' : 'هنوز کاربری در سامانه تعریف نشده است.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isCurrentLoggedUser = user?.id === u.id || user?.email === u.email;
                  return (
                    <tr
                      key={u.id || idx}
                      className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 text-center font-mono text-slate-400">
                        {toPersianDigits(idx + 1)}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                            {u.name ? u.name.charAt(0) : u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{u.name || 'بدون نام'}</span>
                              {isCurrentLoggedUser && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                  حساب شما
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              UID: {u.uid ? u.uid.substring(0, 14) + '...' : '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-mono text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-500/30">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>مدیر سیستم (ادمین)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-white/10">
                            <User className="w-3.5 h-3.5" />
                            <span>کاربر عادی</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('fa-IR')
                          : '-'}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRoleToggle(u.id, u.role)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                            title="تغییر سطح دسترسی"
                          >
                            {u.role === 'admin' ? 'تبدیل به کاربر عادی' : 'ارتقا به ادمین'}
                          </button>

                          <button
                            onClick={() => handleOpenEditUserModal(u)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 transition-colors cursor-pointer"
                            title="ویرایش مشخصات و کلمه عبور"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setUserToDelete(u)}
                            disabled={isCurrentLoggedUser}
                            className={`p-2 rounded-lg transition-colors ${
                              isCurrentLoggedUser
                                ? 'opacity-30 cursor-not-allowed text-slate-400'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer'
                            }`}
                            title={isCurrentLoggedUser ? 'امکان حذف حساب کاربری فعلی وجود ندارد' : 'حذف کاربر'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Add/Edit User Modal */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingUser.id ? 'ویرایش مشخصات کاربر' : 'تعریف کاربر جدید در سامانه'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userModalError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نام و نام خانوادگی کاربر:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="مثال: علی احمدی"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نشانی ایمیل (شناسه ورود) <span className="text-rose-500">*</span>:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    dir="ltr"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {editingUser.id ? 'کلمه عبور جدید (در صورت تمایل به تغییر)' : 'کلمه عبور *'}:
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    dir="ltr"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder={editingUser.id ? 'برای بدون تغییر ماندن خالی بگذارید' : 'حداقل ۶ کاراکتر'}
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نقش و سطح دسترسی:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, role: 'user' })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editingUser.role === 'user'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-[#16161A] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>کاربر عادی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, role: 'admin' })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editingUser.role === 'admin'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-[#16161A] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>مدیر سیستم (ادمین)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleSaveUser}
                disabled={isSavingUser}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingUser ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>ذخیره مشخصات کاربر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete User In-App Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تایید حذف حساب کاربری
                </h3>
                <span className="text-[11px] text-rose-500 font-bold">غیرقابل بازگشت</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              آیا از حذف دائمی کاربر «
              <strong className="text-slate-900 dark:text-white">
                {userToDelete.name || userToDelete.email}
              </strong>
              » با نشانی ایمیل «<span className="font-mono">{userToDelete.email}</span>» اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>بله، کاربر حذف شود</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
