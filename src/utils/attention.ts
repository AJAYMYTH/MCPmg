import pc from 'picocolors';
import readline from 'readline';
import { icons } from '../ui/icons.js';

export interface AttentionNoticeOptions {
  action: string;
  hostName: string;
  configPath: string;
  whatWillHappen: string[];
  backupPath?: string;
  isDestructive?: boolean;
}

/**
 * Formats and displays a high-visibility attention box before any mutating command
 */
export function displayAttentionNotice(options: AttentionNoticeOptions): void {
  const termWidth = process.stdout.columns || 80;
  const width = Math.min(Math.max(termWidth, 50), 95);
  const borderChar = '─';
  const headerText = options.isDestructive
    ? pc.red(pc.bold(`${icons.alert} ATTENTION: DESTRUCTIVE ACTION NOTICE`))
    : pc.yellow(pc.bold(`${icons.alert} ATTENTION: CONFIGURATION CHANGE NOTICE`));

  console.log();
  console.log(pc.dim('┌' + borderChar.repeat(width - 2) + '┐'));
  console.log(pc.dim('│ ') + headerText);
  console.log(pc.dim('├' + borderChar.repeat(width - 2) + '┤'));
  console.log(`${pc.dim('│')} ${pc.bold('Action:      ')} ${pc.cyan(options.action)}`);
  console.log(`${pc.dim('│')} ${pc.bold('Target Host: ')} ${pc.white(options.hostName)}`);
  console.log(`${pc.dim('│')} ${pc.bold('Config File: ')} ${pc.dim(options.configPath)}`);

  if (options.backupPath) {
    console.log(`${pc.dim('│')} ${pc.bold('Backup To:   ')} ${pc.dim(options.backupPath)}`);
  }

  console.log(pc.dim('│'));
  console.log(`${pc.dim('│')} ${pc.bold(pc.underline('WHAT WILL HAPPEN:'))}`);
  for (const item of options.whatWillHappen) {
    console.log(`${pc.dim('│')}  - ${pc.white(item)}`);
  }

  console.log(pc.dim('│'));
  console.log(`${pc.dim('│')} ${pc.green(`${icons.shield} Automatic Backup:`)} A snapshot is preserved before applying changes.`);
  console.log(pc.dim('└' + borderChar.repeat(width - 2) + '┘'));
  console.log();
}

/**
 * Prompts the user with a note and asks for explicit confirmation (y/N)
 * Default is strictly FALSE (No) to prevent accidental execution when pressing Enter
 */
export async function promptConfirmation(
  question: string = 'Do you want to proceed with this action?',
  defaultYes: boolean = false
): Promise<boolean> {
  const promptText = defaultYes ? `${question} [Y/n]: ` : `${question} [y/N]: `;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(pc.bold(pc.cyan('? ')) + pc.bold(promptText), (answer) => {
      rl.close();
      const cleaned = answer.trim().toLowerCase();
      if (cleaned === '') {
        resolve(defaultYes);
      } else if (cleaned === 'y' || cleaned === 'yes') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}
