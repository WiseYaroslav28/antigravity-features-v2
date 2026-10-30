# 🚀 Google AntiGravity 2.0 — Russian Localization & System Enhancement Suite (`antigravity-features-v2`)

[![Version](https://img.shields.io/badge/version-v2.1.15-blue.svg)](version.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6.svg)](https://github.com/WiseYaroslav28/antigravity-features-v2)
[![Target](https://img.shields.io/badge/Google%20AntiGravity-2.0%2B-orange.svg)](https://github.com/WiseYaroslav28/antigravity-features-v2)
[![MCP Server](https://img.shields.io/badge/MCP-Auto--Updater%20Ready-10b981.svg)](index.js)
[![Donate Tribute](https://img.shields.io/badge/❤️_Donate_/_Поддержать-Tribute-ff4b4b.svg)](https://web.tribute.tg/d/SGR)

> **🇷🇺 Полный русификатор Google AntiGravity 2.0 (100% перевод интерфейса, настроек, плагинов, навыков и меню `/`)**, авто-патчер `app.asar`, сохранение позиции окна на 2-м мониторе, исправление клика по иконке в системном трее и **MCP-сервер с автоматическим обновлением через GitHub**.  
> **🇬🇧 Complete Russian Localization & Quality-of-Life Enhancement Suite for Google AntiGravity 2.0 IDE** — featuring non-invasive CDP live injection, native `app.asar` auto-patching, multi-monitor window state persistence, system tray fixes, and a self-updating MCP server.

🌐 **Язык документации / Documentation Language:** [**🇷🇺 Русский**](#-русская-документация-ru) | [**🇬🇧 English**](#-english-documentation-en) | [**💖 Поддержать / Donate**](#-поддержать-проект--support--donate)

---

## 🇷🇺 Русская документация (RU)

### ✨ Основные возможности

1. **100% Русская локализация интерфейса (Русификатор Google AntiGravity 2.0)**:
   * Полный перевод всех разделов настроек (*Аккаунт, Внешний вид, Модели, Персонализация, Браузер, Уведомления и звук, Приложение, Разрешения*).
   * Перевод меню быстрых команд (`/`), карточек и всплывающих описаний всех встроенных навыков (`Skills`) и плагинов (*Chrome DevTools, Modern Web Guidance, Accessibility, LCP Optimization* и др.).
   * Перевод статусов выполнения задач агента (`Выполняется`, `Создано`, `Отменено`, `Размышляет`) и системных контекстных меню Electron (*Вырезать, Копировать, Вставить, Выделить всё*).
   * **Переключатель `EN | RU` в шапке окна**: мгновенное переключение между русским и английским языками в реальном времени без перезапуска IDE.

2. **🔄 Автоматическое обновление с GitHub силами MCP (без ручного скачивания)**:
   * Встроенный MCP-сервер ([`index.js`](index.js)) автоматически проверяет наличие новых версий в этом репозитории ([`version.json`](version.json)) по HTTPS — **работает даже если на ПК не установлен Git**.
   * Скачивает обновлённые файлы в фоне и проверяет их синтаксис через компилятор V8 (`node --check`) перед заменой.
   * **Горячее применение (Hot-Reload)**: новые переводы мгновенно применяются к открытым окнам через Chrome DevTools Protocol (CDP) без перезапуска приложения, а в виджете `EN | RU` отображается переход версий (например, `✨ v2.0.0 → v2.1.0`) и список изменений (`changelog`).

3. **🖥️ Запоминание 2-го монитора и развёрнутого состояния окна**:
   * Исправляет сброс окна на основной монитор (`1400x900`) при каждом запуске: сохраняет точные координаты (`x`, `y`, `width`, `height`, `isMaximized`) и открывает AntiGravity именно на том мониторе, где вы его закрыли.

4. **🖱️ Исправление системного трея и ярлыка рабочего стола**:
   * Активирует одиночный и двойной клик левой кнопкой мыши по иконке AntiGravity в системном трее Windows.
   * Исправляет повторный запуск по ярлыку (`second-instance`), когда окно свёрнуто в трей.

---

### 📦 Установка в 1 клик (Windows)

1. Скачайте архив репозитория или склонируйте его:
   ```cmd
   git clone https://github.com/WiseYaroslav28/antigravity-features-v2.git
   ```
2. Запустите установочный скрипт:
   ```cmd
   install_on_new_pc.bat
   ```
   **Что сделает установщик автоматически:**
   * Зарегистрирует MCP-сервер `antigravity-features-v2` в `%USERPROFILE%\.gemini\config\mcp_config.json`.
   * Установит необходимые пакеты (`npm install`).
   * Соберёт и проверит патч `app.asar.patched` с помощью [`auto_patcher.cjs`](auto_patcher.cjs).
   * Создаст резервную копию оригинального файла (`app.asar.bak`) и применит локализацию.

---

### 🗂️ Архитектура проекта

| Файл | Назначение |
| :--- | :--- |
| [`version.json`](version.json) | Паспорт релиза: номер версии SemVer (`2.1.0`), дата, описание изменений (`changelog`) и список обновляемых файлов. |
| [`index.js`](index.js) | Фоновый MCP-сервер, движок автообновления с GitHub, HTTP-сервер статуса (`127.0.0.1:39228`) и CDP-инжектор. |
| [`localization_injected.js`](localization_injected.js) | Единый модуль словаря переводов, регулярных выражений и верхнего виджета `EN \| RU` с индикацией версий. |
| [`auto_patcher.cjs`](auto_patcher.cjs) | Автоматический сборщик `app.asar.patched` с проверкой каждого файла компилятором V8 (`vm.Script`). |
| [`exit_patcher.cjs`](exit_patcher.cjs) | Фоновый модуль тихой подмены `app.asar` после штатного закрытия AntiGravity пользователем. |
| [`backup_manager.js`](backup_manager.js) | Служба резервного копирования состояния и координат окна каждые 30 секунд. |
| [`install_on_new_pc.bat`](install_on_new_pc.bat) | Автоматический установщик для нового компьютера. |
| [`apply_patch_and_restart.bat`](apply_patch_and_restart.bat) | Скрипт быстрой подмены `app.asar` и перезапуска AntiGravity в 1 клик. |

---

## 🇬🇧 English Documentation (EN)

### ✨ Key Features

1. **Complete Russian UI Localization (100% Coverage for Google AntiGravity 2.0)**:
   * Translates all Settings tabs (*Account, Appearance, Models, Personalization, Browser, Notifications & Sound, Application, Permissions*), slash commands (`/`), built-in `Skills` and plugin cards, agent step statuses, and native Electron menus.
   * Includes a live top-bar **`EN | RU` language switcher** allowing instant toggling between English and Russian without restarting the IDE.

2. **🔄 Zero-Touch GitHub Auto-Updater via MCP**:
   * The bundled Model Context Protocol (MCP) server ([`index.js`](index.js)) periodically checks [`version.json`](version.json) on GitHub over HTTPS (works even on machines without Git installed).
   * Validates every downloaded `.js`/`.cjs` file using Node's V8 syntax checker (`node --check`) before replacing local files.
   * **Live CDP Hot-Reload**: dictionary updates are injected immediately into open windows via Chrome DevTools Protocol with zero downtime, displaying a version transition badge (`v2.0.0 → v2.1.0`) and release notes right in the top-bar widget.

3. **🖥️ Multi-Monitor Window Geometry & Maximized State Persistence**:
   * Fixes the default `1400x900` primary-monitor reset by persisting `x`, `y`, `width`, `height`, and `isMaximized` state across sessions.

4. **🖱️ System Tray Left-Click & Desktop Shortcut Restore Fixes**:
   * Patches `dist/tray.js` and `dist/main.js` inside `app.asar` so left-clicking/double-clicking the tray icon or re-launching the desktop shortcut reliably restores the window from the system tray.

### 🚀 Quick Start (1-Click Install)

```cmd
git clone https://github.com/WiseYaroslav28/antigravity-features-v2.git
cd antigravity-features-v2
install_on_new_pc.bat
```

---

## 💖 Поддержать проект / Support & Donate

Если проект оказался вам полезен, вы можете поддержать его развитие из любой точки мира (РФ, СНГ и любые зарубежные страны):  
If you find this project helpful, you can support its continued development:

[![Donate via Tribute Web](https://img.shields.io/badge/💳_Карты_РФ_и_Мира_/_Cards-Tribute_Web-ff4b4b?style=for-the-badge)](https://web.tribute.tg/d/SGR)
[![Donate via Telegram](https://img.shields.io/badge/✈️_Telegram_Tribute-Mini_App-2CA5E0?style=for-the-badge)](https://t.me/tribute/app?startapp=dSGR)

* **💳 Банковские карты (РФ, СНГ и весь мир) в браузере / Bank Cards (Web)**: [https://web.tribute.tg/d/SGR](https://web.tribute.tg/d/SGR)
* **✈️ Донат через Telegram (Карты и Telegram Stars)**: [https://t.me/tribute/app?startapp=dSGR](https://t.me/tribute/app?startapp=dSGR)
* **💎 Криптовалюта / Crypto (Ethereum `ETH` и любые токены `ERC-20`: `USDT`, `USDC` в сети Ethereum)**:
  ```text
  0x729D819802EF2B8Eaab8eE7F0431fE1d288E6688
  ```

---

## 📜 Лицензия / License

Этот проект распространяется свободно под открытой лицензией **MIT License**. Вы можете свободно использовать, изучать, модифицировать и распространять код. Подробности в файле [`LICENSE`](LICENSE).

This project is free and open-source software licensed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.

---

### 🔍 Поисковые теги / SEO Keywords
`Google AntiGravity 2.0`, `AntiGravity IDE`, `Русификатор AntiGravity`, `Русский язык в Google AntiGravity`, `Локализация AntiGravity 2.0`, `AntiGravity Russian Translation`, `AntiGravity Localization`, `Model Context Protocol`, `MCP Server`, `Electron asar patcher`, `Chrome DevTools Protocol injection`, `AntiGravity Tray Fix`, `AntiGravity Second Monitor Fix`.
