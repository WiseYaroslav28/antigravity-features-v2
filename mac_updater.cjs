const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync, spawnSync, spawn } = require('child_process');

// Константы официальной подписи Google LLC для Google AntiGravity на macOS
const EXPECTED_BUNDLE_ID = 'com.google.antigravity';
const EXPECTED_TEAM_ID = 'EQHXZ8M8AV';
const EXPECTED_AUTHORITY = 'Developer ID Application: Google LLC (EQHXZ8M8AV)';
const EXPECTED_ROOT_AUTHORITY = 'Apple Root CA';

const LOG_FILE = path.join(__dirname, 'features_v2.log');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const PID_FILE = path.join(BACKUPS_DIR, 'mac-updater.pid');
const UNINSTALL_LOCK_FILE = path.join(BACKUPS_DIR, 'uninstalling.lock');
const DEFAULT_PENDING_DIR = path.join(os.homedir(), 'Library', 'Caches', 'com.google.antigravity', 'pending');

function log(msg) {
  const line = `[${new Date().toISOString()}] [MacUpdater] ${msg}`;
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {}
  if (process.stdout && process.stdout.writable) {
    try {
      process.stdout.write(line + '\n');
    } catch (e) {}
  }
}

function resolveMacAppBundle(explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);
  if (process.env.AG_APP_BUNDLE && fs.existsSync(process.env.AG_APP_BUNDLE)) {
    return path.resolve(process.env.AG_APP_BUNDLE);
  }
  const candidates = [
    '/Applications/Antigravity.app',
    '/Applications/Antigravity IDE.app',
    path.join(os.homedir(), 'Applications', 'Antigravity.app'),
    path.join(os.homedir(), 'Applications', 'Antigravity IDE.app'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || '/Applications/Antigravity.app';
}

function parseArgs(argv) {
  const opts = {
    zip: null,
    appBundle: null,
    pid: null,
    version: null,
    sha512: null,
    verifyOnly: false,
    noRelaunch: false,
    skipPatch: false,
    noCleanupPending: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--zip' && argv[i + 1]) opts.zip = argv[++i];
    else if (arg === '--app-bundle' && argv[i + 1]) opts.appBundle = argv[++i];
    else if (arg === '--pid' && argv[i + 1]) opts.pid = parseInt(argv[++i], 10);
    else if (arg === '--version' && argv[i + 1]) opts.version = argv[++i];
    else if (arg === '--sha512' && argv[i + 1]) opts.sha512 = argv[++i];
    else if (arg === '--verify-only') opts.verifyOnly = true;
    else if (arg === '--no-relaunch') opts.noRelaunch = true;
    else if (arg === '--skip-patch') opts.skipPatch = true;
    else if (arg === '--no-cleanup-pending') opts.noCleanupPending = true;
  }
  return opts;
}

function acquireLock() {
  if (fs.existsSync(UNINSTALL_LOCK_FILE)) {
    log('Обнаружен uninstalling.lock — прерываем установку обновления.');
    return false;
  }
  if (fs.existsSync(PID_FILE)) {
    try {
      const existingPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (existingPid > 0 && existingPid !== process.pid) {
        process.kill(existingPid, 0);
        log(`Уже запущен экземпляр MacUpdater (PID ${existingPid}), выходим.`);
        return false;
      }
    } catch (e) {
      // Старый процесс уже завершён — можно занять lock
    }
  }
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
  } catch (e) {}
  return true;
}

function releaseLock() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (pid === process.pid) fs.unlinkSync(PID_FILE);
    }
  } catch (e) {}
}

/**
 * Находит скачанный .zip обновления и (при наличии) ожидаемый SHA-512 из update-info.json.
 */
function resolvePendingZip(opts) {
  let zipPath = opts.zip ? path.resolve(opts.zip) : null;
  let expectedSha512 = opts.sha512 || null;

  const infoDir = zipPath ? path.dirname(zipPath) : DEFAULT_PENDING_DIR;
  const updateInfoPath = path.join(infoDir, 'update-info.json');

  if (fs.existsSync(updateInfoPath)) {
    try {
      const info = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));
      if (!zipPath && info.fileName) {
        zipPath = path.join(infoDir, path.basename(info.fileName));
      }
      if (!expectedSha512 && typeof info.sha512 === 'string' && info.sha512.length > 0) {
        expectedSha512 = info.sha512;
      }
    } catch (e) {
      log(`Предупреждение: не удалось прочитать ${updateInfoPath}: ${e.message}`);
    }
  }

  if (!zipPath) {
    const fallbackZip = path.join(DEFAULT_PENDING_DIR, 'Antigravity.zip');
    if (fs.existsSync(fallbackZip)) zipPath = fallbackZip;
  }

  return { zipPath, expectedSha512, updateInfoPath };
}

/**
 * Вычисляет SHA-512 файла чанками по 4 МБ без загрузки всего архива в память.
 */
function computeFileSha512Base64(filePath) {
  const hash = crypto.createHash('sha512');
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.allocUnsafe(4 * 1024 * 1024);
  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(bytesRead === buf.length ? buf : buf.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('base64');
}

/**
 * Извлекает .zip через системный ditto (сохраняет симлинки фреймворков и атрибуты подписи macOS).
 */
function extractZipBundle(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  execFileSync('ditto', ['-xk', zipPath, extractDir], { stdio: 'pipe' });

  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  const preferred = entries.find((e) => e.isDirectory() && e.name === 'Antigravity.app');
  const anyApp = entries.find((e) => e.isDirectory() && e.name.endsWith('.app'));
  const appEntry = preferred || anyApp;
  if (!appEntry) {
    throw new Error(`В архиве ${zipPath} не найден .app бандл`);
  }
  return path.join(extractDir, appEntry.name);
}

/**
 * Строгая проверка официальной подписи Google LLC перед заменой приложения:
 * 1) codesign --verify --deep --strict (целостность всего бандла и фреймворков)
 * 2) codesign -dv --verbose=4 (Bundle ID, TeamIdentifier=EQHXZ8M8AV, Google LLC и цепочка Apple Root CA)
 */
function verifyOfficialGoogleSignature(appPath) {
  const verifyRes = spawnSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], {
    encoding: 'utf8',
  });
  if (verifyRes.status !== 0) {
    const details = (verifyRes.stderr || verifyRes.stdout || '').trim();
    throw new Error(`codesign --verify --deep --strict завершился с кодом ${verifyRes.status}: ${details}`);
  }

  const infoRes = spawnSync('codesign', ['-dv', '--verbose=4', appPath], {
    encoding: 'utf8',
  });
  if (infoRes.status !== 0) {
    const details = (infoRes.stderr || infoRes.stdout || '').trim();
    throw new Error(`codesign -dv завершился с кодом ${infoRes.status}: ${details}`);
  }

  const rawOutput = `${infoRes.stdout || ''}\n${infoRes.stderr || ''}`;
  const lines = rawOutput.split(/\r?\n/).map((l) => l.trim());

  const identifierLine = lines.find((l) => l.startsWith('Identifier='));
  const teamLine = lines.find((l) => l.startsWith('TeamIdentifier='));
  const authorities = lines
    .filter((l) => l.startsWith('Authority='))
    .map((l) => l.slice('Authority='.length));

  const identifier = identifierLine ? identifierLine.slice('Identifier='.length) : '';
  const teamId = teamLine ? teamLine.slice('TeamIdentifier='.length) : '';

  if (identifier !== EXPECTED_BUNDLE_ID) {
    throw new Error(`Неверный Identifier подписи: "${identifier}" (ожидался "${EXPECTED_BUNDLE_ID}")`);
  }
  if (teamId !== EXPECTED_TEAM_ID) {
    throw new Error(`Неверный TeamIdentifier: "${teamId}" (ожидался Google LLC "${EXPECTED_TEAM_ID}")`);
  }
  if (!authorities.includes(EXPECTED_AUTHORITY)) {
    throw new Error(`Отсутствует официальный сертификат "${EXPECTED_AUTHORITY}". Найдено: ${authorities.join(' -> ')}`);
  }
  if (!authorities.includes(EXPECTED_ROOT_AUTHORITY)) {
    throw new Error(`Цепочка доверия не доходит до "${EXPECTED_ROOT_AUTHORITY}". Найдено: ${authorities.join(' -> ')}`);
  }

  let bundleVersion = null;
  try {
    const plistPath = path.join(appPath, 'Contents', 'Info.plist');
    bundleVersion = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', plistPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (e) {}

  log(`Подпись Google LLC подтверждена: Identifier=${identifier}, TeamIdentifier=${teamId}, Authority="${EXPECTED_AUTHORITY}"${bundleVersion ? `, версия=${bundleVersion}` : ''}`);
  return { identifier, teamId, authorities, bundleVersion };
}

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function isAppRunning(targetPid, exePath) {
  if (isPidAlive(targetPid)) return true;
  const res = spawnSync('pgrep', ['-f', exePath], { encoding: 'utf8' });
  return res.status === 0 && (res.stdout || '').trim().length > 0;
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForAppExit(targetPid, exePath, timeoutMs = 30000) {
  const start = Date.now();
  const deadline = start + timeoutMs;
  const sigtermThreshold = start + Math.min(15000, Math.floor(timeoutMs / 2));
  let sigtermSent = false;

  while (Date.now() < deadline) {
    if (!isAppRunning(targetPid, exePath)) {
      // Короткая пауза, чтобы дочерние процессы (Antigravity Helper, language_server) освободили дескрипторы
      sleepMs(400);
      return true;
    }
    if (!sigtermSent && Date.now() >= sigtermThreshold && targetPid && isPidAlive(targetPid)) {
      sigtermSent = true;
      log(`Штатное закрытие заняло >15 с; отправляем мягкий SIGTERM процессу PID ${targetPid}...`);
      try {
        process.kill(targetPid, 'SIGTERM');
      } catch (e) {}
    }
    sleepMs(300);
  }
  return !isAppRunning(targetPid, exePath);
}

function replaceAppBundleAtomically(extractedApp, targetAppDir) {
  const parentDir = path.dirname(targetAppDir);
  fs.accessSync(parentDir, fs.constants.W_OK);

  const backupDir = `${targetAppDir}.prev_backup`;
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }

  const hadExisting = fs.existsSync(targetAppDir);
  if (hadExisting) {
    fs.renameSync(targetAppDir, backupDir);
  }

  try {
    try {
      fs.renameSync(extractedApp, targetAppDir);
    } catch (renameErr) {
      if (renameErr && renameErr.code === 'EXDEV') {
        execFileSync('ditto', [extractedApp, targetAppDir], { stdio: 'pipe' });
      } else {
        throw renameErr;
      }
    }
  } catch (installErr) {
    log(`Ошибка замены ${targetAppDir}: ${installErr.message}. Выполняем откат...`);
    try {
      if (fs.existsSync(targetAppDir)) {
        fs.rmSync(targetAppDir, { recursive: true, force: true });
      }
      if (hadExisting && fs.existsSync(backupDir)) {
        fs.renameSync(backupDir, targetAppDir);
        log('Откат к предыдущей версии AntiGravity выполнен успешно.');
      }
    } catch (rollbackErr) {
      log(`КРИТИЧЕСКАЯ ОШИБКА при откате: ${rollbackErr.message}`);
    }
    throw installErr;
  }

  return backupDir;
}

function relaunchAntigravity(targetAppDir) {
  log(`Запускаем обновлённый AntiGravity: open -a "${targetAppDir}"`);
  const child = spawn('open', ['-a', targetAppDir], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function main() {
  if (process.platform !== 'darwin') {
    log('Скрипт mac_updater.cjs предназначен только для macOS (darwin).');
    process.exit(0);
  }

  const opts = parseArgs(process.argv.slice(2));
  if (!opts.verifyOnly && !acquireLock()) {
    process.exit(0);
  }

  const targetAppDir = resolveMacAppBundle(opts.appBundle);
  const exePath = path.join(targetAppDir, 'Contents', 'MacOS', 'Antigravity');
  const extractDir = path.join(os.tmpdir(), `antigravity_mac_update_${process.pid}_${Date.now()}`);

  try {
    const { zipPath, expectedSha512, updateInfoPath } = resolvePendingZip(opts);
    if (!zipPath || !fs.existsSync(zipPath)) {
      throw new Error(`Архив обновления не найден: ${zipPath || DEFAULT_PENDING_DIR}`);
    }

    log(`Старт обновления macOS${opts.version ? ` до v${opts.version}` : ''} из ${zipPath} -> ${targetAppDir}`);

    // 1. Проверка целостности .zip по SHA-512 (если доступен хэш)
    if (expectedSha512) {
      const actualSha512 = computeFileSha512Base64(zipPath);
      if (actualSha512 !== expectedSha512) {
        throw new Error(`Несовпадение SHA-512 для ${zipPath}: получен ${actualSha512}, ожидался ${expectedSha512}`);
      }
      log('Проверка SHA-512 архива обновления пройдена.');
    } else {
      log('Предупреждение: SHA-512 не найден, полагаемся на строгую проверку подписи codesign Google LLC.');
    }

    // 2. Распаковка во временную директорию
    log(`Распаковка архива во временную папку ${extractDir}...`);
    const extractedApp = extractZipBundle(zipPath, extractDir);

    // 3. Строгая проверка официального сертификата Google LLC
    const sigInfo = verifyOfficialGoogleSignature(extractedApp);

    if (opts.verifyOnly) {
      log(`Режим --verify-only: все проверки пройдены (v${sigInfo.bundleVersion || 'unknown'}).`);
      return;
    }

    // 4. Ожидание завершения AntiGravity
    log(`Ожидаем завершения AntiGravity${opts.pid ? ` (PID ${opts.pid})` : ''}...`);
    const exited = waitForAppExit(opts.pid, exePath, 30000);
    if (!exited) {
      throw new Error('AntiGravity не завершился в течение 30 секунд; отменяем замену, чтобы не повредить запущенное приложение.');
    }

    // 5. Атомарная замена бандла с откатом при ошибке
    log(`Выполняем замену ${targetAppDir}...`);
    const backupDir = replaceAppBundleAtomically(extractedApp, targetAppDir);
    log(`Бандл ${targetAppDir} успешно обновлён до v${sigInfo.bundleVersion || opts.version || 'latest'}.`);

    // 6. Повторное применение русификации и переподпись бандла через auto_patcher.cjs
    if (!opts.skipPatch) {
      const autoPatcherPath = path.join(__dirname, 'auto_patcher.cjs');
      if (fs.existsSync(autoPatcherPath)) {
        log('Запускаем auto_patcher.cjs для автоматического перепатчивания новой версии...');
        try {
          execFileSync(process.execPath, [autoPatcherPath], {
            env: { ...process.env, AG_APP_BUNDLE: targetAppDir },
            encoding: 'utf8',
            stdio: 'pipe',
          });
          log('auto_patcher.cjs успешно перепатчил и подписал обновлённый AntiGravity!');
        } catch (patchErr) {
          const stderr = patchErr.stderr ? String(patchErr.stderr).trim() : '';
          log(`Предупреждение: auto_patcher.cjs завершился с ошибкой (${patchErr.message}). ${stderr}`);
          log('Новая официальная версия AntiGravity сохранена без русификации, чтобы IDE гарантированно запустилась.');
        }
      } else {
        log(`Предупреждение: ${autoPatcherPath} не найден, пропускаем перепатчивание.`);
      }
    }

    // 7. Удаляем временный бэкап предыдущей версии и очищаем pending-кэш
    if (backupDir && fs.existsSync(backupDir)) {
      try {
        fs.rmSync(backupDir, { recursive: true, force: true });
      } catch (e) {
        log(`Предупреждение: не удалось удалить ${backupDir}: ${e.message}`);
      }
    }

    if (!opts.noCleanupPending) {
      const pendingNorm = path.resolve(DEFAULT_PENDING_DIR);
      const zipNorm = path.resolve(zipPath);
      if (zipNorm.startsWith(pendingNorm + path.sep)) {
        try { fs.unlinkSync(zipNorm); } catch (e) {}
        try {
          if (fs.existsSync(updateInfoPath)) fs.unlinkSync(updateInfoPath);
        } catch (e) {}
        log('Кэш pending-обновления очищен.');
      }
      // Очистка осиротевших временных папок update.* в кэше Squirrel.Mac (ShipIt)
      const shipItDir = path.join(os.homedir(), 'Library', 'Caches', 'com.google.antigravity.ShipIt');
      if (fs.existsSync(shipItDir)) {
        try {
          for (const entry of fs.readdirSync(shipItDir)) {
            if (entry.startsWith('update.')) {
              fs.rmSync(path.join(shipItDir, entry), { recursive: true, force: true });
            }
          }
        } catch (e) {}
      }
    }

    // 8. Перезапуск AntiGravity
    if (!opts.noRelaunch) {
      relaunchAntigravity(targetAppDir);
    }
  } catch (err) {
    log(`ОШИБКА обновления macOS: ${err.message}`);
    process.exitCode = 1;
  } finally {
    try {
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
    } catch (e) {}
    if (!opts.verifyOnly) releaseLock();
  }
}

main();
