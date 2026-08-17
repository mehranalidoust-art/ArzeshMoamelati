import {
  BuildingUsageType,
  CalculationBreakdown,
  CalculationFormData,
  CompletionStageType,
  LandSpecialConditionType,
  LandUsageType,
  StructureType,
} from '../types.ts';

// 1. Land Usage Coefficients (جدول بند ۱ - ضرایب تعدیل نوع کاربردی عرصه بر اساس ماده ۶۴ ق.م.م)
export const LAND_USAGE_COEFFICIENTS: Record<
  LandUsageType,
  { coeff: number; label: string; shortLabel: string; description?: string }
> = {
  residential: {
    coeff: 1.0,
    label: 'مسکونی (ضریب ۱.۰ - نرخ پایه P)',
    shortLabel: 'مسکونی',
    description: 'کاربری مسکونی بر مبنای ارزش پایه دفترچه (ضریب ۱.۰)',
  },
  administrative: {
    coeff: 1.2,
    label: 'اداری (ضریب ۱.۲ - ۱۲۰٪ ارزش پایه)',
    shortLabel: 'اداری',
    description: 'کاربری دفاتر کار و اماکن اداری (ضریب ۱.۲)',
  },
  commercial: {
    coeff: 1.5,
    label: 'تجاری (ضریب ۱.۵ - ۱۵۰٪ ارزش پایه یا تجاری مصوب)',
    shortLabel: 'تجاری',
    description: 'کاربری تجاری، مغازه‌ها و کسب‌وکار (ضریب ۱.۵ یا ستون تجاری دفترچه)',
  },
  services_health_education_tourism: {
    coeff: 0.7,
    label: 'خدماتی، آموزشی، بهداشتی-درمانی، تفریحی-ورزشی، گردشگری، هتلداری (ضریب ۰.۷)',
    shortLabel: 'خدماتی و درمانی',
    description: 'مراکز آموزشی، درمانی، ورزشی، گردشگری و اقامتی (ضریب ۰.۷)',
  },
  industrial_transport_warehouse: {
    coeff: 0.6,
    label: 'صنعتی-کارگاهی، حمل‌ونقل، انبار و توقفگاه (ضریب ۰.۶)',
    shortLabel: 'صنعتی و انبار',
    description: 'کارگاه‌ها، پایانه‌ها، انبارها و توقفگاه‌ها (ضریب ۰.۶)',
  },
  agriculture_irrigated_livestock: {
    coeff: 0.2,
    label: 'کشاورزی: باغات، اراضی مزروعی آبی، دامداری، پرورش طیور و آبزیان، گل و گیاه (ضریب ۰.۲)',
    shortLabel: 'کشاورزی آبی و باغات',
    description: 'اراضی کشاورزی آبی، باغی، دامپروری، طیور و گلخانه (ضریب ۰.۲)',
  },
  agriculture_dry: {
    coeff: 0.1,
    label: 'کشاورزی: اراضی مزروعی دیمی (ضریب ۰.۱)',
    shortLabel: 'کشاورزی دیمی',
    description: 'اراضی زراعی دیم و غیرآبی (ضریب ۰.۱)',
  },
  other: {
    coeff: 0.2,
    label: 'سایر کاربردی‌ها (ضریب ۰.۲)',
    shortLabel: 'سایر کاربردی‌ها',
    description: 'سایر کاربری‌های متفرقه (ضریب ۰.۲)',
  },
  residential_commercial_admin: {
    coeff: 1.0,
    label: 'مسکونی (ضریب ۱.۰)',
    shortLabel: 'مسکونی',
    description: 'مسکونی (ضریب ۱.۰)',
  },
};

// 2. Base Building Prices in Rials per m2 (بخش دوم - جدول قیمت هر مترمربع سازه به ریال)
export const BASE_BUILDING_PRICES: Record<
  StructureType,
  Record<BuildingUsageType, { priceRials: number; label: string }>
> = {
  concrete_steel: {
    commercial: {
      priceRials: 28_500_000, // ۲۸,۵۰۰,۰۰۰ ریال
      label: 'تجاری - تمام بتن/اسکلت بتنی/فلزی/سوله (۲۸,۵۰۰,۰۰۰ ریال)',
    },
    residential_admin: {
      priceRials: 24_000_000, // ۲۴,۰۰۰,۰۰۰ ریال
      label: 'مسکونی و اداری - تمام بتن/اسکلت بتنی/فلزی (۲۴,۰۰۰,۰۰۰ ریال)',
    },
    industrial_services_health: {
      priceRials: 15_400_000, // ۱۵,۴۰۰,۰۰۰ ریال
      label: 'صنعتی-کارگاهی، خدماتی، آموزشی، درمانی، ورزشی، گردشگری، انبار، پارکینگ - تمام بتن/فلزی (۱۵,۴۰۰,۰۰۰ ریال)',
    },
    agriculture_livestock: {
      priceRials: 6_800_000, // ۶,۸۰۰,۰۰۰ ریال
      label: 'کشاورزی، دامداری، طیور، آبزیان، گل و گیاه - تمام بتن/فلزی (۶,۸۰۰,۰۰۰ ریال)',
    },
  },
  other: {
    commercial: {
      priceRials: 17_200_000, // ۱۷,۲۰۰,۰۰۰ ریال
      label: 'تجاری - سایر سازه‌ها (۱۷,۲۰۰,۰۰۰ ریال)',
    },
    residential_admin: {
      priceRials: 8_000_000, // ۸,۰۰۰,۰۰۰ ریال
      label: 'مسکونی و اداری - سایر سازه‌ها (۸,۰۰۰,۰۰۰ ریال)',
    },
    industrial_services_health: {
      priceRials: 6_300_000, // ۶,۳۰۰,۰۰۰ ریال
      label: 'صنعتی، خدماتی، آموزشی، بهداشتی، انبار - سایر سازه‌ها (۶,۳۰۰,۰۰۰ ریال)',
    },
    agriculture_livestock: {
      priceRials: 3_400_000, // ۳,۴۰۰,۰۰۰ ریال
      label: 'کشاورزی و دامداری - سایر سازه‌ها (۳,۴۰۰,۰۰۰ ریال)',
    },
  },
};

// 3. Completion Stage Coefficients (بخش سوم - مراحل ساخت)
export const COMPLETION_STAGE_COEFFICIENTS: Record<
  CompletionStageType,
  { coeff: number; label: string }
> = {
  completed: { coeff: 1.0, label: 'تکمیل شده (۱۰۰٪ ارزش)' },
  finishing: { coeff: 0.8, label: 'نازک‌کاری (۸۰٪ ارزش)' },
  rough: { coeff: 0.5, label: 'سفت‌کاری (۵۰٪ ارزش)' },
  frame: { coeff: 0.3, label: 'اسکلت (۳۰٪ ارزش)' },
  foundation: { coeff: 0.1, label: 'فونداسیون (۱۰٪ ارزش)' },
};

// 4. Land Special Conditions Coefficients (ضوابط قانونی و موقعیت‌های خاص عرصه ماده ۶۴)
export const LAND_SPECIAL_CONDITIONS: Record<
  LandSpecialConditionType,
  { coeff: number; label: string; description: string; clause: string }
> = {
  none: {
    coeff: 1.0,
    label: 'عادی (دارای یک بر و راه عبور مستقیم)',
    description: 'ملک با دسترسی مستقیم و مستقل به معبر عمومی (بند ۱ و ۳)',
    clause: 'بند ۱ و ۳',
  },
  two_or_more_frontages: {
    coeff: 1.0,
    label: 'دارای ۲ بر یا بیشتر (ملاک: بالاترین ارزش معبر دارای راه عبور)',
    description: 'در عرصه دارای ۲ بر یا بیشتر، بالاترین ارزش معبر مربوطه ملاک عمل است مشروط بر داشتن راه عبور از آن معبر (بند ۴)',
    clause: 'بند ۴',
  },
  square: {
    coeff: 1.0,
    label: 'واقع در بر میدان (ملاک: بالاترین ارزش معبر منشعب)',
    description: 'معادل بالاترین ارزش معبری که از آن میدان منشعب می‌شود (بند ۵)',
    clause: 'بند ۵',
  },
  no_access_right_of_way: {
    coeff: 0.6,
    label: 'فاقد راه عبور مستقل / دارای حق عبور از مجاور (ضریب ۶۰٪)',
    description: 'برابر ۶۰ درصد (۶۰٪) ارزش عرصه معبری است که راه عبور ملک از آن منشعب می‌شود (بند ۶)',
    clause: 'بند ۶',
  },
  highway_railway_stream_corridor: {
    coeff: 1.0,
    label: 'بر بزرگراه، اتوبان، مسیل، حریم راه‌آهن و نهر (ملاک: خیابان مورد استفاده)',
    description: 'تا زمان عدم امکان استفاده مستقیم، برابر خیابان مورد استفاده جهت دسترسی محاسبه می‌شود (بند ۷)',
    clause: 'بند ۷',
  },
  passage_arcade_inn: {
    coeff: 1.0,
    label: 'سراها، پاساژها و کاروانسراها (ملاک: بالاترین ارزش معبر منشعب)',
    description: 'بر اساس بالاترین ارزش معاملاتی معبری که از آن منشعب می‌شوند محاسبه می‌گردد (بند ۸)',
    clause: 'بند ۸',
  },
  out_of_bounds_70: {
    coeff: 0.7,
    label: 'واقع در حریم قانونی شهر/بخش/روستا بدون قیمت مصوب (ضریب ۷۰٪)',
    description: 'معادل ۷۰ درصد (۷۰٪) ارزش معاملاتی نزدیک‌ترین محل مشابه، حسب مورد (بند ۹)',
    clause: 'بند ۹',
  },
  privacy_corridor: {
    coeff: 1.0,
    label: 'واقع در حریم راه‌آهن، بزرگراه، مسیل یا نهر (سازگاری با سوابق)',
    description: 'تا زمان محدودیت عبور مستقیم، بر اساس خیابان مورد استفاده محاسبه می‌گردد (بند ۷)',
    clause: 'بند ۷',
  },
};

/**
 * Main calculation engine according to Article 64 of Direct Taxes Law
 */
export function calculateRegionalValue(data: CalculationFormData): CalculationBreakdown {
  // ----------------------------------------------------
  // SECTION 1: LAND VALUE (عرصه)
  // ----------------------------------------------------
  const baseLandPrice = data.baseLandValue || 0;
  const landArea = data.landArea || 0;

  // 1.1 Usage Coeff
  const usageInfo = LAND_USAGE_COEFFICIENTS[data.landUsage] || LAND_USAGE_COEFFICIENTS.other;
  const landUsageCoeff = usageInfo.coeff;

  // 1.2 Street Width Coeff (ضوابط عرصه و معابر - معبر با عرض ۲۴ متر پایه)
  // - ارزش‌های جدول مربوط به معبر ۲۴ متری است.
  // - به ازای هر متر کسری نسبت به ۲۴ متر، ۳٪ از ارزش کسر می‌شود. سقف محاسبه ۲۴ متر و کف ۸ متر است.
  // - برای کاربردی تجاری در صورت معبر بالای ۲۴ متر، ضریب مازاد تعلق می‌گیرد.
  const effectiveWidth = Math.min(24, Math.max(8, data.streetWidth || 24));
  const rawWidth = data.streetWidth || 24;
  const isCommercialLand =
    data.landUsage === 'commercial' ||
    data.buildingUsage === 'commercial' ||
    data.landUsage === 'residential_commercial_admin';

  let streetWidthCoeff = 1.0;
  let streetWidthDetail = '';

  if (rawWidth > 24) {
    if (isCommercialLand) {
      const extraWidth = rawWidth - 24;
      streetWidthCoeff = 1.0 + extraWidth * 0.03;
      streetWidthDetail = `افزایش ${toPersianDigits(extraWidth)} متر مازاد بر ۲۴ متر (+${toPersianDigits(extraWidth * 3)}٪) برای تجاری`;
    } else {
      streetWidthCoeff = 1.0; // سقف محاسبه معبر ۲۴ متر است
      streetWidthDetail = `عرض معبر ${toPersianDigits(rawWidth)} متر (سقف محاسبه معبر ۲۴ متر - ضریب ۱.۰)`;
    }
  } else if (rawWidth < 24) {
    const deficitMeters = 24 - effectiveWidth; // Max 24 - 8 = 16 meters
    const reductionPercent = deficitMeters * 3; // Max 16 * 3% = 48%
    streetWidthCoeff = Math.max(0.52, (100 - reductionPercent) / 100);
    streetWidthDetail = `کسری ${toPersianDigits(deficitMeters)} متر نسبت به ۲۴ متر (-${toPersianDigits(reductionPercent)}٪ کسری - کف معبر ۸ متر)`;
  } else {
    streetWidthDetail = 'عرض معبر استاندارد ۲۴ متر (بدون تعدیل)';
  }

  // 1.3 Special Land Condition
  const specialCond = LAND_SPECIAL_CONDITIONS[data.landSpecialCondition] || LAND_SPECIAL_CONDITIONS.none;
  const landSpecialCoeff = specialCond.coeff;

  // Effective Land Price per m2 (بر مبنای ارزش پایه کاربری انتخابی P و ضرایب معبر و شرایط خاص)
  const effectiveLandPricePerM2 = baseLandPrice * streetWidthCoeff * landSpecialCoeff;
  const totalLandValue = effectiveLandPricePerM2 * landArea;

  const landResult = {
    basePrice: baseLandPrice,
    area: landArea,
    usageCoeff: landUsageCoeff,
    usageLabel: usageInfo.label,
    streetWidthCoeff,
    streetWidthDetail,
    specialConditionCoeff: landSpecialCoeff,
    specialConditionDetail: specialCond.label,
    effectiveLandPricePerM2,
    totalLandValue,
  };

  // ----------------------------------------------------
  // SECTION 2: BUILDING VALUE (اعیانی)
  // ----------------------------------------------------
  let totalBuildingValue = 0;
  let baseBuildingPrice = 0;
  let floorCoeff = 1.0;
  let floorDetail = 'همکف یا استاندارد';
  let ageDiscountCoeff = 1.0;
  let ageDetail = 'نوساز';
  let completionCoeff = 1.0;
  let completionDetail = 'تکمیل شده';
  let distressedDiscountCoeff = 1.0;
  let effectiveBuildingPricePerM2 = 0;
  let structureLabel = '';
  let usageLabel = '';

  if (data.hasBuilding && (data.buildingArea || 0) > 0) {
    const bArea = data.buildingArea;

    // 2.1 Base Price per m2
    if (data.customBaseBuildingValue && data.customBaseBuildingValue > 0) {
      baseBuildingPrice = data.customBaseBuildingValue;
      structureLabel = 'قیمت پایه سفارشی کاربر';
      usageLabel = 'سفارشی';
    } else {
      const structObj = BASE_BUILDING_PRICES[data.structureType] || BASE_BUILDING_PRICES.concrete_steel;
      const usageObj = structObj[data.buildingUsage] || structObj.residential_admin;
      baseBuildingPrice = usageObj.priceRials;
      structureLabel = data.structureType === 'concrete_steel' ? 'اسکلت بتونی/فلزی/سوله' : 'سایر سازه‌ها';
      usageLabel = usageObj.label;
    }

    // 2.2 Floor Adjustments (بخش دوم - بند ۱ و ۲)
    const floor = data.floorNumber || 0;

    if (data.buildingUsage === 'commercial') {
      // Commercial floor adjustment (بند ۲ بخش دوم):
      // -10% per floor above/below ground, max 30% reduction.
      const offset = Math.abs(floor);
      if (offset === 0) {
        floorCoeff = 1.0;
        floorDetail = 'طبقه همکف تجاری (۱۰۰٪ ارزش پایه)';
      } else {
        const reduction = Math.min(30, offset * 10);
        floorCoeff = (100 - reduction) / 100;
        floorDetail = `طبقه ${floor > 0 ? '+' : ''}${toPersianDigits(floor)} تجاری (-${toPersianDigits(reduction)}٪ - حداکثر ۳۰٪ کسری)`;
      }
    } else {
      // Residential & Administrative floor adjustment (بند ۱ بخش دوم):
      // Up to 5th floor (excluding pilotis/basement): 100%. Above 5th floor: +1.5% per floor added to base.
      if (floor > 5) {
        const extraFloors = floor - 5;
        const increasePercent = extraFloors * 1.5;
        floorCoeff = 1.0 + increasePercent / 100;
        floorDetail = `طبقه ${toPersianDigits(floor)} (بیش از ۵ طبقه - +${toPersianDigits(increasePercent)}٪ به ارزش مترمربع)`;
      } else {
        floorCoeff = 1.0;
        floorDetail = `طبقه ${toPersianDigits(floor)} (تا ۵ طبقه بدون افزایش قیمت)`;
      }
    }

    // 2.3 Age Discount (بخش دوم - بند ۶)
    // ۲٪ تخفیف به ازای هر سال قدمت تا سقف ۲۰ سال (حداکثر ۴۰٪ تخفیف)
    const age = Math.max(0, data.buildingAge || 0);
    const effectiveAge = Math.min(20, age);
    const discountPercent = effectiveAge * 2;
    ageDiscountCoeff = (100 - discountPercent) / 100;

    if (age > 0) {
      ageDetail = `قدمت ${toPersianDigits(age)} سال (${toPersianDigits(discountPercent)}٪ تخفیف - سقف ۲۰ سال/۴۰٪)`;
    } else {
      ageDetail = 'نوساز (بدون تخفیف قدمت)';
    }

    // 2.4 Completion Stage (بخش سوم)
    const completionObj = COMPLETION_STAGE_COEFFICIENTS[data.completionStage] || COMPLETION_STAGE_COEFFICIENTS.completed;
    completionCoeff = completionObj.coeff;
    completionDetail = completionObj.label;

    // 2.5 Distressed Area Discount (بخش دوم - بند ۷)
    // بافت فرسوده با قدمت بیش از ۳ سال: ۵۰٪ تخفیف در ارزش اعیانی برای اولین انتقال
    if (data.isDistressedArea && age >= 3) {
      distressedDiscountCoeff = 0.5;
    } else {
      distressedDiscountCoeff = 1.0;
    }

    effectiveBuildingPricePerM2 =
      baseBuildingPrice * floorCoeff * ageDiscountCoeff * completionCoeff * distressedDiscountCoeff;

    totalBuildingValue = effectiveBuildingPricePerM2 * bArea;
  }

  const buildingResult = {
    hasBuilding: data.hasBuilding && (data.buildingArea || 0) > 0,
    basePrice: baseBuildingPrice,
    area: data.buildingArea || 0,
    structureLabel,
    usageLabel,
    floorCoeff,
    floorDetail,
    ageDiscountCoeff,
    ageDetail,
    completionCoeff,
    completionDetail,
    distressedDiscountCoeff,
    effectiveBuildingPricePerM2,
    totalBuildingValue,
  };

  // ----------------------------------------------------
  // SECTION 3: GOVERNMENT HOUSING DISCOUNT (بخش دوم بند ۸)
  // ----------------------------------------------------
  // پروژه های مسکن حمایتی / مسکن مهر / ۹۹ ساله: ۵۰٪ تخفیف در مجموع ارزش عرصه و اعیانی
  const govHousingCoeff = data.isGovernmentHousing ? 0.5 : 1.0;

  const rawGrandTotal = (totalLandValue + totalBuildingValue) * govHousingCoeff;
  const grandTotalValue = Math.round(rawGrandTotal);

  return {
    land: landResult,
    building: buildingResult,
    governmentHousingDiscount: data.isGovernmentHousing,
    governmentHousingCoeff: govHousingCoeff,
    grandTotalValue,
    formattedGrandTotalRials: formatNumberWithCommas(grandTotalValue) + ' ریال',
    formattedGrandTotalTomans: formatNumberWithCommas(Math.floor(grandTotalValue / 10)) + ' تومان',
  };
}

/**
 * Utility to convert English numbers to Persian digits for UI display
 */
export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

/**
 * Utility to format numbers with commas in Persian digits (e.g. ۱۲,۵۰۰,۰۰۰)
 */
export function formatNumberWithCommas(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '۰';
  const cleanVal = typeof val === 'string' ? val.replace(/[,\s]/g, '') : val;
  const numVal = Number(cleanVal);
  if (isNaN(numVal)) return '۰';
  const num = Math.round(numVal);
  const commaFormatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toPersianDigits(commaFormatted);
}

/**
 * Format Rial amount to human readable Persian text (e.g. ۱۲ میلیارد و ۵۰۰ میلیون تومان)
 */
export function formatCurrencyInPersianWords(rials: number): string {
  if (!rials || isNaN(rials)) return '۰ تومان';
  const tomans = Math.floor(rials / 10);
  if (tomans < 1000) return `${formatNumberWithCommas(tomans)} تومان`;

  const billion = 1_000_000_000;
  const million = 1_000_000;
  const thousand = 1_000;

  let result = '';
  let rem = tomans;

  if (rem >= billion) {
    const b = Math.floor(rem / billion);
    result += `${toPersianDigits(b)} میلیارد `;
    rem = rem % billion;
  }

  if (rem >= million) {
    const m = Math.floor(rem / million);
    if (result) result += 'و ';
    result += `${toPersianDigits(m)} میلیون `;
    rem = rem % million;
  }

  if (rem >= thousand && result.length < 25) {
    const t = Math.floor(rem / thousand);
    if (result) result += 'و ';
    result += `${toPersianDigits(t)} هزار `;
    rem = rem % thousand;
  }

  if (rem > 0 && !result) {
    result = `${toPersianDigits(rem)} `;
  }

  return result.trim() + ' تومان';
}
