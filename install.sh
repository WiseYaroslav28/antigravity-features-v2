#!/usr/bin/env bash
set -e

echo "================================================================"
echo "  🚀 Установка русификатора Google AntiGravity 2.0 для macOS/Unix"
echo "================================================================"
echo ""

INSTALL_DIR="$HOME/.antigravity-features-v2"
cd "$INSTALL_DIR"

if ! command -v node >/dev/null 2>&1; then
    echo "[ОШИБКА] Node.js не найден в системе!"
    exit 1
fi

NODE_BIN=$(command -v node)

if [ ! -d "$INSTALL_DIR/node_modules" ]; then
    echo "[1/3] Установка npm-зависимостей..."
    npm install --no-audit --no-fund
fi

echo "[2/3] Регистрация MCP-сервера (antigravity-features-v2)..."
CONFIG_PATH="$HOME/.gemini/config/mcp_config.json"
mkdir -p "$(dirname "$CONFIG_PATH")"

node -e '
const fs = require("fs");
const p = process.argv[1];
const nodeBin = process.argv[2];
const indexJs = process.argv[3];
let cfg = { mcpServers: {} };
if (fs.existsSync(p)) {
  try { cfg = JSON.parse(fs.readFileSync(p, "utf8")); if (!cfg.mcpServers) cfg.mcpServers = {}; } catch (e) {}
}
cfg.mcpServers["antigravity-features-v2"] = {
  command: nodeBin,
  args: [indexJs]
};
fs.writeFileSync(p, JSON.stringify(cfg, null, 2), "utf8");
' "$CONFIG_PATH" "$NODE_BIN" "$INSTALL_DIR/index.js"

echo "[3/3] Сборка и применение патча локализации..."
node "$INSTALL_DIR/auto_patcher.cjs"

echo ""
echo "================================================================"
echo "  ✅ Установка успешно завершена!"
echo "================================================================"
