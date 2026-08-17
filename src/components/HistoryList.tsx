import React, { useState, useMemo } from 'react';
import { SavedCalculationItem, UserProfile } from '../types.ts';
import {
  formatCurrencyInPersianWords,
  formatNumberWithCommas,
  toPersianDigits,
} from '../utils/calculator.ts';
import { generatePropertyPdfReport } from '../utils/pdfGenerator.ts';
import {
  History,
  Search,
  Trash2,
  Calendar,
  Building2,
  MapPin,
  Lock,
  Layers,
  Home,
  Loader2,
  Download,
  ChevronRight,
  ChevronLeft,
  Eye,
  ArrowUpDown,
  ImageIcon,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  RefreshCw,
} from 'lucide-react';

interface HistoryListProps {
  history: SavedCalculationItem[];
  loading: boolean;
  user: UserProfile | null;
  onDelete: (id: number) => Promise<void>;
  onBulkDelete?: (ids: number[]) => Promise<void>;
  onDeleteAll?: (scope: 'filtered' | 'all', filteredIds?: number[]) => Promise<void>;
  onSelectCalculation: (item: SavedCalculationItem) => void;
  onOpenAuthModal: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  loading,
  user,
  onDelete,
  onBulkDelete,
  onDeleteAll,
  onSelectCalculation,
  onOpenAuthModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'createdAt' | 'grandTotalValue' | 'landArea'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Selection & Batch Delete States
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemToDelete, setItemToDelete] = useState<SavedCalculationItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [deleteAllScope, setDeleteAllScope] = useState<'filtered' | 'all'>('filtered');
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [deleteAllConfirmAccepted, setDeleteAllConfirmAccepted] = useState<boolean>(false);
  const [isPerformingBatchDelete, setIsPerformingBatchDelete] = useState<boolean>(false);

  const handleDownloadPdf = async (item: SavedCalculationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingId(item.id);
    try {
      await generatePropertyPdfReport(item);
    } catch (err) {
      console.error('Error generating PDF for item:', err);
    } finally {
      setExportingId(null);
    }
  };

  if (!user) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0F0F12] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl space-y-4 max-w-xl mx-auto my-8 transition-colors dir-rtl">
        <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          سوابق محاسبات نیازمند ورود به حساب کاربری است
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          برای مشاهده و مدیریت سوابق محاسبات انجام شده در دیتابیس، لطفاً ابتدا وارد حساب کاربری خود شوید.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/10 transition-colors uppercase tracking-wider cursor-pointer"
        >
          ورود با حساب کاربری
        </button>
      </div>
    );
  }

  const filteredHistory = useMemo(() => {
    return history.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.blockCode && item.blockCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.partCode && item.partCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sectionName && item.sectionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.address && item.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.province && item.province.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [history, searchTerm]);

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'grandTotalValue') {
        comparison = a.grandTotalValue - b.grandTotalValue;
      } else if (sortField === 'landArea') {
        comparison = a.landArea - b.landArea;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredHistory, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / pageSize));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedHistory.slice(start, start + pageSize);
  }, [sortedHistory, currentPage, pageSize]);

  const handleSort = (field: 'createdAt' | 'grandTotalValue' | 'landArea') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Toggle single item selection
  const handleToggleSelect = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all filtered items
  const handleToggleSelectAll = (filteredItems: SavedCalculationItem[]) => {
    const filteredIds = filteredItems.map((item) => item.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Single Item Delete Confirmation
  const confirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await onDelete(itemToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting single calculation:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk Delete Selected
  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsPerformingBatchDelete(true);
    try {
      if (onBulkDelete) {
        await onBulkDelete(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDelete(id);
        }
      }
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error('Error deleting bulk calculations:', err);
    } finally {
      setIsPerformingBatchDelete(false);
    }
  };

  // Delete All (Two-Step Confirmation)
  const confirmDeleteAll = async () => {
    setIsPerformingBatchDelete(true);
    try {
      const filteredIds = filteredHistory.map((item) => item.id);
      if (onDeleteAll) {
        await onDeleteAll(deleteAllScope, filteredIds);
      } else if (deleteAllScope === 'filtered') {
        if (onBulkDelete) {
          await onBulkDelete(filteredIds);
        }
      }
      setSelectedIds([]);
      setIsDeleteAllModalOpen(false);
      setDeleteAllStep(1);
      setDeleteAllConfirmAccepted(false);
    } catch (err) {
      console.error('Error in delete all calculations:', err);
    } finally {
      setIsPerformingBatchDelete(false);
    }
  };

  return (
    <div className="space-y-4 dir-rtl">
      {/* Search & Control Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              جدول سوابق محاسبات ارزش معاملاتی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              تعداد کل سوابق: <span className="text-amber-600 dark:text-amber-400 font-bold">{toPersianDigits(history.length)}</span> مورد | نتایج فیلتر شده: <span className="text-amber-600 dark:text-amber-400 font-bold">{toPersianDigits(sortedHistory.length)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو در عنوان، بلوک، نشانی یا شهر..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">سطر در صفحه:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value={5}>{toPersianDigits(5)} سطر</option>
              <option value={10}>{toPersianDigits(10)} سطر</option>
              <option value={20}>{toPersianDigits(20)} سطر</option>
              <option value={50}>{toPersianDigits(50)} سطر</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Bar for Batch Selection & Delete All */}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              سوابق در دسترس: <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{toPersianDigits(sortedHistory.length)}</span> مورد
            </span>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-fadeIn">
                <CheckSquare className="w-4 h-4" />
                <span>{toPersianDigits(selectedIds.length)} محاسبه انتخاب شده</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="mr-1 text-[11px] underline hover:text-amber-500 cursor-pointer"
                >
                  (لغو انتخاب)
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Delete Selected Button */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer animate-scaleUp"
                title="حذف محاسبات انتخاب شده"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف انتخاب‌شده‌ها ({toPersianDigits(selectedIds.length)})</span>
              </button>
            )}

            {/* Delete All Button (Two-Step) */}
            <button
              type="button"
              onClick={() => {
                setDeleteAllScope(searchTerm ? 'filtered' : 'all');
                setDeleteAllStep(1);
                setDeleteAllConfirmAccepted(false);
                setIsDeleteAllModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
              title="حذف همه سوابق محاسبات"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف همه سوابق...</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-[#0F0F12] rounded-2xl border border-slate-200 dark:border-white/10">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">در حال بارگذاری جدول سوابق از سرور...</p>
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0F0F12] rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 transition-colors">
          <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchTerm ? 'موردی مطابق با عبارت جستجو یافت نشد' : 'هنوز هیچ محاسبه‌ای ثبت نشده است'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            پس از تکمیل فرم برآورد ارزش، دکمه «ذخیره در سوابق حساب» را فشار دهید.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F0F12] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden transition-colors">
          {/* Scrollable Table Container */}
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10 shadow-sm">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(sortedHistory)}
                      className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title={
                        sortedHistory.length > 0 &&
                        sortedHistory.every((item) => selectedIds.includes(item.id))
                          ? 'لغو انتخاب همه'
                          : 'انتخاب همه سوابق فیلترشده'
                      }
                    >
                      {sortedHistory.length > 0 &&
                      sortedHistory.every((item) => selectedIds.includes(item.id)) ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : sortedHistory.some((item) => selectedIds.includes(item.id)) ? (
                        <MinusSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 text-center w-10">ردیف</th>
                  <th className="py-3 px-3 text-center w-12">تصویر</th>
                  <th className="py-3 px-4">عنوان محاسبه و موقعیت بلوک</th>
                  <th
                    onClick={() => handleSort('landArea')}
                    className="py-3 px-3.5 cursor-pointer hover:text-amber-500 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>مساحت عرصه</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5">مساحت اعیانی</th>
                  <th
                    onClick={() => handleSort('grandTotalValue')}
                    className="py-3 px-4 cursor-pointer hover:text-amber-500 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>ارزش کل معاملاتی (ماده ۶۴)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('createdAt')}
                    className="py-3 px-3.5 cursor-pointer hover:text-amber-500 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>تاریخ ثبت</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center w-28">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                {paginatedHistory.map((item, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectCalculation(item)}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 dark:bg-amber-500/15'
                          : 'hover:bg-amber-500/5 dark:hover:bg-amber-500/10'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(item.id, e)}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-400 dark:text-slate-500 font-bold">
                        {toPersianDigits(rowNumber)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {item.imageUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomImage(item.imageUrl || null);
                            }}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 hover:border-amber-500 transition-all inline-flex items-center justify-center bg-slate-100 dark:bg-black/40 cursor-pointer"
                            title="مشاهده تصویر پیوست"
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>
                            {item.province || 'گیلان'} - {item.city || 'رشت'}
                          </span>
                          {item.blockCode && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
                              بلوک {toPersianDigits(item.blockCode)}
                            </span>
                          )}
                          {item.partCode && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 font-mono">
                              قسمت {toPersianDigits(item.partCode)}
                            </span>
                          )}
                        </div>
                        {item.sectionName && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            معبر: {item.sectionName}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{toPersianDigits(item.landArea)} م.م</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-400">
                        {item.hasBuilding && item.buildingArea ? (
                          <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Home className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span>{toPersianDigits(item.buildingArea)} م.م</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">فاقد اعیانی</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-amber-600 dark:text-amber-400 text-sm font-mono">
                          {formatNumberWithCommas(item.grandTotalValue)} ریال
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                          {formatCurrencyInPersianWords(item.grandTotalValue)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{new Date(item.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectCalculation(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="مشاهده و بارگذاری در محاسبه‌گر"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadPdf(item, e)}
                            disabled={exportingId === item.id}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="دانلود فایل PDF گزارش"
                          >
                            {exportingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف محاسبه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#16161A] border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium text-center sm:text-right">
              نمایش ردیف‌های{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits((currentPage - 1) * pageSize + 1)}
              </span>{' '}
              تا{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(Math.min(currentPage * pageSize, sortedHistory.length))}
              </span>{' '}
              از مجموع{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(sortedHistory.length)}
              </span>{' '}
              ردیف
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="صفحه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            currentPage === page
                              ? 'bg-amber-500 text-black shadow-sm'
                              : 'bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {toPersianDigits(page)}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="صفحه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Item Delete Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  حذف سابقه محاسبه
                </h3>
                <span className="text-[11px] text-rose-500 font-bold">
                  شناسه #{toPersianDigits(itemToDelete.id)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              آیا از حذف دائم محاسبه «
              <strong className="text-slate-900 dark:text-white font-black">
                {itemToDelete.title}
              </strong>
              » از سوابق حساب کاربری خود اطمینان دارید؟
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">موقعیت:</span>
                <span className="font-bold">{itemToDelete.city} - بلوک {itemToDelete.blockCode || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مبلغ کل:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatNumberWithCommas(itemToDelete.grandTotalValue)} ریال
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={confirmSingleDelete}
                disabled={deletingId === itemToDelete.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingId === itemToDelete.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>حذف محاسبه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Calculations Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تایید حذف گروهی سوابق انتخاب شده
                </h3>
                <span className="text-[11px] text-rose-500 font-bold">
                  {toPersianDigits(selectedIds.length)} محاسبه انتخاب شده
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                شما در حال حذف دائم{' '}
                <strong className="font-black text-rose-800 dark:text-rose-200">
                  {toPersianDigits(selectedIds.length)} سابقه محاسبه
                </strong>{' '}
                هستید. این داده‌ها از دیتابیس حساب شما حذف شده و غیرقابل بازیابی خواهند بود.
              </p>
            </div>

            {/* List Preview of Selected Items */}
            <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 space-y-1.5 text-[11px]">
              {history
                .filter((r) => selectedIds.includes(r.id))
                .slice(0, 5)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 px-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 font-medium"
                  >
                    <span className="truncate max-w-[200px]">
                      {r.title} ({r.city})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatNumberWithCommas(r.grandTotalValue)} ریال
                    </span>
                  </div>
                ))}
              {selectedIds.length > 5 && (
                <div className="text-center text-[10px] text-slate-400 pt-1">
                  ... و {toPersianDigits(selectedIds.length - 5)} مورد دیگر
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={confirmBulkDelete}
                disabled={isPerformingBatchDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPerformingBatchDelete ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>بله، سوابق انتخابی را حذف کن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Two-Step Confirmation Modal (Filtered or Entire History) */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3 text-rose-500">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {deleteAllStep === 1 ? 'حذف کلی یا گروهی سوابق محاسبات' : 'تایید نهایی و امنیتی حذف سوابق'}
                  </h3>
                  <span className="text-[11px] text-rose-500 font-bold">
                    {deleteAllStep === 1 ? 'مرحله ۱ از ۲: تعیین محدوده حذف' : 'مرحله ۲ از ۲: تایید قطعی حذف'}
                  </span>
                </div>
              </div>

              {/* Progress Steps Dots */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    deleteAllStep === 1 ? 'bg-amber-500 scale-110' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    deleteAllStep === 2 ? 'bg-rose-500 scale-110' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                />
              </div>
            </div>

            {/* STEP 1: Select Scope */}
            {deleteAllStep === 1 && (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  لطفاً مشخص فرمایید مایل به پاکسازی کدام دسته از سوابق محاسبات خود هستید:
                </p>

                {/* Scope Selection Radio Cards */}
                <div className="space-y-2.5">
                  <label
                    onClick={() => setDeleteAllScope('filtered')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      deleteAllScope === 'filtered'
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcDeleteScope"
                      checked={deleteAllScope === 'filtered'}
                      onChange={() => setDeleteAllScope('filtered')}
                      className="mt-1 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold">
                        حذف موارد فیلتر شده یا جستجوشده فعلی ({toPersianDigits(sortedHistory.length)} مورد)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {searchTerm ? (
                          <span>
                            منطبق با عبارت جستجوی «<strong className="text-amber-500">{searchTerm}</strong>»
                          </span>
                        ) : (
                          <span>شامل کلیه سوابق موجود در لیست فیلتر شده جاری</span>
                        )}
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setDeleteAllScope('all')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      deleteAllScope === 'all'
                        ? 'border-rose-500 bg-rose-500/10 dark:bg-rose-500/15 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcDeleteScope"
                      checked={deleteAllScope === 'all'}
                      onChange={() => setDeleteAllScope('all')}
                      className="mt-1 accent-rose-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        حذف کامل تمامی سوابق محاسبات شما ({toPersianDigits(history.length)} مورد)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        شامل کلیه محاسبات ثبت شده در حساب کاربری شما از ابتدا تا کنون
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>در مرحله بعد، جزئیات و تاییدیه امنیتی قبل از حذف قطعی اخذ خواهد شد.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteAllConfirmAccepted(false);
                      setDeleteAllStep(2);
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    <span>ادامه به مرحله دوم (تایید نهایی)</span>
                    <span className="font-mono text-sm">←</span>
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Final Security Confirmation */}
            {deleteAllStep === 2 && (
              <>
                <div className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-rose-600 dark:text-rose-400 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse text-rose-500" />
                    <span>اخطار شدید: این عملیات غیرقابل بازگشت است!</span>
                  </div>

                  <p className="leading-relaxed font-medium">
                    شما در حال حذف دائم و کامل{' '}
                    <strong className="text-rose-950 dark:text-white font-black text-sm">
                      {toPersianDigits(deleteAllScope === 'all' ? history.length : sortedHistory.length)} سابقه محاسبه
                    </strong>{' '}
                    از دیتابیس حساب کاربری خود هستید.
                  </p>

                  <div className="pt-2 border-t border-rose-500/20 text-[11px] space-y-1 font-medium">
                    <div>
                      <span className="text-slate-600 dark:text-slate-300">محدوده تعیین‌شده: </span>
                      <strong className="text-slate-900 dark:text-white">
                        {deleteAllScope === 'all'
                          ? 'تمام سوابق موجود در حساب کاربری'
                          : `موارد فیلتر شده جاری (${toPersianDigits(sortedHistory.length)} سابقه)`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Explicit Checkbox Confirmation */}
                <label className="p-3 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 flex items-start gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteAllConfirmAccepted}
                    onChange={(e) => setDeleteAllConfirmAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed select-none">
                    از عواقب پاکسازی دائمی داده‌ها کاملاً آگاهم و حذف قطعی این{' '}
                    <span className="text-rose-600 dark:text-rose-400 font-black">
                      {toPersianDigits(deleteAllScope === 'all' ? history.length : sortedHistory.length)} سابقه محاسبه
                    </span>{' '}
                    را تایید می‌نمایم.
                  </span>
                </label>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(1)}
                    disabled={isPerformingBatchDelete}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <span>→</span>
                    <span>بازگشت به مرحله ۱</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteAllModalOpen(false)}
                      disabled={isPerformingBatchDelete}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      انصراف
                    </button>

                    <button
                      type="button"
                      onClick={confirmDeleteAll}
                      disabled={!deleteAllConfirmAccepted || isPerformingBatchDelete}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isPerformingBatchDelete ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>تایید نهایی و پاکسازی سوابق</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image zoom modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden border border-white/20 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomImage}
              alt="تصویر محاسبه"
              className="max-h-[85vh] max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

