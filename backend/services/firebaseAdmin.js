import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

let db = null;
let initError = null;

const readServiceAccountFile = () => {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!configuredPath) return null;
  const fullPath = path.resolve(process.cwd(), configuredPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Firebase service account file not found: ${fullPath}`);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
};

export function initFirebaseAdmin() {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  try {
    const fileAccount = readServiceAccountFile();
    const projectId = process.env.FIREBASE_PROJECT_ID || fileAccount?.project_id;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || fileAccount?.client_email;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || fileAccount?.private_key)?.replace(/\\n/g, '\n');

    let credential = null;
    if (projectId && clientEmail && privateKey) {
      credential = admin.credential.cert({ projectId, clientEmail, privateKey });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    }

    if (!credential) {
      initError = new Error(
        'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
      );
      return null;
    }

    admin.initializeApp({ credential, projectId });
    db = admin.firestore();
    initError = null;
    return db;
  } catch (error) {
    initError = error;
    console.error('Firebase Admin initialization failed:', error.message);
    return null;
  }
}

export function getDb() {
  if (!db) db = initFirebaseAdmin();
  return db;
}

export function getFirebaseInitError() {
  return initError;
}

export function isFirebaseConfigured() {
  return Boolean(getDb());
}

export { admin };
