import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { User } from '../../types';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'senior' | 'caregiver';
}

export interface LoginData {
  email: string;
  password: string;
}

// Register a new user
export const registerUser = async (data: RegisterData): Promise<User> => {
  console.log('[AuthService] registerUser called with:', { email: data.email, name: data.name, role: data.role });
  
  const { email, password, name, phone, role } = data;

  try {
    // Create Firebase auth user
    console.log('[AuthService] Creating Firebase auth user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('[AuthService] Firebase auth user created successfully, UID:', firebaseUser.uid);

    // Create user document in Firestore
    // Note: Firestore doesn't accept undefined values, so we build the object conditionally
    const baseUserData = {
      email,
      name,
      phone: phone || '',
      role,
      createdAt: new Date(),
    };

    // Add role-specific fields (seniors have caregiverIds, caregivers have seniorIds)
    const userData: Omit<User, 'id'> = role === 'senior' 
      ? { ...baseUserData, caregiverIds: [] }
      : { ...baseUserData, seniorIds: [] };

    console.log('[AuthService] Saving user document to Firestore...', userData);
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...baseUserData,
      ...(role === 'senior' ? { caregiverIds: [] } : { seniorIds: [] }),
      createdAt: serverTimestamp(),
    });
    console.log('[AuthService] User document saved successfully');

    return {
      id: firebaseUser.uid,
      ...userData,
    };
  } catch (error: any) {
    console.error('[AuthService] Registration error:', error);
    console.error('[AuthService] Error code:', error.code);
    console.error('[AuthService] Error message:', error.message);
    throw error;
  }
};

// Login user
export const loginUser = async (data: LoginData): Promise<User> => {
  const { email, password } = data;

  console.log('[AuthService] loginUser called with:', { email });

  try {
    console.log('[AuthService] Signing in with Firebase Auth...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('[AuthService] Firebase Auth sign-in successful, UID:', firebaseUser.uid);

    // Get user document
    console.log('[AuthService] Fetching user document from Firestore...');
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      console.warn('[AuthService] User document not found in Firestore, creating default profile...');
      // User exists in Auth but not in Firestore - create a default profile
      // This can happen if registration failed midway
      const defaultUserData = {
        email: firebaseUser.email || email,
        name: firebaseUser.displayName || 'Użytkownik',
        phone: '',
        role: 'senior' as const,
        createdAt: serverTimestamp(),
        caregiverIds: [],
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), defaultUserData);
      console.log('[AuthService] Default user profile created in Firestore');
      
      return {
        id: firebaseUser.uid,
        email: defaultUserData.email,
        name: defaultUserData.name,
        phone: defaultUserData.phone,
        role: defaultUserData.role,
        createdAt: new Date(),
        caregiverIds: defaultUserData.caregiverIds,
      };
    }

    console.log('[AuthService] User document found in Firestore');
    const userData = userDoc.data();
    const user = {
      id: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      role: userData.role,
      createdAt: userData.createdAt?.toDate() || new Date(),
      caregiverIds: userData.caregiverIds,
      seniorIds: userData.seniorIds,
      fcmToken: userData.fcmToken,
    };
    console.log('[AuthService] Login successful, user role:', user.role);
    return user;
  } catch (error: any) {
    console.error('[AuthService] Login error:', error);
    console.error('[AuthService] Error code:', error.code);
    console.error('[AuthService] Error message:', error.message);
    throw error;
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Get current user profile
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    return null;
  }

  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

  if (!userDoc.exists()) {
    return null;
  }

  const userData = userDoc.data();
  return {
    id: firebaseUser.uid,
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    role: userData.role,
    createdAt: userData.createdAt?.toDate() || new Date(),
    caregiverIds: userData.caregiverIds,
    seniorIds: userData.seniorIds,
    fcmToken: userData.fcmToken,
  };
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), updates);
};

// Update FCM token for push notifications
export const updateFcmToken = async (
  userId: string,
  token: string
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), { fcmToken: token });
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

// Link senior to caregiver
export const linkSeniorToCaregiver = async (
  seniorId: string,
  caregiverId: string
): Promise<void> => {
  console.log('[AuthService] Linking senior:', seniorId, 'to caregiver:', caregiverId);
  
  try {
    // Update senior's caregiverIds
    console.log('[AuthService] Updating senior caregiverIds...');
    const seniorDoc = await getDoc(doc(db, 'users', seniorId));
    if (seniorDoc.exists()) {
      const seniorData = seniorDoc.data();
      const caregiverIds = seniorData.caregiverIds || [];
      if (!caregiverIds.includes(caregiverId)) {
        await updateDoc(doc(db, 'users', seniorId), {
          caregiverIds: [...caregiverIds, caregiverId],
        });
        console.log('[AuthService] Senior caregiverIds updated');
      } else {
        console.log('[AuthService] Caregiver already in senior caregiverIds');
      }
    } else {
      console.error('[AuthService] Senior document not found');
      throw new Error('Senior nie istnieje');
    }

    // Update caregiver's seniorIds
    console.log('[AuthService] Updating caregiver seniorIds...');
    const caregiverDoc = await getDoc(doc(db, 'users', caregiverId));
    if (caregiverDoc.exists()) {
      const caregiverData = caregiverDoc.data();
      const seniorIds = caregiverData.seniorIds || [];
      if (!seniorIds.includes(seniorId)) {
        await updateDoc(doc(db, 'users', caregiverId), {
          seniorIds: [...seniorIds, seniorId],
        });
        console.log('[AuthService] Caregiver seniorIds updated');
      } else {
        console.log('[AuthService] Senior already in caregiver seniorIds');
      }
    } else {
      console.error('[AuthService] Caregiver document not found');
      throw new Error('Opiekun nie istnieje');
    }
    
    console.log('[AuthService] Link completed successfully');
  } catch (error: any) {
    console.error('[AuthService] Error linking accounts:', error);
    console.error('[AuthService] Error code:', error.code);
    console.error('[AuthService] Error message:', error.message);
    throw error;
  }
};
