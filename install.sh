#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "  OLYMPUS — Autonomous Career Intelligence  "
echo "============================================"
echo ""

# ── Prerequisites check ───────────────────────────────────────────────────

echo "[1/7] Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required."; exit 1; }

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found v$(node -v))"
  exit 1
fi

echo "  Node $(node -v) | npm $(npm -v)"

# ── Install shared dependencies ──────────────────────────────────────────

echo ""
echo "[2/7] Installing shared obsidian-adapter..."
cd "$SCRIPT_DIR/shared/obsidian-adapter" && npm install --silent
echo "  Done."

# ── Install agent dependencies ───────────────────────────────────────────

echo ""
echo "[3/7] Installing agent dependencies..."

for agent in absolute athena hermes artemis; do
  echo "  Installing $agent..."
  cd "$SCRIPT_DIR/agents/$agent/plugin" && npm install --silent
done
echo "  Done."

# ── Install Playwright browsers (for Artemis) ────────────────────────────

echo ""
echo "[4/7] Installing Playwright browsers..."
cd "$SCRIPT_DIR/agents/artemis/plugin" && npx playwright install chromium 2>/dev/null
echo "  Done."

# ── Verify builds ────────────────────────────────────────────────────────

echo ""
echo "[5/7] Verifying TypeScript..."

for agent in absolute athena hermes artemis; do
  cd "$SCRIPT_DIR/agents/$agent/plugin"
  npx tsc --noEmit 2>/dev/null && echo "  $agent: OK" || echo "  $agent: WARN (type errors, may still work)"
done

# ── Run tests ────────────────────────────────────────────────────────────

echo ""
echo "[6/7] Running tests..."

TOTAL_PASS=0
for agent in absolute athena hermes artemis; do
  cd "$SCRIPT_DIR/agents/$agent/plugin"
  RESULT=$(npx vitest run 2>&1 | grep "Tests" | head -1 || echo "0 passed")
  PASS=$(echo "$RESULT" | grep -o '[0-9]* passed' | grep -o '[0-9]*' || echo "0")
  TOTAL_PASS=$((TOTAL_PASS + PASS))
  echo "  $agent: $PASS tests passed"
done
echo "  Total: $TOTAL_PASS tests passed"

# ── Create local directories ─────────────────────────────────────────────

echo ""
echo "[7/7] Setting up local directories..."
mkdir -p ~/.artemis/screenshots ~/.artemis/logs ~/.artemis/resumes
echo "  Created ~/.artemis/{screenshots,logs,resumes}"

# ── Done ─────────────────────────────────────────────────────────────────

echo ""
echo "============================================"
echo "  OLYMPUS installed successfully!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. CREATE DISCORD BOTS"
echo "     Create 4 bots at https://discord.com/developers/applications"
echo "     Name them: Absolute, Athena, Hermes, Artemis"
echo "     Enable MESSAGE CONTENT INTENT for each"
echo "     Add all 4 to your Discord server"
echo ""
echo "  2. CREATE DISCORD CHANNELS"
echo "     #athena (dedicated career work)"
echo "     #daily-job-report (Artemis posts here)"
echo ""
echo "  3. CONFIGURE OPENCLAW"
echo "     Run: node $SCRIPT_DIR/scripts/configure-openclaw.js"
echo "     This generates the openclaw.json config with your bot tokens"
echo ""
echo "  4. CONFIGURE ARTEMIS EMAIL"
echo "     Create a Gmail for job applications"
echo "     Generate an App Password at myaccount.google.com/apppasswords"
echo "     Run: cd $SCRIPT_DIR/agents/artemis/plugin && npx tsx ../scripts/setup-email.ts <email> <app-password> gmail"
echo ""
echo "  5. ADD COMPANIES TO TRACK"
echo "     Run: cd $SCRIPT_DIR/agents/artemis/plugin && npx tsx ../scripts/seed-companies.ts"
echo ""
echo "  6. START OPENCLAW"
echo "     Run: openclaw start"
echo "     All 4 agents will come online in Discord"
echo ""
echo "Plugin paths for openclaw.json:"
for agent in absolute athena hermes artemis; do
  echo "  $agent: $SCRIPT_DIR/agents/$agent/plugin/src/index.ts"
done
echo ""
echo "Workspace paths for openclaw.json:"
for agent in absolute athena hermes artemis; do
  echo "  $agent: $SCRIPT_DIR/agents/$agent/workspace"
done
