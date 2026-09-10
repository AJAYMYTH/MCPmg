#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';
import { editCommand } from './commands/edit.js';
import { testCommand } from './commands/test.js';
import { doctorCommand } from './commands/doctor.js';
import { fixCommand } from './commands/fix.js';
import { monitorCommand } from './commands/monitor.js';
import { syncCommand } from './commands/sync.js';
import { backupCommand } from './commands/backup.js';
import { startTui } from './ui/tui/index.js';

declare const __VERSION__: string | undefined;
const CLI_VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.1';

const program = new Command();

program
  .name('mcpmg')
  .description('Global CLI tool for monitoring, managing, diagnosing, and auto-repairing MCP servers across all AI hosts')
  .version(CLI_VERSION);

// 0. TUI Interactive Mode (TermUI + Ink)
program
  .command('tui')
  .alias('ui')
  .alias('dashboard')
  .description('Launch interactive full-screen TermUI dashboard with animations')
  .action(async () => {
    await startTui();
  });

// 1. List
program
  .command('list')
  .alias('ls')
  .description('List all configured MCP servers across all detected AI hosts')
  .option('-H, --host <host>', 'Filter by host (claude, antigravity, cursor, cline, claudecode, custom)')
  .action(async (options) => {
    await listCommand(options);
  });

// 2. Add
program
  .command('add [name]')
  .description('Add a new MCP server (interactive wizard or flag-driven)')
  .option('-H, --host <host>', 'Target AI host (claude, antigravity, cursor, cline, claudecode, custom)')
  .option('-p, --preset <preset>', 'Use a preset template (memory, filesystem, github, supabase, postgres, etc.)')
  .option('-c, --command <cmd>', 'Executable command (for stdio servers)')
  .option('-a, --args <args...>', 'Command arguments')
  .option('-u, --url <url>', 'Remote server endpoint URL (for SSE/HTTP servers)')
  .option('-e, --env <env...>', 'Environment variables in KEY=VALUE format')
  .action(async (name, options) => {
    await addCommand(name, options);
  });

// 3. Remove
program
  .command('remove [name]')
  .alias('rm')
  .alias('delete')
  .description('Safely remove an MCP server from configuration with automatic backup')
  .option('-H, --host <host>', 'Target AI host')
  .action(async (name, options) => {
    await removeCommand(name, options);
  });

// 4. Edit
program
  .command('edit [name]')
  .description('Interactively update server settings, environment variables, or toggle enabled/disabled state')
  .option('-H, --host <host>', 'Target AI host')
  .action(async (name, options) => {
    await editCommand(name, options);
  });

// 5. Test
program
  .command('test [name]')
  .alias('ping')
  .description('Probe MCP server connection, measure latency, and list exposed tools & capabilities')
  .option('-H, --host <host>', 'Target AI host')
  .action(async (name, options) => {
    await testCommand(name, options);
  });

// 6. Doctor
program
  .command('doctor [name]')
  .description('Run a deep diagnostic audit to detect auth, path, schema, network, and runtime issues')
  .option('-H, --host <host>', 'Target AI host')
  .action(async (name, options) => {
    await doctorCommand(name, options);
  });

// 7. Fix
program
  .command('fix [name]')
  .description('Interactively repair diagnosed errors (auth tokens, Windows paths, syntax, missing packages)')
  .option('-H, --host <host>', 'Target AI host')
  .action(async (name, options) => {
    await fixCommand(name, options);
  });

// 8. Monitor
program
  .command('monitor')
  .alias('watch')
  .description('Launch real-time live monitoring dashboard with auto-polling')
  .option('-i, --interval <seconds>', 'Polling interval in seconds', '5')
  .option('-H, --host <host>', 'Filter by host')
  .action(async (options) => {
    await monitorCommand(options);
  });

// 9. Sync
program
  .command('sync [name]')
  .description('Sync or clone an MCP server configuration between AI hosts')
  .option('--from <host>', 'Source AI host')
  .option('--to <host>', 'Destination AI host')
  .action(async (name, options) => {
    await syncCommand(name, options);
  });

// 10. Backup
program
  .command('backup [action] [file]')
  .description('Manage configuration snapshots (actions: list, restore)')
  .action(async (action, file) => {
    await backupCommand(action, file);
  });

// Default to list if no command passed
if (process.argv.length <= 2) {
  process.argv.push('list');
}

program.parseAsync(process.argv).catch((err) => {
  console.error('Error executing command:', err);
  process.exit(1);
});
