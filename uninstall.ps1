# ==============================================================================
# Google AntiGravity 2.0 — Полное удаление русификатора и MCP-сервера (Windows)
# Запуск в 1 строку в PowerShell:
#   irm https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/uninstall.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  🗑️ Удаление русификатора Google AntiGravity 2.0 (Windows)     " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ОШИБКА] Node.js не найден в системе!" -ForegroundColor Red
    exit 1
}

$InstallDir = Join-Path $env:USERPROFILE ".antigravity-features-v2"
$UninstallerScript = Join-Path $InstallDir "uninstaller.cjs"
$LocalAsarPkg = Join-Path $InstallDir "node_modules\@electron\asar"

if ((Test-Path $UninstallerScript) -and (Test-Path $LocalAsarPkg)) {
    node $UninstallerScript --cli
    Start-Sleep -Seconds 2
    exit 0
}

Write-Host "[1/3] Очистка регистрации MCP-сервера из mcp_config.json..." -ForegroundColor Yellow
$ConfigPaths = @(
    (Join-Path $env:USERPROFILE ".gemini\config\mcp_config.json"),
    (Join-Path $env:USERPROFILE ".gemini\antigravity\mcp_config.json")
)
foreach ($CfgPath in $ConfigPaths) {
    if (Test-Path $CfgPath) {
        node -e "
          const fs = require('fs');
          const p = process.argv[1];
          try {
            const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (cfg && cfg.mcpServers && cfg.mcpServers['antigravity-features-v2']) {
              delete cfg.mcpServers['antigravity-features-v2'];
              fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
            }
          } catch (e) {}
        " "$CfgPath"
    }
}

$WasRunning = [bool](Get-Process -Name "Antigravity" -ErrorAction SilentlyContinue)
if ($WasRunning) {
    Write-Host "[2/3] Закрытие открытых окон AntiGravity для разблокировки файлов..." -ForegroundColor Yellow
    Stop-Process -Name "Antigravity" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "[3/3] Восстановление заводского app.asar и удаление файлов русификатора..." -ForegroundColor Green
$ResourcesDir = Join-Path $env:LOCALAPPDATA "Programs\Antigravity\resources"
$AsarPath = Join-Path $ResourcesDir "app.asar"
$BakPath = Join-Path $ResourcesDir "app.asar.bak"

$RestoredFromBak = $false
if (Test-Path $BakPath) {
    $IsBakClean = node -e "
      const fs = require('fs');
      const buf = fs.readFileSync(process.argv[1]);
      process.stdout.write(buf.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION') ? '0' : '1');
    " "$BakPath"
    if ($IsBakClean -eq "1") {
        Copy-Item $BakPath $AsarPath -Force
        $RestoredFromBak = $true
    }
}

if (-not $RestoredFromBak -and (Test-Path $AsarPath)) {
    $TempWork = Join-Path $env:TEMP ("agy_uninstall_" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $TempWork -Force | Out-Null
    Push-Location $TempWork
    npm init -y | Out-Null
    npm install @electron/asar --no-audit --no-fund | Out-Null
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/auto_patcher.cjs" -OutFile (Join-Path $TempWork "auto_patcher.cjs") -UseBasicParsing
    $CleanOut = Join-Path $TempWork "clean.asar"
    node (Join-Path $TempWork "auto_patcher.cjs") --unpatch-to $CleanOut --force-surgical-unpatch
    if (Test-Path $CleanOut) {
        Copy-Item $CleanOut $AsarPath -Force
    }
    Pop-Location
    Remove-Item $TempWork -Recurse -Force -ErrorAction SilentlyContinue
}

foreach ($Extra in @("app.asar.bak", "app.asar.patched", "app.asar.old_unpatched")) {
    $ExtraPath = Join-Path $ResourcesDir $Extra
    if (Test-Path $ExtraPath) { Remove-Item $ExtraPath -Force -ErrorAction SilentlyContinue }
}

if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

$ExePath = Join-Path $env:LOCALAPPDATA "Programs\Antigravity\Antigravity.exe"
if ($WasRunning -and (Test-Path $ExePath)) {
    Start-Process -FilePath $ExePath
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ Русификатор полностью удалён. Заводской интерфейс возвращён." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
