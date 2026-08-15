import { admin, getDb, getFirebaseInitError } from '../services/firebaseAdmin.js';
import { COLLECTIONS, serializeDoc } from '../utils/firestore.js';

export async function verifyToken(req, res, next) {
  try {
    const db = getDb();
    if (!db || !admin.apps.length) {
      return res.status(503).json({
        success: false,
        message: getFirebaseInitError()?.message || 'Firebase Admin is not configured on the server',
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token is required' });
    }

    const token = authHeader.slice(7).trim();
    const decoded = await admin.auth().verifyIdToken(token);
    const profileSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get();

    if (!profileSnap.exists) {
      return res.status(403).json({ success: false, message: 'User profile is not configured in Firestore' });
    }

    req.user = decoded;
    req.userProfile = serializeDoc(profileSnap);
    next();
  } catch (error) {
    const expired = error.code === 'auth/id-token-expired';
    res.status(401).json({
      success: false,
      message: expired ? 'Session expired. Please sign in again.' : 'Invalid authentication token',
    });
  }
}
