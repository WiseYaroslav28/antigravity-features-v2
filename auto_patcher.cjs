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
            const ctxMapCode = `const ctxMap = {
            'cut': 'Вырезать', 'copy': 'Копировать', 'paste': 'Вставить', 'paste as plain text': 'Вставить как обычный текст', 'select all': 'Выделить всё', 'undo': 'Отменить', 'redo': 'Повторить', 'delete': 'Удалить', 'copy link': 'Копировать ссылку', 'copy link address': 'Копировать адрес ссылки', 'open link': 'Открыть ссылку', 'inspect element': 'Исследовать элемент', 'inspect': 'Исследовать элемент',
            'close tab': 'Закрыть вкладку', 'reopen closed tab': 'Восстановить закрытую вкладку', 'restore_page reopen closed tab': 'Восстановить закрытую вкладку', 'move conversation up': 'Переместить диалог вверх', 'move conversation down': 'Переместить диалог вниз', 'split conversation horizontally': 'Разделить диалог по горизонтали', 'split conversation vertically': 'Разделить диалог по вертикали', 'open conversation history': 'Открыть историю диалогов',
            'unpin this conversation': 'Открепить этот диалог', 'unpin conversation': 'Открепить диалог', 'pin this conversation': 'Закрепить этот диалог', 'pin conversation': 'Закрепить диалог',
            'rename this conversation': 'Переименовать этот диалог', 'archive this conversation': 'Архивировать этот диалог', 'copy conversation markdown': 'Копировать Markdown диалога', 'find in conversation': 'Найти в диалоге',
            'new terminal tab': 'Новая вкладка терминала', 'split terminal': 'Разделить терминал', 'next aux pane tab': 'Следующая вкладка вспомогательной панели', 'previous aux pane tab': 'Предыдущая вкладка вспомогательной панели',
            'download diagnostics': 'Скачать диагностику', 'toggle between light/dark themes': 'Переключить светлую/тёмную тему', 'open command palette': 'Открыть палитру команд', 'open project picker': 'Открыть выбор проекта',
            'open keyboard shortcuts': 'Открыть сочетания клавиш', 'collapse all folders': 'Свернуть все папки', 'expand all folders': 'Развернуть все папки',
            'see plans': 'Посмотреть тарифы', 'enable overages': 'Включить перерасход', 'enable ai credit overages': 'Включить оплату перерасхода (AI Credit)'
        };`;
            if (!preloadContent.includes('ANTIGRAVITY PRELOAD CONTEXT MENU TRANSLATE')) {
                preloadContent = preloadContent.replace(
                    /showContextMenu:\s*\(items\)\s*=>\s*electron_1\.ipcRenderer\.invoke\('window:show-context-menu',\s*items\),/,
                    `showContextMenu: (items) => {
        // ANTIGRAVITY PRELOAD CONTEXT MENU TRANSLATE
        ${ctxMapCode}
        const mapItems = (arr) => Array.isArray(arr) ? arr.map(i => {
            const c = Object.assign({}, i);
            if (c.label && typeof c.label === 'string') { const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('antigravity_lang') === 'en'; if (!isEn) { const k = c.label.trim().toLowerCase(); c.label = ctxMap[k] || (typeof window !== 'undefined' && typeof window.__antigravity_translate_string === 'function' ? window.__antigravity_translate_string(c.label) : c.label); } }
            if (Array.isArray(c.submenu)) c.submenu = mapItems(c.submenu);
            return c;
        }) : arr;
        return electron_1.ipcRenderer.invoke('window:show-context-menu', mapItems(items));
    },`
                );
            } else {
                preloadContent = preloadContent.replace(/const ctxMap = \{[\s\S]*?\};/, ctxMapCode);
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

        // 2. PATCH TRAY.JS (Fix Left-Click & Double-Click on Tray Icon safely for BaseWindow & BrowserWindow)
        const trayExtracted = path.join(tempDir, 'dist', 'tray.js');
        if (fs.existsSync(trayExtracted)) {
            let trayContent = fs.readFileSync(trayExtracted, 'utf8');
            trayContent = trayContent.replace(
                /\s*\/\/ ANTIGRAVITY TRAY CLICK PATCH(?: V2)?[\s\S]*?tray\.on\('double-click',\s*handleTrayClick\);/,
                ''
            );
            trayContent = trayContent.replace(
                /tray\.setContextMenu\(contextMenu\);/,
                `tray.setContextMenu(contextMenu);
    // ANTIGRAVITY TRAY CLICK PATCH V2
    const handleTrayClick = () => {
        if (typeof onClick === 'function') {
            onClick();
            return;
        }
        if (Array.isArray(actions)) {
            const openAction = actions.find(a => a && a.label && (String(a.label).includes('Open') || String(a.label).includes('Открыть'))) || actions[2];
            if (openAction && typeof openAction.click === 'function') {
                openAction.click();
                return;
            }
        }
        const wins = typeof utils_1.getHubWindows === 'function' ? (0, utils_1.getHubWindows)() : electron_1.BrowserWindow.getAllWindows();
        if (wins.length > 0) {
            if (wins[0].isMinimized?.()) wins[0].restore?.();
            wins[0].show?.();
            wins[0].focus?.();
        }
    };
    if (!onClick || (0, utils_1.isMacOS)()) {
        tray.on('click', handleTrayClick);
    }
    tray.on('double-click', handleTrayClick);`
            );
            trayContent = trayContent.replace(
                /\(count > 0 \? `\$\{count\}` : 'No'\) \+\s*' agent' \+\s*\(count === 1 \? '' : 's'\) \+\s*' running'/,
                `(count > 0 ? (count + (count % 10 === 1 && count % 100 !== 11 ? ' активный агент' : (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? ' активных агента' : ' активных агентов'))) : 'Нет запущенных агентов')`
            );
            fs.writeFileSync(trayExtracted, trayContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/tray.js (V2) for BaseWindow left-click/double-click & localization!');
        }

        // 3. PATCH MAIN.JS (Fix Desktop/Taskbar Shortcut Re-launch when window is closed to tray & Localize Menu/Dialogs)
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
            mainContent = mainContent.replace(/label:\s*['"]New Window['"],/g, "label: 'Новое окно',");
            mainContent = mainContent.replace(/buttons:\s*\[['"]Cancel['"],\s*['"]Quit['"]\],/g, "buttons: ['Отмена', 'Выход'],");
            mainContent = mainContent.replace(/title:\s*['"]Confirm Quit['"],/g, "title: 'Подтверждение выхода',");
            mainContent = mainContent.replace(/message:\s*['"]Are you sure you want to quit\?['"],/g, "message: 'Вы уверены, что хотите выйти?',");
            mainContent = mainContent.replace(/detail:\s*['"]There may be agents or background tasks running\.['"],/g, "detail: 'В фоновом режиме могут выполняться агенты или задачи.',");
            mainContent = mainContent.replace(/title:\s*['"]WSL distro not found['"],/g, "title: 'Дистрибутив WSL не найден',");
            mainContent = mainContent.replace(/message:\s*`The WSL distro "\$\{WSL_DISTRO\}" is no longer installed\.`,/g, "message: `Дистрибутив WSL «${WSL_DISTRO}» больше не установлен.`,");
            mainContent = mainContent.replace(/detail:\s*['"]Antigravity opened on Windows instead\.['"],/g, "detail: 'Приложение Antigravity открыто локально в Windows.',");
            mainContent = mainContent.replace(/showErrorBox\(['"]Binary not found['"],/g, "showErrorBox('Бинарный файл не найден',");
            mainContent = mainContent.replace(/showErrorBox\(['"]WSL setup failed['"],/g, "showErrorBox('Сбой настройки WSL',");
            mainContent = mainContent.replace(/showErrorBox\(['"]Startup failed['"],/g, "showErrorBox('Сбой запуска',");
            mainContent = mainContent.replace(/appendSwitch\(['"]remote-debugging-port['"],\s*['"]0['"]\)/g, "appendSwitch('remote-debugging-port', '9222')");
            if (!mainContent.includes('__saveWindowStateNow')) {
                mainContent = mainContent.replace(
                    /for\s*\(\s*const\s+win\s+of\s+windows\s*\)\s*\{\s*win\.destroy\(\);\s*\}/,
                    `for (const win of windows) {
            try { if (typeof win.__saveWindowStateNow === 'function') win.__saveWindowStateNow(); } catch (e) {}
            win.destroy();
        }`
                );
            }
            fs.writeFileSync(mainExtracted, mainContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/main.js for second-instance shortcut re-launch, before-quit state save, menu & dialogs!');
        }

        // 4. PATCH UTILS.JS (Fix Geometry V3, WebContentsView bounds sync & Native 0ms plugin:// Subframe Localization)
        const utilsExtracted = path.join(tempDir, 'dist', 'utils.js');
        if (fs.existsSync(utilsExtracted)) {
            let utilsContent = fs.readFileSync(utilsExtracted, 'utf8');
            if (!utilsContent.includes('ANTIGRAVITY WINDOW GEOMETRY PATCH V3')) {
                // Clean up any legacy V1 or V2 geometry patch first
                utilsContent = utilsContent.replace(
                    /\/\/ ANTIGRAVITY WINDOW GEOMETRY PATCH V2[\s\S]*?(?=\s*ensureAppIsInDock\(\);)/,
                    ''
                );
                utilsContent = utilsContent.replace(
                    /\/\/ ANTIGRAVITY WINDOW GEOMETRY PATCH[\s\S]*?try \{ if \(fsState\.existsSync\(stateFile\)\) windowState = JSON\.parse\(fsState\.readFileSync\(stateFile, 'utf8'\)\); \} catch\(e\)\{\}\s*/,
                    ''
                );
                utilsContent = utilsContent.replace(
                    /width:\s*(?:initWidth|windowState\.width \|\| 1400),\s*height:\s*(?:initHeight|windowState\.height \|\| 900),\s*x:\s*(?:initX|windowState\.x),\s*y:\s*(?:initY|windowState\.y),/,
                    'width: 1400, height: 900,'
                );
                utilsContent = utilsContent.replace(
                    /if \(typeof initX === 'number' && typeof initY === 'number'\) \{[\s\S]*?void win\.loadURL\(url\);/,
                    'void win.loadURL(url);'
                );
                utilsContent = utilsContent.replace(
                    /if \(windowState\.isMaximized\) win\.maximize\(\);[\s\S]*?void win\.loadURL\(url\);/,
                    'void win.loadURL(url);'
                );

                utilsContent = utilsContent.replace(
                    /function\s+createWindow\s*\(([^)]*)\)\s*\{/,
                    `function createWindow($1) {
    // ANTIGRAVITY WINDOW GEOMETRY PATCH V3
    if (storageManager) {
        global.__antigravity_storage_manager = storageManager;
    } else if (global.__antigravity_storage_manager) {
        storageManager = global.__antigravity_storage_manager;
    }
    const fsState = require('fs');
    const pathState = require('path');
    const stateFile = pathState.join(require('electron').app.getPath('userData'), 'antigravity-window-state.json');
    let windowState = {};
    try {
        if (fsState.existsSync(stateFile)) {
            windowState = JSON.parse(fsState.readFileSync(stateFile, 'utf8')) || {};
        }
    } catch (e) {}
    const shouldMaximize = !!windowState.isMaximized;
    const shouldFullScreen = !!windowState.isFullScreen;
    let targetDisplay = null;
    try {
        const refX = typeof windowState.x === 'number' ? windowState.x : windowState.normalX;
        const refY = typeof windowState.y === 'number' ? windowState.y : windowState.normalY;
        const refW = windowState.width || windowState.normalWidth || 1400;
        const refH = windowState.height || windowState.normalHeight || 900;
        if (typeof refX === 'number' && typeof refY === 'number') {
            targetDisplay = electron_1.screen.getDisplayNearestPoint({
                x: refX + Math.round(refW / 2),
                y: refY + Math.round(refH / 2)
            }) || electron_1.screen.getDisplayMatching({
                x: refX,
                y: refY,
                width: refW,
                height: refH
            });
        }
        if (!targetDisplay) {
            targetDisplay = electron_1.screen.getPrimaryDisplay();
        }
    } catch (e) {}
    const wa = (targetDisplay && targetDisplay.workArea) ? targetDisplay.workArea : { x: 0, y: 0, width: 1400, height: 900 };
    let initWidth = Math.min(Math.max(windowState.normalWidth || (!shouldMaximize && windowState.width) || 1400, 500), wa.width);
    let initHeight = Math.min(Math.max(windowState.normalHeight || (!shouldMaximize && windowState.height) || 900, 400), wa.height);
    if (shouldMaximize && initWidth >= Math.round(wa.width * 0.92) && initHeight >= Math.round(wa.height * 0.92)) {
        initWidth = Math.min(1400, Math.round(wa.width * 0.8));
        initHeight = Math.min(900, Math.round(wa.height * 0.8));
    }
    let initX = typeof windowState.normalX === 'number' ? windowState.normalX : (!shouldMaximize && typeof windowState.x === 'number' ? windowState.x : undefined);
    let initY = typeof windowState.normalY === 'number' ? windowState.normalY : (!shouldMaximize && typeof windowState.y === 'number' ? windowState.y : undefined);
    const centerX = typeof initX === 'number' ? initX + Math.round(initWidth / 2) : NaN;
    const centerY = typeof initY === 'number' ? initY + Math.round(initHeight / 2) : NaN;
    if (
        typeof initX !== 'number' ||
        typeof initY !== 'number' ||
        isNaN(centerX) ||
        isNaN(centerY) ||
        centerX < wa.x ||
        centerX >= wa.x + wa.width ||
        centerY < wa.y ||
        centerY >= wa.y + wa.height ||
        initY < wa.y
    ) {
        initX = wa.x + Math.round((wa.width - initWidth) / 2);
        initY = wa.y + Math.round((wa.height - initHeight) / 2);
    } else {
        initX = Math.max(wa.x, Math.min(initX, wa.x + wa.width - initWidth));
        initY = Math.max(wa.y, Math.min(initY, wa.y + wa.height - initHeight));
    }`
                );

                utilsContent = utilsContent.replace(
                    /width:\s*1400,\s*height:\s*900,/,
                    `width: initWidth,
        height: initHeight,
        x: initX,
        y: initY,`
                );

                utilsContent = utilsContent.replace(
                    /void\s+win\.loadURL\(url\);/,
                    `let isRestoringWindowState = true;
    const enforceWindowPlacement = () => {
        try {
            if (win.isDestroyed()) return;
            if (shouldFullScreen) {
                if (!win.isFullScreen()) win.setFullScreen(true);
            } else if (shouldMaximize) {
                if (!win.isMaximized()) {
                    win.setBounds({ x: initX, y: initY, width: initWidth, height: initHeight });
                    win.maximize();
                }
            }
            if (typeof syncHubViewBounds === 'function') syncHubViewBounds();
        } catch (e) {}
    };
    if (typeof initX === 'number' && typeof initY === 'number') {
        try { win.setBounds({ x: initX, y: initY, width: initWidth, height: initHeight }); } catch (e) {}
    }
    enforceWindowPlacement();
    win.once('ready-to-show', enforceWindowPlacement);
    win.once('show', enforceWindowPlacement);
    win.webContents.once('dom-ready', enforceWindowPlacement);
    const saveWindowState = (forceSave = false) => {
        try {
            if (win.isDestroyed()) return;
            if (isRestoringWindowState && forceSave !== true) return;
            const isMaximized = win.isMaximized();
            const isFullScreen = win.isFullScreen();
            const isMinimized = win.isMinimized();
            if (isMinimized) return;
            const bounds = win.getBounds();
            if (!isMaximized && !isFullScreen) {
                windowState.normalX = bounds.x;
                windowState.normalY = bounds.y;
                windowState.normalWidth = bounds.width;
                windowState.normalHeight = bounds.height;
            } else {
                try {
                    const curDisp = electron_1.screen.getDisplayNearestPoint({
                        x: bounds.x + Math.round(bounds.width / 2),
                        y: bounds.y + Math.round(bounds.height / 2)
                    });
                    if (curDisp && curDisp.workArea) {
                        const cwa = curDisp.workArea;
                        const nw = windowState.normalWidth || 1400;
                        const nh = windowState.normalHeight || 900;
                        const nx = typeof windowState.normalX === 'number' ? windowState.normalX + Math.round(nw / 2) : NaN;
                        const ny = typeof windowState.normalY === 'number' ? windowState.normalY + Math.round(nh / 2) : NaN;
                        if (isNaN(nx) || isNaN(ny) || nx < cwa.x || nx >= cwa.x + cwa.width || ny < cwa.y || ny >= cwa.y + cwa.height || windowState.normalY < cwa.y) {
                            windowState.normalWidth = Math.min(nw, cwa.width);
                            windowState.normalHeight = Math.min(nh, cwa.height);
                            windowState.normalX = cwa.x + Math.round((cwa.width - windowState.normalWidth) / 2);
                            windowState.normalY = cwa.y + Math.round((cwa.height - windowState.normalHeight) / 2);
                        }
                    }
                } catch (e) {}
            }
            windowState.x = bounds.x;
            windowState.y = bounds.y;
            windowState.width = bounds.width;
            windowState.height = bounds.height;
            windowState.isMaximized = isMaximized;
            windowState.isFullScreen = isFullScreen;
            fsState.writeFileSync(stateFile, JSON.stringify(windowState));
        } catch (e) {}
    };
    win.__saveWindowStateNow = () => saveWindowState(true);
    win.webContents.once('did-finish-load', () => {
        enforceWindowPlacement();
        setTimeout(() => {
            enforceWindowPlacement();
            isRestoringWindowState = false;
            saveWindowState(true);
        }, 400);
    });
    setTimeout(() => {
        isRestoringWindowState = false;
    }, 1500);
    win.on('resize', () => saveWindowState(false));
    win.on('move', () => saveWindowState(false));
    win.on('maximize', () => saveWindowState(false));
    win.on('unmaximize', () => saveWindowState(false));
    win.on('enter-full-screen', () => saveWindowState(false));
    win.on('leave-full-screen', () => saveWindowState(false));
    win.on('close', () => saveWindowState(true));
    void win.loadURL(url);`
                );
            }

            if (!utilsContent.includes("if (typeof syncHubViewBounds === 'function') syncHubViewBounds();")) {
                utilsContent = utilsContent.replace(
                    /if\s*\(!win\.isMaximized\(\)\)\s*\{\s*win\.setBounds\(\{\s*x:\s*initX,\s*y:\s*initY,\s*width:\s*initWidth,\s*height:\s*initHeight\s*\}\);\s*win\.maximize\(\);\s*\}\s*\}/,
                    `if (!win.isMaximized()) {
                    win.setBounds({ x: initX, y: initY, width: initWidth, height: initHeight });
                    win.maximize();
                }
            }
            if (typeof syncHubViewBounds === 'function') syncHubViewBounds();`
                );
            }

            utilsContent = utilsContent.replace(
                /\s*\/\/ BEGIN ANTIGRAVITY PLUGIN SUBFRAME PATCH[\s\S]*?\/\/ END ANTIGRAVITY PLUGIN SUBFRAME PATCH\s*/,
                '\n    '
            );
            if (utilsContent.includes('const hubContents = getHubWebContents(win);')) {
                utilsContent = utilsContent.replace(
                    /void\s+win\.loadURL\(url\);/,
                    `// BEGIN ANTIGRAVITY PLUGIN SUBFRAME PATCH
    const injectPluginSubframeLocalization = (_ev, isMainFrame, frameProcessId, frameRoutingId) => {
        if (isMainFrame) return;
        try {
            const frame = electron_1.webFrameMain?.fromId?.(frameProcessId, frameRoutingId);
            if (!frame || frame.isDestroyed?.()) return;
            const fUrl = frame.url || '';
            if (!fUrl.startsWith('plugin://')) return;
            if (!global.__antigravity_cached_subframe_loc) {
                const pCode = fs.readFileSync(path_1.default.join(__dirname, 'preload.js'), 'utf8');
                const marker = '// BEGIN ANTIGRAVITY TRANSLATION INJECTION';
                const idx = pCode.indexOf(marker);
                if (idx !== -1) global.__antigravity_cached_subframe_loc = pCode.slice(idx);
            }
            if (global.__antigravity_cached_subframe_loc) {
                void frame.executeJavaScript(global.__antigravity_cached_subframe_loc).catch(() => {});
            }
        } catch (e) {}
    };
    hubContents.on('did-frame-finish-load', injectPluginSubframeLocalization);
    win.on('closed', () => { hubContents.off?.('did-frame-finish-load', injectPluginSubframeLocalization); });
    // END ANTIGRAVITY PLUGIN SUBFRAME PATCH
    void win.loadURL(url);`
                );
            }

            fs.writeFileSync(utilsExtracted, utilsContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/utils.js (V3 + WebContentsView sync + plugin:// subframe localization)!');
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

        // 6. PATCH MENU.JS (Localize application menu, Hub zoom items & WSL menu)
        const menuExtracted = path.join(tempDir, 'dist', 'menu.js');
        if (fs.existsSync(menuExtracted)) {
            let menuContent = fs.readFileSync(menuExtracted, 'utf8');
            menuContent = menuContent.replace(/label:\s*['"]New Window['"],/g, "label: 'Новое окно',");
            menuContent = menuContent.replace(/label:\s*['"]Docs['"],/g, "label: 'Документация',");
            menuContent = menuContent.replace(/label:\s*item\.label\s*\|\|\s*['"]Actual Size['"],/g, "label: 'Фактический размер',");
            menuContent = menuContent.replace(/label:\s*item\.label\s*\|\|\s*['"]Zoom In['"],/g, "label: 'Увеличить масштаб',");
            menuContent = menuContent.replace(/label:\s*['"]Zoom In['"],/g, "label: 'Увеличить масштаб',");
            menuContent = menuContent.replace(/label:\s*item\.label\s*\|\|\s*['"]Zoom Out['"],/g, "label: 'Уменьшить масштаб',");
            menuContent = menuContent.replace(/label:\s*['"]Connect to WSL['"]/g, "label: 'Подключиться к WSL'");
            menuContent = menuContent.replace(/label:\s*['"]Reopen Locally['"]/g, "label: 'Открыть заново локально'");
            fs.writeFileSync(menuExtracted, menuContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/menu.js for application menu, zoom & WSL localization!');
        }

        // 7. PATCH IPCHANDLERS.JS (Localize native context menu & file/folder dialogs)
        const ipcHandlersExtracted = path.join(tempDir, 'dist', 'ipcHandlers.js');
        if (fs.existsSync(ipcHandlersExtracted)) {
            let ipcContent = fs.readFileSync(ipcHandlersExtracted, 'utf8');
            const ipcMapCode = `const CONTEXT_MENU_RU_MAP = {
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
    'reopen closed tab': 'Восстановить закрытую вкладку',
    'restore_page reopen closed tab': 'Восстановить закрытую вкладку',
    'move conversation up': 'Переместить диалог вверх',
    'move conversation down': 'Переместить диалог вниз',
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
};`;
            if (!ipcContent.includes('ANTIGRAVITY CONTEXT MENU LOCALIZATION PATCH')) {
                ipcContent = ipcContent.replace(
                    /function\s+buildContextMenuTemplate\s*\(\s*items\s*,\s*onSelect\s*\)\s*\{/,
                    `// ANTIGRAVITY CONTEXT MENU LOCALIZATION PATCH
${ipcMapCode}
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
            } else {
                ipcContent = ipcContent.replace(/const CONTEXT_MENU_RU_MAP = \{[\s\S]*?\};/, ipcMapCode);
            }
            ipcContent = ipcContent.replace(/showErrorBox\(['"]Cannot open folder['"],/g, "showErrorBox('Не удалось открыть папку',");
            ipcContent = ipcContent.replace(/message:\s*['"]Folder is on the Windows filesystem['"],/g, "message: 'Папка находится в файловой системе Windows',");
            ipcContent = ipcContent.replace(/title:\s*['"]Open workspace['"],/g, "title: 'Открыть рабочую область',");
            ipcContent = ipcContent.replace(/title:\s*['"]Open workspaces['"],/g, "title: 'Открыть рабочие области',");
            ipcContent = ipcContent.replace(/title:\s*['"]Select Download Folder['"],/g, "title: 'Выберите папку для загрузок',");
            if (!ipcContent.includes('ANTIGRAVITY TITLEBAR OVERLAY MAXIMIZE GUARD')) {
                ipcContent = ipcContent.replace(
                    /win\.setTitleBarOverlay\(\{\s*color:\s*options\.color,\s*symbolColor:\s*options\.symbolColor,\s*height:\s*30,?\s*\}\);/,
                    `// ANTIGRAVITY TITLEBAR OVERLAY MAXIMIZE GUARD
            const wasMax = win.isMaximized();
            win.setTitleBarOverlay({
                color: options.color,
                symbolColor: options.symbolColor,
                height: 30,
            });
            if (wasMax && !win.isMaximized()) {
                win.maximize();
            }`
                );
            }
            fs.writeFileSync(ipcHandlersExtracted, ipcContent, 'utf8');
            console.log('[AutoPatcher-v2] Patched dist/ipcHandlers.js for native context menu & dialogs localization!');
        }

        // 7.5 PATCH PROVISIONSPLASH.JS, WSL.JS & WIZARDHTML.JS (Localize WSL splash, WSL progress & IDE Install Wizard)
        const provisionSplashExtracted = path.join(tempDir, 'dist', 'provisionSplash.js');
        if (fs.existsSync(provisionSplashExtracted)) {
            let splashContent = fs.readFileSync(provisionSplashExtracted, 'utf8');
            splashContent = splashContent.replace(/<div>Setting up WSL: \$\{escapeHtml\(distro\)\}<\/div>/g, '<div>Настройка WSL: ${escapeHtml(distro)}</div>');
            fs.writeFileSync(provisionSplashExtracted, splashContent, 'utf8');
        }
        const wslExtracted = path.join(tempDir, 'dist', 'wsl.js');
        if (fs.existsSync(wslExtracted)) {
            let wslContent = fs.readFileSync(wslExtracted, 'utf8');
            wslContent = wslContent.replace(/['"]Downloading the Antigravity binary(?:\u2026|\\u2026|\.\.\.)['"]/g, "'Загрузка бинарного файла Antigravity…'");
            wslContent = wslContent.replace(/`Installing into \$\{distro\}(?:\u2026|\\u2026|\.\.\.)`/g, "`Установка в ${distro}…`");
            fs.writeFileSync(wslExtracted, wslContent, 'utf8');
        }
        const wizardHtmlExtracted = path.join(tempDir, 'dist', 'ideInstall', 'wizardHtml.js');
        if (fs.existsSync(wizardHtmlExtracted)) {
            let wizContent = fs.readFileSync(wizardHtmlExtracted, 'utf8');
            wizContent = wizContent.replace(/<title>Welcome to Antigravity<\/title>/g, '<title>Добро пожаловать в Antigravity</title>');
            wizContent = wizContent.replace(/>Setting up…<\/div>/g, '>Настройка…</div>');
            wizContent = wizContent.replace(/<h1>Welcome to the new Antigravity!<\/h1>/g, '<h1>Добро пожаловать в новый Antigravity!</h1>');
            wizContent = wizContent.replace(
                /<p>Antigravity has been redesigned to put agents first with new capabilities\. If you'd still like a code editor, you can download it as a separate app named <b>Antigravity IDE<\/b>\.<\/p>/g,
                '<p>Интерфейс Antigravity был переработан для работы с ИИ-агентами и новыми возможностями. Если вам по-прежнему нужен классический редактор кода, вы можете скачать его как отдельное приложение <b>Antigravity IDE</b>.</p>'
            );
            wizContent = wizContent.replace(/<span>Download the Antigravity IDE<\/span>/g, '<span>Скачать Antigravity IDE</span>');
            wizContent = wizContent.replace(/>Explore the new Antigravity<\/button>/g, '>Открыть новый Antigravity</button>');
            fs.writeFileSync(wizardHtmlExtracted, wizContent, 'utf8');
        }

        // 7.6 PATCH CABLEV2.JS, DEVICECHOOSER.JS, WEBAUTHN.JS & WEBVIEWPOPUPSECURITY.JS (Antigravity 2.31.1+ dialogs & menus)
        const cablev2Extracted = path.join(tempDir, 'dist', 'cablev2.js');
        if (fs.existsSync(cablev2Extracted)) {
            let cableContent = fs.readFileSync(cablev2Extracted, 'utf8');
            cableContent = cableContent.replace(/<h1 class="sheet-title">Passkeys<\/h1>/g, '<h1 class="sheet-title">Ключи доступа (Passkeys)</h1>');
            cableContent = cableContent.replace(/<p class="mechanism-header">Use your phone or tablet<\/p>/g, '<p class="mechanism-header">Используйте телефон или планшет</p>');
            cableContent = cableContent.replace(/Scan this QR code with the camera on the device that has your passkey for \$\{safeRpId\}/g, 'Отсканируйте этот QR-код камерой устройства с ключом доступа для ${safeRpId}');
            cableContent = cableContent.replace(/>Cancel<\/button>/g, '>Отмена</button>');
            cableContent = cableContent.replace(/title:\s*'Passkeys',/g, "title: 'Ключи доступа (Passkeys)',");
            cableContent = cableContent.replace(/updateStatus\('Connecting to your device…'\)/g, "updateStatus('Подключение к вашему устройству…')");
            cableContent = cableContent.replace(/updateStatus\('Verify on your device to continue…'\)/g, "updateStatus('Подтвердите вход на устройстве для продолжения…')");
            fs.writeFileSync(cablev2Extracted, cableContent, 'utf8');
        }
        const deviceChooserExtracted = path.join(tempDir, 'dist', 'deviceChooser.js');
        if (fs.existsSync(deviceChooserExtracted)) {
            let devContent = fs.readFileSync(deviceChooserExtracted, 'utf8');
            devContent = devContent.replace(/hid:\s*'HID device',/g, "hid: 'HID-устройству',");
            devContent = devContent.replace(/usb:\s*'USB device',/g, "usb: 'USB-устройству',");
            devContent = devContent.replace(/serial:\s*'serial port',/g, "serial: 'последовательному порту',");
            devContent = devContent.replace(/'Unknown device'/g, "'Неизвестное устройство'");
            devContent = devContent.replace(/title:\s*'Connect a device',/g, "title: 'Подключение устройства',");
            devContent = devContent.replace(/message:\s*`\$\{origin\} wants to connect to a \$\{KIND_NOUNS\[kind\]\}`,/g, "message: `${origin} запрашивает подключение к ${KIND_NOUNS[kind]}`,");
            devContent = devContent.replace(/\?\s*'Select a device:'/g, "? 'Выберите устройство:'");
            devContent = devContent.replace(/:\s*'No compatible devices found\.',/g, ": 'Совместимые устройства не найдены.',");
            devContent = devContent.replace(/buttons:\s*\[\.\.\.snapshot\.map\(\(\{\s*label\s*\}\)\s*=>\s*label\),\s*'Cancel'\],/g, "buttons: [...snapshot.map(({ label }) => label), 'Отмена'],");
            fs.writeFileSync(deviceChooserExtracted, devContent, 'utf8');
        }
        const webauthnExtracted = path.join(tempDir, 'dist', 'webauthn.js');
        if (fs.existsSync(webauthnExtracted)) {
            let waContent = fs.readFileSync(webauthnExtracted, 'utf8');
            waContent = waContent.replace(/return `Account \$\{index \+ 1\}`;/g, 'return `Аккаунт ${index + 1}`;');
            waContent = waContent.replace(/details\.relyingPartyId \|\| 'this site'/g, "details.relyingPartyId || 'этот сайт'");
            waContent = waContent.replace(/title:\s*'Choose a Passkey',/g, "title: 'Выберите ключ доступа (Passkey)',");
            waContent = waContent.replace(/message:\s*`Sign in to \$\{rpLabel\}`,/g, 'message: `Вход на ${rpLabel}`,');
            waContent = waContent.replace(/detail:\s*'Select a passkey account to continue:',/g, "detail: 'Выберите аккаунт с ключом доступа для продолжения:',");
            waContent = waContent.replace(/buttons:\s*\[\.\.\.accountLabels,\s*'Cancel'\],/g, "buttons: [...accountLabels, 'Отмена'],");
            fs.writeFileSync(webauthnExtracted, waContent, 'utf8');
        }
        const webviewPopupSecurityExtracted = path.join(tempDir, 'dist', 'webviewPopupSecurity.js');
        if (fs.existsSync(webviewPopupSecurityExtracted)) {
            let wpsContent = fs.readFileSync(webviewPopupSecurityExtracted, 'utf8');
            wpsContent = wpsContent.replace(/insecure:\s*'Not secure',/g, "insecure: 'Не защищено',");
            wpsContent = wpsContent.replace(/dangerous:\s*'⚠ Not secure',/g, "dangerous: '⚠ Не защищено',");
            wpsContent = wpsContent.replace(/'Your connection to this site is not secure',/g, "'Подключение к этому сайту не защищено',");
            wpsContent = wpsContent.replace(/'You should not enter any sensitive information on this site \(for '\s*\+\s*'example, passwords or credit cards\), because it could be stolen by '\s*\+\s*'attackers\.',/g, "'Не вводите на этом сайте конфиденциальные данные (например, пароли или номера банковских карт), так как их могут похитить злоумышленники.',");
            wpsContent = wpsContent.replace(/'Connection is secure',/g, "'Подключение защищено',");
            wpsContent = wpsContent.replace(/'Your information \(for example, passwords or credit card numbers\) is '\s*\+\s*'private when it is sent to this site\.',/g, "'Ваши данные (например, пароли или номера банковских карт) защищены при передаче на этот сайт.',");
            wpsContent = wpsContent.replace(/'Connection security information is not available for this page'/g, "'Сведения о безопасности подключения для этой страницы недоступны'");
            wpsContent = wpsContent.replace(/\?\s*'Certificate is valid'\s*:\s*'Certificate details'/g, "? 'Сертификат действителен' : 'Сведения о сертификате'");
            wpsContent = wpsContent.replace(/`Error: \$\{state\.certificateError\}`/g, '`Ошибка: ${state.certificateError}`');
            wpsContent = wpsContent.replace(/`Issued to: \$\{certificate\.subjectName\}`,\s*`Issued by: \$\{certificate\.issuer\}`,\s*`Valid from: \$\{formatDate\(certificate\.validFromMs\)\}`,\s*`Valid until: \$\{formatDate\(certificate\.validToMs\)\}`/g, '`Кому выдан: ${certificate.subjectName}`, `Кем выдан: ${certificate.issuer}`, `Действителен с: ${formatDate(certificate.validFromMs)}`, `Действителен до: ${formatDate(certificate.validToMs)}`');
            wpsContent = wpsContent.replace(/`Protocol: \$\{certificate\.protocol\}`/g, '`Протокол: ${certificate.protocol}`');
            wpsContent = wpsContent.replace(/label:\s*'Connection info…',/g, "label: 'Сведения о подключении…',");
            wpsContent = wpsContent.replace(/title:\s*'Connection info',/g, "title: 'Сведения о подключении',");
            wpsContent = wpsContent.replace(/buttons:\s*\['OK'\],/g, "buttons: ['ОК'],");
            fs.writeFileSync(webviewPopupSecurityExtracted, wpsContent, 'utf8');
        }

        // 8. VALIDATE ALL PATCHED JS FILES WITH NATIVE V8 IN-MEMORY COMPILER (ZERO CHILD PROCESSES)
        const filesToValidate = [preloadExtracted, trayExtracted, mainExtracted, utilsExtracted, updaterExtracted, menuExtracted, ipcHandlersExtracted, provisionSplashExtracted, wizardHtmlExtracted, cablev2Extracted, deviceChooserExtracted, webauthnExtracted, webviewPopupSecurityExtracted];
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

        // 6.5 IMMEDIATELY APPLY TO resources/app.asar ON DISK (WITH RENAME FALLBACK)
        const bakPath = path.join(resourcesDir, 'app.asar.bak');
        if (!fs.existsSync(bakPath) && fs.existsSync(asarPath)) {
            try { fs.copyFileSync(asarPath, bakPath); } catch (e) {}
        }
        try {
            fs.copyFileSync(patchedAsar, asarPath);
            console.log('[AutoPatcher-v2] Directly applied app.asar.patched to resources/app.asar!');
        } catch (copyErr) {
            try {
                const oldTmp = asarPath + '.old_unpatched';
                if (fs.existsSync(oldTmp)) {
                    try { fs.unlinkSync(oldTmp); } catch (e) {}
                }
                fs.renameSync(asarPath, oldTmp);
                fs.copyFileSync(patchedAsar, asarPath);
                try { fs.unlinkSync(oldTmp); } catch (e) {}
                console.log('[AutoPatcher-v2] Applied app.asar.patched via rename fallback!');
            } catch (renameErr) {
                console.log('[AutoPatcher-v2] Direct copy deferred to exit_patcher:', renameErr.message);
            }
        }
        
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
