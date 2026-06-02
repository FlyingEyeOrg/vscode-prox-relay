#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo "  Pack vscode-proxy-relay VSIX"
echo "========================================"
echo ""

# Ensure output dir exists
mkdir -p dist

# Ensure deps installed
if [ ! -d "node_modules" ]; then
  echo "[1/2] Installing dependencies..."
  npm install
else
  echo "[1/2] Dependencies ready"
fi

echo "[2/2] Packaging extension..."
npx vsce package --out dist/

echo ""
echo "✓ Done! Output:"
ls -1 dist/*.vsix 2>/dev/null || echo "  (no .vsix found)"
