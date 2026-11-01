# 👽 Готовые посты для Reddit (`REDDIT_POST.md`)

Ниже подготовлены **две версии поста для Reddit** (в формате, который отлично воспринимается сообществом и модераторами — инженерный *Show & Tell / Open Source* от первого лица):
1. **🇬🇧 Английская версия** — для крупнейших мировых сабреддитов по ИИ-разработке (`r/ChatGPTCoding`, `r/GoogleGemini`, `r/AI_Agents`, `r/SideProject`, `r/vscode`), где сидит основная аудитория пользователей Google AntiGravity 2.0. В ней сделан акцент не только на `EN | RU` локализацию, но и на **исправление бага мультимониторности/DPI на Windows, фикс иконки в трее и архитектуру самообновляющегося MCP + CDP Hot-Reload**, которая полезна любому разработчику.
2. **🇷🇺 Русская версия** — сжатая, динамичная заметка в стиле Reddit для русскоязычных сообществ.

> 💡 **Совет перед публикацией на Reddit:** выбирайте тип поста **«Post» (текстовый)** и прямо внутрь тела поста в самом верху перетащите картинку [`assets/hero-banner.jpg`](assets/hero-banner.jpg) — тогда в ленте Reddit отобразится и крупный красивый баннер с логотипом AntiGravity, и весь форматированный текст с кодом!

---

## 🇬🇧 Вариант 1: Международный пост (на английском — для `r/ChatGPTCoding`, `r/GoogleGemini`, `r/SideProject`)

### Варианты заголовка (Title):
- **Вариант А (инженерный хит):** `I built a self-installing MCP enhancement suite for Google AntiGravity 2.0: fixes Windows multi-monitor/DPI window bugs, tray click, and adds 0ms live UI localization via CDP hot-reload [Open Source]`
- **Вариант Б (короткий и цепляющий):** `I've been reverse-engineering Google AntiGravity 2.0 internals — built an open-source auto-patcher & MCP server that fixes multi-monitor geometry, system tray, and hot-reloads UI translations without restarting`
- **Вариант В (через фичу само-установки):** `You can ask Google AntiGravity 2.0 to install its own enhancement & localization patch in one prompt (MCP + CDP live reload + Windows multi-monitor fix)`

### Текст поста (Body — скопировать как Markdown):

```markdown
Hey everyone!

I've been spending a lot of time diving deep into **Google AntiGravity 2.0** lately — exploring its agentic workflows, subagents, skills, and Electron internals.

While it's easily one of the most capable agentic IDEs out right now, running it daily on Windows with a dual-monitor setup (150% DPI primary + 100% DPI secondary) exposed a few annoying pain points:
1. **Multi-monitor & multi-DPI window amnesia:** Every time you close or restart AntiGravity, it either forgets which monitor it was on or opens at a weird DPI-scaled size ("almost maximized, but not actually maximized").
2. **System tray quirks on Windows:** Left-clicking or double-clicking the tray icon doesn't restore the window, and launching the desktop shortcut while minimized to tray sometimes fails to bring the window up.
3. **Official updates wipe custom tweaks:** Every time AntiGravity auto-updates, `resources/app.asar` gets overwritten.
4. **No native localization:** Everything (settings, slash commands, plugin cards, agent step statuses) is English-only out of the box.

So I built **[`antigravity-features-v2`](https://github.com/WiseYaroslav28/antigravity-features-v2)** — an open-source enhancement & localization suite that **AntiGravity can install on itself from a single chat prompt**, and that survives official IDE updates automatically.

---

### ⚡ How it works under the hood

1. **Self-Healing MCP Server (`index.js`):**
   Because `%USERPROFILE%\.gemini\config\mcp_config.json` lives in the user profile, it never gets wiped when Google AntiGravity updates its binaries. Whenever AntiGravity boots up, it starts this MCP server, which checks the `SHA-256` hash of `app.asar`. If the official IDE updated, it automatically extracts, patches, validates, and repacks `app.asar.patched` in the background and swaps it cleanly on exit (`exit_patcher.cjs`).

2. **V8 In-Memory Syntax Gate (`auto_patcher.cjs`):**
   Before repacking `app.asar`, every modified file (`preload.js`, `main.js`, `utils.js`, `tray.js`, `ipcHandlers.js`) is compiled in memory using Node's `new vm.Script()`. If any syntax error is ever detected, the build aborts — 0% risk of a white screen or bricked IDE.

3. **Zero-Restart Live Updates via Chrome DevTools Protocol (CDP):**
   Instead of requiring an IDE restart for UI/dictionary updates, the patch enables local CDP (`127.0.0.1:9222`) and injects an idempotent script (`localization_injected.js`). When a new release is published on GitHub, the MCP server fetches it and evaluates it live in the running window (`Runtime.evaluate`) with zero downtime.

4. **Window Geometry Patch V3 (Multi-Monitor + Multi-DPI + Single-Monitor Safe):**
   Matches the target monitor using the window's center point (`screen.getDisplayNearestPoint`), clamps bounds safely inside `workArea` (automatically falling back to the primary screen if a second monitor is unplugged), guards `win.maximize()` against Windows multi-DPI frame resets, and saves state even on full tray quit (`before-quit`).

5. **Instant `EN | RU` Live Toggle (0ms switch):**
   Adds a compact `EN | RU` switcher and a minimal status indicator (`i`) to the top bar. Original DOM text/attributes are cached in `data-original-*`, so switching back and forth between English and Russian happens in 0ms without reloading the page, while strictly ignoring Monaco editor lines, `xterm` terminals, and file paths.

---

### 🚀 Try it in 10 seconds

You can literally paste this into your AntiGravity chat and let the agent install it for you:

> Install the AntiGravity 2.0 enhancement & localization suite from https://github.com/WiseYaroslav28/antigravity-features-v2 by running in PowerShell:
> `irm https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/install.ps1 | iex`

Or run that one-liner directly in PowerShell.

---

### 💬 Open to Feature Requests & Custom Integrations!

I'm actively exploring the Google AntiGravity 2.0 ecosystem (custom MCP servers, agent skills, UI extensions, and workflow automations). 
If there's a bug that annoys you, a feature you wish AntiGravity had, or if you need a custom tool/integration built for your workflow — I added a **"💬 Suggest an Idea / Request Custom Feature"** button right inside the top-bar `i` popup (or you can open an issue on GitHub).

🔗 **GitHub Repository:** [https://github.com/WiseYaroslav28/antigravity-features-v2](https://github.com/WiseYaroslav28/antigravity-features-v2)

Would love to hear your feedback or ideas on what to improve next in AntiGravity!
```

---

## 🇷🇺 Вариант 2: Пост на русском языке (для русскоязычных сабреддитов / Telegram / сообществ)

### Варианты заголовка:
- **Вариант А:** `Я сделал 100% русификатор и авто-патчер для Google AntiGravity 2.0, который сама IDE ставит себе одной командой в чате и обновляет на лету без перезапуска [Open Source]`
- **Вариант Б:** `Как я победил сброс второго монитора, системный трей и отсутствие русского языка в Google AntiGravity 2.0 через собственный MCP-сервер`

### Текст поста (Body):

```markdown
Привет!

Сейчас я плотно изучаю и осваиваю **Google AntiGravity 2.0** — крутейшую агентную IDE от Google. Но в ежедневной работе на Windows меня преследовали три проблемы:
1. Полное отсутствие русского языка (настройки, команды `/`, карточки плагинов, статусы шагов агента — всё на английском).
2. На двух мониторах с разным масштабированием (150% и 100%) окно при закрытии постоянно теряло режим «на весь экран» или монитор.
3. При каждом официальном обновлении самой AntiGravity архив `app.asar` перезаписывается с нуля.

В итоге я собрал открытый проект **[`antigravity-features-v2`](https://github.com/WiseYaroslav28/antigravity-features-v2)**, который решает всё это автоматически:

* **Установка силами самой AntiGravity за 10 секунд:** просто кидаете одну строчку в чат агенту, и он сам ставит себе MCP-сервер и русификатор.
* **Мгновенный переключатель `EN | RU` в шапке окна:** переключает весь интерфейс между русским и английским за 0 мс без перезагрузки (код в редакторе Monaco, терминал и имена файлов не затрагиваются).
* **Живые обновления без перезапуска (Hot-Reload через CDP):** новые переводы прилетают с GitHub и применяются прямо на глазах в открытом окне. А когда обновляется сама официальная AntiGravity — наш MCP-сервер сам пересобирает патч в фоне с проверкой синтаксиса через движок V8.
* **Window Geometry Patch V3 + фикс системного трея:** окно железно помнит свой монитор и развёрнутое состояние на весь экран (а если второго монитора нет — аккуратно центрируется на основном), плюс работает левый клик по иконке в трее Windows.

### ⚡ Как поставить (прямо через чат AntiGravity или в PowerShell):

```powershell
irm https://raw.githubusercontent.com/WiseYaroslav28/antigravity-features-v2/main/install.ps1 | iex
```

---

💡 **Принимаю заявки на доработки!** Я активно копаю внутренности AntiGravity 2.0, пишу под неё кастомные MCP-серверы, плагины и навыки (Skills). Прямо в шапку окна (в карточку иконки **`i`** рядом с `EN | RU`) я добавил кнопку **«💬 Предложить идею / Заказать доработку»** — пишите, чего вам не хватает в AntiGravity и что хотелось бы улучшить или автоматизировать!

🔗 **Репозиторий на GitHub:** [https://github.com/WiseYaroslav28/antigravity-features-v2](https://github.com/WiseYaroslav28/antigravity-features-v2)
```
