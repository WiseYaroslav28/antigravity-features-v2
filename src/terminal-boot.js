function initTerminalInjection() {
    try {
        if (window.__antigravity_terminal_injected) return;
        window.__antigravity_terminal_injected = true;
        
        console.log("[Antigravity Term Injection] Initializing terminal WebSocket hook...");
        
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            const ws = new OriginalWebSocket(url, protocols);
            
            const urlStr = String(url);
            // Проверяем, является ли WebSocket терминальным
            if (urlStr.includes('/terminal') || urlStr.includes('/pty') || urlStr.includes('/shell') || urlStr.includes('/term')) {
                console.log("[Antigravity Term Injection] Terminal WebSocket connection detected:", urlStr);
                try {
                    localStorage.setItem('antigravity_terminal_status', 'WebSocket detected: ' + urlStr + ' at ' + new Date().toISOString());
                } catch(e) {}
                
                let hasSentCd = false;
                const originalSend = ws.send;
                
                ws.send = function(data) {
                    console.log("[Antigravity Term Debug] Terminal WebSocket sent data:", data);
                    
                    if (!hasSentCd) {
                        hasSentCd = true;
                        
                        // Задержка перед отправкой команды cd для инициализации shell
                        setTimeout(() => {
                            try {
                                // 1. Определяем путь к текущему проекту
                                let projectPath = null;
                                
                                // Ищем UUID проекта в URL
                                const urlMatch = window.location.href.match(/projects\/([a-f0-9\-]{36})/i) || 
                                                 window.location.hash.match(/projects\/([a-f0-9\-]{36})/i);
                                
                                if (urlMatch && window.__antigravity_projects_map) {
                                    const projectId = urlMatch[1];
                                    projectPath = window.__antigravity_projects_map[projectId];
                                    console.log(`[Antigravity Term Injection] Found project ID ${projectId} in URL. Target path: ${projectPath}`);
                                    try {
                                        localStorage.setItem('antigravity_terminal_status', 'Project ID found: ' + projectId + ' -> ' + projectPath);
                                    } catch(e) {}
                                }
                                
                                // Fallback: если проект не определен по URL, пробуем взять первый из карты проектов
                                if (!projectPath && window.__antigravity_projects_map) {
                                    const paths = Object.values(window.__antigravity_projects_map);
                                    if (paths.length > 0) {
                                        projectPath = paths[0];
                                    }
                                }
                                
                                // Крайний fallback
                                if (!projectPath) {
                                    projectPath = "C:\\Antigravity projects\\antigravity-features";
                                }
                                
                                const cdCommand = `cd "${projectPath}"\r`;
                                let sent = false;
                                
                                // 2. Пытаемся адаптироваться под формат данных (JSON или сырой текст)
                                if (typeof data === 'string') {
                                    const trimmed = data.trim();
                                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                                        try {
                                            const parsed = JSON.parse(data);
                                            console.log("[Antigravity Term Debug] Parsed client message structure:", parsed);
                                            
                                            if (parsed.type) {
                                                originalSend.call(ws, JSON.stringify({ type: "input", data: cdCommand }));
                                                originalSend.call(ws, JSON.stringify({ type: "stdin", data: cdCommand }));
                                                sent = true;
                                            } else if (parsed.event) {
                                                originalSend.call(ws, JSON.stringify({ event: "input", data: cdCommand }));
                                                originalSend.call(ws, JSON.stringify({ event: "stdin", data: cdCommand }));
                                                sent = true;
                                            } else if (Array.isArray(parsed)) {
                                                originalSend.call(ws, JSON.stringify(["input", cdCommand]));
                                                originalSend.call(ws, JSON.stringify(["stdin", cdCommand]));
                                                originalSend.call(ws, JSON.stringify([0, cdCommand]));
                                                sent = true;
                                            }
                                        } catch (e) {
                                            console.error("[Antigravity Term Debug] Error parsing client JSON:", e);
                                        }
                                    }
                                }
                                
                                // Если не JSON или не подошел формат, отправляем сырой текст
                                if (!sent) {
                                    console.log("[Antigravity Term Debug] Sending raw cd command:", cdCommand.trim());
                                    originalSend.call(ws, cdCommand);
                                }
                                try {
                                    localStorage.setItem('antigravity_terminal_status', 'Command sent: ' + cdCommand.trim() + ' at ' + new Date().toISOString());
                                } catch(e) {}
                            } catch (err) {
                                console.error("[Antigravity Term Injection] Auto-cd execution failed:", err);
                            }
                        }, 800);
                    }
                    
                    return originalSend.apply(this, arguments);
                };
            }
            return ws;
        };
        
        // Восстанавливаем прототипы
        Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
        window.WebSocket.prototype = OriginalWebSocket.prototype;
        
    } catch (e) {
        console.error("[Antigravity Term Injection] Error initializing hook:", e);
    }
}

const initInterval = setInterval(() => {
    if (document.body && document.head) {
        clearInterval(initInterval);
        const protocol = window.location.protocol;
        const isTopFrame = (window === window.top);
        const hasNativeBridge = !!(
            window.electronNative ||
            window.electronUpdater ||
            window.nativeStorage ||
            window.vscode ||
            window.__antigravity_force_shell === true
        );
        // Only the real Antigravity BrowserWindow shell (with preload contextBridge or IDE scheme)
        // gets the EN/RU widget & terminal hook — NEVER guest tabs in Built-in Browser (e.g. localhost:3000)
        const isAntigravityShell = isTopFrame && (
            hasNativeBridge ||
            protocol === 'vscode-file:' ||
            protocol === 'antigravity-ide:'
        );
        // Only internal Antigravity UI plugin frames (e.g. plugin://swarm) get subframe DOM translation
        const isAntigravitySubframe = !isAntigravityShell && (
            protocol === 'plugin:' ||
            protocol === 'vscode-webview:' ||
            (!isTopFrame && (protocol === 'vscode-file:' || protocol === 'antigravity-ide:'))
        );
        if (isAntigravityShell) {
            const myEpoch = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
            const isHotReload = !!window.__antigravity_localizer_loaded || !!(document.documentElement && document.documentElement.getAttribute('data-ag-loc-epoch'));
            // Dispose any previous instance in THIS SAME JS world synchronously BEFORE starting new timers/observers
            if (typeof window.__antigravity_dispose_current === 'function') {
                try { window.__antigravity_dispose_current(); } catch (e) {}
            }
            window.__antigravity_active_epoch = myEpoch;
            window.__antigravity_localizer_loaded = true;
            try {
                if (document.documentElement) {
                    document.documentElement.setAttribute('data-ag-loc-epoch', myEpoch);
                    document.documentElement.setAttribute('data-ag-loc-ver', '2.2.2');
                }
                // Notify isolated/other worlds (e.g. preload.js <-> CDP main world) to step down cleanly
                window.postMessage({ type: 'ANTIGRAVITY_LOC_SUPERSEDED', epoch: myEpoch }, '*');
            } catch (e) {}
            let disposedSelf = false;
            const myDisposers = [];
            window.__ag_register_disposer = (fn) => {
                if (typeof fn === 'function') myDisposers.push(fn);
            };
            const disposeSelf = () => {
                if (disposedSelf) return;
                disposedSelf = true;
                try { window.removeEventListener('message', onSuperseded); } catch (e) {}
                stopObserving();
                for (const fn of myDisposers) {
                    try { fn(); } catch (e) {}
                }
                myDisposers.length = 0;
            };
            const onSuperseded = (ev) => {
                try {
                    if (ev && ev.data && ev.data.type === 'ANTIGRAVITY_LOC_SUPERSEDED' && ev.data.epoch && ev.data.epoch !== myEpoch) {
                        disposeSelf();
                    }
                } catch (e) {}
            };
            window.__antigravity_dispose_current = disposeSelf;
            window.addEventListener('message', onSuperseded);
            initLanguageSwitcher();
            initTerminalInjection();
            if (!isEnglishMode()) {
                if (isHotReload) {
                    try { restoreOriginalTree(); } catch (e) {}
                }
                startObserving();
                translateTree(document.body);
            }
        } else if (isAntigravitySubframe) {
            const myEpoch = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
            const isHotReload = !!window.__antigravity_localizer_loaded || !!(document.documentElement && document.documentElement.getAttribute('data-ag-loc-epoch'));
            if (typeof window.__antigravity_dispose_current === 'function') {
                try { window.__antigravity_dispose_current(); } catch (e) {}
            }
            window.__antigravity_active_epoch = myEpoch;
            window.__antigravity_localizer_loaded = true;
            try {
                if (document.documentElement) {
                    document.documentElement.setAttribute('data-ag-loc-epoch', myEpoch);
                    document.documentElement.setAttribute('data-ag-loc-ver', '2.2.2');
                }
                window.postMessage({ type: 'ANTIGRAVITY_LOC_SUPERSEDED', epoch: myEpoch }, '*');
            } catch (e) {}
            let disposedSelf = false;
            const onSubframeLangSync = (ev) => {
                try {
                    if (ev && ev.data && ev.data.type === 'ANTIGRAVITY_LOC_SUPERSEDED' && ev.data.epoch && ev.data.epoch !== myEpoch) {
                        disposeSelf();
                        return;
                    }
                    if (ev && ev.data && ev.data.type === 'ANTIGRAVITY_LANG_SYNC') {
                        const nextLang = ev.data.lang === 'en' ? 'en' : 'ru';
                        window.__antigravity_subframe_lang = nextLang;
                        if (nextLang === 'en') {
                            stopObserving();
                            restoreOriginalTree();
                        } else {
                            startObserving();
                            translateTree(document.body);
                        }
                    }
                } catch (e) {}
            };
            const disposeSelf = () => {
                if (disposedSelf) return;
                disposedSelf = true;
                try { window.removeEventListener('message', onSubframeLangSync); } catch (e) {}
                stopObserving();
            };
            window.__antigravity_dispose_current = disposeSelf;
            if (!window.__antigravity_subframe_lang) {
                window.__antigravity_subframe_lang = 'ru';
            }
            window.addEventListener('message', onSubframeLangSync);
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'ANTIGRAVITY_LANG_QUERY' }, '*');
                }
            } catch (e) {}
            if (!isEnglishMode()) {
                if (isHotReload) {
                    try { restoreOriginalTree(); } catch (e) {}
                }
                startObserving();
                translateTree(document.body);
            }
        } else {
            // Guest web page (e.g. Built-in Browser tab on http://localhost:3000):
            // clean up any stray widget/observer left by older versions and leave the page untouched.
            stopObserving();
            const strayWrapper = document.getElementById('antigravity-topbar-controls');
            if (strayWrapper) strayWrapper.remove();
            const straySwitcher = document.getElementById('antigravity-lang-switcher');
            if (straySwitcher) straySwitcher.remove();
            const strayStyle = document.getElementById('antigravity-lang-switcher-style');
            if (strayStyle) strayStyle.remove();
            if (window.__antigravity_status_interval) {
                clearInterval(window.__antigravity_status_interval);
                window.__antigravity_status_interval = null;
            }
            if (window.__antigravity_remote_check_interval) {
                clearInterval(window.__antigravity_remote_check_interval);
                window.__antigravity_remote_check_interval = null;
            }
            if (window.__antigravity_localizer_loaded) {
                window.__antigravity_localizer_loaded = false;
                try { restoreOriginalTree(); } catch (e) {}
            }
        }
    }
}, 50);

window.__antigravity_translate_tree = translateTree;
window.__antigravity_restore_tree = restoreOriginalTree;
