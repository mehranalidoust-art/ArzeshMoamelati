export type LandUsageType =
  | 'residential' // مسکونی (ضریب ۱.۰)
  | 'administrative' // اداری (ضریب ۱.۲)
  | 'commercial' // تجاری (ضریب ۱.۵ یا نرخ مصوب تجاری)
  | 'services_health_education_tourism' // خدماتی، آموزشی، بهداشتی-درمانی، تفریحی-ورزشی، گردشگری، هتل‌داری (ضریب ۰.۷)
  | 'industrial_transport_warehouse' // صنعتی - کارگاهی، حمل و نقل، انبار و توقفگاه (ضریب ۰.۶)
  | 'agriculture_irrigated_livestock' // کشاورزی: باغات، اراضی مزروعی آبی، دامداری، پرورش طیور و آبزیان، گل و گیاه (ضریب ۰.۲)
  | 'agriculture_dry' // کشاورزی: اراضی مزروعی دیمی (ضریب ۰.۱)
  | 'other' // سایر (ضریب ۰.۲)
  | 'residential_commercial_admin'; // برای سازگاری با سوابق گذشته

export type StructureType =
  | 'concrete_steel' // تمام بتونی، اسکلت بتونی و فلزی، سوله
  | 'other'; // سایر (آجری، چوبی و غیره)

export type BuildingUsageType =
  | 'commercial' // تجاری
  | 'residential_admin' // مسکونی و اداری
  | 'industrial_services_health' // صنعتی، کارگاهی، خدماتی، آموزشی، بهداشتی، ورزشی، گردشگری، انبار، پارکینگ
  | 'agriculture_livestock'; // کشاورزی، دامداری، طیور، آبزیان، گلخانه

export type CompletionStageType =
  | 'completed' // تکمیل شده (۱۰۰٪)
  | 'finishing' // نازک‌کاری (۸۰٪)
  | 'rough' // سفت‌کاری (۵۰٪)
  | 'frame' // اسکلت (۳۰٪)
  | 'foundation'; // فونداسیون (۱۰٪)

export type LandSpecialConditionType =
  | 'none' // عادی (دارای راه عبور مستقیم و مشخص)
  | 'two_or_more_frontages' // دارای ۲ بر یا بیشتر (ملاک: بالاترین ارزش معبر دارای راه عبور - بند ۴)
  | 'square' // واقع در بر میدان (معادل بالاترین ارزش معبر منشعب - بند ۵)
  | 'no_access_right_of_way' // فاقد راه عبور مستقل و دارای حق عبور از مجاور (۶۰٪ ارزش معبر منشعب - بند ۶)
  | 'highway_railway_stream_corridor' // بر بزرگراه، اتوبان، مسیل، حریم راه‌آهن و نهر (ملاک: خیابان مورد استفاده - بند ۷)
  | 'passage_arcade_inn' // سراها، پاساژها و کاروانسراها (ملاک: بالاترین ارزش معبر منشعب - بند ۸)
  | 'out_of_bounds_70' // حریم قانونی شهر، بخش و روستا بدون قیمت مصوب (۷۰٪ نزدیکترین محل مشابه - بند ۹)
  | 'privacy_corridor'; // برای سازگاری با سوابق گذشته

export interface CalculationFormData {
  title: string;
  province: string;
  city: string;
  blockCode: string;
  partCode?: string; // کد قسمت / ردیف در بلوک
  sectionName?: string; // عنوان قسمت / معبر / محدوده
  address?: string; // شرح نشانی ملک و معبر
  imageUrl?: string; // تصویر پیوست (نقشه کاداستر / کروکی / سند / ملک)

  // Land (عرصه)
  landArea: number; // مساحت زمین (متر مربع)
  baseLandValue: number; // ارزش روز/معاملاتی پایه عرصه متناظر با کاربری انتخابی (ریال بر متر مربع)
  baseLandResidentialValue?: number; // ارزش پایه عرصه مسکونی در بلوک (P مسکونی)
  landUsage: LandUsageType;
  streetWidth: number; // عرض معبر (متر)
  landSpecialCondition: LandSpecialConditionType;

  // Building (اعیانی)
  hasBuilding: boolean;
  buildingArea: number; // مساحت اعیانی (متر مربع)
  structureType: StructureType;
  buildingUsage: BuildingUsageType;
  customBaseBuildingValue?: number; // در صورت وارد کردن دستی (ریال/مترمربع)
  floorNumber: number; // شماره طبقه (۰ برای همکف، ۱، ۲...، -۱ برای زیرزمین)
  isCommercialAboveOrBelowGround: boolean;
  buildingAge: number; // قدمت ساختمان (سال)
  completionStage: CompletionStageType;
  isDistressedArea: boolean; // بافت فرسوده (۵۰٪ تخفیف اعیانی در اولین انتقال)
  isGovernmentHousing: boolean; // مسکن مهر / ۹۹ ساله / حمایتی (۵۰٪ تخفیف عرصه و اعیانی)

  notes: string;
}

export interface LandCalculationResult {
  basePrice: number; // Rials/m2
  area: number; // m2
  usageCoeff: number; // ضریب نوع کاربردی (0.1 تا 1.0)
  usageLabel: string;
  streetWidthCoeff: number; // ضریب عرض معبر
  streetWidthDetail: string;
  specialConditionCoeff: number; // ضریب شرایط خاص (مثلا 0.6 برای فاقد راه عبور یا 0.7 حریم)
  specialConditionDetail: string;
  effectiveLandPricePerM2: number; // قیمت موثر هر متر مربع عرصه
  totalLandValue: number; // ارزش کل عرصه (ریال)
}

export interface BuildingCalculationResult {
  hasBuilding: boolean;
  basePrice: number; // Rials/m2 (ارزش پایه سازه از جدول)
  area: number; // m2
  structureLabel: string;
  usageLabel: string;
  floorCoeff: number; // ضریب تعدیل طبقات
  floorDetail: string;
  ageDiscountCoeff: number; // ضریب تخفیف قدمت (هر سال ۲٪ تا سقف ۴۰٪)
  ageDetail: string;
  completionCoeff: number; // ضریب مرحله ساخت
  completionDetail: string;
  distressedDiscountCoeff: number; // ۵۰٪ در صورت بافت فرسوده
  effectiveBuildingPricePerM2: number; // قیمت موثر هر متر مربع اعیانی
  totalBuildingValue: number; // ارزش کل اعیانی (ریال)
}

export interface CalculationBreakdown {
  land: LandCalculationResult;
  building: BuildingCalculationResult;
  governmentHousingDiscount: boolean;
  governmentHousingCoeff: number; // 0.5 if true, 1.0 if false
  grandTotalValue: number; // ارزش کل معاملاتی ملک (ریال)
  formattedGrandTotalRials: string; // با جداکننده سه رقمی
  formattedGrandTotalTomans: string; // به تومان
}

export interface SavedCalculationItem {
  id: number;
  userId?: number;
  title: string;
  province?: string;
  city?: string;
  blockCode?: string;
  partCode?: string;
  sectionName?: string;
  address?: string;
  imageUrl?: string;
  landArea: number;
  baseLandValue: number;
  landUsage: string;
  landUsageCoeff: number;
  streetWidth: number;
  streetWidthCoeff: number;
  landSpecialCondition?: string;
  landSpecialCoeff?: number;
  totalLandValue: number;
  hasBuilding: boolean;
  buildingArea?: number;
  structureType?: string;
  buildingUsage?: string;
  baseBuildingValue?: number;
  floorNumber?: number;
  floorCoeff?: number;
  buildingAge?: number;
  ageCoeff?: number;
  completionStage?: string;
  completionCoeff?: number;
  isDistressed?: boolean;
  isGovernmentHousing?: boolean;
  totalBuildingValue: number;
  grandTotalValue: number;
  notes?: string;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name?: string;
  role?: 'admin' | 'user';
  createdAt?: string;
}

export interface BaseRateItem {
  id: number;
  province: string;
  city: string;
  blockCode?: string; // کد بلوک (مثلا: ۱۲، ۱۰۵)
  partCode?: string; // کد قسمت / ردیف (مثلا: ۱، ۲، ۳، الف، ب)
  sectionName?: string; // نام قسمت یا معبر (مثلا: خیابان مطهری، کوچه‌های با عرض ۸ متر)
  address?: string; // شرح نشانی و معبر
  imageUrl?: string; // تصویر نقشه بلوک یا کروکی
  year: number;
  baseLandValue: number; // Rials / m2 residential (P)
  baseLandCommercialValue?: number; // Rials / m2 commercial
  landCoeff?: number; // ضریب عرصه اختصاصی این بلوک/شهرستان (مثلاً 1.0)
  adminCoeff?: number; // ضریب اداری (مثلاً 1.2)
  commercialCoeff?: number; // ضریب تجاری (مثلاً 1.5)
  baseBuildingConcrete: number; // Rials / m2 concrete/steel
  baseBuildingOther: number; // Rials / m2 other structures
  notes?: string;
  updatedAt?: string | Date | null;
}
