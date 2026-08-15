import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { COLLECTIONS } from '../utils/constants';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profileSnap = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          setUser(firebaseUser);
          setUserProfile(profileSnap.exists() ? profileSnap.data() : null);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Unable to load user profile:', error);
        setUser(firebaseUser || null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email, password, expectedRole) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profileSnap = await getDoc(doc(db, COLLECTIONS.USERS, credential.user.uid));
    if (!profileSnap.exists()) {
      await signOut(auth);
      throw new Error('User profile not found. Contact admin.');
    }
    const profile = profileSnap.data();
    const actualRole = String(profile.role || '').trim().toLowerCase();
    const wantedRole = String(expectedRole || '').trim().toLowerCase();
    if (wantedRole && actualRole !== wantedRole) {
      await signOut(auth);
      throw new Error(`This account is registered as ${actualRole}, not ${wantedRole}.`);
    }
    return { user: credential.user, profile };
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        login,
        logout,
        isAdmin: String(userProfile?.role || '').trim().toLowerCase() === 'admin',
        isStaff: String(userProfile?.role || '').trim().toLowerCase() === 'staff',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
