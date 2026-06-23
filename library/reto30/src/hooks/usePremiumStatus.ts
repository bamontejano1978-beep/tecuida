import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { isPremiumUser, isReviewMode } from '../utils/progress';

/**
 * Hook to manage and sync premium status in real-time.
 * Review Mode takes absolute priority over Firestore data.
 */
export const usePremiumStatus = () => {
    const [isPremium, setIsPremium] = useState<boolean>(isPremiumUser());
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // If Review Mode is active, skip Firestore sync entirely
        if (isReviewMode()) {
            setIsPremium(true);
            setLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Listen to Firestore for changes
                const docRef = doc(db, 'users', user.uid);
                const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
                    // Re-check review mode on each snapshot (could have been activated)
                    if (isReviewMode()) {
                        setIsPremium(true);
                        setLoading(false);
                        return;
                    }
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.isPremium !== undefined) {
                            localStorage.setItem('mindful30_isPremium', data.isPremium.toString());
                            setIsPremium(data.isPremium);
                        }
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error listening to premium status:", error);
                    setLoading(false);
                });

                return () => unsubscribeFirestore();
            } else {
                setIsPremium(isPremiumUser());
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    return { isPremium, loading };
};
