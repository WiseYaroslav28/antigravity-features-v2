const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const username = process.env.USERNAME || process.env.USER || path.basename(os.homedir());
const APP_DIR = path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'Antigravity');
const EXE_PATH = path.join(APP_DIR, 'Antigravity.exe');
const ASAR_PATH = path.join(APP_DIR, 'resources', 'app.asar');
const BAK_PATH = path.join(APP_DIR, 'resources', 'app.asar.bak');
const PATCHED_PATH = path.join(__dirname, 'app.asar.patched');
const LOG_FILE = path.join(__dirname, 'features_v2.log');
const isRestartMode = process.argv.includes('--restart');

function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [ExitPatcher] ${msg}\n`);
  } catch (e) {}
}

function applyAsarWithRetry() {
  if (!fs.existsSync(PATCHED_PATH)) {
    log("No app.asar.patched found; skipping copy.");
    return false;
  }
  if (!fs.existsSync(BAK_PATH) && fs.existsSync(ASAR_PATH)) {
    try { fs.copyFileSync(ASAR_PATH, BAK_PATH); } catch (e) {}
  }
  for (let i = 0; i < 12; i++) {
    try {
      fs.copyFileSync(PATCHED_PATH, ASAR_PATH);
      log(`Successfully applied app.asar.patched to app.asar (attempt ${i + 1})!`);
      return true;
    } catch (err) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
  log("Failed to copy app.asar.patched after 12 attempts.");
  return false;
}

if (isRestartMode) {
  log("1-Click Restart mode initiated! Closing AntiGravity...");
  setTimeout(() => {
    try {
      execSync('taskkill /F /IM Antigravity.exe /T', { stdio: 'ignore', windowsHide: true });
    } catch (e) {}

    let attempts = 0;
    const waitInterval = setInterval(() => {
      attempts++;
      try {
        const output = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', windowsHide: true });
        if (!output.includes('Antigravity.exe') || attempts >= 15) {
          clearInterval(waitInterval);
          applyAsarWithRetry();
          if (fs.existsSync(EXE_PATH)) {
            log("Relaunching AntiGravity with --remote-debugging-port=9222...");
            const child = spawn(EXE_PATH, ['--remote-debugging-port=9222'], {
              detached: true,
              stdio: 'ignore',
              windowsHide: false
            });
            child.unref();
          }
          process.exit(0);
        }
      } catch (e) {
        clearInterval(waitInterval);
        applyAsarWithRetry();
        if (fs.existsSync(EXE_PATH)) {
          const child = spawn(EXE_PATH, ['--remote-debugging-port=9222'], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false
          });
          child.unref();
        }
        process.exit(0);
      }
    }, 400);
  }, 300);
} else {
  log("Silent exit-patcher armed. Waiting for AntiGravity to close normally...");
  const checkInterval = setInterval(() => {
    try {
      const output = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', windowsHide: true });
      if (!output.includes('Antigravity.exe')) {
        clearInterval(checkInterval);
        log("AntiGravity closed by user. Applying app.asar.patched now...");
        applyAsarWithRetry();
        process.exit(0);
      }
    } catch (e) {}
  }, 1000);
}
