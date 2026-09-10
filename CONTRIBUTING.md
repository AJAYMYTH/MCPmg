# Contributing to MCPmg

Thank you for your interest in contributing to **MCPmg**! We welcome contributions from developers of all backgrounds. This guide will help you get set up and explain how to add new features, host adapters, diagnostic rules, and presets.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to `conduct@mcpmg.dev`.

---

## Development Setup

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**

### 2. Clone & Install
```bash
# Clone your fork
git clone https://github.com/<your-username>/mcpmg.git
cd mcpmg

# Install dependencies
npm install
```

### 3. Build & Watch
```bash
# Full build (compiles TypeScript to dist/)
npm run build

# Watch mode for interactive development
npm run watch

# Type-check without building
npm run typecheck

# Run unit test suite
npm test
```

### 4. Link Globally for Local Testing
To test the `mcpmg` CLI globally on your system while developing:
```bash
npm link
```
Now changes compiled to `dist/` will immediately be available when you execute `mcpmg` in any terminal!

---

## Project Architecture

```
src/
├── cli.ts                   # Commander CLI entrypoint & flag parsing
├── types.ts                 # Central domain interfaces & types
├── hosts/
│   ├── hostManager.ts       # Central multi-host discovery registry
│   ├── baseHost.ts          # Abstract base host adapter
│   ├── claudeDesktop.ts     # Claude Desktop config reader/writer
│   ├── antigravity.ts       # Antigravity / Gemini config reader/writer
│   ├── cursor.ts            # Cursor config reader/writer
│   ├── cline.ts             # VS Code Cline / Roo config reader/writer
│   ├── claudeCode.ts        # Claude Code CLI config reader/writer
│   ├── workspace.ts         # Local .mcp.json workspace reader/writer
│   └── backup.ts            # Snapshot manager & rollback handler
├── client/
│   └── mcpRunner.ts         # MCP protocol client (stdio & sse transports)
├── doctor/
│   └── diagnostics.ts       # Deep diagnostic rule engine
├── fixers/
│   └── fixerRegistry.ts     # Interactive auto-fixer handlers
├── presets/
│   └── popular.ts           # Curated MCP server template catalog
├── ui/
│   ├── banner.ts            # ASCII logo & branding banner
│   ├── icons.ts             # Unicode glyphs from icons-in-terminal
│   └── tui/
│       ├── App.tsx          # Full-screen TermUI / Ink dashboard
│       └── views/           # Servers, Doctor, Presets, Backups tabs
├── utils/
│   ├── tableHelper.ts       # ANSI-safe cell truncation & table width math
│   └── attention.ts         # Attention notices & confirmation prompts
└── commands/
    ├── list.ts              # mcpmg list
    ├── test.ts              # mcpmg test
    ├── monitor.ts           # mcpmg monitor (interactive CLI dashboard)
    ├── doctor.ts            # mcpmg doctor
    ├── fix.ts               # mcpmg fix
    ├── add.ts               # mcpmg add
    ├── remove.ts            # mcpmg remove
    ├── edit.ts              # mcpmg edit
    ├── sync.ts              # mcpmg sync
    ├── tui.ts               # mcpmg tui
    └── backup.ts            # mcpmg backup
```

---

## Coding Standards & Guidelines

### 1. TypeScript Strictness
- Strict mode is enabled (`"strict": true`). Avoid `any` types; prefer explicit types defined in `src/types.ts`.
- Ensure all code passes `npm run typecheck` and `npm test` before committing.

### 2. Visual Design & Zero Emojis Rule
- **No Emojis**: We maintain a crisp, professional, monochrome/minimalist aesthetic. Do **not** use emojis in output, tables, or logs.
- **Icons**: Status badges and symbols must use unicode glyphs from `sebastiencs/icons-in-terminal` (defined in `src/ui/icons.ts`) or universal single-cell unicode geometric shapes (`●`, `▲`, `✖`, `○`, `▶`).

### 3. Responsive Table Boundaries
- All CLI table output must respect `process.stdout.columns` and use `fitCell` / `tableHelper.ts`.
- The total table width (including column borders) **must never exceed `termWidth - 2`**. This prevents terminal edge-wrapping, double-spaced rows, and broken box-drawing borders.

### 4. Terminal Buffer Safety
- Interactive full-screen tools (`mcpmg tui` and `mcpmg monitor`) must utilize the Alternate Screen Buffer (`\x1b[?1049h` on enter and `\x1b[?1049l` on exit) so the user's terminal scroll history remains clean.

---

## How-To Guides

### Adding a New AI Host Adapter
1. Create `src/hosts/<newHostName>.ts` extending `BaseHostAdapter`.
2. Implement:
   - `id`: unique host identifier (e.g. `'windsurf'`).
   - `name`: human-readable host name.
   - `getConfigPath()`: returns platform-specific configuration path.
   - `readConfig()`: parses host-specific JSON into normalized `MCPServerConfig[]`.
   - `writeConfig()`: writes changes back while preserving custom host properties.
3. Register the new adapter in `src/hosts/hostManager.ts`.
4. Add host definition to `HostId` in `src/types.ts`.

### Adding a Diagnostic Rule & Auto-Fixer
1. Open `src/doctor/diagnostics.ts`.
2. Add your check into `diagnosticEngine.diagnose()`:
   - Identify issues (severity: `'error'` | `'warning'`).
   - Provide clear `title`, `description`, `suggestedFix`, and set `canAutoFix: true` if an automated remedy exists.
3. If auto-fixable, register the fix handler in `src/fixers/fixerRegistry.ts`.

### Adding a Preset MCP Server
1. Open `src/presets/popular.ts`.
2. Append a new entry to `POPULAR_PRESETS`:
   ```ts
   {
     id: 'my-mcp',
     name: 'My Service MCP',
     description: 'Short description of what the MCP server provides',
     transport: 'stdio',
     command: 'npx',
     args: ['-y', '@scope/mcp-server-my-service'],
     envRequirements: [
       { key: 'SERVICE_API_KEY', description: 'API Key for My Service', required: true }
     ]
   }
   ```
3. Run `npm test` to verify preset schema validation.

---

## Commit & Pull Request Guidelines

### Commit Messages (Conventional Commits)
Please follow the [Conventional Commits](https://www.conventionalcommits.org/) convention:
- `feat: add Windsurf IDE host adapter`
- `fix: resolve column overflow in 70-col terminals`
- `docs: update TUI keyboard navigation reference`
- `test: add unit test for fixer registry`
- `refactor: optimize monitor probe interval logic`

### PR Checklist
Before submitting a pull request, please verify:
- [ ] Code compiles without errors: `npm run build`
- [ ] Type checks pass: `npm run typecheck`
- [ ] Unit tests pass: `npm test`
- [ ] No emojis were added (use `src/ui/icons.ts` or geometric unicode)
- [ ] Tables respect responsive boundaries and do not wrap in 80-column terminals
- [ ] Commits follow Conventional Commits formatting
