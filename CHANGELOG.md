# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-09-10

### 🌟 Features & Enhancements
- **Multi-Platform Standalone Binaries**: Pre-compiled, single-executable applications for:
  - Windows x64: `mcpmg.exe` & `mcpmg-windows-x64.zip`
  - macOS Apple Silicon (arm64): `mcpmg-macos-arm64.tar.gz`
  - Linux x64: `mcpmg-linux-x64.tar.gz`
- **Windows PowerShell One-Liner Installer (`install.ps1`)**: Downloads the latest `mcpmg.exe` binary and configures user `PATH` automatically.
- **macOS & Linux One-Liner Installer (`install.sh`)**: Automatically detects OS and CPU architecture, extracts the binary to `/usr/local/bin` (or `~/.local/bin`), and sets executable permissions.
- **Windows Package Manager (Winget)**: Official WinGet v1.9.0 multi-file manifests in `winget/manifests/a/AJAYMYTH/MCPmg/1.0.1/` and automated PR submission via `vedantmgoyal9/winget-releaser@v2`.
- **Winget Manifest Generator (`scripts/generate-winget-manifest.js`)**: Computes SHA256 checksum of the Windows binary and outputs compliant manifests.
- **Automated Release Notes Generator (`scripts/generate-release-notes.js`)**: Categorizes git commits into structured release notes with links to commits and release assets.

### 🐛 Bug Fixes & Stability
- Fixed Node SEA banner `createRequire` path resolution on Windows by binding to `process.execPath`.
- Suppressed Node experimental SEA warning in binary output using `disableExperimentalSEAWarning: true`.
- Added macOS `codesign --remove-signature` and ad-hoc re-signing `codesign --sign -` for Gatekeeper compatibility.
- Excluded heavy binary artifacts from npm package files list in `package.json`.
- Handled job-level environment variables for secrets in GitHub Actions release workflows.

### ⚡ Performance Improvements
- Streamlined GitHub Actions release matrix to `windows-x64`, `macos-arm64`, and `linux-x64` for sub-minute builds.

---

## [1.0.0] - 2026-09-10

### 🌟 Features & Enhancements
- **Initial Release of MCPmg**: Unified CLI & full-screen Terminal UI for managing Model Context Protocol (MCP) servers across all AI hosts.
- **Multi-Host Auto-Discovery**: Automatic configuration parsing for Claude Desktop, Antigravity/Gemini, Cursor, Cline/Roo-Code, and Claude Code CLI.
- **Full-Screen Interactive Dashboard (`mcpmg tui`)**: Dual-pane animated TUI powered by Ink & React.
- **Live Health Monitor (`mcpmg monitor`)**: Real-time polling with alternate screen buffer (`\x1b[?1049h`), arrow-key navigation, space-bar probe, and inline doctor diagnostics.
- **Mathematical Responsive Table Engine**: Boundary-enforced CLI tables that never overflow or break borders.
- **Deep Diagnostic Doctor (`mcpmg doctor`)**: Comprehensive health audit for credentials, environment variables, Windows `.cmd` paths, and schemas.
- **Interactive Auto-Fixer (`mcpmg fix`)**: One-command interactive repair wizard with attention notices and confirmation prompts.
- **Configuration Snapshots (`mcpmg backup`)**: Timestamped backups before every mutation with instant restore.
- **Cross-Host Sync (`mcpmg sync`)**: Clone and migrate server configurations between hosts.
