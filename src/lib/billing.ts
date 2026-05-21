/**
 * Billing abstraction.
 *
 * TODO: swap MockBillingClient for a RevenueCatBillingClient that wraps
 * `react-native-purchases` once the native dep is added. The interface below
 * is intentionally narrow so the UI layer doesn't need to change.
 *
 * See PROJECT_PLAN.md §10 for pricing and §11 (Weeks 9–10) for integration.
 */

export type Tier = 'free' | 'pro' | 'student';
export type PaidTier = Exclude<Tier, 'free'>;
export type BillingPeriod = 'monthly' | 'annual';

export interface Offering {
  /** Stable product identifier — maps to RevenueCat product / store SKU. */
  productId: string;
  /** Which tier this offering grants on successful purchase. */
  tier: PaidTier;
  /** Monthly vs annual; student plan is always annual. */
  period: BillingPeriod;
  /** Display price including currency symbol, e.g. "$4.99". */
  priceString: string;
  /** Raw price for comparisons / analytics. */
  price: number;
  currency: string;
  /** Short marketing label, e.g. "$4.99 / month". */
  displayLabel: string;
  /** Bulleted feature list to render in the paywall card. */
  features: string[];
  /** Optional small badge text, e.g. "Save 42%" or ".edu required". */
  badge?: string;
}

export interface BillingClient {
  getOfferings(): Promise<Offering[]>;
  purchase(productId: string): Promise<{ tier: PaidTier }>;
  restorePurchases(): Promise<void>;
  getActiveTier(): Promise<Tier>;
}

// ---------------------------------------------------------------------------
// Canned offerings — keep in sync with PROJECT_PLAN.md §10.
// ---------------------------------------------------------------------------

const PRO_FEATURES = [
  'Unlimited captures (fair use 200/mo)',
  'PDF & audio import',
  'Export to Anki / CSV',
  'Image-rich cards',
  'Exam mode',
  'Ad-free forever',
];

const STUDENT_FEATURES = [
  'Everything in Pro',
  'Annual billing only',
  'Requires .edu verification',
  'Lock in student pricing while enrolled',
];

export const FREE_FEATURES = [
  '10 captures per month',
  'Unlimited review on existing cards',
  'FSRS scheduling',
  'Local-first storage',
];

export const MOCK_OFFERINGS: Offering[] = [
  {
    productId: 'snapstudy_pro_monthly',
    tier: 'pro',
    period: 'monthly',
    priceString: '$4.99',
    price: 4.99,
    currency: 'USD',
    displayLabel: '$4.99 / month',
    features: PRO_FEATURES,
  },
  {
    productId: 'snapstudy_pro_annual',
    tier: 'pro',
    period: 'annual',
    priceString: '$34.99',
    price: 34.99,
    currency: 'USD',
    displayLabel: '$34.99 / year',
    features: PRO_FEATURES,
    badge: 'Save 42%',
  },
  {
    productId: 'snapstudy_student_annual',
    tier: 'student',
    period: 'annual',
    priceString: '$24.99',
    price: 24.99,
    currency: 'USD',
    displayLabel: '$24.99 / year',
    features: STUDENT_FEATURES,
    badge: '.edu required',
  },
];

// ---------------------------------------------------------------------------
// Mock implementation — returns canned data, simulates a small network delay
// so loading states in the UI get exercised.
// ---------------------------------------------------------------------------

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockBillingClient implements BillingClient {
  private activeTier: Tier = 'free';

  async getOfferings(): Promise<Offering[]> {
    return delay(MOCK_OFFERINGS);
  }

  async purchase(productId: string): Promise<{ tier: PaidTier }> {
    const offering = MOCK_OFFERINGS.find((o) => o.productId === productId);
    if (!offering) {
      throw new Error(`Unknown product: ${productId}`);
    }
    this.activeTier = offering.tier;
    return delay({ tier: offering.tier }, 500);
  }

  async restorePurchases(): Promise<void> {
    // In the mock, we have nothing to restore. The real client will read
    // the customer's RevenueCat entitlements and update activeTier.
    return delay(undefined, 400);
  }

  async getActiveTier(): Promise<Tier> {
    return delay(this.activeTier);
  }
}

// ---------------------------------------------------------------------------
// Singleton. Uses the real RevenueCat client when EXPO_PUBLIC_REVENUECAT_API_KEY_*
// is set AND `react-native-purchases` is installed; otherwise falls back to
// the mock so the paywall UI is always testable in dev.
// ---------------------------------------------------------------------------

function makeBillingClient(): BillingClient {
  try {
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
    if (!iosKey && !androidKey) return new MockBillingClient();
    // Late require so a missing native module doesn't break the bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./billing-revenuecat');
    return new mod.RevenueCatBillingClient();
  } catch {
    return new MockBillingClient();
  }
}

export const billing: BillingClient = makeBillingClient();
