/**
 * Animation types and slot definitions for MCPmg TUI
 */

export interface FrameAnimation {
  /** Unique identifier for the animation */
  id: string;
  /** Human readable name */
  name: string;
  /** Description or purpose */
  description?: string;
  /** Array of frames (each frame can be a single line or multi-line ASCII art string) */
  frames: string[];
  /** Duration each frame stays on screen in milliseconds (default: 100ms) */
  intervalMs?: number;
  /** Whether the animation repeats infinitely (default: true) */
  loop?: boolean;
  /** Number of loop iterations if loop is false (default: 1) */
  iterations?: number;
  /** If true, oscillates forward and backward (e.g. 0 -> 1 -> 2 -> 1 -> 0) */
  pingPong?: boolean;
  /** Optional text styling */
  style?: {
    bold?: boolean;
    dim?: boolean;
    color?: string;
  };
}

export type StandardAnimationSlot =
  | 'bannerLogo'     // Header / Startup banner animation
  | 'serverPulse'    // Health monitor pulse / ping animation
  | 'connecting'     // Active connection / probing animation
  | 'success'        // Successful action (add, fix, sync)
  | 'error'          // Diagnostic error / alert animation
  | 'spinner'        // Custom spinner frames
  | 'scanner';       // Diagnostic scanning beam

export type AnimationSlot = StandardAnimationSlot | (string & {});

export interface AnimationSlotInfo {
  slot: AnimationSlot;
  title: string;
  description: string;
  expectedDimensions?: string;
  recommendedFps?: string;
}
