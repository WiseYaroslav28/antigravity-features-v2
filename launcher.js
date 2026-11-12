import { spawn } from 'child_process';
import CDP from 'chrome-remote-interface';
import path from 'path';
import os from 'os';
import fs from 'fs';

const USER_PROFILE = process.env.USERPROFILE || process.env.HOME || os.homedir();
const isMac = process.platform === 'darwin';
const APP_DIR = isMac
  ? (fs.existsSync('/Applications/Antigravity.app') ? '/Applications/Antigravity.app' : '/Applications/Antigravity IDE.app')
  : null;
const EXE_PATH = isMac
  ? path.join(APP_DIR, 'Contents', 'MacOS', 'Antigravity')
  : path.join(USER_PROFILE, 'AppData', 'Local', 'Programs', 'antigravity', 'Antigravity.exe');

function spawnApp(args = []) {
  if (isMac) {
    const child = spawn('open', ['-a', APP_DIR, ...(args.length ? ['--args', ...args] : [])], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    const child = spawn(EXE_PATH, args, { detached: true, stdio: 'ignore' });
    child.unref();
  }
}

async function launchOrFocus() {
  try {
    const targets = await CDP.List({ port: 9222 });
    if (targets && targets.length > 0) {
      spawnApp([]);
      process.exit(0);
    }
  } catch (e) {
    // AntiGravity is not running yet on port 9222
  }

  // Initial launch with remote debugging port enabled
  spawnApp(['--remote-debugging-port=9222']);
  process.exit(0);
}

launchOrFocus();
