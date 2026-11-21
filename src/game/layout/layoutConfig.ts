import { DisplaySizePreference } from '../core/types';

/**
 * Cấu hình thống nhất cho hệ thống tỷ lệ màn hình nhỏ (Phone + iPad)
 * Single source of truth cho scale tiers, integer pixel scale, hitbox CSS và safe swim zones.
 */

export type ScaleTierId = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type HudDensity = 'compact' | 'standard' | 'spacious';

export interface ScaleTierDefinition {
  id: ScaleTierId;
  maxWidthPx: number;
  /** Hệ số phóng pixel NGUYÊN mặc định cho canvas bể cá (1×, 2×, 3×, 4×) */
  worldScale: number;
  /** Hệ số tỷ lệ UI cho khoảng cách, chữ và kích thước popup */
  uiScale: number;
  hudDensity: HudDensity;
  /** Số cột lưới gợi ý cho các bảng thẻ (Fish/Decor/Collection) */
  gridColumns: number;
  /** Chiều rộng tối đa của modal trên màn hình lớn */
  modalMaxWidthPx: number;
  /** Chiều rộng tối đa cho modal rộng (Research / Encyclopedia) */
  wideModalMaxWidthPx: number;
}

export const SCALE_TIER_ORDER: readonly ScaleTierId[] = ['XS', 'S', 'M', 'L', 'XL'] as const;

export const SCALE_TIERS: Record<ScaleTierId, ScaleTierDefinition> = {
  XS: {
    id: 'XS',
    maxWidthPx: 360,
    worldScale: 2,
    uiScale: 0.88,
    hudDensity: 'compact',
    gridColumns: 1,
    modalMaxWidthPx: 360,
    wideModalMaxWidthPx: 360,
  },
  S: {
    id: 'S',
    maxWidthPx: 414,
    worldScale: 2,
    uiScale: 0.94,
    hudDensity: 'standard',
    gridColumns: 2,
    modalMaxWidthPx: 414,
    wideModalMaxWidthPx: 414,
  },
  M: {
    id: 'M',
    maxWidthPx: 600,
    worldScale: 2,
    uiScale: 1.0,
    hudDensity: 'standard',
    gridColumns: 2,
    modalMaxWidthPx: 560,
    wideModalMaxWidthPx: 580,
  },
  L: {
    id: 'L',
    maxWidthPx: 900,
    worldScale: 3,
    uiScale: 1.04,
    hudDensity: 'spacious',
    gridColumns: 3,
    modalMaxWidthPx: 680,
    wideModalMaxWidthPx: 840,
  },
  XL: {
    id: 'XL',
    maxWidthPx: Number.POSITIVE_INFINITY,
    worldScale: 4,
    uiScale: 1.08,
    hudDensity: 'spacious',
    gridColumns: 4,
    modalMaxWidthPx: 740,
    wideModalMaxWidthPx: 900,
  },
};

export const LAYOUT_CONFIG = {
  /** Ràng buộc hệ số phóng pixel nguyên của bể cá */
  MIN_WORLD_SCALE: 1,
  MAX_WORLD_SCALE: 4,
  /** Ngưỡng chiều cao màn hình ngắn (điện thoại xoay ngang / iPhone SE) */
  COMPACT_HUD_MAX_HEIGHT_PX: 440,
  COMPACT_HUD_MAX_WIDTH_PX: 360,
  /** Giới hạn worldScale khi màn hình thấp để giữ vùng bơi thoáng */
  LANDSCAPE_SHORT_HEIGHT_PX: 440,
  MEDIUM_HEIGHT_CAP_PX: 820,
  /** Kích thước vùng chạm tối thiểu tính theo CSS px */
  MIN_HITBOX_CSS_PX: {
    fish: 44,
    coin: 48,
    rareVisitor: 48,
    control: 44,
  },
  /** Kích thước thế giới logic tối thiểu (px logic) để không phá vỡ vật lý bơi */
  MIN_WORLD_WIDTH: 120,
  MIN_WORLD_HEIGHT: 120,
  /** Biên an toàn mặc định của mặt nước và đáy cát (tỷ lệ 0..1) */
  CANONICAL_WATER_TOP_NORM: 0.11,
  CANONICAL_FLOOR_NORM: 0.84,
  MIN_WATER_TOP_NORM: 0.09,
  MAX_WATER_TOP_NORM: 0.3,
  MIN_FLOOR_NORM: 0.6,
  MAX_FLOOR_NORM: 0.87,
  /** Khoảng đệm thêm dưới TopHud và trên BottomBar (CSS px) */
  HUD_TOP_CLEARANCE_PX: 4,
  HUD_BOTTOM_CLEARANCE_PX: 6,
  /** Bước dịch chuyển tier khi người chơi chọn Display size */
  DISPLAY_SIZE_TIER_SHIFT: {
    auto: 0,
    smaller: -1,
    larger: 1,
  } as Record<DisplaySizePreference, number>,
} as const;

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeSwimBounds {
  /** Tỷ lệ Y của mặt nước (0..1) ngay dưới TopHud */
  waterTopNorm: number;
  /** Tỷ lệ Y của đáy cát (0..1) ngay trên BottomBar */
  floorNorm: number;
  /** Tỷ lệ biên trái/phải an toàn (tránh tai thỏ/Dynamic Island khi xoay ngang) */
  safeLeftNorm: number;
  safeRightNorm: number;
}

export interface ViewportMetrics {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  /** DPR nguyên dùng cho canvas backing store để pixel sắc nét */
  renderDpr: number;
  keyboardHeight: number;
  isLandscape: boolean;
  isCompactHud: boolean;
  /** Tier gốc theo chiều rộng viewport */
  baseTier: ScaleTierId;
  /** Tier thực tế sau khi áp dụng cài đặt Display size */
  effectiveTier: ScaleTierId;
  /** Tỷ lệ pixel NGUYÊN cho canvas bể cá (1, 2, 3, 4) */
  worldScale: number;
  /** Tỷ lệ UI (font/padding/layout) */
  uiScale: number;
  hudDensity: HudDensity;
  gridColumns: number;
  safeArea: SafeAreaInsets;
  displaySize: DisplaySizePreference;
}
