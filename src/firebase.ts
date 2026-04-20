import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Firebase Error Handler
export const handleFirestoreError = (error: any) => {
  console.error("Firebase Error:", error);
  
  if (error.code === 'permission-denied') {
    alert("Permission denied. You might not have access to this action.");
  } else {
    alert("An error occurred: " + (error.message || "Unknown error"));
  }
};
