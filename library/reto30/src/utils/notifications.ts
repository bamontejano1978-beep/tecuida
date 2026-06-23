import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Request permission to send notifications.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
    try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch (e) {
        console.error("Error requesting notification permissions:", e);
        return false;
    }
};

/**
 * Schedules a daily reminder at a specific time.
 * @param hour 0-23
 * @param minute 0-59
 */
export const scheduleDailyReminder = async (hour: number = 9, minute: number = 0) => {
    try {
        // First check/request permission
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            const granted = await requestNotificationPermissions();
            if (!granted) return;
        }

        // Cancel existing to avoid duplicates
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }

        // Schedule new one
        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "Tu momento de calma",
                    body: "¿Listo para continuar tu camino en el Reto 30 días?",
                    id: 1,
                    schedule: {
                        on: {
                            hour: hour,
                            minute: minute
                        },
                        allowWhileIdle: true
                    },
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: "",
                    extra: null
                }
            ]
        });
        console.log(`Daily reminder scheduled for ${hour}:${minute}`);

    } catch (e) {
        console.error("Error scheduling notification:", e);
    }
};
