import { db } from './index.ts';
import { calculations, users } from './schema.ts';
import { eq, desc, and, inArray } from 'drizzle-orm';

export interface CalculationInput {
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
}

export async function saveCalculation(input: CalculationInput) {
  try {
    const result = await db.insert(calculations)
      .values(input)
      .returning();
    return result[0];
  } catch (error) {
    console.error("Failed to save calculation:", error);
    throw new Error("Failed to save calculation to database", { cause: error });
  }
}

export async function getUserCalculations(dbUserId: number) {
  try {
    return await db.select()
      .from(calculations)
      .where(eq(calculations.userId, dbUserId))
      .orderBy(desc(calculations.createdAt));
  } catch (error) {
    console.error("Failed to fetch user calculations:", error);
    throw new Error("Failed to retrieve calculations", { cause: error });
  }
}

export async function deleteCalculation(id: number, dbUserId: number) {
  try {
    const result = await db.delete(calculations)
      .where(and(eq(calculations.id, id), eq(calculations.userId, dbUserId)))
      .returning();
    return result.length > 0;
  } catch (error) {
    console.error("Failed to delete calculation:", error);
    throw new Error("Failed to delete calculation record", { cause: error });
  }
}

export async function deleteMultipleCalculations(ids: number[], dbUserId: number): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  try {
    const result = await db.delete(calculations)
      .where(and(inArray(calculations.id, ids), eq(calculations.userId, dbUserId)))
      .returning();
    return result.length;
  } catch (error) {
    console.error("Failed to bulk delete calculations:", error);
    throw new Error("Failed to bulk delete calculations", { cause: error });
  }
}

export async function deleteAllUserCalculations(dbUserId: number): Promise<number> {
  try {
    const result = await db.delete(calculations)
      .where(eq(calculations.userId, dbUserId))
      .returning();
    return result.length;
  } catch (error) {
    console.error("Failed to delete all user calculations:", error);
    throw new Error("Failed to delete all calculations", { cause: error });
  }
}
