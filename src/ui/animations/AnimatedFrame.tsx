import React, { useState, useEffect } from 'react';
import { Text, Box } from 'termui';
import { FrameAnimation, AnimationSlot } from './types.js';
import { animationRegistry } from './registry.js';

export interface AnimatedFrameProps {
  /** Animation slot to play from registry (e.g. "bannerLogo", "serverPulse") */
  slot?: AnimationSlot;
  /** Or directly provide a custom FrameAnimation */
  animation?: FrameAnimation;
  /** Override color (e.g. "white", "cyan", "green", "yellow", "red") */
  color?: string;
  /** Whether to render bold */
  bold?: boolean;
  /** Whether to render dimmed */
  dim?: boolean;
  /** Optional prefix text */
  prefix?: string;
  /** Optional suffix text */
  suffix?: string;
  /** Whether the animation is actively running (default: true). Set false when tab is hidden */
  active?: boolean;
}

export const AnimatedFrame: React.FC<AnimatedFrameProps> = ({
  slot,
  animation: directAnimation,
  color,
  bold,
  dim,
  prefix,
  suffix,
  active = true,
}) => {
  const anim = directAnimation || (slot ? animationRegistry.getAnimation(slot) : null);

  const [frameIndex, setFrameIndex] = useState(0);
  const [forward, setForward] = useState(true);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  useEffect(() => {
    if (!active || !anim || !anim.frames || anim.frames.length <= 1) return;

    // Enforce 100ms minimum to guarantee zero terminal flicker
    const interval = Math.max(100, anim.intervalMs || 100);
    const maxIndex = anim.frames.length - 1;
    const maxCycles = anim.iterations || 1;

    const timer = setInterval(() => {
      setFrameIndex((prevIndex) => {
        if (!anim.loop && cyclesCompleted >= maxCycles) {
          return prevIndex;
        }

        if (anim.pingPong) {
          if (forward) {
            if (prevIndex >= maxIndex) {
              setForward(false);
              return Math.max(0, prevIndex - 1);
            }
            return prevIndex + 1;
          } else {
            if (prevIndex <= 0) {
              setForward(true);
              setCyclesCompleted((c) => c + 1);
              return Math.min(maxIndex, 1);
            }
            return prevIndex - 1;
          }
        } else {
          const next = prevIndex + 1;
          if (next > maxIndex) {
            setCyclesCompleted((c) => c + 1);
            return 0;
          }
          return next;
        }
      });
    }, interval);

    return () => clearInterval(timer);
  }, [anim, forward, cyclesCompleted]);

  if (!anim || !anim.frames || anim.frames.length === 0) {
    return null;
  }

  const currentFrame = anim.frames[frameIndex % anim.frames.length] || '';
  const isBold = bold !== undefined ? bold : (anim.style?.bold ?? false);
  const isDim = dim !== undefined ? dim : (anim.style?.dim ?? false);
  const textColor = color || anim.style?.color || undefined;

  return (
    <Box flexDirection="row">
      {prefix && <Text>{prefix}</Text>}
      <Text bold={isBold} dim={isDim} color={textColor as any}>
        {currentFrame}
      </Text>
      {suffix && <Text>{suffix}</Text>}
    </Box>
  );
};
