import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'maddah64_salt').digest('hex');
}

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const isAdminEmail =
    normalizedEmail === 'admin@maddah64.ir' ||
    normalizedEmail === 'mehran.alidoust@gmail.com' ||
    normalizedEmail === 'admin@admin.com' ||
    normalizedEmail === 'admin';

  const defaultRole = isAdminEmail ? 'admin' : 'user';

  try {
    const result = await db.insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name: name || (isAdminEmail ? 'مدیر ارشد (ادمین)' : normalizedEmail.split('@')[0]),
        role: defaultRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          ...(name ? { name } : {}),
          ...(isAdminEmail ? { role: 'admin' } : {}),
        },
      })
      .returning();

    if (result[0]) return result[0];
  } catch (error) {
    console.warn("Database upsert failed, returning fallback profile:", error);
  }

  return {
    id: 1,
    uid,
    email: normalizedEmail,
    name: name || (isAdminEmail ? 'مدیر ارشد (ادمین)' : normalizedEmail.split('@')[0]),
    role: isAdminEmail ? ('admin' as const) : ('user' as const),
    createdAt: new Date(),
  };
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0] || null;
  } catch (error) {
    console.error("Failed to fetch user by UID:", error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const result = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (result[0]) return result[0];
  } catch (error) {
    console.warn("Database lookup failed, checking static fallback users:", error);
  }

  // Fallback for default admin accounts if DB is empty or unreachable
  if (
    normalizedEmail === 'admin@maddah64.ir' ||
    normalizedEmail === 'mehran.alidoust@gmail.com' ||
    normalizedEmail === 'admin@admin.com' ||
    normalizedEmail === 'admin'
  ) {
    return {
      id: 1,
      uid: 'admin_static_uid_001',
      email: normalizedEmail,
      name: 'مدیر ارشد (ادمین)',
      role: 'admin' as const,
      passwordHash: hashPassword('admin123456'),
      createdAt: new Date(),
    };
  }

  return null;
}

export async function getAllUsers() {
  try {
    const result = await db.select({
      id: users.id,
      uid: users.uid,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
    return result;
  } catch (error) {
    console.error("Failed to list users:", error);
    return [];
  }
}

export async function updateUserRole(userId: number, role: 'admin' | 'user') {
  try {
    const result = await db.update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("Failed to update user role:", error);
    throw error;
  }
}

export async function createUserWithPassword(email: string, password: string, name?: string, role: 'admin' | 'user' = 'user') {
  const hashedPassword = hashPassword(password);
  const uid = 'local_' + crypto.randomBytes(8).toString('hex');
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db.insert(users).values({
      uid,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role,
      passwordHash: hashedPassword,
    }).returning({
      id: users.id,
      uid: users.uid,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });

    return result[0];
  } catch (error) {
    console.error("Failed to create user in DB:", error);
    throw error;
  }
}

export async function updateUser(
  userId: number,
  data: { name?: string; email?: string; role?: 'admin' | 'user'; password?: string }
) {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = hashPassword(data.password.trim());
    }

    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      });

    return result[0] || null;
  } catch (error) {
    console.error("Failed to update user:", error);
    throw error;
  }
}

export async function deleteUser(userId: number) {
  try {
    await db.delete(users).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("Failed to delete user:", error);
    throw error;
  }
}

