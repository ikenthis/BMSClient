// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBnmHajXMY2q9KU2zkzab7Pm6OYGn3pLZA",
  authDomain: "bmsbucket.firebaseapp.com",
  projectId: "bmsbucket",
  storageBucket: "bmsbucket.firebasestorage.app", // ← Nota el dominio .firebasestorage.app
  messagingSenderId: "157094198671",
  appId: "1:157094198671:web:76545fce16539b5d5f1ffa",
  measurementId: "G-FXDS28PY7Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;