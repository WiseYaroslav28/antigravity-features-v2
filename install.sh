#!/usr/bin/env bash
set -e

echo "================================================================"
echo "  🚀 Установка русификатора Google AntiGravity 2.0 (macOS/Unix)"
echo "================================================================"
echo ""

# Расширяем PATH для Homebrew (Apple Silicon & Intel), Volta, fnm и NVM
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/share/fnm:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
    echo "[ОШИБКА] Node.js не найден в системе! Установите Node.js (https://nodejs.org или brew install node) и повторите запуск."
    exit 1
fi

NODE_BIN=$(command -v node)
REPO_URL="https://github.com/WiseYaroslav28/antigravity-features-v2.git"
TARBALL_URL="https://codeload.github.com/WiseYaroslav28/antigravity-features-v2/tar.gz/refs/heads/main"

# Определяем целевую папку: если скрипт запущен локально из уже клонированного репозитория — используем её, иначе ~/.antigravity-features-v2
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    CANDIDATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$CANDIDATE_DIR/auto_patcher.cjs" ] && [ -f "$CANDIDATE_DIR/localization_injected.js" ]; then
        SCRIPT_DIR="$CANDIDATE_DIR"
    fi
fi

INSTALL_DIR="${SCRIPT_DIR:-$HOME/.antigravity-features-v2}"

if [ ! -f "$INSTALL_DIR/auto_patcher.cjs" ]; then
    echo "[0/3] Загрузка репозитория русификатора в $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
    if command -v git >/dev/null 2>&1; then
        git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
    else
        curl -fsSL "$TARBALL_URL" | tar -xz -C "$INSTALL_DIR" --strip-components=1
    fi
elif [ -z "$SCRIPT_DIR" ] && [ -d "$INSTALL_DIR/.git" ] && command -v git >/dev/null 2>&1; then
    echo "[0/3] Обновление существующей копии в $INSTALL_DIR..."
    git -C "$INSTALL_DIR" pull --ff-only >/dev/null 2>&1 || true
fi

cd "$INSTALL_DIR"

if [ ! -d "$INSTALL_DIR/node_modules" ]; then
    echo "[1/3] Установка npm-зависимостей..."
    npm install --no-audit --no-fund
else
    echo "[1/3] Зависимости npm уже установлены."
fi

echo "[2/3] Регистрация MCP-сервера автообновления (antigravity-features-v2)..."
register_mcp_config() {
    local cfg_path="$1"
    mkdir -p "$(dirname "$cfg_path")"
    "$NODE_BIN" -e '
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
' "$cfg_path" "$NODE_BIN" "$INSTALL_DIR/index.js"
}

register_mcp_config "$HOME/.gemini/config/mcp_config.json"
if [ -d "$HOME/.gemini/antigravity" ]; then
    register_mcp_config "$HOME/.gemini/antigravity/mcp_config.json"
fi

echo "[3/3] Сборка, применение патча app.asar и подпись бандла (codesign)..."
"$NODE_BIN" "$INSTALL_DIR/auto_patcher.cjs"

echo ""
echo "================================================================"
echo "  ✅ Установка успешно завершена!"
echo "  Перезапустите Google AntiGravity (Cmd+Q и повторный запуск),"
echo "  чтобы активировать 100% русскую локализацию и виджет EN | RU."
echo "  ⭐ Сохранить проект в закладки / поставить звезду на GitHub:"
echo "     https://github.com/WiseYaroslav28/antigravity-features-v2"
echo "================================================================"
