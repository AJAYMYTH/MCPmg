import pc from 'picocolors';
import readline from 'readline';
import { hostManager } from '../hosts/hostManager.js';
import { HostId } from '../types.js';
import { displayAttentionNotice, promptConfirmation } from '../utils/attention.js';
import { icons } from '../ui/icons.js';

export async function syncCommand(
  serverName?: string,
  options: { from?: string; to?: string } = {}
): Promise<void> {
  console.log();
  console.log(pc.bold(pc.white(`${icons.sync} Sync / Clone MCP Server Between AI Hosts`)));
  console.log(pc.dim('─────────────────────────────────────────────'));

  const allServers = hostManager.getAllServers();
  if (allServers.length === 0) {
    console.log(pc.yellow('No MCP servers found to sync.'));
    return;
  }

  let targetName = serverName?.trim();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  if (!targetName) {
    console.log(pc.bold('Select Server to Sync:'));
    allServers.forEach((s, idx) => {
      console.log(`  ${pc.yellow((idx + 1).toString())}. ${pc.bold(s.name)} ${pc.dim(`(from ${s.hostName})`)}`);
    });

    const choice = await new Promise<string>((res) => rl.question(pc.cyan('Enter number: '), (ans) => res(ans.trim())));
    const num = parseInt(choice, 10);
    if (num >= 1 && num <= allServers.length) {
      targetName = allServers[num - 1].name;
      options.from = allServers[num - 1].host;
    } else {
      console.log(pc.red('Invalid selection.'));
      rl.close();
      return;
    }
  }

  const fromHost = options.from as HostId | undefined;
  const sourceServer = hostManager.findServer(targetName, fromHost);
  if (!sourceServer) {
    console.log(pc.red(`Error: Source server "${targetName}" not found.`));
    rl.close();
    return;
  }

  // Choose destination host
  const availableHosts = hostManager.getAllHosts().filter((h) => h.id !== sourceServer.host);
  let destHostId: HostId = (options.to as HostId) || 'antigravity';

  if (!options.to) {
    console.log();
    console.log(pc.bold(`Select Destination Host to copy "${sourceServer.name}" to:`));
    availableHosts.forEach((h, idx) => {
      console.log(`  ${pc.yellow((idx + 1).toString())}. ${h.name}`);
    });

    const toChoice = await new Promise<string>((res) => rl.question(pc.cyan('Enter number: '), (ans) => res(ans.trim())));
    const toNum = parseInt(toChoice, 10);
    if (toNum >= 1 && toNum <= availableHosts.length) {
      destHostId = availableHosts[toNum - 1].id;
    }
  }

  rl.close();

  const destHostInfo = hostManager.getHost(destHostId);
  if (!destHostInfo) {
    console.log(pc.red(`Error: Invalid destination host "${destHostId}".`));
    return;
  }

  displayAttentionNotice({
    action: `Sync Server "${sourceServer.name}" to ${destHostInfo.name}`,
    hostName: destHostInfo.name,
    configPath: destHostInfo.configPath,
    whatWillHappen: [
      `Server "${sourceServer.name}" configuration will be cloned from ${sourceServer.hostName} to ${destHostInfo.name}.`,
      sourceServer.transport === 'stdio'
        ? `Command: "${sourceServer.command} ${(sourceServer.args || []).join(' ')}"`
        : `Endpoint URL: "${sourceServer.url}"`,
      `Environment variables and credentials will be copied safely.`,
      `A backup of ${destHostInfo.name} configuration will be saved before writing.`,
    ],
  });

  const proceed = await promptConfirmation(`Proceed with syncing "${sourceServer.name}" to ${destHostInfo.name}?`, false);
  if (!proceed) {
    console.log(pc.dim('[-] Sync cancelled.'));
    return;
  }

  const { backupPath } = hostManager.saveServer(destHostId, {
    name: sourceServer.name,
    transport: sourceServer.transport,
    command: sourceServer.command,
    args: sourceServer.args,
    env: sourceServer.env,
    url: sourceServer.url,
    disabled: sourceServer.disabled,
  });

  console.log();
  console.log(pc.green(`${icons.check} Server "${sourceServer.name}" successfully synced to ${destHostInfo.name}!`));
  if (backupPath) {
    console.log(pc.dim(`  Configuration backup created at: ${backupPath}`));
  }
}
