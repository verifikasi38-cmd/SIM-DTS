import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const createProfile = async (user: User, customName?: string) => {
    const profileDoc = await getDoc(doc(db, 'users', user.uid));
    if (profileDoc.exists()) {
      setProfile(profileDoc.data() as UserProfile);
    } else {
      const email = user.email || '';
      let initialRole = 'CITIZEN';
      if (email === 'azmankoe916@gmail.com') initialRole = 'RT';
      else if (email === 'azmancivd@gmail.com') initialRole = 'RW';
      else if (email === 'azman204official@gmail.com') initialRole = 'KADUS';
      else if (email === 'verifikasi38@gmail.com' || email === 'mushlih.alamin@gmail.com') initialRole = 'ADMIN';

      const newProfile: UserProfile = {
        uid: user.uid,
        email: email,
        fullName: customName || user.displayName || 'Warga Baru',
        role: initialRole as UserRole,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfile(newProfile);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // First ensure profile exists
        await createProfile(user);
        
        // Then set up real-time listener
        if (unsubscribeProfile) unsubscribeProfile();
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            
            // Re-enforce mapping
            let roleToSet = data.role;
            const email = data.email;
            if (email === 'azmankoe916@gmail.com') roleToSet = 'RT';
            else if (email === 'azmancivd@gmail.com') roleToSet = 'RW';
            else if (email === 'azman204official@gmail.com') roleToSet = 'KADUS';
            else if (email === 'verifikasi38@gmail.com' || email === 'mushlih.alamin@gmail.com') roleToSet = 'ADMIN';

            if (roleToSet !== data.role) {
                await updateDoc(userDoc.ref, { role: roleToSet });
                return;
            }
            
            setProfile(data);
          }
        }, (error) => {
          console.error("Error in user profile listener:", error);
        });
      } else {
        setProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        unsubscribeProfile = null;
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await createProfile(cred.user, name);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
