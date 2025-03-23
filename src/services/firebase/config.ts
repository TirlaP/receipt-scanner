// Firebase configuration using runtime and environment variables
export const firebaseConfig = typeof window !== 'undefined' && window.FIREBASE_CONFIG
  ? {
      apiKey: window.FIREBASE_CONFIG.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: window.FIREBASE_CONFIG.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: window.FIREBASE_CONFIG.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: window.FIREBASE_CONFIG.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: window.FIREBASE_CONFIG.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: window.FIREBASE_CONFIG.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
      measurementId: window.FIREBASE_CONFIG.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
    };

// Always log the config to help with debugging
console.log('Firebase config:', firebaseConfig);

// Validate the configuration
if (!firebaseConfig.projectId) {
  console.error('Firebase projectId is missing! This will cause initialization errors.');
}
