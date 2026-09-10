import pc from 'picocolors';
import readline from 'readline';
import ora from 'ora';
import { hostManager } from '../hosts/hostManager.js';
import { POPULAR_PRESETS } from '../presets/popular.js';
import { HostId, MCPServerConfig, ServerTransport } from '../types.js';
import { displayAttentionNotice, promptConfirmation } from '../utils/attention.js';
import { mcpRunner } from '../client/mcpRunner.js';
import { icons } from '../ui/icons.js';

function askQuestion(rl: readline.Interface, question: string, defaultVal?: string): Promise<string> {
  const prompt = defaultVal ? `${question} (${defaultVal}): ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(pc.cyan(prompt), (answer) => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

export async function addCommand(
  nameArg?: string,
  options: {
    host?: string;
    preset?: string;
    command?: string;
    args?: string[];
    url?: string;
    env?: string[];
  } = {}
): Promise<void> {
  console.log();
  console.log(pc.bold(pc.white(`${icons.plus} Add Model Context Protocol (MCP) Server`)));
  console.log(pc.dim('───────────────────────────────────────────────'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // 1. Determine Target Host
    const availableHosts = hostManager.getAllHosts().filter((h) => h.exists);
    const allHosts = hostManager.getAllHosts();
    const targetHosts = availableHosts.length > 0 ? availableHosts : allHosts;

    let selectedHostId: HostId = (options.host as HostId) || 'claude';

    if (!options.host) {
      console.log(pc.bold('Select Target AI Host:'));
      targetHosts.forEach((h, idx) => {
        const status = h.exists ? pc.green('[Installed]') : pc.dim('[Not Found]');
        console.log(`  ${pc.yellow((idx + 1).toString())}. ${h.name} ${status}`);
      });

      const choice = await askQuestion(rl, 'Choose host number', '1');
      const num = parseInt(choice, 10);
      if (num >= 1 && num <= targetHosts.length) {
        selectedHostId = targetHosts[num - 1].id;
      }
    }

    const hostInfo = hostManager.getHost(selectedHostId);
    if (!hostInfo) {
      console.log(pc.red(`[-] Error: Invalid host "${selectedHostId}"`));
      rl.close();
      return;
    }

    // 2. Select Source (Preset or Custom)
    let serverName = nameArg?.trim() || '';
    let transport: ServerTransport = 'stdio';
    let command = options.command || '';
    let args: string[] = options.args || [];
    let url = options.url || '';
    const envVars: Record<string, string> = {};

    // Parse CLI env flags if provided (-e KEY=VAL)
    if (options.env) {
      for (const e of options.env) {
        const [k, ...v] = e.split('=');
        if (k) envVars[k.trim()] = v.join('=').trim();
      }
    }

    let selectedPreset = options.preset ? POPULAR_PRESETS.find((p) => p.id === options.preset) : undefined;

    if (!selectedPreset && !command && !url) {
      console.log();
      console.log(pc.bold('Choose Server Source:'));
      console.log(`  ${pc.yellow('0')}. Custom (enter custom command or URL)`);
      POPULAR_PRESETS.forEach((p, idx) => {
        console.log(`  ${pc.yellow((idx + 1).toString())}. ${p.name} - ${pc.dim(p.description)}`);
      });

      const presetChoice = await askQuestion(rl, 'Select template or custom', '0');
      const pNum = parseInt(presetChoice, 10);
      if (pNum >= 1 && pNum <= POPULAR_PRESETS.length) {
        selectedPreset = POPULAR_PRESETS[pNum - 1];
      }
    }

    if (selectedPreset) {
      if (!serverName) serverName = selectedPreset.id;
      transport = selectedPreset.transport;
      command = selectedPreset.command || '';
      args = selectedPreset.args || [];
      url = selectedPreset.urlTemplate || '';

      console.log(pc.dim(`Using template: ${selectedPreset.name}`));

      // Handle environment requirements for the preset with strict validation
      if (selectedPreset.envRequirements) {
        for (const req of selectedPreset.envRequirements) {
          if (!envVars[req.key]) {
            console.log();
            console.log(pc.yellow(`Required parameter: ${req.key}`));
            console.log(pc.dim(`Description: ${req.description}`));

            let val = '';
            while (!val) {
              val = await askQuestion(rl, `Enter ${req.key} (or type "cancel" to exit)`, req.default);
              if (val.toLowerCase() === 'cancel' || val.toLowerCase() === 'q') {
                console.log(pc.dim('[-] Operation cancelled. No changes made.'));
                rl.close();
                return;
              }
              if (!val && req.required) {
                console.log(pc.red(`[-] Error: "${req.key}" cannot be empty.`));
              } else if (!req.required) {
                break;
              }
            }

            if (val) {
              envVars[req.key] = val;
            }
          }
        }
      }

      // Handle URL template for SSE (e.g. Supabase Project Ref) with strict validation
      if (transport === 'sse' && url.includes('<PROJECT_REF>')) {
        let ref = '';
        while (!ref) {
          ref = await askQuestion(rl, 'Enter Supabase Project Ref (or type "cancel" to exit)');
          if (ref.toLowerCase() === 'cancel' || ref.toLowerCase() === 'q') {
            console.log(pc.dim('[-] Operation cancelled. No changes made.'));
            rl.close();
            return;
          }
          if (!ref) {
            console.log(pc.red('[-] Error: Supabase Project Reference cannot be empty.'));
          }
        }
        url = url.replace('<PROJECT_REF>', ref);
      }
    } else {
      // Custom server
      while (!serverName) {
        serverName = await askQuestion(rl, 'Enter unique server name (e.g. my-server, or "cancel" to exit)');
        if (serverName.toLowerCase() === 'cancel' || serverName.toLowerCase() === 'q') {
          console.log(pc.dim('[-] Operation cancelled. No changes made.'));
          rl.close();
          return;
        }
        if (!serverName) {
          console.log(pc.red('[-] Error: Server name cannot be empty.'));
        }
      }

      if (!options.command && !options.url) {
        const tChoice = await askQuestion(rl, 'Transport type: [1] stdio (process) or [2] sse (remote URL)', '1');
        transport = tChoice === '2' ? 'sse' : 'stdio';
      } else {
        transport = options.url ? 'sse' : 'stdio';
      }

      if (transport === 'stdio') {
        while (!command) {
          command = await askQuestion(rl, 'Executable command (e.g. npx, node, python)', 'npx');
          if (!command) {
            console.log(pc.red('[-] Error: Executable command is required.'));
          }
        }
        if (args.length === 0) {
          const argsStr = await askQuestion(rl, 'Command arguments separated by space (optional)');
          if (argsStr) {
            args = argsStr.split(/\s+/).filter(Boolean);
          }
        }
      } else {
        while (!url) {
          url = await askQuestion(rl, 'Remote SSE / HTTP Endpoint URL (e.g. https://...)');
          if (!url) {
            console.log(pc.red('[-] Error: Remote endpoint URL is required.'));
          }
        }
      }
    }

    rl.close();

    // 3. Display Detailed Attention Notice
    displayAttentionNotice({
      action: `Add MCP Server "${serverName}"`,
      hostName: hostInfo.name,
      configPath: hostInfo.configPath,
      whatWillHappen: [
        `Server "${serverName}" will be registered in ${hostInfo.name}.`,
        transport === 'stdio'
          ? `Will execute command: "${command} ${args.join(' ')}"`
          : `Will connect to remote endpoint: "${url}"`,
        Object.keys(envVars).length > 0
          ? `Configured environment variables: ${Object.keys(envVars).join(', ')}`
          : `No additional environment variables configured.`,
        `Tools and resources from "${serverName}" will be accessible in ${hostInfo.name}.`,
      ],
    });

    // 4. Ask User Confirmation (Strictly default to FALSE - requires explicit 'y' or 'yes')
    const proceed = await promptConfirmation('Do you want to proceed and save this server?', false);
    if (!proceed) {
      console.log(pc.dim('[-] Operation cancelled. No changes were saved.'));
      return;
    }

    // 5. Save Configuration
    const { backupPath } = hostManager.saveServer(selectedHostId, {
      name: serverName,
      transport,
      command,
      args,
      env: envVars,
      url,
    });

    console.log();
    console.log(pc.green(`${icons.check} Server "${serverName}" successfully added to ${hostInfo.name}!`));
    if (backupPath) {
      console.log(pc.dim(`  Configuration backup created at: ${backupPath}`));
    }

    // 6. Test newly added server immediately
    const spinner = ora(pc.cyan(`Testing connection to "${serverName}"...`)).start();
    const savedServer = hostManager.findServer(serverName, selectedHostId);
    if (savedServer) {
      const probeResult = await mcpRunner.probeServer(savedServer, 8000);
      if (probeResult.success) {
        spinner.succeed(
          pc.green(`${icons.check} Connection verified! Latency: ${probeResult.latencyMs}ms | Tools: ${probeResult.toolsCount}`)
        );
      } else {
        spinner.warn(
          pc.yellow(`${icons.alert} Server registered, but initial test reported an issue: ${probeResult.error || probeResult.stderr}`)
        );
        console.log(pc.dim(`Run "mcpmg doctor ${serverName}" or "mcpmg fix ${serverName}" to diagnose and repair.`));
      }
    }
    console.log();
  } catch (err: any) {
    rl.close();
    console.error(pc.red(`[-] Failed to add server: ${err.message}`));
  }
}
