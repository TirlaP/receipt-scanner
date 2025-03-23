// Firebase configuration
// First try to use the runtime config, then fall back to environment variables
export const firebaseConfig = typeof window !== 'undefined' && window.FIREBASE_CONFIG
  ? window.FIREBASE_CONFIG
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };

// Log the config to verify it's working (in development only)
if (import.meta.env.DEV) {
  console.log('Firebase config:', firebaseConfig);
}
