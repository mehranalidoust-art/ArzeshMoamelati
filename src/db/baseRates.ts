import { db } from './index.ts';
import { baseRates } from './schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { BaseRateItem } from '../types.ts';
import { DEFAULT_FALLBACK_RATES } from '../data/defaultBaseRates.ts';

// In-memory fallback cache initialized with default rates
let inMemoryBaseRates: BaseRateItem[] = [...DEFAULT_FALLBACK_RATES];
let nextMemoryId = 2000;

export async function getAllBaseRates(): Promise<BaseRateItem[]> {
  try {
    const list = await db.select().from(baseRates).orderBy(desc(baseRates.year), baseRates.province, baseRates.city);
    if (Array.isArray(list)) {
      inMemoryBaseRates = list;
      return list;
    }
    return inMemoryBaseRates;
  } catch (error) {
    console.warn("Using fallback base rates as database is unreachable:", error);
    return inMemoryBaseRates;
  }
}

export async function getBaseRateByLocation(province: string, city: string, year: number, blockCode?: string, partCode?: string) {
  try {
    const conditions = [
      eq(baseRates.province, province),
      eq(baseRates.city, city),
      eq(baseRates.year, year),
    ];
    if (blockCode) conditions.push(eq(baseRates.blockCode, blockCode));
    if (partCode) conditions.push(eq(baseRates.partCode, partCode));

    const result = await db.select().from(baseRates).where(and(...conditions));
    if (result && result.length > 0) return result[0];
  } catch (error) {
    console.warn("Failed to fetch base rate from DB by location:", error);
  }

  // Fallback to in-memory store
  return inMemoryBaseRates.find((r) => {
    const matchLoc = r.province === province && r.city === city && r.year === year;
    if (!matchLoc) return false;
    if (blockCode && r.blockCode && r.blockCode !== blockCode) return false;
    if (partCode && r.partCode && r.partCode !== partCode) return false;
    return true;
  }) || null;
}

export async function saveBaseRate(rate: Omit<BaseRateItem, 'id' | 'updatedAt'> & { id?: number }): Promise<BaseRateItem> {
  const cleanData = {
    province: String(rate.province || '').trim(),
    city: String(rate.city || '').trim(),
    blockCode: rate.blockCode ? String(rate.blockCode).trim() : null,
    partCode: rate.partCode ? String(rate.partCode).trim() : null,
    sectionName: rate.sectionName ? String(rate.sectionName).trim() : null,
    address: rate.address ? String(rate.address).trim() : null,
    imageUrl: rate.imageUrl ? String(rate.imageUrl).trim() : null,
    year: Number(rate.year) || 1403,
    baseLandValue: Number(rate.baseLandValue) || 0,
    baseLandCommercialValue: Number(rate.baseLandCommercialValue) || Number(rate.baseLandValue) || 0,
    landCoeff: rate.landCoeff !== undefined && rate.landCoeff !== null ? Number(rate.landCoeff) : null,
    adminCoeff: rate.adminCoeff !== undefined && rate.adminCoeff !== null ? Number(rate.adminCoeff) : null,
    commercialCoeff: rate.commercialCoeff !== undefined && rate.commercialCoeff !== null ? Number(rate.commercialCoeff) : null,
    baseBuildingConcrete: Number(rate.baseBuildingConcrete) || 0,
    baseBuildingOther: Number(rate.baseBuildingOther) || 0,
    notes: String(rate.notes || ''),
  };

  let savedItem: BaseRateItem | null = null;

  // Try DB first
  try {
    if (rate.id) {
      const updated = await db.update(baseRates)
        .set({
          ...cleanData,
          updatedAt: new Date(),
        })
        .where(eq(baseRates.id, rate.id))
        .returning();

      if (updated && updated.length > 0) {
        savedItem = updated[0];
      }
    }

    if (!savedItem) {
      // If no ID or DB update returned 0 rows (e.g. fallback ID not in DB), insert as new row
      const inserted = await db.insert(baseRates)
        .values(cleanData)
        .returning();

      if (inserted && inserted.length > 0) {
        savedItem = inserted[0];
      }
    }
  } catch (error) {
    console.warn("Database save failed, using in-memory store fallback:", error);
  }

  // Fallback or memory cache sync
  if (savedItem) {
    const existingIndex = inMemoryBaseRates.findIndex((r) => r.id === savedItem!.id);
    if (existingIndex >= 0) {
      inMemoryBaseRates[existingIndex] = savedItem;
    } else {
      inMemoryBaseRates.unshift(savedItem);
    }
    return savedItem;
  }

  // Complete in-memory fallback if DB was unreachable or failed
  const targetId = rate.id || ++nextMemoryId;
  const memoryResult: BaseRateItem = {
    id: targetId,
    ...cleanData,
    blockCode: cleanData.blockCode || undefined,
    partCode: cleanData.partCode || undefined,
    sectionName: cleanData.sectionName || undefined,
    address: cleanData.address || undefined,
    imageUrl: cleanData.imageUrl || undefined,
    landCoeff: cleanData.landCoeff || undefined,
    adminCoeff: cleanData.adminCoeff || undefined,
    commercialCoeff: cleanData.commercialCoeff || undefined,
    updatedAt: new Date(),
  };

  const existingIdx = inMemoryBaseRates.findIndex((r) => r.id === targetId);
  if (existingIdx >= 0) {
    inMemoryBaseRates[existingIdx] = memoryResult;
  } else {
    inMemoryBaseRates.unshift(memoryResult);
  }

  return memoryResult;
}

export async function deleteBaseRate(id: number): Promise<boolean> {
  // Update in-memory store
  inMemoryBaseRates = inMemoryBaseRates.filter((r) => r.id !== id);

  try {
    await db.delete(baseRates).where(eq(baseRates.id, id));
  } catch (error) {
    console.warn("Database delete failed, removed from memory store:", error);
  }

  return true;
}

export async function deleteMultipleBaseRates(ids: number[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  const idSet = new Set(ids);
  inMemoryBaseRates = inMemoryBaseRates.filter((r) => !idSet.has(r.id));

  try {
    await db.delete(baseRates).where(inArray(baseRates.id, ids));
  } catch (error) {
    console.warn("Database multiple delete failed, removed from memory store:", error);
  }

  return ids.length;
}

export async function deleteAllBaseRates(options?: { province?: string; city?: string; year?: number; deleteAll?: boolean }): Promise<number> {
  const { province, city, year, deleteAll } = options || {};

  if (deleteAll || (!province && !city && !year)) {
    const total = inMemoryBaseRates.length;
    inMemoryBaseRates = [];
    try {
      await db.delete(baseRates);
    } catch (error) {
      console.warn("Database delete all failed, cleared memory store:", error);
    }
    return total;
  }

  const conditions = [];
  if (province && province !== 'همه') conditions.push(eq(baseRates.province, province));
  if (city && city !== 'همه') conditions.push(eq(baseRates.city, city));
  if (year) conditions.push(eq(baseRates.year, year));

  // Filter in-memory
  const beforeLen = inMemoryBaseRates.length;
  inMemoryBaseRates = inMemoryBaseRates.filter((r) => {
    const matchProv = !province || province === 'همه' || r.province === province;
    const matchCity = !city || city === 'همه' || r.city === city;
    const matchYear = !year || r.year === year;
    return !(matchProv && matchCity && matchYear);
  });
  const deletedCount = beforeLen - inMemoryBaseRates.length;

  try {
    if (conditions.length > 0) {
      await db.delete(baseRates).where(and(...conditions));
    } else {
      await db.delete(baseRates);
    }
  } catch (error) {
    console.warn("Database filtered delete all failed:", error);
  }

  return deletedCount;
}

export async function bulkImportBaseRates(rates: Array<Omit<BaseRateItem, 'id' | 'updatedAt'>>) {
  const results = [];
  for (const item of rates) {
    const existing = await getBaseRateByLocation(item.province, item.city, item.year, item.blockCode, item.partCode);
    if (existing) {
      const updated = await saveBaseRate({ ...item, id: existing.id });
      results.push(updated);
    } else {
      const created = await saveBaseRate(item);
      results.push(created);
    }
  }
  return results;
}

