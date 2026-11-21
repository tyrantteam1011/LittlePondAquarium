import React, { useEffect, useState } from 'react';
import { TutorialTargetId } from '../../game/tutorial/types';
import { Pointer } from 'lucide-react';

interface TutorialHandPointerProps {
  targetId?: TutorialTargetId;
  mode: 'tap' | 'drag' | 'point' | 'none';
  reducedMotion?: boolean;
}

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Reusable Animated Tutorial Hand Pointer + Soft Highlight Ring
 * Tracks any [data-tutorial-target] UI control or center/snail aquarium hotspot
 * without blocking clicks or hiding the live underwater scene.
 */
export const TutorialHandPointer: React.FC<TutorialHandPointerProps> = ({
  targetId,
  mode,
  reducedMotion = false,
}) => {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    if (!targetId || mode === 'none') {
      setRect(null);
      return;
    }

    const measure = () => {
      if (targetId === 'aquarium-center') {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setRect({
          left: vw * 0.5 - 52,
          top: vh * 0.44 - 52,
          width: 104,
          height: 104,
        });
        return;
      }

      if (targetId === 'snail-coin') {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setRect({
          left: vw * 0.48 - 34,
          top: vh * 0.64 - 34,
          width: 68,
          height: 68,
        });
        return;
      }

      const el = document.querySelector<HTMLElement>(`[data-tutorial-target="${targetId}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setRect({
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
          });
          return;
        }
      }
      setRect(null);
    };

    measure();
    const interval = window.setInterval(measure, 240);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
    };
  }, [targetId, mode]);

  if (!rect || mode === 'none') return null;

  const isBottomZone = rect.top > window.innerHeight * 0.65;
  const handLeft = rect.left + rect.width * 0.5;
  const handTop = isBottomZone ? rect.top - 12 : rect.top + rect.height + 6;
  const animClass = reducedMotion
    ? ''
    : mode === 'drag'
      ? 'animate-hand-drag'
      : 'animate-hand-tap';

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      {/* Glowing Highlight Ring around target */}
      <div
        className={`fixed rounded-2xl border-2 border-[#ffe68a]/90 ${
          reducedMotion ? '' : 'tutorial-spotlight'
        }`}
        style={{
          left: rect.left - 4,
          top: rect.top - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />

      {/* Animated Hand Pointer */}
      <div
        className="fixed -translate-x-1/2"
        style={{
          left: handLeft,
          top: Math.max(56, Math.min(window.innerHeight - 64, handTop)),
        }}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#ffe68a] bg-[#0e2d3f]/90 text-[#ffe68a] shadow-lg ${animClass}`}
        >
          <Pointer className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
