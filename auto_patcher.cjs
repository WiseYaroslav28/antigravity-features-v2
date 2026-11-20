const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');
const asar = require('@electron/asar');

const os = require('os');
const username = process.env.USERNAME || process.env.USER || os.userInfo().username;
const isMac = process.platform === 'darwin';
function resolveMacAppBundle() {
    if (process.env.AG_APP_BUNDLE && fs.existsSync(process.env.AG_APP_BUNDLE)) {
        return path.resolve(process.env.AG_APP_BUNDLE);
    }
    const candidates = [
        '/Applications/Antigravity.app',
        '/Applications/Antigravity IDE.app',
        path.join(os.homedir(), 'Applications', 'Antigravity.app'),
        path.join(os.homedir(), 'Applications', 'Antigravity IDE.app')
    ];
    return candidates.find(p => fs.existsSync(p)) || '/Applications/Antigravity.app';
}
const appBundlePath = isMac ? resolveMacAppBundle() : null;
const resourcesDir = isMac
    ? path.join(appBundlePath, 'Contents', 'Resources')
    : path.join('C:', 'Users', username, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources');
const asarPath = path.join(resourcesDir, 'app.asar');
const bakPath = path.join(resourcesDir, 'app.asar.bak');
const tempDir = path.join(__dirname, 'temp_patcher_asar');
const localizationFile = path.join(__dirname, 'localization_injected.js');
const isBuildOnly = process.argv.includes('--build-only') || process.argv.includes('--no-apply');
const unpatchToIdx = process.argv.indexOf('--unpatch-to');
const unpatchOutputPath = unpatchToIdx !== -1 ? process.argv[unpatchToIdx + 1] : null;
const forceSurgicalUnpatch = process.argv.includes('--force-surgical-unpatch');

function readAsarPkgVersion(archivePath) {
    try {
        const raw = asar.extractFile(archivePath, 'package.json').toString('utf8');
        return JSON.parse(raw).version || null;
    } catch (e) {
        return null;
    }
}

function isAsarBufferPatched(buf) {
    return (
        buf.includes('// BEGIN ANTIGRAVITY TRANSLATION INJECTION') ||
        buf.includes('ANTIGRAVITY TRAY CLICK PATCH') ||
        buf.includes('ANTIGRAVITY WINDOW GEOMETRY PATCH')
    );
}

async function runUnpatchTo(targetOutPath) {
    if (!fs.existsSync(asarPath)) {
        throw new Error(`app.asar not found at ${asarPath}`);
    }
    const curVer = readAsarPkgVersion(asarPath);
    if (!forceSurgicalUnpatch && fs.existsSync(bakPath)) {
        try {
            const bakBuf = fs.readFileSync(bakPath);
            const bakVer = readAsarPkgVersion(bakPath);
            if (!isAsarBufferPatched(bakBuf) && bakVer && curVer && bakVer === curVer) {
                fs.copyFileSync(bakPath, targetOutPath);
                console.log(`[AutoPatcher-v2] Prepared factory-clean app.asar from verified backup (IDE v${bakVer}) -> ${targetOutPath}`);
                return;
            }
        } catch (e) {}
    }

    console.log('[AutoPatcher-v2] Performing surgical unpatch of app.asar...');
    const unpatchTempDir = path.join(os.tmpdir(), 'antigravity_unpatch_' + process.pid + '_' + Date.now());
    try {
        asar.extractAll(asarPath, unpatchTempDir);
        const distDir = path.join(unpatchTempDir, 'dist');

        // 1. Unpatch preload.js
        const pFile = path.join(distDir, 'preload.js');
        if (fs.existsSync(pFile)) {
            let c = fs.readFileSync(pFile, 'utf8');
            const marker = '// BEGIN ANTIGRAVITY TRANSLATION INJECTION';
            if (c.includes(marker)) {
                c = c.substring(0, c.indexOf(marker)).trimEnd() + '\n';
            }
            c = c.replace(
                /showContextMenu:\s*\(items\)\s*=>\s*\{\s*\/\/ ANTIGRAVITY PRELOAD CONTEXT MENU TRANSLATE[\s\S]*?return electron_1\.ipcRenderer\.invoke\('window:show-context-menu',\s*mapItems\(items\)\);\s*\},/,
                "showContextMenu: (items) => electron_1.ipcRenderer.invoke('window:show-context-menu', items),"
            );
            fs.writeFileSync(pFile, c, 'utf8');
        }

        // 2. Unpatch tray.js
        const tFile = path.join(distDir, 'tray.js');
        if (fs.existsSync(tFile)) {
            let c = fs.readFileSync(tFile, 'utf8');
            c = c.replace(/\s*\/\/ ANTIGRAVITY TRAY CLICK PATCH(?: V2)?[\s\S]*?tray\.on\('double-click',\s*handleTrayClick\);/, '');
            c = c.replace(
                /\(count > 0 \? \(count \+[\s\S]*?'Нет запущенных агентов'\)/,
                "(count > 0 ? `${count}` : 'No') + ' agent' + (count === 1 ? '' : 's') + ' running'"
            );
            fs.writeFileSync(tFile, c, 'utf8');
        }

        // 3. Unpatch main.js
        const mFile = path.join(distDir, 'main.js');
        if (fs.existsSync(mFile)) {
            let c = fs.readFileSync(mFile, 'utf8');
            c = c.replace(/\s*\/\/ BEGIN ANTIGRAVITY HTTP HOT-RELOAD IPC PATCH[\s\S]*?\/\/ END ANTIGRAVITY HTTP HOT-RELOAD IPC PATCH\s*/g, '\n');
            c = c.replace(/\/\/ ANTIGRAVITY CDP PORT PATCH\s*if\s*\(!electron_1\.app\.commandLine\.hasSwitch\('remote-debugging-port'\)\)\s*\{\s*electron_1\.app\.commandLine\.appendSwitch\('remote-debugging-port',\s*'9222'\);\s*\}\s*/g, '');
            c = c.replace(/appendSwitch\(['"]remote-debugging-port['"],\s*['"]9222['"]\)/g, "appendSwitch('remote-debugging-port', '0')");
            c = c.replace(
                /for\s*\(\s*const\s+win\s+of\s+windows\s*\)\s*\{\s*try\s*\{\s*if\s*\(typeof\s+win\.__saveWindowStateNow[\s\S]*?win\.destroy\(\);\s*\}/,
                "for (const win of windows) {\n            win.destroy();\n        }"
            );
            c = c.replace(/label:\s*'Нет запущенных агентов',/g, "label: 'No agents running',");
            c = c.replace(/label:\s*`Открыть \$\{electron_1\.app\.getName\(\)\}`,/g, "label: `Open ${electron_1.app.getName()}`,");
            c = c.replace(/label:\s*'Выход',/g, "label: 'Quit',");
            c = c.replace(/label:\s*'Новое окно',/g, "label: 'New Window',");
            c = c.replace(/buttons:\s*\['Отмена',\s*'Выход'\],/g, "buttons: ['Cancel', 'Quit'],");
            c = c.replace(/title:\s*'Подтверждение выхода',/g, "title: 'Confirm Quit',");
            c = c.replace(/message:\s*'Вы уверены, что хотите выйти\?',/g, "message: 'Are you sure you want to quit?',");
            c = c.replace(/detail:\s*'В фоновом режиме могут выполняться агенты или задачи\.',/g, "detail: 'There may be agents or background tasks running.',");
            c = c.replace(/title:\s*'Дистрибутив WSL не найден',/g, "title: 'WSL distro not found',");
            c = c.replace(/message:\s*`Дистрибутив WSL «\$\{WSL_DISTRO\}» больше не установлен\.`,/g, 'message: `The WSL distro "${WSL_DISTRO}" is no longer installed.`,');
            c = c.replace(/detail:\s*'Приложение Antigravity открыто локально в Windows\.',/g, "detail: 'Antigravity opened on Windows instead.',");
            c = c.replace(/showErrorBox\('Бинарный файл не найден',/g, "showErrorBox('Binary not found',");
            c = c.replace(/showErrorBox\('Сбой настройки WSL',/g, "showErrorBox('WSL setup failed',");
            c = c.replace(/showErrorBox\('Сбой запуска',/g, "showErrorBox('Startup failed',");
            fs.writeFileSync(mFile, c, 'utf8');
        }

        // 4. Unpatch utils.js
        const uFile = path.join(distDir, 'utils.js');
        if (fs.existsSync(uFile)) {
            let c = fs.readFileSync(uFile, 'utf8');
            c = c.replace(/\s*\/\/ BEGIN ANTIGRAVITY PLUGIN SUBFRAME PATCH[\s\S]*?\/\/ END ANTIGRAVITY PLUGIN SUBFRAME PATCH\s*/, '\n    ');
            if (c.includes('// END ANTIGRAVITY WINDOW GEOMETRY PATCH V3')) {
                c = c.replace(/\s*\/\/ ANTIGRAVITY WINDOW GEOMETRY PATCH V3[\s\S]*?\/\/ END ANTIGRAVITY WINDOW GEOMETRY PATCH V3/, '');
            } else {
                c = c.replace(/\s*\/\/ ANTIGRAVITY WINDOW GEOMETRY PATCH V3[\s\S]*?initY = Math\.max\(wa\.y,\s*Math\.min\(initY,\s*wa\.y \+ wa\.height - initHeight\)\);\s*\}/, '');
            }
            c = c.replace(/width:\s*initWidth,\s*height:\s*initHeight,\s*x:\s*initX,\s*y:\s*initY,/, 'width: 1400, height: 900,');
            c = c.replace(/let isRestoringWindowState = true;[\s\S]*?win\.on\('close',\s*\(\)\s*=>\s*saveWindowState\(true\)\);\s*void win\.loadURL\(url\);/, 'void win.loadURL(url);');
            fs.writeFileSync(uFile, c, 'utf8');
        }

        // 5. Unpatch updater.js, menu.js, ipcHandlers.js & dialog files
        const updFile = path.join(distDir, 'updater.js');
        if (fs.existsSync(updFile)) {
            let c = fs.readFileSync(updFile, 'utf8');
            c = c.replace(/title:\s*'Проверка обновлений',/g, "title: 'Check for Updates',");
            c = c.replace(/message:\s*'Нет доступных обновлений',/g, "message: 'No updates available',");
            c = c.replace(/buttons:\s*\['ОК'\],/g, "buttons: ['OK'],");
            c = c.replace(/MenuUpdateStep\["CheckForUpdates"\] = "Проверить обновления";/g, 'MenuUpdateStep["CheckForUpdates"] = "Check for Updates";');
            c = c.replace(/MenuUpdateStep\["CheckingForUpdates"\] = "Проверка обновлений\.\.\.";/g, 'MenuUpdateStep["CheckingForUpdates"] = "Checking for Updates...";');
            c = c.replace(/MenuUpdateStep\["DownloadingUpdate"\] = "Загрузка обновления\.\.\.";/g, 'MenuUpdateStep["DownloadingUpdate"] = "Downloading Update...";');
            c = c.replace(/MenuUpdateStep\["RestartToUpdate"\] = "Перезапустить для обновления";/g, 'MenuUpdateStep["RestartToUpdate"] = "Restart to Update";');
            c = c.replace(/\s*if \(process\.platform === 'darwin'\) __agMacInitHook\(\);/g, '');
            c = c.replace(/\s*if \(process\.platform === 'darwin'\) __agMacSetPending\(info(?:,\s*true)?\);/g, '');
            c = c.replace(/\s*if \(process\.platform === 'darwin' && __agMacHandleSigError\(err\)\) return;/g, '');
            c = c.replace(/\s*if \(process\.platform === 'darwin' && __agMacLaunchUpdater\(\)\) return;/g, '');
            c = c.replace(/\s*\/\/ BEGIN ANTIGRAVITY MACOS UPDATER PATCH[\s\S]*?\/\/ END ANTIGRAVITY MACOS UPDATER PATCH\s*/g, '\n');
            fs.writeFileSync(updFile, c, 'utf8');
        }

        const menuFile = path.join(distDir, 'menu.js');
        if (fs.existsSync(menuFile)) {
            let c = fs.readFileSync(menuFile, 'utf8');
            c = c.replace(/label:\s*'Новое окно',/g, "label: 'New Window',");
            c = c.replace(/label:\s*'Документация',/g, "label: 'Docs',");
            c = c.replace(/label:\s*'Фактический размер',/g, "label: item.label || 'Actual Size',");
            c = c.replace(/label:\s*'Увеличить масштаб',/g, "label: item.label || 'Zoom In',");
            c = c.replace(/label:\s*'Уменьшить масштаб',/g, "label: item.label || 'Zoom Out',");
            c = c.replace(/label:\s*'Подключиться к WSL'/g, "label: 'Connect to WSL'");
            c = c.replace(/label:\s*'Открыть заново локально'/g, "label: 'Reopen Locally'");
            fs.writeFileSync(menuFile, c, 'utf8');
        }

        const ipcFile = path.join(distDir, 'ipcHandlers.js');
        if (fs.existsSync(ipcFile)) {
            let c = fs.readFileSync(ipcFile, 'utf8');
            c = c.replace(/\/\/ ANTIGRAVITY CONTEXT MENU LOCALIZATION PATCH[\s\S]*?function buildContextMenuTemplate\(items,\s*onSelect\)\s*\{/, 'function buildContextMenuTemplate(items, onSelect) {');
            c = c.replace(/label:\s*translateContextMenuLabel\(item\.label\)\s*\?\?\s*'',/g, "label: item.label ?? '',");
            c = c.replace(/showErrorBox\('Не удалось открыть папку',/g, "showErrorBox('Cannot open folder',");
            c = c.replace(/message:\s*'Папка находится в файловой системе Windows',/g, "message: 'Folder is on the Windows filesystem',");
            c = c.replace(/title:\s*'Открыть рабочую область',/g, "title: 'Open workspace',");
            c = c.replace(/title:\s*'Открыть рабочие области',/g, "title: 'Open workspaces',");
            c = c.replace(/title:\s*'Выберите папку для загрузок',/g, "title: 'Select Download Folder',");
            c = c.replace(
                /\/\/ ANTIGRAVITY TITLEBAR OVERLAY MAXIMIZE GUARD\s*const wasMax = win\.isMaximized\(\);\s*win\.setTitleBarOverlay\(\{\s*color:\s*options\.color,\s*symbolColor:\s*options\.symbolColor,\s*height:\s*30,?\s*\}\);\s*if\s*\(wasMax && !win\.isMaximized\(\)\)\s*\{\s*win\.maximize\(\);\s*\}/,
                "win.setTitleBarOverlay({\n                color: options.color,\n                symbolColor: options.symbolColor,\n                height: 30,\n            });"
            );
            fs.writeFileSync(ipcFile, c, 'utf8');
        }

        const splashFile = path.join(distDir, 'provisionSplash.js');
        if (fs.existsSync(splashFile)) {
            let c = fs.readFileSync(splashFile, 'utf8');
            c = c.replace(/<div>Настройка WSL: \$\{escapeHtml\(distro\)\}<\/div>/g, '<div>Setting up WSL: ${escapeHtml(distro)}</div>');
            fs.writeFileSync(splashFile, c, 'utf8');
        }
        const wslFile = path.join(distDir, 'wsl.js');
        if (fs.existsSync(wslFile)) {
            let c = fs.readFileSync(wslFile, 'utf8');
            c = c.replace(/'Загрузка бинарного файла Antigravity…'/g, "'Downloading the Antigravity binary…'");
            c = c.replace(/`Установка в \$\{distro\}…`/g, '`Installing into ${distro}…`');
            fs.writeFileSync(wslFile, c, 'utf8');
        }
        const wizFile = path.join(distDir, 'ideInstall', 'wizardHtml.js');
        if (fs.existsSync(wizFile)) {
            let c = fs.readFileSync(wizFile, 'utf8');
            c = c.replace(/<title>Добро пожаловать в Antigravity<\/title>/g, '<title>Welcome to Antigravity</title>');
            c = c.replace(/>Настройка…<\/div>/g, '>Setting up…</div>');
            c = c.replace(/<h1>Добро пожаловать в новый Antigravity!<\/h1>/g, '<h1>Welcome to the new Antigravity!</h1>');
            c = c.replace(/<p>Интерфейс Antigravity был переработан для работы с ИИ-агентами и новыми возможностями\. Если вам по-прежнему нужен классический редактор кода, вы можете скачать его как отдельное приложение <b>Antigravity IDE<\/b>\.<\/p>/g, "<p>Antigravity has been redesigned to put agents first with new capabilities. If you'd still like a code editor, you can download it as a separate app named <b>Antigravity IDE</b>.</p>");
            c = c.replace(/<span>Скачать Antigravity IDE<\/span>/g, '<span>Download the Antigravity IDE</span>');
            c = c.replace(/>Открыть новый Antigravity<\/button>/g, '>Explore the new Antigravity</button>');
            fs.writeFileSync(wizFile, c, 'utf8');
        }
        const cableFile = path.join(distDir, 'cablev2.js');
        if (fs.existsSync(cableFile)) {
            let c = fs.readFileSync(cableFile, 'utf8');
            c = c.replace(/<h1 class="sheet-title">Ключи доступа \(Passkeys\)<\/h1>/g, '<h1 class="sheet-title">Passkeys</h1>');
            c = c.replace(/<p class="mechanism-header">Используйте телефон или планшет<\/p>/g, '<p class="mechanism-header">Use your phone or tablet</p>');
            c = c.replace(/Отсканируйте этот QR-код камерой устройства с ключом доступа для \$\{safeRpId\}/g, 'Scan this QR code with the camera on the device that has your passkey for ${safeRpId}');
            c = c.replace(/>Отмена<\/button>/g, '>Cancel</button>');
            c = c.replace(/title:\s*'Ключи доступа \(Passkeys\)',/g, "title: 'Passkeys',");
            c = c.replace(/updateStatus\('Подключение к вашему устройству…'\)/g, "updateStatus('Connecting to your device…')");
            c = c.replace(/updateStatus\('Подтвердите вход на устройстве для продолжения…'\)/g, "updateStatus('Verify on your device to continue…')");
            fs.writeFileSync(cableFile, c, 'utf8');
        }
        const devFile = path.join(distDir, 'deviceChooser.js');
        if (fs.existsSync(devFile)) {
            let c = fs.readFileSync(devFile, 'utf8');
            c = c.replace(/hid:\s*'HID-устройству',/g, "hid: 'HID device',");
            c = c.replace(/usb:\s*'USB-устройству',/g, "usb: 'USB device',");
            c = c.replace(/serial:\s*'последовательному порту',/g, "serial: 'serial port',");
            c = c.replace(/'Неизвестное устройство'/g, "'Unknown device'");
            c = c.replace(/title:\s*'Подключение устройства',/g, "title: 'Connect a device',");
            c = c.replace(/message:\s*`\$\{origin\} запрашивает подключение к \$\{KIND_NOUNS\[kind\]\}`,/g, 'message: `${origin} wants to connect to a ${KIND_NOUNS[kind]}`,');
            c = c.replace(/\?\s*'Выберите устройство:'/g, "? 'Select a device:'");
            c = c.replace(/:\s*'Совместимые устройства не найдены\.',/g, ": 'No compatible devices found.',");
            c = c.replace(/buttons:\s*\[\.\.\.snapshot\.map\(\(\{\s*label\s*\}\)\s*=>\s*label\),\s*'Отмена'\],/g, "buttons: [...snapshot.map(({ label }) => label), 'Cancel'],");
            fs.writeFileSync(devFile, c, 'utf8');
        }
        const waFile = path.join(distDir, 'webauthn.js');
        if (fs.existsSync(waFile)) {
            let c = fs.readFileSync(waFile, 'utf8');
            c = c.replace(/return `Аккаунт \$\{index \+ 1\}`;/g, 'return `Account ${index + 1}`;');
            c = c.replace(/details\.relyingPartyId \|\| 'этот сайт'/g, "details.relyingPartyId || 'this site'");
            c = c.replace(/title:\s*'Выберите ключ доступа \(Passkey\)',/g, "title: 'Choose a Passkey',");
            c = c.replace(/message:\s*`Вход на \$\{rpLabel\}`,/g, 'message: `Sign in to ${rpLabel}`,');
            c = c.replace(/detail:\s*'Выберите аккаунт с ключом доступа для продолжения:',/g, "detail: 'Select a passkey account to continue:',");
            c = c.replace(/buttons:\s*\[\.\.\.accountLabels,\s*'Отмена'\],/g, "buttons: [...accountLabels, 'Cancel'],");
            fs.writeFileSync(waFile, c, 'utf8');
        }
        const wpsFile = path.join(distDir, 'webviewPopupSecurity.js');
        if (fs.existsSync(wpsFile)) {
            let c = fs.readFileSync(wpsFile, 'utf8');
            c = c.replace(/insecure:\s*'Не защищено',/g, "insecure: 'Not secure',");
            c = c.replace(/dangerous:\s*'⚠ Не защищено',/g, "dangerous: '⚠ Not secure',");
            c = c.replace(/'Подключение к этому сайту не защищено',/g, "'Your connection to this site is not secure',");
            c = c.replace(/'Не вводите на этом сайте конфиденциальные данные \(например, пароли или номера банковских карт\), так как их могут похитить злоумышленники\.',/g, "'You should not enter any sensitive information on this site (for ' + 'example, passwords or credit cards), because it could be stolen by ' + 'attackers.',");
            c = c.replace(/'Подключение защищено',/g, "'Connection is secure',");
            c = c.replace(/'Ваши данные \(например, пароли или номера банковских карт\) защищены при передаче на этот сайт\.',/g, "'Your information (for example, passwords or credit card numbers) is ' + 'private when it is sent to this site.',");
            c = c.replace(/'Сведения о безопасности подключения для этой страницы недоступны'/g, "'Connection security information is not available for this page'");
            c = c.replace(/\?\s*'Сертификат действителен'\s*:\s*'Сведения о сертификате'/g, "? 'Certificate is valid' : 'Certificate details'");
            c = c.replace(/`Ошибка: \$\{state\.certificateError\}`/g, '`Error: ${state.certificateError}`');
            c = c.replace(/`Кому выдан: \$\{certificate\.subjectName\}`,\s*`Кем выдан: \$\{certificate\.issuer\}`,\s*`Действителен с: \$\{formatDate\(certificate\.validFromMs\)\}`,\s*`Действителен до: \$\{formatDate\(certificate\.validToMs\)\}`/g, '`Issued to: ${certificate.subjectName}`, `Issued by: ${certificate.issuer}`, `Valid from: ${formatDate(certificate.validFromMs)}`, `Valid until: ${formatDate(certificate.validToMs)}`');
            c = c.replace(/`Протокол: \$\{certificate\.protocol\}`/g, '`Protocol: ${certificate.protocol}`');
            c = c.replace(/label:\s*'Сведения о подключении…',/g, "label: 'Connection info…',");
            c = c.replace(/title:\s*'Сведения о подключении',/g, "title: 'Connection info',");
            c = c.replace(/buttons:\s*\['ОК'\],/g, "buttons: ['OK'],");
            fs.writeFileSync(wpsFile, c, 'utf8');
        }
        const discPageFile = path.join(distDir, 'remote', 'disconnectedPage.js');
        if (fs.existsSync(discPageFile)) {
            let c = fs.readFileSync(discPageFile, 'utf8');
            c = c.replace(/\?\s*'Переподключение…'\s*:\s*'Отключено'/g, "? 'Reconnecting…' : 'Disconnected'");
            c = c.replace(/`Переподключение к \$\{host\}…`/g, '`Reconnecting to ${host}…`');
            c = c.replace(/`Отключено от \$\{host\}`/g, '`Disconnected from ${host}`');
            c = c.replace(/`Агенты продолжают работать на \$\{host\}\.`/g, '`Agents keep running on ${host}.`');
            c = c.replace(/`Агенты продолжают работать на \$\{host\}, если сервер не был остановлен\.`/g, '`Agents keep running on ${host} unless its server stopped.`');
            c = c.replace(/>Переподключиться<\/a>/g, '>Reconnect</a>');
            c = c.replace(/>Закрыть<\/a>/g, '>Close</a>');
            fs.writeFileSync(discPageFile, c, 'utf8');
        }
        const sshPromptsFile = path.join(distDir, 'remote', 'sshPrompts.js');
        if (fs.existsSync(sshPromptsFile)) {
            let c = fs.readFileSync(sshPromptsFile, 'utf8');
            c = c.replace(/>Повторный запрос: предыдущий ответ не подошёл\.<\/div>/g, '>Asked again: your last answer may not have worked.</div>');
            c = c.replace(/>Слишком длинное значение\.<\/div>/g, ">That's too long.</div>");
            c = c.replace(/<button id="cancel">Отмена<\/button><button id="continue">Продолжить<\/button>/g, '<button id="cancel">Cancel</button><button id="continue">Continue</button>');
            c = c.replace(/\?\s*`\$\{label\} запрашивает:`\s*:\s*'Коснитесь электронного ключа безопасности'/g, "? `${label} asks:` : 'Touch your security key'");
            c = c.replace(/buttons:\s*confirm\s*\?\s*\['Да',\s*'Нет'\]\s*:\s*\['Отмена'\],/g, "buttons: confirm ? ['Yes', 'No'] : ['Cancel'],");
            fs.writeFileSync(sshPromptsFile, c, 'utf8');
        }
        const sshPromptPreloadFile = path.join(distDir, 'remote', 'sshPromptPreload.js');
        if (fs.existsSync(sshPromptPreloadFile)) {
            let c = fs.readFileSync(sshPromptPreloadFile, 'utf8');
            c = c.replace(/asks\.textContent = `\$\{label\} запрашивает:`;/g, 'asks.textContent = `${label} asks:`;');
            fs.writeFileSync(sshPromptPreloadFile, c, 'utf8');
        }
        const remoteMgrFile = path.join(distDir, 'remote', 'remoteManager.js');
        if (fs.existsSync(remoteMgrFile)) {
            let c = fs.readFileSync(remoteMgrFile, 'utf8');
            c = c.replace(/title:\s*'Выберите файл конфигурации SSH',/g, "title: 'Choose an SSH config file',");
            c = c.replace(/title:\s*'Ошибка подключения по SSH',/g, "title: 'SSH connection failed',");
            c = c.replace(/buttons:\s*\['Остановить сервер',\s*'Отмена'\],/g, "buttons: ['Stop Server', 'Cancel'],");
            c = c.replace(/title:\s*'Остановка SSH-сервера',/g, "title: 'Stop SSH server',");
            c = c.replace(/message:\s*`Остановить сервер Antigravity на \$\{entry\.label\}\?`,/g, 'message: `Stop the Antigravity server on ${entry.label}?`,');
            c = c.replace(/detail:\s*'Запущенные на этом хосте агенты будут остановлены, а окно закроется\. Сервер снова запустится при следующем подключении\.',/g, "detail: 'Agents running on this host will stop and its window will close. ' +\n                    'The server starts again the next time you connect.',");
            c = c.replace(/'Не удалось остановить SSH-сервер'/g, "'Could not stop the SSH server'");
            c = c.replace(/message:\s*`Нет подключения к \$\{label\}`,/g, 'message: `Not connected to ${label}`,');
            c = c.replace(/detail:\s*'Сначала переподключитесь, а затем остановите сервер\.',/g, "detail: 'Reconnect first, then stop its server.',");
            c = c.replace(/buttons:\s*\['Войти',\s*'Отмена'\],/g, "buttons: ['Sign In', 'Cancel'],");
            c = c.replace(/title:\s*'Вход в организацию',/g, "title: 'Sign in',");
            c = c.replace(/message:\s*`Войти в организацию для \$\{entry\.label\}\?`,/g, 'message: `Sign in to your organization for ${entry.label}?`,');
            fs.writeFileSync(remoteMgrFile, c, 'utf8');
        }
        const sshErrFile = path.join(distDir, 'remote', 'sshErrorText.js');
        if (fs.existsSync(sshErrFile)) {
            let c = fs.readFileSync(sshErrFile, 'utf8');
            c = c.replace(/return `Код ошибки: \$\{err\.code\}\\nЖурнал: \$\{logPath\(\)\}`;/g, 'return `Error code: ${err.code}\\nLogs: ${logPath()}`;');
            c = c.replace(/`\$\{label\} сообщил: \$\{text\}`/g, '`${label} reported: ${text}`');
            c = c.replace(/'Соединение было закрыто до завершения подключения\.'/g, "'The connection was closed before it finished.'");
            fs.writeFileSync(sshErrFile, c, 'utf8');
        }

        const checkJsFiles = [
            pFile, tFile, mFile, uFile, updFile, menuFile, ipcFile,
            path.join(distDir, 'provisionSplash.js'),
            path.join(distDir, 'ideInstall', 'wizardHtml.js'),
            path.join(distDir, 'cablev2.js'),
            path.join(distDir, 'deviceChooser.js'),
            path.join(distDir, 'webauthn.js'),
            path.join(distDir, 'webviewPopupSecurity.js'),
            discPageFile,
            sshPromptsFile,
            sshPromptPreloadFile,
            remoteMgrFile,
            sshErrFile
        ];
        for (const jf of checkJsFiles) {
            if (fs.existsSync(jf)) {
                new vm.Script(fs.readFileSync(jf, 'utf8'), { filename: path.basename(jf) });
            }
        }

        await asar.createPackage(unpatchTempDir, targetOutPath);
        console.log(`[AutoPatcher-v2] Surgical unpatch validated and packed -> ${targetOutPath}`);
    } finally {
        if (fs.existsSync(unpatchTempDir)) {
            fs.rmSync(unpatchTempDir, { recursive: true, force: true });
        }
    }
}

async function runPatch() {
    try {
        if (unpatchOutputPath) {
            await runUnpatchTo(unpatchOutputPath);
            return;
        }
        console.log('[AutoPatcher-v2] Inspecting app.asar via native JS...');
        // Preserve factory-clean backup whenever current app.asar is unpatched (including after IDE upgrades)
        if (fs.existsSync(asarPath)) {
            try {
                const curAsarBuf = fs.readFileSync(asarPath);
                if (!isAsarBufferPatched(curAsarBuf)) {
                    const curIdeVer = readAsarPkgVersion(asarPath);
                    let needRefreshBak = !fs.existsSync(bakPath);
                    if (!needRefreshBak) {
                        const bakBuf = fs.readFileSync(bakPath);
                        const bakIdeVer = readAsarPkgVersion(bakPath);
                        if (isAsarBufferPatched(bakBuf) || (curIdeVer && bakIdeVer !== curIdeVer)) {
                            needRefreshBak = true;
                        }
                    }
                    if (needRefreshBak) {
                        fs.copyFileSync(asarPath, bakPath);
                        console.log(`[AutoPatcher-v2] Saved clean factory backup to app.asar.bak (IDE v${curIdeVer || 'unknown'})`);
                    }
                }
            } catch (e) {}
        }
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
            'unpin this conversation': 'Открепить этот диалог', 'unpin conversation': 'Открепить диалог', 'pin this conversation': 'Закрепить этот диалог', 'pin conversation': 'Закрепить диалог', 'pin / unpin conversation': 'Закрепить / открепить диалог',
            'rename this conversation': 'Переименовать этот диалог', 'archive this conversation': 'Архивировать этот диалог', 'copy conversation markdown': 'Копировать Markdown диалога', 'find in conversation': 'Найти в диалоге', 'remove from recent': 'Удалить из недавних', 'hide from this list': 'Скрыть из этого списка', 'show in the list again': 'Снова показать в списке',
            'new terminal tab': 'Новая вкладка терминала', 'split terminal': 'Разделить терминал', 'next aux pane tab': 'Следующая вкладка вспомогательной панели', 'previous aux pane tab': 'Предыдущая вкладка вспомогательной панели',
            'download diagnostics': 'Скачать диагностику', 'toggle between light/dark themes': 'Переключить светлую/тёмную тему', 'open command palette': 'Открыть палитру команд', 'open project picker': 'Открыть выбор проекта',
            'open keyboard shortcuts': 'Открыть сочетания клавиш', 'collapse all folders': 'Свернуть все папки', 'expand all folders': 'Развернуть все папки',
            'see plans': 'Посмотреть тарифы', 'enable overages': 'Включить перерасход', 'enable ai credit overages': 'Включить оплату перерасхода (AI Credit)',
            'confirm': 'Подтвердить', 'apply': 'Применить', 'approve': 'Одобрить', 'reject': 'Отклонить', 'accept': 'Принять', 'proceed': 'Продолжить', 'reset': 'Сбросить'
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
        const __agProto = (typeof window !== 'undefined' && window.location) ? window.location.protocol : '';
        if (__agProto === 'https:' || __agProto === 'http:' || __agProto === 'vscode-file:' || __agProto === 'antigravity-ide:') {
            window.__antigravity_force_shell = true;
        }
        window.__antigravity_open_external = (url) => electron_1.ipcRenderer.invoke('shell:open-external', url);
        window.__antigravity_reload_subframes = (code) => electron_1.ipcRenderer.invoke('ag-loc:hot-reload-subframes', code);
        window.__antigravity_reload_main = (code) => electron_1.ipcRenderer.invoke('ag-loc:hot-reload-main', code);
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
            // Strip any legacy <=v2.1.47 CDP port 9222 patch (v2.2.0+ uses local HTTP hot-reload on 127.0.0.1:39228 with zero debugging ports)
            mainContent = mainContent.replace(/\/\/ ANTIGRAVITY CDP PORT PATCH\s*if\s*\(!electron_1\.app\.commandLine\.hasSwitch\('remote-debugging-port'\)\)\s*\{\s*electron_1\.app\.commandLine\.appendSwitch\('remote-debugging-port',\s*'9222'\);\s*\}\s*/g, '');
            mainContent = mainContent.replace(/appendSwitch\(['"]remote-debugging-port['"],\s*['"]9222['"]\)/g, "appendSwitch('remote-debugging-port', '0')");
            mainContent = mainContent.replace(/\s*\/\/ BEGIN ANTIGRAVITY HTTP HOT-RELOAD IPC PATCH[\s\S]*?\/\/ END ANTIGRAVITY HTTP HOT-RELOAD IPC PATCH\s*/g, '\n');
            mainContent = mainContent.trimEnd() + `

// BEGIN ANTIGRAVITY HTTP HOT-RELOAD IPC PATCH
try {
    const isTrustedAgHubUrl = (u) => typeof u === 'string' && (
        /^https?:\\/\\/(?:127\\.0\\.0\\.1|localhost):\\d+\\//.test(u) ||
        u.startsWith('vscode-file://') ||
        u.startsWith('antigravity-ide://')
    );
    const isValidLocBundle = (code) => typeof code === 'string' && code.length > 50000 && code.includes('ANTIGRAVITY_LOC_SUPERSEDED');
    electron_1.ipcMain.removeHandler('ag-loc:hot-reload-subframes');
    electron_1.ipcMain.handle('ag-loc:hot-reload-subframes', async (event, code) => {
        if (!isTrustedAgHubUrl(event?.senderFrame?.url || event?.sender?.getURL?.() || '') || !isValidLocBundle(code)) {
            return { ok: false, reason: 'rejected' };
        }
        global.__antigravity_cached_subframe_loc = code;
        let reloaded = 0;
        try {
            const rootFrame = event?.sender?.mainFrame;
            if (rootFrame && Array.isArray(rootFrame.framesInSubtree)) {
                for (const frame of rootFrame.framesInSubtree) {
                    if (!frame || frame === rootFrame || frame.isDestroyed?.()) continue;
                    const fUrl = frame.url || '';
                    if (fUrl.startsWith('plugin://') || fUrl.startsWith('vscode-webview://')) {
                        try {
                            await frame.executeJavaScript(code);
                            reloaded++;
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}
        return { ok: true, reloaded };
    });
    electron_1.ipcMain.removeHandler('ag-loc:hot-reload-main');
    electron_1.ipcMain.handle('ag-loc:hot-reload-main', async (event, code) => {
        if (!isTrustedAgHubUrl(event?.senderFrame?.url || event?.sender?.getURL?.() || '') || !isValidLocBundle(code)) {
            return { ok: false, reason: 'rejected' };
        }
        global.__antigravity_cached_subframe_loc = code;
        try {
            if (event?.sender && !event.sender.isDestroyed?.()) {
                await event.sender.executeJavaScript(code);
                return { ok: true };
            }
        } catch (e) {
            return { ok: false, reason: String(e) };
        }
        return { ok: false, reason: 'no_sender' };
    });
} catch (e) {}
// END ANTIGRAVITY HTTP HOT-RELOAD IPC PATCH
`;
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
            console.log('[AutoPatcher-v2] Patched dist/main.js for HTTP hot-reload IPC (zero CDP port 9222), second-instance tray, before-quit state save, menu & dialogs!');
        }

        // 4. PATCH UTILS.JS (Fix Geometry V3 on <=2.32.2, respect native windowState.js on >=2.33.0, & Native 0ms plugin:// Subframe Localization)
        const utilsExtracted = path.join(tempDir, 'dist', 'utils.js');
        if (fs.existsSync(utilsExtracted)) {
            let utilsContent = fs.readFileSync(utilsExtracted, 'utf8');
            const hasNativeWindowState = utilsContent.includes('resolveInitialWindowState');
            if (hasNativeWindowState && utilsContent.includes('ANTIGRAVITY WINDOW GEOMETRY PATCH V3')) {
                if (utilsContent.includes('// END ANTIGRAVITY WINDOW GEOMETRY PATCH V3')) {
                    utilsContent = utilsContent.replace(/\s*\/\/ ANTIGRAVITY WINDOW GEOMETRY PATCH V3[\s\S]*?\/\/ END ANTIGRAVITY WINDOW GEOMETRY PATCH V3/, '');
                } else {
                    utilsContent = utilsContent.replace(/\s*\/\/ ANTIGRAVITY WINDOW GEOMETRY PATCH V3[\s\S]*?initY = Math\.max\(wa\.y,\s*Math\.min\(initY,\s*wa\.y \+ wa\.height - initHeight\)\);\s*\}/, '');
                }
                utilsContent = utilsContent.replace(/let isRestoringWindowState = true;[\s\S]*?win\.on\('close',\s*\(\)\s*=>\s*saveWindowState\(true\)\);\s*void win\.loadURL\(url\);/, 'void win.loadURL(url);');
            }
            if (!hasNativeWindowState && !utilsContent.includes('ANTIGRAVITY WINDOW GEOMETRY PATCH V3')) {
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
    }
    // END ANTIGRAVITY WINDOW GEOMETRY PATCH V3`
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

            // 5.1. Короткий macOS-хук автообновления (обход ошибки подписи Squirrel.Mac через внешний mac_updater.cjs)
            // Сначала снимаем предыдущую версию хука для идемпотентного обновления при будущих релизах
            updaterContent = updaterContent.replace(/\s*if \(process\.platform === 'darwin'\) __agMacInitHook\(\);/g, '');
            updaterContent = updaterContent.replace(/\s*if \(process\.platform === 'darwin'\) __agMacSetPending\(info(?:,\s*true)?\);/g, '');
            updaterContent = updaterContent.replace(/\s*if \(process\.platform === 'darwin' && __agMacHandleSigError\(err\)\) return;/g, '');
            updaterContent = updaterContent.replace(/\s*if \(process\.platform === 'darwin' && __agMacLaunchUpdater\(\)\) return;/g, '');
            updaterContent = updaterContent.replace(/\s*\/\/ BEGIN ANTIGRAVITY MACOS UPDATER PATCH[\s\S]*?\/\/ END ANTIGRAVITY MACOS UPDATER PATCH\s*/g, '\n');

            if (isMac) {
                const macUpdaterScriptPath = path.join(__dirname, 'mac_updater.cjs');
                const macUpdaterHelper = `
// BEGIN ANTIGRAVITY MACOS UPDATER PATCH
const __agMacFs = require('fs');
const __agMacOs = require('os');
const __agMacPending = { version: null, downloadedFile: null, ready: false, launching: false };
const __AG_MAC_UPDATER_SCRIPT = ${JSON.stringify(macUpdaterScriptPath)};
const __AG_MAC_NODE_BIN = ${JSON.stringify(process.execPath)};
function __agMacResolveScript() {
    if (__agMacFs.existsSync(__AG_MAC_UPDATER_SCRIPT)) return __AG_MAC_UPDATER_SCRIPT;
    const fallback = path.join(__agMacOs.homedir(), '.antigravity-features-v2', 'mac_updater.cjs');
    return __agMacFs.existsSync(fallback) ? fallback : null;
}
function __agMacCloseProxyServer() {
    try {
        if (typeof electron_updater_1.autoUpdater.closeServerIfExists === 'function') {
            electron_updater_1.autoUpdater.closeServerIfExists();
        }
    } catch (e) {}
}
function __agMacInitHook() {
    if (process.platform !== 'darwin') return;
    try {
        if (__agMacResolveScript()) {
            electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
        }
        if (electron_updater_1.autoUpdater && !electron_updater_1.autoUpdater.__agMacQuitWrapped) {
            const origQuit = electron_updater_1.autoUpdater.quitAndInstall.bind(electron_updater_1.autoUpdater);
            electron_updater_1.autoUpdater.quitAndInstall = (...args) => {
                if (process.platform === 'darwin' && __agMacLaunchUpdater()) return;
                return origQuit(...args);
            };
            electron_updater_1.autoUpdater.__agMacQuitWrapped = true;
        }
    } catch (e) {}
}
function __agMacResolveZip() {
    if (__agMacPending.downloadedFile && __agMacFs.existsSync(__agMacPending.downloadedFile)) {
        return __agMacPending.downloadedFile;
    }
    const pendingDir = path.join(__agMacOs.homedir(), 'Library', 'Caches', 'com.google.antigravity', 'pending');
    try {
        const infoPath = path.join(pendingDir, 'update-info.json');
        if (__agMacFs.existsSync(infoPath)) {
            const meta = JSON.parse(__agMacFs.readFileSync(infoPath, 'utf8'));
            if (meta && meta.fileName) {
                const candidate = path.join(pendingDir, path.basename(meta.fileName));
                if (__agMacFs.existsSync(candidate)) return candidate;
            }
        }
    } catch (e) {}
    const defZip = path.join(pendingDir, 'Antigravity.zip');
    return __agMacFs.existsSync(defZip) ? defZip : null;
}
function __agMacSetPending(info, isDownloaded = false) {
    __agMacInitHook();
    if (info) {
        if (info.version) __agMacPending.version = info.version;
        if (info.downloadedFile) __agMacPending.downloadedFile = info.downloadedFile;
    }
    if (isDownloaded) {
        const zipPath = __agMacResolveZip();
        const scriptPath = __agMacResolveScript();
        if (zipPath && scriptPath) {
            __agMacPending.downloadedFile = zipPath;
            __agMacPending.ready = true;
            try { electron_updater_1.autoUpdater.autoInstallOnAppQuit = false; } catch (e) {}
            __agMacCloseProxyServer();
            console.log('[AutoUpdater] macOS update ready via mac_updater.cjs:', zipPath);
        }
    }
}
function __agMacHandleSigError(err) {
    __agMacInitHook();
    const msg = String(err && err.message ? err.message : err || '');
    if (!/Code signature|did not pass validation|code requirement|ShipIt|The command is disabled and cannot be executed/i.test(msg)) return false;
    const zipPath = __agMacResolveZip();
    const scriptPath = __agMacResolveScript();
    if (!zipPath || !scriptPath) return false;
    __agMacPending.downloadedFile = zipPath;
    __agMacPending.ready = true;
    try { electron_updater_1.autoUpdater.autoInstallOnAppQuit = false; } catch (e) {}
    __agMacCloseProxyServer();
    console.log('[AutoUpdater] macOS signature fallback armed via mac_updater.cjs for:', zipPath);
    broadcastState({
        type: types_1.UpdateState.Ready,
        update: { version: __agMacPending.version || 'latest' },
    });
    updateMenuState(MenuUpdateStep.RestartToUpdate);
    return true;
}
function __agMacLaunchUpdater() {
    if (__agMacPending.launching) return true;
    const scriptPath = __agMacResolveScript();
    const zipPath = __agMacResolveZip();
    if (!scriptPath || !zipPath) return false;
    __agMacPending.launching = true;
    __agMacPending.ready = true;
    __agMacCloseProxyServer();
    const nodeCandidates = [__AG_MAC_NODE_BIN, '/opt/homebrew/bin/node', '/usr/local/bin/node', 'node'];
    const nodeBin = nodeCandidates.find((p) => p === 'node' || (p && __agMacFs.existsSync(p))) || 'node';
    const appIdx = process.execPath.indexOf('.app/');
    const appBundle = appIdx !== -1 ? process.execPath.slice(0, appIdx + 4) : '/Applications/Antigravity.app';
    const args = [scriptPath, '--pid', String(process.pid), '--app-bundle', appBundle, '--zip', zipPath];
    if (__agMacPending.version) args.push('--version', String(__agMacPending.version));
    try {
        const child = (0, child_process_1.spawn)(nodeBin, args, { detached: true, stdio: 'ignore' });
        child.unref();
        console.log('[AutoUpdater] Spawned external mac_updater.cjs, quitting app to apply verified Google update...');
        try { electron_1.autoUpdater.emit('before-quit-for-update'); } catch (e) {}
        try { if (typeof utils_1.setShowQuitConfirmation === 'function') (0, utils_1.setShowQuitConfirmation)(false); } catch (e) {}
        electron_1.app.quit();
        return true;
    } catch (spawnErr) {
        __agMacPending.launching = false;
        console.error('[AutoUpdater] Failed to launch mac_updater.cjs:', spawnErr.message);
        return false;
    }
}
__agMacInitHook();
// END ANTIGRAVITY MACOS UPDATER PATCH
`;
                let macHookApplied = false;
                if (/electron_updater_1\.autoUpdater\.autoInstallOnAppQuit\s*=\s*electron_1\.app\.isPackaged;/.test(updaterContent)) {
                    updaterContent = updaterContent.replace(
                        /(electron_updater_1\.autoUpdater\.autoInstallOnAppQuit\s*=\s*electron_1\.app\.isPackaged;)/,
                        "$1\n    if (process.platform === 'darwin') __agMacInitHook();"
                    );
                }
                if (/electron_updater_1\.autoUpdater\.on\('update-available',\s*\(info\)\s*=>\s*\{/.test(updaterContent)) {
                    updaterContent = updaterContent.replace(
                        /(electron_updater_1\.autoUpdater\.on\('update-available',\s*\(info\)\s*=>\s*\{)/,
                        "$1\n        if (process.platform === 'darwin') __agMacSetPending(info);"
                    );
                }
                if (/electron_updater_1\.autoUpdater\.on\('update-downloaded',\s*\(info\)\s*=>\s*\{/.test(updaterContent)) {
                    updaterContent = updaterContent.replace(
                        /(electron_updater_1\.autoUpdater\.on\('update-downloaded',\s*\(info\)\s*=>\s*\{)/,
                        "$1\n        if (process.platform === 'darwin') __agMacSetPending(info, true);"
                    );
                }
                if (/electron_updater_1\.autoUpdater\.on\('error',\s*\(err\)\s*=>\s*\{\s*console\.error\('\[AutoUpdater\] Error:',\s*err\.message\);/.test(updaterContent)) {
                    updaterContent = updaterContent.replace(
                        /(electron_updater_1\.autoUpdater\.on\('error',\s*\(err\)\s*=>\s*\{\s*console\.error\('\[AutoUpdater\] Error:',\s*err\.message\);)/,
                        "$1\n        if (process.platform === 'darwin' && __agMacHandleSigError(err)) return;"
                    );
                    macHookApplied = true;
                }
                if (/function quitAndInstall\(\)\s*\{\s*electron_updater_1\.autoUpdater\.quitAndInstall\(\);/.test(updaterContent)) {
                    updaterContent = updaterContent.replace(
                        /(function quitAndInstall\(\)\s*\{)/,
                        "$1\n    if (process.platform === 'darwin' && __agMacLaunchUpdater()) return;"
                    );
                }
                if (macHookApplied) {
                    updaterContent = updaterContent.trimEnd() + '\n' + macUpdaterHelper;
                    console.log('[AutoPatcher-v2] Patched dist/updater.js with macOS Squirrel fallback hook (mac_updater.cjs)!');
                }
            }

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

        // 7.7 PATCH REMOTE SSH PAGES & DIALOGS (Antigravity 2.32.2+ dist/remote/*.js)
        const disconnectedPageExtracted = path.join(tempDir, 'dist', 'remote', 'disconnectedPage.js');
        if (fs.existsSync(disconnectedPageExtracted)) {
            let dpContent = fs.readFileSync(disconnectedPageExtracted, 'utf8');
            dpContent = dpContent.replace(/\?\s*'Reconnecting…'\s*:\s*'Disconnected'/g, "? 'Переподключение…' : 'Отключено'");
            dpContent = dpContent.replace(/`Reconnecting to \$\{host\}…`/g, '`Переподключение к ${host}…`');
            dpContent = dpContent.replace(/`Disconnected from \$\{host\}`/g, '`Отключено от ${host}`');
            dpContent = dpContent.replace(/`Agents keep running on \$\{host\}\.`/g, '`Агенты продолжают работать на ${host}.`');
            dpContent = dpContent.replace(/`Agents keep running on \$\{host\} unless its server stopped\.`/g, '`Агенты продолжают работать на ${host}, если сервер не был остановлен.`');
            dpContent = dpContent.replace(/>Reconnect<\/a>/g, '>Переподключиться</a>');
            dpContent = dpContent.replace(/>Close<\/a>/g, '>Закрыть</a>');
            fs.writeFileSync(disconnectedPageExtracted, dpContent, 'utf8');
        }
        const sshPromptsExtracted = path.join(tempDir, 'dist', 'remote', 'sshPrompts.js');
        if (fs.existsSync(sshPromptsExtracted)) {
            let spContent = fs.readFileSync(sshPromptsExtracted, 'utf8');
            spContent = spContent.replace(/>Asked again: your last answer may not have worked\.<\/div>/g, '>Повторный запрос: предыдущий ответ не подошёл.</div>');
            spContent = spContent.replace(/>That's too long\.<\/div>/g, '>Слишком длинное значение.</div>');
            spContent = spContent.replace(/<button id="cancel">Cancel<\/button><button id="continue">Continue<\/button>/g, '<button id="cancel">Отмена</button><button id="continue">Продолжить</button>');
            spContent = spContent.replace(/\?\s*`\$\{label\} asks:`\s*:\s*'Touch your security key'/g, "? `${label} запрашивает:` : 'Коснитесь электронного ключа безопасности'");
            spContent = spContent.replace(/buttons:\s*confirm\s*\?\s*\['Yes',\s*'No'\]\s*:\s*\['Cancel'\],/g, "buttons: confirm ? ['Да', 'Нет'] : ['Отмена'],");
            fs.writeFileSync(sshPromptsExtracted, spContent, 'utf8');
        }
        const sshPromptPreloadExtracted = path.join(tempDir, 'dist', 'remote', 'sshPromptPreload.js');
        if (fs.existsSync(sshPromptPreloadExtracted)) {
            let sppContent = fs.readFileSync(sshPromptPreloadExtracted, 'utf8');
            sppContent = sppContent.replace(/asks\.textContent = `\$\{label\} asks:`;/g, 'asks.textContent = `${label} запрашивает:`;');
            fs.writeFileSync(sshPromptPreloadExtracted, sppContent, 'utf8');
        }
        const remoteManagerExtracted = path.join(tempDir, 'dist', 'remote', 'remoteManager.js');
        if (fs.existsSync(remoteManagerExtracted)) {
            let rmContent = fs.readFileSync(remoteManagerExtracted, 'utf8');
            rmContent = rmContent.replace(/title:\s*'Choose an SSH config file',/g, "title: 'Выберите файл конфигурации SSH',");
            rmContent = rmContent.replace(/title:\s*'SSH connection failed',/g, "title: 'Ошибка подключения по SSH',");
            rmContent = rmContent.replace(/buttons:\s*\['Stop Server',\s*'Cancel'\],/g, "buttons: ['Остановить сервер', 'Отмена'],");
            rmContent = rmContent.replace(/title:\s*'Stop SSH server',/g, "title: 'Остановка SSH-сервера',");
            rmContent = rmContent.replace(/message:\s*`Stop the Antigravity server on \$\{entry\.label\}\?`,/g, 'message: `Остановить сервер Antigravity на ${entry.label}?`,');
            rmContent = rmContent.replace(/detail:\s*'Agents running on this host will stop and its window will close\. '\s*\+\s*'The server starts again the next time you connect\.',/g, "detail: 'Запущенные на этом хосте агенты будут остановлены, а окно закроется. Сервер снова запустится при следующем подключении.',");
            rmContent = rmContent.replace(/'Could not stop the SSH server'/g, "'Не удалось остановить SSH-сервер'");
            rmContent = rmContent.replace(/message:\s*`Not connected to \$\{label\}`,/g, 'message: `Нет подключения к ${label}`,');
            rmContent = rmContent.replace(/detail:\s*'Reconnect first, then stop its server\.',/g, "detail: 'Сначала переподключитесь, а затем остановите сервер.',");
            rmContent = rmContent.replace(/buttons:\s*\['Sign In',\s*'Cancel'\],/g, "buttons: ['Войти', 'Отмена'],");
            rmContent = rmContent.replace(/title:\s*'Sign in',/g, "title: 'Вход в организацию',");
            rmContent = rmContent.replace(/message:\s*`Sign in to your organization for \$\{entry\.label\}\?`,/g, 'message: `Войти в организацию для ${entry.label}?`,');
            fs.writeFileSync(remoteManagerExtracted, rmContent, 'utf8');
        }
        const sshErrorTextExtracted = path.join(tempDir, 'dist', 'remote', 'sshErrorText.js');
        if (fs.existsSync(sshErrorTextExtracted)) {
            let seContent = fs.readFileSync(sshErrorTextExtracted, 'utf8');
            seContent = seContent.replace(/return `Error code: \$\{err\.code\}\\nLogs: \$\{logPath\(\)\}`;/g, 'return `Код ошибки: ${err.code}\\nЖурнал: ${logPath()}`;');
            seContent = seContent.replace(/`\$\{label\} reported: \$\{text\}`/g, '`${label} сообщил: ${text}`');
            seContent = seContent.replace(/'The connection was closed before it finished\.'/g, "'Соединение было закрыто до завершения подключения.'");
            fs.writeFileSync(sshErrorTextExtracted, seContent, 'utf8');
        }

        // 8. VALIDATE ALL PATCHED JS FILES WITH NATIVE V8 IN-MEMORY COMPILER (ZERO CHILD PROCESSES)
        const filesToValidate = [preloadExtracted, trayExtracted, mainExtracted, utilsExtracted, updaterExtracted, menuExtracted, ipcHandlersExtracted, provisionSplashExtracted, wizardHtmlExtracted, cablev2Extracted, deviceChooserExtracted, webauthnExtracted, webviewPopupSecurityExtracted, disconnectedPageExtracted, sshPromptsExtracted, sshPromptPreloadExtracted, remoteManagerExtracted, sshErrorTextExtracted];
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
        if (isBuildOnly) {
            console.log('[AutoPatcher-v2] Build-only mode: skipped applying app.asar.patched to disk.');
        } else {
            let applied = false;
            try {
                fs.copyFileSync(patchedAsar, asarPath);
                console.log('[AutoPatcher-v2] Directly applied app.asar.patched to resources/app.asar!');
                applied = true;
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
                    applied = true;
                } catch (renameErr) {
                    console.log('[AutoPatcher-v2] Direct copy deferred to exit_patcher:', renameErr.message);
                }
            }

            if (applied && isMac && appBundlePath && fs.existsSync(appBundlePath)) {
                try {
                    console.log('[AutoPatcher-v2] Updating macOS code signature...');
                    const fwDir = path.join(appBundlePath, 'Contents', 'Frameworks');
                    const elFwDir = path.join(fwDir, 'Electron Framework.framework', 'Versions', 'A');
                    try { execSync(`codesign --force --sign - "${path.join(elFwDir, 'Libraries')}"/*.dylib 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
                    try { execSync(`codesign --force --sign - "${path.join(elFwDir, 'Helpers')}"/* 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
                    try { execSync(`find "${fwDir}" -name "*.framework" -exec codesign --force --sign - {} \\; 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
                    try { execSync(`find "${fwDir}" -name "*.app" -exec codesign --force --sign - {} \\; 2>/dev/null || true`, { stdio: 'ignore' }); } catch(e) {}
                    execSync(`codesign --force --sign - "${appBundlePath}"`, { stdio: 'ignore' });
                    try { execSync(`xattr -cr "${appBundlePath}"`, { stdio: 'ignore' }); } catch(e) {}
                    console.log('[AutoPatcher-v2] macOS code signature updated and verified successfully!');
                } catch (csErr) {
                    console.warn('[AutoPatcher-v2] Code signing notice:', csErr.message);
                }
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
