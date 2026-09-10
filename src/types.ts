export type HostId = 'claude' | 'antigravity' | 'cursor' | 'cline' | 'claudecode' | 'custom';

export type ServerTransport = 'stdio' | 'sse' | 'http';

export interface HostInfo {
  id: HostId;
  name: string;
  configPath: string;
  exists: boolean;
  format: 'claude_standard' | 'gemini_settings' | 'simple_mcp';
}

export interface MCPServerConfig {
  name: string;
  host: HostId;
  hostName: string;
  configPath: string;
  transport: ServerTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  disabled?: boolean;
  raw?: any;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCategory = 'auth' | 'path' | 'syntax' | 'network' | 'dependency' | 'process';

export interface DiagnosticIssue {
  id: string;
  serverName: string;
  host: HostId;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  suggestedFix: string;
  canAutoFix: boolean;
  autoFixType?: 'auth_token' | 'windows_path' | 'schema_repair' | 'install_package' | 'url_fix';
  metadata?: Record<string, any>;
}

export interface TestResult {
  success: boolean;
  latencyMs: number;
  serverInfo?: {
    name?: string;
    version?: string;
  };
  toolsCount: number;
  resourcesCount: number;
  promptsCount: number;
  tools?: Array<{ name: string; description?: string }>;
  error?: string;
  stderr?: string;
}

export interface ServerHealthStatus {
  name: string;
  host: HostId;
  hostName: string;
  transport: ServerTransport;
  target: string;
  status: 'healthy' | 'warning' | 'error' | 'untested';
  latencyMs?: number;
  toolsCount?: number;
  lastChecked?: Date;
  lastError?: string;
}

export interface PresetServer {
  id: string;
  name: string;
  description: string;
  transport: ServerTransport;
  command?: string;
  args?: string[];
  envRequirements?: Array<{
    key: string;
    description: string;
    required: boolean;
    default?: string;
  }>;
  urlTemplate?: string;
}
