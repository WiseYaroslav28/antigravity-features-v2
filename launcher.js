import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

const USER_PROFILE = process.env.USERPROFILE || process.env.HOME || os.homedir();
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
const APP_DIR = isMac ? resolveMacAppBundle() : null;
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

// Launch or focus AntiGravity cleanly (v2.2.0+ uses local HTTP hot-reload, no --remote-debugging-port needed)
spawnApp([]);
process.exit(0);
