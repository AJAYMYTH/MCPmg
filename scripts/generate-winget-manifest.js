import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const publisher = 'AJAYMYTH';
const packageName = 'MCPmg';
const packageIdentifier = `${publisher}.${packageName}`;
const targetDir = path.join(root, 'winget', 'manifests', 'a', publisher, packageName, version);

fs.mkdirSync(targetDir, { recursive: true });

// Check if mcpmg.exe exists to compute real sha256
const exePath = path.join(root, 'dist', 'bin', 'mcpmg.exe');
let sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
if (fs.existsSync(exePath)) {
  const fileBuffer = fs.readFileSync(exePath);
  sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();
  console.log(`Calculated SHA256 for mcpmg.exe: ${sha256}`);
}

const downloadUrl = `https://github.com/${publisher}/${packageName}/releases/download/v${version}/mcpmg.exe`;

// 1. Version Manifest
const versionManifest = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.1.9.0.schema.json
PackageIdentifier: ${packageIdentifier}
PackageVersion: ${version}
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.9.0
`;

// 2. Installer Manifest
const installerManifest = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.1.9.0.schema.json
PackageIdentifier: ${packageIdentifier}
PackageVersion: ${version}
InstallerType: portable
Commands:
  - mcpmg
Installers:
  - Architecture: x64
    InstallerUrl: ${downloadUrl}
    InstallerSha256: ${sha256}
ManifestType: installer
ManifestVersion: 1.9.0
`;

// 3. Locale Manifest
const localeManifest = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.defaultLocale.1.9.0.schema.json
PackageIdentifier: ${packageIdentifier}
PackageVersion: ${version}
PackageLocale: en-US
Publisher: ${publisher}
PublisherUrl: https://github.com/${publisher}
PublisherSupportUrl: https://github.com/${publisher}/${packageName}/issues
PackageName: ${packageName}
PackageUrl: https://github.com/${publisher}/${packageName}
License: MIT
LicenseUrl: https://github.com/${publisher}/${packageName}/blob/main/LICENSE
Copyright: Copyright (c) 2026 ${publisher}
ShortDescription: Unified CLI & TUI tool for monitoring, managing, diagnosing, and auto-fixing MCP servers across all AI hosts.
Description: |-
  MCPmg is a unified command-line and terminal UI manager for Model Context Protocol (MCP) servers.
  It automatically detects configurations across Claude Desktop, Antigravity/Gemini, Cursor, Cline,
  and Claude Code CLI, providing live monitoring, connection diagnostics, and automated repairs.
Moniker: mcpmg
Tags:
  - mcp
  - model-context-protocol
  - ai
  - claude
  - cursor
  - antigravity
  - devtools
  - tui
  - cli
ManifestType: defaultLocale
ManifestVersion: 1.9.0
`;

fs.writeFileSync(path.join(targetDir, `${packageIdentifier}.yaml`), versionManifest);
fs.writeFileSync(path.join(targetDir, `${packageIdentifier}.installer.yaml`), installerManifest);
fs.writeFileSync(path.join(targetDir, `${packageIdentifier}.locale.en-US.yaml`), localeManifest);

console.log(`\nSuccessfully generated Winget manifests in: ${targetDir}`);
