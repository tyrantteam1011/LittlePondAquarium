import { useEffect, useState } from 'react';
import { DisplaySizePreference } from '../core/types';
import { SafeAreaInsets, ViewportMetrics } from './layoutConfig';
import { computeViewportMetrics } from './scaleTiers';

/**
 * Đọc giá trị env(safe-area-inset-*) thật từ trình duyệt bằng phần tử đo ẩn
 */
function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  let probe = document.getElementById('coralia-safe-area-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'coralia-safe-area-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'fixed';
    probe.style.top = '0';
    probe.style.left = '0';
    probe.style.width = '0';
    probe.style.height = '0';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
    probe.style.paddingRight = 'env(safe-area-inset-right, 0px)';
    probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    probe.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
    document.body.appendChild(probe);
  }
  const style = window.getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

/**
 * Đọc kích thước visualViewport hiện tại và chiều cao bàn phím ảo (nếu có)
 */
function readLiveViewport(
  displaySize: DisplaySizePreference,
  overrideSize?: { width: number; height: number } | null
): ViewportMetrics {
  if (typeof window === 'undefined') {
    return computeViewportMetrics(390, 844, 2, { top: 0, right: 0, bottom: 0, left: 0 }, displaySize, 0);
  }

  if (overrideSize) {
    return computeViewportMetrics(
      overrideSize.width,
      overrideSize.height,
      window.devicePixelRatio || 2,
      { top: 0, right: 0, bottom: 0, left: 0 },
      displaySize,
      0
    );
  }

  const vv = window.visualViewport;
  const width = vv ? vv.width : window.innerWidth;
  const height = vv ? vv.height : window.innerHeight;
  const keyboardHeight = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  const safeArea = readSafeAreaInsets();

  return computeViewportMetrics(
    width,
    height,
    window.devicePixelRatio || 1,
    safeArea,
    displaySize,
    keyboardHeight
  );
}

/**
 * Hook theo dõi visualViewport, resize, xoay màn hình và bàn phím ảo
 * Trả về ViewportMetrics đồng nhất với integer worldScale và uiScale.
 */
export function useViewportScale(
  displaySize: DisplaySizePreference = 'auto',
  overrideSize?: { width: number; height: number } | null
): ViewportMetrics {
  const overrideW = overrideSize?.width ?? null;
  const overrideH = overrideSize?.height ?? null;

  const [metrics, setMetrics] = useState<ViewportMetrics>(() =>
    readLiveViewport(displaySize, overrideW && overrideH ? { width: overrideW, height: overrideH } : null)
  );

  useEffect(() => {
    const activeOverride =
      overrideW && overrideH ? { width: overrideW, height: overrideH } : null;

    const update = () => {
      const next = readLiveViewport(displaySize, activeOverride);
      setMetrics((prev) => {
        if (
          prev.viewportWidth === next.viewportWidth &&
          prev.viewportHeight === next.viewportHeight &&
          prev.worldScale === next.worldScale &&
          prev.uiScale === next.uiScale &&
          prev.effectiveTier === next.effectiveTier &&
          prev.keyboardHeight === next.keyboardHeight &&
          prev.isCompactHud === next.isCompactHud &&
          prev.safeArea.top === next.safeArea.top &&
          prev.safeArea.bottom === next.safeArea.bottom &&
          prev.safeArea.left === next.safeArea.left &&
          prev.safeArea.right === next.safeArea.right &&
          prev.displaySize === next.displaySize
        ) {
          return prev;
        }
        return next;
      });
    };

    update();

    if (activeOverride) {
      return;
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
    };
  }, [displaySize, overrideW, overrideH]);

  return metrics;
}
