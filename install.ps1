# ==============================================================================
# Google AntiGravity 2.0 — Автоматический веб-установщик русификатора и MCP (v2)
# Запуск в 1 строку в PowerShell:
#   irm https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  🚀 Установка русификатора Google AntiGravity 2.0 (v2.1.26+)   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка наличия Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ОШИБКА] Node.js не найден в системе!" -ForegroundColor Red
    Write-Host "Скачайте и установите Node.js LTS: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$InstallDir = Join-Path $env:USERPROFILE ".antigravity-features-v2"
if (Test-Path "C:\Antigravity projects\antigravity-features-v2\localization_injected.js") {
    $InstallDir = "C:\Antigravity projects\antigravity-features-v2"
}

Write-Host "[1/4] Загрузка / обновление файлов в: $InstallDir" -ForegroundColor Green
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$ZipUrl = "https://github.com/WiseYaroslav28/antigravity-features-v2/archive/refs/heads/main.zip"
$TempZip = Join-Path $env:TEMP "antigravity-features-v2-main.zip"
$TempExtract = Join-Path $env:TEMP "antigravity-features-v2-extract"

if ($InstallDir -ne "C:\Antigravity projects\antigravity-features-v2") {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        if (Test-Path (Join-Path $InstallDir ".git")) {
            Push-Location $InstallDir
            git pull origin main --ff-only
            Pop-Location
        } else {
            Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
            git clone https://github.com/WiseYaroslav28/antigravity-features-v2.git $InstallDir
        }
    } else {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
        if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
        Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force
        Copy-Item -Path (Join-Path $TempExtract "antigravity-features-v2-main\*") -Destination $InstallDir -Recurse -Force
        Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[2/4] Установка npm-зависимостей..." -ForegroundColor Green
Push-Location $InstallDir
if (-not (Test-Path (Join-Path $InstallDir "node_modules"))) {
    npm install --no-audit --no-fund
}

Write-Host "[3/4] Регистрация MCP-сервера автообновления (antigravity-features-v2)..." -ForegroundColor Green
$ConfigPaths = @(
    (Join-Path $env:USERPROFILE ".gemini\config\mcp_config.json"),
    (Join-Path $env:USERPROFILE ".gemini\antigravity\mcp_config.json")
)

foreach ($CfgPath in $ConfigPaths) {
    $CfgDir = Split-Path $CfgPath -Parent
    if (-not (Test-Path $CfgDir)) {
        New-Item -ItemType Directory -Path $CfgDir -Force | Out-Null
    }
    $IndexJs = (Join-Path $InstallDir "index.js").Replace('\', '/')
    node -e "
      const fs = require('fs');
      const p = process.argv[1];
      const idx = process.argv[2];
      let cfg = { mcpServers: {} };
      if (fs.existsSync(p)) {
        try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); if (!cfg.mcpServers) cfg.mcpServers = {}; } catch (e) {}
      }
      cfg.mcpServers['antigravity-features-v2'] = { command: 'node', args: [idx] };
      fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
    " "$CfgPath" "$IndexJs"
}

Write-Host "[4/4] Сборка и применение патча локализации app.asar..." -ForegroundColor Green
node (Join-Path $InstallDir "auto_patcher.cjs") --once

$AsarPath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity\resources\app.asar"
$PatchedAsar = Join-Path $InstallDir "app.asar.patched"

if (Test-Path $PatchedAsar) {
    Copy-Item $PatchedAsar (Join-Path $env:LOCALAPPDATA "Programs\Antigravity\resources\app.asar.patched") -Force -ErrorAction SilentlyContinue
    try {
        Copy-Item $PatchedAsar $AsarPath -Force -ErrorAction Stop
        Write-Host "[УСПЕХ] app.asar успешно обновлён!" -ForegroundColor Green
    } catch {
        Write-Host "[ИНФО] AntiGravity сейчас запущена — патч app.asar.patched подготовлен и применится автоматически, пробуем горячую перезагрузку через CDP..." -ForegroundColor Yellow
    }
}

# Попытка мгновенной горячей инжекции через CDP (если открыт порт 9222)
node -e "
  const fs = require('fs');
  const http = require('http');
  const code = fs.readFileSync(process.argv[1], 'utf8');
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const targets = JSON.parse(data).filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
        let done = 0;
        if (!targets.length) process.exit(0);
        targets.forEach((t, i) => {
          const ws = new WebSocket(t.webSocketDebuggerUrl);
          ws.onopen = () => ws.send(JSON.stringify({ id: i + 1, method: 'Runtime.evaluate', params: { expression: code } }));
          ws.onmessage = () => { ws.close(); if (++done === targets.length) { console.log('[CDP] Локализация применена на лету без перезапуска!'); process.exit(0); } };
          ws.onerror = () => process.exit(0);
        });
      } catch (e) { process.exit(0); }
    });
  }).on('error', () => process.exit(0));
" (Join-Path $InstallDir "localization_injected.js")

Pop-Location

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ Установка завершена! Переключатель EN | RU доступен сверху." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
