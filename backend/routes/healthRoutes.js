import { Router } from 'express';
import { isFirebaseConfigured, getFirebaseInitError } from '../services/firebaseAdmin.js';

const router = Router();

router.get('/', (req, res) => {
  const firebaseConfigured = isFirebaseConfigured();
  res.status(firebaseConfigured ? 200 : 503).json({
    success: firebaseConfigured,
    message: firebaseConfigured
      ? 'Fancy Shop Manager API and Firebase Admin are ready'
      : 'API is running, but Firebase Admin is not configured',
    firebaseConfigured,
    firebaseError: firebaseConfigured ? null : getFirebaseInitError()?.message || null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
