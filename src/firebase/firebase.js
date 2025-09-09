// src/firebase/firebase.js

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Import Firestore

// Your firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAcYQEgQFSkDK2zJwhr_tEVTywYc-sXXMQ",
  authDomain: "fir-auth-3694c.firebaseapp.com",
  projectId: "fir-auth-3694c",
  storageBucket: "fir-auth-3694c.firebasestorage.app",
  messagingSenderId: "1004112228354",
  appId: "1:1004112228354:web:6683533badd21ed9ff371b",
  measurementId: "G-FN6TMPBF1E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ Export Firestore