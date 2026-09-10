import React, { useState, useEffect } from 'react';
import { Text, Box } from 'termui';

export interface ShimmerTextProps {
  children: string;
  /** Duration of one sweep in milliseconds (default: 2000ms) */
  duration?: number;
  /** Highlight color for the shimmer wave (default: 'white') */
  color?: string;
  /** Spread/width of the highlight band in characters (default: 5) */
  spread?: number;
  /** Reverse direction: sweep right-to-left instead of left-to-right (default: false) */
  reverse?: boolean;
  /** Play once instead of looping continuously (default: false) */
  once?: boolean;
  /** Turn off shimmer effect and render plain text (default: false) */
  disabled?: boolean;
  /** Whether the highlighted text should be bold (default: true) */
  bold?: boolean;
}

/**
 * High-performance, zero-flicker terminal implementation of Shimmer text.
 * Uses 3-chunk rendering (before, highlight, after) to minimize Yoga layout overhead
 * and runs at a stable 10-12 FPS to eliminate terminal refresh tearing.
 */
export const ShimmerText: React.FC<ShimmerTextProps> = ({
  children,
  duration = 2000,
  color = 'white',
  spread = 5,
  reverse = false,
  once = false,
  disabled = false,
  bold = true,
}) => {
  const text = typeof children === 'string' ? children : String(children || '');
  const textLength = text.length;

  // Total sweep distance with entry/exit padding
  const totalSteps = textLength + spread * 2;
  // Stable frame interval (minimum 90ms = max ~11 FPS) prevents terminal redraw flicker
  const frameInterval = Math.max(90, Math.floor(duration / Math.max(1, totalSteps)));

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (disabled || textLength === 0) return;

    const timer = setInterval(() => {
      setStep((prev) => {
        if (once && prev >= totalSteps) {
          return prev;
        }
        return (prev + 1) % (totalSteps + 4);
      });
    }, frameInterval);

    return () => clearInterval(timer);
  }, [disabled, textLength, frameInterval, totalSteps, once]);

  if (disabled) {
    return <Text dim>{text}</Text>;
  }

  // Calculate highlight position
  const currentPos = reverse
    ? totalSteps - step - spread
    : step - spread;

  const startHighlight = Math.max(0, currentPos - Math.floor(spread / 2));
  const endHighlight = Math.min(textLength, currentPos + Math.ceil(spread / 2));

  // If highlight is completely outside bounds, render whole text dimmed
  if (endHighlight <= 0 || startHighlight >= textLength) {
    return <Text dim>{text}</Text>;
  }

  const beforeText = text.slice(0, startHighlight);
  const highlightText = text.slice(startHighlight, endHighlight);
  const afterText = text.slice(endHighlight);

  return (
    <Box flexDirection="row">
      {beforeText.length > 0 && <Text dim>{beforeText}</Text>}
      {highlightText.length > 0 && (
        <Text bold={bold} color={color as any}>
          {highlightText}
        </Text>
      )}
      {afterText.length > 0 && <Text dim>{afterText}</Text>}
    </Box>
  );
};
