// Local push notifications for the daily review nudge.
//
// We schedule a single repeating daily local notification (no server round-trip).
// The notification body counts due cards at fire time via a small content provider —
// but since expo-notifications can't run JS to compute the body at fire time on
// all platforms, we use a static-but-friendly body and rely on the badge/app for
// the precise number. The body still reads "X cards waiting for review" using the
// most-recent due count we cached on the last app foreground; if no count is known
// we fall back to a generic prompt.
//
// Settings (enabled / hour / minute) live in expo-secure-store so they survive
// relaunches without a full DB write path. See src/lib/onboarding.ts for the
// same pattern.

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SETTINGS_KEY = 'snapstudy.notifications.dailyReview';
const SCHEDULED_ID_KEY = 'snapstudy.notifications.dailyReview.scheduledId';
const LAST_DUE_COUNT_KEY = 'snapstudy.notifications.lastDueCount';

const DEFAULT_HOUR = 20; // 8pm — matches the placeholder in profile.tsx
const DEFAULT_MINUTE = 0;

export interface DailyReviewSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT_SETTINGS: DailyReviewSettings = {
  enabled: false,
  hour: DEFAULT_HOUR,
  minute: DEFAULT_MINUTE,
};

// Ensure notifications show as a banner while the app is foregrounded.
// Safe to call multiple times — expo-notifications dedupes the handler.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request OS permission to display local notifications.
 * Returns true if granted (or provisional on iOS).
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: false,
        provideAppNotificationSettings: true,
      },
    });
    return (
      req.granted ||
      req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (e) {
    console.warn('[notifications] requestPermissions failed', e);
    return false;
  }
}

/**
 * Cache the "due cards now" count so the next scheduled notification can render
 * a meaningful body. Call this from the review/today screens when due count is
 * computed.
 */
export async function setLastDueCount(n: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_DUE_COUNT_KEY, String(Math.max(0, n)));
  } catch {
    /* non-fatal */
  }
}

async function getLastDueCount(): Promise<number> {
  try {
    const v = await SecureStore.getItemAsync(LAST_DUE_COUNT_KEY);
    if (!v) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function buildBody(dueCount: number): string {
  if (dueCount <= 0) return 'Time for a quick study session.';
  if (dueCount === 1) return '1 card waiting for review';
  return `${dueCount} cards waiting for review`;
}

/**
 * Schedule (or reschedule) the repeating daily review notification.
 * Returns the new notification identifier so callers may persist or inspect it.
 *
 * Cancels any previously-scheduled instance to avoid duplicates.
 */
export async function scheduleDailyReview(time: {
  hour: number;
  minute: number;
}): Promise<string> {
  if (
    !Number.isInteger(time.hour) ||
    time.hour < 0 ||
    time.hour > 23 ||
    !Number.isInteger(time.minute) ||
    time.minute < 0 ||
    time.minute > 59
  ) {
    throw new Error(
      `scheduleDailyReview: invalid time ${JSON.stringify(time)}`,
    );
  }

  await cancelDailyReview();

  // Android requires a channel for the heads-up display + sound config.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-review', {
      name: 'Daily review',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      sound: null,
    });
  }

  const dueCount = await getLastDueCount();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SnapStudy',
      body: buildBody(dueCount),
      sound: null,
      ...(Platform.OS === 'android' ? { channelId: 'daily-review' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });

  try {
    await SecureStore.setItemAsync(SCHEDULED_ID_KEY, id);
  } catch {
    /* non-fatal — worst case we just orphan an id and cancelAll clears it */
  }
  return id;
}

/**
 * Cancel the currently-scheduled daily review notification, if any.
 * Safe to call when nothing is scheduled.
 */
export async function cancelDailyReview(): Promise<void> {
  try {
    const id = await SecureStore.getItemAsync(SCHEDULED_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {
        /* already cancelled or stale */
      });
      await SecureStore.deleteItemAsync(SCHEDULED_ID_KEY);
    }
  } catch (e) {
    console.warn('[notifications] cancelDailyReview failed', e);
  }
}

/**
 * Load the persisted daily-review settings, falling back to defaults
 * (disabled, 8:00 PM) if nothing has been saved.
 */
export async function getDailyReviewSettings(): Promise<DailyReviewSettings> {
  try {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DailyReviewSettings>;
    return {
      enabled: !!parsed.enabled,
      hour:
        typeof parsed.hour === 'number' && parsed.hour >= 0 && parsed.hour <= 23
          ? parsed.hour
          : DEFAULT_HOUR,
      minute:
        typeof parsed.minute === 'number' &&
        parsed.minute >= 0 &&
        parsed.minute <= 59
          ? parsed.minute
          : DEFAULT_MINUTE,
    };
  } catch (e) {
    console.warn('[notifications] getDailyReviewSettings failed', e);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist daily-review settings AND reconcile the OS scheduler:
 * - If enabled: (re)schedules at the chosen time, requesting permission first.
 * - If disabled: cancels any existing schedule.
 *
 * If permission is denied while enabling, the setting is saved as disabled.
 */
export async function setDailyReviewSettings(
  s: DailyReviewSettings,
): Promise<void> {
  let effective = { ...s };

  if (effective.enabled) {
    const ok = await requestPermissions();
    if (!ok) {
      effective = { ...effective, enabled: false };
    } else {
      await scheduleDailyReview({ hour: effective.hour, minute: effective.minute });
    }
  } else {
    await cancelDailyReview();
  }

  try {
    await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(effective));
  } catch (e) {
    console.warn('[notifications] setDailyReviewSettings persist failed', e);
  }
}
