import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { setPremiumStatus, resetStartDate, setReviewMode } from './progress';
import i18n from '../i18n';

// ─── Master review code (admin-only, client-side, no Firestore lookup) ────────
const MASTER_CODE = 'MASTER_RETO30';

export const validatePromoCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!code) return { success: false, message: i18n.t('codes.enter_code') };

    const normalizedCode = code.trim().toUpperCase();

    // Master code: unlocks all 30 days instantly for review purposes
    if (normalizedCode === MASTER_CODE) {
        setReviewMode(true);
        return { success: true, message: '🔓 Modo Revisión activado — todos los días desbloqueados.' };
    }

    try {
        const codeRef = doc(db, 'promo_codes', normalizedCode);
        const codeSnap = await getDoc(codeRef);

        if (!codeSnap.exists()) {
            return { success: false, message: i18n.t('codes.invalid_code') };
        }

        const data = codeSnap.data();

        if (data.redeemedBy && data.redeemedBy !== auth.currentUser?.uid) {
            return { success: false, message: i18n.t('codes.already_used') };
        }

        if (data.redeemedBy === auth.currentUser?.uid) {
            await setPremiumStatus(true);
            return { success: true, message: i18n.t('codes.restoring_access') };
        }

        if (auth.currentUser) {
            const partnerId = data.partnerId || 'DIRECT';
            const now = Date.now();

            await updateDoc(codeRef, {
                redeemedBy: auth.currentUser.uid,
                redeemedAt: now
            });

            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                isPremium: true,
                partnerId: partnerId,
                premiumAcquiredAt: now,
                startDate: now, // Reset start date in Firestore
                premiumSource: 'PROMO_CODE',
                sourceCode: normalizedCode
            });

            // Local sync
            await setPremiumStatus(true);
            await resetStartDate(now);

            return { success: true, message: i18n.t('codes.welcome_partner', { partner: partnerId }) };
        } else {
            return { success: false, message: i18n.t('codes.auth_error') };
        }

    } catch (error) {
        console.error("Error redeeming code:", error);
        return { success: false, message: i18n.t('codes.conn_error') };
    }
};
