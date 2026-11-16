#!/usr/bin/env bash
set -e

echo "================================================================"
echo "  🗑️ Удаление русификатора Google AntiGravity 2.0 (macOS/Unix)"
echo "================================================================"
echo ""

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/share/fnm:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
    echo "[ОШИБКА] Node.js не найден в системе!"
    exit 1
fi

NODE_BIN=$(command -v node)
INSTALL_DIR="$HOME/.antigravity-features-v2"

if [ -f "$INSTALL_DIR/uninstaller.cjs" ] && [ -d "$INSTALL_DIR/node_modules/@electron/asar" ]; then
    "$NODE_BIN" "$INSTALL_DIR/uninstaller.cjs" --cli
    sleep 2
    exit 0
fi

echo "[1/3] Очистка регистрации MCP-сервера из mcp_config.json..."
for CFG_PATH in "$HOME/.gemini/config/mcp_config.json" "$HOME/.gemini/antigravity/mcp_config.json"; do
    if [ -f "$CFG_PATH" ]; then
        "$NODE_BIN" -e '
const fs = require("fs");
const p = process.argv[1];
try {
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  if (cfg && cfg.mcpServers && cfg.mcpServers["antigravity-features-v2"]) {
    delete cfg.mcpServers["antigravity-features-v2"];
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  }
} catch (e) {}
' "$CFG_PATH"
    fi
done

APP_BUNDLE="/Applications/Antigravity.app"
for CANDIDATE in "/Applications/Antigravity.app" "/Applications/Antigravity IDE.app" "$HOME/Applications/Antigravity.app" "$HOME/Applications/Antigravity IDE.app"; do
    if [ -d "$CANDIDATE" ]; then
        APP_BUNDLE="$CANDIDATE"
        break
    fi
done

EXE_PATH="$APP_BUNDLE/Contents/MacOS/Antigravity"
RESOURCES_DIR="$APP_BUNDLE/Contents/Resources"
ASAR_PATH="$RESOURCES_DIR/app.asar"
BAK_PATH="$RESOURCES_DIR/app.asar.bak"

WAS_RUNNING=0
if pgrep -f "$EXE_PATH" >/dev/null 2>&1; then
    WAS_RUNNING=1
    echo "[2/3] Закрытие открытых окон AntiGravity..."
    pkill -f "$EXE_PATH" >/dev/null 2>&1 || killall Antigravity >/dev/null 2>&1 || true
    sleep 2
fi

echo "[3/3] Восстановление заводского app.asar и переподпись бандла (codesign)..."
RESTORED=0
if [ -f "$BAK_PATH" ]; then
    IS_CLEAN=$("$NODE_BIN" -e 'const fs=require("fs");const b=fs.readFileSync(process.argv[1]);process.stdout.write(b.includes("// BEGIN ANTIGRAVITY TRANSLATION INJECTION")?"0":"1");' "$BAK_PATH")
    if [ "$IS_CLEAN" = "1" ]; then
        cp -f "$BAK_PATH" "$ASAR_PATH"
        RESTORED=1
    fi
fi

if [ "$RESTORED" = "0" ] && [ -f "$ASAR_PATH" ]; then
    TMP_WORK=$(mktemp -d)
    (
        cd "$TMP_WORK"
        npm init -y >/dev/null 2>&1
        npm install @electron/asar --no-audit --no-fund >/dev/null 2>&1
        curl -fsSL "https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/auto_patcher.cjs" -o "$TMP_WORK/auto_patcher.cjs"
        "$NODE_BIN" "$TMP_WORK/auto_patcher.cjs" --unpatch-to "$TMP_WORK/clean.asar" --force-surgical-unpatch
        if [ -f "$TMP_WORK/clean.asar" ]; then
            cp -f "$TMP_WORK/clean.asar" "$ASAR_PATH"
        fi
    )
    rm -rf "$TMP_WORK"
fi

rm -f "$RESOURCES_DIR/app.asar.bak" "$RESOURCES_DIR/app.asar.patched" "$RESOURCES_DIR/app.asar.old_unpatched"
rm -f "$HOME/Library/Application Support/Antigravity/antigravity-window-state.json"

if [ -d "$APP_BUNDLE" ]; then
    FW_DIR="$APP_BUNDLE/Contents/Frameworks"
    EL_FW_DIR="$FW_DIR/Electron Framework.framework/Versions/A"
    codesign --force --sign - "$EL_FW_DIR/Libraries"/*.dylib 2>/dev/null || true
    codesign --force --sign - "$EL_FW_DIR/Helpers"/* 2>/dev/null || true
    find "$FW_DIR" -name "*.framework" -exec codesign --force --sign - {} \; 2>/dev/null || true
    find "$FW_DIR" -name "*.app" -exec codesign --force --sign - {} \; 2>/dev/null || true
    codesign --force --sign - "$APP_BUNDLE" 2>/dev/null || true
    xattr -cr "$APP_BUNDLE" 2>/dev/null || true
fi

rm -rf "$INSTALL_DIR"

if [ "$WAS_RUNNING" = "1" ] && [ -d "$APP_BUNDLE" ]; then
    open -a "$APP_BUNDLE"
fi

echo ""
echo "================================================================"
echo "  ✅ Русификатор полностью удалён! Заводской интерфейс возвращён."
echo "================================================================"
