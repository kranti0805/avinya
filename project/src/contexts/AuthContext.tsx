import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'employee' | 'manager';
  department: string;
  created_at?: string;
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'employee' | 'manager', department: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data() as Profile);
      } else {
        console.warn('No profile found for user:', userId);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'employee' | 'manager', department: string) => {
    // 1. Create User in Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Create Profile in Firestore
    const newProfile: Profile = {
      id: user.uid,
      email,
      full_name: fullName,
      role,
      department,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'profiles', user.uid), newProfile);
    setProfile(newProfile); // Optimistic update
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
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
