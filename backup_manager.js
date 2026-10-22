import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_PROFILE = process.env.USERPROFILE || process.env.HOME || os.homedir();
const APPDATA_ROAMING = path.join(USER_PROFILE, 'AppData', 'Roaming', 'Antigravity');
const CONFIG_DIR = path.join(USER_PROFILE, '.gemini', 'config');
const PROJECTS_DIR = path.join(CONFIG_DIR, 'projects');
const BACKUP_DIR = path.join(__dirname, 'backups');
const LOG_FILE = path.join(__dirname, 'features_v2.log');

function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [BackupManager] ${msg}\n`);
  } catch (e) {}
}

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function isValidJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content || content.trim().length === 0) return false;
    JSON.parse(content);
    return true;
  } catch (e) {
    return false;
  }
}

function backupFile(sourcePath, backupSubPath) {
  try {
    if (!isValidJson(sourcePath)) return false;
    const targetPath = path.join(BACKUP_DIR, backupSubPath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    let needsBackup = true;
    if (fs.existsSync(targetPath)) {
      const targetContent = fs.readFileSync(targetPath, 'utf8');
      if (sourceContent === targetContent) {
        needsBackup = false;
      }
    }

    if (needsBackup) {
      fs.writeFileSync(targetPath, sourceContent, 'utf8');
      log(`Backed up ${backupSubPath}`);
    }
    return true;
  } catch (e) {
    log(`Error backing up ${sourcePath}: ${e.message}`);
    return false;
  }
}

function restoreFileIfCorrupted(sourcePath, backupSubPath) {
  try {
    const targetPath = path.join(BACKUP_DIR, backupSubPath);
    if (!fs.existsSync(targetPath)) return false;
    if (!isValidJson(targetPath)) return false;

    // If source file does not exist or is corrupted, restore it
    if (!isValidJson(sourcePath)) {
      const sourceDir = path.dirname(sourcePath);
      if (!fs.existsSync(sourceDir)) {
        fs.mkdirSync(sourceDir, { recursive: true });
      }
      const backupContent = fs.readFileSync(targetPath, 'utf8');
      fs.writeFileSync(sourcePath, backupContent, 'utf8');
      log(`RESTORED corrupted/missing file: ${sourcePath} from ${backupSubPath}`);
      return true;
    }
  } catch (e) {
    log(`Error restoring ${sourcePath}: ${e.message}`);
  }
  return false;
}

export function runBackupCycle() {
  // 1. Backup Window State only (Local Machine)
  const windowStateFiles = [
    path.join(APPDATA_ROAMING, 'antigravity-window-state.json'),
    path.join(APPDATA_ROAMING, 'window-state.json')
  ];
  windowStateFiles.forEach((f) => backupFile(f, path.basename(f)));
}

export function restoreAllOnBoot() {
  log('Running boot restoration check...');
  
  // Restore window state if missing
  restoreFileIfCorrupted(path.join(APPDATA_ROAMING, 'antigravity-window-state.json'), 'antigravity-window-state.json');
  restoreFileIfCorrupted(path.join(APPDATA_ROAMING, 'window-state.json'), 'window-state.json');
}

export function startBackupLoop(intervalMs = 30000) {
  restoreAllOnBoot();
  runBackupCycle();
  return setInterval(() => {
    runBackupCycle();
  }, intervalMs);
}

