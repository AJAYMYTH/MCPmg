import pc from 'picocolors';
import readline from 'readline';
import Table from 'cli-table3';
import { backupManager } from '../hosts/backup.js';
import { hostManager } from '../hosts/hostManager.js';
import { displayAttentionNotice, promptConfirmation } from '../utils/attention.js';
import { icons } from '../ui/icons.js';
import { fitCell } from '../utils/tableHelper.js';

export async function backupCommand(action: string = 'list', backupFile?: string): Promise<void> {
  const backups = backupManager.listBackups();

  if (action === 'list' || !action) {
    console.log();
    console.log(pc.bold(pc.white(`${icons.shield} MCPmg Configuration Snapshots & Backups`)));
    console.log(pc.dim('───────────────────────────────────────────────'));

    if (backups.length === 0) {
      console.log(pc.yellow('No backups found. Backups are created automatically before any configuration edit.'));
      console.log();
      return;
    }

    const termWidth = process.stdout.columns || 80;
    const contentWidth = Math.max(38, termWidth - 2);
    const borders = 5;
    const fixedCols = 5 + 24 + 14; // 43
    const fileColWidth = Math.max(16, contentWidth - borders - fixedCols);

    const table = new Table({
      head: [
        pc.cyan(pc.bold('#')),
        pc.cyan(pc.bold('Backup File')),
        pc.cyan(pc.bold('Created Date')),
        pc.cyan(pc.bold('Size (Bytes)')),
      ],
      colWidths: [5, fileColWidth, 24, 14],
      wordWrap: false,
      style: { head: [], border: ['dim'] },
    });

    backups.forEach((b, idx) => {
      table.push([
        (idx + 1).toString(),
        fitCell(pc.white(b.name), fileColWidth),
        fitCell(pc.dim(b.date.toLocaleString()), 24),
        b.size.toString(),
      ]);
    });

    console.log(table.toString());
    console.log();
    console.log(pc.dim('To restore a snapshot: "mcpmg backup restore"'));
    console.log();
    return;
  }

  if (action === 'restore') {
    if (backups.length === 0) {
      console.log(pc.yellow('No backups available to restore.'));
      return;
    }

    let selectedBackup = backups[0];
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (!backupFile) {
      console.log();
      console.log(pc.bold('Select Backup Snapshot to Restore:'));
      backups.slice(0, 10).forEach((b, idx) => {
        console.log(`  ${pc.yellow((idx + 1).toString())}. ${b.name} ${pc.dim(`(${b.date.toLocaleString()})`)}`);
      });

      const choice = await new Promise<string>((res) => rl.question(pc.cyan('Enter number [1]: '), (ans) => res(ans.trim())));
      const num = parseInt(choice || '1', 10);
      if (num >= 1 && num <= backups.length) {
        selectedBackup = backups[num - 1];
      }
    } else {
      const match = backups.find((b) => b.name === backupFile || b.path.endsWith(backupFile));
      if (match) {
        selectedBackup = match;
      }
    }

    // Determine target host from backup filename
    const parts = selectedBackup.name.split('_');
    const hostHint = parts.length >= 2 ? parts[1] : '';
    const targetHost = hostManager.getAllHosts().find((h) => h.id === hostHint) || hostManager.getAllHosts()[0];

    rl.close();

    displayAttentionNotice({
      action: `Restore Configuration from Snapshot "${selectedBackup.name}"`,
      hostName: targetHost.name,
      configPath: targetHost.configPath,
      isDestructive: true,
      whatWillHappen: [
        `The current configuration file at "${targetHost.configPath}" will be overwritten.`,
        `Configuration will revert to the state captured on ${selectedBackup.date.toLocaleString()}.`,
        `A safety pre-restore backup of the current file will be generated automatically.`,
      ],
    });

    const proceed = await promptConfirmation('Do you want to proceed with restoring this snapshot?', false);
    if (!proceed) {
      console.log(pc.dim('Restore cancelled.'));
      return;
    }

    try {
      backupManager.restoreBackup(selectedBackup.path, targetHost.configPath);
      console.log();
      console.log(pc.green(`${icons.check} Configuration successfully restored from ${selectedBackup.name}!`));
    } catch (err: any) {
      console.log(pc.red(`Failed to restore backup: ${err.message}`));
    }
  }
}
