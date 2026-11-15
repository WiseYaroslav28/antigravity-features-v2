const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const username = process.env.USERNAME || process.env.USER || path.basename(os.homedir());
const isMac = process.platform === 'darwin';
const APP_DIR = isMac
  ? (fs.existsSync('/Applications/Antigravity.app') ? '/Applications/Antigravity.app' : '/Applications/Antigravity IDE.app')
  : path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'Antigravity');
const EXE_PATH = isMac
  ? path.join(APP_DIR, 'Contents', 'MacOS', 'Antigravity')
  : path.join(APP_DIR, 'Antigravity.exe');
const ASAR_PATH = isMac
  ? path.join(APP_DIR, 'Contents', 'Resources', 'app.asar')
  : path.join(APP_DIR, 'resources', 'app.asar');
const BAK_PATH = isMac
  ? path.join(APP_DIR, 'Contents', 'Resources', 'app.asar.bak')
  : path.join(APP_DIR, 'resources', 'app.asar.bak');
const PATCHED_PATH = path.join(__dirname, 'app.asar.patched');
const LOG_FILE = path.join(__dirname, 'features_v2.log');
const PID_FILE = path.join(__dirname, 'backups', 'exit-patcher.pid');
const isRestartMode = process.argv.includes('--restart');

if (!isRestartMode && fs.existsSync(PID_FILE)) {
  try {
    const existingPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (existingPid > 0 && existingPid !== process.pid) {
      process.kill(existingPid, 0);
      process.exit(0);
    }
  } catch (e) {}
}
if (!isRestartMode) {
  try {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
  } catch (e) {}
}

function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [ExitPatcher] ${msg}\n`);
  } catch (e) {}
}

function isAntigravityRunning() {
  try {
    if (isMac) {
      const out = execSync(`pgrep -f "${EXE_PATH}"`, { encoding: 'utf8' }).trim();
      return out.length > 0;
    } else {
      const output = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', windowsHide: true });
      return output.includes('Antigravity.exe');
    }
  } catch (e) {
    return false;
  }
}

function relaunchAntigravity() {
  log("Relaunching AntiGravity with --remote-debugging-port=9222...");
  if (isMac) {
    const child = spawn('open', ['-a', APP_DIR, '--args', '--remote-debugging-port=9222'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  } else if (fs.existsSync(EXE_PATH)) {
    const child = spawn(EXE_PATH, ['--remote-debugging-port=9222'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
  }
}

function applyAsarWithRetry() {
  try {
    if (fs.existsSync(ASAR_PATH)) {
      const currentBuf = fs.readFileSync(ASAR_PATH);
      const isAlreadyPatched = currentBuf.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION');
      if (!isAlreadyPatched) {
        log("Detected fresh unpatched app.asar on exit; rebuilding app.asar.patched from new version first...");
        execSync(`node "${path.join(__dirname, 'auto_patcher.cjs')}" --build-only`, { stdio: 'ignore' });
      }
    }
  } catch (e) {}

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
      if (isMac && fs.existsSync(APP_DIR)) {
        try {
          const fwDir = path.join(APP_DIR, 'Contents', 'Frameworks');
          const elFwDir = path.join(fwDir, 'Electron Framework.framework', 'Versions', 'A');
          try { execSync(`codesign --force --sign - "${path.join(elFwDir, 'Libraries')}"/*.dylib 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          try { execSync(`codesign --force --sign - "${path.join(elFwDir, 'Helpers')}"/* 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          try { execSync(`find "${fwDir}" -name "*.framework" -exec codesign --force --sign - {} \\; 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          try { execSync(`find "${fwDir}" -name "*.app" -exec codesign --force --sign - {} \\; 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          execSync(`codesign --force --sign - "${APP_DIR}"`, { stdio: 'ignore' });
          try { execSync(`xattr -cr "${APP_DIR}"`, { stdio: 'ignore' }); } catch(e) {}
          log("Successfully re-signed app bundle via inside-out codesign!");
        } catch (csErr) {
          log(`codesign warning: ${csErr.message}`);
        }
      }
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
      if (isMac) {
        execSync(`pkill -f "${EXE_PATH}" || killall Antigravity`, { stdio: 'ignore' });
      } else {
        execSync('taskkill /F /IM Antigravity.exe /T', { stdio: 'ignore', windowsHide: true });
      }
    } catch (e) {}

    let attempts = 0;
    const waitInterval = setInterval(() => {
      attempts++;
      if (!isAntigravityRunning() || attempts >= 15) {
        clearInterval(waitInterval);
        applyAsarWithRetry();
        relaunchAntigravity();
        process.exit(0);
      }
    }, 400);
  }, 300);
} else {
  log("Silent exit-patcher armed. Waiting for AntiGravity to close normally...");
  const checkInterval = setInterval(() => {
    try {
      if (!isAntigravityRunning()) {
        clearInterval(checkInterval);
        log("AntiGravity closed by user. Applying app.asar.patched now...");
        applyAsarWithRetry();
        process.exit(0);
      }
    } catch (e) {}
  }, 1000);
}
