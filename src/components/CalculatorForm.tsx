import React, { useEffect, useState } from 'react';
import {
  BuildingUsageType,
  CalculationFormData,
  CompletionStageType,
  LandSpecialConditionType,
  LandUsageType,
  StructureType,
  BaseRateItem,
} from '../types.ts';
import {
  LAND_USAGE_COEFFICIENTS,
  LAND_SPECIAL_CONDITIONS,
  COMPLETION_STAGE_COEFFICIENTS,
  BASE_BUILDING_PRICES,
  formatNumberWithCommas,
  formatCurrencyInPersianWords,
  calculateRegionalValue,
  toPersianDigits,
} from '../utils/calculator.ts';
import {
  MapPin,
  Info,
  Layers,
  Home,
  Sparkles,
  Search,
  ChevronDown,
  RotateCcw,
  Building,
  FileText,
  Image as ImageIcon,
  Calculator,
  Equal,
  Plus,
  FunctionSquare,
  AlertCircle,
} from 'lucide-react';
import { SearchableSelect, SelectOption } from './SearchableSelect.tsx';
import { ImageAttachmentUploader } from './ImageAttachmentUploader.tsx';

interface CalculatorFormProps {
  formData: CalculationFormData;
  onChange: (data: Partial<CalculationFormData>) => void;
  onReset: () => void;
  baseRates?: BaseRateItem[];
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({
  formData,
  onChange,
  onReset,
  baseRates = [],
}) => {
  const [selectedProvince, setSelectedProvince] = useState<string>(formData.province || '');
  const [selectedCity, setSelectedCity] = useState<string>(formData.city || '');
  const [selectedBlock, setSelectedBlock] = useState<string>(formData.blockCode || '');
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [matchedAddressFeedback, setMatchedAddressFeedback] = useState<{
    block: string;
    sectionName?: string;
    city?: string;
  } | null>(null);

  // Extract unique provinces ensuring 'گیلان' is always first in the list
  const allProvinces = Array.from(new Set(baseRates.map((r) => r.province)));
  const provincesList = allProvinces.sort((a, b) => {
    if (a === 'گیلان') return -1;
    if (b === 'گیلان') return 1;
    return a.localeCompare(b, 'fa');
  });

  // Cities in selected province
  const citiesInProvince = Array.from(
    new Set(baseRates.filter((r) => r.province === selectedProvince).map((r) => r.city))
  );

  // Rates in selected city & province
  const ratesInCity = baseRates.filter(
    (r) => r.province === selectedProvince && r.city === selectedCity
  );

  // Blocks in selected city
  const blocksInCity = Array.from(
    new Set(ratesInCity.map((r) => r.blockCode).filter(Boolean) as string[])
  );

  // Parts in selected block (or city if no blocks)
  const partsInBlock = ratesInCity.filter((r) => {
    if (selectedBlock && selectedBlock !== 'همه') {
      return r.blockCode === selectedBlock;
    }
    return true;
  });

  // Sync external formData changes
  useEffect(() => {
    if (formData.province && formData.province !== selectedProvince) {
      setSelectedProvince(formData.province);
    }
    if (formData.city && formData.city !== selectedCity) {
      setSelectedCity(formData.city);
    }
    if (formData.blockCode && formData.blockCode !== selectedBlock) {
      setSelectedBlock(formData.blockCode);
    }
  }, [formData.province, formData.city, formData.blockCode]);

  const handleChange = (field: keyof CalculationFormData, value: any) => {
    onChange({ [field]: value });
  };

  const getLandPriceForUsage = (
    usage: LandUsageType,
    baseResidential: number,
    rate?: BaseRateItem
  ): number => {
    if (!baseResidential || baseResidential <= 0) return 0;
    switch (usage) {
      case 'residential':
      case 'residential_commercial_admin':
        return Math.round(baseResidential * 1.0);
      case 'administrative':
        return Math.round(baseResidential * 1.2);
      case 'commercial':
        return rate?.baseLandCommercialValue || Math.round(baseResidential * 1.5);
      case 'services_health_education_tourism':
        return Math.round(baseResidential * 0.7);
      case 'industrial_transport_warehouse':
        return Math.round(baseResidential * 0.6);
      case 'agriculture_irrigated_livestock':
        return Math.round(baseResidential * 0.2);
      case 'agriculture_dry':
        return Math.round(baseResidential * 0.1);
      case 'other':
        return Math.round(baseResidential * 0.2);
      default:
        return Math.round(baseResidential * 1.0);
    }
  };

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedCity('');
    setSelectedBlock('');
    setSelectedRateId('');
    onChange({
      province: province,
      city: '',
      blockCode: undefined,
      partCode: undefined,
      sectionName: undefined,
      baseLandValue: 0,
    });
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedBlock('');
    setSelectedRateId('');
    onChange({
      city: city,
      blockCode: undefined,
      partCode: undefined,
      sectionName: undefined,
      baseLandValue: 0,
    });
  };

  // Auto-select part and section (P rate) when block is chosen
  const handleBlockChange = (block: string) => {
    setSelectedBlock(block);
    
    // Find matching rate items for this block in the chosen city/province
    const matchingParts = baseRates.filter(
      (r) =>
        (!selectedProvince || r.province === selectedProvince) &&
        (!selectedCity || r.city === selectedCity) &&
        r.blockCode === block
    );

    const firstMatch = matchingParts[0] || baseRates.find((r) => r.blockCode === block);

    if (firstMatch) {
      setSelectedRateId(String(firstMatch.id));
      const baseRes = firstMatch.baseLandValue;
      const currentUsage = formData.landUsage || 'residential';
      const newBaseLandValue = getLandPriceForUsage(currentUsage, baseRes, firstMatch);

      onChange({
        blockCode: block,
        partCode: firstMatch.partCode || '1',
        sectionName: firstMatch.sectionName,
        baseLandResidentialValue: baseRes,
        baseLandValue: newBaseLandValue,
        imageUrl: formData.imageUrl || firstMatch.imageUrl,
      });
    } else {
      setSelectedRateId('');
      onChange({
        blockCode: block,
        partCode: undefined,
        sectionName: undefined,
      });
    }
  };

  // Auto-select block & location based on address input
  const handleAddressChange = (addr: string) => {
    handleChange('address', addr);
    if (!addr || addr.trim().length < 2) {
      setMatchedAddressFeedback(null);
      return;
    }

    const cleanInput = addr
      .replace(/[ي]/g, 'ی')
      .replace(/[ك]/g, 'ک')
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .toLowerCase();

    // Check explicit block pattern (e.g. بلوک 20 or بلوک ۲۰)
    const blockMatch = cleanInput.match(/بلوک\s*([0-9]+)/i);
    let matched: BaseRateItem | undefined = undefined;

    if (blockMatch) {
      const bNum = blockMatch[1];
      matched =
        baseRates.find(
          (r) =>
            r.blockCode === bNum &&
            (!selectedProvince || r.province === selectedProvince) &&
            (!selectedCity || r.city === selectedCity)
        ) || baseRates.find((r) => r.blockCode === bNum);
    }

    if (!matched) {
      // Keyword matching across sectionName and address
      const words = cleanInput
        .split(/[\s,،\-–/]+/)
        .filter(
          (w) =>
            w.length >= 3 &&
            !['خیابان', 'میدان', 'بلوار', 'کوچه', 'پلاک', 'بن‌بست', 'شهید', 'روستای', 'سمت', 'ابتدای', 'انتهای'].includes(
              w
            )
        );

      if (words.length > 0) {
        const sortedCandidates = [...baseRates].sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (a.city === selectedCity) scoreA += 5;
          if (b.city === selectedCity) scoreB += 5;
          return scoreB - scoreA;
        });

        for (const candidate of sortedCandidates) {
          const candidateText = `${candidate.sectionName || ''} ${candidate.address || ''} ${candidate.city || ''}`
            .replace(/[ي]/g, 'ی')
            .replace(/[ك]/g, 'ک')
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
            .toLowerCase();

          if (words.some((w) => candidateText.includes(w))) {
            matched = candidate;
            break;
          }
        }
      }
    }

    if (matched) {
      setSelectedProvince(matched.province);
      setSelectedCity(matched.city);
      setSelectedBlock(matched.blockCode);
      setSelectedRateId(String(matched.id));

      const baseRes = matched.baseLandValue;
      const currentUsage = formData.landUsage || 'residential';
      const newBaseLandValue = getLandPriceForUsage(currentUsage, baseRes, matched);

      setMatchedAddressFeedback({
        block: matched.blockCode,
        sectionName: matched.sectionName,
        city: matched.city,
      });

      onChange({
        address: addr,
        province: matched.province,
        city: matched.city,
        blockCode: matched.blockCode,
        partCode: matched.partCode,
        sectionName: matched.sectionName,
        baseLandResidentialValue: baseRes,
        baseLandValue: newBaseLandValue,
        imageUrl: formData.imageUrl || matched.imageUrl,
      });
    }
  };

  // Find currently matched rate from selection or form data
  const matchedRate = React.useMemo(() => {
    if (selectedRateId) {
      const found = baseRates.find((r) => String(r.id) === selectedRateId);
      if (found) return found;
    }
    if (formData.blockCode && formData.city) {
      const found = baseRates.find(
        (r) =>
          r.city === formData.city &&
          r.blockCode === formData.blockCode &&
          (!formData.partCode || r.partCode === formData.partCode)
      );
      if (found) return found;
    }
    return undefined;
  }, [baseRates, selectedRateId, formData.city, formData.blockCode, formData.partCode]);

  // Current effective residential base price (P مسکونی)
  const effectiveBaseResidential = React.useMemo(() => {
    if (formData.baseLandResidentialValue && formData.baseLandResidentialValue > 0) {
      return formData.baseLandResidentialValue;
    }
    if (matchedRate?.baseLandValue) {
      return matchedRate.baseLandValue;
    }
    if (formData.baseLandValue && formData.baseLandValue > 0) {
      const coeff = LAND_USAGE_COEFFICIENTS[formData.landUsage]?.coeff || 1.0;
      return Math.round(formData.baseLandValue / coeff);
    }
    return 0;
  }, [formData.baseLandResidentialValue, matchedRate, formData.baseLandValue, formData.landUsage]);

  const handleLandUsageChange = (newUsage: LandUsageType) => {
    const baseRes = effectiveBaseResidential || matchedRate?.baseLandValue || formData.baseLandValue || 0;
    const newBaseLandVal = getLandPriceForUsage(newUsage, baseRes, matchedRate);
    onChange({
      landUsage: newUsage,
      baseLandResidentialValue: baseRes,
      baseLandValue: newBaseLandVal,
    });
  };

  const handleBaseLandValueChange = (val: number) => {
    const coeff = LAND_USAGE_COEFFICIENTS[formData.landUsage]?.coeff || 1.0;
    const derivedRes = Math.round(val / coeff);
    onChange({
      baseLandValue: val,
      baseLandResidentialValue: derivedRes,
    });
  };

  const handlePartSelect = (rateIdStr: string) => {
    setSelectedRateId(rateIdStr);
    const rateId = parseInt(rateIdStr, 10);
    const matched = baseRates.find((r) => r.id === rateId);
    if (matched) {
      const baseRes = matched.baseLandValue;
      const currentUsage = formData.landUsage || 'residential';
      const newBaseLandValue = getLandPriceForUsage(currentUsage, baseRes, matched);
      onChange({
        province: matched.province,
        city: matched.city,
        blockCode: matched.blockCode,
        partCode: matched.partCode,
        sectionName: matched.sectionName,
        baseLandResidentialValue: baseRes,
        baseLandValue: newBaseLandValue,
        imageUrl: formData.imageUrl || matched.imageUrl,
      });
    }
  };

  const provinceOptions: SelectOption[] = provincesList.map((p) => ({
    value: p,
    label: p + (p === 'گیلان' ? ' ★ (استان اصلی)' : ''),
  }));

  const cityOptions: SelectOption[] = citiesInProvince.map((c) => ({
    value: c,
    label: c,
  }));

  const blockOptions: SelectOption[] = blocksInCity.map((b) => ({
    value: b,
    label: `بلوک ${b}`,
  }));

  const partOptions: SelectOption[] = partsInBlock.map((r) => {
    let label = '';
    if (r.partCode) label += `قسمت ${r.partCode}: `;
    if (r.sectionName) label += r.sectionName;
    else label += r.city;

    return {
      value: String(r.id),
      label: label,
      sublabel: `نرخ پایه عرصه P: ${formatNumberWithCommas(r.baseLandValue)} ریال ${r.address ? `| ${r.address}` : ''}`,
    };
  });

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* SECTION 0: PROPERTY BASIC INFO & STEPWISE PROVINCE/CITY/BLOCK/PART SELECTOR */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-5 transition-colors text-right dir-rtl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="font-black">۱. انتخاب سلسله‌مراتبی استان، شهر، بلوک و قسمت ملک</span>
          </div>

          {baseRates.length > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>دیتابیس ارزش املاک فعال است ({baseRates.length} ردیف)</span>
            </span>
          )}
        </div>

        {/* STEPWISE HIERARCHICAL SELECTOR */}
        <div dir="rtl" className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3 text-right">
          <p dir="rtl" className="text-xs font-bold text-slate-800 dark:text-amber-300 text-right">
            انتخاب موقعیت ملک بر اساس دفترچه ارزش معاملاتی (استان ← شهر ← بلوک دارایی ← قسمت / معبر):
          </p>

          <div dir="rtl" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-right">
            {/* Step 1: Province Selection */}
            <SearchableSelect
              label="۱. استان"
              placeholder="-- انتخاب استان --"
              options={provinceOptions}
              value={selectedProvince}
              onChange={handleProvinceChange}
            />

            {/* Step 2: City Selection */}
            <SearchableSelect
              label="۲. شهر / منطقه"
              placeholder={selectedProvince ? `-- انتخاب شهر --` : '-- ابتدا استان --'}
              options={cityOptions}
              value={selectedCity}
              onChange={handleCityChange}
              disabled={!selectedProvince}
            />

            {/* Step 3: Block Selection */}
            <SearchableSelect
              label="۳. کد بلوک دارایی"
              placeholder={selectedCity ? (blocksInCity.length > 0 ? '-- انتخاب بلوک --' : 'بدون تفکیک بلوک') : '-- ابتدا شهر --'}
              options={blockOptions}
              value={selectedBlock}
              onChange={handleBlockChange}
              disabled={!selectedCity || blocksInCity.length === 0}
              allowCustom={true}
              customPlaceholder="تایپ کد بلوک جدید..."
            />

            {/* Step 4: Part / Street Selection */}
            <SearchableSelect
              label="۴. قسمت و معبر (نرخ P)"
              placeholder={selectedCity ? '-- انتخاب قسمت و معبر --' : '-- ابتدا شهر --'}
              options={partOptions}
              value={selectedRateId}
              onChange={handlePartSelect}
              disabled={!selectedCity}
            />
          </div>

          {/* Active selection summary badge */}
          {formData.sectionName && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300 flex flex-wrap items-center gap-2">
              <span>موقعیت انتخابی:</span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-black/40 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
                {formData.province} - {formData.city}
              </span>
              {formData.blockCode && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                  بلوک {formData.blockCode}
                </span>
              )}
              {formData.partCode && (
                <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-mono">
                  قسمت {formData.partCode}
                </span>
              )}
              <span className="text-slate-800 dark:text-slate-200">
                {formData.sectionName}
              </span>
            </div>
          )}
        </div>

        {/* Property Identifiers & Address Info */}
        <div dir="rtl" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 text-right">
          {/* Address input FIRST (Above Title) to allow instant block & location auto-detection */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label id="property-address-label" dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                  <span>نشانی دقیق ملک (تایپ نام معبر یا بلوک جهت شناسایی خودکار)</span>
                  <span className="text-red-500 font-bold">* (اجباری)</span>
                </span>
                {!formData.address?.trim() && (
                  <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 inline" />
                    <span>تکمیل نشانی الزامی است</span>
                  </span>
                )}
              </div>
            </label>
            <input
              id="property-exact-address-input"
              type="text"
              value={formData.address || ''}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="مثلا: خمام، بلوار امام خمینی، روبروی شهرداری (یا تایپ: بلوک ۲۰)"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white text-right placeholder-slate-400 transition-all outline-none ${
                !formData.address?.trim()
                  ? 'border-red-400 dark:border-red-500/60 bg-red-50/40 dark:bg-red-950/10 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60'
              }`}
            />
            {matchedAddressFeedback && (
              <div className="mt-2 p-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  بر اساس نشانی واردشده، بلوک {matchedAddressFeedback.block} ({matchedAddressFeedback.sectionName || 'معبر مربوطه'} - {matchedAddressFeedback.city}) خودکار شناسایی و انتخاب گردید.
                </span>
              </div>
            )}
            {!formData.address?.trim() && (
              <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                <span>*</span>
                <span>درج نشانی دقیق ملک جهت ثبت پرونده، شناسایی بلوک دارایی و صدور خروجی گزارش الزامی می‌باشد.</span>
              </p>
            )}
          </div>

          <div>
            <label id="property-title-label" dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>عنوان پرونده یا شناسه ملک</span>
                  <span className="text-red-500 font-bold">* (اجباری)</span>
                </span>
                {(!formData.title?.trim() || formData.title.trim().length < 10) && (
                  <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 inline" />
                    <span>حداقل ۱۰ کاراکتر</span>
                  </span>
                )}
              </div>
            </label>
            <input
              id="property-title-input"
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="مثلا: پرونده پلاک ثبتی ۱۲/۴۵ خیابان مطهری"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white text-right placeholder-slate-400 transition-all outline-none ${
                !formData.title?.trim() || formData.title.trim().length < 10
                  ? 'border-red-400 dark:border-red-500/60 bg-red-50/40 dark:bg-red-950/10 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60'
              }`}
            />
            {(!formData.title?.trim() || formData.title.trim().length < 10) && (
              <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>*</span>
                  <span>حداقل ۱۰ کاراکتر جهت عنوان الزامی است.</span>
                </span>
                <span>({toPersianDigits(formData.title?.trim().length || 0)} از ۱۰)</span>
              </p>
            )}
          </div>

          <div>
            <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
              کد بلوک معاملاتی
            </label>
            <input
              type="text"
              value={formData.blockCode || ''}
              onChange={(e) => handleChange('blockCode', e.target.value)}
              placeholder="مثلا: ۱۲ یا ۱۰۵"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
            />
          </div>

          <div>
            <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
              کد قسمت / ردیف در بلوک
            </label>
            <input
              type="text"
              value={formData.partCode || ''}
              onChange={(e) => handleChange('partCode', e.target.value)}
              placeholder="مثلا: ۱ یا ۲"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
            />
          </div>
        </div>

        {/* IMAGE ATTACHMENT SECTION */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <ImageAttachmentUploader
            label="پیوست تصویر نقشه کاداستر، سند مالکیت یا عکس ملک"
            description="فایل تصویری JPG / PNG / WebP با فشرده‌سازی خودکار و بهینه‌سازی حجم"
            value={formData.imageUrl}
            onChange={(url) => handleChange('imageUrl', url)}
          />
        </div>
      </div>

      {/* SECTION 1: LAND CALCULATION (بخش اول: عرصه) */}
      <div dir="rtl" className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-5 transition-colors text-right">
        <div dir="rtl" className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm sm:text-base text-right">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-right font-black">۲. بخش اول: ارزش معاملاتی عرصه (زمین)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              تطبیق کامل با ضوابط قانونی بندهای ۱ تا ۹ دفترچه ماده ۶۴
            </span>
          </div>
        </div>

        {/* STATUTORY RULES SUMMARY BOX (ضوابط قانونی تشخیص کاربری و محاسبات عرصه) */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2 text-right">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>خلاصه ضوابط قانونی تشخیص کاربری و ارزش‌گذاری عرصه:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-amber-500/15">
              <strong className="text-amber-800 dark:text-amber-300">بند ۱-۲ و ۲-۲ (تشخیص کاربری):</strong> کاربری بر اساس سند رسمی یا اسناد مثبته؛ در املاک با کاربری نامشخص تابع کاربری اعیانی و در کاربری مختلط بر مبنای قدرالسهم هریک.
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-amber-500/15">
              <strong className="text-amber-800 dark:text-amber-300">بند ۳ (تعدیل عرض معابر):</strong> مبنا معبر ۲۴ متری؛ به ازای هر متر کسری ۳٪ کسر می‌گردد (سقف ۲۴m و کف ۸m معادل ضریب ۰.۵۲).
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-amber-500/15">
              <strong className="text-amber-800 dark:text-amber-300">بند ۴، ۵ و ۸ (چندبر، میدان، پاساژ):</strong> در املاک دارای ۲ بر یا بیشتر (مشروط به راه عبور)، بر میادین و پاساژها، بالاترین ارزش معبر منشعب ملاک است.
            </div>
            <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-amber-500/15">
              <strong className="text-amber-800 dark:text-amber-300">بند ۶، ۷ و ۹ (حق عبور، بزرگراه، حریم):</strong> فاقد راه عبور مستقل = ۶۰٪ معبر منشعب | حریم راه‌آهن/اتوبان = معبر مورد استفاده | حریم قانونی فاقد ارزش = ۷۰٪ نزدیک‌ترین محل.
            </div>
          </div>
        </div>

        {/* 1.1 QUICK USAGE SELECTOR & DIFFERENTIATION (تفکیک مسکونی، اداری و تجاری با بازنشانی آنی نرخ P) */}
        <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-[#141418] border border-slate-200 dark:border-white/10 text-right">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>نوع کاربری عرصه (طبق بند ۱-۲ و ۲-۲ ضوابط):</span>
            </label>
            {effectiveBaseResidential > 0 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                مبنای مسکونی بلوک (P): <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatNumberWithCommas(effectiveBaseResidential)} ریال</strong>
              </span>
            )}
          </div>

          {/* 3 Main Interactive Cards for Residential, Administrative, Commercial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Residential */}
            {(() => {
              const resVal = getLandPriceForUsage('residential', effectiveBaseResidential, matchedRate);
              const isSelected = formData.landUsage === 'residential' || formData.landUsage === 'residential_commercial_admin';
              return (
                <button
                  type="button"
                  onClick={() => handleLandUsageChange('residential')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-slate-950 dark:text-white shadow-md ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-[#1A1A20] border-slate-200 dark:border-white/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs sm:text-sm flex items-center gap-1">
                      <span>🏠 مسکونی</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      ضریب ۱.۰
                    </span>
                  </div>
                  <div className="mt-1 text-left dir-ltr">
                    <div className="font-black text-sm sm:text-base font-mono text-slate-900 dark:text-white">
                      {formatNumberWithCommas(resVal)} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">ریال</span>
                    </div>
                    {resVal > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        {formatNumberWithCommas(Math.floor(resVal / 10))} تومان / m²
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* Administrative */}
            {(() => {
              const adminVal = getLandPriceForUsage('administrative', effectiveBaseResidential, matchedRate);
              const isSelected = formData.landUsage === 'administrative';
              return (
                <button
                  type="button"
                  onClick={() => handleLandUsageChange('administrative')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-slate-950 dark:text-white shadow-md ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-[#1A1A20] border-slate-200 dark:border-white/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs sm:text-sm flex items-center gap-1">
                      <span>🏢 اداری</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-800 dark:text-blue-300">
                      ضریب ۱.۲ (۱۲۰٪)
                    </span>
                  </div>
                  <div className="mt-1 text-left dir-ltr">
                    <div className="font-black text-sm sm:text-base font-mono text-slate-900 dark:text-white">
                      {formatNumberWithCommas(adminVal)} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">ریال</span>
                    </div>
                    {adminVal > 0 && (
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        {formatNumberWithCommas(Math.floor(adminVal / 10))} تومان / m²
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* Commercial */}
            {(() => {
              const commVal = getLandPriceForUsage('commercial', effectiveBaseResidential, matchedRate);
              const isSelected = formData.landUsage === 'commercial';
              return (
                <button
                  type="button"
                  onClick={() => handleLandUsageChange('commercial')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-slate-950 dark:text-white shadow-md ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-[#1A1A20] border-slate-200 dark:border-white/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs sm:text-sm flex items-center gap-1">
                      <span>🏬 تجاری</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      ضریب ۱.۵ (۱۵۰٪)
                    </span>
                  </div>
                  <div className="mt-1 text-left dir-ltr">
                    <div className="font-black text-sm sm:text-base font-mono text-slate-900 dark:text-white">
                      {formatNumberWithCommas(commVal)} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">ریال</span>
                    </div>
                    {commVal > 0 && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatNumberWithCommas(Math.floor(commVal / 10))} تومان / m²
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}
          </div>

          {/* Full Usage Dropdown for Other Categories */}
          <div className="pt-2">
            <label dir="rtl" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 text-right">
              یا انتخاب از فهرست کلیه کاربری‌های قانونی دفترچه ماده ۶۴:
            </label>
            <select
              dir="rtl"
              value={formData.landUsage}
              onChange={(e) => handleLandUsageChange(e.target.value as LandUsageType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181C] text-xs sm:text-sm text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
            >
              {Object.entries(LAND_USAGE_COEFFICIENTS)
                .filter(([key]) => key !== 'residential_commercial_admin')
                .map(([key, item]) => (
                  <option key={key} value={key} className="bg-white dark:bg-[#16161A] text-slate-900 dark:text-white text-right">
                    {item.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 1.2 BASE LAND VALUE INPUT & AREA */}
        <div dir="rtl" className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
          {/* Base Land Price P */}
          <div>
            <div className="flex items-center justify-between mb-1.5 dir-rtl">
              <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                ارزش پایه روز/معاملاتی عرصه بلوک P (ریال/مترمربع) <span className="text-amber-500">*</span>
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                متناسب با {LAND_USAGE_COEFFICIENTS[formData.landUsage]?.shortLabel || 'کاربری انتخابی'}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="50000"
                min="0"
                value={formData.baseLandValue || ''}
                onChange={(e) => handleBaseLandValueChange(parseFloat(e.target.value) || 0)}
                placeholder="وارد کنید..."
                className="w-full pr-3.5 pl-16 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none text-right"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">ریال</span>
            </div>
            {formData.baseLandValue > 0 && (
              <div className="mt-1.5 space-y-0.5 text-right">
                <p className="text-[11.5px] text-amber-700 dark:text-amber-300 font-bold dir-rtl">
                  معادل {formatNumberWithCommas(Math.floor(formData.baseLandValue / 10))} تومان بر متر مربع
                </p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                  {formatCurrencyInPersianWords(formData.baseLandValue)}
                </p>
              </div>
            )}
          </div>

          {/* Land Area */}
          <div>
            <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
              مساحت عرصه (متر مربع) <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={formData.landArea || ''}
                onChange={(e) => handleChange('landArea', parseFloat(e.target.value) || 0)}
                placeholder="وارد کنید..."
                className="w-full pr-3.5 pl-20 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none text-right"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">مترمربع</span>
            </div>
          </div>

          {/* Street Width */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label id="street-width-label" dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                عرض معبر اصلی (متر - بند ۳ بخش اول) <span className="text-amber-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">حداقل: ۸m | مبنا: ۲۴m</span>
            </div>
            <div className="relative">
              <input
                id="street-width-input"
                type="number"
                min="8"
                step="0.5"
                value={formData.streetWidth !== undefined ? formData.streetWidth : 24}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleChange('streetWidth', isNaN(val) ? 8 : val);
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (isNaN(val) || val < 8) {
                    handleChange('streetWidth', 8);
                  }
                }}
                placeholder="۲۴"
                className={`w-full pr-3.5 pl-16 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white font-mono transition-all outline-none text-right ${
                  formData.streetWidth !== undefined && formData.streetWidth < 8
                    ? 'border-red-500 bg-red-50/40 dark:bg-red-950/10 focus:ring-2 focus:ring-red-500/20'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60'
                }`}
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">متر</span>
            </div>

            {/* Warning if width is less than 8 meters */}
            {formData.streetWidth !== undefined && formData.streetWidth < 8 && (
              <div className="mt-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>حداقل عرض معبر طبق بند ۳ بخش اول دفترچه ۸ متر است (مبنای محاسبه حداقل ۸ متر در نظر گرفته می‌شود).</span>
              </div>
            )}

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400">انتخاب سریع:</span>
              {[
                { label: '۸ متر (کف)', val: 8 },
                { label: '۱۰ متر', val: 10 },
                { label: '۱۲ متر', val: 12 },
                { label: '۱۶ متر', val: 16 },
                { label: '۲۰ متر', val: 20 },
                { label: '۲۴ متر (پایه)', val: 24 },
                { label: '۳۰ متر', val: 30 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleChange('streetWidth', preset.val)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                    formData.streetWidth === preset.val
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-right">
              به ازای هر متر کسری نسبت به ۲۴ متر، ۳٪ کسر می‌گردد (کف محاسبه معبر ۸ متر برابر ضریب ۰.۵۲).
            </p>
          </div>

          {/* Land Special Condition */}
          <div>
            <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
              موقعیت و شرایط خاص عرصه (بند ۴ الی ۹ ضوابط ماده ۶۴)
            </label>
            <select
              dir="rtl"
              value={formData.landSpecialCondition}
              onChange={(e) => handleChange('landSpecialCondition', e.target.value as LandSpecialConditionType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
            >
              {Object.entries(LAND_SPECIAL_CONDITIONS).map(([key, item]) => (
                <option key={key} value={key} className="bg-white dark:bg-[#16161A] text-slate-900 dark:text-white text-right">
                  {item.label}
                </option>
              ))}
            </select>

            {formData.landSpecialCondition && formData.landSpecialCondition !== 'none' && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed text-right space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>ضابطه قانونی ({LAND_SPECIAL_CONDITIONS[formData.landSpecialCondition]?.clause}):</span>
                  {LAND_SPECIAL_CONDITIONS[formData.landSpecialCondition]?.coeff !== 1.0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 font-mono font-bold">
                      ضریب: {LAND_SPECIAL_CONDITIONS[formData.landSpecialCondition]?.coeff}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-normal">
                  {LAND_SPECIAL_CONDITIONS[formData.landSpecialCondition]?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: BUILDING CALCULATION (بخش دوم: اعیانی) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-5 transition-colors text-right dir-rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3 text-right">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <span>۳. بخش دوم: ارزش معاملاتی اعیانی (ساختمان)</span>
          </div>

          {/* Clean Single Switch Button (No duplicate native input circle) */}
          <button
            type="button"
            role="switch"
            aria-checked={formData.hasBuilding}
            onClick={() => handleChange('hasBuilding', !formData.hasBuilding)}
            className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none self-start sm:self-auto ${
              formData.hasBuilding
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="text-xs font-bold">
              {formData.hasBuilding ? 'ملک دارای اعیانی است (فعال)' : 'ملک فاقد اعیانی است (غیرفعال)'}
            </span>
            <div
              dir="ltr"
              className={`w-10 h-5.5 rounded-full transition-colors flex items-center p-0.5 ${
                formData.hasBuilding ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-white/20 justify-start'
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform" />
            </div>
          </button>
        </div>

        {formData.hasBuilding ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-right">
            {/* Building Area */}
            <div>
              <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                مساحت اعیانی (متر مربع) <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={formData.buildingArea || ''}
                  onChange={(e) => handleChange('buildingArea', parseFloat(e.target.value) || 0)}
                  placeholder="وارد کنید..."
                  className="w-full pr-3.5 pl-20 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none text-right"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">مترمربع</span>
              </div>
            </div>

            {/* Structure Type */}
            <div>
              <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                نوع سازه ساختمان (جدول نرخ مصوب)
              </label>
              <select
                dir="rtl"
                value={formData.structureType}
                onChange={(e) => handleChange('structureType', e.target.value as StructureType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
              >
                <option value="concrete_steel" className="bg-white dark:bg-[#16161A] text-slate-900 dark:text-white text-right">تمام بتونی، اسکلت بتونی و فلزی، سوله</option>
                <option value="other" className="bg-white dark:bg-[#16161A] text-slate-900 dark:text-white text-right">سایر سازه‌ها (آجری، مصالح بنایی و...)</option>
              </select>
            </div>

            {/* Building Usage Selection with Interactive Cards & Dynamic Base Values */}
            <div className="md:col-span-2 lg:col-span-3 space-y-2.5">
              <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                نوع کاربردی اعیانی و نرخ پایه مصوب هر مترمربع (جدول شیت ۳ دفترچه)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    id: 'residential_admin' as BuildingUsageType,
                    title: '🏢 مسکونی و اداری',
                    concrete: 24_000_000,
                    other: 8_000_000,
                    desc: 'واحدهای مسکونی، آپارتمان‌ها و دفاتر کار',
                  },
                  {
                    id: 'commercial' as BuildingUsageType,
                    title: '🏬 تجاری',
                    concrete: 28_500_000,
                    other: 17_200_000,
                    desc: 'مغازه‌ها، پاساژها و مجتمع‌های تجاری',
                  },
                  {
                    id: 'industrial_services_health' as BuildingUsageType,
                    title: '🏭 صنعتی و خدماتی',
                    concrete: 15_400_000,
                    other: 6_300_000,
                    desc: 'کارگاه‌ها، مراکز آموزشی، درمانی و ورزشی',
                  },
                  {
                    id: 'agriculture_livestock' as BuildingUsageType,
                    title: '🌾 کشاورزی و دامداری',
                    concrete: 6_800_000,
                    other: 3_400_000,
                    desc: 'سوله دامداری، پرورش طیور و گلخانه‌ها',
                  },
                ].map((u) => {
                  const isSelected = (formData.buildingUsage || 'residential_admin') === u.id;
                  const activePrice = formData.structureType === 'other' ? u.other : u.concrete;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleChange('buildingUsage', u.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-right flex flex-col justify-between select-none ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/5 ring-2 ring-amber-500/30'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {u.title}
                          </span>
                          {isSelected ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                          {u.desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 space-y-1 font-mono text-[11px]">
                        <div className={`flex items-center justify-between ${formData.structureType === 'concrete_steel' ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded' : 'text-slate-600 dark:text-slate-400'}`}>
                          <span className="text-[10px] font-sans">اسکلت بتنی/فلزی:</span>
                          <span>{formatNumberWithCommas(u.concrete)} ریال</span>
                        </div>
                        <div className={`flex items-center justify-between ${formData.structureType === 'other' ? 'font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded' : 'text-slate-600 dark:text-slate-400'}`}>
                          <span className="text-[10px] font-sans">سایر سازه‌ها:</span>
                          <span>{formatNumberWithCommas(u.other)} ریال</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Base Building Price Live Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    ارزش پایه اعیانی انتخابی:
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatNumberWithCommas(
                      BASE_BUILDING_PRICES[formData.structureType || 'concrete_steel']?.[
                        formData.buildingUsage || 'residential_admin'
                      ]?.priceRials || 24_000_000
                    )}{' '}
                    ریال
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    (
                    {formatNumberWithCommas(
                      Math.round(
                        (BASE_BUILDING_PRICES[formData.structureType || 'concrete_steel']?.[
                          formData.buildingUsage || 'residential_admin'
                        ]?.priceRials || 24_000_000) / 10
                      )
                    )}{' '}
                    تومان) بر مترمربع
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {formatCurrencyInPersianWords(
                    BASE_BUILDING_PRICES[formData.structureType || 'concrete_steel']?.[
                      formData.buildingUsage || 'residential_admin'
                    ]?.priceRials || 24_000_000
                  )}{' '}
                  به ازای هر مترمربع
                </span>
              </div>
            </div>

            {/* Floor Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                  شماره طبقه (تعدیل طبقات)
                </label>
                <span className="text-[10px] text-slate-400">۰ = همکف</span>
              </div>
              <input
                type="number"
                value={formData.floorNumber || ''}
                onChange={(e) => handleChange('floorNumber', parseInt(e.target.value, 10) || 0)}
                placeholder="۰ برای همکف، ۱، ۲..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 text-right">
                {formData.buildingUsage === 'commercial'
                  ? 'تجاری: بالاتر/پایین‌تر از همکف ۱۰٪ کسری به ازای هر طبقه (حداکثر ۳۰٪)'
                  : 'مسکونی: بالاتر از ۵ طبقه ۱.۵٪ افزایش به ازای هر طبقه'}
              </p>
            </div>

            {/* Building Age */}
            <div>
              <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                قدمت ساختمان (سال)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.buildingAge || ''}
                onChange={(e) => handleChange('buildingAge', parseInt(e.target.value, 10) || 0)}
                placeholder="۰"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 text-right">
                ۲٪ تخفیف به ازای هر سال قدمت (تا سقف ۲۰ سال = حداکثر ۴۰٪ تخفیف)
              </p>
            </div>

            {/* Completion Stage */}
            <div>
              <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                وضعیت و مرحله ساخت (بخش سوم)
              </label>
              <select
                dir="rtl"
                value={formData.completionStage}
                onChange={(e) => handleChange('completionStage', e.target.value as CompletionStageType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none"
              >
                {Object.entries(COMPLETION_STAGE_COEFFICIENTS).map(([key, item]) => (
                  <option key={key} value={key} className="bg-white dark:bg-[#16161A] text-slate-900 dark:text-white text-right">
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkboxes for special discounts */}
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-white/10 text-right">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 cursor-pointer hover:border-amber-500/50 transition-colors text-right dir-rtl">
                <input
                  type="checkbox"
                  checked={formData.isDistressedArea}
                  onChange={(e) => handleChange('isDistressedArea', e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block text-right">
                    واقع در بافت فرسوده (بند ۷)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 text-right">
                    برای ساختمان‌های مسکونی با قدمت بالای ۳ سال (۵۰٪ تخفیف اعیانی در اولین انتقال)
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 cursor-pointer hover:border-amber-500/50 transition-colors text-right dir-rtl">
                <input
                  type="checkbox"
                  checked={formData.isGovernmentHousing}
                  onChange={(e) => handleChange('isGovernmentHousing', e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block text-right">
                    طرح‌های حمایتی مسکن / مسکن مهر / ۹۹ ساله (بند ۸)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 text-right">
                    ۵۰٪ تخفیف در مجموع ارزش کل عرصه و اعیانی در اولین انتقال
                  </span>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 text-right">
            <Info className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              عرصه فاقد اعیانی انتخاب شده است. ارزش کلی ملک صرفاً بر اساس مساحت و ضوابط عرصه محاسبه خواهد شد.
            </span>
          </div>
        )}
      </div>

      {/* SECTION 4: FORMULAS AND MATHEMATICAL SUM (عرصه + اعیان) */}
      {(() => {
        const liveBreakdown = calculateRegionalValue(formData);
        return (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-100 dark:bg-[#16161A] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xl space-y-4 text-right dir-rtl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base text-slate-900 dark:text-white">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <FunctionSquare className="w-4 h-4" />
                </div>
                <span>۴. فرمول‌های محاسباتی و جمع تفکیکی عرصه و اعیان</span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-bold">
                محاسبه بلادرنگ (Live)
              </span>
            </div>

            {/* Formula 1: Land Formula */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>فرمول ارزش عرصه (زمین):</span>
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatNumberWithCommas(liveBreakdown.land.totalLandValue)} ریال
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 font-mono text-[11px] text-slate-700 dark:text-slate-300 dir-ltr text-left overflow-x-auto leading-relaxed">
                <span className="text-amber-600 dark:text-amber-400 font-bold">V_عرصه</span> = مساحت ({toPersianDigits(formData.landArea || 0)} متر مربع) × ارزش پایه P ({formatNumberWithCommas(formData.baseLandValue || 0)} ریال) × ضریب کاربری ({toPersianDigits(liveBreakdown.land.usageCoeff)}) × ضریب معبر ({toPersianDigits(liveBreakdown.land.streetWidthCoeff)}) × ضریب شرایط خاص ({toPersianDigits(liveBreakdown.land.specialConditionCoeff)})
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>نرخ موثر هر مترمربع عرصه:</span>
                <span className="font-mono text-slate-800 dark:text-white font-bold">{formatNumberWithCommas(Math.round(liveBreakdown.land.effectiveLandPricePerM2))} ریال</span>
              </div>
            </div>

            {/* Formula 2: Building Formula (If has building) */}
            {formData.hasBuilding && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Home className="w-3.5 h-3.5" />
                    <span>فرمول ارزش اعیانی (ساختمان):</span>
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {formatNumberWithCommas(liveBreakdown.building.totalBuildingValue)} ریال
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 font-mono text-[11px] text-slate-700 dark:text-slate-300 dir-ltr text-left overflow-x-auto leading-relaxed">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">V_اعیان</span> = زیربنا ({toPersianDigits(formData.buildingArea || 0)} متر مربع) × نرخ پایه سازه ({formatNumberWithCommas(liveBreakdown.building.basePrice)} ریال) × ضریب طبقه ({toPersianDigits(liveBreakdown.building.floorCoeff)}) × ضریب استهلاک/قدمت ({toPersianDigits(liveBreakdown.building.ageDiscountCoeff)}) × ضریب مرحله ساخت ({toPersianDigits(liveBreakdown.building.completionCoeff)}){formData.isDistressedArea ? ` × ضریب بافت فرسوده (${toPersianDigits(liveBreakdown.building.distressedDiscountCoeff)})` : ''}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>نرخ موثر هر مترمربع اعیانی:</span>
                  <span className="font-mono text-slate-800 dark:text-white font-bold">{formatNumberWithCommas(Math.round(liveBreakdown.building.effectiveBuildingPricePerM2))} ریال</span>
                </div>
              </div>
            )}

            {/* Formula 3: Grand Total Sum of Land + Building */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                جمع کل مبلغ نهایی ارزش معاملاتی ملک (عرصه + اعیان):
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-black font-mono">
                <span className="p-2 rounded-lg bg-white dark:bg-black/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm">
                  عرصه: {formatNumberWithCommas(liveBreakdown.land.totalLandValue)} ریال
                </span>
                <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="p-2 rounded-lg bg-white dark:bg-black/50 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-sm">
                  اعیانی: {formatNumberWithCommas(liveBreakdown.building.totalBuildingValue)} ریال
                </span>
                <Equal className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="p-2 rounded-lg bg-amber-500 text-slate-950 font-black shadow-md">
                  مبلغ کل: {formatNumberWithCommas(liveBreakdown.grandTotalValue)} ریال
                </span>
              </div>
              {liveBreakdown.governmentHousingDiscount && (
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                  * ۵۰٪ تخفیف طرح‌های حمایتی مسکن بر مجموع عرصه و اعیان اعمال گردید.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Red Reset Button */}
      <div className="flex items-center justify-end pt-2 text-right">
        <button
          type="button"
          onClick={onReset}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 border border-red-500 shadow-md shadow-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>پاک کردن و بازنشانی فرم</span>
        </button>
      </div>
    </div>
  );
};
