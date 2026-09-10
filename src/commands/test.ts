import pc from 'picocolors';
import ora from 'ora';
import { hostManager } from '../hosts/hostManager.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { HostId, MCPServerConfig } from '../types.js';
import { icons } from '../ui/icons.js';

export async function testCommand(serverName?: string, options: { host?: string } = {}): Promise<void> {
  const hostFilter = options.host as HostId | undefined;

  let serversToTest: MCPServerConfig[] = [];
  if (serverName) {
    const srv = hostManager.findServer(serverName, hostFilter);
    if (!srv) {
      console.log(pc.red(`${icons.cross} Error: Server "${serverName}" not found.`));
      return;
    }
    serversToTest = [srv];
  } else {
    serversToTest = hostManager.getAllServers(hostFilter);
    if (serversToTest.length === 0) {
      console.log(pc.yellow(`${icons.alert} No MCP servers found to test.`));
      return;
    }
  }

  console.log();
  console.log(pc.bold(pc.white(`${icons.tools} Testing MCP Server Connections (${serversToTest.length} server${serversToTest.length > 1 ? 's' : ''})`)));
  console.log(pc.dim('───────────────────────────────────────────────────'));

  for (const srv of serversToTest) {
    const spinner = ora(pc.cyan(`Connecting to "${srv.name}" (${srv.hostName})...`)).start();
    const result = await mcpRunner.probeServer(srv, 10000);

    if (result.success) {
      spinner.succeed(
        pc.green(
          `${icons.check} ${pc.bold(srv.name)} (${srv.hostName}) - Healthy | Latency: ${result.latencyMs}ms | Tools: ${result.toolsCount} | Resources: ${result.resourcesCount}`
        )
      );

      if (result.tools && result.tools.length > 0) {
        console.log(pc.dim(`  Available Tools:`));
        const maxToolsToShow = 10;
        result.tools.slice(0, maxToolsToShow).forEach((t) => {
          const desc = t.description ? pc.dim(`- ${t.description.slice(0, 60)}${t.description.length > 60 ? '...' : ''}`) : '';
          console.log(`    ${icons.gear} ${pc.cyan(t.name)} ${desc}`);
        });
        if (result.tools.length > maxToolsToShow) {
          console.log(pc.dim(`    ... and ${result.tools.length - maxToolsToShow} more tools.`));
        }
      }
    } else {
      spinner.fail(pc.red(`${icons.cross} ${pc.bold(srv.name)} (${srv.hostName}) - Connection Failed (${result.latencyMs}ms)`));
      console.log(pc.red(`  Error: ${result.error}`));
      if (result.stderr) {
        console.log(pc.dim(`  Stderr: ${result.stderr.split('\n')[0]}`));
      }
      console.log(pc.yellow(`  -> Run "mcpmg doctor ${srv.name}" or "mcpmg fix ${srv.name}" to diagnose and repair.`));
    }
    console.log();
  }
}
