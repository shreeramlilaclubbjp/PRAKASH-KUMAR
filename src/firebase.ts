import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
console.log('Firebase Config:', { ...firebaseConfig, apiKey: '***' });
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
console.log('Firestore Database ID:', firebaseConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error('Sign-in error:', error);
    if (error.code === 'auth/network-request-failed') {
      alert('Network error: Please check your internet connection or disable any ad-blockers that might be blocking Firebase.');
    } else {
      alert(`Sign-in failed: ${error.message}`);
    }
  }
};
export const logout = () => signOut(auth);
