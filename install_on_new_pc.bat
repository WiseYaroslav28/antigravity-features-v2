@echo off
chcp 65001 >nul
echo ========================================================
echo   Установка AntiGravity Features v2 на новый компьютер
echo ========================================================
echo.

:: 1. Проверка наличия Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Node.js не найден в системе!
    echo Установите Node.js с официального сайта: https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Определение путей
set "PROJECT_DIR=%~dp0"
:: Убираем завершающий слэш если есть
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

set "CONFIG_DIR=%USERPROFILE%\.gemini\config"
set "CONFIG_FILE=%CONFIG_DIR%\mcp_config.json"
set "ASAR_PATH=%LOCALAPPDATA%\Programs\antigravity\resources\app.asar"
set "PATCHED_ASAR=%PROJECT_DIR%\app.asar.patched"

echo [1/4] Настройка конфигурации MCP (%CONFIG_FILE%)...
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

:: Запускаем вспомогательный скрипт настройки MCP конфига
node -e "const fs = require('fs'); const path = '%CONFIG_FILE%'.replace(/\\/g, '/'); const proj = '%PROJECT_DIR%'.replace(/\\/g, '/'); let cfg = { mcpServers: {} }; if (fs.existsSync(path)) { try { cfg = JSON.parse(fs.readFileSync(path, 'utf8')); if (!cfg.mcpServers) cfg.mcpServers = {}; } catch(e){} } cfg.mcpServers['antigravity-features-v2'] = { command: 'node', args: [proj + '/index.js'] }; fs.writeFileSync(path, JSON.stringify(cfg, null, 2), 'utf8'); console.log('Конфигурация MCP успешно обновлена.');"

echo.
echo [2/4] Проверка зависимостей node_modules...
if not exist "%PROJECT_DIR%\node_modules" (
    echo Установка модулей через npm...
    cd /d "%PROJECT_DIR%"
    call npm install
) else (
    echo Модули node_modules найдены, установка не требуется.
)

echo.
echo [3/4] Сборка свежего патча для AntiGravity...
cd /d "%PROJECT_DIR%"
node auto_patcher.cjs

echo.
echo [4/4] Применение патча к AntiGravity...
if exist "%ASAR_PATH%" (
    :: Закрываем запущенный AntiGravity если открыт
    taskkill /F /IM Antigravity.exe >nul 2>nul
    timeout /t 1 /nobreak >nul
    
    copy /Y "%PATCHED_ASAR%" "%ASAR_PATH%" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [УСПЕХ] Файл app.asar успешно пропатчен!
    ) else (
        echo [ВНИМАНИЕ] Не удалось скопировать app.asar прямо сейчас.
        echo Закройте AntiGravity и запустите скрипт повторно.
    )
) else (
    echo [ПРЕДУПРЕЖДЕНИЕ] AntiGravity еще не установлен по пути:
    echo %ASAR_PATH%
    echo Установите AntiGravity и запустите этот скрипт снова.
)

echo.
echo ========================================================
echo   Установка завершена! 
echo   Теперь запустите AntiGravity — он откроется на русском языке.
echo ========================================================
pause
