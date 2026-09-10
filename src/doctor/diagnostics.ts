import fs from 'fs';
import path from 'path';
import { DiagnosticIssue, MCPServerConfig, TestResult } from '../types.js';
import { findExecutableInPath } from '../client/mcpRunner.js';

// Common sensitive environment variable patterns
const KNOWN_AUTH_KEYS = [
  'TOKEN',
  'API_KEY',
  'SECRET',
  'AUTH',
  'PASSWORD',
  'KEY',
  'CREDENTIAL',
  'ACCESS_KEY',
  'PRIVATE_KEY',
];

const PLACEHOLDER_VALUES = [
  'your_token_here',
  'your_api_key_here',
  'your_key_here',
  'paste_token_here',
  'xxx',
  'todo',
  'changeme',
  'replace_me',
  'sample_token',
];

export class DiagnosticEngine {
  /**
   * Performs a comprehensive diagnostic audit of an MCP server
   */
  public async diagnose(server: MCPServerConfig, testResult?: TestResult): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // 1. Static Configuration & Schema Diagnostics
    this.checkConfigSchema(server, issues);

    // 2. Binary, Command & Path Diagnostics
    this.checkCommandAndPath(server, issues);

    // 3. Environment & Auth Diagnostics
    this.checkAuthAndEnvironment(server, issues, testResult);

    // 4. Runtime Crash & Stderr Diagnostics
    if (testResult) {
      this.checkRuntimeAndStderr(server, testResult, issues);
    }

    // 5. Network / SSE Diagnostics
    if (server.transport === 'sse' || server.url) {
      await this.checkNetworkAndUrl(server, issues, testResult);
    }

    return issues;
  }

  private checkConfigSchema(server: MCPServerConfig, issues: DiagnosticIssue[]) {
    if (server.transport === 'stdio') {
      if (!server.command || server.command.trim() === '') {
        issues.push({
          id: `${server.name}-missing-command`,
          serverName: server.name,
          host: server.host,
          category: 'syntax',
          severity: 'error',
          title: 'Missing Executable Command',
          description: `Server "${server.name}" has no command specified for stdio transport.`,
          suggestedFix: 'Add a valid command (such as "npx", "node", "uvx", or a script path).',
          canAutoFix: false,
        });
      }
    }

    if (server.args && !Array.isArray(server.args)) {
      issues.push({
        id: `${server.name}-invalid-args`,
        serverName: server.name,
        host: server.host,
        category: 'syntax',
        severity: 'error',
        title: 'Malformed Arguments Format',
        description: `Server "${server.name}" has args formatted as a non-array (${typeof server.args}).`,
        suggestedFix: 'Convert args to a JSON array of strings.',
        canAutoFix: true,
        autoFixType: 'schema_repair',
      });
    }

    if (server.transport === 'sse' || server.url) {
      if (!server.url || server.url.trim() === '') {
        issues.push({
          id: `${server.name}-missing-url`,
          serverName: server.name,
          host: server.host,
          category: 'syntax',
          severity: 'error',
          title: 'Missing Remote Server URL',
          description: `Server "${server.name}" is configured for remote SSE but has no URL.`,
          suggestedFix: 'Provide a valid HTTP or HTTPS endpoint URL.',
          canAutoFix: false,
        });
      } else {
        try {
          const parsedUrl = new URL(server.url);
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            issues.push({
              id: `${server.name}-invalid-url-protocol`,
              serverName: server.name,
              host: server.host,
              category: 'syntax',
              severity: 'error',
              title: 'Invalid URL Protocol',
              description: `URL protocol "${parsedUrl.protocol}" is not supported. Use http: or https:`,
              suggestedFix: 'Update URL to use https:// or http://.',
              canAutoFix: false,
            });
          }
        } catch {
          issues.push({
            id: `${server.name}-malformed-url`,
            serverName: server.name,
            host: server.host,
            category: 'syntax',
            severity: 'error',
            title: 'Malformed URL Syntax',
            description: `The URL "${server.url}" is not a valid URL string.`,
            suggestedFix: 'Correct the URL syntax.',
            canAutoFix: false,
          });
        }
      }
    }
  }

  private checkCommandAndPath(server: MCPServerConfig, issues: DiagnosticIssue[]) {
    if (server.transport !== 'stdio' || !server.command) return;

    const cmd = server.command.trim();

    // Check if absolute path exists
    if (path.isAbsolute(cmd)) {
      if (!fs.existsSync(cmd)) {
        issues.push({
          id: `${server.name}-file-not-found`,
          serverName: server.name,
          host: server.host,
          category: 'path',
          severity: 'error',
          title: 'Command File Not Found',
          description: `The specified executable path "${cmd}" does not exist on disk.`,
          suggestedFix: 'Verify the file path or reinstall the tool at the expected location.',
          canAutoFix: false,
        });
      }
      return;
    }

    // Windows batch file check
    if (process.platform === 'win32') {
      const lower = cmd.toLowerCase();
      if (['npx', 'npm', 'yarn', 'pnpm'].includes(lower)) {
        // Warning if someone specified without .cmd on Windows
        // In our runner we resolve it, but in other AI clients (like Claude/Cursor),
        // node child_process.spawn() can fail with ENOENT if .cmd is omitted without shell:true.
        issues.push({
          id: `${server.name}-windows-cmd-extension`,
          serverName: server.name,
          host: server.host,
          category: 'path',
          severity: 'info',
          title: 'Windows Executable Optimization',
          description: `Command "${cmd}" on Windows is usually a batch script (${cmd}.cmd).`,
          suggestedFix: `Update command to "${cmd}.cmd" for guaranteed compatibility across all AI host processes.`,
          canAutoFix: true,
          autoFixType: 'windows_path',
          metadata: { recommendedCommand: `${cmd}.cmd` },
        });
      }
    }

    // Check if binary is resolvable in PATH
    const resolvedPath = findExecutableInPath(cmd);
    if (!resolvedPath) {
      // Also try with .cmd on Windows
      const cmdResolved = process.platform === 'win32' ? findExecutableInPath(`${cmd}.cmd`) : null;
      const exeResolved = process.platform === 'win32' ? findExecutableInPath(`${cmd}.exe`) : null;

      if (!cmdResolved && !exeResolved) {
        issues.push({
          id: `${server.name}-cmd-not-in-path`,
          serverName: server.name,
          host: server.host,
          category: 'path',
          severity: 'error',
          title: `Executable "${cmd}" Not Found In PATH`,
          description: `The system cannot find the command "${cmd}" in environment PATH.`,
          suggestedFix: `Install "${cmd}" or specify its full absolute path.`,
          canAutoFix: false,
        });
      }
    }
  }

  private checkAuthAndEnvironment(server: MCPServerConfig, issues: DiagnosticIssue[], testResult?: TestResult) {
    const env = server.env || {};

    // 1. Check existing env keys for empty or placeholder values
    for (const [key, val] of Object.entries(env)) {
      const upperKey = key.toUpperCase();
      const isAuthKey = KNOWN_AUTH_KEYS.some((k) => upperKey.includes(k));

      if (isAuthKey) {
        if (!val || val.trim() === '') {
          issues.push({
            id: `${server.name}-empty-auth-${key}`,
            serverName: server.name,
            host: server.host,
            category: 'auth',
            severity: 'error',
            title: `Empty Authentication Key: ${key}`,
            description: `Environment variable "${key}" is defined but is empty.`,
            suggestedFix: `Set a valid token or credential for "${key}".`,
            canAutoFix: true,
            autoFixType: 'auth_token',
            metadata: { envKey: key },
          });
        } else {
          const lowerVal = val.toLowerCase().trim();
          if (PLACEHOLDER_VALUES.some((p) => lowerVal === p || lowerVal.includes(p))) {
            issues.push({
              id: `${server.name}-placeholder-auth-${key}`,
              serverName: server.name,
              host: server.host,
              category: 'auth',
              severity: 'warning',
              title: `Placeholder Value Detected in ${key}`,
              description: `The value for "${key}" looks like an unconfigured placeholder: "${val}".`,
              suggestedFix: `Replace placeholder with your real API token or secret.`,
              canAutoFix: true,
              autoFixType: 'auth_token',
              metadata: { envKey: key },
            });
          }
        }
      }
    }

    // 2. Check if runtime error indicated auth failure
    if (testResult && !testResult.success) {
      const combinedError = `${testResult.error || ''} ${testResult.stderr || ''}`.toLowerCase();

      const isAuthFailure =
        combinedError.includes('401') ||
        combinedError.includes('unauthorized') ||
        combinedError.includes('authentication failed') ||
        combinedError.includes('invalid api key') ||
        combinedError.includes('invalid token') ||
        combinedError.includes('forbidden') ||
        combinedError.includes('access denied');

      if (isAuthFailure) {
        issues.push({
          id: `${server.name}-runtime-auth-failure`,
          serverName: server.name,
          host: server.host,
          category: 'auth',
          severity: 'error',
          title: 'Authentication / Authorization Rejected',
          description: `Server returned an authorization error (401/403/Unauthorized): "${testResult.error || testResult.stderr}"`,
          suggestedFix: 'Verify and refresh your API token or OAuth credentials in configuration.',
          canAutoFix: true,
          autoFixType: 'auth_token',
          metadata: {
            existingEnvKeys: Object.keys(env),
          },
        });
      }
    }
  }

  private checkRuntimeAndStderr(server: MCPServerConfig, testResult: TestResult, issues: DiagnosticIssue[]) {
    if (testResult.success) return;

    const stderr = testResult.stderr || '';
    const err = testResult.error || '';
    const fullLog = `${err}\n${stderr}`;

    // Node Module Not Found
    const nodeModuleMatch = stderr.match(/Cannot find module '([^']+)'/i) || stderr.match(/MODULE_NOT_FOUND.*'([^']+)'/i);
    if (nodeModuleMatch) {
      const missingPkg = nodeModuleMatch[1];
      issues.push({
        id: `${server.name}-missing-node-module`,
        serverName: server.name,
        host: server.host,
        category: 'dependency',
        severity: 'error',
        title: `Missing Node.js Dependency: ${missingPkg}`,
        description: `Server crashed because it cannot find required module "${missingPkg}".`,
        suggestedFix: `Install the missing package with "npm install -g ${missingPkg}".`,
        canAutoFix: true,
        autoFixType: 'install_package',
        metadata: { packageName: missingPkg, packageManager: 'npm' },
      });
    }

    // Python Module Not Found
    const pythonModuleMatch = stderr.match(/No module named '([^']+)'/i);
    if (pythonModuleMatch) {
      const missingPkg = pythonModuleMatch[1];
      issues.push({
        id: `${server.name}-missing-python-module`,
        serverName: server.name,
        host: server.host,
        category: 'dependency',
        severity: 'error',
        title: `Missing Python Package: ${missingPkg}`,
        description: `Python script crashed because module "${missingPkg}" is not installed.`,
        suggestedFix: `Install the module using "pip install ${missingPkg}" or "uv pip install ${missingPkg}".`,
        canAutoFix: true,
        autoFixType: 'install_package',
        metadata: { packageName: missingPkg, packageManager: 'pip' },
      });
    }

    // Port In Use
    if (fullLog.includes('EADDRINUSE')) {
      issues.push({
        id: `${server.name}-port-in-use`,
        serverName: server.name,
        host: server.host,
        category: 'process',
        severity: 'error',
        title: 'Port Already In Use (EADDRINUSE)',
        description: 'Server failed to start because another process is already listening on the configured port.',
        suggestedFix: 'Terminate the existing process or configure a different port.',
        canAutoFix: false,
      });
    }

    // Generic Crash / Uncaught Exception
    if (!issues.some((i) => i.serverName === server.name && i.severity === 'error')) {
      issues.push({
        id: `${server.name}-runtime-crash`,
        serverName: server.name,
        host: server.host,
        category: 'process',
        severity: 'error',
        title: 'MCP Server Process Failed to Initialize',
        description: err || (stderr ? stderr.slice(0, 200) : 'Unknown process failure during handshake'),
        suggestedFix: 'Inspect stderr logs and verify command arguments and environment variables.',
        canAutoFix: false,
      });
    }
  }

  private async checkNetworkAndUrl(server: MCPServerConfig, issues: DiagnosticIssue[], testResult?: TestResult) {
    if (!server.url) return;

    try {
      const parsedUrl = new URL(server.url);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(parsedUrl.toString(), {
          method: 'HEAD',
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          issues.push({
            id: `${server.name}-remote-url-unauthorized`,
            serverName: server.name,
            host: server.host,
            category: 'auth',
            severity: 'error',
            title: `Remote Endpoint Returned ${response.status}`,
            description: `The remote URL "${server.url}" rejected access with HTTP ${response.status}.`,
            suggestedFix: 'Check authorization headers, API keys, or project references in the URL parameters.',
            canAutoFix: true,
            autoFixType: 'auth_token',
          });
        } else if (response.status >= 500) {
          issues.push({
            id: `${server.name}-remote-url-server-error`,
            serverName: server.name,
            host: server.host,
            category: 'network',
            severity: 'warning',
            title: `Remote Server Returned HTTP ${response.status}`,
            description: `The endpoint "${server.url}" returned a server error (${response.status} ${response.statusText}).`,
            suggestedFix: 'Check service availability or provider status.',
            canAutoFix: false,
          });
        }
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          issues.push({
            id: `${server.name}-remote-timeout`,
            serverName: server.name,
            host: server.host,
            category: 'network',
            severity: 'error',
            title: 'Endpoint Connection Timed Out',
            description: `Connecting to "${server.url}" timed out after 5 seconds.`,
            suggestedFix: 'Verify internet connectivity and server availability.',
            canAutoFix: false,
          });
        } else {
          issues.push({
            id: `${server.name}-network-unreachable`,
            serverName: server.name,
            host: server.host,
            category: 'network',
            severity: 'error',
            title: 'Remote Endpoint Unreachable',
            description: fetchErr.message || 'Failed to establish connection to endpoint.',
            suggestedFix: 'Check DNS, firewall, or URL correctness.',
            canAutoFix: false,
          });
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Invalid URL handled in schema check
    }
  }
}

export const diagnosticEngine = new DiagnosticEngine();
