const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const username = process.env.USERNAME || process.env.USER || os.userInfo().username;
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
const RESOURCES_DIR = isMac
  ? path.join(APP_DIR, 'Contents', 'Resources')
  : path.join(APP_DIR, 'resources');
const ASAR_PATH = path.join(RESOURCES_DIR, 'app.asar');
const USER_DATA_STATE_FILE = isMac
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Antigravity', 'antigravity-window-state.json')
  : path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Antigravity', 'antigravity-window-state.json');

const INSTALL_DIR = __dirname;
const DEFAULT_USER_INSTALL_DIR = path.resolve(os.homedir(), '.antigravity-features-v2');
const IS_DEFAULT_USER_INSTALL = path.resolve(INSTALL_DIR).toLowerCase() === DEFAULT_USER_INSTALL_DIR.toLowerCase();

const isFromUi = process.argv.includes('--from-ui');
const isDryRun = process.argv.includes('--dry-run');

function info(msg) {
  if (!isFromUi) {
    console.log(msg);
  }
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

function disarmExitPatcher() {
  const backupDir = path.join(INSTALL_DIR, 'backups');
  const lockFile = path.join(backupDir, 'uninstalling.lock');
  const pidFile = path.join(backupDir, 'exit-patcher.pid');
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(lockFile, JSON.stringify({ timestamp: Date.now() }), 'utf8');
  } catch (e) {}

  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (pid > 0 && pid !== process.pid) {
        process.kill(pid, 'SIGTERM');
      }
    } catch (e) {}
    try { fs.unlinkSync(pidFile); } catch (e) {}
  }

  for (const p of [
    path.join(INSTALL_DIR, 'app.asar.patched'),
    path.join(RESOURCES_DIR, 'app.asar.patched')
  ]) {
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (e) {}
    }
  }
}

function unregisterMcpConfigs() {
  const configPaths = [
    path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json'),
    path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json')
  ];
  const cleaned = [];
  for (const cfgPath of configPaths) {
    if (!fs.existsSync(cfgPath)) continue;
    try {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const cfg = JSON.parse(raw);
      if (cfg && cfg.mcpServers && Object.prototype.hasOwnProperty.call(cfg.mcpServers, 'antigravity-features-v2')) {
        if (!isDryRun) {
          delete cfg.mcpServers['antigravity-features-v2'];
          fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
        }
        cleaned.push(cfgPath);
      }
    } catch (e) {}
  }
  return cleaned;
}

function prepareCleanAsar(extraFlags = []) {
  const cleanTempAsar = path.join(os.tmpdir(), `antigravity-clean-restore-${process.pid}-${Date.now()}.asar`);
  const patcherScript = path.join(INSTALL_DIR, 'auto_patcher.cjs');
  const args = [patcherScript, '--unpatch-to', cleanTempAsar, ...extraFlags];
  execSync(`"${process.execPath}" ${args.map(a => `"${a}"`).join(' ')}`, {
    stdio: isFromUi ? 'ignore' : 'inherit',
    windowsHide: true
  });
  if (!fs.existsSync(cleanTempAsar)) {
    throw new Error('Не удалось подготовить чистый архив app.asar для восстановления.');
  }
  return cleanTempAsar;
}

function spawnDetachedFinalizer({ cleanTempAsar, closeAndRelaunchIde }) {
  const workerPath = path.join(os.tmpdir(), `antigravity-uninstall-worker-${process.pid}-${Date.now()}.cjs`);
  const payload = {
    isMac,
    appDir: APP_DIR,
    exePath: EXE_PATH,
    resourcesDir: RESOURCES_DIR,
    asarPath: ASAR_PATH,
    userDataStateFile: USER_DATA_STATE_FILE,
    cleanTempAsar,
    installDir: INSTALL_DIR,
    removeInstallDir: IS_DEFAULT_USER_INSTALL,
    closeAndRelaunchIde
  };

  const workerSource = `
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const cfg = ${JSON.stringify(payload)};

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRunning() {
  try {
    if (cfg.isMac) {
      return execSync('pgrep -f "' + cfg.exePath + '"', { encoding: 'utf8' }).trim().length > 0;
    } else {
      return execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', windowsHide: true }).includes('Antigravity.exe');
    }
  } catch (e) {
    return false;
  }
}

setTimeout(() => {
  const wasRunning = isRunning();
  if (cfg.closeAndRelaunchIde || wasRunning) {
    try {
      if (cfg.isMac) {
        execSync('pkill -f "' + cfg.exePath + '" || killall Antigravity', { stdio: 'ignore' });
      } else {
        execSync('taskkill /F /IM Antigravity.exe /T', { stdio: 'ignore', windowsHide: true });
      }
    } catch (e) {}

    for (let i = 0; i < 20; i++) {
      if (!isRunning()) break;
      sleepMs(400);
    }
    sleepMs(400);
  }

  let restored = false;
  if (fs.existsSync(cfg.cleanTempAsar)) {
    for (let i = 0; i < 15; i++) {
      try {
        fs.copyFileSync(cfg.cleanTempAsar, cfg.asarPath);
        restored = true;
        break;
      } catch (copyErr) {
        try {
          const oldTmp = cfg.asarPath + '.uninstall_old';
          if (fs.existsSync(oldTmp)) { try { fs.unlinkSync(oldTmp); } catch (e) {} }
          fs.renameSync(cfg.asarPath, oldTmp);
          fs.copyFileSync(cfg.cleanTempAsar, cfg.asarPath);
          try { fs.unlinkSync(oldTmp); } catch (e) {}
          restored = true;
          break;
        } catch (e2) {
          sleepMs(500);
        }
      }
    }
    try { fs.unlinkSync(cfg.cleanTempAsar); } catch (e) {}
  }

  for (const extra of ['app.asar.bak', 'app.asar.patched', 'app.asar.old_unpatched', 'app.asar.uninstall_old']) {
    const p = path.join(cfg.resourcesDir, extra);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (e) {}
    }
  }
  if (cfg.userDataStateFile && fs.existsSync(cfg.userDataStateFile)) {
    try { fs.unlinkSync(cfg.userDataStateFile); } catch (e) {}
  }

  if (restored && cfg.isMac && fs.existsSync(cfg.appDir)) {
    try {
      const fwDir = path.join(cfg.appDir, 'Contents', 'Frameworks');
      const elFwDir = path.join(fwDir, 'Electron Framework.framework', 'Versions', 'A');
      try { execSync('codesign --force --sign - "' + path.join(elFwDir, 'Libraries') + '"/*.dylib 2>/dev/null || true', { stdio: 'ignore' }); } catch (e) {}
      try { execSync('codesign --force --sign - "' + path.join(elFwDir, 'Helpers') + '"/* 2>/dev/null || true', { stdio: 'ignore' }); } catch (e) {}
      try { execSync('find "' + fwDir + '" -name "*.framework" -exec codesign --force --sign - {} \\\\; 2>/dev/null || true', { stdio: 'ignore' }); } catch (e) {}
      try { execSync('find "' + fwDir + '" -name "*.app" -exec codesign --force --sign - {} \\\\; 2>/dev/null || true', { stdio: 'ignore' }); } catch (e) {}
      execSync('codesign --force --sign - "' + cfg.appDir + '"', { stdio: 'ignore' });
      try { execSync('xattr -cr "' + cfg.appDir + '"', { stdio: 'ignore' }); } catch (e) {}
    } catch (e) {}
  }

  if (cfg.removeInstallDir && fs.existsSync(cfg.installDir)) {
    for (let i = 0; i < 10; i++) {
      try {
        fs.rmSync(cfg.installDir, { recursive: true, force: true });
        break;
      } catch (e) {
        sleepMs(400);
      }
    }
  } else if (fs.existsSync(cfg.installDir)) {
    for (const rel of [
      'app.asar.patched',
      path.join('backups', 'patch-hash.json'),
      path.join('backups', 'uninstalling.lock'),
      path.join('backups', 'exit-patcher.pid')
    ]) {
      const p = path.join(cfg.installDir, rel);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    }
  }

  if (cfg.closeAndRelaunchIde || wasRunning) {
    try {
      if (cfg.isMac) {
        const c = spawn('open', ['-a', cfg.appDir], { detached: true, stdio: 'ignore' });
        c.unref();
      } else if (fs.existsSync(cfg.exePath)) {
        const c = spawn(cfg.exePath, [], { detached: true, stdio: 'ignore', windowsHide: false });
        c.unref();
      }
    } catch (e) {}
  }

  try { fs.unlinkSync(__filename); } catch (e) {}
  process.exit(0);
}, 350);
`;

  fs.writeFileSync(workerPath, workerSource, 'utf8');
  const child = spawn(process.execPath, [workerPath], {
    cwd: os.tmpdir(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}

function main() {
  if (isDryRun) {
    const forceSurgical = process.argv.includes('--force-surgical-unpatch');
    const cleanTempAsar = prepareCleanAsar(forceSurgical ? ['--force-surgical-unpatch'] : []);
    const buf = fs.readFileSync(cleanTempAsar);
    const hasMarkers = (
      buf.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION') ||
      buf.includes('ANTIGRAVITY TRAY CLICK PATCH') ||
      buf.includes('ANTIGRAVITY WINDOW GEOMETRY PATCH') ||
      buf.includes('ANTIGRAVITY CONTEXT MENU LOCALIZATION PATCH')
    );
    try { fs.unlinkSync(cleanTempAsar); } catch (e) {}
    if (hasMarkers) {
      throw new Error('Dry-run failed: unpatched app.asar still contains patch markers!');
    }
    const wouldCleanMcp = unregisterMcpConfigs();
    console.log(JSON.stringify({
      dryRun: true,
      unpatchClean: true,
      forceSurgical,
      mcpConfigsFound: wouldCleanMcp,
      installDir: INSTALL_DIR,
      wouldRemoveInstallDir: IS_DEFAULT_USER_INSTALL
    }, null, 2));
    return;
  }

  info('[1/3] Отключение фонового патчера и удаление MCP-сервера из mcp_config.json...');
  disarmExitPatcher();
  unregisterMcpConfigs();

  info('[2/3] Подготовка заводского архива app.asar...');
  const cleanTempAsar = prepareCleanAsar();

  info('[3/3] Восстановление оригинальной AntiGravity и очистка файлов...');
  spawnDetachedFinalizer({
    cleanTempAsar,
    closeAndRelaunchIde: isFromUi || isAntigravityRunning()
  });

  if (isFromUi) {
    process.stdout.write(JSON.stringify({ success: true }) + '\n');
  } else {
    info('✅ Русификатор успешно удалён! Заводской интерфейс AntiGravity восстановлен.');
  }
}

try {
  main();
} catch (err) {
  if (isFromUi) {
    process.stdout.write(JSON.stringify({ success: false, error: err.message }) + '\n');
  } else {
    console.error('[ОШИБКА УДАЛЕНИЯ]', err.message);
  }
  process.exit(1);
}
