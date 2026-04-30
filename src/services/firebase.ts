import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// In AI Studio, the config will be in firebase-applet-config.json once provisioned.
// For now, we use a placeholder or check if it exists.
let firebaseConfig = {};
try {
  // @ts-ignore
  import config from '../../firebase-applet-config.json';
  firebaseConfig = config;
} catch (e) {
  console.warn("Firebase config not found yet. Provisioning in progress...");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
