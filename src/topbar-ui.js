function initLanguageSwitcher() {
    const existingWrapper = document.getElementById('antigravity-topbar-controls');
    if (existingWrapper) {
        existingWrapper.remove();
    }
    const existingSwitcher = document.getElementById('antigravity-lang-switcher');
    if (existingSwitcher) {
        existingSwitcher.remove();
    }
    const existingStyle = document.getElementById('antigravity-lang-switcher-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    if (window.__antigravity_status_interval) {
        clearInterval(window.__antigravity_status_interval);
        window.__antigravity_status_interval = null;
    }
    if (window.__antigravity_remote_check_interval) {
        clearInterval(window.__antigravity_remote_check_interval);
        window.__antigravity_remote_check_interval = null;
    }

    const FALLBACK_VERSION = '2.2.2';
    const DEFAULT_CHANGELOG_V222 = 'Обновление v2.2.2: исправлено наложение плашки EN | RU при открытии меню «три точки» (⋮) — syncTopbarPosition больше не учитывает скрытые бэкдропы и меню Base UI, а z-index панели не перекрывает выпадающие меню; добавлен полный перевод новинок AntiGravity 2.34.0 (Настройки оркестратора, Уровень размышления, полка «Наука» с 5 научными плагинами, Настройка боковой панели, Фильтры и сортировка, клавиша отправки сообщений, область одобрения разрешений и UI-плагины).';
    const isFreshFallbackBump = !window.__antigravity_local_version || compareSemverClient(FALLBACK_VERSION, window.__antigravity_local_version) >= 0;
    if (!window.__antigravity_local_version || compareSemverClient(FALLBACK_VERSION, window.__antigravity_local_version) > 0) {
        window.__antigravity_local_version = FALLBACK_VERSION;
    }
    let currentLocalVersion = window.__antigravity_local_version;
    if (!window.__antigravity_remote_version || compareSemverClient(currentLocalVersion, window.__antigravity_remote_version) > 0 || (isFreshFallbackBump && !String(window.__antigravity_remote_changelog || '').includes('v' + FALLBACK_VERSION))) {
        window.__antigravity_remote_version = currentLocalVersion;
        window.__antigravity_remote_changelog = DEFAULT_CHANGELOG_V222;
    }
    let latestGithubVersion = window.__antigravity_remote_version;
    let latestGithubChangelog = window.__antigravity_remote_changelog || DEFAULT_CHANGELOG_V222;
    let isUpdatePending = false;
    let isHotUpdated = false;
    let hasRemoteUpdate = false;
    let isBusyUpdating = false;
    let lastCheckedTimeStr = '';
    let autoUpdateEnabled = true;
    try {
        const savedAutoUpd = localStorage.getItem('antigravity_auto_update');
        if (savedAutoUpd === 'false' || savedAutoUpd === '0') {
            autoUpdateEnabled = false;
        }
    } catch (e) {}

    const wrapper = document.createElement('div');
    wrapper.id = 'antigravity-topbar-controls';
    wrapper.className = 'topbar-controls-wrapper';
    wrapper.innerHTML = `
        <div id="antigravity-version-btn" class="version-status-btn state-ok" title="Локализация актуальна (v${currentLocalVersion}). Нажмите для проверки обновлений">
            <span class="agy-info-glyph" aria-hidden="true">
                <span class="agy-info-dot" id="version-btn-dot"></span>
                <span class="agy-info-stem"></span>
            </span>
        </div>
        <div id="antigravity-lang-switcher" class="lang-switcher">
            <div class="lang-btn" id="lang-btn-en" title="Switch interface to English"><span>EN</span></div>
            <div class="lang-btn" id="lang-btn-ru" title="Переключить интерфейс на русский язык">
                <span class="ru-text" id="ru-btn-label">RU</span>
            </div>
        </div>
        <div class="update-popup" id="update-popup-card">
            <div class="update-popup-header">
                <div class="update-popup-title" id="update-popup-title">🟢 Установлена последняя версия</div>
                <div class="update-popup-close" id="update-popup-close" title="Закрыть">✕</div>
            </div>
            <div class="update-version-badge" id="update-version-badge">Версия: v${currentLocalVersion} • GitHub: v${latestGithubVersion}</div>
            <div class="update-popup-desc" id="update-popup-desc">${latestGithubChangelog}</div>
            <div class="update-popup-actions">
                <button class="update-action-btn primary" id="update-check-install-btn">🔄 Проверить и установить обновления</button>
                <button class="update-action-btn secondary" id="update-restart-action-btn">⚡ Перезапустить AntiGravity</button>
                <button class="update-action-btn star-btn" id="update-star-action-btn" title="Открыть репозиторий на GitHub и поддержать проект звездой">⭐ Поддержать звездой на GitHub</button>
                <button class="update-action-btn secondary" id="update-feedback-action-btn" title="Сообщить о непереведённой строке, предложить идею или заказать доработку на GitHub">💬 Предложить идею / Заказать доработку</button>
            </div>
            <div class="update-popup-footer">
                <div class="update-toggle-row" id="update-autoupdate-row" title="Автоматически проверять и устанавливать свежие переводы с GitHub в фоне">
                    <span class="update-toggle-label">🔄 Автообновление с GitHub</span>
                    <div class="update-toggle-control">
                        <span class="update-toggle-state" id="update-autoupdate-state">${autoUpdateEnabled ? 'Вкл' : 'Выкл'}</span>
                        <div class="update-toggle-switch ${autoUpdateEnabled ? 'active' : ''}" id="update-autoupdate-switch" role="switch" aria-checked="${autoUpdateEnabled}">
                            <div class="update-toggle-knob"></div>
                        </div>
                    </div>
                </div>
                <button class="update-uninstall-link" id="update-uninstall-trigger-btn" title="Полностью удалить русификатор, патч app.asar и MCP-сервер">🗑️ Удалить русификатор…</button>
                <div class="update-uninstall-confirm" id="update-uninstall-confirm-box" style="display: none;">
                    <div class="update-uninstall-warn" id="update-uninstall-warn-text">Для временного возврата оригинала нажмите <b>EN</b> сверху. Полное удаление уберёт перевод, патч <code>app.asar</code> и MCP-сервер и перезапустит чистую IDE.</div>
                    <div class="update-uninstall-btn-row">
                        <button class="update-action-btn danger-btn" id="update-uninstall-confirm-btn">Да, удалить</button>
                        <button class="update-action-btn secondary" id="update-uninstall-cancel-btn">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.id = 'antigravity-lang-switcher-style';
    style.innerHTML = `
        .topbar-controls-wrapper {
            position: fixed;
            top: 6px;
            right: 210px;
            height: 28px;
            z-index: 55;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: inherit;
            -webkit-app-region: no-drag;
            user-select: none;
            transition: none !important;
        }
        .topbar-controls-wrapper.show-popup {
            z-index: 6500;
        }
        .lang-switcher {
            display: flex;
            align-items: center;
            height: 28px;
            box-sizing: border-box;
            background: transparent;
            border: 1px solid var(--border, rgba(128, 128, 128, 0.22));
            border-radius: 9999px;
            padding: 2px;
            gap: 2px;
            font-size: 11px;
            line-height: 1;
            color: var(--muted-foreground, #80868b);
            transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
        }
        .lang-switcher:hover {
            border-color: var(--glass-border, var(--border, rgba(128, 128, 128, 0.35)));
        }
        .lang-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            height: 100%;
            min-width: 32px;
            box-sizing: border-box;
            padding: 0 8px;
            border-radius: 9999px;
            cursor: pointer;
            font-weight: 500;
            line-height: 1;
            letter-spacing: 0.01em;
            transition: background-color 0.15s ease, color 0.15s ease;
        }
        .lang-btn > span {
            display: inline-block;
            line-height: 1;
            transform: translateY(0.5px);
        }
        .lang-btn.active {
            background: var(--secondary, rgba(128, 128, 128, 0.18));
            color: var(--foreground, #e8eaed);
            font-weight: 600;
        }
        .lang-btn:hover:not(.active) {
            background: var(--muted, rgba(128, 128, 128, 0.08));
            color: var(--secondary-foreground, var(--foreground));
        }

        /* Minimalist "i" Status Icon matching native h-7 w-7 rounded-lg header icon buttons */
        .version-status-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: transparent;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.15s ease, opacity 0.15s ease;
            padding: 0;
            box-sizing: border-box;
            opacity: 0.85;
        }
        .version-status-btn:hover {
            opacity: 1;
            background: var(--secondary, rgba(128, 128, 128, 0.14));
        }
        .agy-info-glyph {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2.5px;
            pointer-events: none;
        }
        .agy-info-dot {
            width: 2.5px;
            height: 2.5px;
            border-radius: 50%;
            transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .agy-info-stem {
            width: 2px;
            height: 7px;
            border-radius: 1px;
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }

        /* STATE 1: Native theme foreground/muted by default */
        .version-status-btn.state-ok .agy-info-dot,
        .version-status-btn.state-ok .agy-info-stem {
            background-color: var(--secondary-foreground, var(--muted-foreground, #80868b));
            box-shadow: none;
        }
        /* Subtle green dot feedback only when hovering over the "i" icon */
        .version-status-btn.state-ok:hover .agy-info-dot {
            background-color: #34d399;
            box-shadow: 0 0 4px rgba(52, 211, 153, 0.7);
        }
        .version-status-btn.state-ok:hover .agy-info-stem {
            background-color: var(--foreground, #e8eaed);
        }

        /* STATE 2: Yellow/Orange (Attracts attention ONLY when an update is available or restart is needed) */
        .version-status-btn.state-attention {
            opacity: 1;
        }
        .version-status-btn.state-attention .agy-info-dot {
            background-color: #fbbf24;
            box-shadow: 0 0 6px rgba(251, 191, 36, 0.95);
            animation: agy-dot-blink 1.2s infinite alternate;
        }
        .version-status-btn.state-attention .agy-info-stem {
            background-color: #f59e0b;
            box-shadow: 0 0 5px rgba(245, 158, 11, 0.55);
        }
        [data-theme="light"] .version-status-btn.state-attention .agy-info-dot,
        [data-theme="light"] .version-status-btn.state-attention .agy-info-stem {
            background-color: #d97706;
        }

        /* STATE 3: Checking / Downloading (Blue pulse) */
        .version-status-btn.state-checking {
            opacity: 1;
        }
        .version-status-btn.state-checking .agy-info-dot {
            background-color: #60a5fa;
            box-shadow: 0 0 6px #60a5fa;
            animation: agy-dot-blink 0.5s infinite alternate;
        }
        .version-status-btn.state-checking .agy-info-stem {
            background-color: #3b82f6;
        }
        @keyframes agy-dot-blink {
            0% { transform: scale(0.7); opacity: 0.5; }
            100% { transform: scale(1.25); opacity: 1; }
        }

        /* Dropdown Popup */
        .update-popup {
            position: absolute;
            top: 34px;
            right: 0;
            width: 300px;
            background: var(--card, var(--background, #1e1f22));
            border: 1px solid var(--card-border, var(--border, #3c4043));
            border-radius: 10px;
            padding: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
            color: var(--foreground, #e8eaed);
            display: none;
            flex-direction: column;
            gap: 8px;
            z-index: 1000000;
            backdrop-filter: blur(12px);
        }
        /* Invisible hover bridge so moving mouse from i icon to popup never loses hover */
        .update-popup::before {
            content: "";
            position: absolute;
            top: -10px;
            left: 0;
            right: 0;
            height: 10px;
            background: transparent;
        }
        .update-popup.warn-mode {
            border-color: #f59e0b;
        }
        .topbar-controls-wrapper.show-popup .update-popup,
        .version-status-btn:hover ~ .update-popup,
        .update-popup:hover {
            display: flex !important;
        }
        .update-popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .update-popup-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--success, #34d399);
            line-height: 1.3;
        }
        .update-popup.warn-mode .update-popup-title {
            color: var(--warning, #fbbf24);
        }
        .update-popup-close {
            font-size: 11px;
            color: var(--muted-foreground, #9aa0a6);
            cursor: pointer;
            padding: 0 4px;
            border-radius: 4px;
        }
        .update-popup-close:hover {
            color: var(--foreground, #ffffff);
            background: var(--secondary, rgba(128,128,128,0.14));
        }
        .update-version-badge {
            display: inline-block;
            align-self: flex-start;
            background: var(--secondary, rgba(128, 128, 128, 0.12));
            border: 1px solid var(--border, rgba(128, 128, 128, 0.2));
            border-radius: 6px;
            padding: 2px 6px;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
            color: var(--foreground, #e8eaed);
            font-weight: 600;
        }
        .update-popup-desc {
            font-size: 10px;
            line-height: 1.45;
            color: var(--muted-foreground, #9aa0a6);
            max-height: 110px;
            overflow-y: auto;
            white-space: pre-line;
        }
        .update-popup-actions {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-top: 2px;
        }
        .update-action-btn {
            background: #10b981;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: center;
        }
        .update-popup.warn-mode .update-action-btn.primary {
            background: #f59e0b;
            color: #1e1f22;
            font-weight: 700;
        }
        .update-action-btn.secondary {
            background: var(--secondary, rgba(128, 128, 128, 0.12));
            color: var(--secondary-foreground, var(--foreground, #bdc1c6));
            border: 1px solid var(--border, rgba(128, 128, 128, 0.18));
        }
        .update-action-btn.primary:hover {
            background: #059669;
            transform: translateY(-1px);
        }
        .update-popup.warn-mode .update-action-btn.primary:hover {
            background: #fbbf24;
        }
        .update-action-btn.secondary:hover {
            background: var(--onyx-selected, var(--secondary, rgba(128, 128, 128, 0.2)));
            color: var(--foreground, #ffffff);
        }
        .update-action-btn.star-btn {
            background: rgba(251, 191, 36, 0.12);
            color: var(--warning, #fbbf24);
            border: 1px solid rgba(251, 191, 36, 0.30);
        }
        .update-action-btn.star-btn:hover {
            background: rgba(251, 191, 36, 0.20);
            border-color: rgba(251, 191, 36, 0.55);
        }
        .update-action-btn:disabled {
            opacity: 0.6;
            cursor: wait;
            transform: none !important;
        }
        .update-popup-footer {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 2px;
            padding-top: 8px;
            border-top: 1px solid var(--border, rgba(128, 128, 128, 0.15));
        }
        .update-toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 4px 6px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .update-toggle-row:hover {
            background: var(--muted, rgba(128, 128, 128, 0.08));
        }
        .update-toggle-label {
            font-size: 10px;
            color: var(--secondary-foreground, var(--foreground, #bdc1c6));
            font-weight: 500;
        }
        .update-toggle-control {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .update-toggle-state {
            font-size: 9px;
            font-weight: 600;
            color: var(--muted-foreground, #9aa0a6);
            min-width: 24px;
            text-align: right;
        }
        .update-toggle-switch {
            position: relative;
            width: 26px;
            height: 14px;
            background: #4b5563;
            border-radius: 999px;
            transition: background-color 0.18s ease;
            flex-shrink: 0;
        }
        .update-toggle-switch.active {
            background: #10b981;
        }
        .update-toggle-knob {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
            transition: transform 0.18s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .update-toggle-switch.active .update-toggle-knob {
            transform: translateX(12px);
        }
        .update-uninstall-link {
            background: transparent;
            border: none;
            color: #80868b;
            font-size: 9.5px;
            padding: 3px 6px;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            transition: all 0.15s ease;
        }
        .update-uninstall-link:hover {
            color: #fca5a5;
            background: rgba(239, 68, 68, 0.10);
        }
        [data-theme="light"] .update-uninstall-link:hover {
            color: #dc2626;
            background: #fef2f2;
        }
        .update-uninstall-confirm {
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.28);
            border-radius: 6px;
            padding: 7px 8px;
        }
        [data-theme="light"] .update-uninstall-confirm {
            background: #fef2f2;
            border-color: #fecaca;
        }
        .update-uninstall-warn {
            font-size: 9.5px;
            line-height: 1.4;
            color: #e8eaed;
        }
        [data-theme="light"] .update-uninstall-warn {
            color: #7f1d1d;
        }
        .update-uninstall-btn-row {
            display: flex;
            gap: 5px;
        }
        .update-uninstall-btn-row .update-action-btn {
            flex: 1;
            padding: 5px 8px;
        }
        .update-action-btn.danger-btn {
            background: #ef4444;
            color: #ffffff;
        }
        .update-action-btn.danger-btn:hover {
            background: #dc2626;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(wrapper);

    const btnEn = document.getElementById('lang-btn-en');
    const btnRu = document.getElementById('lang-btn-ru');
    const versionBtn = document.getElementById('antigravity-version-btn');
    const popupCard = document.getElementById('update-popup-card');
    const popupTitle = document.getElementById('update-popup-title');
    const popupClose = document.getElementById('update-popup-close');
    const popupVersionBadge = document.getElementById('update-version-badge');
    const popupDesc = document.getElementById('update-popup-desc');
    const checkInstallBtn = document.getElementById('update-check-install-btn');
    const restartBtn = document.getElementById('update-restart-action-btn');
    const autoUpdateRow = document.getElementById('update-autoupdate-row');
    const autoUpdateSwitch = document.getElementById('update-autoupdate-switch');
    const autoUpdateStateLabel = document.getElementById('update-autoupdate-state');
    const uninstallTriggerBtn = document.getElementById('update-uninstall-trigger-btn');
    const uninstallConfirmBox = document.getElementById('update-uninstall-confirm-box');
    const uninstallWarnText = document.getElementById('update-uninstall-warn-text');
    const uninstallConfirmBtn = document.getElementById('update-uninstall-confirm-btn');
    const uninstallCancelBtn = document.getElementById('update-uninstall-cancel-btn');

    function renderAutoUpdateToggle() {
        if (!autoUpdateSwitch || !autoUpdateStateLabel) return;
        if (autoUpdateEnabled) {
            autoUpdateSwitch.classList.add('active');
            autoUpdateSwitch.setAttribute('aria-checked', 'true');
            autoUpdateStateLabel.innerText = 'Вкл';
        } else {
            autoUpdateSwitch.classList.remove('active');
            autoUpdateSwitch.setAttribute('aria-checked', 'false');
            autoUpdateStateLabel.innerText = 'Выкл';
        }
    }

    function resetUninstallConfirmUI() {
        if (!uninstallTriggerBtn || !uninstallConfirmBox) return;
        uninstallConfirmBox.style.display = 'none';
        uninstallTriggerBtn.style.display = '';
        if (uninstallConfirmBtn) {
            uninstallConfirmBtn.disabled = false;
            uninstallConfirmBtn.innerText = 'Да, удалить';
            delete uninstallConfirmBtn.dataset.cliFallback;
        }
        if (uninstallWarnText) {
            uninstallWarnText.innerHTML = 'Для временного возврата оригинала нажмите <b>EN</b> сверху. Полное удаление уберёт перевод, патч <code>app.asar</code> и MCP-сервер и перезапустит чистую IDE.';
        }
    }

    function broadcastLanguageToSubframes(lang) {
        try {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(frame => {
                try {
                    if (frame.contentWindow) {
                        frame.contentWindow.postMessage({ type: 'ANTIGRAVITY_LANG_SYNC', lang }, '*');
                    }
                } catch (e) {}
            });
        } catch (e) {}
    }

    if (!window.__antigravity_top_lang_responder_bound) {
        window.__antigravity_top_lang_responder_bound = true;
        window.addEventListener('message', (ev) => {
            try {
                if (ev && ev.data && ev.data.type === 'ANTIGRAVITY_LANG_QUERY' && ev.source && typeof ev.source.postMessage === 'function') {
                    ev.source.postMessage({ type: 'ANTIGRAVITY_LANG_SYNC', lang: getSavedLanguage() }, '*');
                }
            } catch (e) {}
        });
    }

    let topbarSyncRaf = 0;
    let topbarBurstUntil = 0;
    let topbarBurstRaf = 0;

    function runTopbarBurstFrame() {
        topbarBurstRaf = 0;
        syncTopbarPosition();
        if (performance.now() < topbarBurstUntil && document.body.contains(wrapper)) {
            topbarBurstRaf = requestAnimationFrame(runTopbarBurstFrame);
        }
    }

    function startTopbarTrackingBurst(durationMs = 650) {
        const until = performance.now() + durationMs;
        if (until > topbarBurstUntil) topbarBurstUntil = until;
        if (!topbarBurstRaf) {
            topbarBurstRaf = requestAnimationFrame(runTopbarBurstFrame);
        }
    }

    function scheduleTopbarSync() {
        startTopbarTrackingBurst(650);
        if (topbarSyncRaf) return;
        topbarSyncRaf = requestAnimationFrame(() => {
            topbarSyncRaf = 0;
            syncTopbarPosition();
        });
    }

    let observedTitlebar = null;
    let observedCorner = null;
    let observedChatRight = null;
    let observedAuxParent = null;
    let observedCornerMo = null;
    let observedTitlebarMo = null;
    let observedToolbarMo = null;
    let observedAuxMo = null;

    // Clean up any legacy <=v2.1.45 global handles and null them so an old v2.1.45 listener cannot touch our local instances
    if (window.__antigravity_sync_topbar_resize) {
        try { window.removeEventListener('resize', window.__antigravity_sync_topbar_resize); } catch (e) {}
        window.__antigravity_sync_topbar_resize = null;
    }
    if (window.__antigravity_sync_topbar_pointer) {
        try { window.removeEventListener('pointerdown', window.__antigravity_sync_topbar_pointer, true); } catch (e) {}
        window.__antigravity_sync_topbar_pointer = null;
    }
    if (window.__antigravity_sync_topbar_interval) {
        clearInterval(window.__antigravity_sync_topbar_interval);
        window.__antigravity_sync_topbar_interval = null;
    }
    if (window.__antigravity_topbar_ro) {
        try { window.__antigravity_topbar_ro.disconnect(); } catch (e) {}
        window.__antigravity_topbar_ro = null;
    }
    if (window.__antigravity_corner_mo) {
        try { window.__antigravity_corner_mo.disconnect(); } catch (e) {}
        window.__antigravity_corner_mo = null;
    }
    if (window.__antigravity_status_interval) {
        clearInterval(window.__antigravity_status_interval);
        window.__antigravity_status_interval = null;
    }
    if (window.__antigravity_remote_check_interval) {
        clearInterval(window.__antigravity_remote_check_interval);
        window.__antigravity_remote_check_interval = null;
    }

    const localTopbarRo = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(scheduleTopbarSync) : null;
    const localCornerMo = (typeof MutationObserver !== 'undefined') ? new MutationObserver(scheduleTopbarSync) : null;

    function attachTopbarObservers() {
        try {
            const corner = document.querySelector('div.absolute.right-0.z-50');
            const toolbar = document.querySelector('[data-testid="pane-titlebar-toolbar"]');
            const titlebar = toolbar ? toolbar.closest('[class*="titlebar"]') : document.querySelector('[class*="titlebar"]');
            const auxParent = document.querySelector('.agy-aux-tab')?.closest('.agy-layout-vars') || null;

            if (localTopbarRo) {
                if (titlebar && titlebar !== observedTitlebar) {
                    if (observedTitlebar) localTopbarRo.unobserve(observedTitlebar);
                    localTopbarRo.observe(titlebar);
                    observedTitlebar = titlebar;
                }
                if (corner && corner !== observedCorner) {
                    if (observedCorner) localTopbarRo.unobserve(observedCorner);
                    localTopbarRo.observe(corner);
                    observedCorner = corner;
                }
                if (toolbar && toolbar !== observedChatRight) {
                    if (observedChatRight) localTopbarRo.unobserve(observedChatRight);
                    localTopbarRo.observe(toolbar);
                    observedChatRight = toolbar;
                }
                if (auxParent && auxParent !== observedAuxParent) {
                    if (observedAuxParent) localTopbarRo.unobserve(observedAuxParent);
                    localTopbarRo.observe(auxParent);
                    observedAuxParent = auxParent;
                }
            }
            if (localCornerMo) {
                if (corner && corner !== observedCornerMo) {
                    localCornerMo.observe(corner, { childList: true, subtree: true });
                    observedCornerMo = corner;
                }
                if (titlebar && titlebar !== observedTitlebarMo) {
                    localCornerMo.observe(titlebar, { childList: true, subtree: true });
                    observedTitlebarMo = titlebar;
                }
                if (toolbar && toolbar !== observedToolbarMo) {
                    localCornerMo.observe(toolbar, { childList: true, subtree: true });
                    observedToolbarMo = toolbar;
                }
                if (auxParent && auxParent !== observedAuxMo) {
                    localCornerMo.observe(auxParent, { childList: true, subtree: true });
                    observedAuxMo = auxParent;
                }
            }
        } catch (e) {}
    }

    function syncTopbarPosition() {
        try {
            if (!document.body.contains(wrapper)) return;
            attachTopbarObservers();
            const w = window.innerWidth;
            if (!w) return;

            const corner = document.querySelector('div.absolute.right-0.z-50');
            const toolbar = document.querySelector('[data-testid="pane-titlebar-toolbar"]');
            const toolbarInner = toolbar
                ? (Array.from(toolbar.children).find(el =>
                    el.tagName !== 'STYLE' &&
                    el.tagName !== 'SCRIPT' &&
                    el.getAttribute('aria-hidden') !== 'true'
                ) || toolbar)
                : null;
            const auxParent = document.querySelector('.agy-aux-tab')?.closest('.agy-layout-vars') || null;
            const wrapWidth = wrapper.getBoundingClientRect().width || 96;

            const isOverlayOrPopup = (el) => {
                if (!el || el.nodeType !== 1) return true;
                if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return true;
                if (el.getAttribute('aria-hidden') === 'true') return true;
                if (el.hasAttribute('data-base-ui-portal') || el.hasAttribute('data-base-ui-backdrop') || el.hasAttribute('data-floating-ui-portal')) return true;
                const role = el.getAttribute('role') || '';
                if (role === 'menu' || role === 'dialog' || role === 'listbox' || role === 'tooltip' || role === 'presentation') return true;
                if (typeof el.closest === 'function' && el.closest('[role="menu"], [role="dialog"], [role="listbox"], [role="tooltip"], [data-base-ui-portal], [data-base-ui-backdrop]')) return true;
                const cs = window.getComputedStyle(el);
                if (cs.position === 'fixed' || cs.position === 'absolute') return true;
                return false;
            };

            const cornerItems = corner
                ? Array.from(corner.querySelectorAll('button, [role="button"], [data-testid="app-update-button"]')).filter(b => {
                    if (isOverlayOrPopup(b)) return false;
                    const r = b.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.height < 64;
                })
                : [];
            const cornerIconBtns = corner
                ? Array.from(corner.querySelectorAll('button')).filter(b => {
                    if (isOverlayOrPopup(b)) return false;
                    const r = b.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.height < 64;
                })
                : [];
            const cornerRect = corner ? corner.getBoundingClientRect() : null;

            const tbChildren = toolbarInner
                ? Array.from(toolbarInner.children).filter(el => {
                    if (isOverlayOrPopup(el)) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.height < 64 && r.width < 360;
                })
                : [];
            const tbRects = tbChildren.map(el => el.getBoundingClientRect());
            const tbIconBtns = toolbarInner
                ? Array.from(toolbarInner.querySelectorAll('button')).filter(b => {
                    if (isOverlayOrPopup(b)) return false;
                    const r = b.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.height < 64;
                })
                : [];
            let firstTbLeft = null;
            let lastTbRight = null;
            for (const r of tbRects) {
                if (firstTbLeft === null || r.left < firstTbLeft) firstTbLeft = r.left;
                if (lastTbRight === null || r.right > lastTbRight) lastTbRight = r.right;
            }
            const steadyTbVertRect = tbIconBtns.length
                ? tbIconBtns[0].getBoundingClientRect()
                : (tbRects.length ? tbRects[0] : null);

            let auxContentRightX = 0;
            if (auxParent) {
                const auxItems = Array.from(auxParent.querySelectorAll('.agy-aux-tab, button, [role="button"]'));
                for (const item of auxItems) {
                    const r = item.getBoundingClientRect();
                    if (r.width > 0 && r.left < w && r.right > 0 && r.right > auxContentRightX) {
                        auxContentRightX = r.right;
                    }
                }
            }

            let targetRight = null;
            let refRect = null;
            let usedToolbarSlot = false;

            const cornerSlotRight = cornerRect && cornerRect.width > 0 && cornerRect.left > w * 0.5
                ? Math.max(40, Math.round(w - cornerRect.left + 6))
                : null;
            const cornerSlotLeftX = cornerSlotRight !== null ? (w - cornerSlotRight - wrapWidth) : 0;

            const canUseCornerSlot =
                cornerSlotRight !== null &&
                cornerItems.length > 1 &&
                (lastTbRight === null || lastTbRight <= cornerSlotLeftX - 8) &&
                (auxContentRightX <= cornerSlotLeftX - 8);

            if (canUseCornerSlot) {
                targetRight = cornerSlotRight;
                refRect = cornerIconBtns.length ? cornerIconBtns[0].getBoundingClientRect() : cornerItems[0].getBoundingClientRect();
            } else if (firstTbLeft !== null && firstTbLeft > 120) {
                targetRight = Math.max(44, Math.round(w - firstTbLeft + 6));
                refRect = steadyTbVertRect;
                usedToolbarSlot = true;
            } else if (cornerSlotRight !== null) {
                targetRight = cornerSlotRight;
                refRect = cornerIconBtns.length
                    ? cornerIconBtns[0].getBoundingClientRect()
                    : (cornerItems.length ? cornerItems[0].getBoundingClientRect() : cornerRect);
            }

            // Reserve flexbox width inside [data-testid="pane-titlebar-toolbar"] so breadcrumbs/title truncate cleanly instead of colliding
            if (window.__antigravity_padded_toolbar && window.__antigravity_padded_toolbar !== toolbar) {
                try { window.__antigravity_padded_toolbar.style.paddingLeft = ''; } catch (e) {}
                window.__antigravity_padded_toolbar = null;
            }
            if (toolbar) {
                const desiredPad = usedToolbarSlot ? (Math.ceil(wrapWidth) + 10) + 'px' : '';
                if (toolbar.style.paddingLeft !== desiredPad) {
                    toolbar.style.paddingLeft = desiredPad;
                }
                window.__antigravity_padded_toolbar = usedToolbarSlot ? toolbar : null;
            }

            let computedTop = null;
            if (refRect && refRect.height > 0) {
                const btnCenterY = refRect.top + refRect.height / 2;
                const wrapRect = wrapper.getBoundingClientRect();
                if (wrapRect.height > 0) {
                    computedTop = Math.round(btnCenterY - wrapRect.height / 2);
                }
            }

            // Extra collision guard for [data-testid="app-update-button"] anywhere in the header
            const appUpdateBtn = document.querySelector('[data-testid="app-update-button"]');
            if (appUpdateBtn && targetRight !== null) {
                const uRect = appUpdateBtn.getBoundingClientRect();
                const effTopCheck = computedTop !== null ? computedTop : (wrapper.getBoundingClientRect().top || 6);
                if (uRect.width > 0 && uRect.height > 0 && Math.abs((uRect.top + uRect.height / 2) - (effTopCheck + 14)) < 20) {
                    const candRightX = w - targetRight;
                    const candLeftX = candRightX - wrapWidth;
                    if (candLeftX < uRect.right + 6 && candRightX > uRect.left - 6) {
                        targetRight = Math.max(targetRight, Math.round(w - uRect.left + 6));
                    }
                }
            }

            const isWinPlatform = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform || navigator.userAgent || '');
            if (targetRight !== null) {
                const effectiveTop = computedTop !== null ? computedTop : (wrapper.getBoundingClientRect().top || 6);
                if (isWinPlatform && effectiveTop < 32 && targetRight < 148) {
                    targetRight = 148;
                }
                wrapper.style.right = targetRight + 'px';
            }
            if (computedTop !== null) {
                wrapper.style.top = computedTop + 'px';
            } else if (targetRight === null) {
                // Keep pill aligned on Row 2 (same vertical line as chat toolbar) on empty-toolbar pages (/sidecars, /settings, /customizations, /automations)
                const titleMenu = document.querySelector('[data-testid="title-menu-bar"]');
                const tmBottom = titleMenu ? titleMenu.getBoundingClientRect().bottom : 0;
                const tbTop = toolbar ? toolbar.getBoundingClientRect().top : 0;
                const row2Top = tmBottom > 0
                    ? Math.round(tmBottom + 6)
                    : (tbTop >= 32 ? Math.round(tbTop - 14) : (isWinPlatform ? 41 : 6));
                wrapper.style.top = row2Top + 'px';
                wrapper.style.right = '16px';
            }
        } catch (e) {}
    }

    const localResizeHandler = scheduleTopbarSync;
    const localPointerHandler = (e) => {
        if (e && typeof e.clientY === 'number' && e.clientY <= 84) {
            startTopbarTrackingBurst(650);
        }
    };
    window.addEventListener('resize', localResizeHandler);
    window.addEventListener('pointerdown', localPointerHandler, true);
    const localTopbarInterval = setInterval(syncTopbarPosition, 1500);
    if (typeof window.__ag_register_disposer === 'function') {
        window.__ag_register_disposer(() => {
            clearInterval(localTopbarInterval);
            try { window.removeEventListener('resize', localResizeHandler); } catch (e) {}
            try { window.removeEventListener('pointerdown', localPointerHandler, true); } catch (e) {}
            if (localTopbarRo) { try { localTopbarRo.disconnect(); } catch (e) {} }
            if (localCornerMo) { try { localCornerMo.disconnect(); } catch (e) {} }
        });
    }
    startTopbarTrackingBurst(400);

    function updateUI() {
        const lang = getSavedLanguage();
        if (lang === 'ru') {
            btnRu.classList.add('active');
            btnEn.classList.remove('active');
            startObserving();
            translateTree(document.body);
        } else {
            btnEn.classList.add('active');
            btnRu.classList.remove('active');
            stopObserving();
            restoreOriginalTree();
        }
        broadcastLanguageToSubframes(lang);
        startTopbarTrackingBurst(400);
    }

    btnEn.addEventListener('click', () => {
        setSavedLanguage('en');
        updateUI();
    });

    btnRu.addEventListener('click', () => {
        setSavedLanguage('ru');
        updateUI();
    });

    if (popupClose) {
        popupClose.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.remove('show-popup');
            resetUninstallConfirmUI();
        });
    }
    if (popupCard) {
        popupCard.addEventListener('mouseleave', () => {
            if (!wrapper.classList.contains('show-popup')) {
                resetUninstallConfirmUI();
            }
        });
    }

    function renderVersionState(extraStatusText) {
        if (isBusyUpdating) return;
        hasRemoteUpdate = compareSemverClient(latestGithubVersion, currentLocalVersion) > 0;

        versionBtn.classList.remove('state-ok', 'state-attention', 'state-checking');
        popupCard.classList.remove('warn-mode');

        if (hasRemoteUpdate) {
            versionBtn.classList.add('state-attention');
            popupCard.classList.add('warn-mode');
            versionBtn.title = autoUpdateEnabled
                ? ('🟠 Доступно обновление v' + latestGithubVersion + '! Нажмите для скачивания и установки.')
                : ('🟠 Доступно обновление v' + latestGithubVersion + ' (автообновление выкл.). Нажмите для просмотра.');

            popupTitle.innerText = '🟠 Доступно обновление на GitHub!';
            popupVersionBadge.innerText = 'Обновление: v' + currentLocalVersion + ' → v' + latestGithubVersion;
            popupDesc.innerText = (latestGithubChangelog ? latestGithubChangelog + '\n' : '') + (autoUpdateEnabled
                ? 'Нажмите на иконку «i» или кнопку ниже, чтобы скачать и установить обновление.'
                : 'Автообновление выключено — нажмите кнопку ниже, чтобы скачать и установить обновление вручную.');
            checkInstallBtn.innerText = '⬇️ Скачать и установить v' + latestGithubVersion;
            restartBtn.innerText = '⚡ Перезапустить AntiGravity';
        } else if (isUpdatePending) {
            versionBtn.classList.add('state-attention');
            popupCard.classList.add('warn-mode');
            versionBtn.title = '🟠 Требуется перезапуск AntiGravity для применения патча (v' + currentLocalVersion + ')';

            popupTitle.innerText = '🟠 Требуется перезапуск AntiGravity';
            popupVersionBadge.innerText = 'Версия локализации: v' + currentLocalVersion;
            popupDesc.innerText = 'Официальная версия IDE обновлена, патч подготовлен. Нажмите кнопку перезапуска для применения.';
            checkInstallBtn.innerText = '🔄 Проверить обновления на GitHub';
            restartBtn.innerText = '🔄 Применить патч и перезапустить';
        } else if (isHotUpdated) {
            versionBtn.classList.add('state-ok');
            versionBtn.title = '🟢 Локализация успешно обновлена до v' + currentLocalVersion;

            popupTitle.innerText = '🟢 Обновление v' + currentLocalVersion + ' установлено!';
            popupVersionBadge.innerText = 'Установлена: v' + currentLocalVersion + ' • GitHub: v' + latestGithubVersion;
            popupDesc.innerText = (latestGithubChangelog || 'Новые переводы применены на лету без перезапуска.') + (extraStatusText ? '\n(' + extraStatusText + ')' : '');
            checkInstallBtn.innerText = '🔄 Проверить обновления ещё раз';
            restartBtn.innerText = '⚡ Перезапустить AntiGravity';
        } else {
            versionBtn.classList.add('state-ok');
            versionBtn.title = '🟢 Установлена последняя версия v' + currentLocalVersion + ' (GitHub: v' + latestGithubVersion + '). Нажмите для проверки обновлений.';

            popupTitle.innerText = '🟢 Установлена последняя версия';
            popupVersionBadge.innerText = 'Версия: v' + currentLocalVersion + ' • GitHub: v' + latestGithubVersion;
            popupDesc.innerText = (latestGithubChangelog || 'Установлена актуальная версия русификатора.') + (lastCheckedTimeStr ? '\nПроверено: ' + lastCheckedTimeStr : '');
            checkInstallBtn.innerText = '🔄 Проверить и установить обновления';
            restartBtn.innerText = '⚡ Перезапустить AntiGravity';
        }
    }

    // Live HTTP Hot-Reload from local MCP control server (http://127.0.0.1:39228/localization.js) — zero CDP port 9222 required
    async function pullHttpHotReload(targetVersion, targetHash, changelog) {
        if (window.__antigravity_http_reloading) return false;
        const now = Date.now();
        if (window.__antigravity_last_http_reload_at && (now - window.__antigravity_last_http_reload_at) < 2500) {
            return false;
        }
        window.__antigravity_http_reloading = true;
        try {
            const url = 'http://127.0.0.1:39228/localization.js?v=' + encodeURIComponent(targetVersion || '') + '&cb=' + now;
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) return false;
            const code = await resp.text();
            if (!code || code.length < 50000 || !code.includes('ANTIGRAVITY_LOC_SUPERSEDED')) {
                return false;
            }
            const fetchedVer = resp.headers.get('X-AG-Loc-Version') || targetVersion || currentLocalVersion;
            const fetchedHash = resp.headers.get('X-AG-Loc-Hash') || targetHash || '';
            window.__antigravity_last_http_reload_at = Date.now();
            if (fetchedHash) window.__antigravity_loaded_loc_hash = fetchedHash;
            if (fetchedVer && compareSemverClient(fetchedVer, currentLocalVersion) >= 0) {
                currentLocalVersion = fetchedVer;
                window.__antigravity_local_version = fetchedVer;
            }
            if (changelog) {
                latestGithubChangelog = changelog;
                window.__antigravity_remote_changelog = changelog;
            }
            if (typeof window.__antigravity_reload_subframes === 'function') {
                try { void window.__antigravity_reload_subframes(code); } catch (e) {}
            }
            let applied = false;
            try {
                (new Function(code))();
                applied = true;
            } catch (evalErr) {
                if (typeof window.__antigravity_reload_main === 'function') {
                    const ipcRes = await window.__antigravity_reload_main(code);
                    applied = !!(ipcRes && ipcRes.ok);
                }
            }
            return applied;
        } catch (e) {
            return false;
        } finally {
            window.__antigravity_http_reloading = false;
        }
    }

    // Poll local MCP control server (port 39228) for local version, hash & patch status
    async function checkUpdateStatus() {
        if (isBusyUpdating) return;
        try {
            const resp = await fetch('http://127.0.0.1:39228/status?ver=' + encodeURIComponent(currentLocalVersion), { cache: 'no-store' });
            if (resp.ok) {
                const data = await resp.json();
                if (data.latestRemoteVersion && compareSemverClient(data.latestRemoteVersion, latestGithubVersion) > 0) {
                    latestGithubVersion = data.latestRemoteVersion;
                    window.__antigravity_remote_version = latestGithubVersion;
                }
                if (typeof data.autoUpdate === 'boolean') {
                    let hasPendingLocalSync = false;
                    try {
                        hasPendingLocalSync = localStorage.getItem('antigravity_auto_update_pending_sync') === '1';
                    } catch (e) {}
                    if (hasPendingLocalSync) {
                        fetch('http://127.0.0.1:39228/set-auto-update?enabled=' + (autoUpdateEnabled ? '1' : '0'))
                            .then((r) => {
                                if (r.ok) {
                                    try { localStorage.removeItem('antigravity_auto_update_pending_sync'); } catch (e) {}
                                }
                            })
                            .catch(() => {});
                    } else if (autoUpdateEnabled !== data.autoUpdate) {
                        autoUpdateEnabled = data.autoUpdate;
                        try { localStorage.setItem('antigravity_auto_update', autoUpdateEnabled ? 'true' : 'false'); } catch (e) {}
                        renderAutoUpdateToggle();
                    }
                }
                isUpdatePending = !!data.asarUnpatched;

                // HTTP Live Hot-Reload check: pull fresh localization.js whenever disk version is newer OR hash changed after baseline
                const serverVer = data.version || '';
                const serverHash = data.localizationHash || '';
                const isDiskVersionNewer = serverVer && compareSemverClient(serverVer, currentLocalVersion) > 0;
                const isHashChanged = !!(serverHash && window.__antigravity_loaded_loc_hash && serverHash !== window.__antigravity_loaded_loc_hash);
                if (serverHash && !window.__antigravity_loaded_loc_hash && !isDiskVersionNewer) {
                    window.__antigravity_loaded_loc_hash = serverHash;
                }
                if (isDiskVersionNewer || isHashChanged) {
                    const noticeChangelog = (data.hotUpdateNotice && data.hotUpdateNotice.changelog) ? data.hotUpdateNotice.changelog : '';
                    const reloaded = await pullHttpHotReload(serverVer, serverHash, noticeChangelog);
                    if (reloaded) return;
                }

                if (data.hotUpdateNotice && data.hotUpdateNotice.to && compareSemverClient(data.hotUpdateNotice.to, currentLocalVersion) >= 0) {
                    isHotUpdated = true;
                    currentLocalVersion = data.hotUpdateNotice.to;
                    window.__antigravity_local_version = currentLocalVersion;
                    if (data.hotUpdateNotice.changelog) {
                        latestGithubChangelog = data.hotUpdateNotice.changelog;
                    }
                }
                renderVersionState();
            }
        } catch(e) {
            renderVersionState();
        }
    }

    // Directly check GitHub version.json so the A• icon turns yellow/orange as soon as a new release is published
    async function checkGithubRemoteVersion() {
        try {
            const ghResp = await fetch('https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/version.json?cb=' + Date.now(), { cache: 'no-store' });
            if (ghResp.ok) {
                const ghMeta = await ghResp.json();
                if (ghMeta && ghMeta.version) {
                    if (compareSemverClient(ghMeta.version, currentLocalVersion) >= 0) {
                        latestGithubVersion = ghMeta.version;
                        window.__antigravity_remote_version = latestGithubVersion;
                        if (ghMeta.changelog) {
                            latestGithubChangelog = ghMeta.changelog;
                            window.__antigravity_remote_changelog = latestGithubChangelog;
                        }
                    } else {
                        // Prevent Fastly CDN 1-3 min cache lag from downgrading displayed GitHub version below installed version
                        latestGithubVersion = currentLocalVersion;
                        window.__antigravity_remote_version = latestGithubVersion;
                    }
                    const now = new Date();
                    lastCheckedTimeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    renderVersionState();
                    return ghMeta;
                }
            }
        } catch(e) {}
        return null;
    }

    // Trigger immediate check, download, and hot-installation of updates from GitHub
    async function triggerUpdateCheckAndInstall(forceInstall = false) {
        if (isBusyUpdating) return;
        isBusyUpdating = true;
        wrapper.classList.add('show-popup');
        versionBtn.classList.remove('state-ok', 'state-attention');
        versionBtn.classList.add('state-checking');
        popupTitle.innerText = '⏳ Проверка и загрузка с GitHub...';
        checkInstallBtn.disabled = true;
        checkInstallBtn.innerText = '⏳ Скачивание и проверка обновлений...';

        try {
            const ghMeta = await checkGithubRemoteVersion();
            const remoteVer = (ghMeta && ghMeta.version) ? ghMeta.version : latestGithubVersion;
            const isNewerOnGh = compareSemverClient(remoteVer, currentLocalVersion) > 0;

            let serverUpdated = false;
            try {
                const url = 'http://127.0.0.1:39228/check-update' + (forceInstall ? '?force=1' : '');
                const resp = await fetch(url);
                if (resp.ok) {
                    const resData = await resp.json();
                    if (resData.status === 'updated') {
                        serverUpdated = true;
                        currentLocalVersion = resData.to || remoteVer;
                        window.__antigravity_local_version = currentLocalVersion;
                        isHotUpdated = true;
                        // Immediately pull and execute the freshly downloaded bundle over HTTP (no CDP required)
                        await pullHttpHotReload(currentLocalVersion, resData.localizationHash || '', resData.changelog || '');
                    } else if (resData.remoteVersion && compareSemverClient(resData.remoteVersion, currentLocalVersion) >= 0) {
                        latestGithubVersion = resData.remoteVersion;
                        window.__antigravity_remote_version = latestGithubVersion;
                    }
                }
            } catch (errServer) {}

            const isNotOlderOnGh = compareSemverClient(remoteVer, currentLocalVersion) >= 0;
            if ((isNewerOnGh || (forceInstall && isNotOlderOnGh)) && !serverUpdated) {
                const scriptResp = await fetch('https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/localization_injected.js?cb=' + Date.now(), { cache: 'no-store' });
                if (scriptResp.ok) {
                    const scriptCode = await scriptResp.text();
                    currentLocalVersion = remoteVer;
                    window.__antigravity_local_version = currentLocalVersion;
                    isHotUpdated = true;
                    setTimeout(() => {
                        try { (0, eval)(scriptCode); } catch (e) {}
                    }, 50);
                }
            }

            const now = new Date();
            lastCheckedTimeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            isBusyUpdating = false;
            checkInstallBtn.disabled = false;
            renderVersionState(isHotUpdated ? 'установлено только что' : '');
        } catch (err) {
            isBusyUpdating = false;
            checkInstallBtn.disabled = false;
            renderVersionState();
        }
    }

    // Clicking the compact "i" icon checks/installs updates when auto-update is ON, or simply opens the popup & checks metadata when OFF
    versionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (autoUpdateEnabled) {
            triggerUpdateCheckAndInstall(false);
        } else {
            wrapper.classList.toggle('show-popup');
            if (wrapper.classList.contains('show-popup')) {
                checkGithubRemoteVersion();
            } else {
                resetUninstallConfirmUI();
            }
        }
    });

    checkInstallBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await triggerUpdateCheckAndInstall(true);
    });

    if (autoUpdateRow) {
        autoUpdateRow.addEventListener('click', async (e) => {
            e.stopPropagation();
            autoUpdateEnabled = !autoUpdateEnabled;
            try {
                localStorage.setItem('antigravity_auto_update', autoUpdateEnabled ? 'true' : 'false');
                localStorage.setItem('antigravity_auto_update_pending_sync', '1');
            } catch (err) {}
            renderAutoUpdateToggle();
            renderVersionState();
            try {
                const r = await fetch('http://127.0.0.1:39228/set-auto-update?enabled=' + (autoUpdateEnabled ? '1' : '0'));
                if (r.ok) {
                    try { localStorage.removeItem('antigravity_auto_update_pending_sync'); } catch (err) {}
                }
            } catch (err) {}
        });
    }

    if (uninstallTriggerBtn && uninstallConfirmBox) {
        uninstallTriggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.add('show-popup');
            uninstallTriggerBtn.style.display = 'none';
            uninstallConfirmBox.style.display = 'flex';
        });
    }

    if (uninstallCancelBtn) {
        uninstallCancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUninstallConfirmUI();
        });
    }

    if (uninstallConfirmBtn) {
        uninstallConfirmBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isMacClient = /Mac|iPhone|iPad/i.test((navigator && navigator.platform) || '');
            const cliCmd = isMacClient
                ? 'curl -fsSL https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/uninstall.sh | bash'
                : 'irm https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/uninstall.ps1 | iex';

            if (uninstallConfirmBtn.dataset.cliFallback === '1') {
                try {
                    await navigator.clipboard.writeText(cliCmd);
                    uninstallConfirmBtn.innerText = '✅ Команда скопирована!';
                } catch (copyErr) {}
                return;
            }

            uninstallConfirmBtn.disabled = true;
            uninstallConfirmBtn.innerText = '⏳ Удаление...';
            try {
                const resp = await fetch('http://127.0.0.1:39228/uninstall');
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.success) {
                        try {
                            localStorage.removeItem('antigravity_ui_lang');
                            localStorage.removeItem('antigravity_lang');
                            localStorage.removeItem('antigravity_auto_update');
                            localStorage.removeItem('antigravity_auto_update_pending_sync');
                        } catch (lsErr) {}
                        if (uninstallWarnText) {
                            uninstallWarnText.innerText = '✅ Русификатор удаляется — сейчас откроется чистая AntiGravity...';
                        }
                        uninstallConfirmBtn.innerText = '⏳ Перезапуск...';
                        return;
                    }
                }
            } catch (err) {}

            // Graceful fallback if local MCP server hasn't been restarted into v2.1.42 yet or is offline
            uninstallConfirmBtn.disabled = false;
            uninstallConfirmBtn.dataset.cliFallback = '1';
            uninstallConfirmBtn.innerText = '📋 Скопировать команду';
            if (uninstallWarnText) {
                uninstallWarnText.innerHTML = 'Фоновый сервер ещё не обновлён в текущей сессии. Нажмите <b>«Перезапустить AntiGravity»</b> выше (и повторите удаление) либо выполните однострочную команду удаления в терминале.';
            }
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            restartBtn.innerText = '⏳ Перезапуск...';
            restartBtn.disabled = true;
            try {
                await fetch('http://127.0.0.1:39228/restart');
            } catch(err) {}
        });
    }

    const starBtn = document.getElementById('update-star-action-btn');
    if (starBtn) {
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const repoUrl = 'https://github.com/WiseYaroslav28/antigravity-features-v2';
            if (window.electronNative && typeof window.electronNative.openExternal === 'function') {
                window.electronNative.openExternal(repoUrl);
            } else if (typeof window.__antigravity_open_external === 'function') {
                window.__antigravity_open_external(repoUrl);
            } else {
                window.open(repoUrl, '_blank', 'noopener,noreferrer');
            }
        });
    }

    const feedbackBtn = document.getElementById('update-feedback-action-btn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const issueUrl = 'https://github.com/WiseYaroslav28/antigravity-features-v2/issues/new/choose';
            if (window.electronNative && typeof window.electronNative.openExternal === 'function') {
                window.electronNative.openExternal(issueUrl);
            } else if (typeof window.__antigravity_open_external === 'function') {
                window.__antigravity_open_external(issueUrl);
            } else {
                window.open(issueUrl, '_blank', 'noopener,noreferrer');
            }
        });
    }

    const localStatusInterval = setInterval(checkUpdateStatus, 4000);
    const localRemoteCheckInterval = setInterval(checkGithubRemoteVersion, 45000);
    if (typeof window.__ag_register_disposer === 'function') {
        window.__ag_register_disposer(() => {
            clearInterval(localStatusInterval);
            clearInterval(localRemoteCheckInterval);
        });
    }
    checkUpdateStatus();
    checkGithubRemoteVersion();
    updateUI();
}
