/**
 * Terminal table calculation and ANSI text truncation helpers.
 * Ensures strict column boundary fitting and prevents cli-table3 border wrapping.
 */

// Regular expression matching ANSI escape sequences
export const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Strips all ANSI escape sequences from a string to measure visible length.
 */
export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Computes visible character width in terminal cells.
 */
export function visibleWidth(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Safely truncates a plain or ANSI-colored string so its visible length
 * does not exceed maxWidth.
 */
export function truncateToWidth(str: string, maxWidth: number, ellipsis = '…'): string {
  if (maxWidth <= 0) return '';
  const plain = stripAnsi(str);
  if (plain.length <= maxWidth) return str;
  if (maxWidth <= ellipsis.length) return ellipsis.slice(0, maxWidth);

  // If unstyled plain text
  if (str === plain) {
    return str.slice(0, maxWidth - ellipsis.length) + ellipsis;
  }

  // If ANSI styled: preserve styling while cutting off visible text at maxWidth - ellipsis
  const visibleCutoff = maxWidth - ellipsis.length;
  let currentVisible = 0;
  let result = '';
  let inEscape = false;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\x1b' && str[i + 1] === '[') {
      inEscape = true;
    }

    result += str[i];

    if (inEscape) {
      if (/[a-zA-Z]/.test(str[i])) {
        inEscape = false;
      }
      continue;
    }

    currentVisible++;
    if (currentVisible >= visibleCutoff) {
      result += ellipsis;
      result += '\x1b[0m'; // Ensure reset
      break;
    }
  }

  return result;
}

/**
 * Pre-formats and truncates cell content to fit within a cli-table3 column.
 * Since cli-table3 allocates 1 space left and 1 space right, maximum visible
 * content width is colWidth - 2.
 */
export function fitCell(str: string, colWidth: number, ellipsis = '…'): string {
  const maxContentWidth = Math.max(1, colWidth - 2);
  return truncateToWidth(str, maxContentWidth, ellipsis);
}
