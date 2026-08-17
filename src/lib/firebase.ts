import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDummyKeyForLocalDevOnly123456",
  authDomain: "maddah64-calc.firebaseapp.com",
  projectId: "maddah64-calc",
  storageBucket: "maddah64-calc.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
