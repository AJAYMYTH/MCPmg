import pc from 'picocolors';
import readline from 'readline';
import { hostManager } from '../hosts/hostManager.js';
import { HostId, MCPServerConfig } from '../types.js';
import { displayAttentionNotice, promptConfirmation } from '../utils/attention.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { icons } from '../ui/icons.js';

export async function editCommand(serverName?: string, options: { host?: string } = {}): Promise<void> {
  const hostFilter = options.host as HostId | undefined;

  let targetName = serverName?.trim();
  if (!targetName) {
    const allServers = hostManager.getAllServers(hostFilter);
    if (allServers.length === 0) {
      console.log(pc.yellow('No MCP servers found to edit.'));
      return;
    }

    console.log();
    console.log(pc.bold('Select Server to Edit:'));
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
      targetName = allServers[num - 1].name;
    } else {
      console.log(pc.red('Invalid selection.'));
      return;
    }
  }

  const srv = hostManager.findServer(targetName, hostFilter);
  if (!srv) {
    console.log(pc.red(`Error: Server "${targetName}" not found.`));
    return;
  }

  const hostInfo = hostManager.getHost(srv.host);
  if (!hostInfo) return;

  console.log();
  console.log(pc.bold(pc.white(`${icons.gear} Edit Server: ${srv.name} (${srv.hostName})`)));
  console.log(pc.dim(`Current command/URL: ${srv.url || `${srv.command} ${(srv.args || []).join(' ')}`}`));
  console.log();
  console.log('What would you like to edit?');
  console.log(`  ${pc.yellow('1')}. Toggle Enable/Disable (Currently: ${srv.disabled ? pc.red('Disabled') : pc.green('Enabled')})`);
  console.log(`  ${pc.yellow('2')}. Update Environment Variable / API Token ${icons.key}`);
  console.log(`  ${pc.yellow('3')}. Update Command / Arguments ${icons.terminal}`);
  if (srv.transport === 'sse' || srv.url) {
    console.log(`  ${pc.yellow('4')}. Update Remote Server URL ${icons.plug}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = await new Promise<string>((resolve) => {
    rl.question(pc.cyan('Enter option number: '), (ans) => {
      resolve(ans.trim());
    });
  });

  const updatedConfig: Partial<MCPServerConfig> = { ...srv };
  const changesSummary: string[] = [];

  if (choice === '1') {
    const newDisabled = !srv.disabled;
    updatedConfig.disabled = newDisabled;
    changesSummary.push(`Change status to ${newDisabled ? 'Disabled' : 'Enabled'}.`);
  } else if (choice === '2') {
    const existingKeys = Object.keys(srv.env || {});
    if (existingKeys.length > 0) {
      console.log(pc.dim(`Current keys: ${existingKeys.join(', ')}`));
    }
    const envKey = await new Promise<string>((res) => rl.question(pc.cyan('Environment Variable Name: '), (ans) => res(ans.trim())));
    const envVal = await new Promise<string>((res) => rl.question(pc.cyan(`New value for "${envKey}": `), (ans) => res(ans.trim())));

    if (!envKey) {
      console.log(pc.red('Key cannot be empty.'));
      rl.close();
      return;
    }

    updatedConfig.env = {
      ...(srv.env || {}),
      [envKey]: envVal,
    };
    changesSummary.push(`Update environment variable "${envKey}".`);
  } else if (choice === '3') {
    const newCmd = await new Promise<string>((res) =>
      rl.question(pc.cyan(`Executable command [${srv.command}]: `), (ans) => res(ans.trim() || srv.command || 'npx'))
    );
    const newArgsStr = await new Promise<string>((res) =>
      rl.question(pc.cyan(`Arguments [${(srv.args || []).join(' ')}]: `), (ans) => res(ans.trim()))
    );

    updatedConfig.command = newCmd;
    if (newArgsStr) {
      updatedConfig.args = newArgsStr.split(/\s+/).filter(Boolean);
    }
    changesSummary.push(`Update command to "${newCmd} ${(updatedConfig.args || []).join(' ')}".`);
  } else if (choice === '4') {
    const newUrl = await new Promise<string>((res) =>
      rl.question(pc.cyan(`New URL [${srv.url}]: `), (ans) => res(ans.trim()))
    );
    if (newUrl) {
      updatedConfig.url = newUrl;
      changesSummary.push(`Update endpoint URL to "${newUrl}".`);
    }
  } else {
    console.log(pc.dim('No changes selected.'));
    rl.close();
    return;
  }

  rl.close();

  // Display Attention Notice
  displayAttentionNotice({
    action: `Update Configuration for "${srv.name}"`,
    hostName: hostInfo.name,
    configPath: hostInfo.configPath,
    whatWillHappen: changesSummary,
  });

  const proceed = await promptConfirmation('Do you want to apply and save these changes?', true);
  if (!proceed) {
    console.log(pc.dim('Edit cancelled.'));
    return;
  }

  const { backupPath } = hostManager.saveServer(srv.host, {
    name: srv.name,
    transport: updatedConfig.transport || srv.transport,
    command: updatedConfig.command,
    args: updatedConfig.args,
    env: updatedConfig.env,
    url: updatedConfig.url,
    disabled: updatedConfig.disabled,
  });

  console.log();
  console.log(pc.green(`${icons.check} Server "${srv.name}" configuration updated successfully!`));
  if (backupPath) {
    console.log(pc.dim(`  Configuration backup created at: ${backupPath}`));
  }

  // Quick verify
  const verifyServer = hostManager.findServer(srv.name, srv.host);
  if (verifyServer && !verifyServer.disabled) {
    console.log(pc.cyan('Verifying server health...'));
    const res = await mcpRunner.probeServer(verifyServer, 5000);
    if (res.success) {
      console.log(pc.green(`${icons.check} Server verified: Healthy (${res.latencyMs}ms, ${res.toolsCount} tools)`));
    } else {
      console.log(pc.yellow(`${icons.alert} Warning: Probe returned ${res.error || res.stderr}`));
    }
  }
}
