// Real RevenueCat-backed BillingClient.
// Activated by setting EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/_ANDROID +
// installing `react-native-purchases`. Until then, src/lib/billing.ts
// uses MockBillingClient.
//
// RevenueCat dashboard requirements:
//   - Entitlements: "pro", "student"
//   - Products: snapstudy_pro_monthly, snapstudy_pro_annual, snapstudy_student_annual

import { Platform } from 'react-native';
import type { BillingClient, Offering, PaidTier, Tier } from './billing';
import { MOCK_OFFERINGS } from './billing';

type Purchases = typeof import('react-native-purchases').default;
let _purchases: Purchases | null = null;

async function lib(): Promise<Purchases | null> {
  if (_purchases) return _purchases;
  try {
    const mod = await import('react-native-purchases');
    _purchases = mod.default;
    return _purchases;
  } catch {
    return null;
  }
}

export function isRevenueCatAvailable(): boolean {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  return !!key;
}

export class RevenueCatBillingClient implements BillingClient {
  private configured = false;

  async configure(appUserId?: string): Promise<void> {
    if (this.configured) return;
    const key =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
        : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
    if (!key) throw new Error('RevenueCat API key not set');
    const Purchases = await lib();
    if (!Purchases) throw new Error('react-native-purchases not installed');
    Purchases.configure({ apiKey: key, appUserID: appUserId });
    this.configured = true;
  }

  async getOfferings(): Promise<Offering[]> {
    await this.configure();
    const Purchases = await lib();
    if (!Purchases) return MOCK_OFFERINGS;
    const off = await Purchases.getOfferings();
    const current = off.current;
    if (!current) return MOCK_OFFERINGS;
    // Merge live prices over the canned metadata so features/badges
    // stay in sync with PROJECT_PLAN.md without re-entering them in the
    // RevenueCat dashboard.
    return MOCK_OFFERINGS.map((seed) => {
      const pkg = current.availablePackages.find(
        (p) => p.product.identifier === seed.productId,
      );
      if (!pkg) return seed;
      return {
        ...seed,
        priceString: pkg.product.priceString,
        price: pkg.product.price,
        currency: pkg.product.currencyCode ?? seed.currency,
        displayLabel: `${pkg.product.priceString} / ${seed.period === 'annual' ? 'year' : 'month'}`,
      };
    });
  }

  async purchase(productId: string): Promise<{ tier: PaidTier }> {
    await this.configure();
    const Purchases = await lib();
    if (!Purchases) throw new Error('Purchases SDK unavailable');
    const off = await Purchases.getOfferings();
    const pkg = off.current?.availablePackages.find(
      (p) => p.product.identifier === productId,
    );
    if (!pkg) throw new Error(`Unknown product: ${productId}`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const e = customerInfo.entitlements.active;
    if (e['student']) return { tier: 'student' };
    if (e['pro']) return { tier: 'pro' };
    throw new Error('Purchase completed but no entitlement is active');
  }

  async restorePurchases(): Promise<void> {
    await this.configure();
    const Purchases = await lib();
    if (!Purchases) return;
    await Purchases.restorePurchases();
  }

  async getActiveTier(): Promise<Tier> {
    await this.configure();
    const Purchases = await lib();
    if (!Purchases) return 'free';
    const info = await Purchases.getCustomerInfo();
    const e = info.entitlements.active;
    if (e['student']) return 'student';
    if (e['pro']) return 'pro';
    return 'free';
  }
}
