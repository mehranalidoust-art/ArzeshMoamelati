import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  ShieldCheck,
  Scale,
  MapPin,
  Sparkles,
  Building2,
  Building,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  COMPLETION_STAGE_COEFFICIENTS,
  LAND_USAGE_COEFFICIENTS,
  LAND_SPECIAL_CONDITIONS,
  formatNumberWithCommas,
  toPersianDigits,
} from '../utils/calculator.ts';
import { BaseRateItem } from '../types.ts';
import { DEFAULT_FALLBACK_RATES } from '../data/defaultBaseRates.ts';
import { SearchableSelect, SelectOption } from './SearchableSelect.tsx';

interface RegulationGuideProps {
  baseRates?: BaseRateItem[];
}

export const RegulationGuide: React.FC<RegulationGuideProps> = ({
  baseRates = DEFAULT_FALLBACK_RATES,
}) => {
  // Available rate list (use fallback if empty)
  const effectiveRates = baseRates && baseRates.length > 0 ? baseRates : DEFAULT_FALLBACK_RATES;

  // Selected Location State
  const [selectedProvince, setSelectedProvince] = useState<string>('گیلان');
  const [selectedCity, setSelectedCity] = useState<string>('خشکبیجار');
  const [selectedBlock, setSelectedBlock] = useState<string>('1');
  const [selectedRateId, setSelectedRateId] = useState<string>('101');

  // Interactive Live Trial State for Building Simulation
  const [testStructure, setTestStructure] = useState<'concrete_steel' | 'other'>('concrete_steel');
  const [testUsage, setTestUsage] = useState<'residential_admin' | 'commercial' | 'industrial_services_health' | 'agriculture_livestock'>('residential_admin');
  const [testFloor, setTestFloor] = useState<number>(0);
  const [testAge, setTestAge] = useState<number>(0);
  const [testStage, setTestStage] = useState<'completed' | 'finishing' | 'rough' | 'frame' | 'foundation'>('completed');

  // Extract unique provinces ensuring 'گیلان' is always first
  const allProvinces = useMemo(() => {
    const set = new Set(effectiveRates.map((r) => r.province));
    return Array.from(set).sort((a, b) => {
      if (a === 'گیلان') return -1;
      if (b === 'گیلان') return 1;
      return a.localeCompare(b, 'fa');
    });
  }, [effectiveRates]);

  // Cities in selected province
  const citiesInProvince = useMemo(() => {
    const set = new Set(
      effectiveRates.filter((r) => r.province === selectedProvince).map((r) => r.city)
    );
    return Array.from(set);
  }, [effectiveRates, selectedProvince]);

  // Rates in selected city & province
  const ratesInCity = useMemo(() => {
    return effectiveRates.filter(
      (r) => r.province === selectedProvince && r.city === selectedCity
    );
  }, [effectiveRates, selectedProvince, selectedCity]);

  // Blocks in selected city
  const blocksInCity = useMemo(() => {
    const set = new Set(ratesInCity.map((r) => r.blockCode).filter(Boolean) as string[]);
    return Array.from(set);
  }, [ratesInCity]);

  // Parts in selected block
  const partsInBlock = useMemo(() => {
    return ratesInCity.filter((r) => {
      if (selectedBlock && selectedBlock !== 'همه') {
        return r.blockCode === selectedBlock;
      }
      return true;
    });
  }, [ratesInCity, selectedBlock]);

  // Currently Active Matched Rate
  const currentRate = useMemo(() => {
    if (selectedRateId) {
      const found = effectiveRates.find((r) => String(r.id) === selectedRateId);
      if (found) return found;
    }
    if (partsInBlock.length > 0) return partsInBlock[0];
    if (ratesInCity.length > 0) return ratesInCity[0];
    return effectiveRates[0];
  }, [effectiveRates, selectedRateId, partsInBlock, ratesInCity]);

  // Handlers for Location Selector
  const handleProvinceChange = (prov: string) => {
    setSelectedProvince(prov);
    const cities = Array.from(
      new Set(effectiveRates.filter((r) => r.province === prov).map((r) => r.city))
    );
    const defaultCity = cities[0] || '';
    setSelectedCity(defaultCity);

    const cityRates = effectiveRates.filter((r) => r.province === prov && r.city === defaultCity);
    const blocks = Array.from(new Set(cityRates.map((r) => r.blockCode).filter(Boolean) as string[]));
    const defaultBlock = blocks[0] || '';
    setSelectedBlock(defaultBlock);

    const matched = cityRates.find((r) => !defaultBlock || r.blockCode === defaultBlock) || cityRates[0];
    setSelectedRateId(matched ? String(matched.id) : '');
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const cityRates = effectiveRates.filter((r) => r.province === selectedProvince && r.city === city);
    const blocks = Array.from(new Set(cityRates.map((r) => r.blockCode).filter(Boolean) as string[]));
    const defaultBlock = blocks[0] || '';
    setSelectedBlock(defaultBlock);

    const matched = cityRates.find((r) => !defaultBlock || r.blockCode === defaultBlock) || cityRates[0];
    setSelectedRateId(matched ? String(matched.id) : '');
  };

  const handleBlockChange = (block: string) => {
    setSelectedBlock(block);
    const matched = ratesInCity.find((r) => r.blockCode === block) || effectiveRates.find((r) => r.province === selectedProvince && r.city === selectedCity && r.blockCode === block) || effectiveRates.find((r) => r.blockCode === block);
    if (matched) {
      setSelectedRateId(String(matched.id));
    }
  };

  const handlePartSelect = (rateIdStr: string) => {
    setSelectedRateId(rateIdStr);
    const matched = effectiveRates.find((r) => String(r.id) === rateIdStr);
    if (matched) {
      setSelectedProvince(matched.province);
      setSelectedCity(matched.city);
      setSelectedBlock(matched.blockCode);
    }
  };

  const selectPresetCity = (prov: string, city: string, block: string, rateId?: number) => {
    setSelectedProvince(prov);
    setSelectedCity(city);
    setSelectedBlock(block);
    if (rateId) {
      setSelectedRateId(String(rateId));
    } else {
      const matched = effectiveRates.find((r) => r.province === prov && r.city === city && r.blockCode === block);
      if (matched) setSelectedRateId(String(matched.id));
    }
  };

  // Base building rates for the selected city/block
  const baseConcrete = currentRate?.baseBuildingConcrete || 24_000_000;
  const baseOther = currentRate?.baseBuildingOther || 8_000_000;
  const baseLand = currentRate?.baseLandValue || 12_000_000;
  const baseLandCommercial = currentRate?.baseLandCommercialValue || Math.round(baseLand * 1.5);

  // Dynamic Building Rates Matrix per Square Meter (Rials) for Selected City
  const buildingRatesMatrix = {
    commercial: {
      concrete: Math.round((baseConcrete * 28.5) / 24),
      other: Math.round((baseOther * 17.2) / 8.0),
      label: 'تجاری',
      desc: 'واحدهای کسب و پیشه، مغازه‌ها و اماکن تجاری',
    },
    residential_admin: {
      concrete: baseConcrete,
      other: baseOther,
      label: 'مسکونی و اداری',
      desc: 'واحدهای مسکونی، آپارتمان‌ها و دفاتر کار اداری',
    },
    industrial_services_health: {
      concrete: Math.round((baseConcrete * 15.4) / 24),
      other: Math.round((baseOther * 6.3) / 8.0),
      label: 'صنعتی، کارگاهی، خدماتی، بهداشتی، ورزشی، انبار',
      desc: 'مراکز آموزشی، درمانی، انبارها، پایانه‌ها و سوله‌های کارگاهی',
    },
    agriculture_livestock: {
      concrete: Math.round((baseConcrete * 6.8) / 24),
      other: Math.round((baseOther * 3.4) / 8.0),
      label: 'کشاورزی، دامداری، طیور، گلخانه',
      desc: 'تاسیسات پرورش قارچ، دامپروری، گل و گیاه و شیلات',
    },
  };

  // Quick Live Simulator Calculation
  const selectedBasePrice =
    testStructure === 'concrete_steel'
      ? buildingRatesMatrix[testUsage].concrete
      : buildingRatesMatrix[testUsage].other;

  let simulatedFloorCoeff = 1.0;
  if (testUsage === 'commercial') {
    const offset = Math.abs(testFloor);
    const reduction = Math.min(30, offset * 10);
    simulatedFloorCoeff = (100 - reduction) / 100;
  } else {
    if (testFloor > 5) {
      simulatedFloorCoeff = 1.0 + (testFloor - 5) * 0.015;
    }
  }

  const ageDiscount = Math.min(40, testAge * 2);
  const simulatedAgeCoeff = (100 - ageDiscount) / 100;
  const simulatedStageCoeff = COMPLETION_STAGE_COEFFICIENTS[testStage]?.coeff || 1.0;

  const simulatedFinalPrice = Math.round(
    selectedBasePrice * simulatedFloorCoeff * simulatedAgeCoeff * simulatedStageCoeff
  );

  const provinceOptions: SelectOption[] = allProvinces.map((p) => ({
    value: p,
    label: p + (p === 'گیلان' ? ' ★ (استان پیش‌فرض)' : ''),
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
      sublabel: `نرخ پایه عرصه: ${formatNumberWithCommas(r.baseLandValue)} ریال | اسکلت بتنی: ${formatNumberWithCommas(r.baseBuildingConcrete || 24000000)} ریال`,
    };
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto dir-rtl text-right font-['Vazirmatn',sans-serif]">
      {/* 1. MAIN TITLE & INTRO */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-2 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              ضوابط اجرایی تعیین ارزش معاملاتی املاک (ماده ۶۴ قانون مالیات‌های مستقیم)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              استعلام زنده ضرایب قانونی، فرمول‌ها و جدول نرخ‌های مصوب ارزش معاملاتی عرصه و اعیانی به تفکیک استان، شهر و بلوک
            </p>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC LOCATION SELECTOR AT THE TOP OF THE GUIDE */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/30 shadow-xl space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                انتخاب استان، شهر و بلوک جهت استعلام نرخ‌های مصوب اعیانی و عرصه
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                با تغییر موقعیت، کلیه مقادیر، ارقام و جداول ذیل بر اساس مصوبه کمیسیون تقویم املاک همان منطقه به‌روزرسانی می‌شوند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>محاسبه پویا بر اساس مصوبه کمیسیون تقویم املاک</span>
          </div>
        </div>

        {/* Cascading 4-Column Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <SearchableSelect
            label="۱. استان"
            placeholder="-- انتخاب استان --"
            options={provinceOptions}
            value={selectedProvince}
            onChange={handleProvinceChange}
          />

          <SearchableSelect
            label="۲. شهر / منطقه"
            placeholder={selectedProvince ? '-- انتخاب شهر --' : '-- ابتدا استان --'}
            options={cityOptions}
            value={selectedCity}
            onChange={handleCityChange}
            disabled={!selectedProvince}
          />

          <SearchableSelect
            label="۳. کد بلوک دارایی"
            placeholder={selectedCity ? (blocksInCity.length > 0 ? '-- انتخاب بلوک --' : 'بدون تفکیک بلوک') : '-- ابتدا شهر --'}
            options={blockOptions}
            value={selectedBlock}
            onChange={handleBlockChange}
            disabled={!selectedCity || blocksInCity.length === 0}
            allowCustom={true}
          />

          <SearchableSelect
            label="۴. قسمت و معبر"
            placeholder={selectedCity ? '-- انتخاب قسمت و معبر --' : '-- ابتدا شهر --'}
            options={partOptions}
            value={selectedRateId}
            onChange={handlePartSelect}
            disabled={!selectedCity}
          />
        </div>

        {/* Quick Location Preset Badges */}
        <div className="pt-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
            دسترسی سریع به شهرهای نمونه مصوب:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectPresetCity('گیلان', 'خشکبیجار', '1', 101)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'خشکبیجار' && selectedBlock === '1'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              خشکبیجار (بلوک ۱ - میدان شهرداری)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('گیلان', 'رشت', '105', 4)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'رشت' && selectedBlock === '105'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              رشت (بلوک ۱۰۵ - گلسار)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('گیلان', 'رشت', '12', 1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'رشت' && selectedBlock === '12'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              رشت (بلوک ۱۲ - مطهری)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('تهران', 'تهران - منطقه ۱', '21', 10)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'تهران - منطقه ۱'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              تهران (منطقه ۱ - زعفرانیه و ولیعصر)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('تهران', 'تهران - منطقه ۵', '32', 12)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'تهران - منطقه ۵'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              تهران (منطقه ۵ - فردوس و کاشانی)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('گیلان', 'بندر انزلی', '4', 6)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'بندر انزلی'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              بندر انزلی (بلوک ۴ - پاسداران)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('گیلان', 'لاهیجان', '7', 8)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'لاهیجان'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              لاهیجان (استخر و مطهری)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('اصفهان', 'اصفهان - مرکز', '15', 14)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity === 'اصفهان - مرکز'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              اصفهان (چهارباغ)
            </button>

            <button
              type="button"
              onClick={() => selectPresetCity('فارس', 'شیراز - منطقه ۱ (ارم)', '9', 16)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedCity.includes('شیراز')
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-black'
                  : 'bg-white dark:bg-[#16161A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              شیراز (ارم و قصرالدشت)
            </button>
          </div>
        </div>

        {/* Selected City & Block Active Status Banner */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121216] border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-slate-400">موقعیت و محدوده فعال:</span>
              <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                {selectedProvince} - {selectedCity}
              </span>
              {selectedBlock && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold font-mono">
                  بلوک {toPersianDigits(selectedBlock)}
                </span>
              )}
              {currentRate?.partCode && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold font-mono">
                  قسمت {toPersianDigits(currentRate.partCode)}
                </span>
              )}
            </div>
            {currentRate?.sectionName && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                {currentRate.sectionName}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-white/10 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">پایه اسکلت بتنی/فلزی:</span>
              <span className="font-black text-slate-900 dark:text-white text-xs text-amber-600 dark:text-amber-400">
                {formatNumberWithCommas(baseConcrete)} ریال
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-white/10 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">پایه سایر سازه‌ها:</span>
              <span className="font-black text-slate-900 dark:text-white text-xs text-amber-600 dark:text-amber-400">
                {formatNumberWithCommas(baseOther)} ریال
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-white/10 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">نرخ پایه عرصه P:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                {formatNumberWithCommas(baseLand)} ریال
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION 1: LAND VALUE (عرصه) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>بخش اول: ارزش معاملاتی عرصه (زمین)</span>
          </h3>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            نرخ پایه عرصه P در این بلوک: {formatNumberWithCommas(baseLand)} ریال
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          ارزش معاملاتی عرصه املاک بر مبنای ارزش‌های معاملاتی مندرج در ذیل نقشه‌های هر بلوک (نرخ <span className="font-bold text-amber-600 dark:text-amber-400">P</span>) و با اعمال ضرایب تعدیل نوع کاربردی و عرض معبر محاسبه می‌گردد:
        </p>

        {/* Land Usage Dynamic Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A]">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-[#0F0F12] text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-3.5">ردیف</th>
                <th className="p-3.5">نوع کاربردی عرصه</th>
                <th className="p-3.5">ضریب تعدیل (K_usage)</th>
                <th className="p-3.5 text-amber-600 dark:text-amber-400">
                  ارزش هر مترمربع عرصه در {selectedCity} (ریال)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-800 dark:text-slate-300">
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors bg-amber-500/5">
                <td className="p-3.5 font-bold font-mono">۱</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white">
                  🏠 مسکونی
                </td>
                <td className="p-3.5 font-bold font-mono text-amber-600 dark:text-amber-400">۱.۰ (۱۰۰٪ نرخ پایه P)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 1.0))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors bg-blue-500/5">
                <td className="p-3.5 font-bold font-mono">۲</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white">
                  🏢 اداری (دفاتر کار و واحدهای اداری)
                </td>
                <td className="p-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">۱.۲ (۱۲۰٪ نرخ پایه)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 1.2))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors bg-emerald-500/5">
                <td className="p-3.5 font-bold font-mono">۳</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white">
                  🏬 تجاری (مغازه‌ها و واحدهای کسب و پیشه)
                </td>
                <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">۱.۵ (۱۵۰٪ یا ستون تجاری مصوب)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(baseLandCommercial || Math.round(baseLand * 1.5))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۴</td>
                <td className="p-3.5">خدماتی، آموزشی، بهداشتی-درمانی، تفریحی-ورزشی، گردشگری، هتل‌داری</td>
                <td className="p-3.5 font-bold font-mono text-amber-600 dark:text-amber-400">۰.۷ (۷۰٪)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 0.7))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۵</td>
                <td className="p-3.5">صنعتی - کارگاهی، حمل و نقل، انبار و توقفگاه</td>
                <td className="p-3.5 font-bold font-mono text-amber-600 dark:text-amber-400">۰.۶ (۶۰٪)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 0.6))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۶ - الف</td>
                <td className="p-3.5">کشاورزی: باغات، اراضی مزروعی آبی، دامداری، طیور، آبزیان، گلخانه</td>
                <td className="p-3.5 font-bold font-mono text-amber-600 dark:text-amber-400">۰.۲ (۲۰٪)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 0.2))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۶ - ب</td>
                <td className="p-3.5">کشاورزی: اراضی مزروعی دیمی</td>
                <td className="p-3.5 font-bold font-mono text-amber-600 dark:text-amber-400">۰.۱ (۱۰٪)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 0.1))} ریال
                </td>
              </tr>
              <tr className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۷</td>
                <td className="p-3.5">سایر کاربردی‌ها</td>
                <td className="p-3.5 font-bold font-mono text-amber-600 dark:text-amber-400">۰.۲ (۲۰٪)</td>
                <td className="p-3.5 font-black text-slate-950 dark:text-white dir-ltr text-right">
                  {formatNumberWithCommas(Math.round(baseLand * 0.2))} ریال
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Street Width Rules */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <h4 className="font-bold text-amber-600 dark:text-amber-400">قوانین تعدیل عرض معبر (بند ۳ دفترچه):</h4>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            <li>ارزش‌های معاملاتی عرصه مندرج در جداول متعلق به معابر با عرض ۲۴ متر می‌باشد.</li>
            <li>به ازای هر متر کسری نسبت به ۲۴ متر، ۳ درصد (۳٪) از ارزش کسر می‌گردد (کف معبر قابل محاسبه ۸ متر است = حداکثر ۴۸٪ کسری).</li>
            <li>افزایش ارزش برای معابر بالای ۲۴ متر صرفاً برای املاک با کاربردی تجاری لحاظ می‌شود (+۳٪ به ازای هر متر مازاد).</li>
            <li>برای املاک مسکونی و اداری، معابر بالاتر از ۲۴ متر معادل ۲۴ متر محاسبه می‌شوند و افزایش قیمت ندارند.</li>
          </ul>
        </div>
      </div>

      {/* 4. SECTION 2: BUILDING VALUE (اعیانی) - DYNAMIC FOR SELECTED CITY */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              بخش دوم: ارزش معاملاتی اعیانی (ساختمان)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-xl border border-slate-200 dark:border-white/10">
            موقعیت انتخابی: <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedProvince} - {selectedCity}</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-medium space-y-1">
          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
            جدول نرخ‌های مصوب ارزش معاملاتی اعیانی بر اساس مصوبه کمیسیون تقویم املاک {selectedCity}:
          </p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300">
            بر اساس ماده ۶۴ قانون مالیات‌های مستقیم، قیمت هر متر مربع اعیانی متناسب با موقعیت شهر، نوع اسکلت سازه و نوع کاربرد به شرح جدول زیر می‌باشد:
          </p>
        </div>

        {/* DYNAMIC BASE BUILDING PRICES TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A]">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-[#0F0F12] text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-3.5">ردیف</th>
                <th className="p-3.5">نوع کاربردی اعیانی</th>
                <th className="p-3.5 text-center">
                  <div className="font-bold text-slate-900 dark:text-white">تمام بتونی، اسکلت بتونی/فلزی، سوله</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                    (پایه مسکونی: {formatNumberWithCommas(baseConcrete)} ریال)
                  </div>
                </th>
                <th className="p-3.5 text-center">
                  <div className="font-bold text-slate-900 dark:text-white">سایر سازه‌ها (آجری، چوبی، سنتی)</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                    (پایه مسکونی: {formatNumberWithCommas(baseOther)} ریال)
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-800 dark:text-slate-300">
              {/* Row 1: Commercial */}
              <tr className="hover:bg-amber-500/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۱</td>
                <td className="p-3.5">
                  <div className="font-bold text-slate-900 dark:text-white">تجاری</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">مغازه‌ها، واحدهای کسبی و تجاری</div>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-amber-600 dark:text-amber-400">
                    {formatNumberWithCommas(buildingRatesMatrix.commercial.concrete)} ریال
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    (ضریب ۱.۱۸۷۵ مسکونی)
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-amber-600 dark:text-amber-400">
                    {formatNumberWithCommas(buildingRatesMatrix.commercial.other)} ریال
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    (ضریب ۲.۱۵ مسکونی)
                  </span>
                </td>
              </tr>

              {/* Row 2: Residential & Admin */}
              <tr className="hover:bg-amber-500/5 transition-colors bg-amber-500/[0.03]">
                <td className="p-3.5 font-bold font-mono">۲</td>
                <td className="p-3.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>مسکونی و اداری</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">مبنا</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">آپارتمان‌ها، ویلاها، دفاتر اداری</div>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatNumberWithCommas(buildingRatesMatrix.residential_admin.concrete)} ریال
                  </span>
                  <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                    (نرخ پایه مصوب شهر)
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatNumberWithCommas(buildingRatesMatrix.residential_admin.other)} ریال
                  </span>
                  <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                    (نرخ پایه مصوب شهر)
                  </span>
                </td>
              </tr>

              {/* Row 3: Industrial & Services */}
              <tr className="hover:bg-amber-500/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۳</td>
                <td className="p-3.5">
                  <div className="font-bold text-slate-900 dark:text-white">صنعتی، کارگاهی، خدماتی، بهداشتی، ورزشی، انبار</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">سوله‌ها، مراکز آموزشی، درمانی، پارکینگ‌ها</div>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatNumberWithCommas(buildingRatesMatrix.industrial_services_health.concrete)} ریال
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    (۶۴٪ پایه مسکونی)
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatNumberWithCommas(buildingRatesMatrix.industrial_services_health.other)} ریال
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    (۷۸٪ پایه مسکونی)
                  </span>
                </td>
              </tr>

              {/* Row 4: Agriculture */}
              <tr className="hover:bg-amber-500/5 transition-colors">
                <td className="p-3.5 font-bold font-mono">۴</td>
                <td className="p-3.5">
                  <div className="font-bold text-slate-900 dark:text-white">کشاورزی، دامداری، طیور، پرورش گل و گیاه</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">گلخانه‌ها، مرغداری‌ها، شیلات، آغل و انبار علوفه</div>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatNumberWithCommas(buildingRatesMatrix.agriculture_livestock.concrete)} ریال
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    (۲۸٪ پایه مسکونی)
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatNumberWithCommas(buildingRatesMatrix.agriculture_livestock.other)} ریال
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    (۴۲٪ پایه مسکونی)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Floor and Age Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <h4 className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>تعدیل طبقات (بند ۱ و ۲ ضوابط):</span>
            </h4>
            <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-1">
              <p>
                • <strong className="text-slate-900 dark:text-white">مسکونی و اداری:</strong> تا ۵ طبقه ضریب ۱.۰ است. از طبقه ۶ به بالا، به ازای هر طبقه بالاتر ۱.۵٪ (۱.۵ درصد) به ارزش پایه اضافه می‌شود.
              </p>
              <p>
                • <strong className="text-slate-900 dark:text-white">تجاری:</strong> طبقه همکف ۱۰۰٪ است. به ازای هر طبقه بالاتر یا پایین‌تر از همکف ۱۰٪ کسر می‌گردد (سقف کسری حداکثر ۳۰٪ است).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <h4 className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>تخفیف قدمت ساختمان و بافت فرسوده (بند ۶ و ۷):</span>
            </h4>
            <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-1">
              <p>
                • <strong className="text-slate-900 dark:text-white">استهلاک قدمت:</strong> به ازای هر سال از عمر ساختمان ۲٪ (تا سقف ۲۰ سال = حداکثر ۴۰٪ تخفیف) از ارزش اعیانی کسر می‌شود.
              </p>
              <p>
                • <strong className="text-slate-900 dark:text-white">بافت فرسوده:</strong> در اولین انتقال ۵۰٪ تخفیف اعیانی تعلق می‌گیرد.
              </p>
              <p>
                • <strong className="text-slate-900 dark:text-white">مسکن مهر و حمایتی:</strong> ۵۰٪ تخفیف بر کل ارزش عرصه و اعیانی اعمال می‌گردد.
              </p>
            </div>
          </div>
        </div>

        {/* INTERACTIVE LIVE TESTER FOR SELECTED CITY BUILDING VALUE */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                محاسبه‌گر زنده ارزش یک متر مربع اعیانی در {selectedCity}:
              </h4>
            </div>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 font-mono">
              نرخ پایه: {formatNumberWithCommas(selectedBasePrice)} ریال
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {/* Structure Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">نوع سازه:</label>
              <select
                value={testStructure}
                onChange={(e) => setTestStructure(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="concrete_steel">اسکلت بتونی/فلزی</option>
                <option value="other">سایر سازه‌ها</option>
              </select>
            </div>

            {/* Usage Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">کاربری:</label>
              <select
                value={testUsage}
                onChange={(e) => setTestUsage(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="residential_admin">مسکونی و اداری</option>
                <option value="commercial">تجاری</option>
                <option value="industrial_services_health">صنعتی و خدماتی</option>
                <option value="agriculture_livestock">کشاورزی</option>
              </select>
            </div>

            {/* Floor */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">شماره طبقه:</label>
              <select
                value={testFloor}
                onChange={(e) => setTestFloor(parseInt(e.target.value, 10))}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="-2">زیرزمین ۲ (-۲۰٪ تجاری)</option>
                <option value="-1">زیرزمین ۱ (-۱۰٪ تجاری)</option>
                <option value="0">همکف (۱۰۰٪)</option>
                <option value="1">اول (۱۰۰٪)</option>
                <option value="3">سوم (۱۰۰٪)</option>
                <option value="5">پنجم (۱۰۰٪)</option>
                <option value="6">ششم (+۱.۵٪)</option>
                <option value="8">هشتم (+۴.۵٪)</option>
                <option value="10">دهم (+۷.۵٪)</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">قدمت بنا:</label>
              <select
                value={testAge}
                onChange={(e) => setTestAge(parseInt(e.target.value, 10))}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="0">نوساز (۰٪ تخفیف)</option>
                <option value="5">۵ سال (-۱۰٪ تخفیف)</option>
                <option value="10">۱۰ سال (-۲۰٪ تخفیف)</option>
                <option value="15">۱۵ سال (-۳۰٪ تخفیف)</option>
                <option value="20">۲۰ سال به بالا (-۴۰٪ سقف)</option>
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">مرحله ساخت:</label>
              <select
                value={testStage}
                onChange={(e) => setTestStage(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#16161A] text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="completed">تکمیل شده (۱۰۰٪)</option>
                <option value="finishing">نازک‌کاری (۸۰٪)</option>
                <option value="rough">سفت‌کاری (۵۰٪)</option>
                <option value="frame">اسکلت (۳۰٪)</option>
                <option value="foundation">فونداسیون (۱۰٪)</option>
              </select>
            </div>
          </div>

          {/* Test Result Bar */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#101014] border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                ارزش نهایی هر متر مربع اعیانی شبیه‌سازی شده:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                {formatNumberWithCommas(simulatedFinalPrice)} ریال
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                (بر هر مترمربع)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECTION 3: UNFINISHED BUILDINGS (واحدهای غیرتکمیل) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span>بخش سوم: ارزش معاملاتی واحدهای تکمیل نشده</span>
          </h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            بر مبنای ارزش مصوب {selectedCity}
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          در صورتی که ساختمان در حال احداث یا فاقد پایان‌کار کامل باشد، ارزش اعیانی متناسب با مرحله پیشرفت فیزیکی محاسبه می‌گردد:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(COMPLETION_STAGE_COEFFICIENTS).map(([key, item]) => {
            const stagePriceConcrete = Math.round(baseConcrete * item.coeff);
            return (
              <div
                key={key}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 text-center space-y-1.5 hover:border-amber-500/40 transition-all"
              >
                <span className="text-xs text-slate-700 dark:text-slate-300 block font-bold">
                  {item.label.split('(')[0]}
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-amber-600 dark:text-amber-400 block">
                  {toPersianDigits((item.coeff * 100).toFixed(0))}٪ ارزش
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  {formatNumberWithCommas(stagePriceConcrete)} ریال/متر
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
