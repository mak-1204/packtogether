'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Returns the core Firebase SDK instances for a given FirebaseApp.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

/**
 * Initializes the Firebase app and its services.
 * Implements session-only persistence as per the security policy.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to config object for development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    const sdks = getSdks(firebaseApp);
    
    // Set persistence to session only - clears when tab/browser closes
    // This is a non-blocking call in initializeFirebase but ensures the setting is applied
    setPersistence(sdks.auth, browserSessionPersistence).catch(err => {
      console.error("Failed to set auth persistence:", err);
    });
    
    return sdks;
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}
