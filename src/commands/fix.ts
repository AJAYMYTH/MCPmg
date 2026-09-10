import pc from 'picocolors';
import { hostManager } from '../hosts/hostManager.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { diagnosticEngine } from '../doctor/diagnostics.js';
import { fixerRegistry } from '../fixers/fixerRegistry.js';
import { HostId, MCPServerConfig } from '../types.js';
import { icons } from '../ui/icons.js';

export async function fixCommand(serverName?: string, options: { host?: string } = {}): Promise<void> {
  const hostFilter = options.host as HostId | undefined;

  let servers: MCPServerConfig[] = [];
  if (serverName) {
    const srv = hostManager.findServer(serverName, hostFilter);
    if (!srv) {
      console.log(pc.red(`${icons.cross} Error: Server "${serverName}" not found.`));
      return;
    }
    servers = [srv];
  } else {
    servers = hostManager.getAllServers(hostFilter);
  }

  console.log();
  console.log(pc.bold(pc.white(`${icons.wrench} MCP Auto-Repair & Diagnostic Fixer`)));
  console.log(pc.dim('─────────────────────────────────────────'));

  let fixedCount = 0;
  let totalFixable = 0;

  for (const srv of servers) {
    console.log(pc.bold(`${icons.pulse} Analyzing "${srv.name}" (${srv.hostName})...`));
    const testResult = await mcpRunner.probeServer(srv, 8000);
    const issues = await diagnosticEngine.diagnose(srv, testResult);

    const fixableIssues = issues.filter((i) => i.canAutoFix);

    if (fixableIssues.length === 0) {
      if (issues.length === 0) {
        console.log(pc.green(`  ${icons.check} No issues found on "${srv.name}". Everything is healthy.`));
      } else {
        console.log(pc.yellow(`  ${icons.alert} Issues found on "${srv.name}", but none can be auto-repaired.`));
        issues.forEach((i) => console.log(pc.dim(`    - ${i.title}: ${i.suggestedFix}`)));
      }
      console.log();
      continue;
    }

    console.log(pc.yellow(`  Found ${fixableIssues.length} repairable issue${fixableIssues.length > 1 ? 's' : ''}:`));
    for (const issue of fixableIssues) {
      totalFixable++;
      console.log(`  - ${pc.bold(issue.title)} (${issue.suggestedFix})`);

      // Apply fix through registry (renders attention notice and asks confirmation)
      const success = await fixerRegistry.applyFix(issue, srv);
      if (success) {
        fixedCount++;
      }
    }
    console.log();
  }

  console.log(pc.dim('─────────────────────────────────────────'));
  if (totalFixable === 0) {
    console.log(pc.green(`${icons.check} No auto-fixable issues detected.`));
  } else {
    console.log(
      pc.bold(
        `Repair completed: ${pc.green(fixedCount.toString())} of ${pc.yellow(totalFixable.toString())} issue(s) resolved.`
      )
    );
  }
  console.log();
}
