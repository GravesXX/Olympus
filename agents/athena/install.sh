#!/bin/bash
set -e

ATHENA_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_WORKSPACE="${HOME}/.openclaw/workspace"
OPENCLAW_EXTENSIONS="${HOME}/.openclaw/extensions"
ATHENA_DATA="${HOME}/.athena"

echo "=== Athena Installer ==="

if ! command -v openclaw &> /dev/null; then
  echo "Error: OpenClaw is not installed. Run: curl -fsSL https://get.openclaw.ai | bash"
  exit 1
fi

mkdir -p "$ATHENA_DATA"
echo "Created data directory: $ATHENA_DATA"

mkdir -p "$OPENCLAW_WORKSPACE"
mkdir -p "$OPENCLAW_EXTENSIONS/athena"
cd "$ATHENA_DIR/plugin"
npm install
cp -r src/ "$OPENCLAW_EXTENSIONS/athena/src/"
cp openclaw.plugin.json "$OPENCLAW_EXTENSIONS/athena/"
cp package.json "$OPENCLAW_EXTENSIONS/athena/"
cp tsconfig.json "$OPENCLAW_EXTENSIONS/athena/"
cp -r node_modules/ "$OPENCLAW_EXTENSIONS/athena/node_modules/"
echo "Installed plugin to: $OPENCLAW_EXTENSIONS/athena"

for file in SOUL.md AGENTS.md IDENTITY.md USER.md RESUME_KNOWLEDGE.md; do
  if [ -f "$OPENCLAW_WORKSPACE/$file" ]; then
    cp "$OPENCLAW_WORKSPACE/$file" "$OPENCLAW_WORKSPACE/${file}.backup"
    echo "Backed up existing $file"
  fi
  if [ -f "$ATHENA_DIR/workspace/$file" ]; then
    cp "$ATHENA_DIR/workspace/$file" "$OPENCLAW_WORKSPACE/$file"
  fi
done
echo "Installed workspace files"

echo ""
echo "=== Athena installed successfully ==="
echo "Data stored at: $ATHENA_DATA"
echo ""
echo "Add to your openclaw.json plugins config:"
echo '  "athena": { "enabled": true }'
echo ""
echo "Start with: openclaw"
