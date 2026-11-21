/**
 * Abstract In-App Purchase Service Interface (Phase 3 Monetization Architecture)
 * TODO: Bind to Apple StoreKit / Google Play Billing / RevenueCat adapter in native mobile build.
 */

export interface IAPProduct {
  id: string;
  name: string;
  priceDisplay: string;
  description: string;
  gemsGranted: number;
  coinsGranted: number;
  removesAds?: boolean;
  unlockDecorationId?: string;
  highlightTag?: string;
}

export interface IAPPurchaseResult {
  success: boolean;
  productId: string;
  message: string;
}

export interface IIAPService {
  getProducts(): IAPProduct[];
  purchaseProduct(productId: string): Promise<IAPPurchaseResult>;
}

export const IAP_PRODUCTS: IAPProduct[] = [
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    priceDisplay: '$4.99',
    description: 'Cozy boost with 80 Gems, 2,500 Coins, and the Moss Bonsai Tree.',
    gemsGranted: 80,
    coinsGranted: 2500,
    unlockDecorationId: 'aqua_bonsai',
    highlightTag: 'Popular',
  },
  {
    id: 'gem_pack',
    name: 'Gem Pack',
    priceDisplay: '$9.99',
    description: '240 shimmering Gems for special decorations and cosmetic fish.',
    gemsGranted: 240,
    coinsGranted: 0,
  },
  {
    id: 'premium_aquarium_pack',
    name: 'Premium Aquarium Pack',
    priceDisplay: '$14.99',
    description: '420 Gems, 12,000 Coins, and the Bubbling Treasure Chest centerpiece.',
    gemsGranted: 420,
    coinsGranted: 12000,
    unlockDecorationId: 'treasure_chest',
    highlightTag: 'Best Value',
  },
  {
    id: 'remove_ads',
    name: 'Remove Ads',
    priceDisplay: '$4.99',
    description: 'Claim 2X rewards & boosts instantly without watching video ads + 40 Gems.',
    gemsGranted: 40,
    coinsGranted: 0,
    removesAds: true,
  },
];

class PrototypeIAPService implements IIAPService {
  getProducts(): IAPProduct[] {
    return IAP_PRODUCTS;
  }

  async purchaseProduct(productId: string): Promise<IAPPurchaseResult> {
    const product = IAP_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return { success: false, productId, message: 'Product not found.' };
    }
    // Simulated prototype purchase confirmation
    return {
      success: true,
      productId,
      message: `${product.name} unlocked (Prototype Mode).`,
    };
  }
}

export const IAPService: IIAPService = new PrototypeIAPService();
