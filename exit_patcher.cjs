const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

// Защита от SIGTERM со стороны macOS loginwindow (_LSForceQuitApplication -> killPID hard=NO) после закрытия Antigravity.app
if (process.platform === 'darwin') {
  process.on('SIGTERM', () => {});
  process.on('SIGHUP', () => {});
  process.on('SIGINT', () => {});
}

const username = process.env.USERNAME || process.env.USER || path.basename(os.homedir());
const isMac = process.platform === 'darwin';
function resolveMacAppBundle() {
  const candidates = [
    '/Applications/Antigravity.app',
    '/Applications/Antigravity IDE.app',
    path.join(os.homedir(), 'Applications', 'Antigravity.app'),
    path.join(os.homedir(), 'Applications', 'Antigravity IDE.app')
  ];
  return candidates.find(p => fs.existsSync(p)) || '/Applications/Antigravity.app';
}
const APP_DIR = isMac
  ? resolveMacAppBundle()
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
const MAC_UPDATER_PID_FILE = path.join(__dirname, 'backups', 'mac-updater.pid');
const UNINSTALL_LOCK_FILE = path.join(__dirname, 'backups', 'uninstalling.lock');
const isRestartMode = process.argv.includes('--restart');

function isMacUpdaterActive() {
  if (!isMac || !fs.existsSync(MAC_UPDATER_PID_FILE)) return false;
  try {
    const macPid = parseInt(fs.readFileSync(MAC_UPDATER_PID_FILE, 'utf8').trim(), 10);
    if (macPid > 0 && macPid !== process.pid) {
      process.kill(macPid, 0);
      return true;
    }
  } catch (e) {}
  return false;
}

if (fs.existsSync(UNINSTALL_LOCK_FILE) || isMacUpdaterActive()) {
  process.exit(0);
}

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
  log("Relaunching AntiGravity cleanly (HTTP hot-reload mode, no CDP port needed)...");
  if (isMac) {
    const child = spawn('open', ['-a', APP_DIR], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  } else if (fs.existsSync(EXE_PATH)) {
    const child = spawn(EXE_PATH, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
  }
}

function applyAsarWithRetry() {
  if (fs.existsSync(UNINSTALL_LOCK_FILE)) {
    log("Uninstall lock detected; aborting exit-patcher.");
    return false;
  }
  if (isMacUpdaterActive()) {
    log("mac_updater.cjs is actively updating AntiGravity.app; deferring patching to mac_updater.");
    return false;
  }
  let currentIsAlreadyPatched = false;
  try {
    if (fs.existsSync(ASAR_PATH)) {
      const currentBuf = fs.readFileSync(ASAR_PATH);
      currentIsAlreadyPatched = currentBuf.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION');
      if (!currentIsAlreadyPatched) {
        log("Detected fresh unpatched app.asar on exit; rebuilding app.asar.patched from new version first...");
        execSync(`"${process.execPath}" "${path.join(__dirname, 'auto_patcher.cjs')}" --build-only`, { stdio: 'ignore', windowsHide: true });
      }
    }
  } catch (e) {}

  if (!fs.existsSync(PATCHED_PATH)) {
    log("No app.asar.patched found; skipping copy.");
    return false;
  }
  if (!currentIsAlreadyPatched && fs.existsSync(ASAR_PATH)) {
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
          try { execSync(`trap '' TERM HUP INT; codesign --force --sign - "${path.join(elFwDir, 'Libraries')}"/*.dylib 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          try { execSync(`trap '' TERM HUP INT; codesign --force --sign - "${path.join(elFwDir, 'Helpers')}"/* 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          try { execSync(`trap '' TERM HUP INT; find "${fwDir}" -name "*.framework" -exec codesign --force --sign - {} \\; 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          try { execSync(`trap '' TERM HUP INT; find "${fwDir}" -name "*.app" -exec codesign --force --sign - {} \\; 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
          execSync(`trap '' TERM HUP INT; codesign --force --sign - "${APP_DIR}"`, { stdio: 'ignore' });
          try { execSync(`trap '' TERM HUP INT; xattr -cr "${APP_DIR}"`, { stdio: 'ignore' }); } catch(e) {}
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
