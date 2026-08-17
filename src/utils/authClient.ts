import { auth } from '../lib/firebase.ts';

export async function getAuthToken(): Promise<string> {
  const localToken = localStorage.getItem('auth_token');
  if (localToken) return localToken;

  const firebaseToken = localStorage.getItem('firebase_token');
  if (firebaseToken) return firebaseToken;

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        localStorage.setItem('auth_token', token);
        return token;
      }
    } catch (err) {
      console.warn('Failed to retrieve current user ID token:', err);
    }
  }

  return '';
}

export function saveAuthToken(token: string) {
  if (token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('firebase_token', token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('firebase_token');
  localStorage.removeItem('cached_user_profile');
}
