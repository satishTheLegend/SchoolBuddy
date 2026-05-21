// Thin analytics wrapper. No-op when keys are missing so dev/local
// builds don't break and there are no spurious events.
//
// Configure via:
//   EXPO_PUBLIC_POSTHOG_KEY      — PostHog project API key
//   EXPO_PUBLIC_POSTHOG_HOST     — defaults to https://us.i.posthog.com
//   EXPO_PUBLIC_SENTRY_DSN       — Sentry DSN

import { Platform } from 'react-native';

type PostHogModule = typeof import('posthog-react-native');
type SentryModule = typeof import('@sentry/react-native');

let posthog: InstanceType<PostHogModule['PostHog']> | null = null;
let sentry: SentryModule | null = null;
let initialized = false;

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const phKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (phKey) {
    try {
      const ph = await import('posthog-react-native');
      posthog = new ph.PostHog(phKey, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      });
    } catch (e) {
      console.warn('PostHog init failed', e);
    }
  }

  if (sentryDsn) {
    try {
      sentry = await import('@sentry/react-native');
      sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 0.1,
        // PII opt-in only:
        sendDefaultPii: false,
      });
    } catch (e) {
      console.warn('Sentry init failed', e);
    }
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!posthog) return;
  posthog.capture(event, { platform: Platform.OS, ...props });
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  if (posthog) posthog.identify(userId, props);
  if (sentry) sentry.setUser({ id: userId });
}

export function reset(): void {
  if (posthog) posthog.reset();
  if (sentry) sentry.setUser(null);
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (sentry) {
    sentry.captureException(err, { extra: context });
  } else {
    console.error('[err]', err, context);
  }
}

export function featureFlag(key: string, fallback = false): boolean {
  if (!posthog) return fallback;
  return posthog.isFeatureEnabled(key) ?? fallback;
}
