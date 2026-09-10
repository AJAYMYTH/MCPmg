import pc from 'picocolors';
import readline from 'readline';
import { execSync } from 'child_process';
import { DiagnosticIssue, MCPServerConfig } from '../types.js';
import { hostManager } from '../hosts/hostManager.js';
import { displayAttentionNotice, promptConfirmation } from '../utils/attention.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { icons } from '../ui/icons.js';

export class FixerRegistry {
  /**
   * Applies an automated or guided fix for a diagnosed issue
   */
  public async applyFix(issue: DiagnosticIssue, server: MCPServerConfig): Promise<boolean> {
    switch (issue.autoFixType) {
      case 'auth_token':
        return this.fixAuthToken(issue, server);
      case 'windows_path':
        return this.fixWindowsPath(issue, server);
      case 'schema_repair':
        return this.fixSchemaRepair(issue, server);
      case 'install_package':
        return this.fixInstallPackage(issue, server);
      default:
        console.log(pc.yellow(`${icons.alert} No automated fixer available for issue: ${issue.title}`));
        console.log(pc.dim(`Suggested manual step: ${issue.suggestedFix}`));
        return false;
    }
  }

  /**
   * Fixes missing or invalid authentication token / environment variable
   */
  private async fixAuthToken(issue: DiagnosticIssue, server: MCPServerConfig): Promise<boolean> {
    const hostInfo = hostManager.getHost(server.host);
    if (!hostInfo) return false;

    // Identify target env key
    let targetKey = issue.metadata?.envKey;
    if (!targetKey) {
      // If no specific key, check server name hints or existing env keys
      if (issue.metadata?.existingEnvKeys?.length === 1) {
        targetKey = issue.metadata.existingEnvKeys[0];
      } else if (server.name.toLowerCase().includes('taskair')) {
        targetKey = 'TASKAIR_TOKEN';
      } else if (server.name.toLowerCase().includes('github')) {
        targetKey = 'GITHUB_PERSONAL_ACCESS_TOKEN';
      } else if (server.name.toLowerCase().includes('supabase')) {
        targetKey = 'SUPABASE_KEY';
      } else if (server.name.toLowerCase().includes('brave')) {
        targetKey = 'BRAVE_API_KEY';
      }
    }

    displayAttentionNotice({
      action: `Repair Authentication Token for "${server.name}"`,
      hostName: hostInfo.name,
      configPath: hostInfo.configPath,
      whatWillHappen: [
        `You will be prompted to enter a valid authentication credential for "${server.name}".`,
        targetKey
          ? `The environment variable "${targetKey}" in ${hostInfo.name} will be updated.`
          : `A new environment variable will be saved in ${hostInfo.name} config.`,
        `The original configuration file will be backed up automatically before saving.`,
        `MCPmg will immediately test the server connection to verify the new token works.`,
      ],
    });

    const proceed = await promptConfirmation('Do you want to enter a new token/key now?', false);
    if (!proceed) {
      console.log(pc.dim('[-] Operation cancelled by user.'));
      return false;
    }

    // Prompt user for key name if not known
    if (!targetKey) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      while (!targetKey) {
        targetKey = await new Promise<string>((resolve) => {
          rl.question(pc.cyan('Enter Environment Variable Name (e.g. API_KEY, TOKEN, or "cancel"): '), (ans) => {
            resolve(ans.trim());
          });
        });
        if (targetKey.toLowerCase() === 'cancel' || targetKey.toLowerCase() === 'q') {
          rl.close();
          console.log(pc.dim('[-] Operation cancelled.'));
          return false;
        }
      }
      rl.close();
    }

    // Prompt user for the token value (cannot be empty)
    const rlToken = readline.createInterface({ input: process.stdin, output: process.stdout });
    let tokenValue = '';
    while (!tokenValue) {
      tokenValue = await new Promise<string>((resolve) => {
        rlToken.question(pc.cyan(`Enter value for ${pc.bold(targetKey)} (or "cancel"): `), (ans) => {
          resolve(ans.trim());
        });
      });
      if (tokenValue.toLowerCase() === 'cancel' || tokenValue.toLowerCase() === 'q') {
        rlToken.close();
        console.log(pc.dim('[-] Operation cancelled.'));
        return false;
      }
      if (!tokenValue) {
        console.log(pc.red(`[-] Error: Token value cannot be empty.`));
      }
    }
    rlToken.close();

    // Update config
    const updatedEnv = {
      ...(server.env || {}),
      [targetKey]: tokenValue,
    };

    const { backupPath } = hostManager.saveServer(server.host, {
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      env: updatedEnv,
      url: server.url,
      disabled: server.disabled,
    });

    console.log();
    console.log(pc.green(`${icons.check} Successfully updated "${targetKey}" for server "${server.name}".`));
    if (backupPath) {
      console.log(pc.dim(`  Backup created at: ${backupPath}`));
    }

    // Verify immediately
    console.log(pc.cyan('Testing server with updated credentials...'));
    const updatedServer = hostManager.findServer(server.name, server.host);
    if (updatedServer) {
      const verifyResult = await mcpRunner.probeServer(updatedServer, 6000);
      if (verifyResult.success) {
        console.log(pc.green(`${icons.check} Verification PASSED! Server is healthy (${verifyResult.latencyMs}ms, ${verifyResult.toolsCount} tools available).`));
      } else {
        console.log(pc.yellow(`${icons.alert} Server test returned: ${verifyResult.error || verifyResult.stderr}`));
      }
    }

    return true;
  }

  /**
   * Fixes Windows executable command paths (e.g. npx -> npx.cmd)
   */
  private async fixWindowsPath(issue: DiagnosticIssue, server: MCPServerConfig): Promise<boolean> {
    const hostInfo = hostManager.getHost(server.host);
    if (!hostInfo || !server.command) return false;

    const recommendedCommand = issue.metadata?.recommendedCommand || `${server.command}.cmd`;

    displayAttentionNotice({
      action: `Optimize Windows Executable for "${server.name}"`,
      hostName: hostInfo.name,
      configPath: hostInfo.configPath,
      whatWillHappen: [
        `Change command from "${pc.yellow(server.command)}" to "${pc.green(recommendedCommand)}".`,
        `Prevents ENOENT spawn failures across Node and AI desktop clients on Windows.`,
        `A backup of ${hostInfo.name} will be created before saving.`,
      ],
    });

    const proceed = await promptConfirmation('Do you want to apply this command optimization?', false);
    if (!proceed) {
      console.log(pc.dim('[-] Skipped by user.'));
      return false;
    }

    const { backupPath } = hostManager.saveServer(server.host, {
      name: server.name,
      transport: server.transport,
      command: recommendedCommand,
      args: server.args,
      env: server.env,
      url: server.url,
      disabled: server.disabled,
    });

    console.log(pc.green(`${icons.check} Command successfully updated to "${recommendedCommand}".`));
    if (backupPath) {
      console.log(pc.dim(`  Backup preserved: ${backupPath}`));
    }
    return true;
  }

  /**
   * Fixes malformed args / schema format
   */
  private async fixSchemaRepair(issue: DiagnosticIssue, server: MCPServerConfig): Promise<boolean> {
    const hostInfo = hostManager.getHost(server.host);
    if (!hostInfo) return false;

    displayAttentionNotice({
      action: `Repair Configuration Schema for "${server.name}"`,
      hostName: hostInfo.name,
      configPath: hostInfo.configPath,
      whatWillHappen: [
        `Normalize args into a valid string array.`,
        `Clean malformed parameters in configuration file.`,
        `A backup will be saved automatically before modifying.`,
      ],
    });

    const proceed = await promptConfirmation('Do you want to repair the schema now?', false);
    if (!proceed) return false;

    const normalizedArgs = Array.isArray(server.args)
      ? server.args
      : server.args
      ? [String(server.args)]
      : [];

    hostManager.saveServer(server.host, {
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: normalizedArgs,
      env: server.env,
      url: server.url,
      disabled: server.disabled,
    });

    console.log(pc.green(`${icons.check} Configuration schema repaired.`));
    return true;
  }

  /**
   * Installs missing npm or python package
   */
  private async fixInstallPackage(issue: DiagnosticIssue, server: MCPServerConfig): Promise<boolean> {
    const hostInfo = hostManager.getHost(server.host);
    const pkg = issue.metadata?.packageName;
    const pm = issue.metadata?.packageManager || 'npm';
    if (!pkg) return false;

    const installCommand = pm === 'npm' ? `npm install -g ${pkg}` : `pip install ${pkg}`;

    displayAttentionNotice({
      action: `Install Missing Dependency for "${server.name}"`,
      hostName: hostInfo?.name || 'System',
      configPath: 'System Global Packages',
      whatWillHappen: [
        `Execute global installation command: "${pc.cyan(installCommand)}"`,
        `This will download and install "${pkg}" to satisfy server dependencies.`,
      ],
    });

    const proceed = await promptConfirmation(`Run "${installCommand}" now?`, false);
    if (!proceed) return false;

    try {
      console.log(pc.cyan(`Running: ${installCommand}...`));
      execSync(installCommand, { stdio: 'inherit' });
      console.log(pc.green(`${icons.check} Package "${pkg}" successfully installed.`));
      return true;
    } catch (err: any) {
      console.log(pc.red(`${icons.cross} Failed to install package: ${err.message}`));
      return false;
    }
  }
}

export const fixerRegistry = new FixerRegistry();
