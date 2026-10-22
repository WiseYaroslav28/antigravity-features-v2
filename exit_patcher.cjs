const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const username = process.env.USERNAME || process.env.USER;
const ASAR_PATH = path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'antigravity', 'resources', 'app.asar');
const PATCHED_PATH = path.join(__dirname, 'app.asar.patched');
const LOG_FILE = path.join(__dirname, 'features_v2.log');

function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [ExitPatcher] ${msg}\n`);
  } catch (e) {}
}

log("Silent exit-patcher armed. Waiting for AntiGravity to close normally...");

// Check every 1 second if Antigravity is running
const checkInterval = setInterval(() => {
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', windowsHide: true });
    if (!output.includes('Antigravity.exe')) {
      clearInterval(checkInterval);
      log("AntiGravity closed by user. Applying app.asar.patched now...");
      
      // Copy patched asar
      if (fs.existsSync(PATCHED_PATH)) {
        fs.copyFileSync(PATCHED_PATH, ASAR_PATH);
        log("Successfully applied app.asar.patched on exit! Next launch will be fully localized.");
      }
      process.exit(0);
    }
  } catch (e) {
    // Retry next tick
  }
}, 1000);
