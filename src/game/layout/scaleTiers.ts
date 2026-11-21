import { DisplaySizePreference } from '../core/types';
import {
  LAYOUT_CONFIG,
  SCALE_TIERS,
  SCALE_TIER_ORDER,
  SafeAreaInsets,
  SafeSwimBounds,
  ScaleTierId,
  ViewportMetrics,
} from './layoutConfig';

/**
 * Xác định ScaleTier gốc theo chiều rộng viewport CSS
 */
export function getBaseScaleTier(viewportWidth: number): ScaleTierId {
  const w = Math.max(240, viewportWidth);
  if (w <= SCALE_TIERS.XS.maxWidthPx) return 'XS';
  if (w <= SCALE_TIERS.S.maxWidthPx) return 'S';
  if (w <= SCALE_TIERS.M.maxWidthPx) return 'M';
  if (w <= SCALE_TIERS.L.maxWidthPx) return 'L';
  return 'XL';
}

/**
 * Dịch chuyển ScaleTier theo cài đặt Display size (±1 bậc) và trả về integer worldScale
 */
export function resolveScaleTier(
  viewportWidth: number,
  viewportHeight: number,
  displaySize: DisplaySizePreference = 'auto'
): {
  baseTier: ScaleTierId;
  effectiveTier: ScaleTierId;
  worldScale: number;
  uiScale: number;
} {
  const baseTier = getBaseScaleTier(viewportWidth);
  const baseIndex = SCALE_TIER_ORDER.indexOf(baseTier);
  const shift = LAYOUT_CONFIG.DISPLAY_SIZE_TIER_SHIFT[displaySize] ?? 0;
  const effectiveIndex = Math.max(0, Math.min(SCALE_TIER_ORDER.length - 1, baseIndex + shift));
  const effectiveTier = SCALE_TIER_ORDER[effectiveIndex];

  // Tính worldScale nguyên cho chế độ Auto (có bảo vệ màn hình thấp / xoay ngang)
  let autoWorldScale = SCALE_TIERS[baseTier].worldScale;
  if (viewportHeight <= LAYOUT_CONFIG.LANDSCAPE_SHORT_HEIGHT_PX) {
    autoWorldScale = Math.min(autoWorldScale, 2);
  } else if (viewportHeight <= LAYOUT_CONFIG.MEDIUM_HEIGHT_CAP_PX) {
    autoWorldScale = Math.min(autoWorldScale, 3);
  }

  // Đảm bảo Smaller/Larger luôn thay đổi rõ rệt ít nhất 1 bậc nguyên nếu chưa chạm biên
  let worldScale = autoWorldScale;
  if (shift < 0) {
    const shiftedScale = SCALE_TIERS[effectiveTier].worldScale;
    worldScale =
      shiftedScale < autoWorldScale
        ? shiftedScale
        : Math.max(LAYOUT_CONFIG.MIN_WORLD_SCALE, autoWorldScale - 1);
  } else if (shift > 0) {
    const shiftedScale = SCALE_TIERS[effectiveTier].worldScale;
    const maxAllowedForViewport =
      viewportWidth <= SCALE_TIERS.XS.maxWidthPx ||
      viewportHeight <= LAYOUT_CONFIG.LANDSCAPE_SHORT_HEIGHT_PX
        ? 3
        : LAYOUT_CONFIG.MAX_WORLD_SCALE;
    worldScale =
      shiftedScale > autoWorldScale
        ? Math.min(maxAllowedForViewport, shiftedScale)
        : Math.min(maxAllowedForViewport, autoWorldScale + 1);
  }

  // Luôn khóa chặt ở số nguyên >= 1
  worldScale = Math.max(
    LAYOUT_CONFIG.MIN_WORLD_SCALE,
    Math.min(LAYOUT_CONFIG.MAX_WORLD_SCALE, Math.round(worldScale))
  );

  // Điều chỉnh uiScale mượt theo tier và Display size
  const baseUiScale = SCALE_TIERS[effectiveTier].uiScale;
  const uiScale =
    shift === 0
      ? baseUiScale
      : Number(Math.max(0.84, Math.min(1.14, baseUiScale + shift * 0.03)).toFixed(2));

  return { baseTier, effectiveTier, worldScale, uiScale };
}

/**
 * Tính toán toàn bộ thông số viewport, DPR, HUD density và tỷ lệ pixel nguyên
 */
export function computeViewportMetrics(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio: number,
  safeArea: SafeAreaInsets,
  displaySize: DisplaySizePreference = 'auto',
  keyboardHeight = 0
): ViewportMetrics {
  const safeW = Math.max(240, Math.round(viewportWidth));
  const safeH = Math.max(240, Math.round(viewportHeight));
  const dpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);
  // Làm tròn DPR về số nguyên (1, 2, hoặc 3) để tránh làm mờ cạnh pixel
  const renderDpr = Math.max(1, Math.min(3, Math.round(dpr)));

  const isLandscape = safeW > safeH;
  const isCompactHud =
    safeH <= LAYOUT_CONFIG.COMPACT_HUD_MAX_HEIGHT_PX ||
    safeW <= LAYOUT_CONFIG.COMPACT_HUD_MAX_WIDTH_PX;

  const { baseTier, effectiveTier, worldScale, uiScale } = resolveScaleTier(
    safeW,
    safeH,
    displaySize
  );
  const tierDef = SCALE_TIERS[effectiveTier];

  return {
    viewportWidth: safeW,
    viewportHeight: safeH,
    devicePixelRatio: dpr,
    renderDpr,
    keyboardHeight: Math.max(0, Math.round(keyboardHeight)),
    isLandscape,
    isCompactHud,
    baseTier,
    effectiveTier,
    worldScale,
    uiScale,
    hudDensity: isCompactHud ? 'compact' : tierDef.hudDensity,
    gridColumns: tierDef.gridColumns,
    safeArea,
    displaySize,
  };
}

/**
 * Tính vùng bơi an toàn theo chiều cao thực tế của TopHud, BottomBar và safe area
 * Đảm bảo HUD không bao giờ che mất cá ở tầng mặt hoặc tầng đáy.
 */
export function computeSafeSwimBounds(
  viewportWidth: number,
  viewportHeight: number,
  hudTopPx: number,
  hudBottomPx: number,
  safeArea: SafeAreaInsets
): SafeSwimBounds {
  const vh = Math.max(240, viewportHeight);
  const vw = Math.max(240, viewportWidth);

  const effectiveTopPx = Math.max(safeArea.top, hudTopPx) + LAYOUT_CONFIG.HUD_TOP_CLEARANCE_PX;
  const effectiveBottomPx =
    Math.max(safeArea.bottom, hudBottomPx) + LAYOUT_CONFIG.HUD_BOTTOM_CLEARANCE_PX;

  let waterTopNorm = Math.max(
    LAYOUT_CONFIG.CANONICAL_WATER_TOP_NORM,
    effectiveTopPx / vh
  );
  waterTopNorm = Math.max(
    LAYOUT_CONFIG.MIN_WATER_TOP_NORM,
    Math.min(LAYOUT_CONFIG.MAX_WATER_TOP_NORM, waterTopNorm)
  );

  let floorNorm = Math.min(
    LAYOUT_CONFIG.CANONICAL_FLOOR_NORM,
    1 - effectiveBottomPx / vh
  );
  floorNorm = Math.max(
    LAYOUT_CONFIG.MIN_FLOOR_NORM,
    Math.min(LAYOUT_CONFIG.MAX_FLOOR_NORM, floorNorm)
  );

  // Bảo đảm luôn còn ít nhất 36% chiều cao làm vùng bơi mở
  if (floorNorm - waterTopNorm < 0.36) {
    const mid = (waterTopNorm + floorNorm) / 2;
    waterTopNorm = Math.max(0.08, mid - 0.18);
    floorNorm = Math.min(0.9, mid + 0.18);
  }

  const safeLeftNorm = Math.min(0.12, Math.max(0.02, (safeArea.left + 6) / vw));
  const safeRightNorm = 1 - Math.min(0.12, Math.max(0.02, (safeArea.right + 6) / vw));

  return {
    waterTopNorm,
    floorNorm,
    safeLeftNorm,
    safeRightNorm,
  };
}

/**
 * Ánh xạ tọa độ Y chuẩn hóa (0..1 theo bể mẫu 0.11..0.84) sang vùng bơi an toàn thực tế
 * Dùng cho trang trí và trứng để chúng luôn nằm trên lớp cát nhìn thấy được.
 */
export function mapNormalizedYToSafeBounds(
  rawNormY: number,
  bounds: SafeSwimBounds
): number {
  const canonTop = LAYOUT_CONFIG.CANONICAL_WATER_TOP_NORM;
  const canonFloor = LAYOUT_CONFIG.CANONICAL_FLOOR_NORM;

  if (rawNormY <= canonTop) {
    return (rawNormY / canonTop) * bounds.waterTopNorm;
  }
  if (rawNormY <= canonFloor) {
    const t = (rawNormY - canonTop) / (canonFloor - canonTop);
    return bounds.waterTopNorm + t * (bounds.floorNorm - bounds.waterTopNorm);
  }
  // Vùng nền cát phía dưới floorNorm: giữ trên BottomBar tối đa 55% dải còn lại
  const tSand = (rawNormY - canonFloor) / (1 - canonFloor);
  const visibleSandDepth = Math.min(0.1, (1 - bounds.floorNorm) * 0.55);
  return Math.min(0.96, bounds.floorNorm + tSand * visibleSandDepth);
}

/**
 * Ánh xạ ngược từ Y hiển thị trên màn hình về Y chuẩn hóa khi người chơi kéo/đặt trang trí
 */
export function unmapSafeYToCanonical(
  screenNormY: number,
  bounds: SafeSwimBounds
): number {
  const canonTop = LAYOUT_CONFIG.CANONICAL_WATER_TOP_NORM;
  const canonFloor = LAYOUT_CONFIG.CANONICAL_FLOOR_NORM;

  if (screenNormY <= bounds.waterTopNorm) {
    return (screenNormY / Math.max(0.01, bounds.waterTopNorm)) * canonTop;
  }
  if (screenNormY <= bounds.floorNorm) {
    const t = (screenNormY - bounds.waterTopNorm) / Math.max(0.01, bounds.floorNorm - bounds.waterTopNorm);
    return canonTop + t * (canonFloor - canonTop);
  }
  const visibleSandDepth = Math.max(0.02, Math.min(0.1, (1 - bounds.floorNorm) * 0.55));
  const tSand = Math.min(1, (screenNormY - bounds.floorNorm) / visibleSandDepth);
  return Math.min(0.96, canonFloor + tSand * (1 - canonFloor));
}

/**
 * Tính bán kính hitbox trong tọa độ world sao cho kích thước trên màn hình luôn >= minCssPx
 */
export function getMinWorldHitRadius(
  minCssDiameterPx: number,
  worldScale: number,
  minWorldRadius = 10
): number {
  const safeScale = Math.max(1, worldScale);
  return Math.max(minWorldRadius, minCssDiameterPx / 2 / safeScale);
}

/**
 * Bảng kích thước cá hiển thị trên màn hình (CSS px) cho tài liệu và kiểm thử
 */
export interface FishScreenSizeRow {
  device: string;
  viewport: string;
  baseTier: ScaleTierId;
  displaySize: DisplaySizePreference;
  worldScale: number;
  worldGrid: string;
  smallFishCssPx: string;
  standardFishCssPx: string;
  largeFishCssPx: string;
  minHitboxCssPx: string;
}

export function buildFishScreenSizeTable(): FishScreenSizeRow[] {
  const samples: { device: string; w: number; h: number }[] = [
    { device: 'iPhone SE1 (XS)', w: 320, h: 568 },
    { device: 'Android Small (XS)', w: 360, h: 800 },
    { device: 'iPhone 14 (S)', w: 390, h: 844 },
    { device: 'iPhone 15 Pro Max (M)', w: 430, h: 932 },
    { device: 'iPad Split View (M)', w: 507, h: 1080 },
    { device: 'Phone Landscape (M/short)', w: 568, h: 320 },
    { device: 'iPhone 14 Landscape (L/short)', w: 844, h: 390 },
    { device: 'iPad Air Portrait (L)', w: 834, h: 1194 },
    { device: 'iPad Pro Portrait (XL)', w: 1024, h: 1366 },
  ];

  const rows: FishScreenSizeRow[] = [];
  const modes: DisplaySizePreference[] = ['smaller', 'auto', 'larger'];

  for (const s of samples) {
    for (const mode of modes) {
      const { baseTier, worldScale } = resolveScaleTier(s.w, s.h, mode);
      const worldW = Math.ceil(s.w / worldScale);
      const worldH = Math.ceil(s.h / worldScale);
      // Sprite cơ bản 20×11: nhỏ (baby 0.58 × size 0.85 ≈ 10×6), tiêu chuẩn (adult 1.0 × 1.0 = 20×11), lớn (breeding 1.08 × 1.55 ≈ 33×18)
      const smW = Math.round(20 * 0.85 * 0.58) * worldScale;
      const smH = Math.round(11 * 0.85 * 0.58) * worldScale;
      const mdW = 20 * worldScale;
      const mdH = 11 * worldScale;
      const lgW = Math.round(20 * 1.55 * 1.08) * worldScale;
      const lgH = Math.round(11 * 1.55 * 1.08) * worldScale;
      const hitCss = Math.max(LAYOUT_CONFIG.MIN_HITBOX_CSS_PX.fish, Math.max(mdW, mdH));

      rows.push({
        device: s.device,
        viewport: `${s.w}×${s.h}`,
        baseTier,
        displaySize: mode,
        worldScale,
        worldGrid: `${worldW}×${worldH}`,
        smallFishCssPx: `${smW}×${smH}`,
        standardFishCssPx: `${mdW}×${mdH}`,
        largeFishCssPx: `${lgW}×${lgH}`,
        minHitboxCssPx: `${hitCss}×${hitCss}`,
      });
    }
  }
  return rows;
}
