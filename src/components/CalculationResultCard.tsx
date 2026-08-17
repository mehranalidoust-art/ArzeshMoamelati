import React, { useState } from 'react';
import { CalculationBreakdown, CalculationFormData, UserProfile } from '../types.ts';
import {
  formatCurrencyInPersianWords,
  formatNumberWithCommas,
  toPersianDigits,
} from '../utils/calculator.ts';
import { generatePropertyPdfReport } from '../utils/pdfGenerator.ts';
import {
  Calculator,
  Save,
  Check,
  Layers,
  Home,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
  Download,
  Table as TableIcon,
  Equal,
  Plus,
  FunctionSquare,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface CalculationResultCardProps {
  breakdown: CalculationBreakdown;
  formData: CalculationFormData;
  user: UserProfile | null;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
  onOpenAuthModal: () => void;
}

export const CalculationResultCard: React.FC<CalculationResultCardProps> = ({
  breakdown,
  formData,
  user,
  onSave,
  isSaving,
  saveSuccess,
  onOpenAuthModal,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'table' | 'cards'>('table');
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalSumBeforeDiscount = breakdown.land.totalLandValue + breakdown.building.totalBuildingValue;
  const landPercent =
    totalSumBeforeDiscount > 0
      ? Math.round((breakdown.land.totalLandValue / totalSumBeforeDiscount) * 100)
      : 0;
  const buildingPercent = 100 - landPercent;

  const validateMandatoryFields = (): boolean => {
    if (!formData.title || formData.title.trim().length < 10) {
      setValidationError('«عنوان پرونده یا شناسه ملک» اجباری است و باید حداقل ۱۰ کاراکتر باشد.');
      const elem = document.getElementById('property-title-input');
      if (elem) {
        elem.focus();
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    if (!formData.address || !formData.address.trim()) {
      setValidationError('درج «نشانی دقیق ملک» اجباری است. لطفاً ابتدا نشانی را در فرم وارد نمایید.');
      const elem = document.getElementById('property-exact-address-input');
      if (elem) {
        elem.focus();
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleDownloadPdf = async () => {
    if (!validateMandatoryFields()) return;
    setIsExportingPdf(true);
    try {
      await generatePropertyPdfReport(formData, breakdown);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveClick = async () => {
    if (!validateMandatoryFields()) return;
    await onSave();
  };

  return (
    <div className="sticky top-20 space-y-5 print:static print:w-full dir-rtl text-right font-['Vazirmatn',sans-serif]">
      {/* GRAND TOTAL SUMMARY BOX (YELLOW BACKGROUND) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 text-slate-950 shadow-2xl border-2 border-yellow-500 space-y-5 relative overflow-hidden transition-all text-right dir-rtl font-['Vazirmatn',sans-serif]">
        {/* Subtle decorative glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 blur-2xl rounded-full pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-950/15 relative z-10 text-right dir-rtl">
          <div className="flex items-center gap-2 text-slate-950 font-black text-sm text-right">
            <Calculator className="w-5 h-5 text-slate-950 shrink-0" />
            <span className="text-right font-black text-base">خلاصه برآورد ارزش معاملاتی</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-black/10 border border-black/20 text-slate-950 text-xs font-black shrink-0">
            ماده ۶۴ ق.م.م
          </span>
        </div>

        {/* Explicit Addition: Land Value + Building Value = Total */}
        <div className="p-3.5 rounded-xl bg-black/10 border border-black/15 space-y-2 relative z-10 text-right dir-rtl">
          <div className="text-xs font-black text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              ارزش کل عرصه (زمین):
            </span>
            <span className="font-black text-sm text-slate-950 dir-ltr">
              {formatNumberWithCommas(breakdown.land.totalLandValue)} ریال
            </span>
          </div>

          <div className="flex items-center justify-center my-0.5">
            <span className="px-2 py-0.5 rounded-md bg-black/15 text-[11px] font-black text-slate-900 flex items-center gap-1">
              <Plus className="w-3 h-3 text-slate-950" />
              بعلاوه
            </span>
          </div>

          <div className="text-xs font-black text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              ارزش کل اعیانی (ساختمان):
            </span>
            <span className="font-black text-sm text-slate-950 dir-ltr">
              {formatNumberWithCommas(breakdown.building.totalBuildingValue)} ریال
            </span>
          </div>

          {breakdown.governmentHousingDiscount && (
            <div className="text-[11px] font-bold text-amber-950 pt-1 border-t border-black/10 flex justify-between items-center">
              <span>تخفیف ۵۰٪ مسکن حمایتی/مهر:</span>
              <span className="font-black text-red-900 dir-ltr">- ۵۰٪ از کل</span>
            </div>
          )}
        </div>

        {/* Big Grand Total Display */}
        <div className="relative z-10 text-right dir-rtl space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900 block text-right">
              مبلغ نهایی کل ارزش معاملاتی ملک:
            </span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-950 text-amber-400">
              جمع کل نهایی
            </span>
          </div>
          <div className="flex items-baseline justify-start gap-2 flex-wrap text-right dir-rtl">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 text-right">
              {breakdown.formattedGrandTotalRials}
            </span>
          </div>
          <p className="mt-2 text-sm sm:text-base text-slate-900 font-black text-right dir-rtl leading-relaxed bg-black/10 p-2.5 rounded-xl border border-black/15">
            معادل: {formatCurrencyInPersianWords(breakdown.grandTotalValue)}
          </p>
        </div>

        {/* Visual Bar Breakdown */}
        {breakdown.building.hasBuilding && (
          <div className="space-y-2 pt-2 border-t border-slate-950/15 relative z-10">
            <div className="flex justify-between text-xs font-black text-slate-900">
              <span className="flex items-center gap-1.5 text-slate-950">
                <Layers className="w-3.5 h-3.5" />
                سهم عرصه: {toPersianDigits(landPercent)}٪
              </span>
              <span className="flex items-center gap-1.5 text-slate-950">
                <Home className="w-3.5 h-3.5" />
                سهم اعیانی: {toPersianDigits(buildingPercent)}٪
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-black/15 border border-black/20 overflow-hidden flex">
              <div
                className="h-full bg-slate-900 transition-all duration-500"
                style={{ width: `${landPercent}%` }}
                title={`عرصه: ${toPersianDigits(landPercent)}٪`}
              />
              <div
                className="h-full bg-slate-700 transition-all duration-500"
                style={{ width: `${buildingPercent}%` }}
                title={`اعیانی: ${toPersianDigits(buildingPercent)}٪`}
              />
            </div>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg animate-pulse relative z-10">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Save & Export Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 print:hidden relative z-10">
          {user ? (
            <button
              onClick={handleSaveClick}
              disabled={isSaving || saveSuccess}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-950 hover:bg-slate-900 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>در حال ذخیره...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>ذخیره شد در حساب</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>ذخیره در سوابق حساب</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-slate-950 hover:bg-slate-900 text-white transition-colors shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>ورود و ذخیره در دیتابیس</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-white hover:bg-slate-100 text-slate-950 border border-slate-950/20 shadow-md transition-colors cursor-pointer disabled:opacity-50"
            title="دانلود گزارش رسمی فایل PDF"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>ایجاد PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-950" />
                <span>دانلود گزارش PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DETAILED BREAKDOWN & FORMULA TABS */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4 text-xs text-slate-700 dark:text-slate-300 transition-colors text-right dir-rtl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 flex-wrap gap-2 text-right">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <FileSpreadsheet className="w-4 h-4 text-amber-500 shrink-0" />
            <span>جزئیات ضرایب، فرمول‌ها و محاسبات تفکیکی</span>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeViewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>نمای جدول رسمی</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeViewMode === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FunctionSquare className="w-3.5 h-3.5" />
              <span>فرمول‌ها و کارت‌ها</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: COMPREHENSIVE CALCULATION TABLE (جدول تفکیکی ضرایب و محاسبات) */}
        {activeViewMode === 'table' ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-right text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[#16161A] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/10 font-bold">
                    <th className="p-2.5 text-center w-10">ردیف</th>
                    <th className="p-2.5">عنوان ضابطه / پارامتر</th>
                    <th className="p-2.5">مقدار ورودی / شرح ضابطه</th>
                    <th className="p-2.5 text-center">ضریب / نرخ اعمالی</th>
                    <th className="p-2.5 text-left dir-ltr">حاصل مرحله / مبلغ (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {/* SECTION 1: LAND ROWS */}
                  <tr className="bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold">
                    <td colSpan={5} className="p-2.5 text-right font-black">
                      بخش اول: محاسبات ارزش معاملاتی عرصه (زمین)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-mono text-slate-500">۱</td>
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">مساحت عرصه (زمین)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">مساحت کل قطعه زمین</td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {toPersianDigits(breakdown.land.area)} متر مربع
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold text-slate-600 dark:text-slate-400 dir-ltr">-</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-mono text-slate-500">۲</td>
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">ارزش پایه عرصه (P)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">ارزش مصوب دفترچه املاک برای بلوک</td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {formatNumberWithCommas(breakdown.land.basePrice)} ریال/متر
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold text-slate-900 dark:text-white dir-ltr">
                      {formatNumberWithCommas(breakdown.land.basePrice)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-mono text-slate-500">۳</td>
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">ضریب نوع کاربری عرصه</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.land.usageLabel}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                      ضریب {toPersianDigits(breakdown.land.usageCoeff)}
                    </td>
                    <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                      × {toPersianDigits(breakdown.land.usageCoeff)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-mono text-slate-500">۴</td>
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">تعدیل عرض معبر</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.land.streetWidthDetail}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                      ضریب {toPersianDigits(breakdown.land.streetWidthCoeff)}
                    </td>
                    <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                      × {toPersianDigits(breakdown.land.streetWidthCoeff)}
                    </td>
                  </tr>
                  {breakdown.land.specialConditionCoeff !== 1.0 && (
                    <tr>
                      <td className="p-2.5 text-center font-mono text-slate-500">۵</td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">موقعیت و شرایط خاص</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.land.specialConditionDetail}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                        ضریب {toPersianDigits(breakdown.land.specialConditionCoeff)}
                      </td>
                      <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                        × {toPersianDigits(breakdown.land.specialConditionCoeff)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-emerald-500/10 font-bold text-emerald-800 dark:text-emerald-300">
                    <td colSpan={2} className="p-2.5 font-black text-right">
                      جمع ارزش کل عرصه (زمین)
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                      نرخ موثر: {formatNumberWithCommas(Math.round(breakdown.land.effectiveLandPricePerM2))} ریال/مترمربع
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">
                      {toPersianDigits(breakdown.land.area)} متر مربع
                    </td>
                    <td className="p-2.5 text-left font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm dir-ltr">
                      {formatNumberWithCommas(breakdown.land.totalLandValue)} ریال
                    </td>
                  </tr>

                  {/* SECTION 2: BUILDING ROWS (IF APPLICABLE) */}
                  {breakdown.building.hasBuilding ? (
                    <>
                      <tr className="bg-blue-500/10 text-blue-800 dark:text-blue-300 font-bold">
                        <td colSpan={5} className="p-2.5 text-right font-black">
                          بخش دوم: محاسبات ارزش معاملاتی اعیانی (ساختمان)
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono text-slate-500">۶</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">مساحت اعیانی (زیربنا)</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">زیربنای ناخالص اعیانی</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {toPersianDigits(breakdown.building.area)} متر مربع
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-slate-600 dark:text-slate-400 dir-ltr">-</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono text-slate-500">۷</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">نرخ پایه سازه مصوب</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.building.usageLabel}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {formatNumberWithCommas(breakdown.building.basePrice)} ریال/متر
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-slate-900 dark:text-white dir-ltr">
                          {formatNumberWithCommas(breakdown.building.basePrice)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono text-slate-500">۸</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">ضریب تعدیل طبقه</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.building.floorDetail}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          ضریب {toPersianDigits(breakdown.building.floorCoeff)}
                        </td>
                        <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                          × {toPersianDigits(breakdown.building.floorCoeff)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono text-slate-500">۹</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">ضریب استهلاک و قدمت</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.building.ageDetail}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          ضریب {toPersianDigits(breakdown.building.ageDiscountCoeff)}
                        </td>
                        <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                          × {toPersianDigits(breakdown.building.ageDiscountCoeff)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-center font-mono text-slate-500">۱۰</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">ضریب مرحله ساخت</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{breakdown.building.completionDetail}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          ضریب {toPersianDigits(breakdown.building.completionCoeff)}
                        </td>
                        <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                          × {toPersianDigits(breakdown.building.completionCoeff)}
                        </td>
                      </tr>
                      {breakdown.building.distressedDiscountCoeff !== 1.0 && (
                        <tr>
                          <td className="p-2.5 text-center font-mono text-slate-500">۱۱</td>
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">تخفیف بافت فرسوده</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">بند ۷ - تخفیف ۵۰٪ اولین انتقال اعیانی</td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                            ضریب ۰.۵
                          </td>
                          <td className="p-2.5 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">× ۰.۵</td>
                        </tr>
                      )}
                      <tr className="bg-blue-500/10 font-bold text-blue-800 dark:text-blue-300">
                        <td colSpan={2} className="p-2.5 font-black text-right">
                          جمع ارزش کل اعیانی (ساختمان)
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          نرخ موثر: {formatNumberWithCommas(Math.round(breakdown.building.effectiveBuildingPricePerM2))} ریال/مترمربع
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold">
                          {toPersianDigits(breakdown.building.area)} متر مربع
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-blue-600 dark:text-blue-400 text-sm dir-ltr">
                          {formatNumberWithCommas(breakdown.building.totalBuildingValue)} ریال
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="p-2.5 text-center font-mono text-slate-500">-</td>
                      <td className="p-2.5 font-bold text-slate-500">ارزش اعیانی (ساختمان)</td>
                      <td colSpan={2} className="p-2.5 text-slate-400">ملک فاقد اعیانی ثبت شده است</td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-400 dir-ltr">۰ ریال</td>
                    </tr>
                  )}

                  {/* SECTION 3: GRAND TOTAL SUMMARY ROW */}
                  {breakdown.governmentHousingDiscount && (
                    <tr className="bg-amber-500/10 font-bold text-amber-800 dark:text-amber-300">
                      <td colSpan={2} className="p-2.5 font-bold text-right">
                        تخفیف طرح‌های مسکن حمایتی (بند ۸)
                      </td>
                      <td className="p-2.5">اعمال ۵۰٪ تخفیف بر مجموع عرصه و اعیان</td>
                      <td className="p-2.5 text-center font-mono font-bold text-red-600 dark:text-red-400">ضریب ۰.۵</td>
                      <td className="p-2.5 text-left font-mono font-bold text-red-600 dark:text-red-400 dir-ltr">
                        - ۵۰٪
                      </td>
                    </tr>
                  )}

                  <tr className="bg-amber-400/30 dark:bg-amber-500/20 font-black text-slate-950 dark:text-amber-300 text-xs sm:text-sm border-t-2 border-amber-500">
                    <td colSpan={2} className="p-3 font-black text-right">
                      مبلغ نهایی کل ارزش معاملاتی ملک
                    </td>
                    <td className="p-3 font-bold text-[11px] text-slate-800 dark:text-slate-300">
                      جمع عرصه ({formatNumberWithCommas(breakdown.land.totalLandValue)}) + اعیان ({formatNumberWithCommas(breakdown.building.totalBuildingValue)})
                    </td>
                    <td className="p-3 text-center font-bold text-[11px]">
                      {breakdown.formattedGrandTotalTomans}
                    </td>
                    <td className="p-3 text-left font-mono font-black text-amber-700 dark:text-amber-300 text-sm sm:text-base dir-ltr">
                      {formatNumberWithCommas(breakdown.grandTotalValue)} ریال
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VIEW 2: FORMULA & VISUAL CARDS */
          <div className="space-y-4">
            {/* Land Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 space-y-2.5 leading-relaxed text-[11px]">
              <div className="flex justify-between items-center font-bold text-amber-600 dark:text-amber-400 pb-1 border-b border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  ۱. فرمول و ارزش عرصه (زمین)
                </span>
                <span className="font-mono text-slate-900 dark:text-white dir-ltr">
                  {formatNumberWithCommas(breakdown.land.totalLandValue)} ریال
                </span>
              </div>
              <div className="p-2 rounded-lg bg-black/5 dark:bg-black/30 font-mono text-[11px] text-slate-800 dark:text-slate-200 dir-ltr text-left">
                V_عرصه = {toPersianDigits(breakdown.land.area)} × {formatNumberWithCommas(breakdown.land.basePrice)} × {toPersianDigits(breakdown.land.usageCoeff)} × {toPersianDigits(breakdown.land.streetWidthCoeff)} × {toPersianDigits(breakdown.land.specialConditionCoeff)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">قیمت پایه دفترچه:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white dir-ltr">{formatNumberWithCommas(breakdown.land.basePrice)} ریال/متر</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">مساحت عرصه:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white dir-ltr">{toPersianDigits(breakdown.land.area)} متر مربع</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">ضریب کاربری:</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400 dir-ltr">{toPersianDigits(breakdown.land.usageCoeff)} ({breakdown.land.usageLabel})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">تعدیل معبر:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{breakdown.land.streetWidthDetail}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between items-center font-bold text-slate-900 dark:text-white">
                <span>نرخ موثر هر متر عرصه:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 dir-ltr">{formatNumberWithCommas(Math.round(breakdown.land.effectiveLandPricePerM2))} ریال/متر</span>
              </div>
            </div>

            {/* Building Card */}
            {breakdown.building.hasBuilding && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 space-y-2.5 leading-relaxed text-[11px]">
                <div className="flex justify-between items-center font-bold text-blue-600 dark:text-blue-400 pb-1 border-b border-slate-200 dark:border-white/5">
                  <span className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    ۲. فرمول و ارزش اعیانی (ساختمان)
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white dir-ltr">
                    {formatNumberWithCommas(breakdown.building.totalBuildingValue)} ریال
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-black/30 font-mono text-[11px] text-slate-800 dark:text-slate-200 dir-ltr text-left">
                  V_اعیان = {toPersianDigits(breakdown.building.area)} × {formatNumberWithCommas(breakdown.building.basePrice)} × {toPersianDigits(breakdown.building.floorCoeff)} × {toPersianDigits(breakdown.building.ageDiscountCoeff)} × {toPersianDigits(breakdown.building.completionCoeff)} × {toPersianDigits(breakdown.building.distressedDiscountCoeff)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">نرخ پایه سازه مصوب:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white dir-ltr">{formatNumberWithCommas(breakdown.building.basePrice)} ریال/متر</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">مساحت اعیانی:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white dir-ltr">{toPersianDigits(breakdown.building.area)} متر مربع</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">تعدیل طبقه:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{breakdown.building.floorDetail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">تخفیف قدمت:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{breakdown.building.ageDetail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">مرحله ساخت:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{breakdown.building.completionDetail}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between items-center font-bold text-slate-900 dark:text-white">
                  <span>نرخ موثر هر متر اعیانی:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 dir-ltr">{formatNumberWithCommas(Math.round(breakdown.building.effectiveBuildingPricePerM2))} ریال/متر</span>
                </div>
              </div>
            )}

            {/* Special Housing Discount */}
            {breakdown.governmentHousingDiscount && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>۵۰٪ تخفیف طرح مسکن حمایتی/مهر/۹۹ساله (بند ۸)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">۵۰٪ تخفیف بر مجموع کل ارزش عرصه و اعیانی اعمال شد.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
