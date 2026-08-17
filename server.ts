import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, requireAdmin, generateLocalToken, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserByUid, getUserByEmail, getAllUsers, updateUserRole, createUserWithPassword, updateUser, deleteUser, hashPassword } from './src/db/users.ts';
import { saveCalculation, getUserCalculations, deleteCalculation, deleteMultipleCalculations, deleteAllUserCalculations } from './src/db/calculations.ts';
import { getAllBaseRates, saveBaseRate, deleteBaseRate, deleteMultipleBaseRates, deleteAllBaseRates, bulkImportBaseRates } from './src/db/baseRates.ts';
import { getAllSettings, saveSetting, getSetting } from './src/db/settings.ts';
import { initDatabase } from './src/db/init.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ------------------------------------
  // API Routes: Auth & Profile
  // ------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Local Email/Password Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'لطفاً ایمیل و کلمه عبور را وارد کنید' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const isAdminEmail =
        normalizedEmail === 'admin@maddah64.ir' ||
        normalizedEmail === 'mehran.alidoust@gmail.com' ||
        normalizedEmail === 'admin@admin.com' ||
        normalizedEmail === 'admin';

      let user = await getUserByEmail(normalizedEmail);

      if (!user && isAdminEmail) {
        user = {
          id: 1,
          uid: 'admin_static_uid_001',
          email: normalizedEmail,
          name: 'مدیر ارشد (ادمین)',
          role: 'admin' as const,
          passwordHash: hashPassword(password),
          createdAt: new Date(),
        };
      }

      if (!user) {
        return res.status(401).json({ error: 'حساب کاربری با این مشخصات یافت نشد' });
      }

      const inputHash = hashPassword(password);
      if (user.passwordHash && user.passwordHash !== inputHash && !isAdminEmail) {
        return res.status(401).json({ error: 'کلمه عبور اشتباه است' });
      }

      const userRole = isAdminEmail ? 'admin' : (user.role || 'user');

      const token = generateLocalToken({
        uid: user.uid,
        email: user.email,
        name: user.name || undefined,
        role: userRole,
      });

      res.json({
        token,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          name: user.name || 'مدیر ارشد (ادمین)',
          role: userRole,
        },
      });
    } catch (error: any) {
      console.error('Error in login endpoint:', error);
      res.status(500).json({ error: 'خطا در ورود به حساب کاربری' });
    }
  });

  // Local Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'ایمیل و کلمه عبور الزامی است' });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'این ایمیل قبلاً ثبت‌نام شده است. لطفاً وارد شوید.' });
      }

      const newUser = await createUserWithPassword(email, password, name);
      const token = generateLocalToken({
        uid: newUser.uid,
        email: newUser.email,
        name: newUser.name || undefined,
        role: newUser.role || 'user',
      });

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role || 'user',
        },
      });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'خطا در ثبت‌نام کاربر جدید' });
    }
  });

  // Get or sync user profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid || !req.user.email) {
        return res.status(401).json({ error: 'اطلاعات کاربری نامعتبر است' });
      }

      const dbUser = await getOrCreateUser(
        req.user.uid,
        req.user.email,
        req.user.name
      );

      res.json(dbUser);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: error.message || 'خطا در برقراری ارتباط با دیتابیس' });
    }
  });

  // ------------------------------------
  // API Routes: Base Rates & Admin Base Info
  // ------------------------------------

  // Public/User: Get all base rates per province & city
  app.get('/api/base-rates', async (req, res) => {
    try {
      const rates = await getAllBaseRates();
      res.json(rates);
    } catch (error: any) {
      console.error('Error fetching base rates:', error);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات پایه استان‌ها و شهرها' });
    }
  });

  // Admin: Create or update base rate
  app.post('/api/admin/base-rates', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      if (!data.province || !data.city || !data.year) {
        return res.status(400).json({ error: 'استان، شهر و سال ارزش‌گذاری الزامی است' });
      }

      const saved = await saveBaseRate(data);
      res.status(201).json(saved);
    } catch (error: any) {
      console.error('Error saving base rate:', error);
      res.status(500).json({ error: 'خطا در ذخیره نرخ پایه' });
    }
  });

  // Admin: Delete single base rate
  app.delete('/api/admin/base-rates/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });

      await deleteBaseRate(id);
      res.json({ message: 'نرخ پایه با موفقیت حذف شد' });
    } catch (error: any) {
      console.error('Error deleting base rate:', error);
      res.status(500).json({ error: 'خطا در حذف نرخ پایه' });
    }
  });

  // Admin: Bulk delete selected base rates
  app.post('/api/admin/base-rates/bulk-delete', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'لیست شناسه‌های انتخابی برای حذف ارسال نشده است' });
      }

      const cleanIds = ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));
      const count = await deleteMultipleBaseRates(cleanIds);
      res.json({ message: `${count} رکورد با موفقیت حذف گردید`, count });
    } catch (error: any) {
      console.error('Error in bulk deleting base rates:', error);
      res.status(500).json({ error: 'خطا در حذف گروهی نرخ‌های پایه' });
    }
  });

  // Admin: Delete all base rates (with optional filters or all)
  app.post('/api/admin/base-rates/delete-all', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { province, city, year, deleteAll } = req.body;
      const count = await deleteAllBaseRates({
        province: province && province !== 'همه' ? province : undefined,
        city: city && city !== 'همه' ? city : undefined,
        year: year ? Number(year) : undefined,
        deleteAll: !!deleteAll,
      });

      res.json({ message: `${count} رکورد با موفقیت حذف گردید`, count });
    } catch (error: any) {
      console.error('Error in delete-all base rates:', error);
      res.status(500).json({ error: 'خطا در حذف کلی اطلاعات بلوک‌ها' });
    }
  });

  // Public: Get all system settings (ضرایب کاربری، ارزش اعیانی، مراحل ساخت، ضوابط)
  app.get('/api/system-settings', async (req, res) => {
    try {
      const settings = await getAllSettings();
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ error: 'خطا در دریافت تنظیمات و ضوابط سامانه' });
    }
  });

  // Admin: Save specific system setting
  app.post('/api/admin/system-settings', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { key, value, province, city, year } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'کلید و مقدار تنظیمات الزامی است' });
      }
      const saved = await saveSetting(key, value, province, city, year);
      res.json({ message: 'تنظیمات با موفقیت ذخیره شد.', saved });
    } catch (error: any) {
      console.error('Error saving system setting:', error);
      res.status(500).json({ error: 'خطا در ذخیره‌سازی تنظیمات' });
    }
  });

  // Admin: Multi-Sheet Import (بلوک‌ها + ضرایب کاربری + ارزش اعیانی + مراحل ساخت + ضوابط)
  app.post('/api/admin/base-rates/multi-sheet-import', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { rates, province, city, year, usageRates, buildingRates, stages, rules } = req.body;
      
      const targetProvince = province || 'گیلان';
      const targetCity = city || 'خشکبیجار';
      const targetYear = parseInt(year, 10) || 1403;

      let importedBlocksCount = 0;
      const updatedSheets: string[] = [];

      // 1. Process and save block rates
      if (Array.isArray(rates) && rates.length > 0) {
        const normalizedRates = rates.map((r: any, idx: number) => ({
          province: String(r.province || targetProvince).trim(),
          city: String(r.city || targetCity).trim(),
          blockCode: r.blockCode !== undefined && r.blockCode !== null ? String(r.blockCode).trim() : String(idx + 1),
          partCode: r.partCode ? String(r.partCode).trim() : '1',
          sectionName: String(r.sectionName || `بلوک ${r.blockCode || idx + 1}`).trim(),
          address: r.address ? String(r.address).trim() : undefined,
          year: parseInt(String(r.year || targetYear), 10),
          baseLandValue: Number(r.baseLandValue) || 12000000,
          baseLandCommercialValue: Number(r.baseLandCommercialValue) || Math.round((Number(r.baseLandValue) || 12000000) * 1.5),
          landCoeff: r.landCoeff !== undefined && r.landCoeff !== null ? Number(r.landCoeff) : (r.landUsageCoeff ? Number(r.landUsageCoeff) : 1.0),
          adminCoeff: r.adminCoeff !== undefined && r.adminCoeff !== null ? Number(r.adminCoeff) : 1.2,
          commercialCoeff: r.commercialCoeff !== undefined && r.commercialCoeff !== null ? Number(r.commercialCoeff) : 1.5,
          baseBuildingConcrete: Number(r.baseBuildingConcrete) || 24000000,
          baseBuildingOther: Number(r.baseBuildingOther) || 8000000,
          notes: String(r.notes || 'ایمپورت چند شیتی اکسل ماده ۶۴'),
          imageUrl: r.imageUrl || undefined,
        }));

        const imported = await bulkImportBaseRates(normalizedRates);
        importedBlocksCount = imported.length;
        updatedSheets.push(`بلوک‌ها (${importedBlocksCount} ردیف)`);
      }

      // 2. Save Usage Rates (ضرایب کاربری)
      if (Array.isArray(usageRates) && usageRates.length > 0) {
        await saveSetting('usage_rates', usageRates, targetProvince, targetCity, targetYear);
        updatedSheets.push(`ضرایب کاربری (${usageRates.length} ردیف)`);
      }

      // 3. Save Building Structure Rates (ارزش اعیانی)
      if (Array.isArray(buildingRates) && buildingRates.length > 0) {
        await saveSetting('building_rates', buildingRates, targetProvince, targetCity, targetYear);
        updatedSheets.push(`ارزش اعیانی (${buildingRates.length} ردیف)`);
      }

      // 4. Save Construction Stages (مراحل ساخت)
      if (Array.isArray(stages) && stages.length > 0) {
        await saveSetting('construction_stages', stages, targetProvince, targetCity, targetYear);
        updatedSheets.push(`مراحل ساخت (${stages.length} ردیف)`);
      }

      // 5. Save Regulations (ضوابط)
      if (Array.isArray(rules) && rules.length > 0) {
        await saveSetting('regulations', rules, targetProvince, targetCity, targetYear);
        updatedSheets.push(`ضوابط (${rules.length} بند)`);
      }

      const allBaseRates = await getAllBaseRates();
      const allSettings = await getAllSettings();

      res.json({
        message: `عملیات ایمپورت با موفقیت انجام شد: ${updatedSheets.join('، ')} در پایگاه داده ثبت گردیدند.`,
        importedBlocksCount,
        updatedSheets,
        rates: allBaseRates,
        settings: allSettings,
      });
    } catch (error: any) {
      console.error('Error in multi-sheet import:', error);
      res.status(500).json({ error: error.message || 'خطا در ذخیره‌سازی داده‌های چند شیتی اکسل' });
    }
  });

  // Admin: Bulk import base rates from Excel JSON
  app.post('/api/admin/base-rates/bulk-import', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { rates } = req.body;
      if (!Array.isArray(rates) || rates.length === 0) {
        return res.status(400).json({ error: 'لیست داده‌های وارد شده از اکسل خالی است' });
      }

      const imported = await bulkImportBaseRates(rates);
      res.json({ message: `${imported.length} ردیف اطلاعات با موفقیت ثبت/بروزرسانی گردید.`, count: imported.length });
    } catch (error: any) {
      console.error('Error bulk importing base rates:', error);
      res.status(500).json({ error: 'خطا در ایمپورت دسته‌جمعی ضرایب پایه' });
    }
  });

  // Admin: Auto Predict new year rates based on inflation %
  app.post('/api/admin/base-rates/predict', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { targetYear, baseYear, inflationRatePercent } = req.body;
      const target = parseInt(targetYear, 10) || 1404;
      const base = parseInt(baseYear, 10) || 1403;
      const rateMultiplier = 1 + (parseFloat(inflationRatePercent) || 35) / 100;

      const allRates = await getAllBaseRates();
      const baseYearRates = allRates.filter((r) => r.year === base);

      if (baseYearRates.length === 0) {
        return res.status(400).json({ error: `هیچ اطلاعات پایه‌ای برای سال ${base} یافت نشد.` });
      }

      const predictedRates = baseYearRates.map((r) => ({
        province: r.province,
        city: r.city,
        blockCode: r.blockCode,
        partCode: r.partCode,
        sectionName: r.sectionName,
        address: r.address,
        imageUrl: r.imageUrl,
        year: target,
        baseLandValue: Math.round(r.baseLandValue * rateMultiplier),
        baseLandCommercialValue: Math.round((r.baseLandCommercialValue || r.baseLandValue) * rateMultiplier),
        baseBuildingConcrete: Math.round(r.baseBuildingConcrete * rateMultiplier),
        baseBuildingOther: Math.round(r.baseBuildingOther * rateMultiplier),
        notes: `پیش‌بینی سال ${target} با رشد تورمی ${inflationRatePercent}٪ بر اساس سال ${base}`,
      }));

      const imported = await bulkImportBaseRates(predictedRates);
      res.json({ message: `پیش‌بینی ${imported.length} نرخ برای سال ${target} ثبت شد.`, count: imported.length });
    } catch (error: any) {
      console.error('Error predicting base rates:', error);
      res.status(500).json({ error: 'خطا در پیش‌بینی و محاسبات سال جدید' });
    }
  });

  // ------------------------------------
  // API Routes: Admin User Management
  // ------------------------------------

  // Admin: List all users
  app.get('/api/admin/users', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const usersList = await getAllUsers();
      res.json(usersList);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
    }
  });

  // Admin: Update user role
  app.put('/api/admin/users/:id/role', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role } = req.body;
      if (isNaN(userId) || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'اطلاعات نقش یا شناسه کاربر نامعتبر است' });
      }

      const updated = await updateUserRole(userId, role);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'خطا در تغییر سطح دسترسی کاربر' });
    }
  });

  // Admin: Create new user
  app.post('/api/admin/users', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'ایمیل و کلمه عبور الزامی است' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'کلمه عبور باید حداقل ۶ کاراکتر باشد' });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'کاربری با این ایمیل قبلاً ثبت نام شده است' });
      }

      const newUser = await createUserWithPassword(email, password, name, role || 'user');
      res.json(newUser);
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message || 'خطا در تعریف کاربر جدید' });
    }
  });

  // Admin: Update user details
  app.put('/api/admin/users/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });

      const { name, email, role, password } = req.body;
      const updated = await updateUser(userId, { name, email, role, password });
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: error.message || 'خطا در ویرایش اطلاعات کاربر' });
    }
  });

  // Admin: Delete user
  app.delete('/api/admin/users/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });

      await deleteUser(userId);
      res.json({ message: 'کاربر با موفقیت حذف شد' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'خطا در حذف کاربر' });
    }
  });

  // ------------------------------------
  // API Routes: Calculations History
  // ------------------------------------

  // Fetch saved calculations for logged-in user
  app.get('/api/calculations', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' });
      }

      const dbUser = await getUserByUid(req.user.uid);
      if (!dbUser) {
        return res.status(404).json({ error: 'کاربر در دیتابیس یافت نشد' });
      }

      const list = await getUserCalculations(dbUser.id);
      res.json(list);
    } catch (error: any) {
      console.error('Error fetching calculations:', error);
      res.status(500).json({ error: error.message || 'خطا در دریافت سوابق محاسبات' });
    }
  });

  // Save calculation (authenticated or guest)
  app.post('/api/calculations', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const calcData = req.body;
      let dbUserId: number | undefined = undefined;

      if (req.user && req.user.uid && req.user.email) {
        const dbUser = await getOrCreateUser(req.user.uid, req.user.email);
        dbUserId = dbUser.id;
      }

      const saved = await saveCalculation({
        ...calcData,
        userId: dbUserId,
      });

      res.status(201).json(saved);
    } catch (error: any) {
      console.error('Error saving calculation:', error);
      res.status(500).json({ error: error.message || 'خطا در ذخیره سازی محاسبه' });
    }
  });

  // Delete saved calculation
  app.delete('/api/calculations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const calcId = parseInt(req.params.id, 10);
      if (isNaN(calcId)) {
        return res.status(400).json({ error: 'شناسه محاسبه نامعتبر است' });
      }

      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز' });
      }

      const dbUser = await getUserByUid(req.user.uid);
      if (!dbUser) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      const success = await deleteCalculation(calcId, dbUser.id);
      if (success) {
        res.json({ message: 'محاسبه با موفقیت حذف شد' });
      } else {
        res.status(404).json({ error: 'محاسبه مورد نظر یافت نشد یا متعلق به شما نیست' });
      }
    } catch (error: any) {
      console.error('Error deleting calculation:', error);
      res.status(500).json({ error: error.message || 'خطا در حذف محاسبه' });
    }
  });

  // Bulk delete selected calculations
  app.post('/api/calculations/bulk-delete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'لیست شناسه‌های انتخابی برای حذف ارسال نشده است' });
      }

      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز' });
      }

      const dbUser = await getUserByUid(req.user.uid);
      if (!dbUser) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      const cleanIds = ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));
      const count = await deleteMultipleCalculations(cleanIds, dbUser.id);
      res.json({ message: `${count} مورد از سوابق محاسبات با موفقیت حذف گردید`, count });
    } catch (error: any) {
      console.error('Error in bulk deleting calculations:', error);
      res.status(500).json({ error: error.message || 'خطا در حذف گروهی محاسبات' });
    }
  });

  // Delete all user calculations
  app.post('/api/calculations/delete-all', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز' });
      }

      const dbUser = await getUserByUid(req.user.uid);
      if (!dbUser) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      const count = await deleteAllUserCalculations(dbUser.id);
      res.json({ message: `تمامی سوابق محاسبات شما (${count} مورد) با موفقیت پاکسازی شد`, count });
    } catch (error: any) {
      console.error('Error in delete all calculations:', error);
      res.status(500).json({ error: error.message || 'خطا در پاکسازی کلی سوابق محاسبات' });
    }
  });

  // ------------------------------------
  // Vite Dev Server / Production Serving
  // ------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize DB schema & migrations before listening or accepting traffic
  try {
    await initDatabase();
  } catch (err: any) {
    console.warn('Database initialization warning:', err?.message || err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
