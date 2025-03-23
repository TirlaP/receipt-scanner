# Receipt Scanner

A modern web application for scanning, storing, and managing receipts with advanced features.

## Features

- Scan receipts using your device camera
- Extract receipt data using OCR
- Track spending by category and vendor
- Export data to various formats
- Secure cloud storage with Firebase
- Offline capability with local storage
- Responsive design for mobile and desktop

## Technologies

- React
- TypeScript
- Firebase (Firestore)
- Ant Design UI components
- IndexedDB for offline storage
- PWA support for installation on devices

## Setup and Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables (see below)
4. Run the development server with `npm run dev`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Deployment

This application is deployed on GitHub Pages at [https://tirlap.github.io/receipt-scanner/](https://tirlap.github.io/receipt-scanner/)

## License

MIT
