import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDLk5J0BzDUIumyhiI83Fc0MlarQOOOV3Q",
  authDomain: "duit-ku123.firebaseapp.com",
  projectId: "duit-ku123",
  storageBucket: "duit-ku123.appspot.com",
  messagingSenderId: "552763869425",
  appId: "1:552763869425:web:a02b57a7d9dd9667c54150",
  measurementId: "G-8DM952KY7Q"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
export const storage = getStorage(app);