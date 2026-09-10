import pc from 'picocolors';
import Table from 'cli-table3';
import readline from 'readline';
import { hostManager } from '../hosts/hostManager.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { diagnosticEngine } from '../doctor/diagnostics.js';
import { HostId, MCPServerConfig, ServerHealthStatus, DiagnosticIssue } from '../types.js';
import { icons } from '../ui/icons.js';
import { fitCell } from '../utils/tableHelper.js';

export async function monitorCommand(options: { interval?: string; host?: string } = {}): Promise<void> {
  const pollIntervalSeconds = Math.max(2, parseInt(options.interval || '5', 10));
  const hostFilter = options.host as HostId | undefined;

  const servers = hostManager.getAllServers(hostFilter);
  if (servers.length === 0) {
    console.log(pc.yellow(`${icons.alert} No MCP servers found to monitor.`));
    return;
  }

  let selectedIndex = 0;
  let isRunning = true;
  let isProbingSelected = false;
  let selectedDiagnostics: DiagnosticIssue[] = [];
  const healthMap = new Map<string, ServerHealthStatus>();

  // Initialize status map
  for (const srv of servers) {
    const target = srv.url ? srv.url : `${srv.command} ${(srv.args || []).join(' ')}`;
    healthMap.set(`${srv.host}:${srv.name}`, {
      name: srv.name,
      host: srv.host,
      hostName: srv.hostName,
      transport: srv.transport,
      target,
      status: 'untested',
    });
  }

  // Use terminal alternate screen buffer to prevent scroll jitter
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?1049h\x1b[?25l');
  }

  function cleanupAndExit() {
    isRunning = false;
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch {}
    }
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?1049l\x1b[?25h');
    }
    console.log(pc.cyan(`${icons.check} Exited MCP Monitor.`));
    process.exit(0);
  }

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);

  // Probe single server
  async function probeServerByKey(srv: MCPServerConfig) {
    const key = `${srv.host}:${srv.name}`;
    const current = healthMap.get(key)!;

    if (srv.disabled) {
      current.status = 'warning';
      current.lastError = 'Disabled in config';
      return;
    }

    try {
      const res = await mcpRunner.probeServer(srv, 4000);
      current.lastChecked = new Date();
      current.latencyMs = res.latencyMs;

      if (res.success) {
        current.status = res.latencyMs > 2500 ? 'warning' : 'healthy';
        current.toolsCount = res.tools ? res.tools.length : res.toolsCount;
        current.lastError = res.latencyMs > 2500 ? 'High Latency' : undefined;
      } else {
        current.status = 'error';
        current.lastError = res.error ? res.error.slice(0, 50) : 'Failed to connect';
      }
    } catch (e: any) {
      current.status = 'error';
      current.lastError = e.message || 'Probe error';
    }
  }

  // Probe all servers in background
  async function probeAllServers() {
    await Promise.all(servers.map((srv) => probeServerByKey(srv)));
    if (isRunning) render();
  }

  // Keyboard navigation & controls
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on('keypress', async (str, key) => {
        if (!key) return;

        // Exit on Esc, q, or Ctrl+C
        if (
          key.name === 'escape' ||
          str === '\u001b' ||
          key.name === 'q' ||
          (key.ctrl && key.name === 'c')
        ) {
          cleanupAndExit();
          return;
        }

        // Arrow Up / k
        if (key.name === 'up' || str === 'k') {
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : servers.length - 1;
          selectedDiagnostics = [];
          render();
          return;
        }

        // Arrow Down / j
        if (key.name === 'down' || str === 'j') {
          selectedIndex = selectedIndex < servers.length - 1 ? selectedIndex + 1 : 0;
          selectedDiagnostics = [];
          render();
          return;
        }

        // Space or Enter: Probe selected server immediately
        if (key.name === 'return' || key.name === 'space' || str === ' ') {
          const selected = servers[selectedIndex];
          if (selected) {
            isProbingSelected = true;
            render();
            await probeServerByKey(selected);
            isProbingSelected = false;
            render();
          }
          return;
        }

        // 'd': Run doctor diagnostic on selected server
        if (str === 'd') {
          const selected = servers[selectedIndex];
          if (selected) {
            selectedDiagnostics = await diagnosticEngine.diagnose(selected);
            render();
          }
          return;
        }
      });
    } catch {}
  }

  function render(): void {
    if (!isRunning) return;

    const termWidth = process.stdout.columns || 80;
    const contentWidth = Math.max(38, termWidth - 2);
    const timestamp = new Date().toLocaleTimeString();

    // Clear screen buffer
    process.stdout.write('\x1b[2J\x1b[H');

    // Header
    console.log(pc.bold(pc.white(`${icons.pulse} MCP Live Status Monitor`)));
    console.log(
      pc.dim(
        `Time: ${timestamp} │ Poll: ${pollIntervalSeconds}s │ Servers: ${servers.length} │ Selected: #${selectedIndex + 1} ${servers[selectedIndex]?.name || ''}`
      )
    );
    console.log(pc.dim('─'.repeat(contentWidth)));

    // Responsive Table Layout Selection
    let table: Table.Table;
    const isWide = termWidth >= 105;
    const isMedium = termWidth >= 76;

    let serverColWidth = 20;
    let hostColWidth = 16;
    let detailsColWidth = 18;

    if (isWide) {
      // 7 Columns: Server, Host, Type, Health, Latency, Tools, Details
      const fixedCols = 22 + 18 + 8 + 11 + 9 + 8; // 76
      const borders = 8;
      detailsColWidth = Math.max(16, contentWidth - borders - fixedCols);
      serverColWidth = 22;
      hostColWidth = 18;

      table = new Table({
        head: [
          pc.cyan(pc.bold('Server')),
          pc.cyan(pc.bold('Host')),
          pc.cyan(pc.bold('Type')),
          pc.cyan(pc.bold('Health')),
          pc.cyan(pc.bold('Latency')),
          pc.cyan(pc.bold('Tools')),
          pc.cyan(pc.bold('Details / Message')),
        ],
        colWidths: [serverColWidth, hostColWidth, 8, 11, 9, 8, detailsColWidth],
        wordWrap: false,
        style: { head: [], border: ['dim'] },
      });
    } else if (isMedium) {
      // 6 Columns: Server, Host, Type, Health, Latency, Tools (Details in Inspector below)
      const fixedCols = 8 + 11 + 9 + 7; // 35
      const borders = 7;
      const avail = contentWidth - borders - fixedCols;
      serverColWidth = Math.max(14, Math.floor(avail * 0.55));
      hostColWidth = Math.max(12, avail - serverColWidth);

      table = new Table({
        head: [
          pc.cyan(pc.bold('Server')),
          pc.cyan(pc.bold('Host')),
          pc.cyan(pc.bold('Type')),
          pc.cyan(pc.bold('Health')),
          pc.cyan(pc.bold('Latency')),
          pc.cyan(pc.bold('Tools')),
        ],
        colWidths: [serverColWidth, hostColWidth, 8, 11, 9, 7],
        wordWrap: false,
        style: { head: [], border: ['dim'] },
      });
    } else {
      // 4 Columns: Server, Host, Health, Latency (Compact for narrow terminals)
      const fixedCols = 11 + 8; // 19
      const borders = 5;
      const avail = contentWidth - borders - fixedCols;
      serverColWidth = Math.max(12, Math.floor(avail * 0.55));
      hostColWidth = Math.max(10, avail - serverColWidth);

      table = new Table({
        head: [
          pc.cyan(pc.bold('Server')),
          pc.cyan(pc.bold('Host')),
          pc.cyan(pc.bold('Health')),
          pc.cyan(pc.bold('Latency')),
        ],
        colWidths: [serverColWidth, hostColWidth, 11, 8],
        wordWrap: false,
        style: { head: [], border: ['dim'] },
      });
    }

    servers.forEach((srv, idx) => {
      const key = `${srv.host}:${srv.name}`;
      const h = healthMap.get(key)!;
      const isSelected = idx === selectedIndex;

      const prefix = isSelected ? '▶ ' : '  ';
      const rawName = prefix + h.name;
      const serverCell = fitCell(
        isSelected ? pc.cyan(pc.bold(rawName)) : pc.white(rawName),
        serverColWidth
      );
      const hostCell = fitCell(
        isSelected ? pc.cyan(h.hostName) : pc.dim(h.hostName),
        hostColWidth
      );
      const typeBadge = h.transport === 'sse' ? pc.magenta('SSE') : pc.blue('STDIO');
      const healthBadge = getStatusBadge(h);
      const latencyBadge = getLatencyBadge(h);
      const toolsBadge = h.toolsCount !== undefined ? pc.white(h.toolsCount.toString()) : pc.dim('-');

      if (isWide) {
        const rawDetails = h.lastError ? h.lastError : 'Operating normally';
        const detailsCell = fitCell(
          h.lastError ? pc.red(rawDetails) : pc.dim(rawDetails),
          detailsColWidth
        );
        table.push([
          serverCell,
          hostCell,
          typeBadge,
          healthBadge,
          latencyBadge,
          toolsBadge,
          detailsCell,
        ]);
      } else if (isMedium) {
        table.push([
          serverCell,
          hostCell,
          typeBadge,
          healthBadge,
          latencyBadge,
          toolsBadge,
        ]);
      } else {
        table.push([
          serverCell,
          hostCell,
          healthBadge,
          latencyBadge,
        ]);
      }
    });

    console.log(table.toString());

    // Selected Server Inspection Card
    const selectedServer = servers[selectedIndex];
    if (selectedServer) {
      const key = `${selectedServer.host}:${selectedServer.name}`;
      const h = healthMap.get(key)!;

      console.log(pc.dim('─'.repeat(contentWidth)));
      const targetStr = selectedServer.url || `${selectedServer.command} ${(selectedServer.args || []).join(' ')}`;
      const maxInspectTarget = Math.max(20, contentWidth - 12);
      const truncatedTarget = targetStr.length > maxInspectTarget ? targetStr.slice(0, maxInspectTarget - 3) + '...' : targetStr;

      console.log(
        pc.bold(pc.white(`Inspector: `)) +
        pc.cyan(pc.bold(selectedServer.name)) +
        pc.dim(` (${selectedServer.hostName}) `) +
        (isProbingSelected ? pc.yellow('[Probing...]') : '')
      );
      console.log(pc.dim(`  Target: `) + pc.white(truncatedTarget));

      const configStr = selectedServer.configPath;
      const maxConfigLen = Math.max(15, contentWidth - 30);
      const truncatedConfig = configStr.length > maxConfigLen ? '...' + configStr.slice(-maxConfigLen) : configStr;
      console.log(
        pc.dim(`  Config: `) + pc.dim(truncatedConfig) +
        pc.dim(` │ Env: `) + pc.white(`${Object.keys(selectedServer.env || {}).length} keys`)
      );

      if (selectedDiagnostics.length > 0) {
        console.log(pc.yellow(`  Doctor Diagnosis (${selectedDiagnostics.length} issues):`));
        selectedDiagnostics.slice(0, 2).forEach((iss) => {
          const maxFixLen = Math.max(15, contentWidth - iss.title.length - 12);
          const truncatedFix = iss.suggestedFix.length > maxFixLen ? iss.suggestedFix.slice(0, maxFixLen - 3) + '...' : iss.suggestedFix;
          console.log(`    ${pc.red('✖')} ${pc.white(iss.title)}: ${pc.dim(truncatedFix)}`);
        });
      }
    }

    // Controls Bar
    console.log();
    if (termWidth >= 76) {
      console.log(
        pc.dim('Controls: ') +
        pc.bold(pc.white('[↑/↓]')) + pc.dim(' Navigate  ') +
        pc.bold(pc.white('[Space/Enter]')) + pc.dim(' Probe Now  ') +
        pc.bold(pc.white('[d]')) + pc.dim(' Diagnose  ') +
        pc.bold(pc.white('[Esc/q]')) + pc.dim(' Exit')
      );
    } else {
      console.log(
        pc.bold(pc.white('[↑/↓]')) + pc.dim(' Nav  ') +
        pc.bold(pc.white('[Enter]')) + pc.dim(' Probe  ') +
        pc.bold(pc.white('[d]')) + pc.dim(' Diag  ') +
        pc.bold(pc.white('[Esc]')) + pc.dim(' Exit')
      );
    }
  }

  // Initial render & initial probe
  render();
  await probeAllServers();

  // Background polling timer
  const intervalTimer = setInterval(async () => {
    if (!isRunning) return;
    await probeAllServers();
  }, pollIntervalSeconds * 1000);

  // Keep process alive while isRunning
  while (isRunning) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  clearInterval(intervalTimer);
}

function getStatusBadge(h: ServerHealthStatus): string {
  if (h.status === 'healthy') return pc.green('● ONLINE');
  if (h.status === 'warning') return pc.yellow('▲ WARN');
  if (h.status === 'error') return pc.red('✖ ERROR');
  return pc.dim('○ PEND');
}

function getLatencyBadge(h: ServerHealthStatus): string {
  if (h.latencyMs === undefined) return pc.dim('-');
  if (h.latencyMs < 500) return pc.green(`${h.latencyMs}ms`);
  if (h.latencyMs < 2000) return pc.yellow(`${h.latencyMs}ms`);
  return pc.red(`${h.latencyMs}ms`);
}
