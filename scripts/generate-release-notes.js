import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const repo = 'AJAYMYTH/MCPmg';

// Determine current version and target tag
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const currentVersion = process.env.GITHUB_REF_NAME || `v${pkg.version}`;

// Find previous tag: the newest tag that is not the current version
let previousTag = '';
try {
  const allTags = execSync('git tag --sort=-creatordate', { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  for (const tag of allTags) {
    if (tag !== currentVersion) {
      previousTag = tag;
      break;
    }
  }
} catch {
  previousTag = '';
}

console.log(`Generating release notes for ${currentVersion} (comparing with: ${previousTag || 'initial commit'})...`);

const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
let gitLogOutput = '';
try {
  gitLogOutput = execSync(`git log ${range} --pretty=format:"%H|%h|%s|%an|%cd" --date=short`, {
    cwd: root,
    encoding: 'utf8',
  }).trim();
} catch (err) {
  console.error('Failed to get git log:', err);
  gitLogOutput = '';
}

const lines = gitLogOutput ? gitLogOutput.split('\n') : [];
const categories = {
  features: [],
  fixes: [],
  performance: [],
  ci: [],
  docs: [],
  maintenance: [],
  other: [],
};

for (const line of lines) {
  if (!line.trim()) continue;
  const [fullHash, shortHash, subject, author, date] = line.split('|');
  const commitUrl = `https://github.com/${repo}/commit/${fullHash}`;
  const formattedLine = `* ${subject} ([${shortHash}](${commitUrl})) - @${author}`;

  const lower = subject.toLowerCase();
  if (/^feat(\(.*?\))?:/i.test(subject)) {
    categories.features.push(formattedLine);
  } else if (/^fix(\(.*?\))?:/i.test(subject)) {
    categories.fixes.push(formattedLine);
  } else if (/^perf(\(.*?\))?:/i.test(subject)) {
    categories.performance.push(formattedLine);
  } else if (/^ci(\(.*?\))?:/i.test(subject)) {
    categories.ci.push(formattedLine);
  } else if (/^docs(\(.*?\))?:/i.test(subject)) {
    categories.docs.push(formattedLine);
  } else if (/^chore(\(.*?\))?:/i.test(subject)) {
    categories.maintenance.push(formattedLine);
  } else {
    categories.other.push(formattedLine);
  }
}

let notes = `## 🚀 Release ${currentVersion}\n\n`;

if (categories.features.length > 0) {
  notes += `### 🌟 Features & Enhancements\n`;
  notes += categories.features.join('\n') + '\n\n';
}

if (categories.fixes.length > 0) {
  notes += `### 🐛 Bug Fixes & Stability\n`;
  notes += categories.fixes.join('\n') + '\n\n';
}

if (categories.performance.length > 0) {
  notes += `### ⚡ Performance Improvements\n`;
  notes += categories.performance.join('\n') + '\n\n';
}

if (categories.ci.length > 0) {
  notes += `### 🔄 CI/CD & Release Automation\n`;
  notes += categories.ci.join('\n') + '\n\n';
}

if (categories.docs.length > 0) {
  notes += `### 📚 Documentation\n`;
  notes += categories.docs.join('\n') + '\n\n';
}

if (categories.maintenance.length > 0) {
  notes += `### 🛠️ Maintenance & Refactoring\n`;
  notes += categories.maintenance.join('\n') + '\n\n';
}

if (categories.other.length > 0) {
  notes += `### 📋 Other Changes\n`;
  notes += categories.other.join('\n') + '\n\n';
}

notes += `### 📦 Standalone Binaries & Downloads\n\n`;
notes += `| Platform | Architecture | Download |
|---|---|---|
| **Windows** | x64 | [\`mcpmg.exe\`](https://github.com/${repo}/releases/download/${currentVersion}/mcpmg.exe) / [\`mcpmg-windows-x64.zip\`](https://github.com/${repo}/releases/download/${currentVersion}/mcpmg-windows-x64.zip) |
| **macOS** | Apple Silicon (arm64) | [\`mcpmg-macos-arm64.tar.gz\`](https://github.com/${repo}/releases/download/${currentVersion}/mcpmg-macos-arm64.tar.gz) |
| **Linux** | x64 | [\`mcpmg-linux-x64.tar.gz\`](https://github.com/${repo}/releases/download/${currentVersion}/mcpmg-linux-x64.tar.gz) |
| **Checksums** | SHA256 | [\`SHA256SUMS.txt\`](https://github.com/${repo}/releases/download/${currentVersion}/SHA256SUMS.txt) |\n\n`;

notes += `### 💻 Quick Installation\n\n`;
notes += `**Windows PowerShell:**\n\`\`\`powershell\nirm https://raw.githubusercontent.com/${repo}/main/install.ps1 | iex\n\`\`\`\n\n`;
notes += `**macOS & Linux:**\n\`\`\`bash\ncurl -fsSL https://raw.githubusercontent.com/${repo}/main/install.sh | bash\n\`\`\`\n\n`;
notes += `**Windows Package Manager (Winget):**\n\`\`\`powershell\nwinget install AJAYMYTH.MCPmg\n\`\`\`\n\n`;
notes += `**npm Package:**\n\`\`\`bash\nnpm install -g @ajay.j_dev/mcpmg\n\`\`\`\n\n`;

if (previousTag) {
  notes += `**Full Changelog**: https://github.com/${repo}/compare/${previousTag}...${currentVersion}\n`;
}

// Output to file if argument provided
const outputPath = process.argv[2];
if (outputPath) {
  const resolvedOut = path.resolve(outputPath);
  const outDir = path.dirname(resolvedOut);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(resolvedOut, notes);
  console.log(`Release notes written to ${resolvedOut}`);
} else {
  console.log('\n--- GENERATED RELEASE NOTES ---\n');
  console.log(notes);
}
