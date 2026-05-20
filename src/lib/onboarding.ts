import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'snapstudy.onboarding.completed';

/**
 * Returns true if the signed-in user has finished the first-run onboarding flow.
 * Stored in expo-secure-store so it survives reinstall-free relaunches and
 * keeps a single source of truth on-device.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return value === 'true';
  } catch (e) {
    console.warn('[onboarding] hasCompletedOnboarding failed', e);
    return false;
  }
}

/**
 * Marks onboarding as complete. Call this when the user finishes the
 * first-capture screen (or otherwise dismisses onboarding intentionally).
 */
export async function markOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch (e) {
    console.warn('[onboarding] markOnboardingComplete failed', e);
  }
}
