// Firebase configuration - HARDCODED VALUES FOR DIRECT DEPLOYMENT
export const firebaseConfig = {
  apiKey: "AIzaSyCNRUWxYDEaNG0YrFfzfZSmMff2A4XjtcY",
  authDomain: "receipt-scanner-petru.firebaseapp.com",
  projectId: "receipt-scanner-petru",
  storageBucket: "receipt-scanner-petru.appspot.com",
  messagingSenderId: "640055404069",
  appId: "1:640055404069:web:4e0fb17f07ecb904e9e04e",
  measurementId: "G-R0XHK3B6F3"
};

// Always log the config to help with debugging
console.log('Firebase config:', firebaseConfig);

// Validate the configuration
if (!firebaseConfig.projectId) {
  console.error('Firebase projectId is missing! This will cause initialization errors.');
}
