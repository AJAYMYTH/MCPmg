<div align="center">

```
  ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ 
  ████╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ 
  ██╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗
  ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║
  ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝
  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ 
```

### Model Context Protocol Multi-Host Manager, Diagnostic Doctor & Live Health Monitor

[![CI](https://github.com/javalsavaliya/mcpmg/actions/workflows/ci.yml/badge.svg)](https://github.com/javalsavaliya/mcpmg/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/javalsavaliya/mcpmg?color=blue&logo=github)](https://github.com/javalsavaliya/mcpmg/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

**MCPmg** is a unified, global CLI and full-screen Terminal UI (TUI) tool for managing, monitoring, diagnosing, and auto-repairing [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers across all major AI hosts—including **Claude Desktop**, **Antigravity / Gemini**, **Cursor**, **VS Code (Cline / Roo-Code)**, **Claude Code CLI**, and local project workspaces.

Built with **TypeScript**, **Node.js**, **TermUI**, **Ink**, and the official **`@modelcontextprotocol/sdk`**.

---

## Key Features

- **Multi-Host Discovery**: Automatically detects installed AI clients and parses their configuration files without breaking custom client settings.
- **Full-Screen Interactive TUI (`mcpmg tui`)**: Dual-pane dashboard powered by Ink & React for terminals. Browse servers, inspect configs, trigger targeted doctor audits, deploy server presets, and view snapshot history.
- **Interactive Live Monitor (`mcpmg monitor`)**: Real-time health polling with arrow-key navigation (`[↑/↓]`), on-demand server probe (`[Space/Enter]`), inline doctor diagnosis (`[d]`), and zero-flicker alternate screen buffers (`\x1b[?1049h`).
- **Responsive Table Engine**: Mathematically boundary-enforced CLI tables that never overflow, wrap, or break borders, strictly optimized for 80-column and split-window terminals.
- **Deep Diagnostic Doctor (`mcpmg doctor`)**: Audits servers for missing auth tokens, expired credentials, Windows binary resolution (`npx` vs `npx.cmd`), JSON schema violations, and runtime crash logs.
- **Interactive Auto-Fixer (`mcpmg fix`)**: One-command interactive repair wizard that prompts for missing tokens, repairs executable extensions, and verifies connectivity.
- **Safeguards & Attention Notices**: Displays high-visibility attention notices with exact action impacts and requires explicit confirmation before any file modification.
- **Automatic Configuration Snapshots (`mcpmg backup`)**: Timestamped backups are preserved in `~/.mcpmg/backups/` before any mutation, with instant rollback support via `mcpmg backup restore`.
- **Cross-Host Sync (`mcpmg sync`)**: Clone and migrate server configurations between AI hosts in a single command.
- **Zero Emojis & Clean Monospace Aesthetic**: Clean, professional UI using glyphs from `sebastiencs/icons-in-terminal` and universal geometric unicode markers.

---

## Supported AI Hosts

| Host | Supported Platforms | Default Configuration Path |
|---|---|---|
| **Claude Desktop** | macOS, Windows | `%APPDATA%\Claude\claude_desktop_config.json`<br>`~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Antigravity / Gemini** | All platforms | `~/.gemini/antigravity/mcp_config.json`<br>`~/.gemini/settings.json` |
| **Cursor** | All platforms | `~/.cursor/mcp.json` |
| **VS Code (Cline / Roo)** | All platforms | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` |
| **Claude Code CLI** | All platforms | `~/.claude.json` |
| **Local Workspace** | All platforms | `./.mcp.json` |

---

## Installation

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Install via npm
```bash
npm install -g mcpmg
```

### Install from Source
```bash
git clone https://github.com/javalsavaliya/mcpmg.git
cd mcpmg
npm install
npm run build
npm link
```

Verify installation:
```bash
mcpmg --version
# Output: 1.0.0
```

---

## Quick Start

```bash
# 1. List all servers configured across all AI hosts
mcpmg list

# 2. Launch the interactive full-screen dashboard
mcpmg tui

# 3. Launch the real-time live status monitor
mcpmg monitor

# 4. Probe connectivity and inspect exposed tools
mcpmg test

# 5. Run a comprehensive diagnostic health check
mcpmg doctor

# 6. Auto-repair detected issues
mcpmg fix
```

---

## Command Reference

### `mcpmg list`
Display a responsive grid of all configured MCP servers across detected AI hosts.
```bash
mcpmg list
mcpmg list --host claude       # Filter to Claude Desktop
mcpmg list --host antigravity  # Filter to Antigravity
mcpmg list --host cursor       # Filter to Cursor
```

### `mcpmg tui`
Launch the full-screen terminal dashboard powered by TermUI.
```bash
mcpmg tui
```
**Keyboard Navigation in TUI**:
| Key | Action |
|---|---|
| `[1]` | Switch to **Servers** tab |
| `[2]` | Switch to **Doctor** tab |
| `[3]` | Switch to **Presets** tab |
| `[4]` | Switch to **Backups** tab |
| `[↑ / ↓]` or `[k / j]` | Navigate servers / diagnostic checklist / presets |
| `[Space]` | Toggle server enable / disable |
| `[t]` | Probe connection latency and fetch tools |
| `[d]` | Jump to Doctor diagnosis for selected server |
| `[r]` | Re-run diagnostic audit |
| `[Esc]` or `[q]` | Exit TUI and restore terminal buffer |

### `mcpmg monitor`
Launch the interactive real-time status monitor.
```bash
mcpmg monitor
mcpmg monitor --interval 3     # Poll every 3 seconds (default: 5s)
mcpmg monitor --host claude    # Monitor only Claude Desktop servers
```
**Keyboard Navigation in Monitor**:
| Key | Action |
|---|---|
| `[↑ / ↓]` or `[k / j]` | Navigate rows (highlighted with `▶`) |
| `[Space]` or `[Enter]` | Probe highlighted server immediately |
| `[d]` | Run inline Doctor diagnosis on selected server |
| `[Esc]` or `[q]` | Exit monitor and restore terminal buffer |

### `mcpmg test [name]`
Perform protocol handshakes, calculate round-trip latency, and list exposed tools, resources, and prompts.
```bash
mcpmg test                     # Test all configured servers
mcpmg test taskair             # Test specific server by name
mcpmg test --host cursor       # Test all servers on Cursor
```

### `mcpmg doctor [name]`
Deep diagnostic audit detecting auth failures, Windows executable path issues, JSON formatting flaws, and process crashes.
```bash
mcpmg doctor                   # Audit all servers
mcpmg doctor supabase          # Audit specific server
```

### `mcpmg fix [name]`
Interactive repair wizard that prompts for missing tokens, updates command paths, and re-tests connectivity.
```bash
mcpmg fix                      # Audit and interactively repair all detected issues
mcpmg fix supabase             # Repair a specific server
```

### `mcpmg add [name]`
Add a new MCP server configuration via interactive wizard or command flags.
```bash
mcpmg add                      # Interactive prompt wizard
mcpmg add memory --preset memory --host claude
mcpmg add my-fs --preset filesystem --host cursor
```

### `mcpmg remove <name>`
Safely remove an MCP server configuration. Displays Attention Notice and creates an automatic snapshot before removing.
```bash
mcpmg remove my-server
mcpmg remove my-server --host antigravity
```

### `mcpmg edit <name>`
Interactively update environment variables, arguments, command targets, or toggle enabled/disabled status.
```bash
mcpmg edit taskair
```

### `mcpmg sync <name>`
Clone and synchronize a server configuration from one AI host to another.
```bash
mcpmg sync codebase-memory-mcp --from antigravity --to cursor
```

### `mcpmg backup`
View configuration snapshots and restore previous backups.
```bash
mcpmg backup list              # View all saved snapshots with dates and sizes
mcpmg backup restore           # Interactively select and restore a backup snapshot
```

---

## Responsive Table Engine

MCPmg features an adaptive table layout engine (`src/utils/tableHelper.ts`) designed to eliminate broken box-drawing borders and edge-wrapping across all terminal widths:

- **Wide Layout (`>= 105 cols`)**: Full 7-column layout with dynamic details expansion.
- **Medium Layout (`76–104 cols`)**: 6-column layout mathematically capped at **78 columns**, ensuring a clean 2-column margin on standard 80-column terminals. Details are cleanly presented in the dedicated Inspector card below.
- **Compact Layout (`55–75 cols`)**: 4-column layout for narrow split panes.
- **Narrow Layout (`< 55 cols`)**: Individual bordered card layout.

```
┌────────────────────┬────────────────┬────────┬────────────────────┬────────┐
│ Server             │ Host           │ Type   │ Target             │ Status │
├────────────────────┼────────────────┼────────┼────────────────────┼────────┤
│ taskair            │ Claude Desktop │ STDIO  │ npx.cmd -y taskai… │ ● On   │
├────────────────────┼────────────────┼────────┼────────────────────┼────────┤
│ supabase           │ Antigravity /… │ SSE    │ https://mcp.supab… │ ● On   │
├────────────────────┼────────────────┼────────┼────────────────────┼────────┤
│ codebase-memory-m… │ Antigravity /… │ STDIO  │ C:/Users/javal/Ap… │ ● On   │
└────────────────────┴────────────────┴────────┴────────────────────┴────────┘
```

---

## Architecture

```
src/
├── cli.ts               # Commander CLI configuration & command dispatch
├── types.ts             # Domain interfaces (servers, hosts, diagnostics)
├── hosts/
│   ├── hostManager.ts   # Multi-host registry & configuration coordinator
│   ├── baseHost.ts      # Abstract base host adapter
│   ├── claudeDesktop.ts # Claude Desktop config adapter
│   ├── antigravity.ts   # Antigravity / Gemini config adapter
│   ├── cursor.ts        # Cursor config adapter
│   ├── cline.ts         # VS Code Cline / Roo-Code config adapter
│   ├── claudeCode.ts    # Claude Code CLI config adapter
│   ├── workspace.ts     # Local .mcp.json workspace adapter
│   └── backup.ts        # Snapshot manager & rollback handler
├── client/
│   └── mcpRunner.ts     # Protocol client runner (stdio & sse transports)
├── doctor/
│   └── diagnostics.ts   # Deep diagnostic health audit engine
├── fixers/
│   └── fixerRegistry.ts # Auto-repair handlers & prompt resolvers
├── presets/
│   └── popular.ts       # Preset template catalog
├── ui/
│   ├── banner.ts        # Monochrome ASCII logo banner
│   ├── icons.ts         # Terminal icons (icons-in-terminal)
│   └── tui/
│       ├── App.tsx      # TermUI / Ink full-screen application
│       └── views/       # Servers, Doctor, Presets, Backups tabs
├── utils/
│   ├── tableHelper.ts   # ANSI-safe cell truncation & table width math
│   └── attention.ts     # Attention notices & confirmation prompts
└── commands/            # CLI command implementations
```

---

## Contributing

We welcome contributions! Please review our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

```bash
# Run tests
npm test

# Check types
npm run typecheck
```

---

## Security

Security is paramount. MCPmg operates strictly locally, collects zero telemetry, and creates automatic backups before modifying any configuration. Please review our [Security Policy](SECURITY.md) to report vulnerabilities.

---

## License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 MCPmg Contributors.
