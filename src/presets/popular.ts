import { PresetServer } from '../types.js';

export const POPULAR_PRESETS: PresetServer[] = [
  {
    id: 'memory',
    name: 'Memory (Knowledge Graph)',
    description: 'Persistent knowledge graph memory server by Model Context Protocol',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  {
    id: 'filesystem',
    name: 'Local Filesystem',
    description: 'Secure local filesystem access for allowed directories',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, pull requests, and files',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envRequirements: [
      {
        key: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        description: 'GitHub Personal Access Token (classic or fine-grained with repo permissions)',
        required: true,
      },
    ],
  },
  {
    id: 'supabase',
    name: 'Supabase (Remote SSE)',
    description: 'Interact with Supabase databases, migrations, and Edge Functions',
    transport: 'sse',
    urlTemplate: 'https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL Database',
    description: 'Read and inspect PostgreSQL tables, schemas, and queries',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:pass@localhost:5432/dbname'],
  },
  {
    id: 'fetch',
    name: 'Web Fetch',
    description: 'Fetch and extract clean markdown/text from web pages',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web and local search capabilities using the Brave Search API',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    envRequirements: [
      {
        key: 'BRAVE_API_KEY',
        description: 'Brave Search API Key from brave.com/search/api/',
        required: true,
      },
    ],
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer Browser Automation',
    description: 'Browser automation, screenshot taking, and web interactions',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
  },
  {
    id: 'sqlite',
    name: 'SQLite Database',
    description: 'Inspect and query local SQLite database files',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--file', './database.db'],
  },
  {
    id: 'taskair',
    name: 'Taskair Project & Task Manager',
    description: 'Intelligent task, sprint, and workflow manager for AI agents',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'taskair-mcp'],
    envRequirements: [
      {
        key: 'TASKAIR_TOKEN',
        description: 'Taskair user authentication token',
        required: true,
      },
    ],
  },
];
