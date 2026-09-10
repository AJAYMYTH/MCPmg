import pc from 'picocolors';

/**
 * Returns a styled Black & White ASCII art logo with responsive scaling based on terminal width
 */
export function getAsciiLogo(): string {
  const width = process.stdout.columns || 80;

  // For very narrow terminals (< 60 cols), render a clean compact text badge
  if (width < 60) {
    return [
      pc.bold(pc.white('[ MCPmg ]')),
      pc.dim('Model Context Protocol Multi-Host Manager & Monitor'),
      pc.dim('─'.repeat(Math.max(20, width - 2))),
    ].join('\n');
  }

  // Black & White high-resolution ASCII banner (pure white and bold, no colors)
  const logoLines = [
    pc.bold(pc.white('  ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ ')),
    pc.bold(pc.white('  ████╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ ')),
    pc.bold(pc.white('  ██╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗')),
    pc.bold(pc.white('  ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║')),
    pc.bold(pc.white('  ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝')),
    pc.bold(pc.white('  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ')),
  ];

  const subtitle = pc.dim('   Model Context Protocol Multi-Host Manager & Health Monitor');
  const divider = pc.dim('  ' + '─'.repeat(Math.min(width - 4, 60)));

  return '\n' + logoLines.join('\n') + '\n\n' + subtitle + '\n' + divider + '\n';
}

export function printLogo(): void {
  console.log(getAsciiLogo());
}
