const fs = require('fs');
const path = require('path');

// Get the dist directory
const distDir = path.resolve(__dirname, '../dist');
const indexFile = path.join(distDir, 'index.html');

// Log the file path for debugging
console.log('Looking for index.html at:', indexFile);

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

// Check if env variables are set
console.log('Environment variables loaded:');
console.log('API Key set:', !!firebaseConfig.apiKey);
console.log('Auth Domain set:', !!firebaseConfig.authDomain);
console.log('Project ID:', firebaseConfig.projectId);
console.log('Storage Bucket set:', !!firebaseConfig.storageBucket);
console.log('Messaging Sender ID set:', !!firebaseConfig.messagingSenderId);
console.log('App ID set:', !!firebaseConfig.appId);
console.log('Measurement ID set:', !!firebaseConfig.measurementId);

try {
  // Check if the file exists
  if (!fs.existsSync(indexFile)) {
    console.error('ERROR: index.html not found at', indexFile);
    console.log('Current directory:', __dirname);
    console.log('Files in dist directory:');
    try {
      const files = fs.readdirSync(distDir);
      console.log(files);
    } catch (e) {
      console.error('Could not read dist directory:', e.message);
    }
    process.exit(1);
  }

  // Read the index.html file
  console.log('Reading index.html...');
  let html = fs.readFileSync(indexFile, 'utf8');

  // Replace the placeholders
  console.log('Replacing placeholders...');
  html = html.replace('__FIREBASE_API_KEY__', firebaseConfig.apiKey);
  html = html.replace('__FIREBASE_AUTH_DOMAIN__', firebaseConfig.authDomain);
  html = html.replace('__FIREBASE_PROJECT_ID__', firebaseConfig.projectId);
  html = html.replace('__FIREBASE_STORAGE_BUCKET__', firebaseConfig.storageBucket);
  html = html.replace('__FIREBASE_MESSAGING_SENDER_ID__', firebaseConfig.messagingSenderId);
  html = html.replace('__FIREBASE_APP_ID__', firebaseConfig.appId);
  html = html.replace('__FIREBASE_MEASUREMENT_ID__', firebaseConfig.measurementId);

  // Write the modified file
  console.log('Writing updated index.html...');
  fs.writeFileSync(indexFile, html);

  console.log('Firebase configuration injected successfully!');
} catch (error) {
  console.error('Error injecting Firebase configuration:', error);
  process.exit(1);
}
