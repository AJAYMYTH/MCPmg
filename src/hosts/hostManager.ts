import fs from 'fs';
import path from 'path';
import os from 'os';
import { HostId, HostInfo, MCPServerConfig, ServerTransport } from '../types.js';
import { backupManager } from './backup.js';

export class HostManager {
  private getPlatformPaths() {
    const home = os.homedir();
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    const appData = process.env.APPDATA || (isWindows ? path.join(home, 'AppData', 'Roaming') : '');

    // 1. Claude Desktop
    let claudeDesktopPath = '';
    if (isWindows) {
      claudeDesktopPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
    } else if (isMac) {
      claudeDesktopPath = path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    } else {
      claudeDesktopPath = path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
    }

    // 2. Antigravity / Gemini
    const antigravityPath = path.join(home, '.gemini', 'antigravity', 'mcp_config.json');
    const geminiSettingsPath = path.join(home, '.gemini', 'settings.json');

    // 3. Cursor
    const cursorPath = path.join(home, '.cursor', 'mcp.json');

    // 4. Cline / Roo-Code
    let clinePath = '';
    if (isWindows) {
      const rooPath = path.join(appData, 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json');
      const standardCline = path.join(appData, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      clinePath = fs.existsSync(rooPath) ? rooPath : standardCline;
    } else if (isMac) {
      const rooPath = path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json');
      const standardCline = path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      clinePath = fs.existsSync(rooPath) ? rooPath : standardCline;
    } else {
      const rooPath = path.join(home, '.config', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json');
      clinePath = rooPath;
    }

    // 5. Claude Code CLI
    const claudeCodePath = path.join(home, '.claude.json');

    // 6. Local project
    const localMcpPath = path.resolve('.mcp.json');

    return {
      claudeDesktopPath,
      antigravityPath,
      geminiSettingsPath,
      cursorPath,
      clinePath,
      claudeCodePath,
      localMcpPath,
    };
  }

  /**
   * Discovers all supported hosts and checks if they exist
   */
  public getAllHosts(): HostInfo[] {
    const paths = this.getPlatformPaths();

    return [
      {
        id: 'claude',
        name: 'Claude Desktop',
        configPath: paths.claudeDesktopPath,
        exists: fs.existsSync(paths.claudeDesktopPath),
        format: 'claude_standard',
      },
      {
        id: 'antigravity',
        name: 'Antigravity / Gemini',
        configPath: fs.existsSync(paths.antigravityPath) ? paths.antigravityPath : paths.geminiSettingsPath,
        exists: fs.existsSync(paths.antigravityPath) || fs.existsSync(paths.geminiSettingsPath),
        format: 'gemini_settings',
      },
      {
        id: 'cursor',
        name: 'Cursor',
        configPath: paths.cursorPath,
        exists: fs.existsSync(paths.cursorPath),
        format: 'simple_mcp',
      },
      {
        id: 'cline',
        name: 'VS Code Cline / Roo',
        configPath: paths.clinePath,
        exists: fs.existsSync(paths.clinePath),
        format: 'simple_mcp',
      },
      {
        id: 'claudecode',
        name: 'Claude Code CLI',
        configPath: paths.claudeCodePath,
        exists: fs.existsSync(paths.claudeCodePath),
        format: 'simple_mcp',
      },
      {
        id: 'custom',
        name: 'Local Workspace (.mcp.json)',
        configPath: paths.localMcpPath,
        exists: fs.existsSync(paths.localMcpPath),
        format: 'simple_mcp',
      },
    ];
  }

  public getHost(id: HostId): HostInfo | undefined {
    return this.getAllHosts().find((h) => h.id === id);
  }

  /**
   * Safely reads and parses a JSON config file
   */
  public readRawConfigFile(filePath: string): any {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Safely parses MCP servers from a host config
   */
  public getServersForHost(host: HostInfo): MCPServerConfig[] {
    const results: MCPServerConfig[] = [];
    if (!host.exists && !fs.existsSync(host.configPath)) {
      return results;
    }

    try {
      // For Antigravity, we check both mcp_config.json and settings.json
      const pathsToRead = [host.configPath];
      if (host.id === 'antigravity') {
        const paths = this.getPlatformPaths();
        if (fs.existsSync(paths.antigravityPath) && !pathsToRead.includes(paths.antigravityPath)) {
          pathsToRead.push(paths.antigravityPath);
        }
        if (fs.existsSync(paths.geminiSettingsPath) && !pathsToRead.includes(paths.geminiSettingsPath)) {
          pathsToRead.push(paths.geminiSettingsPath);
        }
      }

      for (const configPath of pathsToRead) {
        if (!fs.existsSync(configPath)) continue;

        let parsed: any;
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          parsed = JSON.parse(content);
        } catch {
          // If JSON is broken, doctor will detect it
          continue;
        }

        const serversObj = parsed?.mcpServers || {};
        for (const [name, srv] of Object.entries<any>(serversObj)) {
          // Determine transport: SSE/HTTP if serverUrl or url is provided, else stdio
          const url = srv.serverUrl || srv.url;
          const transport: ServerTransport = url ? 'sse' : 'stdio';

          // Avoid duplicate server names across multiple antigravity files
          if (!results.some((r) => r.name === name)) {
            results.push({
              name,
              host: host.id,
              hostName: host.name,
              configPath,
              transport,
              command: srv.command,
              args: Array.isArray(srv.args) ? srv.args : srv.args ? [String(srv.args)] : [],
              env: srv.env || {},
              url,
              disabled: Boolean(srv.disabled),
              raw: srv,
            });
          }
        }
      }
    } catch (err) {
      // Ignored here; diagnostic will catch and report
    }

    return results;
  }

  /**
   * Retrieves all servers across all detected hosts
   */
  public getAllServers(hostFilter?: HostId): MCPServerConfig[] {
    const hosts = this.getAllHosts().filter((h) => !hostFilter || h.id === hostFilter);
    const allServers: MCPServerConfig[] = [];

    for (const host of hosts) {
      allServers.push(...this.getServersForHost(host));
    }

    return allServers;
  }

  /**
   * Finds a specific server by name
   */
  public findServer(name: string, hostFilter?: HostId): MCPServerConfig | undefined {
    return this.getAllServers(hostFilter).find((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Saves or updates a server in the specified host
   */
  public saveServer(
    hostId: HostId,
    server: {
      name: string;
      transport: ServerTransport;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      disabled?: boolean;
    }
  ): { backupPath: string | null; configPath: string } {
    const host = this.getHost(hostId);
    if (!host) {
      throw new Error(`Unknown host ID: ${hostId}`);
    }

    const configPath = host.configPath;
    const parentDir = path.dirname(configPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    let configData: any = {};
    if (fs.existsSync(configPath)) {
      try {
        configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {
        configData = {};
      }
    }

    // Always create a backup before modifying
    const backupPath = backupManager.createBackup(hostId, configPath);

    if (!configData.mcpServers) {
      configData.mcpServers = {};
    }

    const serverEntry: any = {};
    if (server.transport === 'sse' || server.transport === 'http' || server.url) {
      serverEntry.serverUrl = server.url;
      if (server.url) {
        serverEntry.url = server.url;
      }
    } else {
      serverEntry.command = server.command || 'node';
      serverEntry.args = server.args || [];
      if (server.env && Object.keys(server.env).length > 0) {
        serverEntry.env = server.env;
      }
    }

    if (server.disabled !== undefined) {
      serverEntry.disabled = server.disabled;
    }

    configData.mcpServers[server.name] = serverEntry;

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

    return { backupPath, configPath };
  }

  /**
   * Removes a server from the specified host
   */
  public removeServer(hostId: HostId, serverName: string): { backupPath: string | null; configPath: string; removed: boolean } {
    const host = this.getHost(hostId);
    if (!host) {
      throw new Error(`Unknown host ID: ${hostId}`);
    }

    const configPath = host.configPath;
    if (!fs.existsSync(configPath)) {
      return { backupPath: null, configPath, removed: false };
    }

    let configData: any = {};
    try {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      throw new Error(`Failed to parse configuration file: ${configPath}`);
    }

    if (!configData.mcpServers || !configData.mcpServers[serverName]) {
      return { backupPath: null, configPath, removed: false };
    }

    // Create backup before deletion
    const backupPath = backupManager.createBackup(hostId, configPath);

    delete configData.mcpServers[serverName];
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

    return { backupPath, configPath, removed: true };
  }
}

export const hostManager = new HostManager();
