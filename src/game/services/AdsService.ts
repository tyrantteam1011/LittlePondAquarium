/**
 * Abstract Rewarded Ads Service Interface (Phase 3 Monetization Architecture)
 * TODO: Replace SimulatedAdsService with native AdMob / IronSource / AppLovin SDK adapter in production build.
 */

export type AdPlacementId =
  | 'offline_2x'
  | 'income_boost_30m'
  | 'rare_discover'
  | 'bonus_offline_coins';

export interface AdRequest {
  placement: AdPlacementId;
  title: string;
  rewardDescription: string;
  durationSeconds: number;
  onReward: () => void;
}

export interface IAdsService {
  isReady(placement: AdPlacementId): boolean;
  showRewardedAd(request: AdRequest): void;
}

type AdListener = (activeRequest: AdRequest | null) => void;

class SimulatedAdsService implements IAdsService {
  private listeners = new Set<AdListener>();
  private currentRequest: AdRequest | null = null;

  isReady(_placement: AdPlacementId): boolean {
    return true;
  }

  subscribe(listener: AdListener): () => void {
    this.listeners.add(listener);
    listener(this.currentRequest);
    return () => {
      this.listeners.delete(listener);
    };
  }

  showRewardedAd(request: AdRequest): void {
    this.currentRequest = request;
    this.emit();
  }

  completeCurrentAd(): void {
    const req = this.currentRequest;
    this.currentRequest = null;
    this.emit();
    if (req) {
      req.onReward();
    }
  }

  cancelCurrentAd(): void {
    this.currentRequest = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.currentRequest);
    }
  }
}

export const AdsService = new SimulatedAdsService();
