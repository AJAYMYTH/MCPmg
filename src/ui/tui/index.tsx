import React from 'react';
import { render } from 'ink';
import { ThemeProvider } from 'termui';
import { TuiApp } from './App.js';

export async function startTui(): Promise<void> {
  // Enter terminal alternate screen buffer and hide cursor
  process.stdout.write('\x1b[?1049h\x1b[?25l');

  try {
    const app = render(
      <ThemeProvider>
        <TuiApp />
      </ThemeProvider>
    );

    await app.waitUntilExit();
  } finally {
    // Restore main screen buffer and show cursor
    process.stdout.write('\x1b[?1049l\x1b[?25h');
  }
}
