import pc from 'picocolors';
import ora from 'ora';
import { hostManager } from '../hosts/hostManager.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { diagnosticEngine } from '../doctor/diagnostics.js';
import { HostId, MCPServerConfig, DiagnosticIssue } from '../types.js';
import { icons } from '../ui/icons.js';

export async function doctorCommand(serverName?: string, options: { host?: string } = {}): Promise<void> {
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
    if (servers.length === 0) {
      console.log(pc.yellow(`${icons.alert} No MCP servers found to diagnose.`));
      return;
    }
  }

  console.log();
  console.log(pc.bold(pc.white(`${icons.wrench} MCP Diagnostic Doctor & Health Audit`)));
  console.log(pc.dim('─────────────────────────────────────────'));

  let totalIssues = 0;
  let autoFixableCount = 0;

  for (const srv of servers) {
    const spinner = ora(pc.cyan(`Auditing server "${srv.name}" (${srv.hostName})...`)).start();

    // Probe server
    const testResult = await mcpRunner.probeServer(srv, 8000);
    // Run diagnostics
    const issues = await diagnosticEngine.diagnose(srv, testResult);

    if (issues.length === 0) {
      spinner.succeed(pc.green(`${icons.check} ${pc.bold(srv.name)} (${srv.hostName}) - All checks passed! No issues detected.`));
    } else {
      const hasError = issues.some((i) => i.severity === 'error');
      if (hasError) {
        spinner.fail(pc.red(`${icons.cross} ${pc.bold(srv.name)} (${srv.hostName}) - Issues detected:`));
      } else {
        spinner.warn(pc.yellow(`${icons.alert} ${pc.bold(srv.name)} (${srv.hostName}) - Warnings detected:`));
      }

      for (const issue of issues) {
        totalIssues++;
        if (issue.canAutoFix) autoFixableCount++;

        const badge =
          issue.severity === 'error'
            ? pc.bgRed(pc.white(` ${icons.cross} ERROR `))
            : issue.severity === 'warning'
            ? pc.bgYellow(pc.black(` ${icons.alert} WARN  `))
            : pc.bgBlue(pc.white(` ${icons.info} INFO  `));

        const fixBadge = issue.canAutoFix
          ? pc.green(pc.bold(` [${icons.wrench} Auto-fixable]`))
          : pc.dim(' [Manual fix]');

        console.log(`\n  ${badge} ${pc.bold(issue.title)}${fixBadge}`);
        console.log(`    ${pc.white(issue.description)}`);
        console.log(`    ${pc.dim('Suggested solution:')} ${pc.cyan(issue.suggestedFix)}`);
      }
    }
    console.log();
  }

  console.log(pc.dim('─────────────────────────────────────────'));
  if (totalIssues === 0) {
    console.log(pc.green(pc.bold(`${icons.check} All inspected MCP servers are healthy and configured properly!`)));
  } else {
    console.log(
      pc.bold(
        `Doctor found ${pc.red(totalIssues.toString())} issue${totalIssues > 1 ? 's' : ''}. ` +
          (autoFixableCount > 0
            ? pc.green(`${autoFixableCount} can be automatically repaired using "${pc.bold('mcpmg fix')}".`)
            : '')
      )
    );
  }
  console.log();
}
