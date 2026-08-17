import { relations } from 'drizzle-orm';
import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// System settings table
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  province: text('province').default('سراسری'),
  city: text('city').default('سراسری'),
  year: integer('year').default(1403),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: jsonb('setting_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users table synced with Firebase Auth or local email/pass
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or local UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('user'), // 'admin' | 'user'
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Base regional valuation rates per province, city & year (اطلاعات پایه)
export const baseRates = pgTable('base_rates', {
  id: serial('id').primaryKey(),
  province: text('province').notNull(),
  city: text('city').notNull(),
  blockCode: text('block_code'),
  partCode: text('part_code'),
  sectionName: text('section_name'),
  address: text('address'),
  imageUrl: text('image_url'),
  year: integer('year').notNull(), // e.g. 1403, 1404
  baseLandValue: doublePrecision('base_land_value').notNull(), // P_L residential
  baseLandCommercialValue: doublePrecision('base_land_commercial_value'),
  landCoeff: doublePrecision('land_coeff'), // ضریب عرصه
  adminCoeff: doublePrecision('admin_coeff'), // ضریب اداری
  commercialCoeff: doublePrecision('commercial_coeff'), // ضریب تجاری
  baseBuildingConcrete: doublePrecision('base_building_concrete').notNull(), // Concrete/steel structure
  baseBuildingOther: doublePrecision('base_building_other').notNull(), // Other structure
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Saved regional value calculations table
export const calculations = pgTable('calculations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  province: text('province').default('تهران'),
  city: text('city').default('تهران'),
  blockCode: text('block_code'),
  partCode: text('part_code'),
  sectionName: text('section_name'),
  address: text('address'),
  imageUrl: text('image_url'),
  
  // Land (عرصه) parameters
  landArea: doublePrecision('land_area').notNull(),
  baseLandValue: doublePrecision('base_land_value').notNull(), // P_L per m2 in Rials
  landUsage: text('land_usage').notNull(),
  landUsageCoeff: doublePrecision('land_usage_coeff').notNull(),
  streetWidth: doublePrecision('street_width').notNull(),
  streetWidthCoeff: doublePrecision('street_width_coeff').notNull(),
  landSpecialCondition: text('land_special_condition').default('none'),
  landSpecialCoeff: doublePrecision('land_special_coeff').default(1.0),
  totalLandValue: doublePrecision('total_land_value').notNull(),

  // Building (اعیانی) parameters
  hasBuilding: boolean('has_building').default(true),
  buildingArea: doublePrecision('building_area').default(0),
  structureType: text('structure_type').default('concrete_steel'), // 'concrete_steel' | 'other'
  buildingUsage: text('building_usage').default('residential_admin'),
  baseBuildingValue: doublePrecision('base_building_value').default(0), // P_B per m2 in Rials
  floorNumber: integer('floor_number').default(0),
  floorCoeff: doublePrecision('floor_coeff').default(1.0),
  buildingAge: integer('building_age').default(0),
  ageCoeff: doublePrecision('age_coeff').default(1.0),
  completionStage: text('completion_stage').default('completed'), // 'foundation' | 'frame' | 'rough' | 'finishing' | 'completed'
  completionCoeff: doublePrecision('completion_coeff').default(1.0),
  isDistressed: boolean('is_distressed').default(false),
  isGovernmentHousing: boolean('is_government_housing').default(false),
  totalBuildingValue: doublePrecision('total_building_value').default(0),

  // Summary
  grandTotalValue: doublePrecision('grand_total_value').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  calculations: many(calculations),
}));

export const calculationsRelations = relations(calculations, ({ one }) => ({
  user: one(users, {
    fields: [calculations.userId],
    references: [users.id],
  }),
}));
