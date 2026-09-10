import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { MCPServerConfig, TestResult } from '../types.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Finds if an executable exists in the system PATH
 */
export function findExecutableInPath(command: string): string | null {
  try {
    if (path.isAbsolute(command) && fs.existsSync(command)) {
      return command;
    }

    if (process.platform === 'win32') {
      const output = execSync(`where.exe "${command}"`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      const firstLine = output.trim().split(/\r?\n/)[0];
      return firstLine && fs.existsSync(firstLine) ? firstLine : null;
    } else {
      const output = execSync(`which "${command}"`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      const firstLine = output.trim().split('\n')[0];
      return firstLine && fs.existsSync(firstLine) ? firstLine : null;
    }
  } catch {
    return null;
  }
}

/**
 * Resolves binary on Windows if needed (e.g. npx -> npx.cmd)
 */
export function resolveExecutable(command: string): string {
  if (process.platform !== 'win32') {
    return command;
  }

  const commonCmds = ['npx', 'npm', 'yarn', 'pnpm', 'uvx'];
  const lower = command.toLowerCase().trim();

  if (commonCmds.includes(lower)) {
    return `${lower}.cmd`;
  }

  // If path has no extension and is not an absolute path with extension
  if (!path.extname(lower)) {
    const cmdResolved = findExecutableInPath(`${command}.cmd`);
    if (cmdResolved) return cmdResolved;
    const exeResolved = findExecutableInPath(`${command}.exe`);
    if (exeResolved) return exeResolved;
  }

  return command;
}

export class MCPRunner {
  /**
   * Probes an MCP server with timeout and returns comprehensive health/diagnostic data
   */
  public async probeServer(server: MCPServerConfig, timeoutMs: number = 8000): Promise<TestResult> {
    const startTime = Date.now();
    let client: Client | null = null;
    let transport: any = null;
    let stderrOutput = '';

    const timeoutPromise = new Promise<TestResult>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref();
    });

    const executionPromise = (async (): Promise<TestResult> => {
      try {
        client = new Client(
          {
            name: 'mcpmg-probe',
            version: '1.0.0',
          },
          {
            capabilities: {
              roots: {},
              sampling: {},
            },
          }
        );

        if (server.transport === 'sse' || server.url) {
          if (!server.url) {
            throw new Error('SSE transport requires a valid URL');
          }
          const targetUrl = new URL(server.url);
          transport = new SSEClientTransport(targetUrl);
        } else {
          if (!server.command) {
            throw new Error('stdio transport requires a command');
          }

          const resolvedCmd = resolveExecutable(server.command);

          // Merge current process environment with server config environment
          const mergedEnv: Record<string, string> = {
            ...process.env as Record<string, string>,
            ...(server.env || {}),
          };

          transport = new StdioClientTransport({
            command: resolvedCmd,
            args: server.args || [],
            env: mergedEnv,
            stderr: 'pipe',
          });

          // Capture stderr output for diagnostic analysis
          if (transport.stderr) {
            transport.stderr.on('data', (chunk: Buffer | string) => {
              stderrOutput += chunk.toString();
            });
          }
        }

        // Connect with MCP protocol
        await client.connect(transport);
        const latencyMs = Date.now() - startTime;

        // Query capabilities
        let toolsCount = 0;
        let toolsList: Array<{ name: string; description?: string }> = [];
        try {
          const toolsResult = await client.listTools();
          toolsList = toolsResult.tools.map((t) => ({ name: t.name, description: t.description }));
          toolsCount = toolsList.length;
        } catch {
          // Some servers might not implement listTools
        }

        let resourcesCount = 0;
        try {
          const resResult = await client.listResources();
          resourcesCount = resResult.resources.length;
        } catch {
          // Optional capability
        }

        let promptsCount = 0;
        try {
          const promptsResult = await client.listPrompts();
          promptsCount = promptsResult.prompts.length;
        } catch {
          // Optional capability
        }

        const serverInfo = client.getServerVersion();

        return {
          success: true,
          latencyMs,
          serverInfo,
          toolsCount,
          resourcesCount,
          promptsCount,
          tools: toolsList,
          stderr: stderrOutput.trim(),
        };
      } catch (err: any) {
        return {
          success: false,
          latencyMs: Date.now() - startTime,
          toolsCount: 0,
          resourcesCount: 0,
          promptsCount: 0,
          error: err?.message || String(err),
          stderr: stderrOutput.trim(),
        };
      } finally {
        try {
          if (client) {
            await client.close();
          }
        } catch {
          // Silent cleanup
        }
      }
    })();

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        toolsCount: 0,
        resourcesCount: 0,
        promptsCount: 0,
        error: err?.message || 'Connection timed out',
        stderr: stderrOutput.trim(),
      };
    }
  }
}

export const mcpRunner = new MCPRunner();
