import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';

/**
 * Utilities for calculating challenge progress based on real time.
 */

const START_DATE_KEY = 'mindful30_startDate';
const IS_PREMIUM_KEY = 'mindful30_isPremium';

// Demo Mode State
const DEMO_MODE_KEY = 'mindful30_demoMode';
const REVIEW_MODE_KEY = 'mindful30_reviewMode';

// Note: Set to 0 to ensure all days (including Day 1) are locked by default.
export const FREE_DAYS_LIMIT = 0;

export const isDemoMode = (): boolean => {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
};

export const isReviewMode = (): boolean => {
    return localStorage.getItem(REVIEW_MODE_KEY) === 'true';
};

export const setDemoMode = (active: boolean) => {
    if (active) {
        localStorage.setItem(DEMO_MODE_KEY, 'true');
        // Reset start date to now to ensure at least day 1 is visible normally
        localStorage.setItem(START_DATE_KEY, Date.now().toString());
    } else {
        localStorage.removeItem(DEMO_MODE_KEY);
    }
};

export const setReviewMode = (active: boolean) => {
    if (active) {
        localStorage.setItem(REVIEW_MODE_KEY, 'true');
        localStorage.setItem(IS_PREMIUM_KEY, 'true');
    } else {
        localStorage.removeItem(REVIEW_MODE_KEY);
    }
};


/**
 * Gets the start date from localStorage or initializes it to now.
 * Returns the timestamp in milliseconds.
 */
export const getStartDate = (): number => {
    const saved = localStorage.getItem(START_DATE_KEY);
    if (saved) {
        return parseInt(saved);
    }
    const now = Date.now();
    localStorage.setItem(START_DATE_KEY, now.toString());
    return now;
};

/**
 * Calculates which day (1-30) is currently unlocked.
 * Uses calendar days (midnight transition) instead of strict 24-hour periods.
 */
export const getUnlockedDay = (): number => {
    if (APP_MODE === 'TEST' || isReviewMode()) return 31;

    const startDate = getStartDate();
    const now = Date.now();

    // Use calendar days: difference between midnights in local time
    const startObj = new Date(startDate);
    startObj.setHours(0, 0, 0, 0);
    
    const nowObj = new Date(now);
    nowObj.setHours(0, 0, 0, 0);
    
    const diffMs = nowObj.getTime() - startObj.getTime();
    const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Current day is elapsed + 1, capped at 31 to allow for "completion" state
    const current = Math.min(31, daysElapsed + 1);

    // Always unlock at least the free days to serve as a trial/hook
    return Math.max(FREE_DAYS_LIMIT, current);
};


/**
 * Resets the challenge to start on the specified date (defaults to now).
 * Syncs to Firestore if user is authenticated.
 */
export const resetStartDate = async (date: number = Date.now()) => {
    localStorage.setItem(START_DATE_KEY, date.toString());

    const user = auth.currentUser;
    if (user) {
        try {
            await setDoc(doc(db, 'users', user.uid), {
                startDate: date
            }, { merge: true });
        } catch (e) {
            console.error("Error syncing reset start date:", e);
        }
    }
};

/**
 * Gets the time remaining until the next day unlocks (until next midnight).
 */
export const getTimeUntilNextDay = (): number => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.getTime() - now.getTime();
};

import { APP_MODE } from '../config';

/**
 * Checks if the user has purchased the premium version.
 */
export const isPremiumUser = (): boolean => {
    if (APP_MODE === 'FULL' || APP_MODE === 'TEST' || isReviewMode()) return true;
    return localStorage.getItem(IS_PREMIUM_KEY) === 'true';
};

/**
 * Updates the user's premium status locally and in Firestore.
 */
export const setPremiumStatus = async (status: boolean) => {
    localStorage.setItem(IS_PREMIUM_KEY, status.toString());

    const user = auth.currentUser;
    if (user) {
        try {
            await setDoc(doc(db, 'users', user.uid), {
                isPremium: status
            }, { merge: true });
        } catch (e) {
            console.error("Error syncing premium status:", e);
        }
    }
};

/**
 * Listens for premium status changes in Firestore for the current user.
 */
export const listenToPremiumStatus = (uid: string, callback: (isPremium: boolean) => void) => {
    const docRef = doc(db, 'users', uid);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isPremium !== undefined) {
                localStorage.setItem(IS_PREMIUM_KEY, data.isPremium.toString());
                callback(data.isPremium);
            }
        }
    });
};

/**
 * Checks if a specific day is locked by the freemium model.
 */
export const isDayPremiumLocked = (day: number): boolean => {
    if (isReviewMode()) return false;
    if (isDemoMode() && day <= 2) return false;
    if (day <= FREE_DAYS_LIMIT) return false;
    return !isPremiumUser();
};


/**
 * Syncs user progress from Firestore to LocalStorage.
 * Prioritizes Firestore data if it exists.
 */
export const syncUserProgress = async (user: User) => {
    if (!user) return;

    try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Sync Premium
            if (data.isPremium !== undefined) {
                localStorage.setItem(IS_PREMIUM_KEY, data.isPremium.toString());
            }

            // Sync Start Date
            if (data.startDate) {
                localStorage.setItem(START_DATE_KEY, data.startDate.toString());
            } else {
                // If existing user but no start date, push local or init
                const currentLocal = getStartDate();
                await setDoc(docRef, { startDate: currentLocal }, { merge: true });
            }

            // Sync Partner Info (optional: can store in localStorage too if needed)
            if (data.partnerId) {
                localStorage.setItem('mindful30_partnerId', data.partnerId);
            }
        } else {
            // New user doc, push current local state
            const partnerId = localStorage.getItem('mindful30_partnerId') || 'DIRECT';
            await setDoc(docRef, {
                isPremium: isPremiumUser(),
                startDate: getStartDate(),
                partnerId: partnerId
            });
        }
    } catch (e) {
        console.error("Error syncing user progress:", e);
    }
};
