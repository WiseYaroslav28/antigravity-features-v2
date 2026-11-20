import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import CDP from 'chrome-remote-interface';
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import os from "os";
import { fileURLToPath } from 'url';
import { exec, execSync, spawn } from 'child_process';
import crypto from "crypto";
import { startBackupLoop, runBackupCycle } from "./backup_manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALIZATION_FILE = path.join(__dirname, "localization_injected.js");
const VERSION_FILE = path.join(__dirname, "version.json");
const PACKAGE_FILE = path.join(__dirname, "package.json");
const LOG_FILE = path.join(__dirname, "features_v2.log");
const GEOMETRY_FILE = path.join(__dirname, "backups", "window-geometry.json");

const GITHUB_REPO = "WiseYaroslav28/antigravity-features-v2";
const GITHUB_BRANCH = "main";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}`;

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
const APP_BUNDLE_PATH = isMac ? resolveMacAppBundle() : null;
const ASAR_PATH = isMac
  ? path.join(APP_BUNDLE_PATH, 'Contents', 'Resources', 'app.asar')
  : path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources', 'app.asar');
const HASH_FILE = path.join(__dirname, "backups", "patch-hash.json");
const SETTINGS_FILE = path.join(__dirname, "backups", "settings.json");
const UNINSTALL_LOCK_FILE = path.join(__dirname, "backups", "uninstalling.lock");

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      return { autoUpdate: parsed.autoUpdate !== false };
    }
  } catch (e) {}
  return { autoUpdate: true };
}

function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  } catch (e) {}
  return next;
}

let pendingPatchToApply = false;
let latestRemoteVersion = null;
let lastUpdateCheckAt = null;
let isCheckingUpdate = false;
let versionTransition = null;
let hotUpdateNotice = null;
let lastUiHeartbeatAt = 0;
let lastUiVersion = null;
let cachedLocMeta = { mtimeMs: 0, size: 0, hash: null, content: null };

function getLocalizationFileMeta(includeContent = false) {
  try {
    if (!fs.existsSync(LOCALIZATION_FILE)) return null;
    const st = fs.statSync(LOCALIZATION_FILE);
    if (
      cachedLocMeta.mtimeMs !== st.mtimeMs ||
      cachedLocMeta.size !== st.size ||
      !cachedLocMeta.hash ||
      (includeContent && cachedLocMeta.content === null)
    ) {
      const content = fs.readFileSync(LOCALIZATION_FILE, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
      cachedLocMeta = { mtimeMs: st.mtimeMs, size: st.size, hash, content };
    }
    return includeContent
      ? cachedLocMeta
      : { mtimeMs: cachedLocMeta.mtimeMs, size: cachedLocMeta.size, hash: cachedLocMeta.hash };
  } catch (e) {
    return null;
  }
}

// Silent file-only logger with automatic 512 KB cap (CRITICAL: Never use console.log/error as stdout/stderr corrupts MCP Stdio JSON-RPC)
const MAX_LOG_BYTES = 512 * 1024;
try {
  if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
    const raw = fs.readFileSync(LOG_FILE);
    fs.writeFileSync(LOG_FILE, raw.subarray(Math.max(0, raw.length - 128 * 1024)));
  }
} catch (e) {}
function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [Index] ${msg}\n`);
  } catch (e) {}
}

function getLocalVersionInfo() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
    if (fs.existsSync(PACKAGE_FILE)) {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
      return { version: pkg.version || "2.1.0", changelog: "" };
    }
  } catch (e) {}
  return { version: "2.1.0", changelog: "" };
}

function compareSemver(vA, vB) {
  const cleanA = String(vA || "0.0.0").replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  const cleanB = String(vB || "0.0.0").replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(cleanA.length, cleanB.length); i++) {
    const a = cleanA[i] || 0;
    const b = cleanB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function fetchHttpsText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'User-Agent': 'Antigravity-Features-v2-AutoUpdater'
        },
        timeout: 15000
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchHttpsText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

log(`Starting AntiGravity Features v2 Service (v${getLocalVersionInfo().version})...`);

function spawnExitPatcher(extraArgs = []) {
  const exitPatcherPath = path.join(__dirname, 'exit_patcher.cjs');
  const child = isMac
    ? spawn('/bin/sh', ['-c', 'trap "" TERM HUP INT; exec "$0" "$@"', process.execPath, exitPatcherPath, ...extraArgs], {
        detached: true,
        stdio: 'ignore',
      })
    : spawn(process.execPath, [exitPatcherPath, ...extraArgs], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
  child.unref();
}

// Tiny Local HTTP Control Server for 1-Click UI Restarts & Live Status
const controlServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'X-AG-Loc-Version, X-AG-Loc-Hash');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqPath = (req.url || '/').split('?')[0];

  if (reqPath === '/localization.js') {
    const localInfo = getLocalVersionInfo();
    const meta = getLocalizationFileMeta(true);
    if (!meta || !meta.content) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('localization_injected.js not found');
      return;
    }
    lastUiHeartbeatAt = Date.now();
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-AG-Loc-Version': localInfo.version || '2.2.0',
      'X-AG-Loc-Hash': meta.hash || ''
    });
    res.end(meta.content);
    return;
  }

  if (reqPath === '/status') {
    lastUiHeartbeatAt = Date.now();
    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1:39228');
      const verParam = parsedUrl.searchParams.get('ver');
      if (verParam) lastUiVersion = verParam;
    } catch (e) {}
    const localInfo = getLocalVersionInfo();
    const settings = getSettings();
    const locMeta = getLocalizationFileMeta(false);
    const effectiveRemoteVersion = (latestRemoteVersion && compareSemver(latestRemoteVersion, localInfo.version) >= 0)
      ? latestRemoteVersion
      : localInfo.version;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(JSON.stringify({
      updatePending: pendingPatchToApply,
      asarUnpatched: pendingPatchToApply,
      version: localInfo.version,
      latestRemoteVersion: effectiveRemoteVersion,
      lastUpdateCheckAt,
      versionTransition,
      hotUpdateNotice,
      autoUpdate: settings.autoUpdate !== false,
      localizationHash: locMeta ? locMeta.hash : null,
      hotReloadTransport: 'http',
      httpHotReloadUrl: 'http://127.0.0.1:39228/localization.js'
    }));
    return;
  }

  if (req.url && req.url.startsWith('/set-auto-update')) {
    const enabled = !(req.url.includes('enabled=0') || req.url.includes('enabled=false'));
    const updated = saveSettings({ autoUpdate: enabled });
    log(`[Settings] Auto-update toggled via HTTP UI: ${updated.autoUpdate}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, autoUpdate: updated.autoUpdate }));
    return;
  }

  if (req.url === '/uninstall') {
    log("1-Click Uninstall requested from UI widget! Launching uninstaller.cjs --from-ui...");
    try {
      const uninstallerPath = path.join(__dirname, 'uninstaller.cjs');
      execSync(`"${process.execPath}" "${uninstallerPath}" --from-ui`, { windowsHide: true, stdio: 'ignore' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Uninstalling localization and restarting clean AntiGravity..." }));
    } catch (err) {
      log(`Uninstall error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (req.url === '/dismiss-notice') {
    hotUpdateNotice = null;
    pendingPatchToApply = false;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (req.url && req.url.startsWith('/check-update')) {
    const isForce = req.url.includes('force=1') || req.url.includes('force=true');
    const result = await checkAndApplyGithubUpdate({ force: isForce });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.url === '/restart') {
    log("1-Click Restart requested from UI widget! Launching exit_patcher.cjs --restart...");
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: "Restarting AntiGravity..." }));

    spawnExitPatcher(['--restart']);
    return;
  }

  res.writeHead(404);
  res.end();
});

const IS_HEADLESS_SUBAGENT_CALL = (
  process.env.VITC_DISABLE_UI_LOCALIZER === "1" ||
  process.env.VITC_INTERNAL_CLI_CALL === "1" ||
  process.env.VITC_SUBAGENT_SESSION === "1"
);
let isPrimaryUiInstance = !IS_HEADLESS_SUBAGENT_CALL;

controlServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    isPrimaryUiInstance = false;
  }
  log(`Control HTTP server port 39228 notice: ${err.message}`);
});

if (!IS_HEADLESS_SUBAGENT_CALL) {
  controlServer.listen(39228, '127.0.0.1', () => {
    log("Control HTTP server listening on 127.0.0.1:39228");
  });
}

// Fast SHA-256 hash comparison: verifies if app.asar is already our patched version with zero file scanning
function checkAsarHashAndAutoBuildPatch() {
  try {
    if (fs.existsSync(UNINSTALL_LOCK_FILE)) return;
    if (!fs.existsSync(ASAR_PATH)) return;
    
    let savedHash = null;
    if (fs.existsSync(HASH_FILE)) {
      try {
        savedHash = JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
      } catch(e) {}
    }

    const stats = fs.statSync(ASAR_PATH);
    if (savedHash && savedHash.size === stats.size) {
      pendingPatchToApply = false;
      return;
    }

    const currentBuffer = fs.readFileSync(ASAR_PATH);
    const currentHash = crypto.createHash('sha256').update(currentBuffer).digest('hex');

    if (savedHash && savedHash.sha256 === currentHash) {
      pendingPatchToApply = false;
      return;
    }

    const isAlreadyPatched = currentBuffer.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION');
    if (isAlreadyPatched) {
      pendingPatchToApply = false;
      const patchedPath = path.join(__dirname, 'app.asar.patched');
      if (fs.existsSync(patchedPath)) {
        log(`app.asar already contains localization patch; arming silent exit-patcher to sync latest app.asar.patched on close...`);
        spawnExitPatcher();
      } else {
        rebuildPatchedAsarInBackground(false);
      }
      return;
    }

    // Hash mismatch AND app.asar is unpatched: new Google version detected!
    pendingPatchToApply = true;
    log(`AntiGravity update / clean install detected via SHA-256 mismatch! Rebuilding patch in background (100% hidden)...`);
    rebuildPatchedAsarInBackground(true, true);
  } catch(err) {
    log(`Hash check error: ${err.message}`);
  }
}

function checkCdpPortOpen() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:9222/json/version', { timeout: 1200 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function rebuildPatchedAsarInBackground(markPendingRestart = false, autoRestartIfCdpClosed = false) {
  exec(`"${process.execPath}" "${path.join(__dirname, 'auto_patcher.cjs')}"`, { windowsHide: true }, async (err) => {
    if (err) {
      log(`Auto-patcher error: ${err.message}`);
    } else {
      // Check if auto_patcher.cjs already directly updated resources/app.asar on disk
      let directlyPatched = false;
      try {
        if (fs.existsSync(ASAR_PATH)) {
          const buf = fs.readFileSync(ASAR_PATH);
          directlyPatched = buf.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION');
        }
      } catch (e) {}

      const uiHeartbeatConnected = (Date.now() - lastUiHeartbeatAt) < 15000;
      const cdpOpen = uiHeartbeatConnected ? false : await checkCdpPortOpen();
      const uiConnected = uiHeartbeatConnected || cdpOpen;
      if (directlyPatched && uiConnected) {
        pendingPatchToApply = false;
      } else if (markPendingRestart) {
        pendingPatchToApply = true;
      }

      log(`Auto-patcher built app.asar.patched successfully (directlyPatched=${directlyPatched}, uiConnected=${uiConnected})! Arming silent exit-patcher...`);

      if (autoRestartIfCdpClosed && !uiConnected) {
        // Fresh official AntiGravity update launched without preload localization patch:
        // auto-restart once (with 5-minute cooldown guard) so localization loads immediately
        const cooldownFile = path.join(__dirname, 'backups', 'last-auto-restart.json');
        let canAutoRestart = true;
        try {
          if (fs.existsSync(cooldownFile)) {
            const lastData = JSON.parse(fs.readFileSync(cooldownFile, 'utf8'));
            if (lastData && lastData.timestamp && (Date.now() - lastData.timestamp) < 300000) {
              canAutoRestart = false;
            }
          }
        } catch (e) {}

        if (canAutoRestart) {
          try {
            fs.mkdirSync(path.dirname(cooldownFile), { recursive: true });
            fs.writeFileSync(cooldownFile, JSON.stringify({ timestamp: Date.now() }), 'utf8');
          } catch (e) {}
          log("Fresh IDE update detected with CDP port 9222 closed. Triggering 1-time automatic restart to activate patched app.asar...");
          spawnExitPatcher(['--restart']);
          return;
        }
      }

      spawnExitPatcher();
    }
  });
}

// GitHub Auto-Update Engine (HTTPS Raw + V8 Syntax Validation + Live CDP Hot-Reload)
async function checkAndApplyGithubUpdate({ force = false, checkOnly = false } = {}) {
  if (isCheckingUpdate) {
    return { status: "busy", message: "Update check already in progress" };
  }
  isCheckingUpdate = true;
  try {
    const localInfo = getLocalVersionInfo();
    const localVersion = localInfo.version || "2.1.0";
    const versionUrl = `${GITHUB_RAW_BASE}/version.json?cb=${Date.now()}`;
    const rawVersionJson = await fetchHttpsText(versionUrl);
    const remoteMeta = JSON.parse(rawVersionJson);

    lastUpdateCheckAt = new Date().toISOString();
    const cmp = compareSemver(remoteMeta.version, localVersion);
    latestRemoteVersion = cmp >= 0 ? (remoteMeta.version || localVersion) : localVersion;

    if (cmp < 0 || (cmp === 0 && !force)) {
      log(`[AutoUpdater] Local version v${localVersion} is up to date (GitHub: v${latestRemoteVersion}, cmp=${cmp}).`);
      return {
        status: "up_to_date",
        autoUpdate: getSettings().autoUpdate !== false,
        localVersion,
        remoteVersion: latestRemoteVersion,
        changelog: cmp >= 0 ? (remoteMeta.changelog || "") : (localInfo.changelog || "")
      };
    }

    if (checkOnly && !force) {
      log(`[AutoUpdater] Update v${remoteMeta.version} available on GitHub, but autoUpdate is disabled (checkOnly mode).`);
      return {
        status: "update_available",
        autoUpdate: false,
        localVersion,
        remoteVersion: latestRemoteVersion,
        changelog: remoteMeta.changelog || ""
      };
    }

    log(`[AutoUpdater] New GitHub release detected: v${localVersion} -> v${remoteMeta.version}! Downloading files...`);
    const filesToUpdate = Array.isArray(remoteMeta.files) && remoteMeta.files.length > 0
      ? remoteMeta.files
      : ["localization_injected.js", "auto_patcher.cjs", "index.js", "backup_manager.js", "exit_patcher.cjs", "mac_updater.cjs", "launcher.js"];

    let autoPatcherChanged = false;
    const oldPatcherPath = path.join(__dirname, "auto_patcher.cjs");
    const oldPatcherContent = fs.existsSync(oldPatcherPath) ? fs.readFileSync(oldPatcherPath, "utf8") : "";

    const stagedFiles = [];
    for (const relFile of filesToUpdate) {
      // Prevent path traversal
      const safeRel = path.normalize(relFile).replace(/^(\.\.(\/|\\|$))+/, '');
      const targetPath = path.join(__dirname, safeRel);
      const tmpPath = targetPath.replace(/(\.[^.]+)$/, '.tmp$1');
      const fileUrl = `${GITHUB_RAW_BASE}/${safeRel.replace(/\\/g, '/')}?cb=${Date.now()}`;

      let downloadedContent = await fetchHttpsText(fileUrl);
      if (safeRel.endsWith(".sh")) {
        downloadedContent = downloadedContent.replace(/\r\n/g, "\n");
      } else if (!isMac && (safeRel === "localization_injected.js" || safeRel.endsWith(".bat"))) {
        downloadedContent = downloadedContent.replace(/\r?\n/g, "\r\n");
      }

      // Safeguard for macOS: if downloading system patcher/runner scripts and the remote file does NOT support darwin/macOS,
      // skip overwriting the local macOS-adapted script so we don't regress to Windows-only paths.
      if (isMac && ["auto_patcher.cjs", "index.js", "exit_patcher.cjs", "mac_updater.cjs", "launcher.js", "backup_manager.js"].includes(safeRel)) {
        const hasMacSupport = /process\.platform\s*===\s*['"]darwin['"]/.test(downloadedContent) || downloadedContent.includes("/Applications/Antigravity");
        if (!hasMacSupport) {
          log(`[AutoUpdater] Safeguard: Remote ${safeRel} is Windows-only (lacks macOS support). Keeping local macOS-adapted version.`);
          continue;
        }
      }

      // Safeguard for macOS topbar positioning in localization_injected.js if upstream lacks dynamic syncTopbarPosition
      if (isMac && safeRel === "localization_injected.js" && !downloadedContent.includes("syncTopbarPosition")) {
        downloadedContent = downloadedContent
          .replace(/top:\s*5px;\s*(\r?\n\s*)right:\s*180px;/, "top: 6px;$1right: 210px;");
      }

      fs.writeFileSync(tmpPath, downloadedContent, "utf8");

      // Validate JS/CJS syntax before accepting
      if (safeRel.endsWith(".js") || safeRel.endsWith(".cjs")) {
        try {
          execSync(`"${process.execPath}" --check "${tmpPath}"`, { stdio: "ignore", windowsHide: true });
        } catch (syntaxErr) {
          try { fs.unlinkSync(tmpPath); } catch (e) {}
          throw new Error(`Syntax validation failed for downloaded file ${safeRel}: ${syntaxErr.message}`);
        }
      }

      if (safeRel === "auto_patcher.cjs" && downloadedContent.trim() !== oldPatcherContent.trim()) {
        autoPatcherChanged = true;
      }

      stagedFiles.push({ safeRel, targetPath, tmpPath });
    }

    // All files downloaded & validated — commit atomically
    for (const item of stagedFiles) {
      fs.copyFileSync(item.tmpPath, item.targetPath);
      try { fs.unlinkSync(item.tmpPath); } catch (e) {}
    }

    // Save new version.json and update package.json version
    fs.writeFileSync(VERSION_FILE, JSON.stringify(remoteMeta, null, 2) + "\n", "utf8");
    if (fs.existsSync(PACKAGE_FILE)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
        pkg.version = remoteMeta.version;
        fs.writeFileSync(PACKAGE_FILE, JSON.stringify(pkg, null, 2) + "\n", "utf8");
      } catch (e) {}
    }

    const transition = {
      from: localVersion,
      to: remoteMeta.version,
      changelog: remoteMeta.changelog || "Обновление словаря локализации и системных модулей.",
      updatedAt: new Date().toISOString()
    };
    versionTransition = transition;

    // Immediately hot-reload localization into all open AntiGravity windows via CDP
    await forceHotReloadLocalization();

    // Rebuild app.asar.patched in background and arm exit_patcher
    const needsRestart = !!remoteMeta.requiresRestart || autoPatcherChanged;
    rebuildPatchedAsarInBackground(needsRestart);

    if (!needsRestart) {
      hotUpdateNotice = transition;
    }

    const freshMeta = getLocalizationFileMeta(false);
    log(`[AutoUpdater] Successfully updated v${localVersion} -> v${remoteMeta.version} (needsRestart=${needsRestart}, hash=${freshMeta?.hash || 'none'}).`);
    return {
      status: "updated",
      from: localVersion,
      to: remoteMeta.version,
      changelog: transition.changelog,
      requiresRestart: needsRestart,
      localizationHash: freshMeta ? freshMeta.hash : null
    };
  } catch (err) {
    log(`[AutoUpdater] Check/update error: ${err.message}`);
    return { status: "error", error: err.message };
  } finally {
    isCheckingUpdate = false;
  }
}

// Check ASAR hash on startup silently in background (primary UI instance only)
if (!IS_HEADLESS_SUBAGENT_CALL) {
  checkAsarHashAndAutoBuildPatch();
}

// Initialize MCP Server
const server = new McpServer({
  name: "antigravity-features-v2",
  version: getLocalVersionInfo().version
});

// MCP Tool: Get Status
server.tool(
  "get_features_status",
  "Returns status of AntiGravity v2 Non-Invasive Localization, Version Info, and GitHub Auto-Update Service",
  {},
  async () => {
    const backupDir = path.join(__dirname, "backups");
    let backupFilesCount = 0;
    if (fs.existsSync(backupDir)) {
      try {
        backupFilesCount = fs.readdirSync(backupDir).length;
      } catch (e) {}
    }
    const localInfo = getLocalVersionInfo();
    const locMeta = getLocalizationFileMeta(false);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "running",
              version: localInfo.version,
              latestRemoteVersion: latestRemoteVersion || localInfo.version,
              lastUpdateCheckAt,
              versionTransition,
              updatePending: pendingPatchToApply,
              hotReloadTransport: "http",
              httpHotReloadUrl: "http://127.0.0.1:39228/localization.js",
              localizationHash: locMeta ? locMeta.hash : null,
              uiHeartbeatConnected: (Date.now() - lastUiHeartbeatAt) < 15000,
              lastUiVersion,
              cdpConnected,
              injectedTargetsCount: injectedTargets.size,
              backupFilesCount,
              githubRepo: `https://github.com/${GITHUB_REPO}`,
              autoUpdate: getSettings().autoUpdate !== false,
              autoUpdaterCompatible: true
            },
            null,
            2
          )
        }
      ]
    };
  }
);

// MCP Tool: Toggle Auto-Update
server.tool(
  "set_auto_update",
  "Enables or disables automatic background downloading and installation of localization updates from GitHub",
  {
    enabled: z.boolean().describe("Set true to enable automatic updates from GitHub, false to install updates only manually")
  },
  async ({ enabled }) => {
    const updated = saveSettings({ autoUpdate: !!enabled });
    log(`[Settings] Auto-update toggled via MCP tool: ${updated.autoUpdate}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, autoUpdate: updated.autoUpdate }, null, 2)
        }
      ]
    };
  }
);

// MCP Tool: Check & Apply GitHub Updates
server.tool(
  "check_github_updates",
  "Checks the public GitHub repository for a newer version of AntiGravity localization and automatically downloads & hot-applies it",
  {
    force: z.boolean().optional().describe("Force re-download and re-apply even if version number matches")
  },
  async ({ force }) => {
    const result = await checkAndApplyGithubUpdate({ force: !!force });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// MCP Tool: Force Backup
server.tool(
  "force_backup_sync",
  "Triggers an immediate backup of window state and agent configurations",
  {},
  async () => {
    runBackupCycle();
    return {
      content: [{ type: "text", text: "Backup cycle executed successfully." }]
    };
  }
);

// MCP Tool: Apply Update Patch
server.tool(
  "apply_update_patch",
  "Rebuilds the patched app.asar for the latest AntiGravity update and validates syntax",
  {},
  async () => {
    try {
      execSync(`node "${path.join(__dirname, 'auto_patcher.cjs')}"`, { stdio: 'ignore', windowsHide: true });
      pendingPatchToApply = true;
      return {
        content: [{ type: "text", text: "Patch successfully built and verified for the new AntiGravity version!" }]
      };
    } catch(e) {
      return {
        content: [{ type: "text", text: `Error building update patch: ${e.message}` }]
      };
    }
  }
);

// Graceful termination handlers for MCP on Windows (clean exit with zero child processes spawned on refresh)
if (process.env.VITC_STANDALONE_DAEMON !== "1") {
  process.stdin.on("close", () => {
    log("MCP Stdio connection closed. Exiting process cleanly.");
    process.exit(0);
  });

  process.stdin.on("end", () => {
    log("MCP Stdio connection ended. Exiting process cleanly.");
    process.exit(0);
  });

  // Connect MCP Transport FIRST to establish JSON-RPC handshake immediately
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("MCP Server connected and listening on stdio.");
} else {
  log("Standalone Control HTTP Daemon started on port 39228.");
}

if (isPrimaryUiInstance && !IS_HEADLESS_SUBAGENT_CALL) {
  // Start background config backup loop
  startBackupLoop(30000);

  // Schedule automatic GitHub update checks (10s after boot, then every 30 minutes)
  setTimeout(() => {
    if (isPrimaryUiInstance) {
      const autoUpd = getSettings().autoUpdate !== false;
      checkAndApplyGithubUpdate({ checkOnly: !autoUpd }).catch(() => {});
    }
  }, 10000);

  setInterval(() => {
    if (isPrimaryUiInstance) {
      const autoUpd = getSettings().autoUpdate !== false;
      checkAndApplyGithubUpdate({ checkOnly: !autoUpd }).catch(() => {});
    }
  }, 30 * 60 * 1000);
}

// CDP Injection State
let cdpConnected = false;
let injectedTargets = new Set();

function isAntigravityHubTarget(target) {
  if (!target || target.type !== 'page' || !target.url) return false;
  const u = target.url;
  if (u.startsWith('vscode-file://') || u.startsWith('antigravity-ide://')) return true;
  if (/^https:\/\/(?:127\.0\.0\.1|localhost):\d+\//.test(u)) {
    if (target.title && target.title.includes('Antigravity')) return true;
    if (/^https:\/\/(?:127\.0\.0\.1|localhost):\d+\/(?:c\/|settings|customizations|plugins|projects|automations|sidecars|onboarding)/.test(u)) return true;
  }
  return false;
}

function isAntigravityUiTarget(target) {
  if (!target || !target.url) return false;
  if (isAntigravityHubTarget(target)) return true;
  const u = target.url;
  return u.startsWith('plugin://') || u.startsWith('vscode-webview://');
}

async function forceHotReloadLocalization() {
  try {
    if (!fs.existsSync(LOCALIZATION_FILE)) return;
    const locCode = fs.readFileSync(LOCALIZATION_FILE, 'utf8');
    const wrappedCode = `{\n${locCode}\n}`;

    injectedTargets.clear();
    const targets = await CDP.List({ port: 9222 });
    if (!targets || targets.length === 0) return;

    for (const target of targets) {
      if (!isAntigravityUiTarget(target)) continue;
      let client = null;
      try {
        client = await CDP({ target: target.id, port: 9222 });
        const { Page, Runtime } = client;
        await Page.enable();
        await Runtime.enable();
        await Page.addScriptToEvaluateOnNewDocument({ source: wrappedCode });
        await Runtime.evaluate({ expression: wrappedCode });
        injectedTargets.add(target.id);
        cdpConnected = true;
        log(`[HotReload] Live-updated localization in target: ${target.title} (${target.id})`);
      } catch (e) {
      } finally {
        if (client) {
          try { await client.close(); } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

async function attemptCdpInjection() {
  try {
    const targets = await CDP.List({ port: 9222 });
    if (!targets || targets.length === 0) return;

    const activeIds = new Set(targets.map(t => t.id));
    for (const id of Array.from(injectedTargets)) {
      if (!activeIds.has(id)) injectedTargets.delete(id);
    }

    const localVer = getLocalVersionInfo().version;

    for (const target of targets) {
      if (!isAntigravityUiTarget(target)) continue;
      if (injectedTargets.has(target.id)) continue;

      let client = null;
      try {
        client = await CDP({ target: target.id, port: 9222 });
        const { Page, Runtime } = client;
        await Runtime.enable();

        // Skip redundant injection if native preload.js already booted the exact same local version
        const verCheck = await Runtime.evaluate({
          expression: "document.documentElement ? document.documentElement.getAttribute('data-ag-loc-ver') : null",
          returnByValue: true
        });
        if (verCheck && verCheck.result && verCheck.result.value === localVer) {
          injectedTargets.add(target.id);
          cdpConnected = true;
          continue;
        }

        if (fs.existsSync(LOCALIZATION_FILE)) {
          await Page.enable();
          const locCode = fs.readFileSync(LOCALIZATION_FILE, 'utf8');
          const wrappedCode = `{\n${locCode}\n}`;

          await Page.addScriptToEvaluateOnNewDocument({ source: wrappedCode });
          await Runtime.evaluate({ expression: wrappedCode });

          injectedTargets.add(target.id);
          cdpConnected = true;
          log(`Successfully injected localization into target: ${target.title} (${target.id})`);
        }
      } catch (errTarget) {
        // Target might be transient, ignore quietly
      } finally {
        if (client) {
          try { await client.close(); } catch (e) {}
        }
      }
    }
  } catch (err) {
    // Port 9222 not open yet
    cdpConnected = false;
  }
}

// Optional legacy CDP fallback check once after startup (only when UI HTTP heartbeat isn't active yet, e.g. pre-v2.2.0 transition)
if (!IS_HEADLESS_SUBAGENT_CALL) {
  setTimeout(() => {
    if (!isPrimaryUiInstance) return;
    if ((Date.now() - lastUiHeartbeatAt) < 15000) return;
    attemptCdpInjection();
  }, 4000);
}
