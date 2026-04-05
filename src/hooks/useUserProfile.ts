import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../firebase';
import { Movie, UserProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useUserProfile() {
  const [user, loadingAuth] = useAuthState(auth);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!loadingAuth) {
      if (user) {
        const fetchProfile = async () => {
          const docRef = doc(db, 'users', user.uid);
          try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            } else {
              const newProfile: UserProfile = {
                uid: user.uid,
                displayName: user.displayName || null,
                email: user.email || null,
                photoURL: user.photoURL || null,
                favorites: [],
                watchlist: [],
                watchHistory: [],
                isPremium: false,
                subscriptionExpiry: 0,
                subscriptionPlan: undefined
              };
              // Sanitize data to remove undefined values which Firestore doesn't support
              const sanitizedProfile = JSON.parse(JSON.stringify(newProfile));
              await setDoc(docRef, sanitizedProfile);
              setUserProfile(newProfile);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          } finally {
            setLoading(false);
          }
        };
        fetchProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    }
  }, [user, loadingAuth]);

  const toggleWatchlist = async (movie: Movie) => {
    if (!user || !userProfile) {
      signInWithGoogle();
      return;
    }
    const docRef = doc(db, 'users', user.uid);
    const isInWatchlist = userProfile.watchlist?.some(m => m.id === movie.id);
    
    try {
      const updatedWatchlist = isInWatchlist
        ? userProfile.watchlist.filter(m => m.id !== movie.id)
        : [...(userProfile.watchlist || []), movie];

      // Sanitize data to remove undefined values which Firestore doesn't support
      const sanitizedWatchlist = JSON.parse(JSON.stringify(updatedWatchlist));

      await updateDoc(docRef, { watchlist: sanitizedWatchlist });
      setUserProfile(prev => prev ? ({ ...prev, watchlist: updatedWatchlist }) : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const subscribe = async (plan: 'monthly' | 'yearly', utr: string) => {
    if (!user || !userProfile) return;
    const docRef = doc(db, 'users', user.uid);
    
    // Calculate expiry
    const now = Date.now();
    const expiry = plan === 'monthly' ? now + 30 * 24 * 60 * 60 * 1000 : now + 365 * 24 * 60 * 60 * 1000;

    try {
      // In a real app, we'd save the UTR to a 'payments' collection for admin verification
      // For this demo, we'll activate premium immediately
      const updateData = {
        isPremium: true,
        subscriptionExpiry: expiry,
        subscriptionPlan: plan,
        lastUtr: utr // Storing UTR for reference
      };

      await updateDoc(docRef, updateData);
      setUserProfile(prev => prev ? ({ ...prev, ...updateData }) : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return { user, userProfile, loading: loading || loadingAuth, toggleWatchlist, subscribe };
}
