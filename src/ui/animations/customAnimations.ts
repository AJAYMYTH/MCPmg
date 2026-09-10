import { FrameAnimation, StandardAnimationSlot } from './types.js';

/**
 * ============================================================================
 * USER CUSTOM ANIMATIONS CONFIGURATION
 * ============================================================================
 * Provide your custom animations in this file!
 *
 * Each animation is an object conforming to FrameAnimation:
 * - id: unique string name
 * - name: human readable title
 * - frames: array of strings (single or multi-line ASCII/unicode frames)
 * - intervalMs: duration of each frame in milliseconds (e.g. 80ms)
 * - loop: whether to repeat continuously (true/false)
 * - pingPong: if true, oscillates forward and backward (0 -> 1 -> 2 -> 1 -> 0)
 * - style: { bold?: boolean, dim?: boolean, color?: string }
 * ============================================================================
 */

/**
 * Slot 1: [bannerLogo] Header & Startup Banner Animation
 * Dimensions recommendation: 40-70 columns wide, 3-7 lines tall.
 */
export const customBannerAnimation: FrameAnimation | null = null;

/**
 * Slot 2: [serverPulse] Live Health Monitor & Server Status Pulse
 * Dimensions recommendation: 1 line (e.g. 5-15 characters) or compact badge.
 */
export const customPulseAnimation: FrameAnimation | null = null;

/**
 * Slot 3: [connecting] When probing/testing an MCP server connection
 * Dimensions recommendation: 1-3 lines.
 */
export const customConnectingAnimation: FrameAnimation | null = null;

/**
 * Slot 4: [success] When a server is successfully added, synced, or fixed
 * Dimensions recommendation: 1-3 lines.
 */
export const customSuccessAnimation: FrameAnimation | null = null;

/**
 * Slot 5: [error] When a server encounters an error or fails diagnosis
 * Dimensions recommendation: 1-3 lines.
 */
export const customErrorAnimation: FrameAnimation | null = null;

/**
 * Slot 6: [spinner] Custom spinner frames for general waiting states
 * Dimensions recommendation: 1 character or compact 3-character glyph.
 */
export const customSpinnerAnimation: FrameAnimation | null = null;

/**
 * Slot 7: [scanner] Deep diagnostic scanner beam
 * Dimensions recommendation: 1-2 lines.
 */
export const customScannerAnimation: FrameAnimation | null = null;

/**
 * Map of user provided animations.
 * Any animation specified here automatically overrides the default animation for that slot!
 */
export const userProvidedAnimations: Partial<Record<StandardAnimationSlot, FrameAnimation>> = {
  bannerLogo: customBannerAnimation || undefined,
  serverPulse: customPulseAnimation || undefined,
  connecting: customConnectingAnimation || undefined,
  success: customSuccessAnimation || undefined,
  error: customErrorAnimation || undefined,
  spinner: customSpinnerAnimation || undefined,
  scanner: customScannerAnimation || undefined,
};
