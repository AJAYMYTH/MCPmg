# MCPmg Windows Installer (PowerShell)
# Usage: irm https://raw.githubusercontent.com/AJAYMYTH/MCPmg/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$repo = "AJAYMYTH/MCPmg"
$binName = "mcpmg.exe"
$installDir = Join-Path $HOME ".mcpmg\bin"
$targetPath = Join-Path $installDir $binName

Write-Host ""
Write-Host "  ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ " -ForegroundColor Cyan
Write-Host "  ████╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ " -ForegroundColor Cyan
Write-Host "  ██╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗" -ForegroundColor Cyan
Write-Host "  ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║" -ForegroundColor Cyan
Write-Host "  ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝" -ForegroundColor Cyan
Write-Host "  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ " -ForegroundColor Cyan
Write-Host "   Model Context Protocol Multi-Host Manager" -ForegroundColor DarkGray
Write-Host ""

Write-Host "==> Installing MCPmg for Windows (x64)..." -ForegroundColor Green

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

$downloadUrl = "https://github.com/$repo/releases/latest/download/$binName"

Write-Host "==> Downloading latest release from $downloadUrl..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath -UseBasicParsing
} catch {
    Write-Error "Failed to download $binName. Please check your internet connection or GitHub access."
    exit 1
}

# Verify binary
if (-not (Test-Path $targetPath)) {
    Write-Error "Installation failed: $targetPath was not created."
    exit 1
}

# Add to user PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($userPath -split ';' -notcontains $installDir) {
    Write-Host "==> Adding $installDir to User PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", [EnvironmentVariableTarget]::User)
    $env:Path = "$env:Path;$installDir"
}

Write-Host ""
Write-Host "✓ Successfully installed MCPmg to $targetPath" -ForegroundColor Green
Write-Host "✓ Added to PATH" -ForegroundColor Green
Write-Host ""
Write-Host "Run 'mcpmg --help' or 'mcpmg tui' to get started!" -ForegroundColor Cyan
Write-Host "(Note: You may need to restart your terminal for PATH changes to take effect)" -ForegroundColor DarkGray
Write-Host ""
