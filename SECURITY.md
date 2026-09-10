# Security Policy

## Supported Versions

We prioritize the security and stability of **MCPmg**. The table below indicates which versions currently receive security patches and updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within **MCPmg**, please do **NOT** open a public GitHub issue. Public issues disclose potential vulnerabilities before a patch can be verified and published.

Instead, please report vulnerabilities via one of the following channels:

1. **GitHub Private Vulnerability Reporting**: Use the **"Report a vulnerability"** button under the Security tab of the GitHub repository.
2. **Email Security Contact**: Send a detailed report to `security@mcpmg.dev` (or open an encrypted advisory).

### Information to Include
To help us triage and resolve the issue quickly, please provide:
- A clear description of the vulnerability and its potential impact.
- Steps to reproduce the issue or a minimal proof of concept (PoC).
- Your operating system (Windows, macOS, Linux), Node.js version, and MCPmg version (`mcpmg --version`).
- Any relevant logs, stack traces, or configuration scenarios (ensuring any private API keys or tokens are redacted).

### Response Timeline & SLA
- **Initial Acknowledgment**: Within **48 hours**.
- **Assessment & Triage**: Within **5 business days**.
- **Patch & Advisory Release**: Coordinated with the reporter before public disclosure.

---

## Sensitive Data & Credential Safeguards

MCPmg interacts with Model Context Protocol configuration files across multiple AI clients (Claude Desktop, Antigravity, Cursor, etc.), which frequently contain sensitive API keys, database connection URIs, and authentication tokens.

### Core Security Guarantees
1. **Local-First & Zero Telemetry**: MCPmg does not collect, track, or transmit your host configurations, environment variables, or tokens to any external server. All reads, audits, probes, and edits occur strictly on your local machine.
2. **Automated Snapshot Backups**: Before any configuration file is altered (via `add`, `remove`, `edit`, or `fix`), MCPmg creates a timestamped snapshot in `~/.mcpmg/backups/`.
3. **Explicit Attention Notices**: Any mutating or destructive action renders a high-visibility attention box displaying the target file, action consequences, and backup path, requiring explicit user confirmation (`y/N`).
4. **Redacted Error Logs**: During diagnostic checks (`mcpmg doctor`), API keys and authorization tokens are masked in command previews to prevent accidental screen capture exposure.
