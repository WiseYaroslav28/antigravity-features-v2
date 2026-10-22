import { spawn } from 'child_process';
import CDP from 'chrome-remote-interface';
import path from 'path';
import os from 'os';

const USER_PROFILE = process.env.USERPROFILE || process.env.HOME || os.homedir();
const EXE_PATH = path.join(USER_PROFILE, 'AppData', 'Local', 'Programs', 'antigravity', 'Antigravity.exe');

async function launchOrFocus() {
  try {
    const targets = await CDP.List({ port: 9222 });
    if (targets && targets.length > 0) {
      // AntiGravity is already running with CDP port 9222.
      // Spawning Antigravity.exe WITHOUT the debugging port flag sends a clean second-instance IPC event to Electron main process,
      // which natively calls mainWindow.show(), mainWindow.restore(), and mainWindow.focus() to unhide from system tray!
      const child = spawn(EXE_PATH, [], { detached: true, stdio: 'ignore' });
      child.unref();
      process.exit(0);
    }
  } catch (e) {
    // AntiGravity is not running yet on port 9222
  }

  // Initial launch with remote debugging port enabled
  const child = spawn(EXE_PATH, ['--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' });
  child.unref();
  process.exit(0);
}

launchOrFocus();
