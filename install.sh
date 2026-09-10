#!/usr/bin/env bash
# MCPmg Installer for macOS & Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/AJAYMYTH/MCPmg/main/install.sh | bash

set -euo pipefail

REPO="AJAYMYTH/MCPmg"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "  ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ "
echo "  ████╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ "
echo "  ██╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗"
echo "  ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║"
echo "  ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝"
echo "  ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ "
echo -e "${GRAY}   Model Context Protocol Multi-Host Manager${NC}\n"

# 1. Detect Operating System
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$OS" in
  darwin*)  PLATFORM="macos" ;;
  linux*)   PLATFORM="linux" ;;
  *)        echo -e "${RED}Error: Unsupported operating system: $OS${NC}" >&2; exit 1 ;;
esac

# 2. Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)   ARCH_NAME="x64" ;;
  arm64|aarch64)  ARCH_NAME="arm64" ;;
  *)              echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}" >&2; exit 1 ;;
esac

if [ "$PLATFORM" = "macos" ] && [ "$ARCH_NAME" = "x64" ]; then
  echo -e "${YELLOW}Notice: Native binaries for macOS are built for Apple Silicon (arm64).${NC}"
  echo -e "${YELLOW}For Intel Macs, please install via npm: npm install -g @ajay.j_dev/mcpmg${NC}"
  if command -v npm >/dev/null 2>&1; then
    echo -e "${GREEN}==> Running: npm install -g @ajay.j_dev/mcpmg...${NC}"
    npm install -g @ajay.j_dev/mcpmg
    echo -e "\n${GREEN}✓ Successfully installed MCPmg via npm${NC}"
    exit 0
  else
    exit 1
  fi
fi

ARCHIVE_NAME="mcpmg-${PLATFORM}-${ARCH_NAME}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ARCHIVE_NAME}"

echo -e "${GREEN}==> Detected system: ${PLATFORM} (${ARCH_NAME})${NC}"
echo -e "${YELLOW}==> Downloading ${ARCHIVE_NAME} from ${DOWNLOAD_URL}...${NC}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/$ARCHIVE_NAME"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_DIR/$ARCHIVE_NAME" "$DOWNLOAD_URL"
else
  echo -e "${RED}Error: curl or wget is required to download MCPmg.${NC}" >&2
  exit 1
fi

echo -e "${GREEN}==> Extracting binary...${NC}"
tar -xzf "$TMP_DIR/$ARCHIVE_NAME" -C "$TMP_DIR"

if [ ! -f "$TMP_DIR/mcpmg" ]; then
  echo -e "${RED}Error: Archive did not contain mcpmg binary.${NC}" >&2
  exit 1
fi

chmod +x "$TMP_DIR/mcpmg"

# 3. Determine Installation Directory
INSTALL_DIR="/usr/local/bin"
USE_SUDO=false

if [ -w "$INSTALL_DIR" ]; then
  TARGET="$INSTALL_DIR/mcpmg"
elif [ "$EUID" -eq 0 ]; then
  TARGET="$INSTALL_DIR/mcpmg"
elif sudo -n true 2>/dev/null; then
  TARGET="$INSTALL_DIR/mcpmg"
  USE_SUDO=true
else
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
  TARGET="$INSTALL_DIR/mcpmg"
fi

echo -e "${YELLOW}==> Installing to ${TARGET}...${NC}"
if [ "$USE_SUDO" = true ]; then
  sudo cp "$TMP_DIR/mcpmg" "$TARGET"
  sudo chmod +x "$TARGET"
else
  cp "$TMP_DIR/mcpmg" "$TARGET"
  chmod +x "$TARGET"
fi

echo -e "\n${GREEN}✓ Successfully installed MCPmg to ${TARGET}${NC}"

# Check if INSTALL_DIR is in PATH
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo -e "${YELLOW}Notice: ${INSTALL_DIR} is not currently in your PATH.${NC}"
    echo -e "${GRAY}Add it to your shell profile (e.g. ~/.bashrc or ~/.zshrc):${NC}"
    echo -e "  export PATH=\"\$PATH:${INSTALL_DIR}\""
    ;;
esac

echo -e "${CYAN}Run 'mcpmg --help' or 'mcpmg tui' to get started!${NC}\n"
