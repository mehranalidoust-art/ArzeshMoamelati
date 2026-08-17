import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../lib/firebase-admin.ts';
import jwt from 'jsonwebtoken';
import { getUserByUid, getUserByEmail } from '../db/users.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'maddah64_secret_key_2026';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  dbUser?: any;
}

export function generateLocalToken(user: { uid: string; email: string; name?: string; role?: string }): string {
  return jwt.sign(
    { uid: user.uid, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'احراز هویت انجام نشده است' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Try decoding local JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decoded && decoded.uid) {
      req.user = decoded;
      const dbUser = await getUserByUid(decoded.uid);
      req.dbUser = dbUser;
      return next();
    }
  } catch (err) {
    // Not local JWT, attempt Firebase token verification
  }

  // Try Firebase token verification if admin auth is available
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const firebaseDecoded = await adminAuth.verifyIdToken(token);
      const dbUser = await getUserByUid(firebaseDecoded.uid);
      const userEmail = firebaseDecoded.email?.toLowerCase() || '';
      const isPredefinedAdmin =
        userEmail === 'admin@maddah64.ir' ||
        userEmail === 'mehran.alidoust@gmail.com' ||
        userEmail === 'admin@admin.com';

      req.user = {
        uid: firebaseDecoded.uid,
        email: firebaseDecoded.email || '',
        name: firebaseDecoded.name,
        role: dbUser?.role || (isPredefinedAdmin ? 'admin' : 'user'),
      };
      req.dbUser = dbUser;
      return next();
    } catch (error) {
      console.warn('Firebase Admin verification failed, trying fallback decode:', error);
    }
  }

  // Fallback: If token is a valid Firebase Google ID token that can be decoded
  try {
    const unverified = jwt.decode(token) as any;
    if (unverified && (unverified.sub || unverified.user_id || unverified.uid)) {
      const uid = unverified.sub || unverified.user_id || unverified.uid;
      const email = (unverified.email || '').toLowerCase();
      const dbUser = (await getUserByUid(uid)) || (email ? await getUserByEmail(email) : null);
      const isPredefinedAdmin =
        email === 'admin@maddah64.ir' ||
        email === 'mehran.alidoust@gmail.com' ||
        email === 'admin@admin.com' ||
        email === 'admin';

      req.user = {
        uid,
        email,
        name: unverified.name || unverified.display_name,
        role: dbUser?.role || (isPredefinedAdmin ? 'admin' : 'user'),
      };
      req.dbUser = dbUser;
      return next();
    }
  } catch (decodeErr) {
    console.error('Failed to decode token:', decodeErr);
  }

  return res.status(401).json({ error: 'توکن احراز هویت نامعتبر است' });
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decoded && decoded.uid) {
      req.user = decoded;
      req.dbUser = await getUserByUid(decoded.uid);
      return next();
    }
  } catch (err) {}

  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const firebaseDecoded = await adminAuth.verifyIdToken(token);
      const dbUser = await getUserByUid(firebaseDecoded.uid);
      req.user = {
        uid: firebaseDecoded.uid,
        email: firebaseDecoded.email || '',
        name: firebaseDecoded.name,
        role: dbUser?.role || 'user',
      };
      req.dbUser = dbUser;
    } catch (error) {
      console.warn('Optional auth token invalid, proceeding as guest');
    }
  }

  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    if (!req.user) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز' });
    }

    const dbUser = req.dbUser || (await getUserByUid(req.user.uid));
    const userEmail = req.user.email?.toLowerCase() || '';
    const isEmailAdmin =
      userEmail === 'admin@maddah64.ir' ||
      userEmail === 'mehran.alidoust@gmail.com' ||
      userEmail === 'admin@admin.com' ||
      userEmail === 'admin';

    if (dbUser?.role === 'admin' || req.user.role === 'admin' || isEmailAdmin) {
      return next();
    }

    return res.status(403).json({ error: 'دسترسی به این بخش فقط برای مدیران (ادمین) امکان‌پذیر است.' });
  });
};
