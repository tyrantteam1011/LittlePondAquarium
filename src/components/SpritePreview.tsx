import React, { useEffect, useRef } from 'react';
import { GeneticVariant } from '../game/core/types';
import { FISH_BY_ID } from '../game/data/fishCatalog';
import { DECORATION_BY_ID } from '../game/data/decorationCatalog';
import { CREATURE_BY_ID } from '../game/data/creatureCatalog';
import {
  getCreatureSprite,
  getDecorationSprite,
  getFishSprite,
} from '../game/rendering/PixelArtSprites';

interface SpritePreviewProps {
  kind: 'fish' | 'decoration' | 'creature';
  id: string;
  variant?: GeneticVariant;
  size?: number;
  silhouette?: boolean;
  className?: string;
}

export const SpritePreview: React.FC<SpritePreviewProps> = ({
  kind,
  id,
  variant = 'normal',
  size = 48,
  silhouette = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sprite: HTMLCanvasElement | null = null;
    if (kind === 'fish') {
      const fish = FISH_BY_ID[id];
      if (fish) sprite = getFishSprite(fish, 0, variant);
    } else if (kind === 'creature') {
      const creature = CREATURE_BY_ID[id];
      if (creature) sprite = getCreatureSprite(creature, 0);
    } else {
      const decor = DECORATION_BY_ID[id];
      if (decor) sprite = getDecorationSprite(decor);
    }

    ctx.clearRect(0, 0, size, size);
    if (!sprite) return;

    ctx.imageSmoothingEnabled = false;
    const scale = Math.max(
      1,
      Math.floor(Math.min((size - 6) / sprite.width, (size - 6) / sprite.height))
    );
    const drawW = sprite.width * scale;
    const drawH = sprite.height * scale;
    const dx = Math.floor((size - drawW) / 2);
    const dy = Math.floor((size - drawH) / 2);

    ctx.drawImage(sprite, dx, dy, drawW, drawH);

    if (silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#244559';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [kind, id, variant, size, silhouette]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
};
