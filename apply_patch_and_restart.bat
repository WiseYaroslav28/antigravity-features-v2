@echo off
setlocal enabledelayedexpansion

:: 1. Force kill Antigravity processes to release file locks
taskkill /F /IM Antigravity.exe >nul 2>&1
timeout /t 1 /nobreak >nul

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

set "EXE_PATH=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
set "ASAR_PATH=%LOCALAPPDATA%\Programs\antigravity\resources\app.asar"
set "BAK_PATH=%LOCALAPPDATA%\Programs\antigravity\resources\app.asar.bak"
set "PATCHED_PATH=%PROJECT_DIR%\app.asar.patched"

:: 2. Backup clean asar if bak does not exist
if not exist "%BAK_PATH%" (
    if exist "%ASAR_PATH%" (
        copy /Y "%ASAR_PATH%" "%BAK_PATH%" >nul 2>&1
    )
)

:: 3. Copy patched asar with retry loop for absolute reliability
if exist "%PATCHED_PATH%" (
    for /L %%i in (1,1,5) do (
        copy /Y "%PATCHED_PATH%" "%ASAR_PATH%" >nul 2>&1
        if !errorlevel! equ 0 (
            goto :copy_success
        )
        timeout /t 1 /nobreak >nul
    )
)

:copy_success
timeout /t 1 /nobreak >nul

:: 4. Start AntiGravity with remote debugging port
start "" "%EXE_PATH%" --remote-debugging-port=9222
exit /b 0
