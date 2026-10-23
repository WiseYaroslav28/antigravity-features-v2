const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const asar = require('@electron/asar');

const username = process.env.USERNAME || process.env.USER;
const resourcesDir = path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources');
const asarPath = path.join(resourcesDir, 'app.asar');
const tempDir = path.join(__dirname, 'temp_patcher_asar');
const localizationFile = path.join(__dirname, 'localization_injected.js');

async function runPatch() {
    try {
        console.log('[AutoPatcher-v2] Inspecting app.asar via native JS...');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        // Pure JS Extraction (Zero cmd.exe / Zero console windows)
        asar.extractAll(asarPath, tempDir);

        // 1. PATCH PRELOAD.JS (Inject Localization & UI Controls natively into Chromium)
        const preloadExtracted = path.join(tempDir, 'dist', 'preload.js');
        if (fs.existsSync(preloadExtracted) && fs.existsSync(localizationFile)) {
            let preloadContent = fs.readFileSync(preloadExtracted, 'utf8');
            const beginMarker = '// BEGIN ANTIGRAVITY TRANSLATION INJECTION';
            if (preloadContent.includes(beginMarker)) {
                preloadContent = preloadContent.substring(0, preloadContent.indexOf(beginMarker)).trim();
            }
            if (!preloadContent.includes('ANTIGRAVITY PRELOAD CONTEXT MENU TRANSLATE')) {
                preloadContent = preloadContent.replace(
                    /showContextMenu:\s*\(items\)\s*=>\s*electron_1\.ipcRenderer\.invoke\('window:show-context-menu',\s*items\),/,
                    `showContextMenu: (items) => {
        // ANTIGRAVITY PRELOAD CONTEXT MENU TRANSLATE
        const ctxMap = {
            'cut': 'Вырезать', 'copy': 'Копировать', 'paste': 'Вставить', 'paste as plain text': 'Вставить как обычный текст', 'select all': 'Выделить всё', 'undo': 'Отменить', 'redo': 'Повторить', 'delete': 'Удалить', 'copy link': 'Копировать ссылку', 'copy link address': 'Копировать адрес ссылки', 'open link': 'Открыть ссылку', 'inspect element': 'Исследовать элемент', 'inspect': 'Исследовать элемент',
            'close tab': 'Закрыть вкладку', 'split conversation horizontally': 'Разделить диалог по горизонтали', 'split conversation vertically': 'Разделить диалог по вертикали', 'open conversation history': 'Открыть историю диалогов',
            'unpin this conversation': 'Открепить этот диалог', 'unpin conversation': 'Открепить диалог', 'pin this conversation': 'Закрепить этот диалог', 'pin conversation': 'Закрепить диалог',
            'rename this conversation': 'Переименовать этот диалог', 'archive this conversation': 'Архивировать этот диалог', 'copy conversation markdown': 'Копировать Markdown диалога', 'find in conversation': 'Найти в диалоге',
            'new terminal tab': 'Новая вкладка терминала', 'split terminal': 'Разделить терминал', 'next aux pane tab': 'Следующая вкладка вспомогательной панели', 'previous aux pane tab': 'Предыдущая вкладка вспомогательной панели',
            'download diagnostics': 'Скачать диагностику', 'toggle between light/dark themes': 'Переключить светлую/тёмную тему', 'open command palette': 'Открыть палитру команд', 'open project picker': 'Открыть выбор проекта',
            'open keyboard shortcuts': 'Открыть сочетания клавиш', 'collapse all folders': 'Свернуть все папки', 'expand all folders': 'Развернуть все папки',
            'see plans': 'Посмотреть тарифы', 'enable overages': 'Включить перерасход', 'enable ai credit overages': 'Включить оплату перерасхода (AI Credit)'
        };
        const mapItems = (arr) => Array.isArray(arr) ? arr.map(i => {
            const c = Object.assign({}, i);
            if (c.label && typeof c.label === 'string') c.label = ctxMap[c.label.trim().toLowerCase()] || c.label;
            if (Array.isArray(c.submenu)) c.submenu = mapItems(c.submenu);
            return c;
        }) : arr;
        return electron_1.ipcRenderer.invoke('window:show-context-menu', mapItems(items));
    },`
                );
            }
            const localizationCode = fs.readFileSync(localizationFile, 'utf8');
            const injectionCode = `
// BEGIN ANTIGRAVITY TRANSLATION INJECTION
if (!window.__antigravity_translation_initialized) {
    window.__antigravity_translation_initialized = true;
    try {
        ${localizationCode}
        window.__antigravity_translation_success = true;
    } catch(e) {
        console.error("Localization Error:", e);
    }
}
// END ANTIGRAVITY TRANSLATION INJECTION
`;
            fs.writeFileSync(preloadExtracted, preloadContent + '\n' + injectionCode, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/preload.js with full localization & update widget!');
        }

        // 2. PATCH TRAY.JS (Fix Left-Click & Double-Click on Tray Icon safely)
        const trayExtracted = path.join(tempDir, 'dist', 'tray.js');
        if (fs.existsSync(trayExtracted)) {
            let trayContent = fs.readFileSync(trayExtracted, 'utf8');
            if (!trayContent.includes('ANTIGRAVITY TRAY CLICK PATCH')) {
                trayContent = trayContent.replace(
                    /tray\.setContextMenu\(contextMenu\);/,
                    `tray.setContextMenu(contextMenu);
    // ANTIGRAVITY TRAY CLICK PATCH
    const handleTrayClick = () => {
        if (Array.isArray(actions)) {
            const openAction = actions.find(a => a && a.label && String(a.label).includes('Open')) || actions[2];
            if (openAction && typeof openAction.click === 'function') {
                openAction.click();
                return;
            }
        }
        const wins = electron_1.BrowserWindow.getAllWindows();
        if (wins.length > 0) {
            if (wins[0].isMinimized()) wins[0].restore();
            wins[0].show();
            wins[0].focus();
        }
    };
    tray.on('click', handleTrayClick);
    tray.on('double-click', handleTrayClick);`
                );
            }
            trayContent = trayContent.replace(
                /\(count > 0 \? `\$\{count\}` : 'No'\) \+\s*' agent' \+\s*\(count === 1 \? '' : 's'\) \+\s*' running'/,
                `(count > 0 ? (count + (count % 10 === 1 && count % 100 !== 11 ? ' активный агент' : (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? ' активных агента' : ' активных агентов'))) : 'Нет запущенных агентов')`
            );
            fs.writeFileSync(trayExtracted, trayContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/tray.js for left-click/double-click & localization!');
        }

        // 3. PATCH MAIN.JS (Fix Desktop/Taskbar Shortcut Re-launch when window is closed to tray & Localize Menu)
        const mainExtracted = path.join(tempDir, 'dist', 'main.js');
        if (fs.existsSync(mainExtracted)) {
            let mainContent = fs.readFileSync(mainExtracted, 'utf8');
            if (!mainContent.includes('ANTIGRAVITY SECOND INSTANCE TRAY PATCH')) {
                mainContent = mainContent.replace(
                    /electron_1\.app\.on\('second-instance',\s*\(event,\s*commandLine\)\s*=>\s*\{[\s\S]*?if\s*\(wins\.length\s*>\s*0\)\s*\{[\s\S]*?electron_1\.app\.focus\(\{\s*steal:\s*true\s*\}\);\s*\}/,
                    `electron_1.app.on('second-instance', (event, commandLine) => {
    // ANTIGRAVITY SECOND INSTANCE TRAY PATCH
    const wins = electron_1.BrowserWindow.getAllWindows();
    if (wins.length > 0) {
        if (wins[0].isMinimized()) {
            wins[0].restore();
        }
        wins[0].show();
        wins[0].focus();
        electron_1.app.focus({ steal: true });
    } else {
        (0, utils_1.showOrCreateWindow)((0, languageServer_1.getLsPort)());
    }`
                );
            }
            mainContent = mainContent.replace(/label:\s*['"]No agents running['"],/g, "label: 'Нет запущенных агентов',");
            mainContent = mainContent.replace(/label:\s*`Open \${electron_1\.app\.getName\(\)}`,/g, "label: `Открыть ${electron_1.app.getName()}`,");
            mainContent = mainContent.replace(/label:\s*['"]Quit['"],/g, "label: 'Выход',");
            mainContent = mainContent.replace(/appendSwitch\(['"]remote-debugging-port['"],\s*['"]0['"]\)/g, "appendSwitch('remote-debugging-port', '9222')");
            fs.writeFileSync(mainExtracted, mainContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/main.js for second-instance shortcut re-launch & menu!');
        }

        // 4. PATCH UTILS.JS (Fix Geometry & Maximized State Restoration on Monitor 2)
        const utilsExtracted = path.join(tempDir, 'dist', 'utils.js');
        if (fs.existsSync(utilsExtracted)) {
            let utilsContent = fs.readFileSync(utilsExtracted, 'utf8');
            if (!utilsContent.includes('ANTIGRAVITY WINDOW GEOMETRY PATCH')) {
                utilsContent = utilsContent.replace(
                    /function\s+createWindow\s*\(([^)]*)\)\s*\{/,
                    `function createWindow($1) {
    // ANTIGRAVITY WINDOW GEOMETRY PATCH
    const fsState = require('fs');
    const pathState = require('path');
    const stateFile = pathState.join(require('electron').app.getPath('userData'), 'antigravity-window-state.json');
    let windowState = {};
    try { if (fsState.existsSync(stateFile)) windowState = JSON.parse(fsState.readFileSync(stateFile, 'utf8')); } catch(e){}`
                );

                utilsContent = utilsContent.replace(
                    /width:\s*1400,\s*height:\s*900,/,
                    `width: windowState.width || 1400,
        height: windowState.height || 900,
        x: windowState.x,
        y: windowState.y,`
                );

                utilsContent = utilsContent.replace(
                    /void\s+win\.loadURL\(url\);\s*return\s+win;/,
                    `if (windowState.isMaximized) win.maximize();
    win.on('close', () => {
        if (!win.isDestroyed()) {
            const bounds = win.getBounds();
            const isMaximized = win.isMaximized();
            fsState.writeFileSync(stateFile, JSON.stringify(Object.assign({}, bounds, { isMaximized })));
        }
    });
    void win.loadURL(url);
    return win;`
                );

                fs.writeFileSync(utilsExtracted, utilsContent, 'utf8');
                console.log('[AutoPatcher-v2] Patched dist/utils.js for Monitor 2 geometry & maximized state!');
            }
        }

        // 5. PATCH UPDATER.JS (Localize native Electron dialogs & updater menu items)
        const updaterExtracted = path.join(tempDir, 'dist', 'updater.js');
        if (fs.existsSync(updaterExtracted)) {
            let updaterContent = fs.readFileSync(updaterExtracted, 'utf8');
            updaterContent = updaterContent.replace(
                /title:\s*['"]Check for Updates['"],/g,
                "title: 'Проверка обновлений',"
            );
            updaterContent = updaterContent.replace(
                /message:\s*['"]No updates available['"],/g,
                "message: 'Нет доступных обновлений',"
            );
            updaterContent = updaterContent.replace(
                /buttons:\s*\[['"]OK['"]\],/g,
                "buttons: ['ОК'],"
            );
            updaterContent = updaterContent.replace(
                /MenuUpdateStep\[['"]CheckForUpdates['"]\]\s*=\s*['"]Check for Updates['"];/g,
                'MenuUpdateStep["CheckForUpdates"] = "Проверить обновления";'
            );
            updaterContent = updaterContent.replace(
                /MenuUpdateStep\[['"]CheckingForUpdates['"]\]\s*=\s*['"]Checking for Updates\.\.\.['"];/g,
                'MenuUpdateStep["CheckingForUpdates"] = "Проверка обновлений...";'
            );
            updaterContent = updaterContent.replace(
                /MenuUpdateStep\[['"]DownloadingUpdate['"]\]\s*=\s*['"]Downloading Update\.\.\.['"];/g,
                'MenuUpdateStep["DownloadingUpdate"] = "Загрузка обновления...";'
            );
            updaterContent = updaterContent.replace(
                /MenuUpdateStep\[['"]RestartToUpdate['"]\]\s*=\s*['"]Restart to Update['"];/g,
                'MenuUpdateStep["RestartToUpdate"] = "Перезапустить для обновления";'
            );
            fs.writeFileSync(updaterExtracted, updaterContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/updater.js for native dialogs & update menu localization!');
        }

        // 6. PATCH MENU.JS (Localize application menu)
        const menuExtracted = path.join(tempDir, 'dist', 'menu.js');
        if (fs.existsSync(menuExtracted)) {
            let menuContent = fs.readFileSync(menuExtracted, 'utf8');
            menuContent = menuContent.replace(/label:\s*['"]New Window['"],/g, "label: 'Новое окно',");
            menuContent = menuContent.replace(/label:\s*['"]Docs['"],/g, "label: 'Документация',");
            fs.writeFileSync(menuExtracted, menuContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/menu.js for application menu localization!');
        }

        // 7. PATCH IPCHANDLERS.JS (Localize native context menu: Cut, Copy, Paste, Select All, etc.)
        const ipcHandlersExtracted = path.join(tempDir, 'dist', 'ipcHandlers.js');
        if (fs.existsSync(ipcHandlersExtracted)) {
            let ipcContent = fs.readFileSync(ipcHandlersExtracted, 'utf8');
            if (!ipcContent.includes('ANTIGRAVITY CONTEXT MENU LOCALIZATION PATCH')) {
                ipcContent = ipcContent.replace(
                    /function\s+buildContextMenuTemplate\s*\(\s*items\s*,\s*onSelect\s*\)\s*\{/,
                    `// ANTIGRAVITY CONTEXT MENU LOCALIZATION PATCH
const CONTEXT_MENU_RU_MAP = {
    'cut': 'Вырезать',
    'copy': 'Копировать',
    'paste': 'Вставить',
    'paste as plain text': 'Вставить как обычный текст',
    'paste and match style': 'Вставить и согласовать стиль',
    'select all': 'Выделить всё',
    'undo': 'Отменить',
    'redo': 'Повторить',
    'delete': 'Удалить',
    'copy link': 'Копировать ссылку',
    'copy link address': 'Копировать адрес ссылки',
    'open link': 'Открыть ссылку',
    'inspect': 'Исследовать элемент',
    'inspect element': 'Исследовать элемент',
    'reload': 'Перезагрузить',
    'force reload': 'Перезагрузить принудительно',
    'close tab': 'Закрыть вкладку',
    'split conversation horizontally': 'Разделить диалог по горизонтали',
    'split conversation vertically': 'Разделить диалог по вертикали',
    'open conversation history': 'Открыть историю диалогов',
    'unpin this conversation': 'Открепить этот диалог',
    'unpin conversation': 'Открепить диалог',
    'pin this conversation': 'Закрепить этот диалог',
    'pin conversation': 'Закрепить диалог',
    'rename this conversation': 'Переименовать этот диалог',
    'archive this conversation': 'Архивировать этот диалог',
    'copy conversation markdown': 'Копировать Markdown диалога',
    'find in conversation': 'Найти в диалоге',
    'new terminal tab': 'Новая вкладка терминала',
    'split terminal': 'Разделить терминал',
    'next aux pane tab': 'Следующая вкладка вспомогательной панели',
    'previous aux pane tab': 'Предыдущая вкладка вспомогательной панели',
    'download diagnostics': 'Скачать диагностику',
    'toggle between light/dark themes': 'Переключить светлую/тёмную тему',
    'open command palette': 'Открыть палитру команд',
    'open project picker': 'Открыть выбор проекта',
    'open keyboard shortcuts': 'Открыть сочетания клавиш',
    'collapse all folders': 'Свернуть все папки',
    'expand all folders': 'Развернуть все папки',
    'see plans': 'Посмотреть тарифы',
    'enable overages': 'Включить перерасход',
    'enable ai credit overages': 'Включить оплату перерасхода (AI Credit)'
};
function translateContextMenuLabel(lbl) {
    if (!lbl || typeof lbl !== 'string') return lbl;
    return CONTEXT_MENU_RU_MAP[lbl.trim().toLowerCase()] || lbl;
}
function buildContextMenuTemplate(items, onSelect) {`
                );
                ipcContent = ipcContent.replace(
                    /label:\s*item\.label\s*\?\?\s*'',/g,
                    `label: translateContextMenuLabel(item.label) ?? '',`
                );
                fs.writeFileSync(ipcHandlersExtracted, ipcContent, 'utf8');
                console.log('[AutoPatcher-v2] Patched dist/ipcHandlers.js for native context menu localization!');
            }
        }

        // 8. VALIDATE ALL PATCHED JS FILES WITH NATIVE V8 IN-MEMORY COMPILER (ZERO CHILD PROCESSES)
        const filesToValidate = [preloadExtracted, trayExtracted, mainExtracted, utilsExtracted, updaterExtracted, menuExtracted, ipcHandlersExtracted];
        for (const file of filesToValidate) {
            if (fs.existsSync(file)) {
                const code = fs.readFileSync(file, 'utf8');
                new vm.Script(code, { filename: path.basename(file) });
            }
        }
        console.log('[AutoPatcher-v2] In-memory JS syntax validation PASSED for all files!');

        // 6. RE-PACK ASAR VIA PURE JS
        console.log('[AutoPatcher-v2] Packing updated app.asar via native JS...');
        const patchedAsar = path.join(__dirname, 'app.asar.patched');
        await asar.createPackage(tempDir, patchedAsar);

        fs.rmSync(tempDir, { recursive: true, force: true });
        
        // 7. RECORD SHA-256 HASH OF PATCHED ASAR
        const patchedBuffer = fs.readFileSync(patchedAsar);
        const patchHash = crypto.createHash('sha256').update(patchedBuffer).digest('hex');
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        fs.writeFileSync(path.join(backupDir, 'patch-hash.json'), JSON.stringify({
            sha256: patchHash,
            size: patchedBuffer.length,
            timestamp: new Date().toISOString()
        }, null, 2), 'utf8');
        console.log('[AutoPatcher-v2] Saved patch SHA-256 hash:', patchHash);
        console.log('[AutoPatcher-v2] Patch completed successfully! Output:', patchedAsar);

    } catch (err) {
        console.error('[AutoPatcher-v2] Error during patching:', err.message);
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        process.exit(1);
    }
}

runPatch();
