import { db } from './index.ts';
import { eq } from 'drizzle-orm';
import { systemSettings } from './schema.ts';

export const systemSettingsTable = systemSettings;

// In-memory fallback
let inMemorySettings: Record<string, any> = {
  usage_rates: [
    { key: 'services_health_education_tourism', label: 'خدماتی، آموزشی، فرهنگی، بهداشتی-درمانی، تفریحی-ورزشی، گردشگری، هتلداری و ...', coeff: 0.7 },
    { key: 'industrial_transport_warehouse', label: 'صنعتی-کارگاهی، حمل‌ونقل، انبار و توقفگاه', coeff: 0.6 },
    { key: 'agriculture_irrigated_livestock', label: 'کشاورزی: باغات، اراضی مزروعی آبی، دامداری، دامپروری، پرورش طیور و آبزیان، پرورش گل و گیاه و ...', coeff: 0.2 },
    { key: 'agriculture_dry', label: 'کشاورزی: اراضی مزروعی دیمی', coeff: 0.1 },
    { key: 'other', label: 'سایر کاربری‌ها', coeff: 0.2 },
  ],
  building_rates: [
    { usage: 'commercial', label: 'تجاری', concretePrice: 28500000, otherPrice: 17200000 },
    { usage: 'residential_admin', label: 'مسکونی و اداری', concretePrice: 24000000, otherPrice: 8000000 },
    { usage: 'industrial_services_health', label: 'صنعتی-کارگاهی، خدماتی، آموزشی، بهداشتی-درمانی، تفریحی-ورزشی، فرهنگی، هتلداری، گردشگری، حمل‌ونقل، انبار، پارکینگ عمومی (توقفگاه) و ...', concretePrice: 15400000, otherPrice: 6300000 },
    { usage: 'agriculture_livestock', label: 'کشاورزی (دامداری، دامپروری، پرورش طیور و آبزیان، پرورش گل و گیاه و ...)', concretePrice: 6800000, otherPrice: 3400000 },
  ],
  construction_stages: [
    { stage: 'foundation', label: 'فونداسیون', percent: 10 },
    { stage: 'frame', label: 'اسکلت', percent: 30 },
    { stage: 'rough', label: 'سفت‌کاری', percent: 50 },
    { stage: 'finishing', label: 'نازک‌کاری و تکمیل', percent: 100 },
  ],
  regulations: [
    { id: 1, title: 'عرصه و معابر', rule: 'ارزش‌های جداول بلوک‌ها مربوط به معبر با عرض ۲۴ متر است؛ به ازای هر متر (یا ضریب متر) کسری نسبت به ۲۴ متر، ۳٪ از ارزش کسر می‌شود. سقف محاسبه ۲۴ متر و کف ۸ متر است.' },
    { id: 2, title: 'دو بر یا بیشتر', rule: 'در صورت داشتن ۲ بر یا بیشتر، بالاترین ارزش معبر مربوطه ملاک است؛ مشروط به وجود راه عبور از آن معبر.' },
    { id: 3, title: 'املاک واقع در بر میدان', rule: 'معادل بالاترین ارزش معبری که از میدان منشعب می‌شود.' },
    { id: 4, title: 'فاقد راه عبور مستقل', rule: 'معادل ۶۰٪ ارزش عرصه معبری که راه عبور ملک از آن منشعب می‌شود.' },
    { id: 5, title: 'بزرگراه/اتوبان/مسیل/حریم راه‌آهن/نهر', rule: 'تا زمان فراهم بودن شرایط دسترسی مستقیم، ارزش بر اساس خیابانی که از آن استفاده می‌شود محاسبه می‌گردد.' },
    { id: 6, title: 'سرا، پاساژ و کاروانسرا', rule: 'بر اساس بالاترین ارزش معاملاتی معبری که از آن منشعب می‌شوند.' },
    { id: 7, title: 'حریم قانونی بدون ارزش تعیین‌شده', rule: 'معادل ۷۰٪ ارزش نزدیک‌ترین محل مشابه، حسب مورد.' },
    { id: 8, title: 'ساختمان مسکونی و اداری بیش از ۵ طبقه', rule: 'از طبقه ششم به بالا، به ازای هر طبقه بالاتر، ۱/۵٪ به ارزش هر مترمربع موضوع ردیف ۲ اضافه می‌شود.' },
    { id: 9, title: 'ساختمان تجاری', rule: 'به ازای هر طبقه بالاتر یا پایین‌تر از همکف، ۱۰٪ و حداکثر ۳۰٪ از ارزش هر مترمربع ردیف تجاری کسر می‌شود.' },
    { id: 10, title: 'پارکینگ و انباری', rule: 'قیمت هر مترمربع ساختمان مربوط ۵۰٪' },
    { id: 11, title: 'قدمت ساختمان', rule: 'به ازای هر سال قدمت، تا سقف ۲۰ سال، ۲٪ از کل ارزش اعیانی کسر می‌شود؛ حداکثر کسر ۴۰٪.' },
    { id: 12, title: 'فضاهای غیرمسقف و مشاعات', rule: 'در محاسبه ارزش اعیانی منظور نمی‌شوند.' },
    { id: 13, title: 'نوساز در بافت فرسوده', rule: 'ساختمان مسکونی نوساز واقع در بافت فرسوده، در اولین نقل و انتقال قطعی و تا ۳ سال از پایان‌کار، معادل ۵۰٪ ارزش تعیین‌شده با رعایت ضوابط.' },
    { id: 14, title: 'پروژه‌های مسکونی حمایتی دولت', rule: 'در اولین نقل و انتقال قطعی، با معرفی وزارت راه و شهرسازی به صورت مکان‌محور، معادل ۵۰٪ ارزش تعیین‌شده.' },
  ],
};

export async function getSetting<T = any>(key: string): Promise<T | null> {
  try {
    const res = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.settingKey, key));
    if (res && res.length > 0) {
      return res[0].settingValue as T;
    }
  } catch (error) {
    console.warn(`Database getSetting failed for ${key}, using memory fallback:`, error);
  }
  return (inMemorySettings[key] as T) || null;
}

export async function getAllSettings(): Promise<Record<string, any>> {
  const result = { ...inMemorySettings };
  try {
    const rows = await db.select().from(systemSettingsTable);
    if (rows && rows.length > 0) {
      for (const row of rows) {
        result[row.settingKey] = row.settingValue;
      }
    }
  } catch (error) {
    console.warn("Database getAllSettings failed, returning memory store:", error);
  }
  return result;
}

export async function saveSetting(key: string, value: any, province = 'سراسری', city = 'سراسری', year = 1403) {
  inMemorySettings[key] = value;
  try {
    const existing = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.settingKey, key));
    if (existing && existing.length > 0) {
      await db.update(systemSettingsTable)
        .set({
          settingValue: value,
          province,
          city,
          year,
          updatedAt: new Date(),
        })
        .where(eq(systemSettingsTable.settingKey, key));
    } else {
      await db.insert(systemSettingsTable).values({
        settingKey: key,
        settingValue: value,
        province,
        city,
        year,
      });
    }
  } catch (error) {
    console.warn(`Database saveSetting failed for ${key}, updated memory store:`, error);
  }
  return { key, value };
}
