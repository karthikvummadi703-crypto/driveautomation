const env = (key: string, fallback: string): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
};

export const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY', 'YOUR_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN', 'n8nsampleproject-ff2c5.firebaseapp.com'),
  projectId: env('VITE_FIREBASE_PROJECT_ID', 'n8nsampleproject-ff2c5'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET', 'n8nsampleproject-ff2c5.firebasestorage.app'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID', '984526389105'),
  appId: env('VITE_FIREBASE_APP_ID', '1:984526389105:web:ceb065d624b8f17ab780d0'),
  measurementId: env('VITE_FIREBASE_MEASUREMENT_ID', 'G-LTEHW0ZLRS'),
};
