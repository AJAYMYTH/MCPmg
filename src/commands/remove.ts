import pc from 'picocolors';
import readline from 'readline';
import { hostManager } from '../hosts/hostManager.js';
import { HostId } from '../types.js';
import { displayAttentionNotice, promptConfirmation } from '../utils/attention.js';
import { icons } from '../ui/icons.js';

export async function removeCommand(serverName?: string, options: { host?: string } = {}): Promise<void> {
  const hostFilter = options.host as HostId | undefined;

  let targetName = serverName?.trim();
  if (!targetName) {
    const allServers = hostManager.getAllServers(hostFilter);
    if (allServers.length === 0) {
      console.log(pc.yellow('No MCP servers found to remove.'));
      return;
    }

    console.log();
    console.log(pc.bold(`${icons.trash} Select Server to Remove:`));
    allServers.forEach((s, idx) => {
      console.log(`  ${pc.yellow((idx + 1).toString())}. ${pc.bold(s.name)} ${pc.dim(`(${s.hostName})`)}`);
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const choice = await new Promise<string>((resolve) => {
      rl.question(pc.cyan('Enter number: '), (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    const num = parseInt(choice, 10);
    if (num >= 1 && num <= allServers.length) {
      const selected = allServers[num - 1];
      targetName = selected.name;
      options.host = selected.host;
    } else {
      console.log(pc.red('Invalid selection.'));
      return;
    }
  }

  // Find server across hosts
  const matchingServers = hostManager.getAllServers(options.host as HostId).filter(
    (s) => s.name.toLowerCase() === targetName!.toLowerCase()
  );

  if (matchingServers.length === 0) {
    console.log(pc.red(`Error: Server "${targetName}" not found.`));
    return;
  }

  for (const srv of matchingServers) {
    const hostInfo = hostManager.getHost(srv.host);
    if (!hostInfo) continue;

    displayAttentionNotice({
      action: `Delete MCP Server "${srv.name}"`,
      hostName: hostInfo.name,
      configPath: hostInfo.configPath,
      isDestructive: true,
      whatWillHappen: [
        `Server "${srv.name}" will be completely removed from ${hostInfo.name}.`,
        `AI agents in ${hostInfo.name} will immediately lose access to tools from this server.`,
        `A full backup of the configuration will be saved before removal so you can restore if needed.`,
      ],
    });

    const proceed = await promptConfirmation(`Are you sure you want to remove "${srv.name}" from ${hostInfo.name}?`, false);
    if (!proceed) {
      console.log(pc.dim(`Removal of "${srv.name}" cancelled.`));
      continue;
    }

    const { backupPath, removed } = hostManager.removeServer(srv.host, srv.name);

    if (removed) {
      console.log();
      console.log(pc.green(`${icons.check} Server "${srv.name}" successfully removed from ${hostInfo.name}.`));
      if (backupPath) {
        console.log(pc.dim(`  Configuration backup created at: ${backupPath}`));
      }
    } else {
      console.log(pc.yellow(`Warning: Could not remove "${srv.name}" from ${hostInfo.name}.`));
    }
  }
}
