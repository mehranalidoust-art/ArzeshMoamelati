import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let _adminAuth: Auth | null = null;

export function getAdminAuth(): Auth | null {
  if (!_adminAuth) {
    try {
      if (!getApps().length) {
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'maddah64-calc',
        });
      }
      _adminAuth = getAuth();
    } catch (err) {
      console.warn('Firebase Admin initialization skipped or unavailable:', err);
      return null;
    }
  }
  return _adminAuth;
}

