import { createPool } from './index.ts';
import { hashPassword } from './users.ts';

export async function initDatabase() {
  if (!process.env.SQL_HOST && !process.env.DATABASE_URL && !process.env.SQL_USER && !process.env.SQL_DB_NAME) {
    console.log('No SQL_HOST, DATABASE_URL, or SQL_USER provided. Running with in-memory storage fallback.');
    return;
  }

  const pool = createPool();
  try {
    // 1. Ensure users table exists with role and password_hash
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure missing columns on users if table already existed
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    // 2. Ensure base_rates table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS base_rates (
        id SERIAL PRIMARY KEY,
        province TEXT NOT NULL,
        city TEXT NOT NULL,
        block_code TEXT,
        part_code TEXT,
        section_name TEXT,
        address TEXT,
        image_url TEXT,
        year INTEGER NOT NULL,
        base_land_value DOUBLE PRECISION NOT NULL,
        base_land_commercial_value DOUBLE PRECISION,
        land_coeff DOUBLE PRECISION,
        admin_coeff DOUBLE PRECISION,
        commercial_coeff DOUBLE PRECISION,
        base_building_concrete DOUBLE PRECISION NOT NULL,
        base_building_other DOUBLE PRECISION NOT NULL,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all block & part columns exist on base_rates
    await pool.query(`
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS block_code TEXT;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS part_code TEXT;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS section_name TEXT;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS land_coeff DOUBLE PRECISION;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS admin_coeff DOUBLE PRECISION;
      ALTER TABLE base_rates ADD COLUMN IF NOT EXISTS commercial_coeff DOUBLE PRECISION;
    `);

    // 3. Ensure calculations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        province TEXT DEFAULT 'تهران',
        city TEXT DEFAULT 'تهران',
        block_code TEXT,
        part_code TEXT,
        section_name TEXT,
        address TEXT,
        image_url TEXT,
        land_area DOUBLE PRECISION NOT NULL,
        base_land_value DOUBLE PRECISION NOT NULL,
        land_usage TEXT NOT NULL,
        land_usage_coeff DOUBLE PRECISION NOT NULL,
        street_width DOUBLE PRECISION NOT NULL,
        street_width_coeff DOUBLE PRECISION NOT NULL,
        land_special_condition TEXT DEFAULT 'none',
        land_special_coeff DOUBLE PRECISION DEFAULT 1.0,
        total_land_value DOUBLE PRECISION NOT NULL,
        has_building BOOLEAN DEFAULT TRUE,
        building_area DOUBLE PRECISION DEFAULT 0,
        structure_type TEXT DEFAULT 'concrete_steel',
        building_usage TEXT DEFAULT 'residential_admin',
        base_building_value DOUBLE PRECISION DEFAULT 0,
        floor_number INTEGER DEFAULT 0,
        floor_coeff DOUBLE PRECISION DEFAULT 1.0,
        building_age INTEGER DEFAULT 0,
        age_coeff DOUBLE PRECISION DEFAULT 1.0,
        completion_stage TEXT DEFAULT 'completed',
        completion_coeff DOUBLE PRECISION DEFAULT 1.0,
        is_distressed BOOLEAN DEFAULT FALSE,
        is_government_housing BOOLEAN DEFAULT FALSE,
        total_building_value DOUBLE PRECISION DEFAULT 0,
        grand_total_value DOUBLE PRECISION NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all block & part columns exist on calculations
    await pool.query(`
      ALTER TABLE calculations ADD COLUMN IF NOT EXISTS block_code TEXT;
      ALTER TABLE calculations ADD COLUMN IF NOT EXISTS part_code TEXT;
      ALTER TABLE calculations ADD COLUMN IF NOT EXISTS section_name TEXT;
      ALTER TABLE calculations ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE calculations ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    // 3.1. Ensure system_settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        province TEXT DEFAULT 'سراسری',
        city TEXT DEFAULT 'سراسری',
        year INTEGER DEFAULT 1403,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Seed Default Admin User
    const adminEmail = 'admin@maddah64.ir';
    const adminPassHash = hashPassword('admin123456');
    const adminUid = 'local_admin_default';

    await pool.query(`
      INSERT INTO users (uid, email, name, role, password_hash)
      VALUES ($1, $2, 'مدیر ارشد سامانه', 'admin', $3)
      ON CONFLICT (uid) DO UPDATE
      SET role = 'admin', password_hash = $3;
    `, [adminUid, adminEmail, adminPassHash]);

    // Also upgrade user's email if registered via Google
    await pool.query(`
      UPDATE users SET role = 'admin' WHERE email IN ('admin@maddah64.ir', 'mehran.alidoust@gmail.com');
    `);

    // 5. Seed Initial Iranian Base Rates (only once during initial database setup)
    const seedCheck = await pool.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'initial_seed_rates_done';`);
    const hasAlreadySeeded = seedCheck.rows.length > 0;

    if (!hasAlreadySeeded) {
      const checkCount = await pool.query(`SELECT COUNT(*) FROM base_rates;`);
      if (parseInt(checkCount.rows[0].count, 10) === 0) {
        const initialRates = [
          { province: 'تهران', city: 'تهران - منطقه ۱', year: 1403, land: 750000000, landComm: 1200000000, conc: 35000000, other: 12000000 },
          { province: 'تهران', city: 'تهران - منطقه ۳', year: 1403, land: 550000000, landComm: 900000000, conc: 28500000, other: 9500000 },
          { province: 'تهران', city: 'تهران - منطقه ۶', year: 1403, land: 420000000, landComm: 700000000, conc: 25000000, other: 8500000 },
          { province: 'تهران', city: 'تهران - منطقه ۱۲', year: 1403, land: 280000000, landComm: 450000000, conc: 22000000, other: 7500000 },
          { province: 'تهران', city: 'تهران - منطقه ۲۰', year: 1403, land: 180000000, landComm: 300000000, conc: 20000000, other: 6500000 },
          
          { province: 'اصفهان', city: 'اصفهان - مرکز', year: 1403, land: 220000000, landComm: 380000000, conc: 22000000, other: 7500000 },
          { province: 'اصفهان', city: 'اصفهان - منطقه ۵', year: 1403, land: 310000000, landComm: 500000000, conc: 24000000, other: 8000000 },
          
          { province: 'فارس', city: 'شیراز - منطقه ۱ (ارم)', year: 1403, land: 320000000, landComm: 550000000, conc: 24000000, other: 8000000 },
          { province: 'فارس', city: 'شیراز - مرکز', year: 1403, land: 210000000, landComm: 350000000, conc: 21000000, other: 7000000 },
          
          { province: 'خراسان رضوی', city: 'مشهد - منطقه ثامن (حرم)', year: 1403, land: 380000000, landComm: 750000000, conc: 26000000, other: 8500000 },
          { province: 'خراسان رضوی', city: 'مشهد - احمدآباد', year: 1403, land: 340000000, landComm: 600000000, conc: 25000000, other: 8000000 },
          
          { province: 'آذربایجان شرقی', city: 'تبریز - ولیعصر', year: 1403, land: 290000000, landComm: 480000000, conc: 23000000, other: 7800000 },
          { province: 'البرز', city: 'کرج - جهان‌شهر', year: 1403, land: 300000000, landComm: 500000000, conc: 24000000, other: 8000000 },
          { province: 'خوزستان', city: 'اهواز - کیانپارس', year: 1403, land: 250000000, landComm: 420000000, conc: 22000000, other: 7500000 },
          { province: 'مازندران', city: 'ساری - مرکز', year: 1403, land: 190000000, landComm: 320000000, conc: 21000000, other: 7000000 },
          { province: 'گیلان', city: 'رشت - گلسار', year: 1403, land: 270000000, landComm: 450000000, conc: 23000000, other: 7800000 },
          { province: 'قم', city: 'قم - صفائیه', year: 1403, land: 200000000, landComm: 340000000, conc: 21000000, other: 7000000 },
        ];

        for (const r of initialRates) {
          await pool.query(`
            INSERT INTO base_rates (province, city, year, base_land_value, base_land_commercial_value, base_building_concrete, base_building_other, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ضرایب پایه مصوب اولیه');
          `, [r.province, r.city, r.year, r.land, r.landComm, r.conc, r.other]);

          // Also seed projected 1404 (+35% inflation)
          await pool.query(`
            INSERT INTO base_rates (province, city, year, base_land_value, base_land_commercial_value, base_building_concrete, base_building_other, notes)
            VALUES ($1, $2, 1404, $3, $4, $5, $6, 'پیش‌بینی سال ۱۴۰۴ (+۳۵٪ تورم)');
          `, [r.province, r.city, Math.round(r.land * 1.35), Math.round(r.landComm * 1.35), Math.round(r.conc * 1.35), Math.round(r.other * 1.35)]);
        }
        console.log('Successfully seeded initial regional base rates!');
      }

      await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ('initial_seed_rates_done', '{"seeded": true}'::jsonb)
        ON CONFLICT (setting_key) DO NOTHING;
      `);
    }

    // 6. Ensure system_settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        province TEXT DEFAULT 'سراسری',
        city TEXT DEFAULT 'سراسری',
        year INTEGER DEFAULT 1403,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure Khoshkebijar 1403 blocks are seeded in database
    const checkKhoshk = await pool.query(`SELECT COUNT(*) FROM base_rates WHERE city = 'خشکبیجار' AND year = 1403;`);
    if (parseInt(checkKhoshk.rows[0].count, 10) === 0) {
      const khoshkBlocks = [
        { block: '1', name: 'از میدان شهرداری تا میدان شهید رجبعلی محمدی، بانضمام خیابان منتظری', land: 12000000, landComm: 17500000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۱۴,۲۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۱۷,۵۰۰,۰۰۰ ریال)' },
        { block: '2', name: 'از میدان شهید رجبعلی محمدی تا انتهای محدوده بخش خشکبیجار به سمت خمام، بانضمام خیابان آیت‌الله سعیدی و خیابان شهید حسن فهمیده', land: 5500000, landComm: 8200000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۶,۵۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۸,۲۰۰,۰۰۰ ریال)' },
        { block: '3', name: 'از چهارراه شهید رضائی تا میدان شهید محسن نوشاددل', land: 2400000, landComm: 3700000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۲,۹۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۳,۷۰۰,۰۰۰ ریال)' },
        { block: '4', name: 'از دانشگاه پیام نور تا چهارراه شهید رضائی، بانضمام خیابان صاحب‌الزمان و خیابان آیت‌الله مدرس', land: 1900000, landComm: 2700000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۲,۲۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۲,۷۰۰,۰۰۰ ریال)' },
        { block: '5', name: 'از میدان شهید مظلومی تا میدان شهرداری، بانضمام خیابان شریعتی', land: 7400000, landComm: 11000000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۸,۹۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۱۱,۰۰۰,۰۰۰ ریال)' },
        { block: '6', name: 'از ابتدای محدوده بخش خشکبیجار از سمت لشت‌نشا (چهارراه رودپشت) تا دانشگاه پیام نور و روستاهای ضلع جنوبی جاده اصلی لشت‌نشا به خشکبیجار از قبیل مریدان، فرشم پایین و بالا و کوریجان', land: 2200000, landComm: 3200000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۲,۵۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۳,۲۰۰,۰۰۰ ریال)' },
        { block: '7', name: 'از میدان شهید محسن نوشاددل تا میدان شهید مظلومی، بانضمام بلوار ساحل', land: 6200000, landComm: 9200000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۷,۴۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۹,۲۰۰,۰۰۰ ریال)' },
        { block: '8', name: 'روستاهای واقع در ضلع شمالی جاده اصلی لشت‌نشا به خشکبیجار تا ابتدای محدوده بخش خمام، از قبیل شهرستان، جیرکویه، ولی‌آباد، گیلوا محله، چوکده، تمل، سیاه اسطلخ، سرخشکی، نوشر، جورکویه، شیشه گوراب، رودپشت، بسته دیم و غیره', land: 2400000, landComm: 3500000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۲,۹۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۳,۵۰۰,۰۰۰ ریال)' },
        { block: '9', name: 'ضلع شمالی نوار ساحلی بخش خشکبیجار، از ابتدای محدوده بخش خشکبیجار از سمت لشت‌نشا (روستای خشک اسطلخ) تا انتهای محدوده بخش خشکبیجار به سمت شهرستان انزلی (تا روستای جفرود)', land: 11000000, landComm: 15900000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۱۲,۷۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۱۵,۹۰۰,۰۰۰ ریال)' },
        { block: '10', name: 'ضلع جنوبی نوار ساحلی بخش خشکبیجار، از ابتدای محدوده بخش خشکبیجار از سمت لشت‌نشا (روستای خشک اسطلخ) تا انتهای محدوده بخش خشکبیجار به سمت بخش لشت‌نشا/انزلی (تا روستای جفرود)', land: 7200000, landComm: 10700000, conc: 24000000, other: 8000000, notes: 'ضریب اداری: ۱.۲ (۸,۵۰۰,۰۰۰ ریال) | ضریب تجاری: ۱.۵ (۱۰,۷۰۰,۰۰۰ ریال)' },
      ];

      for (const kb of khoshkBlocks) {
        await pool.query(`
          INSERT INTO base_rates (province, city, block_code, part_code, section_name, address, year, base_land_value, base_land_commercial_value, base_building_concrete, base_building_other, notes)
          VALUES ('گیلان', 'خشکبیجار', $1, '1', $2, $2, 1403, $3, $4, $5, $6, $7);
        `, [kb.block, kb.name, kb.land, kb.landComm, kb.conc, kb.other, kb.notes]);
      }
      console.log('Successfully seeded Khoshkebijar 1403 blocks into database!');
    }

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
}
