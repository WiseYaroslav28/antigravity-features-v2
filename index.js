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
const ASAR_PATH = path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources', 'app.asar');
const HASH_FILE = path.join(__dirname, "backups", "patch-hash.json");

let pendingPatchToApply = false;
let latestRemoteVersion = null;
let lastUpdateCheckAt = null;
let isCheckingUpdate = false;
let versionTransition = null;
let hotUpdateNotice = null;

// Silent file-only logger (CRITICAL: Never use console.log/error as stdout/stderr corrupts MCP Stdio JSON-RPC)
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

// Tiny Local HTTP Control Server for 1-Click UI Restarts & Live Status
const controlServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/status') {
    const localInfo = getLocalVersionInfo();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      updatePending: pendingPatchToApply,
      version: localInfo.version,
      latestRemoteVersion: latestRemoteVersion || localInfo.version,
      lastUpdateCheckAt,
      versionTransition,
      hotUpdateNotice
    }));
    return;
  }

  if (req.url === '/dismiss-notice') {
    hotUpdateNotice = null;
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
    log("1-Click Restart requested from UI widget! Launching apply_patch_and_restart.bat...");
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: "Restarting AntiGravity..." }));

    const batPath = path.join(__dirname, 'apply_patch_and_restart.bat');
    const child = spawn('powershell', ['-WindowStyle', 'Hidden', '-Command', `Start-Process cmd.exe -ArgumentList '/c ""${batPath}""' -WindowStyle Hidden`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return;
  }

  res.writeHead(404);
  res.end();
});

controlServer.on('error', (err) => {
  log(`Control HTTP server port 39228 notice: ${err.message}`);
});

controlServer.listen(39228, '127.0.0.1', () => {
  log("Control HTTP server listening on 127.0.0.1:39228");
});

// Fast SHA-256 hash comparison: verifies if app.asar is already our patched version with zero file scanning
function checkAsarHashAndAutoBuildPatch() {
  try {
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

    // Hash mismatch: new Google version detected!
    pendingPatchToApply = true;
    log(`AntiGravity update / clean install detected via SHA-256 mismatch! Rebuilding patch in background (100% hidden)...`);
    rebuildPatchedAsarInBackground(true);
  } catch(err) {
    log(`Hash check error: ${err.message}`);
  }
}

function rebuildPatchedAsarInBackground(markPendingRestart = false) {
  exec(`node "${path.join(__dirname, 'auto_patcher.cjs')}"`, { windowsHide: true }, (err) => {
    if (err) {
      log(`Auto-patcher error: ${err.message}`);
    } else {
      if (markPendingRestart) {
        pendingPatchToApply = true;
      }
      log("Auto-patcher built app.asar.patched successfully! Arming silent exit-patcher...");
      
      const exitPatcherPath = path.join(__dirname, 'exit_patcher.cjs');
      const child = spawn('node', [exitPatcherPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    }
  });
}

// GitHub Auto-Update Engine (HTTPS Raw + V8 Syntax Validation + Live CDP Hot-Reload)
async function checkAndApplyGithubUpdate({ force = false } = {}) {
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
    latestRemoteVersion = remoteMeta.version || localVersion;

    const cmp = compareSemver(remoteMeta.version, localVersion);
    if (cmp <= 0 && !force) {
      log(`[AutoUpdater] Local version v${localVersion} is up to date (GitHub: v${remoteMeta.version}).`);
      return {
        status: "up_to_date",
        localVersion,
        remoteVersion: remoteMeta.version,
        changelog: remoteMeta.changelog || ""
      };
    }

    log(`[AutoUpdater] New GitHub release detected: v${localVersion} -> v${remoteMeta.version}! Downloading files...`);
    const filesToUpdate = Array.isArray(remoteMeta.files) && remoteMeta.files.length > 0
      ? remoteMeta.files
      : ["localization_injected.js", "auto_patcher.cjs", "index.js", "backup_manager.js", "exit_patcher.cjs"];

    let autoPatcherChanged = false;
    const oldPatcherPath = path.join(__dirname, "auto_patcher.cjs");
    const oldPatcherContent = fs.existsSync(oldPatcherPath) ? fs.readFileSync(oldPatcherPath, "utf8") : "";

    const stagedFiles = [];
    for (const relFile of filesToUpdate) {
      // Prevent path traversal
      const safeRel = path.normalize(relFile).replace(/^(\.\.(\/|\\|$))+/, '');
      const targetPath = path.join(__dirname, safeRel);
      const tmpPath = `${targetPath}.tmp`;
      const fileUrl = `${GITHUB_RAW_BASE}/${safeRel.replace(/\\/g, '/')}?cb=${Date.now()}`;

      let downloadedContent = await fetchHttpsText(fileUrl);
      if (safeRel === "localization_injected.js" || safeRel.endsWith(".bat")) {
        downloadedContent = downloadedContent.replace(/\r?\n/g, "\r\n");
      }

      fs.writeFileSync(tmpPath, downloadedContent, "utf8");

      // Validate JS/CJS syntax before accepting
      if (safeRel.endsWith(".js") || safeRel.endsWith(".cjs")) {
        try {
          execSync(`node --check "${tmpPath}"`, { stdio: "ignore", windowsHide: true });
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

    log(`[AutoUpdater] Successfully updated v${localVersion} -> v${remoteMeta.version} (needsRestart=${needsRestart}).`);
    return {
      status: "updated",
      from: localVersion,
      to: remoteMeta.version,
      changelog: transition.changelog,
      requiresRestart: needsRestart
    };
  } catch (err) {
    log(`[AutoUpdater] Check/update error: ${err.message}`);
    return { status: "error", error: err.message };
  } finally {
    isCheckingUpdate = false;
  }
}

// Check ASAR hash on startup silently in background
checkAsarHashAndAutoBuildPatch();

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
              cdpConnected,
              injectedTargetsCount: injectedTargets.size,
              backupFilesCount,
              githubRepo: `https://github.com/${GITHUB_REPO}`,
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

// Start background config backup loop
startBackupLoop(30000);

// Schedule automatic GitHub update checks (10s after boot, then every 30 minutes)
setTimeout(() => {
  checkAndApplyGithubUpdate().catch(() => {});
}, 10000);

setInterval(() => {
  checkAndApplyGithubUpdate().catch(() => {});
}, 30 * 60 * 1000);

// CDP Injection State
let cdpConnected = false;
let injectedTargets = new Set();

async function trackAndSaveWindowGeometry() {
  try {
    const targets = await CDP.List({ port: 9222 });
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) return;

    const client = await CDP({ target: pageTarget.id, port: 9222 });
    const { Runtime } = client;
    const res = await Runtime.evaluate({
      expression: 'JSON.stringify({ x: window.screenX, y: window.screenY, width: window.outerWidth, height: window.outerHeight, isMaximized: (window.outerWidth >= window.screen.availWidth && window.outerHeight >= window.screen.availHeight) })'
    });
    if (res && res.result && res.result.value) {
      const bounds = JSON.parse(res.result.value);
      if (bounds.width > 300 && bounds.height > 300) {
        const backupDir = path.join(__dirname, "backups");
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        fs.writeFileSync(GEOMETRY_FILE, JSON.stringify(bounds, null, 2), 'utf8');
      }
    }
    await client.close();
  } catch(e) {}
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
      if (target.type === 'page' || target.type === 'iframe' || (target.title && target.title.includes('Antigravity'))) {
        try {
          const client = await CDP({ target: target.id, port: 9222 });
          const { Page, Runtime } = client;
          await Page.enable();
          await Runtime.enable();
          await Page.addScriptToEvaluateOnNewDocument({ source: wrappedCode });
          await Runtime.evaluate({ expression: wrappedCode });
          injectedTargets.add(target.id);
          cdpConnected = true;
          log(`[HotReload] Live-updated localization in target: ${target.title} (${target.id})`);
          await client.close();
        } catch (e) {}
      }
    }
  } catch (e) {}
}

async function attemptCdpInjection() {
  try {
    const targets = await CDP.List({ port: 9222 });
    if (!targets || targets.length === 0) return;

    for (const target of targets) {
      if (target.type === 'page' || target.type === 'iframe' || (target.title && target.title.includes('Antigravity'))) {
        if (injectedTargets.has(target.id)) continue;

        try {
          const client = await CDP({ target: target.id, port: 9222 });
          const { Page, Runtime } = client;
          await Page.enable();
          await Runtime.enable();

          if (fs.existsSync(LOCALIZATION_FILE)) {
            const locCode = fs.readFileSync(LOCALIZATION_FILE, 'utf8');
            const wrappedCode = `{\n${locCode}\n}`;
            
            // 1. Inject for future navigation/loads
            await Page.addScriptToEvaluateOnNewDocument({ source: wrappedCode });

            // 2. Evaluate immediately on currently open document
            await Runtime.evaluate({ expression: wrappedCode });

            injectedTargets.add(target.id);
            cdpConnected = true;
            log(`Successfully injected localization into target: ${target.title} (${target.id})`);
          }

          client.on('disconnect', () => {
            injectedTargets.delete(target.id);
          });
        } catch (errTarget) {
          // Target might be transient, ignore quietly
        }
      }
    }
  } catch (err) {
    // Port 9222 not open yet
    cdpConnected = false;
  }
}

// Background periodic loop: check CDP and save geometry
setInterval(() => {
  attemptCdpInjection();
  trackAndSaveWindowGeometry();
}, 5000);
