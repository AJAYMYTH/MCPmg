import { FrameAnimation, AnimationSlot, AnimationSlotInfo, StandardAnimationSlot } from './types.js';
import { userProvidedAnimations } from './customAnimations.js';
import { icons } from '../icons.js';

/**
 * Built-in default animations (Monochrome & Terminal Glyphs)
 * Used as fallback until the user provides custom animations.
 */
const defaultBannerFrames = [
  // Frame 1: Initial outline
  [
    '  ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ ',
    '  ████╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ ',
    '  ██╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗',
    '  ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║',
    '  ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝',
    '  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ '
  ].join('\n'),
  // Frame 2: Shimmer 1
  [
    '  ░██╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ ',
    '  ░███╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ ',
    '  ░█╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗',
    '  ░█║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║',
    '  ░█║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝',
    '  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ '
  ].join('\n'),
  // Frame 3: Shimmer 2
  [
    '  ███╗   ███╗ ░█████╗██████╗ ███╗   ███╗ ██████╗ ',
    '  ████╗ ████║░█╔════╝██╔══██╗████╗ ████║██╔════╝ ',
    '  ██╔████╔██║░█║     ██████╔╝██╔████╔██║██║  ███╗',
    '  ██║╚██╔╝██║░█║     ██╔═══╝ ██║╚██╔╝██║██║   ██║',
    '  ██║ ╚═╝ ██║░██████╗██║     ██║ ╚═╝ ██║╚██████╔╝',
    '  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ '
  ].join('\n'),
  // Frame 4: Shimmer 3
  [
    '  ███╗   ███╗ ██████╗░█████╗ ███╗   ███╗ ██████╗ ',
    '  ████╗ ████║██╔════╝░█╔══██╗████╗ ████║██╔════╝ ',
    '  ██╔████╔██║██║     ░█████╔╝██╔████╔██║██║  ███╗',
    '  ██║╚██╔╝██║██║     ░█╔═══╝ ██║╚██╔╝██║██║   ██║',
    '  ██║ ╚═╝ ██║╚██████╗░█║     ██║ ╚═╝ ██║╚██████╔╝',
    '  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ '
  ].join('\n'),
  // Frame 5: Shimmer 4
  [
    '  ███╗   ███╗ ██████╗██████╗ ░██╗   ███╗ ██████╗ ',
    '  ████╗ ████║██╔════╝██╔══██╗░███╗ ████║██╔════╝ ',
    '  ██╔████╔██║██║     ██████╔╝░█╔████╔██║██║  ███╗',
    '  ██║╚██╔╝██║██║     ██╔═══╝ ░█║╚██╔╝██║██║   ██║',
    '  ██║ ╚═╝ ██║╚██████╗██║     ░█║ ╚═╝ ██║╚██████╔╝',
    '  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ '
  ].join('\n'),
  // Frame 6: Shimmer 5
  [
    '  ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ░█████╗ ',
    '  ████╗ ████║██╔════╝██╔══██╗████╗ ████║░█╔════╝ ',
    '  ██╔████╔██║██║     ██████╔╝██╔████╔██║░█║  ███╗',
    '  ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║░█║   ██║',
    '  ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║░█████╔╝',
    '  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ '
  ].join('\n'),
];

export const defaultAnimations: Record<StandardAnimationSlot, FrameAnimation> = {
  bannerLogo: {
    id: 'default-banner',
    name: 'Monochrome Shimmer Banner',
    description: 'Header logo with a subtle monochrome scanning wave',
    frames: defaultBannerFrames,
    intervalMs: 120,
    loop: true,
    pingPong: true,
  },
  serverPulse: {
    id: 'default-pulse',
    name: 'Heartbeat Pulse',
    description: 'Real-time server activity and health signal',
    frames: ['[·   ]', '[··  ]', '[··· ]', '[ ···]', '[  ··]', '[   ·]'],
    intervalMs: 100,
    loop: true,
    pingPong: true,
  },
  connecting: {
    id: 'default-connecting',
    name: 'Probe Beam',
    description: 'Shown while checking or pinging an MCP transport',
    frames: ['⟨○····⟩', '⟨·○···⟩', '⟨··○··⟩', '⟨···○·⟩', '⟨····○⟩'],
    intervalMs: 90,
    loop: true,
    pingPong: true,
  },
  success: {
    id: 'default-success',
    name: 'Success Glow',
    description: 'Triggered when a server is added, fixed, or synced',
    frames: ['[  ✓  ]', '[ ·✓· ]', '[··✓··]', '[ ·✓· ]', '[  ✓  ]'],
    intervalMs: 100,
    loop: false,
    iterations: 2,
  },
  error: {
    id: 'default-error',
    name: 'Alert Flash',
    description: 'Flashed when a server or diagnostic check fails',
    frames: ['[ ! ]', '[!!!]', '[ ! ]', '[   ]'],
    intervalMs: 120,
    loop: true,
  },
  spinner: {
    id: 'default-spinner',
    name: 'Clean Braille Spinner',
    description: 'Minimalist terminal spinner for waiting states',
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    intervalMs: 80,
    loop: true,
  },
  scanner: {
    id: 'default-scanner',
    name: 'Diagnostic Scan Beam',
    description: 'Sweeping scan bar for deep audit doctor command',
    frames: [
      '├─[░░░░░░░░]─┤',
      '├─[█░░░░░░░]─┤',
      '├─[██░░░░░░]─┤',
      '├─[░██░░░░░]─┤',
      '├─[░░██░░░░]─┤',
      '├─[░░░██░░░]─┤',
      '├─[░░░░██░░]─┤',
      '├─[░░░░░██░]─┤',
      '├─[░░░░░░██]─┤',
      '├─[░░░░░░░█]─┤',
    ],
    intervalMs: 70,
    loop: true,
    pingPong: true,
  },
};

class AnimationRegistry {
  private registry: Map<string, FrameAnimation> = new Map();

  constructor() {
    // 1. Load built-in defaults
    for (const [slot, anim] of Object.entries(defaultAnimations)) {
      this.registry.set(slot, anim);
    }

    // 2. Override with any user-provided animations from customAnimations.ts
    for (const [slot, anim] of Object.entries(userProvidedAnimations)) {
      if (anim) {
        this.registry.set(slot, anim);
      }
    }
  }

  public getAnimation(slot: AnimationSlot): FrameAnimation {
    const found = this.registry.get(slot);
    if (found) return found;

    // Fallback if custom slot not found
    return defaultAnimations.serverPulse;
  }

  public registerAnimation(slot: AnimationSlot, anim: FrameAnimation): void {
    this.registry.set(slot, anim);
  }

  public isUserProvided(slot: AnimationSlot): boolean {
    return Boolean(userProvidedAnimations[slot as StandardAnimationSlot]);
  }

  public listSlots(): AnimationSlotInfo[] {
    return [
      {
        slot: 'bannerLogo',
        title: 'Header & Banner Logo',
        description: 'Displayed at the top of the TUI and during CLI startup.',
        expectedDimensions: '50-75 columns, 4-7 lines',
        recommendedFps: '8-15 fps (60-120ms interval)',
      },
      {
        slot: 'serverPulse',
        title: 'Server Health Pulse',
        description: 'Inline activity signal in the live dashboard server table.',
        expectedDimensions: '5-12 chars wide, 1 line',
        recommendedFps: '10-20 fps (50-100ms interval)',
      },
      {
        slot: 'connecting',
        title: 'Connection / Probe Beam',
        description: 'Shown while probing transport endpoints or MCP tools.',
        expectedDimensions: '7-15 chars wide, 1 line',
        recommendedFps: '10-15 fps (70-100ms interval)',
      },
      {
        slot: 'scanner',
        title: 'Diagnostic Scanner',
        description: 'Displayed during deep doctor audits across hosts.',
        expectedDimensions: '14-30 chars wide, 1-2 lines',
        recommendedFps: '12-16 fps (60-80ms interval)',
      },
      {
        slot: 'success',
        title: 'Success / Celebration',
        description: 'Triggered upon successful addition, fix, or synchronization.',
        expectedDimensions: '7-20 chars wide, 1-3 lines',
        recommendedFps: '10 fps (100ms interval)',
      },
      {
        slot: 'error',
        title: 'Diagnostic Alert Flash',
        description: 'Shown when an error or auth issue is detected.',
        expectedDimensions: '5-15 chars wide, 1 line',
        recommendedFps: '8 fps (120ms interval)',
      },
      {
        slot: 'spinner',
        title: 'Custom Spinner',
        description: 'Single or multi-character spinner sequence.',
        expectedDimensions: '1-3 characters',
        recommendedFps: '12-15 fps (70-90ms interval)',
      },
    ];
  }

  public getAll(): Record<string, FrameAnimation> {
    const result: Record<string, FrameAnimation> = {};
    for (const [k, v] of this.registry.entries()) {
      result[k] = v;
    }
    return result;
  }
}

export const animationRegistry = new AnimationRegistry();
