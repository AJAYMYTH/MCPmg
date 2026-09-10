import pc from 'picocolors';
import Table from 'cli-table3';
import { hostManager } from '../hosts/hostManager.js';
import { HostId, MCPServerConfig } from '../types.js';
import { printLogo } from '../ui/banner.js';
import { icons } from '../ui/icons.js';
import { fitCell } from '../utils/tableHelper.js';

export async function listCommand(options: { host?: string }): Promise<void> {
  const hostFilter = options.host as HostId | undefined;
  const hosts = hostManager.getAllHosts().filter((h) => !hostFilter || h.id === hostFilter);
  const termWidth = process.stdout.columns || 80;

  // 1. Print Styled Black & White ASCII Logo Banner
  printLogo();

  // 2. Detected Hosts Summary (Responsive)
  console.log(pc.bold(pc.white(`${icons.server} Detected AI Hosts:`)));
  for (const h of hosts) {
    const statusIcon = h.exists ? pc.green(`${icons.check} Found`) : pc.dim(`${icons.cross} Not Detected`);
    if (termWidth >= 85) {
      console.log(`  ${pc.bold(h.name.padEnd(24))} ${statusIcon}  ${pc.dim(h.configPath)}`);
    } else {
      console.log(`  ${statusIcon} ${pc.bold(h.name)}`);
    }
  }
  console.log();

  // 3. Configured Servers
  const allServers = hostManager.getAllServers(hostFilter);

  if (allServers.length === 0) {
    console.log(pc.yellow('No MCP servers currently configured.'));
    console.log(pc.dim('Use "mcpmg add" to configure a new server.'));
    console.log();
    return;
  }

  // Choose display mode based on terminal width
  if (termWidth >= 105) {
    renderWideTable(allServers, termWidth);
  } else if (termWidth >= 76) {
    renderMediumTable(allServers, termWidth);
  } else if (termWidth >= 55) {
    renderCompactTable(allServers, termWidth);
  } else {
    renderCompactCards(allServers, termWidth);
  }

  console.log();
  console.log(
    pc.dim(`Total servers: ${allServers.length} │ Test: "mcpmg test <name>" │ Diagnose: "mcpmg doctor <name>"`)
  );
  console.log();
}

/**
 * Wide Screen Layout (width >= 105 cols)
 */
function renderWideTable(servers: MCPServerConfig[], termWidth: number): void {
  const contentWidth = Math.max(40, termWidth - 2);
  const borders = 7;
  // Fixed cols: Server (22), Host (18), Transport (9), Env (8), Status (8) = 65
  const fixed = 22 + 18 + 9 + 8 + 8;
  const targetColWidth = Math.max(20, contentWidth - borders - fixed);

  const table = new Table({
    head: [
      pc.cyan(pc.bold('Server Name')),
      pc.cyan(pc.bold('Host')),
      pc.cyan(pc.bold('Transport')),
      pc.cyan(pc.bold('Target / Command')),
      pc.cyan(pc.bold('Env')),
      pc.cyan(pc.bold('Status')),
    ],
    colWidths: [22, 18, 9, targetColWidth, 8, 8],
    wordWrap: false,
    style: { head: [], border: ['dim'] },
  });

  for (const srv of servers) {
    const transportBadge = srv.transport === 'sse' ? pc.magenta('SSE') : pc.blue('STDIO');
    const rawTarget = srv.url ? srv.url : `${srv.command} ${(srv.args || []).join(' ')}`;
    const envCount = srv.env ? Object.keys(srv.env).length : 0;
    const envDisplay = envCount > 0 ? pc.yellow(`${envCount} keys`) : pc.dim('none');
    const status = srv.disabled ? pc.red('✖ Off') : pc.green('● On');

    table.push([
      fitCell(pc.bold(srv.name), 22),
      fitCell(pc.white(srv.hostName), 18),
      transportBadge,
      fitCell(pc.dim(rawTarget), targetColWidth),
      fitCell(envDisplay, 8),
      status,
    ]);
  }

  console.log(table.toString());
}

/**
 * Medium Screen Layout (76 <= width < 105 cols, optimized for 80-col terminals)
 */
function renderMediumTable(servers: MCPServerConfig[], termWidth: number): void {
  const contentWidth = Math.max(38, termWidth - 2);
  const borders = 6;
  // Fixed cols: Server (20), Host (16), Type (8), Status (8) = 52
  const fixed = 20 + 16 + 8 + 8;
  const targetColWidth = Math.max(16, contentWidth - borders - fixed);

  const table = new Table({
    head: [
      pc.cyan(pc.bold('Server')),
      pc.cyan(pc.bold('Host')),
      pc.cyan(pc.bold('Type')),
      pc.cyan(pc.bold('Target')),
      pc.cyan(pc.bold('Status')),
    ],
    colWidths: [20, 16, 8, targetColWidth, 8],
    wordWrap: false,
    style: { head: [], border: ['dim'] },
  });

  for (const srv of servers) {
    const transportBadge = srv.transport === 'sse' ? pc.magenta('SSE') : pc.blue('STDIO');
    const rawTarget = srv.url ? srv.url : `${srv.command} ${(srv.args || []).join(' ')}`;
    const status = srv.disabled ? pc.red('✖ Off') : pc.green('● On');

    table.push([
      fitCell(pc.bold(srv.name), 20),
      fitCell(pc.white(srv.hostName), 16),
      transportBadge,
      fitCell(pc.dim(rawTarget), targetColWidth),
      status,
    ]);
  }

  console.log(table.toString());
}

/**
 * Compact Screen Table Layout (55 <= width < 76 cols)
 */
function renderCompactTable(servers: MCPServerConfig[], termWidth: number): void {
  const contentWidth = Math.max(38, termWidth - 2);
  const borders = 5;
  const fixed = 8 + 8; // Type (8), Status (8)
  const avail = contentWidth - borders - fixed;
  const serverColWidth = Math.max(12, Math.floor(avail * 0.55));
  const hostColWidth = Math.max(10, avail - serverColWidth);

  const table = new Table({
    head: [
      pc.cyan(pc.bold('Server')),
      pc.cyan(pc.bold('Host')),
      pc.cyan(pc.bold('Type')),
      pc.cyan(pc.bold('Status')),
    ],
    colWidths: [serverColWidth, hostColWidth, 8, 8],
    wordWrap: false,
    style: { head: [], border: ['dim'] },
  });

  for (const srv of servers) {
    const transportBadge = srv.transport === 'sse' ? pc.magenta('SSE') : pc.blue('STDIO');
    const status = srv.disabled ? pc.red('✖ Off') : pc.green('● On');

    table.push([
      fitCell(pc.bold(srv.name), serverColWidth),
      fitCell(pc.white(srv.hostName), hostColWidth),
      transportBadge,
      status,
    ]);
  }

  console.log(table.toString());
}

/**
 * Narrow Card Layout (width < 55 cols)
 */
function renderCompactCards(servers: MCPServerConfig[], termWidth: number): void {
  const boxWidth = Math.max(28, Math.min(termWidth - 2, 50));

  for (const srv of servers) {
    const status = srv.disabled ? pc.red('✖ Off') : pc.green('● On');
    const transport = srv.transport === 'sse' ? pc.magenta('SSE') : pc.blue('STDIO');
    const rawTarget = srv.url ? srv.url : `${srv.command} ${(srv.args || []).join(' ')}`;
    const maxTargetLen = Math.max(10, boxWidth - 10);
    const target = fitCell(rawTarget, maxTargetLen);

    console.log(pc.cyan(`┌─ `) + pc.bold(pc.white(fitCell(srv.name, boxWidth - 6))) + pc.cyan(` ┐`));
    console.log(pc.dim('│ ') + `${pc.bold('Host:   ')} ${fitCell(srv.hostName, boxWidth - 10)}`);
    console.log(pc.dim('│ ') + `${pc.bold('Type:   ')} ${transport} │ ${status}`);
    console.log(pc.dim('│ ') + `${pc.bold('Target: ')} ${pc.dim(target)}`);
    console.log(pc.cyan('└' + '─'.repeat(Math.max(2, boxWidth - 2)) + '┘'));
  }
}
