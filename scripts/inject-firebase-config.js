const fs = require('fs');
const path = require('path');

// Get the dist directory
const distDir = path.resolve(__dirname, '../dist');
const indexFile = path.join(distDir, 'index.html');

// Read environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

console.log('Injecting Firebase configuration...');
console.log(`Project ID: ${firebaseConfig.projectId}`);

// Read the index.html file
let html = fs.readFileSync(indexFile, 'utf8');

// Replace the placeholders
html = html.replace('__FIREBASE_API_KEY__', firebaseConfig.apiKey);
html = html.replace('__FIREBASE_AUTH_DOMAIN__', firebaseConfig.authDomain);
html = html.replace('__FIREBASE_PROJECT_ID__', firebaseConfig.projectId);
html = html.replace('__FIREBASE_STORAGE_BUCKET__', firebaseConfig.storageBucket);
html = html.replace('__FIREBASE_MESSAGING_SENDER_ID__', firebaseConfig.messagingSenderId);
html = html.replace('__FIREBASE_APP_ID__', firebaseConfig.appId);
html = html.replace('__FIREBASE_MEASUREMENT_ID__', firebaseConfig.measurementId);

// Write the modified file
fs.writeFileSync(indexFile, html);

console.log('Firebase configuration injected successfully!');
