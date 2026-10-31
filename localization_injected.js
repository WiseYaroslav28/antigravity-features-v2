// ---------------------------------------------------------------------------
// Language Translation System (RU / EN) for Injected Chromium Pages
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Global Crash / Exception Catchers for Injected Page
// ---------------------------------------------------------------------------
window.__antigravity_crash_logs = window.__antigravity_crash_logs || [];
if (!window.__antigravity_crash_handlers_installed) {
  window.__antigravity_crash_handlers_installed = true;
  window.addEventListener('error', (event) => {
    try {
      window.__antigravity_crash_logs.push({
        type: 'error',
        message: event.message || String(event),
        source: event.filename || '',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        stack: event.error ? (event.error.stack || event.error.message || '') : null,
        time: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Injected Crash Handler] Error catching error:', e);
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    try {
      window.__antigravity_crash_logs.push({
        type: 'unhandledrejection',
        reason: event.reason ? (event.reason.message || String(event.reason)) : null,
        stack: event.reason ? (event.reason.stack || '') : null,
        time: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Injected Crash Handler] Error catching rejection:', e);
    }
  });
}

function normalizeText(str) {
    if (!str) return '';
    return str.replace(/[\s\u00a0\xa0\u2007\u202f\r\n\t]+/g, ' ').trim();
}

function translateDuration(text) {
    if (!text) return text;
    const pluralize = (count, one, two, five) => {
        const n = Math.abs(count) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    };
    let result = text.replace(/(\d+)\s*days?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'день', 'дня', 'дней')}`;
    });
    result = result.replace(/(\d+)\s*hours?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'час', 'часа', 'часов')}`;
    });
    result = result.replace(/(\d+)\s*minutes?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'минуту', 'минуты', 'минут')}`;
    });
    result = result.replace(/(\d+)\s*seconds?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'секунду', 'секунды', 'секунд')}`;
    });
    result = result.replace(/(\d+)\s*s\b/gi, '$1 сек');
    result = result.replace(/(\d+)\s*m\b/gi, '$1 мин');
    result = result.replace(/(\d+)\s*h\b/gi, '$1 ч');
    result = result.replace(/(\d+)\s*d\b/gi, '$1 дн');
    result = result.replace(/\band\b/gi, 'и');
    return result;
}

function translateRelativeTime(text) {
    if (!text) return '';
    let res = text.trim();
    if (/^(?:just\s+)?now$/i.test(res)) return 'только что';
    if (/^yesterday$/i.test(res)) return 'вчера';
    if (/^today$/i.test(res)) return 'сегодня';
    
    res = res.replace(/^(\d+)\s*s\s*(?:ago)?$/i, '$1 сек назад');
    res = res.replace(/^(\d+)\s*m\s*(?:ago)?$/i, '$1 мин назад');
    res = res.replace(/^(\d+)\s*h\s*(?:ago)?$/i, '$1 ч назад');
    res = res.replace(/^(\d+)\s*d\s*(?:ago)?$/i, '$1 дн назад');
    
    const pluralize = (count, one, two, five) => {
        const n = Math.abs(count) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    };
    res = res.replace(/(\d+)\s*seconds?\s*(?:ago)?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'секунду', 'секунды', 'секунд')} назад`;
    });
    res = res.replace(/(\d+)\s*minutes?\s*(?:ago)?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'минуту', 'минуты', 'минут')} назад`;
    });
    res = res.replace(/(\d+)\s*hours?\s*(?:ago)?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'час', 'часа', 'часов')} назад`;
    });
    res = res.replace(/(\d+)\s*days?\s*(?:ago)?/gi, (m, p1) => {
        const count = parseInt(p1, 10);
        return `${count} ${pluralize(count, 'день', 'дня', 'дней')} назад`;
    });
    res = res.replace(/\bago\b/gi, 'назад');
    return res;
}

window.__antigravity_untranslated = window.__antigravity_untranslated || new Set();

function translateText(text) {
    if (!text) return text;
    const normalized = normalizeText(text);
    if (!normalized) return text;
    const lowerText = normalized.toLowerCase();
    
    let translated = null;
    if (translationDictionary[lowerText]) {
        translated = translationDictionary[lowerText];
    } else {
        for (const rule of regexTranslations) {
            const match = normalized.match(rule.pattern);
            if (match) {
                translated = rule.replace(match);
                break;
            }
        }
    }
    
    if (translated) {
        const matchSpaces = text.match(/^(\s*)(.*?)(\s*)$/);
        if (matchSpaces) {
            return matchSpaces[1] + translated + matchSpaces[3];
        }
        return translated;
    } else if (lowerText.length > 2 && /^[a-z\s.,!?()\-+]+$/i.test(lowerText) && typeof isFileName === 'function' && !isFileName(lowerText)) {
        window.__antigravity_untranslated.add(lowerText);
        try {
            localStorage.setItem('antigravity_untranslated_list', JSON.stringify(Array.from(window.__antigravity_untranslated)));
        } catch(e) {}
    }
    return text;
}

const translationDictionary = {
    // Шапка и навигация
    "antigravity": "Антигравити",
    "file": "Файл",
    "view": "Вид",
    "window": "Окно",
    "new conversation": "Новый диалог",
    "conversation history": "История диалогов",
    "scheduled tasks": "Запланированные задачи",
    "projects": "Проекты",
    "conversations": "Диалоги",
    "see all": "Показать все",
    
    // Выбор моделей и лимиты использования (Скриншот 1)
    "model": "Модель",
    "gemini models": "Модели Gemini",
    "claude and gpt models": "Модели Claude и GPT",
    "weekly limit remaining": "Остаток недельного лимита",
    "five hour limit remaining": "Остаток 5-часового лимита",
    "view usage": "Просмотр использования",
    "fast": "Быстро",
    "high": "Высокий",
    "medium": "Средний",
    "low": "Низкий",
    "review": "Проверить",
    "thinking": "Размышление",
    
    // Статусы и действия задач / артефактов (Task & Artifact Actions)
    "created": "Создано",
    "creating": "Создание",
    "canceled": "Отменено",
    "cancelled": "Отменено",
    "canceling": "Отмена",
    "cancelling": "Отмена",
    "completed": "Завершено",
    
    // Подсказки команд (Command hints)
    "click for commands ...": "Нажмите для выбора команд ...",
    "click for commands...": "Нажмите для выбора команд...",
    "click for commands": "Нажмите для выбора команд",
    "type / or click for commands ...": "Введите / или нажмите для выбора команд ...",
    "type / or click for commands...": "Введите / или нажмите для выбора команд...",
    "type / or click for commands": "Введите / или нажмите для выбора команд",
    "type / for commands ...": "Введите / для выбора команд ...",
    "type / for commands...": "Введите / для выбора команд...",
    "type / for commands": "Введите / для выбора команд",
    "for commands ...": "для выбора команд ...",
    "for commands...": "для выбора команд...",
    "for commands": "для выбора команд",
    
    // Уведомления и боковая панель (Notifications & Sidebar)
    "(≡ menu).": "(меню ≡).",
    "(≡ menu)": "(меню ≡)",
    "(menu).": "(меню).",
    "(menu)": "(меню)",
    "(𝌆 menu).": "(меню 𝌆).",
    "(𝌆 menu)": "(меню 𝌆)",
    "conversations with 🔍 in the top left.": "Поиск диалогов с помощью 🔍 в левом верхнем углу.",
    "conversations with 🔍 in the top left": "Поиск диалогов с помощью 🔍 в левом верхнем углу",
    "conversations with": "диалогов с помощью",
    
    // Слэш-команды и MCP-промпты (Slash Commands & MCP Prompts)
    "plan carefully before executing a task.": "Тщательное планирование перед выполнением задачи.",
    "plan carefully before executing a task": "Тщательное планирование перед выполнением задачи",
    "invoke the boost multi-agent orchestrator for complex tasks.": "Запуск мультиагентного оркестратора Boost для сложных задач.",
    "invoke the boost multi-agent orchestrator for complex tasks": "Запуск мультиагентного оркестратора Boost для сложных задач",
    "compact the conversation now (summarize history to free up the context window).": "Сжать диалог сейчас (суммировать историю, чтобы освободить контекстное окно).",
    "compact the conversation now (summarize history to free up the context window)": "Сжать диалог сейчас (суммировать историю, чтобы освободить контекстное окно)",
    "сжать контекст the conversation now (summarize history to free up the context window).": "Сжать диалог сейчас (суммировать историю, чтобы освободить контекстное окно).",
    "сжать контекст the conversation now (summarize history to free up the context window)": "Сжать диалог сейчас (суммировать историю, чтобы освободить контекстное окно)",
    "assign github coding agent to multiple tasks in a github repository.": "Назначить кодинг-агента GitHub (GitHub Coding Agent) на несколько задач в репозитории GitHub.",
    "assign github coding agent to multiple tasks in a github repository": "Назначить кодинг-агента GitHub (GitHub Coding Agent) на несколько задач в репозитории GitHub",
    "create an issue for a problem and then generate a pull request to fix it.": "Создать задачу (issue) по проблеме, а затем сформировать пул-реквест (pull request) для её исправления.",
    "create an issue for a problem and then generate a pull request to fix it": "Создать задачу (issue) по проблеме, а затем сформировать пул-реквест (pull request) для её исправления",
    "создать an issue for a problem and then generate a pull request to fix it": "Создать задачу (issue) по проблеме, а затем сформировать пул-реквест (pull request) для её исправления",
    "создано an issue for a problem and then generate a pull request to fix it": "Создать задачу (issue) по проблеме, а затем сформировать пул-реквест (pull request) для её исправления",
    "ask a quick question without interrupting the main conversation": "Задать быстрый вопрос, не прерывая основной диалог",
    "run until the specified goal is completely finished": "Работать до полного достижения указанной цели",
    "run an instruction on a recurring schedule or as a one-time timer": "Запуск инструкций по расписанию или через разовый таймер",
    "invoke a browser agent for web tasks": "Вызов браузерного агента для задач в сети",
    "interview me to align on a plan": "Интервью для детального согласования плана",
    "invoke a team of agents to autonomously tackle large projects": "Вызов команды агентов для автономной работы над крупными проектами",
    "reflect on recent successes or corrections to capture reusable skills or rules": "Анализ успехов и правок для сохранения полезных навыков и правил",
    
    // Раздел Общие (General / Execution) (Скриншот 2)
    "execution": "Выполнение",
    "queued messages": "Сообщения в очереди",
    "configure when follow-up messages are sent.": "Настройка времени отправки последующих сообщений.",
    "configure agent execution, queued message delivery, and permissions.": "Настройка выполнения агента, доставки сообщений в очереди и разрешений.",
    "queue": "В очередь",
    "send immediately": "Отправлять немедленно",
    "keyboard shortcuts": "Горячие клавиши",
    "default": "По умолчанию",
    "by default": "По умолчанию",
    "always proceed": "Всегда выполнять",
    "proceed in sandbox": "Запускать в песочнице",
    "strict": "Строгий режим",
    "request review": "Запрашивать проверку",

    // Вспомогательные панели и вкладки
    "subagents": "Субагенты",
    "files changed": "Измененные файлы",
    "background tasks": "Фоновые задачи",
    "artifacts": "Артефакты",
    "no conversations yet": "Разговоров пока нет",
    "load older messages": "Загрузить ранние сообщения",
    "skills used": "Использовано скиллов",
    "explored": "Исследовано",
    "ran": "Запущено",
    
    // Поле ввода чата
    "ask anything, @ to mention, / for actions": "Спросите о чём угодно, @ для упоминания, / для действий",

    
    // Настройки - Левая колонка и вкладки
    "account": "Аккаунт",
    "permissions": "Разрешения",
    "customizations": "Персонализация",
    "configure default behaviors, skills, and mcp servers.": "Настройка базового поведения, скиллов и MCP-серверов.",
    "learn more.": "Подробнее.",
    "token usage": "Использование токенов",
    "the breakdown below shows token usage from customizations like skills, rules, and mcp. if the budget is exceeded, large customizations will be truncated automatically.": "Ниже показан расход токенов на кастомизации (скиллы, правила и MCP). При превышении лимита крупные кастомизации будут автоматически усечены.",
    "skills": "Скиллы",
    "mcp tools": "MCP-инструменты",
    "installed mcp servers": "Установленные MCP-серверы",
    "add mcp +": "Добавить MCP +",
    "refresh": "Обновить",
    "open mcp config": "Открыть конфиг MCP",
    "build with google plugins": "Сборка с плагинами Google",
    "customize": "Настроить",
    "models": "Модели",
    "browser": "Браузер",
    "app": "Приложение",
    "show all": "Показать все",
    "not in project": "Вне проекта",
    "shortcuts": "Горячие клавиши",
    "provide feedback": "Оставить отзыв",
    "global": "Глобальный",
    "sign out": "Выйти",
    "tools enabled": "инструментов включено",

    // Описания карточек плагинов Google (Скриншот Персонализации)
    "skills providing tailored instructions for happy path dart and flutter development workflows.": "Наборы навыков с точными инструкциями для эффективной разработки на Dart и Flutter.",
    "build and prototype location-aware applications with google maps platform. integrate interactive maps, search and inspect places details, calculate optimal routes.": "Создание и прототипирование геоприложений с помощью Google Maps Platform. Интеграция интерактивных карт, поиск и анализ мест, расчет оптимальных маршрутов.",
    "specialized suite of skills for data engineers and database practitioners on google cloud": "Специализированный набор навыков для инженеров данных и специалистов по базам данных в Google Cloud.",
    "build applications with the gemini interactions api and live api, including text generation, multi-turn chat, streaming, function calling, managed agents, and real-time...": "Создание приложений с помощью Gemini Interactions API и Live API, включая генерацию текста, многошаговый чат, стриминг, вызов функций и агентов в реальном времени...",
    "essential tools and knowledge needed for android development": "Основные инструменты и знания, необходимые для разработки под Android.",
    "keep your coding agent up to date with the latest web dev guidance.": "Держите своего кодинг-агента в курсе последних передовых веб-технологий.",
    "harness the antigravity python sdk to build ai agents": "Использование Antigravity Python SDK для создания ИИ-агентов.",
    "curated collection of agent skills for scientific workflows.": "Кураторская коллекция навыков агента для научных задач.",
    "prototype, build, and run modern apps backed by firebase backend, ai, and operational infrastructure.": "Прототипируйте, создавайте и запускайте современные приложения с помощью бэкенда, ИИ и операционной инфраструктуры Firebase.",
    "reliable automation, deep debugging, and performance profiling across chrome with chromedevtools and puppeteer": "Надежная автоматизация, глубокая отладка и анализ производительности в Chrome с использованием Chrome DevTools и Puppeteer.",
    "download": "Скачать",
    "installed": "Установлено",


    // Вкладка Аккаунт (Account)
    "signed in as": "Вход выполнен как",
    "active plan": "Активный тариф",
    "upgrade plan": "Улучшить тариф",
    "upgrade to pro": "Перейти на Pro",
    "manage subscription": "Управление подпиской",
    
    // Вкладка Внешний вид (Appearance) (Скриншот 1)
    "theme mode": "Тема оформления",
    "conversation max width": "Максимальная ширина чата",
    "conversation width": "Ширина чата",
    "configure the maximum width of the conversation panel.": "Настройка максимальной ширины панели диалога.",
    "display and preserve intermediate thinking steps.": "Отображать и сохранять промежуточные шаги размышления.",
    "font size": "Размер шрифта",
    "reset to defaults": "Сбросить по умолчанию",
    "inherit": "Системная",
    "narrow": "Узкий",
    "wide": "Широкий",
    "подробный чат агента": "Подробный чат агента",

    // Диалоги разрешений и промптов (Скриншоты 2 и 3)
    "in this conversation": "в этом диалоге",
    "when not in a project": "вне проекта",
    "да, и всегда разрешать in this conversation": "Да, и всегда разрешать в этом диалоге",
    "2 да, и всегда разрешать in this conversation": "2 Да, и всегда разрешать в этом диалоге",
    "yes, and always allow in this conversation": "Да, и всегда разрешать в этом диалоге",
    "2 yes, and always allow in this conversation": "2 Да, и всегда разрешать в этом диалоге",
    "да, и всегда разрешать when not in a project": "Да, и всегда разрешать вне проекта",
    "allow checking js syntax?": "Разрешить проверку синтаксиса JS?",
    "allow checking typescript syntax?": "Разрешить проверку синтаксиса TypeScript?",
    "allow running terminal command?": "Разрешить выполнение команды в терминале?",
    "allow reading file?": "Разрешить чтение файла?",
    "allow writing file?": "Разрешить запись в файл?",


    
    // Вкладка Модели (Models)
    "active gemini model": "Активная модель Gemini",
    "default model": "Модель по умолчанию",
    "reasoning effort": "Уровень размышления (Reasoning)",
    "fallback models": "Резервные модели",
    "api keys": "Ключи API",
    
    // Вкладка Браузер (Browser)
    "browser execution policy": "Политика работы браузера",
    "allowed domains": "Разрешенные домены",
    "headless mode": "Фоновый режим браузера",
    "sandbox mode": "Режим песочницы",
    "navigation allowlist": "Белый список сайтов",
    "media downloads": "Загрузка медиафайлов",
    
    // Вкладка Приложение (App)
    "app settings": "Настройки приложения",
    "keep computer awake": "Предотвращать спящий режим ПК",
    "run in background": "Работать в фоновом режиме",
    "keep computer awake during agent execution": "Не давать ПК засыпать во время работы агента",
    "run in background on startup": "Запускать в фоновом режиме при старте системы",
    "auto check for updates": "Автоматически проверять обновления",
    "automatically check and download application updates": "Автоматически проверять и скачивать обновления приложения",
    "application version": "Версия приложения",
    "release channel": "Канал обновлений",
    
    // Вкладка Разрешения (Permissions)
    "non-workspace file access policy": "Доступ к файлам вне рабочей области",
    "internet access policy": "Политика доступа к сети Интернет",
    "permission grants": "Выданные разрешения",
    "command allowlist": "Белый список команд",
    "command denylist": "Чёрный список команд",
    "browser allowlist": "Белый список браузера",

    // Версия 2.8.0 и Новые функции (Чейнджлог)
    "collapse all": "Свернуть все",
    "expand all": "Развернуть все",
    "side-by-side": "Параллельный вид",
    "preview tabs": "Вкладки предпросмотра",
    "mcp timeouts": "Таймауты MCP",
    "send now": "Отправить сейчас",
    "queued messages": "Сообщения в очереди",
    "workforce identity federation": "Корпоративная авторизация",
    "enterprise sign-in": "Вход для корпоративных клиентов",

    // Слэш-команды и Встроенные навыки (Описания)
    "ask a quick question without interrupting the main conversation.": "Задать быстрый вопрос, не прерывая основной диалог.",
    "run until the specified goal is completely finished.": "Работать до полного достижения указанной цели.",
    "run an instruction on a recurring schedule or as a one-time timer.": "Запуск инструкций по расписанию или через разовый таймер.",
    "invoke a browser agent for web tasks.": "Вызов браузерного агента для задач в сети.",
    "interview me to align on a plan.": "Интервью для детального согласования плана.",
    "invoke a team of agents to autonomously tackle large projects.": "Вызов команды агентов для автономной работы над крупными проектами.",
    "reflect on recent successes or corrections to capture reusable skills or rules.": "Анализ успехов и правок для сохранения полезных навыков и правил.",

    // Подсказки очереди сообщений (Общие настройки)
    "enter queues after the turn": "Enter добавляет в очередь после ответа",
    "alt+enter sends immediately": "Alt+Enter отправляет немедленно",
    "alt+enter on empty prompt, sends next in queue": "Alt+Enter при пустом поле отправляет следующее из очереди",
    "queues after the turn": "Добавить в очередь после ответа",
    "sends immediately": "Отправить немедленно",
    "on empty prompt, sends next in queue": "При пустом поле отправляет следующее из очереди",

    // Вкладка Приложение и Уведомления
    "keep the app accessible from the menu bar and running in the background when all windows are closed.": "Оставлять приложение доступным в строке меню и работающим в фоне при закрытии всех окон.",
    "advanced settings": "Расширенные настройки",
    "automatic check for updates": "Автоматическая проверка обновлений",
    "automatically prompt you to restart the app when a new update is available. when disabled, you can check for updates manually from the app menu.": "Автоматически предлагать перезапустить приложение при появлении нового обновления. Если отключено, вы можете проверять обновления вручную через меню приложения.",
    "to change notification settings, open your operating system settings.": "Чтобы изменить настройки уведомлений, откройте системные настройки вашей операционной системы.",




    
    // Настройки - Блок "Conversations" (Диалоги)
    "agent settings and permissions for conversations outside of projects.": "Настройки агента и разрешения для диалогов вне проектов.",
    "agent settings": "Настройки агента",
    "security preset": "Профиль безопасности",
    "choose a predefined security preset for the agent. this controls terminal auto-execution policy, and file access policy.": "Выберите профиль безопасности агента. Он управляет автовыполнением команд в терминале и доступом к файлам.",
    "outside of folders file access policy": "Доступ к файлам вне рабочих папок",
    "configures how the agent tries to access files outside of its working folders.": "Определяет, как агент запрашивает доступ к файлам вне его рабочих директорий.",
    "terminal command auto execution": "Автовыполнение команд в терминале",
    "controls whether terminal commands require your approval before running.": "Управляет тем, требуется ли ваше подтверждение перед выполнением команд в терминале.",
    "agent behavior": "Поведение агента",
    "artifact review policy": "Проверка создаваемых документов (артефактов)",
    "specifies agent's behavior when asking for review on artifacts, which are documents it creates to enable a richer conversation experience.": "Определяет поведение агента при создании артефактов (документов, планов разработки и т.д.).",
    "local permissions": "Локальные разрешения",
    "inherits from global settings. local permissions have higher priority. learn more.": "Наследуются от глобальных настроек. Локальные разрешения имеют более высокий приоритет. Подробнее.",
    "file access rules": "Правила доступа к файлам",
    "configure allowed and denied paths for file reads and writes.": "Настройка разрешенных и запрещенных путей для чтения и записи файлов.",
    "network access rules": "Правила доступа к сети",
    "configure allowed and denied urls for reading.": "Настройка разрешенных и запрещенных URL-адресов для чтения веб-страниц.",
    "terminal commands": "Команды терминала",
    "configure allowed terminal commands.": "Настройка списка разрешенных команд терминала.",
    
    // Настройки - Значения кнопок и выпадающих списков
    "custom": "Вручную",
    "always ask": "Всегда спрашивать",
    "require review": "Требовать подтверждение",
    "open": "Открыть",
    
    // Общие элементы настроек
    "theme": "Тема оформления",
    "dark": "Темная",
    "light": "Светлая",
    "system": "Системная",
    "appearance": "Внешний вид",
    "general": "Общие",
    "advanced": "Дополнительно",
    "settings": "Настройки",
    "models": "Модели",
    "overview": "Обзор",
    "add context": "Добавить контекст",
    "quotas": "Лимиты квот",
    "by the way": "К слову (Быстрый вопрос)",
    
    // Кнопки
    "cancel": "Отмена",
    "save": "Сохранить",
    "close": "Закрыть",
    "done": "Готово",
    "ok": "ОК",
    "clear": "Очистить",
    "uninstall": "Удалить",
    "installed": "Установлено",
    "no conversations yet": "Пока нет диалогов",
    "(tell the agent what to do instead)": "(указать агенту, что делать вместо этого)",
    "are you sure you want to delete the project": "Вы уверены, что хотите удалить проект",
    "this will permanently delete": "Это навсегда удалит",
    "within it. this action cannot be undone.": "в нем. Это действие нельзя отменить.",
    "file reads": "Чтение файлов",
    "allow/deny agent read access to specific files or directories.": "Разрешить/запретить агенту доступ на чтение к определенным файлам или каталогам.",
    "ask": "Спрашивать",
    "file writes": "Запись файлов",
    "allow/deny agent write access to specific files or directories.": "Разрешить/запретить агенту доступ на запись к определенным файлам или каталогам.",
    "read urls": "Чтение URL-адресов",
    "allow/deny agent read access to specific urls or domains.": "Разрешить/запретить агенту доступ на чтение к определенным URL-адресам или доменам.",
    "allow/deny specific terminal commands.": "Разрешить/запретить определенные команды терминала.",
    "allow/deny agent command execution outside the sandbox.": "Разрешить/запретить агенту выполнение команд вне песочницы.",
    "external tools the agent can call via model context protocol.": "Внешние инструменты, которые агент может вызывать через Model Context Protocol.",
    "delete": "Удалить",
    "edit": "Редактировать",
    "check for updates": "Проверить обновления",
    "checking for updates...": "Проверка обновлений...",
    "downloading update...": "Загрузка обновления...",
    "restart to update": "Перезапустить для обновления",
    "create new window": "Создать новое окно",
    "open agent manager": "Открыть менеджер агентов",
    "open workspace": "Открыть рабочую область",
    "headless mode": "Фоновый режим",
    "active models": "Активные модели",
    "available models": "Доступные модели",
    "credits": "Кредиты",
    "quota": "Лимит",
    "remaining": "Осталось",
    "used": "Использовано",
    "limit": "Ограничение",
    "total limit": "Общий лимит",
    "usage": "Использование",
    "model name": "Название модели",
    "files": "Файлы",
    "folders": "Папки",
    "terminal": "Терминал",
    "web search": "Поиск в сети",
    "add file": "Добавить файл",
    "add folder": "Добавить папку",
    "drag and drop files here": "Перетащите файлы сюда",
    "or click to browse": "или нажмите для выбора",
    "active agents": "Активные агенты",
    "subagents": "Субагенты",
    "conversation id": "ID беседы",
    "status": "Статус",
    "logs": "Логи",
    "tasks": "Задачи",
    "no active agents": "Нет активных агентов",
    "security": "Безопасность",
    "network": "Сеть",
    "system preferences": "Системные настройки",
    "no updates available": "Нет доступных обновлений",
    "update available": "Доступно обновление",
    "downloading update": "Скачивание обновления",
    "restart to apply update": "Перезапустите, чтобы применить обновление",
    "available ai credits:": "Доступные кредиты ИИ:",
    "available ai credits": "Доступные кредиты ИИ",

    // --- НОВЫЕ СТРОКИ ДЛЯ РУСИФИКАЦИИ ---
    "pinned conversations": "Закрепленные диалоги",
    "new project": "Новый проект",
    "quick start": "Быстрый старт",
    "no project": "Без проекта",
    "create project": "Создать проект",
    "command palette": "Палитра команд",
    "zoom in": "Увеличить масштаб",
    "zoom out": "Уменьшить масштаб",
    "reset zoom": "Сбросить масштаб",
    "minimize": "Свернуть",
    "maximize": "Развернуть",
    "docs": "Документация",
    "new window": "Создать новое окно",

    "inherits from": "Наследуется от",
    "global settings": "глобальных настроек",
    ". local permissions have higher priority.": ". Локальные разрешения имеют более высокий приоритет.",
    "local permissions have higher priority": "Локальные разрешения имеют более высокий приоритет",
    "learn more": "Подробнее",
    "commands outside sandbox": "Команды вне песочницы",
    "configure allowed commands outside the sandbox.": "Настройка разрешенных команд вне песочницы.",
    "mcp tools": "Инструменты MCP",
    "configure external tools via model context protocol.": "Настройка внешних инструментов через Model Context Protocol (MCP).",

    "the breakdown below shows token usage from customizations like skills, rules, and mcp. if the budget is exceeded, large customizations will be truncated automatically.": "В разбивке ниже показано использование токенов кастомизациями, такими как навыки, правила и MCP. Если бюджет превышен, крупные кастомизации будут автоматически усечены.",
    "rules": "Правила",
    "skills": "Навыки",
    "global": "Глобально",

    "allowed paths": "Разрешенные пути",
    "denied paths": "Запрещенные пути",
    "add path": "Добавить путь",
    "allowed urls": "Разрешенные URL",
    "denied urls": "Запрещенные URL",
    "add url": "Добавить URL",
    "allowed commands": "Разрешенные команды",
    "add command": "Добавить команду",
    "command prefix": "Префикс команды",
    "domain": "Домен",
    "read": "Чтение",
    "write": "Запись",
    "read/write": "Чтение/Запись",

    "see less": "Скрыть",
    "default": "По умолчанию",
    "hide breakdowns": "Скрыть детали",
    
    "configure the agent's visual theme and display preferences.": "Настройка визуальной темы и параметров отображения агента.",
    "chat settings": "Настройки чата",
    "verbose agent chat": "Подробный чат агента",
    "display and preserve intermediate thinking steps": "Отображать и сохранять промежуточные шаги размышления",
    "select light, dark, or inherit system settings.": "Выберите светлую, темную или системную тему.",
    "light theme": "Светлая тема",
    "dark theme": "Темная тема",
    "preset": "Профиль",
    "background": "Фон",
    "foreground": "Текст",
    "accent": "Акцент",
    "default light": "Светлая по умолчанию",
    "default dark": "Темная по умолчанию",

    "useful for typical development with an emphasis on security. it prioritizes safety over speed by requiring manual approval for all terminal commands and files outside the project directory.": "Полезно для обычной разработки с акцентом на безопасность. Приоритет отдается безопасности, а не скорости, требуя ручного подтверждения для всех команд терминала и файлов вне директории проекта.",
    "learn more about": "Подробнее о",
    "refresh": "Обновить",
    "plan": "Тариф",
    "model credits": "Баланс кредитов",
    "enable ai credit overages": "Разрешить перерасход кредитов",
    "when toggled on, antigravity will use your ai credits to fulfill model requests once you're out of model quota. antigravity will always use your model quota first before using ai credits.": "Если этот параметр включен, Antigravity будет использовать ваши кредиты для выполнения запросов к моделям, когда закончится квота. Antigravity всегда сначала использует квоту моделей, прежде чем тратить кредиты.",
    "see activity": "История операций",
    "get more ai credits": "Купить кредиты",
    "model quota": "Квоты моделей",
    "within each group, models share a weekly limit and a 5-hour limit. quota is consumed proportionally to the cost of the tokens. thus, limits will last longer with shorter tasks or using more cost-effective models. the 5-hour limit smooths out aggregate demand to fairly distribute global capacity across all users, while your weekly limit is tied directly to your individual tier.": "Внутри каждой группы модели делят недельный лимит и 5-часовой лимит. Квота расходуется пропорционально стоимости токенов. Таким образом, лимитов хватит на дольше при коротких задачах или использовании более экономичных моделей. 5-часовой лимит сглаживает совокупный спрос для справедливого распределения ресурсов между всеми пользователями, в то время как недельный лимит привязан к вашему тарифному плану.",
    "gemini models": "Модели Gemini",
    "claude and gpt models": "Модели Claude и GPT",
    "weekly limit": "Недельный лимит",
    "five hour limit": "5-часовой лимит",
    "configure default behaviors, skills, and mcp servers.": "Настройка поведения по умолчанию, навыков и серверов MCP.",
    
    "requires manual review for all terminal commands and file accesses outside of the working folders.": "Требует ручного подтверждения для всех команд терминала и обращений к файлам вне рабочих папок.",
    "full machine": "Полный доступ к системе",
    "all terminal commands require review. the agent can read or write to any file in the machine.": "Все команды терминала требуют подтверждения. Агент может читать и писать любые файлы на компьютере.",
    "turbo mode": "Турбо-режим",
    "disables all safety barriers for maximal iteration velocity.": "Отключает все барьеры безопасности для максимальной скорости итерации.",
    "manually customize individual settings.": "Ручная настройка отдельных параметров.",
    "allow": "Разрешить",
    "deny": "Запретить",
    "always proceed": "Всегда выполнять",

    "manage your plan, credentials, and general preferences.": "Управление вашим тарифом, учетными данными и общими настройками.",
    "enable telemetry": "Разрешить телеметрию",
    "when toggled on, antigravity collects usage data to help google enhance performance and features.": "Если этот параметр включен, Antigravity собирает данные об использовании, чтобы помочь Google улучшить производительность и функции.",
    "marketing emails": "Маркетикивые рассылки",
    "receive product updates, tips, and promotions from google antigravity via email.": "Получать обновления продуктов, советы и промо-акции от Google Antigravity по электронной почте.",
    "you can upgrade to a higher google ai ultra plan to receive the highest rate limits.": "Вы можете перейти на более высокий тариф Google AI Ultra, чтобы получить максимальные лимиты.",
    "upgrade": "Сменить тариф",
    "sign out": "Выйти",
    "by using this app, you agree to its": "Используя это приложение, вы соглашаетесь с его",
    "terms of service": "Условиями использования",

    "danger zone": "Опасная зона",
    "delete project": "Удалить проект",
    "project-specific settings": "Настройки для конкретных проектов",
    "modify scoped permissions, folders, and agent settings like sandbox and terminal command execution.": "Изменение прав доступа, папок и настроек агента, таких как песочница и выполнение терминальных команд.",
    "go to projects": "Перейти к проектам",
    "file permissions": "Разрешения для файлов",
    "network permissions": "Разрешения для сети",
    "terminal & tooling permissions": "Разрешения для терминала и инструментов",
    "configure global allowed and denied resource permissions.": "Настройка глобальных разрешений доступа к ресурсам.",
    "of the customization budget is available.": " бюджета кастомизаций доступно.",
    "of the customization budget is available": " бюджета кастомизаций доступно",
    "% of the customization budget is available.": " % бюджета кастомизаций доступно.",
    "% of the customization budget is available": " % бюджета кастомизаций доступно",
    "hide breakdown": "Скрыть детали",

    "manage project folders, agent settings, and permissions.": "Управление папками проекта, настройками агента и разрешениями.",
    "installed mcp servers": "Установленные серверы MCP",
    "add mcp +": "Добавить MCP +",
    "build with google plugins": "Сборка с плагинами Google",
    "customize": "Настроить",

    "browser settings": "Настройки браузера",
    "configure the browser subagent. it requires": "Настройка браузера-субагента. Требуется установить",
    "to be installed. the browser subagent can be invoked by typing": "для запуска. Запустить браузер-субагент можно, введя",
    "in the conversation input box.": "в поле ввода сообщения.",
    "in the conversation input box": "в поле ввода сообщения",
    "browser javascript execution policy": "Политика выполнения JavaScript в браузере",
    "controls whether the agent can run custom javascript to automate complex browser actions.": "Определяет, может ли агент выполнять пользовательский JavaScript для автоматизации сложных действий в браузере.",
    "disabled": "Отключено",
    "enabled": "Включено",
    "actuation permissions": "Разрешения на управление",
    "browser actuation rules": "Правила выполнения действий в браузере",
    "configure allowed and denied urls for browser actuation.": "Настройка разрешенных и запрещенных URL-адресов для выполнения действий в браузере.",

    "back": "Назад",
    "request review": "Требовать подтверждение",
    "block all browser javascript execution.": "Блокировать все выполнение JavaScript в браузере.",
    "prompt for approval before running browser scripts.": "Запрашивать подтверждение перед запуском скриптов в браузере.",
    "allow full browser script execution without prompting.": "Разрешить полное выполнение скриптов в браузере без запроса.",
    "browser actuation permissions": "Разрешения на управление браузером",
    "execute urls": "Разрешенные URL-адреса",
    "allow/deny agent browser actuation access to specific urls.": "Разрешение/запрет доступа браузера-субагента к конкретным URL-адресам.",
    "add": "Добавить",

    // Context menu / Editor split actions (Screenshot 1)
    "rename": "Переименовать",
    "pin": "Закрепить",
    "unpin": "Открепить",
    "archive": "Архивировать",

    "split": "Разделить",
    "split right": "Разделить вправо",
    "split down": "Разделить вниз",
    "replace with new": "Заменить новым",
    "cut": "Вырезать",
    "copy": "Копировать",
    "copied": "Скопировано",
    "copied!": "Скопировано!",
    "paste": "Вставить",
    "paste as plain text": "Вставить как обычный текст",
    "paste and match style": "Вставить и согласовать стиль",
    "select all": "Выделить всё",
    "undo": "Отменить",
    "redo": "Повторить",
    "delete": "Удалить",
    "copy code": "Скопировать код",
    "copy prompt": "Скопировать запрос",
    "copy response": "Скопировать ответ",
    "copy message": "Скопировать сообщение",
    "copy link": "Скопировать ссылку",
    "copy link address": "Копировать адрес ссылки",
    "open link": "Открыть ссылку",
    "copy path": "Скопировать путь",
    "copy relative path": "Скопировать относительный путь",
    "copy id": "Скопировать ID",
    "copy to clipboard": "Копировать в буфер обмена",
    "copy all": "Копировать всё",
    "copy selection": "Копировать выделенное",
    "copy markdown": "Копировать Markdown",
    "copy raw": "Копировать исходный текст",
    "insert at cursor": "Вставить в позицию курсора",
    "insert into terminal": "Вставить в терминал",
    "run in terminal": "Запустить в терминале",
    "inspect": "Исследовать элемент",
    "inspect element": "Исследовать элемент",

    // Global & Tool Permissions (Screenshots 2 & 5)
    "global permissions": "Глобальные разрешения",
    "tool permissions": "Разрешения для инструментов",
    "modify permissions for file, terminal, and mcp tools.": "Изменение разрешений для файлов, терминала и инструментов MCP.",
    "modify permissions for file, terminal, and mcp tools": "Изменение разрешений для файлов, терминала и инструментов MCP",
    "controls the actions the agent can take.": "Управляет действиями, которые может выполнять агент.",
    "whether the agent asks you to review its documents.": "Запрашивать ли проверку создаваемых агентом документов.",
    "whether the agent asks you to review its documents": "Запрашивать ли проверку создаваемых агентом документов",
    "modified in": "Изменено в ",

    // Browser Settings text fragments (Screenshot 3)
    "to be installed. the browser subagent can be invoked by typing /browser in the conversation input box.": ". Браузер-субагент можно запустить, введя /browser в поле ввода сообщения.",
    "to be installed. the browser subagent can be invoked by typing /browser in the conversation input box": ". Браузер-субагент можно запустить, введя /browser в поле ввода сообщения",
    "to be installed. the browser subagent can be invoked by typing": ". Браузер-субагент можно запустить, введя",
    "the browser subagent can be invoked by typing": "Браузер-субагент можно запустить, введя",
    "to be installed.": ".",
    "to be installed": "",
    " . the browser subagent can be invoked by typing /browser in the conversation input box.": ". Браузер-субагент можно запустить, введя /browser в поле ввода сообщения.",
    " . the browser subagent can be invoked by typing /browser in the conversation input box": ". Браузер-субагент можно запустить, введя /browser в поле ввода сообщения",
    ". the browser subagent can be invoked by typing /browser in the conversation input box.": ". Браузер-субагент можно запустить, введя /browser в поле ввода сообщения.",
    ". the browser subagent can be invoked by typing /browser in the conversation input box": ". Браузер-субагент можно запустить, введя /browser в поле ввода сообщения",
    "the browser subagent can be invoked by typing /browser in the conversation input box.": "Запустить браузер-субагент можно, введя /browser в поле ввода сообщения.",
    "the browser subagent can be invoked by typing /browser in the conversation input box": "Запустить браузер-субагент можно, введя /browser в поле ввода сообщения",

    // Neon plugin (Image 3)
    "manage your neon backend with the neon mcp server: lakebase postgres, branching, object storage, functions, and the ai gateway": "Управляйте вашим бэкендом Neon с помощью MCP-сервера Neon: Lakebase Postgres, ветвление, объектное хранилище, функции и AI Gateway",
    "manage your neon backend with the neon mcp server: lakebase postgres, branching, object storage, functions, and the ai gateway.": "Управляйте вашим бэкендом Neon с помощью MCP-сервера Neon: Lakebase Postgres, ветвление, объектное хранилище, функции и AI Gateway.",


    // Browser settings notice (Screenshot 1)
    "browser settings have moved": "Настройки браузера перемещены",
    "browser settings have moved to the browser section of general settings.": "Настройки браузера перемещены в раздел «Браузер» общих настроек.",
    "browser settings have moved to the browser section of general settings": "Настройки браузера перемещены в раздел «Браузер» общих настроек",
    "go to general settings": "Перейти в общие настройки",

    // Permissions & Inherit Global (Screenshots 2 & 3)
    "inherit global": "Наследовать глобальные",
    "inherits your global permissions when working in this project.": "Наследует ваши глобальные разрешения при работе в этом проекте.",
    "inherits your global permissions when working in this project": "Наследует ваши глобальные разрешения при работе в этом проекте",
    "also includes global permissions when working in this project.": "Также включает глобальные разрешения при работе в этом проекте.",
    "also includes global permissions when working in this project": "Также включает глобальные разрешения при работе в этом проекте",
    "also includes": "Также включает",
    "when working in this project.": "при работе в этом проекте.",
    "when working in this project": "при работе в этом проекте",
    "this project overrides your global permission settings.": "Этот проект переопределяет ваши глобальные настройки разрешений.",
    "this project overrides your global permission settings": "Этот проект переопределяет ваши глобальные настройки разрешений",
    "every command requires approval.": "Каждая команда требует подтверждения.",
    "every command requires approval": "Каждая команда требует подтверждения",
    "ask before sensitive operations.": "Спрашивать перед конфиденциальными операциями.",
    "ask before sensitive operations": "Спрашивать перед конфиденциальными операциями",
    "run all commands without restrictions.": "Выполнение всех команд без ограничений.",
    "run all commands without restrictions": "Выполнение всех команд без ограничений",
    "запуск all commands without restrictions.": "Выполнение всех команд без ограничений.",
    "запуск all commands without restrictions": "Выполнение всех команд без ограничений",
    "use global settings": "Использовать глобальные настройки",
    "use global settings.": "Использовать глобальные настройки.",
    "project настройки": "Настройки проекта",

    // Copy context submenu (Screenshot 4)
    "conversation name": "Название диалога",
    "project name": "Название проекта",

    // IDE promo banner (Screenshot 5)
    "install antigravity ide to run and edit your workspace scripts.": "Установите Antigravity IDE для запуска и редактирования скриптов вашего рабочего пространства.",
    "install antigravity ide to run and edit your workspace scripts": "Установите Antigravity IDE для запуска и редактирования скриптов вашего рабочего пространства",

    "app settings": "Настройки приложения",
    "application": "Приложение",

    "manage application settings.": "Управление настройками приложения.",
    "manage antigravity app settings.": "Управление настройками приложения Antigravity.",
    "manage antigravity app settings": "Управление настройками приложения Antigravity",
    "prevent sleep": "Запретить спящий режим",
    "prevent the computer from sleeping while the app is running.": "Запретить компьютеру переходить в спящий режим во время работы приложения.",
    "keep in menu bar": "Оставлять в трее",
    "the app will be accessible from the menu bar and will keep running in the background when all windows are closed.": "Приложение будет доступно из панели меню и продолжит работу в фоновом режиме, когда все окна закрыты.",
    "remote control": "Дистанционное управление",
    "remote control issue": "Проблема с дистанционным управлением",
    "enable remote control": "Включить дистанционное управление",
    "work with local agents from another device.": "Работайте с локальными агентами с другого устройства.",
    "work with local agents from another device": "Работайте с локальными агентами с другого устройства",
    "device name": "Имя устройства",
    "copy link": "скопировать ссылку",
    "open in remote control": "Открыть в Remote Control",
    "continue your work from another device with remote control. scan the qr code or open the link below.": "Продолжайте работу с другого устройства с помощью Remote Control. Отсканируйте QR-код или перейдите по ссылке ниже.",
    "continue your work from another device with remote control. scan the qr code or open the link below": "Продолжайте работу с другого устройства с помощью Remote Control. Отсканируйте QR-код или перейдите по ссылке ниже",
    "scan the code to open this device in remote control, or": "Отсканируйте код, чтобы открыть это устройство в Remote Control, или",
    "scan the code to open this device in remote control, or ": "Отсканируйте код, чтобы открыть это устройство в Remote Control, или ",
    "copy project name": "Скопировать название проекта",
    "project settings": "Настройки проекта",
    "new conversation in project": "Новый диалог в проекте",
    "display options": "Параметры отображения",
    "create new project": "Создать новый проект",
    "google cloud cli (preview)": "Google Cloud CLI (Предварительный просмотр)",
    "manage google cloud resources with gcloud and bq cli tools in a remote sandbox environment": "Управляйте ресурсами Google Cloud с помощью CLI-инструментов gcloud и bq в изолированной удаленной песочнице",
    "manage google cloud resources with gcloud and bq cli tools in a remote sandbox environment.": "Управляйте ресурсами Google Cloud с помощью CLI-инструментов gcloud и bq в изолированной удаленной песочнице.",
    "archive conversation": "Архивировать диалог",
    "mark unread": "Пометить как непрочитанное",
    "more actions": "Другие действия",
    "idle": "Ожидание",
    "updated": "Обновлено",
    "updating": "Обновление",
    "github actions run status": "Статус запуска GitHub Actions",
    "github actions status": "Статус GitHub Actions",
    "message from": "Сообщение от",
    "view": "Просмотр",
    "viewing": "Просмотр",
    "build": "Сборка",
    "building": "Сборка",
    "release executable": "Исполняемый файл релиза",
    "executable": "Исполняемый файл",
    "compacting": "Сжатие контекста",
    "compact": "Сжать контекст",
    "compact conversation": "Сжать контекст диалога",
    "toggle maximize auxiliary pane": "Развернуть/восстановить дополнительную панель",
    "sort by": "Сортировка",
    "sort by:": "Сортировка:",
    "last updated": "По дате обновления",
    "last prompt": "По последнему запросу",
    "custom order": "Пользовательский порядок",
    "maximize auxiliary pane": "Развернуть дополнительную панель",
    "new tab": "Новая вкладка",
    "+ new tab": "+ Новая вкладка",
    "mark this conversation as unread": "Пометить этот диалог как непрочитанный",
    "mark conversation as unread": "Пометить диалог как непрочитанный",
    "mark as unread": "Пометить как непрочитанный",
    "mark this conversation as read": "Пометить этот диалог как прочитанный",
    "mark conversation as read": "Пометить диалог как прочитанный",
    "mark as read": "Пометить как прочитанный",
    "toggle overview panel": "Показать/скрыть панель обзора",
    "overview panel": "Панель обзора",
    "maximize auxiliary pane": "Развернуть дополнительную панель",
    "media": "Медиа",
    "folder": "Папка",
    "mentions": "Упоминания",
    "actions": "Действия",
    "this page is going away soon": "Эта страница скоро будет недоступна",
    "this page is going away soon.": "Эта страница скоро будет недоступна.",
    "search conversations with 🔍 in the top left.": "Поиск диалогов с помощью 🔍 в левом верхнем углу.",
    "search conversations with 🔍 in the top left": "Поиск диалогов с помощью 🔍 в левом верхнем углу",
    "view archived in the sidebar (𝌆 menu).": "Просмотр архива в боковой панели (меню 𝌆).",
    "view archived in the sidebar (𝌆 menu)": "Просмотр архива в боковой панели (меню 𝌆)",
    "view archived in the sidebar": "Просмотр архива в боковой панели",
    "archived in the sidebar": "Архив в боковой панели",
    "mark all as read": "Пометить все как прочитанные",
    "mark all as read.": "Пометить все как прочитанные.",
    "mark as read": "Пометить как прочитанное",
    "mark as read.": "Пометить как прочитанное.",
    "send message enter": "Отправить сообщение Enter",
    "send message": "Отправить сообщение",
    "record audio": "Запись аудио",
    "resets in": "Сброс через",
    "select model": "Выбор модели",
    "stop execution": "Остановить выполнение",
    "show in file explorer": "Показать в проводнике",
    "plan review policy": "Политика проверки плана",
    "type / and select plan to have the agent generate a plan.": "Введите / и выберите plan, чтобы агент составил план.",
    "type / and select plan to have the agent generate a plan": "Введите / и выберите plan, чтобы агент составил план",
    "to have the agent generate a plan.": ", чтобы агент составил план.",
    "to have the agent generate a plan": ", чтобы агент составил план",
    "generate a plan": "составить план",
    "generate a plan.": "составить план.",
    "and select": "и выберите",
    "and select plan": "и выберите plan",
    "type /": "Введите /",
    "google cloud organization policy": "Google Cloud Organization Policy",
    "google cloud api keys": "Google Cloud API Keys",
    "factset ai-ready data": "FactSet AI-Ready Data",
    "notifications": "Уведомления",
    "manage your notification preferences.": "Управление настройками уведомлений.",
    "manage your notification preferences": "Управление настройками уведомлений",
    "enable notifications for agent": "Включить уведомления для агента",
    "show system notifications when your action is needed or the agent finishes.": "Показывать системные уведомления, когда требуется ваше действие или агент завершил работу.",
    "show system notifications when your action is needed or the agent finishes": "Показывать системные уведомления, когда требуется ваше действие или агент завершил работу",
    "sound": "Звук",
    "enable sounds for agent": "Включить звуки для агента",
    "play a sound when your action is needed or the agent finishes.": "Воспроизводить звук, когда требуется ваше действие или агент завершил работу.",
    "play a sound when your action is needed or the agent finishes": "Воспроизводить звук, когда требуется ваше действие или агент завершил работу",
    "volume": "Громкость",
    "set the volume of agent sounds.": "Настройка громкости звуков агента.",
    "set the volume of agent sounds": "Настройка громкости звуков агента",

    // Models & Usage
    "models & usage": "Модели и использование",
    "models and usage": "Модели и использование",
    "manage your model quota and credits.": "Управление квотами моделей и кредитами.",
    "manage your model quota and credits": "Управление квотами моделей и кредитами",
    "you are subscribed to the best google ai plan.": "Вы подписаны на лучший тариф Google AI.",
    "you are subscribed to the best google ai plan": "Вы подписаны на лучший тариф Google AI",
    "refresh usage": "Обновить использование",
    "refresh quota": "Обновить квоту",

    // Appearance / Contrast
    "contrast": "Контрастность",
    "strong": "Высокая",

    // Version
    "version": "Версия",
    "app version": "Версия приложения",
    "app version:": "Версия приложения:",

    // MCP Plugins
    "fiscal.ai": "Fiscal.ai",
    "docusign": "Docusign",
    "legalzoom": "LegalZoom",
    "netdocuments": "NetDocuments",
    "imanage": "iManage",
    "salesforce": "Salesforce",
    "courtroom5": "Courtroom5",
    "opsera ai agents": "Opsera AI Agents",
    "forge": "Forge",
    "endor labs": "Endor Labs",

    // Conversation actions
    "edit conversation title": "Изменить название диалога",
    "edit conversation title...": "Изменить название диалога...",
    "edit conversation": "Изменить диалог",

    // Badges
    "limited time": "Ограниченное время",
    "limited-time": "Ограниченное время",
    "limited time offer": "Ограниченное по времени предложение",

    // Customizations breakdown
    "the breakdown below shows token usage from customizations like rules, skills, and mcp. if a budget is exceeded, large rules are demoted to path pointers and large customizations are excluded automatically.": "В приведенной ниже таблице показано использование токенов персонализациями (правила, навыки и MCP). При превышении лимита большие правила заменяются на указатели путей, а крупные персонализации исключаются автоматически.",
    "the breakdown below shows token usage from customizations like rules, skills, and mcp.": "В приведенной ниже таблице показано использование токенов персонализациями (правила, навыки и MCP).",
    "if a budget is exceeded, large rules are demoted to path pointers and large customizations are excluded automatically.": "При превышении лимита большие правила заменяются на указатели путей, а крупные персонализации исключаются автоматически.",

    // Plugins, expand/collapse, authentication
    "plugins": "Плагины",
    "plugin": "Плагин",
    "show less": "Свернуть",
    "show more": "Развернуть",
    "show less...": "Свернуть...",
    "show more...": "Развернуть...",
    "authenticate": "Авторизоваться",
    "authenticated": "Авторизовано",
    "authentication": "Аутентификация",
    "unauthorized": "Не авторизовано",

    // Uploads & Subagents
    "uploads": "Загрузки",
    "upload": "Загрузить",
    "upload file": "Загрузить файл",
    "upload files": "Загрузить файлы",
    "no subagents": "Нет субагентов",
    "no subagents running": "Нет запущенных субагентов",
    "1 subagent running": "1 субагент запущен",
    "subagent running": "Субагент запущен",
    "subagents running": "Субагенты запущены",
    "subagents": "Субагенты",
    "subagent": "Субагент",

    // Git / Changes / Review
    "uncommitted": "Не зафиксировано",
    "staged index changes and working tree changes": "Изменения в индексе и рабочем дереве",
    "branch": "Ветка",
    "all changes since": "Все изменения относительно",
    "agent edits": "Правки агента",
    "files modified by the agent in this conversation": "Файлы, измененные агентом в этом диалоге",
    "files modified by the agent when not in a project": "Файлы, измененные агентом вне проекта",
    "files modified by the agent": "Файлы, измененные агентом",




    "notification settings": "Настройки уведомлений",
    "to modify notification settings, open your operating system's system preferences.": "Чтобы изменить настройки уведомлений, откройте системные настройки вашей операционной системы.",
    "open system preferences": "Открыть системные настройки",



    // Credits and Model grouping (Screenshot 1)
    "available ai credits:": "Доступные AI-кредиты:",
    "available ai credits": "Доступные AI-кредиты",
    "models within this group:": "Модели в этой группе:",
    "models within this group": "Модели в этой группе",

    // Plugins header / subheader (Screenshot 5)
    "browse and enable plugins from the build with google catalog.": "Просматривайте и включайте плагины из каталога Build With Google.",
    "browse and enable plugins from the build with google catalog": "Просматривайте и включайте плагины из каталога Build With Google",

    "build with antigravity plugins": "Сборка с плагинами Antigravity",
    "plugins are packaged collections of skills and mcps to help the agent in": "Плагины — это пакетные наборы навыков и MCP, которые помогают Агенту в",

    "work with google developer products. you can always change your choices in settings.": "работать с продуктами Google для разработчиков. Вы всегда можете изменить свой выбор в Настройках.",
    "work with google developer products. you can always change your choices in settings": "работать с продуктами Google для разработчиков. Вы всегда можете изменить свой выбор в Настройках",
    "core tools and knowledge required to develop for android": "Основные инструменты и знания, необходимые для разработки под Android",
    "keep your coding agent up to date with the latest web best practices.": "Держите своего кодинг-агента в курсе последних передовых веб-технологий.",
    "using the antigravity python sdk to build ai agents": "Использование Antigravity Python SDK для создания ИИ-агентов",
    "science": "Наука",
    "curated collection of agent skills for science.": "Кураторская коллекция навыков агента для научных задач.",
    "prototype, build & run modern apps users love with firebase's backend, ai, and operational infrastructure.": "Прототипируйте, создавайте и запускайте современные приложения с помощью бэкенда, ИИ и операционной инфраструктуры Firebase.",
    "reliable automation, in-depth debugging, and performance analysis in chrome using chrome devtools and puppeteer": "Надежная автоматизация, глубокая отладка и анализ производительности в Chrome с использованием Chrome DevTools и Puppeteer",
    "reliable automation, in depth debugging, and performance analysis in chrome using chrome devtools and puppeteer": "Надежная автоматизация, глубокая отладка и анализ производительности в Chrome с использованием Chrome DevTools и Puppeteer",
    "download": "Скачать",

    "a high-risk mode that disables all safety barriers. the agent operates with full system access, auto-executes all terminal commands, and reads or writes to any file without review prompts.": "Высокорискованный режим, отключающий все барьеры безопасности. Агент работает с полным доступом к системе, автоматически выполняет все команды в терминале и читает или записывает любые файлы без запроса подтверждения.",
    "a high-risk mode that disables all safety barriers. the agent operates with full system access, auto-executes all terminal commands, and reads or writes to any file without review prompts": "Высокорискованный режим, отключающий все барьеры безопасности. Агент работает с полным доступом к системе, автоматически выполняет все команды в терминале и читает или записывает любые файлы без запроса подтверждения.",
    "a high-risk mode that disables all safety barriers. the agent operates with full system access, auto-executes all terminal commands, and reads or writes to all local files without review prompts.": "Высокорискованный режим, отключающий все барьеры безопасности. Агент работает с полным доступом к системе, автоматически выполняет все команды в терминале и читает или записывает любые файлы на компьютере без запросов подтверждения.",
    "a high-risk mode that disables all safety barriers. the agent operates with full system access, auto-executes all terminal commands, and reads or writes to all local files without review prompts": "Высокорискованный режим, отключающий все барьеры безопасности. Агент работает с полным доступом к системе, автоматически выполняет все команды в терминале и читает или записывает любые файлы на компьютере без запросов подтверждения.",
    
    "permanently delete": "Навсегда удалить",
    "including": " включая",
    "active conversations and": " активных диалогов и",
    "active conversation and": " активного диалога и",
    "active conversations": " активных диалогов",
    "active conversation": " активного диалога",
    "archived conversations.": " архивированных диалогов.",
    "archived conversation.": " архивированного диалога.",
    "archived conversations": " архивированных диалогов",
    "archived conversation": " архивированного диалога",
    "archived": " архивированных",
    "conversations.": " диалогов.",
    "conversations": " диалогов",
    "conversation.": " диалога.",
    "conversation": " диалог",
    "and": " и",
    "token usage": "Использование токенов",

    "feedback type": "Тип отзыва",
    "bug report": "Отчет об ошибке",
    "feature request": "Запрос функции",
    "auth and billing": "Авторизация и оплата",
    "general feedback": "Общий отзыв",
    "description": "Описание",
    "please describe the issue in detail. the more actionable your feedback, the quicker our team can address your request. some helpful information includes:": "Пожалуйста, подробно опишите проблему. Чем конкретнее отзыв, тем быстрее наша команда сможет ее решить. Полезная информация включает:",
    "steps to reproduce the issue": "Шаги для воспроизведения проблемы",
    "expected behavior": "Ожидаемое поведение",
    "actual behavior": "Фактическое поведение",
    "any error messages": "Любые сообщения об ошибках",
    "any relevant information": "Любая важная информация",
    "describe the bug you encountered...": "Опишите найденную ошибку...",
    "steps to reproduce": "Шаги для воспроизведения",
    "please list the steps to reproduce the issue": "Пожалуйста, перечислите шаги для воспроизведения проблемы",
    "attach a screenshot (optional)": "Прикрепить скриншот (необязательно)",
    "attach antigravity server logs": "Прикрепить логи сервера Antigravity",

    "keyboard shortcuts for quick navigation and control.": "Сочетания клавиш для быстрой навигации и управления.",
    "recommended": "Рекомендованные",
    "open conversation picker": "Открыть выбор диалога",
    "open file search": "Открыть поиск файлов",
    "focus input": "Фокусировать поле ввода",
    "navigation": "Навигация",
    "go back": "Назад",
    "go forward": "Вперед",
    "file picker": "Выбор файлов",
    "select previous conversation": "Выбрать предыдущий диалог",
    "select next conversation": "Выбрать следующий диалог",
    "previous pane tab": "Предыдущая вкладка панели",
    "next pane tab": "Следующая вкладка панели",
    "previous pane": "Предыдущая панель",
    "next pane": "Следующая панель",
    "previous tab": "Предыдущая вкладка",
    "next tab": "Следующая вкладка",
    "open settings": "Открыть настройки",
    "toggle model selector": "Показать/скрыть выбор модели",
    "toggle voice recording": "Включить/выключить голосовую запись",
    "find in pane": "Найти на панели",
    "add to chat/quote": "Добавить в чат / Цитировать",
    "add to chat / quote": "Добавить в чат / Цитировать",
    "add to chat": "Добавить в чат",
    "quote": "Цитировать",
    "layout controls": "Управление макетом",
    "toggle sidebar": "Показать/скрыть боковую панель",
    "toggle auxiliary pane": "Показать/скрыть вспомогательную панель",
    "toggle terminal": "Показать/скрыть терминал",
    "toggle terminal panel": "Показать/скрыть панель терминала",

    "+ new": "+ Создать",
    "new": "Создать",
    "search tasks...": "Поиск задач...",
    "no scheduled tasks configured.": "Нет запланированных задач.",
    "search conversations...": "Поиск диалогов...",
    "filter": "Фильтр",
    "outside of project": "Вне проекта",

    "new scheduled task": "Новая запланированная задача",
    "enter scheduled task name...": "Введите название запланированной задачи...",
    "schedule": "Расписание",
    "prompt": "Запрос (промпт)",
    "enter a prompt for the agent to run...": "Введите запрос для запуска агентом...",
    "all scheduled tasks run as flash.": "Все запланированные задачи выполняются как Flash.",
    "add scheduled task": "Добавить запланированную задачу",
    "daily": "Ежедневно",
    "weekly": "Еженедельно",
    "hourly": "Ежечасно",
    "monthly": "Ежемесячно",
    "around": "около",

    "files changed": "Измененные файлы",
    "file changed": "файл изменен",
    "file changed +": "файл изменен +",
    "files changed +": "файлы изменены +",
    "1 file changed": "1 файл изменен",
    "1 file changed +": "1 файл изменен +",
    "good response": "Хороший ответ",
    "bad response": "Плохой ответ",
    "artifacts": "Артефакты",
    "background tasks": "Фоновые задачи",
    
    "allow running this command?": "Разрешить запуск этой команды?",
    "yes, allow this time": "Да, разрешить в этот раз",
    "no (tell the agent what to do instead)": "Нет (указать агенту, что делать вместо этого)",
    "skip": "Пропустить",
    "submit": "Отправить",

    "agent terminated due to error": "Работа агента завершена из-за ошибки",
    "you can prompt the model to try again or start a new conversation if the error persists.": "Вы можете попросить модель повторить попытку или начать новый диалог, если ошибка повторится.",
    "see our troubleshooting guide for more help.": "Для получения дополнительной информации см. наше руководство по устранению неполадок.",
    "dismiss": "Закрыть",
    "copy debug info": "Копировать отладочную информацию",
    "retry": "Повторить",

    // Tool completion & architect session
    "finished": "Завершено",
    "finished.": "Завершено.",
    "session finished": "Сессия завершена",
    "run full clean architect session finished": "Сессия архитектора завершена",
    "run full clean architect session": "Сессия архитектора",
    "clean architect session": "Сессия архитектора",
    "architect session": "Сессия архитектора",
    "directory analysis": "Анализ директории",
    "analyzing directory": "Анализ директории",
    "web search": "Поиск в интернете",
    "searching the web": "Поиск в интернете",
    "git status check": "Проверка статуса git",
    "checking git status": "Проверка статуса git",
    "test execution": "Выполнение тестов",
    "running tests": "Выполнение тестов",
    "code search": "Поиск в коде",
    "searching code": "Поиск в коде",
    "command execution": "Выполнение команды",
    "running command": "Выполнение команды",
    "file search": "Поиск файлов",
    "viewing file": "Просмотр файла",
    "reading file": "Чтение файла",
    "writing file": "Запись файла",
    "editing file": "Редактирование файла",

    // Subagent errors & geolocation
    "implementation worker": "Implementation Worker",
    "implementation worker (worker)": "Implementation Worker (worker)",
    "error from implementation worker (worker)": "Ошибка: Implementation Worker (worker)",
    "user location is not supported for the api use.": "Местоположение пользователя не поддерживается для использования API.",
    "user location is not supported for the api use": "Местоположение пользователя не поддерживается для использования API",
    "user location is not supported for api use.": "Местоположение пользователя не поддерживается для использования API.",
    "user location is not supported for api use": "Местоположение пользователя не поддерживается для использования API",
    "failed_precondition (code 400): user location is not supported for the api use.": "FAILED_PRECONDITION (код 400): Местоположение пользователя не поддерживается для использования API.",
    "failed_precondition (code 400): user location is not supported for the api use": "FAILED_PRECONDITION (код 400): Местоположение пользователя не поддерживается для использования API",

    // Exploring & Analyzing
    "exploring file": "Исследование файла",
    "exploring files": "Исследование файлов",
    "exploring codebase": "Исследование кодовой базы",
    "exploring workspace": "Исследование рабочего пространства",
    "exploring project": "Исследование проекта",
    "exploring directory": "Исследование директории",
    "exploring folder": "Исследование папки",
    "exploring": "Исследование",
    "explored file": "Файл исследован",
    "explored files": "Файлы исследованы",
    "explored": "Исследовано",
    "analyzed": "Проанализировано",
    "analyzed file": "Файл проанализирован",
    "analyzed files": "Файлы проанализированы",
    "analyzing file": "Анализ файла",
    "analyzing files": "Анализ файлов",
    "analyzing": "Анализ",

    // Timestamps
    "now": "только что",
    "just now": "только что",

    // Sandbox Settings
    "enable sandbox mode (preview)": "Включить режим песочницы (Предпросмотр)",
    "enable sandbox mode": "Включить режим песочницы",
    "restricts agent tools to a secure, isolated local sandbox.": "Ограничивает инструменты агента безопасной изолированной локальной песочницей.",
    "restricts agent tools to a secure, isolated local sandbox": "Ограничивает инструменты агента безопасной изолированной локальной песочницей",

    // Automations, Marketplace, Panes & Placeholders
    "search for conversations...": "Поиск диалогов...",
    "search for conversations": "Поиск диалогов",
    "automations": "Автоматизации",
    "automations ctrl+u": "Автоматизации Ctrl+U",
    "create with prompt": "Создать с помощью промпта",
    "search automations...": "Поиск автоматизаций...",
    "search automations": "Поиск автоматизаций",
    "no automations configured.": "Нет настроенных автоматизаций.",
    "no automations configured": "Нет настроенных автоматизаций",
    "maximize pane": "Развернуть панель",
    "restore pane": "Восстановить панель",
    "minimize pane": "Свернуть панель",
    "close pane": "Закрыть панель",
    "marketplace": "Маркетплейс",
    "search customizations...": "Поиск персонализаций...",
    "search customizations": "Поиск персонализаций",
    "+ create": "+ Создать",
    "+ create plugin": "+ Создать плагин",
    "+ create skill": "+ Создать навык",
    "+ create agent": "+ Создать агента",
    "find skills, agents, and more in the marketplace.": "Ищите навыки, агентов и другое в Маркетплейсе.",
    "find skills, agents, and more in the marketplace": "Ищите навыки, агентов и другое в Маркетплейсе",
    "browse the marketplace": "Обзор Маркетплейса",
    "browse marketplace": "Обзор Маркетплейса",

    "allow write access to this path?": "Разрешить доступ на запись по этому пути?",
    "allow read access to this path?": "Разрешить доступ на чтение по этому пути?",
    "allow execute access to this path?": "Разрешить доступ на выполнение по этому пути?",
    "allow command execution?": "Разрешить выполнение команды?",
    
    // MCP Tools and Dialogs
    "allow using this mcp tool?": "Разрешить использование этого MCP-инструмента?",
    "add mcp servers": "Добавить MCP-серверы",
    "add mcp server": "Добавить MCP-сервер",
    "google cloud app optimize": "Google Cloud App Optimize",
    "the app optimize (appoptimize) remote mcp server allows you to create, manage, and analyze cloud cost, usage, and optimization reports for your google cloud resources.": "Удаленный MCP-сервер App Optimize (AppOptimize) позволяет создавать, управлять и анализировать отчеты о затратах на облако, использовании и оптимизации для ваших ресурсов Google Cloud.",
    "the app optimize (appoptimize) remote mcp server allows you to create, manage, and analyze cloud cost, usage, and optimization reports for your google cloud resources": "Удаленный MCP-сервер App Optimize (AppOptimize) позволяет создавать, управлять и анализировать отчеты о затратах на облако, использовании и оптимизации для ваших ресурсов Google Cloud.",
    "parallel search": "Parallel Search",
    "поиск parallel": "Parallel Search",
    "search parallel": "Parallel Search",
    "copy config file path": "Копировать путь к файлу конфигурации",
    "search mcp servers by name": "Поиск MCP-серверов по имени",
    "mcp toolbox for databases": "Набор инструментов MCP для баз данных",
    "knowledge catalog": "Каталог знаний",
    "oracle database": "База данных Oracle",
    "query your gitlab sdlc as a knowledge graph. orbit indexes groups, projects, source code, merge requests, pipelines, work items, and security findings into a single graph...": "Запросы к вашему GitLab SDLC в виде графа знаний. Orbit индексирует группы, проекты, исходный код, запросы на слияние, пайплайны, рабочие элементы и результаты безопасности в единый граф...",
    "enable antigravity to deploy apps to google cloud run.": "Позволяет Antigravity развертывать приложения в Google Cloud Run.",
    "interact directly with the posthog product analytics platform using natural language. run queries, manage feature flags, track errors, and manage projects.": "Взаимодействуйте напрямую с платформой продуктовой аналитики PostHog на естественном языке. Запускайте запросы, управляйте флагами функций, отслеживайте ошибки и управляйте проектами.",
    "enable antigravity to interact with google kubernetes engine (oss).": "Позволяет Antigravity взаимодействовать с Google Kubernetes Engine (GKE).",
    "the dart and flutter mcp server exposes dart (and flutter) development tool actions to compatible ai-assistant clients.": "MCP-сервер Dart и Flutter предоставляет действия инструментов разработки Dart (и Flutter) для совместимых клиентов AI-ассистентов.",
    "the firebase model context protocol (mcp) server gives ai-powered development tools the ability to work with your firebase projects and your app's codebase.": "MCP-сервер Firebase дает инструментам разработки на базе ИИ возможность работать с вашими проектами Firebase и кодовой базой вашего приложения.",
    "the genkit model context protocol (mcp) server gives ai-powered development tools the ability to build, debug and inspect your genkit app.": "MCP-сервер Genkit дает инструментам разработки на базе ИИ возможность собирать, отлаживать и инспектировать ваше приложение Genkit.",
    "the gopls model context protocol (mcp) server provides tools for semantic code analysis, live diagnostics, and transformation of your non-google3 go codebase.": "MCP-сервер gopls предоставляет инструменты для семантического анализа кода, живой диагностики и преобразования вашей кодовой базы Go (не-google3).",
    "interact with your bigquery data using natural language. this mcp server allows you to securely connect to your datasets to search the datasets, inspect table metadata,...": "Взаимодействуйте с вашими данными BigQuery на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашим наборам данных для поиска, проверки метаданных таблиц...",
    "interact with your alloydb for postgresql data using natural language. this mcp server allows you to securely connect to your database for executing sql queries,...": "Взаинтересуйте с вашими данными AlloyDB для PostgreSQL на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов...",
    "the bigtable admin remote mcp server lets you manage bigtable resources.": "Удаленный MCP-сервер Bigtable Admin позволяет управлять ресурсами Bigtable.",
    "the spanner remote mcp server lets you access and run spanner tools to create, manage, and query spanner resources from your ai-enabled development...": "Удаленный MCP-сервер Spanner позволяет получать доступ и запускать инструменты Spanner для создания, управления и выполнения запросов к ресурсам Spanner из вашей среды разработки с поддержкой ИИ...",
    "interact with your cloud sql for postgresql data using natural language. this mcp server allows you to securely connect to your database for executing sql queries,...": "Взаимодействуйте с вашими данными Cloud SQL for PostgreSQL на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов...",
    "interact with your cloud sql for mysql data using natural language. this mcp server allows you to securely connect to your database for executing sql queries, inspectin...": "Взаимодействуйте с вашими данными Cloud SQL for MySQL на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов, проверки...",
    "interact with your cloud sql for sql server data using natural language. this mcp server allows you to securely connect to your database for executing sql queries,...": "Взаимодействуйте с вашими данными Cloud SQL for SQL Server на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов...",
    "connect your ai assistants to looker business intelligence. this mcp server enables data exploration and content management by allowing you to execute natural...": "Подключите ваших ИИ-ассистентов к бизнес-аналитике Looker. Этот MCP-сервер позволяет исследовать данные и управлять контентом, выполняя естественные...",
    "connect your ai assistants to the knowledge catalog (formerly known as dataplex). this mcp server enables data discovery and governance by allowing you to search f...": "Подключите ваших ИИ-ассистентов к Каталогу знаний (ранее известному как Dataplex). Этот MCP-сервер позволяет находить данные и управлять ими, выполняя поиск...",
    "the mcp toolbox for databases is an open-source mcp server designed to simplify and secure the development of tools for interacting with databases.": "MCP Toolbox для баз данных — это MCP-сервер с открытым исходным кодом, созданный для упрощения и обеспечения безопасности разработки инструментов взаимодействия с базами данных.",
    "alloydb for postgresql admin mcp server enables ai assistants to interact with alloydb for postgresql resources, including creating clusters and administering users.": "MCP-сервер AlloyDB для PostgreSQL Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами AlloyDB для PostgreSQL, включая создание кластеров и администрирование пользователей.",
    "cloud sql for postgresql admin mcp server enables ai assistants to interact with cloud sql for postgresql resources, including creating instances, administering use...": "MCP-сервер Cloud SQL для PostgreSQL Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами Cloud SQL для PostgreSQL, включая создание инстансов, администрирование...",
    "cloud sql for mysql admin mcp server enables ai assistants to interact with cloud sql for mysql resources, including creating instances, administering users, and...": "MCP-сервер Cloud SQL для MySQL Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами Cloud SQL для MySQL, включая создание инстансов, администрирование пользователей и...",
    "cloud sql for sql server admin mcp server enables ai assistants to interact with cloud sql for sql server resources, including creating instances, administering user...": "MCP-сервер Cloud SQL для SQL Server Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами Cloud SQL для SQL Server, включая создание инстансов, администрирование...",
    "interact with your oracle database data using natural language. this mcp server allows you to securely connect to your databases for executing sql queries,...": "Взаимодействуйте с вашими данными Oracle Database на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашим базам данных для выполнения SQL-запросов...",
    "the dev mode mcp server brings figma directly into your workflow by providing important design information and context to ai agents generating code from figma...": "MCP-сервер Dev Mode переносит Figma напрямую в ваш рабочий процесс, предоставляя важную информацию о дизайне и контекст ИИ-агентам, генерирующим код из Figma...",
    "the github mcp server is a model context protocol (mcp) server that provides seamless integration with github apis, enabling advanced automation and interactio...": "MCP-сервер GitHub — это сервер Model Context Protocol, обеспечивающий бесшовную интеграцию с API GitHub, что делает возможным продвинутую автоматизацию и взаимодействие...",
    "neon mcp server is an open-source tool that lets you interact with your neon postgres databases in natural language.": "MCP-сервер Neon — это инструмент с открытым исходным кодом, который позволяет вам взаимодействовать с базами данных Neon Postgres на естественном языке.",
    "the stripe model context protocol server allows you to integrate with stripe apis through function calling. this protocol supports various tools to interact with differe...": "MCP-сервер Stripe позволяет интегрироваться с API Stripe посредством вызова функций. Этот протокол поддерживает различные инструменты для взаимодействия с...",
    "interact with redis key-value stores": "Взаимодействуйте с хранилищами ключ-значение Redis",
    "a model context protocol server for interacting with mongodb atlas.": "Сервер Model Context Protocol для взаимодействия с MongoDB Atlas.",
    "official notion mcp server that allows interaction with notion workspaces, pages, databases, and comments via the notion api.": "Официальный MCP-сервер Notion, позволяющий взаимодействовать с рабочими пространствами, страницами, базами данных и комментариями Notion через Notion API.",
    "official linear.app mcp server for interacting with linear projects, issues, and workflows.": "Официальный MCP-сервер Linear.app для взаимодействия с проектами, задачами и рабочими процессами Linear.",
    "an mcp server implementation that integrates the perplexity sonar api to provide real-time, web-wide research capabilities.": "Реализация MCP-сервера, которая интегрирует Perplexity Sonar API для предоставления возможностей поиска в реальном времени по всей сети.",
    "official paypal mcp server that allows integration with paypal apis for payment processing, transaction management, and account operations.": "Официальный MCP-сервер PayPal, позволяющий интегрироваться с API PayPal для обработки платежей, управления транзакциями и операций с аккаунтами.",
    "the heroku platform mcp server enables seamless interaction with heroku platform resources, allowing llms to read, manage, and operate applications, add-ons,...": "MCP-сервер Heroku Platform обеспечивает бесшовное взаимодействие с ресурсами Heroku Platform, позволяя LLM читать, управлять и оперировать приложениями, аддонами...",
    "the pinecone mcp server enables ai tools to search pinecone documentation, configure indexes, generate code informed by your index configuration, and...": "MCP-сервер Pinecone позволяет инструментам ИИ искать в документации Pinecone, настраивать индексы, генерировать код на основе конфигурации ваших индексов и...",
    "connect your supabase projects to ai assistants. this mcp server allows managing tables, fetching config, executing sql queries, managing edge functions, and workin...": "Подключите ваши проекты Supabase к ИИ-ассистентам. Этот MCP-сервер позволяет управлять таблицами, получать конфигурацию, выполнять SQL-запросы, управлять edge-функциями и работать...",
    "this conversation grew too large, so the history before this point may be missing or incomplete.": "Этот диалог стал слишком большим, поэтому история до этого момента может отсутствовать или быть неполной.",
    "this conversation grew too large, so the history before this point may be missing or incomplete": "Этот диалог стал слишком большим, поэтому история до этого момента может отсутствовать или быть неполной",
    "send feedback as": "Отправить отзыв от имени",
    "legal help": "Юридическая помощь",
    "to ask for content changes for legal reasons.": ", чтобы запросить изменение содержания по юридическим причинам.",
    "to ask for content changes for legal reasons": ", чтобы запросить изменение содержания по юридическим причинам",
    "visit legal help to ask for content changes for legal reasons.": "Посетите раздел «Юридическая помощь», чтобы запросить изменение содержания по юридическим причинам.",
    "visit legal help to ask for content changes for legal reasons": "Посетите раздел «Юридическая помощь», чтобы запросить изменение содержания по юридическим причинам",
    "canva": "Canva",
    "the canva mcp server enables ai assistants to seamlessly interact with canva's design capabilities. by exposing canva's capabilities (including design creation and editing,...": "MCP-сервер Canva позволяет ИИ-ассистентам легко взаимодействовать с возможностями дизайна Canva. Предоставляя функции Canva (включая создание и редактирование дизайна,...",
    "the canva mcp server enables ai assistants to seamlessly interact with canva's design capabilities. by exposing canva's capabilities (including design creation and editing, asset and brand management, library search, export, and commenting) as mcp-compatible tools, you can give your users access to canva's design power through natural language, directly from the ai tools they already use.": "MCP-сервер Canva позволяет ИИ-ассистентам легко взаимодействовать с возможностями дизайна Canva. Предоставляя функции Canva (включая создание и редактирование дизайна, управление ресурсами и брендом, поиск по библиотеке, экспорт и комментирование) в виде MCP-совместимых инструментов, вы открываете пользователям доступ к возможностям дизайна Canva на естественном языке прямо из привычных инструментов ИИ.",
    "our servers are experiencing high traffic right now, please try again in a minute.": "Наши серверы сейчас испытывают высокую нагрузку, пожалуйста, повторите попытку через минуту.",
    "our servers are experiencing high traffic right now, please try again in a minute": "Наши серверы сейчас испытывают высокую нагрузку, пожалуйста, повторите попытку через минуту",
    "error our servers are experiencing high traffic right now, please try again in a minute.": "Ошибка: Наши серверы сейчас испытывают высокую нагрузку, пожалуйста, повторите попытку через минуту.",
    "error our servers are experiencing high traffic right now, please try again in a minute": "Ошибка: Наши серверы сейчас испытывают высокую нагрузку, пожалуйста, повторите попытку через минуту",
    "see our troubleshooting_guide for more help.": "Подробнее см. в руководстве по устранению неполадок.",
    "see our troubleshooting_guide for more help": "Подробнее см. в руководстве по устранению неполадок",
    "see our troubleshooting guide for more help.": "Подробнее см. в руководстве по устранению неполадок.",
    "see our troubleshooting guide for more help": "Подробнее см. в руководстве по устранению неполадок",
    "troubleshooting_guide": "руководство по устранению неполадок",
    "troubleshooting guide": "руководство по устранению неполадок",
    "see our": "Подробнее см. в",
    "for more help.": ".",
    "for more help": ".",
    "agent execution terminated due to error.": "Выполнение агента прервано из-за ошибки.",
    "agent execution terminated due to error": "Выполнение агента прервано из-за ошибки",
    "error agent execution terminated due to error.": "Ошибка: Выполнение агента прервано из-за ошибки.",
    "error agent execution terminated due to error": "Ошибка: Выполнение агента прервано из-за ошибки",
    "model unavailable": "Модель недоступна",
    "error id:": "ID ошибки:",
    "error id": "ID ошибки",
    "working...": "Выполняется...",
    "working..": "Выполняется...",
    "working.": "Выполняется...",
    "working": "Выполняется",
    "thinking...": "Размышляет...",
    "thinking..": "Размышляет...",
    "thinking.": "Размышляет...",

    // Google Workspace & Build with Google Marketplace Cards & Descriptions
    "google workspace": "Google Workspace",
    "connect to google workspace, including docs, sheets, slides, drive, and calendar.": "Подключение к Google Workspace, включая Документы, Таблицы, Презентации, Диск и Календарь.",
    "connect to google workspace, including docs, sheets, slides, drive, and calendar": "Подключение к Google Workspace, включая Документы, Таблицы, Презентации, Диск и Календарь",
    "google docs": "Google Docs",
    "read, draft, and edit docs.": "Чтение, составление черновиков и редактирование документов.",
    "read, draft, and edit docs": "Чтение, составление черновиков и редактирование документов",
    "google sheets": "Google Sheets",
    "read, write, and format spreadsheets.": "Чтение, запись и форматирование электронных таблиц.",
    "read, write, and format spreadsheets": "Чтение, запись и форматирование электронных таблиц",
    "google slides": "Google Slides",
    "read, edit, and export presentations.": "Чтение, редактирование и экспорт презентаций.",
    "read, edit, and export presentations": "Чтение, редактирование и экспорт презентаций",
    "google drive": "Google Drive",
    "search, upload, download, and share files.": "Поиск, загрузка, скачивание и совместный доступ к файлам.",
    "search, upload, download, and share files": "Поиск, загрузка, скачивание и совместный доступ к файлам",
    "google calendar": "Google Calendar",
    "check availability, schedule events, and rsvp.": "Проверка доступности, планирование событий и ответы на приглашения.",
    "check availability, schedule events, and rsvp": "Проверка доступности, планирование событий и ответы на приглашения",
    "build with google": "Разработка с Google",
    "build on google's developer platforms, including android, chrome, gemini, and google cloud.": "Создание решений на платформах Google для разработчиков, включая Android, Chrome, Gemini и Google Cloud.",
    "build on google's developer platforms, including android, chrome, gemini, and google cloud": "Создание решений на платформах Google для разработчиков, включая Android, Chrome, Gemini и Google Cloud",
    "curated collection of agent skills for science tasks.": "Кураторская коллекция навыков агента для научных задач.",
    "curated collection of agent skills for science tasks": "Кураторская коллекция навыков агента для научных задач",
    "google antigravity sdk": "Google Antigravity SDK",
    "using the google antigravity python sdk to build...": "Использование Google Antigravity Python SDK для создания...",
    "using the google antigravity python sdk to build": "Использование Google Antigravity Python SDK для создания",
    "using the google antigravity python sdk to build ai agents.": "Использование Google Antigravity Python SDK для создания ИИ-агентов.",
    "using the google antigravity python sdk to build ai agents": "Использование Google Antigravity Python SDK для создания ИИ-агентов",
    "google maps platform": "Google Maps Platform",
    "integration skill and tools for google maps platform...": "Навык интеграции и инструменты для Google Maps Platform...",
    "integration skill and tools for google maps platform.": "Навык интеграции и инструменты для Google Maps Platform.",
    "integration skill and tools for google maps platform": "Навык интеграции и инструменты для Google Maps Platform",
    "dart and flutter": "Dart and Flutter",
    "official plugin for dart and flutter that installs flutter...": "Официальный плагин для Dart и Flutter, устанавливающий Flutter...",
    "official plugin for dart and flutter that installs flutter": "Официальный плагин для Dart и Flutter, устанавливающий Flutter",
    "official plugin for dart and flutter that installs flutter sdk and provides tailored instructions for happy path dart and flutter development workflows.": "Официальный плагин для Dart и Flutter, устанавливающий Flutter SDK и предоставляющий инструкции для разработки на Dart и Flutter.",
    "data agent kit": "Data Agent Kit",
    "this plugin provides a specialized suite of skills for...": "Этот плагин предоставляет специализированный набор навыков для инженеров данных в Google Cloud...",
    "integration skill and tools for google maps platfor...": "Навык интеграции и инструменты для Google Maps Platform...",
    "official plugin for dart and flutter that installs flut...": "Официальный плагин для Dart и Flutter, устанавливающий Flutter...",
    "prototype, build & run modern apps that users lov...": "Прототипируйте, создавайте и запускайте современные приложения, которые нравятся пользователям...",
    "google cloud guidance for coding agents: first-pr...": "Руководство по Google Cloud для кодинг-агентов: основные рекомендации...",
    "core tools and knowledge required to develop for...": "Основные инструменты и знания, необходимые для разработки под Android...",
    "this plugin provides a specialized suite of skills for data engineers and database practitioners on google cloud.": "Этот плагин предоставляет специализированный набор навыков для инженеров данных и специалистов по базам данных в Google Cloud.",
    
    // Quota notice & AI Credits
    "to continue using this model now, enable ai credit overages.": "Чтобы продолжить использование этой модели сейчас, включите оплату перерасхода (AI Credit overages).",
    "to continue using this model now, enable ai credit overages": "Чтобы продолжить использование этой модели сейчас, включите оплату перерасхода (AI Credit overages)",
    "enable ai credit overages.": "Включите оплату перерасхода (AI Credit overages).",
    "enable ai credit overages": "Включить оплату перерасхода (AI Credit overages)",
    "ai credit overages": "Оплата перерасхода (AI Credit overages)",

    // New Automation Modal
    "new automation": "Новая автоматизация",
    "name": "Название",
    "enter automation name...": "Введите название автоматизации...",
    "enter automation name": "Введите название автоматизации",
    "all automations run as flash.": "Все автоматизации выполняются на модели Flash.",
    "all automations run as flash": "Все автоматизации выполняются на модели Flash",
    "add automation": "Добавить автоматизацию",

    // Customizations list & accordions
    "skills & rules": "Навыки и правила",
    "skills and rules": "Навыки и правила",
    "custom agents": "Пользовательские агенты",
    "no custom agents yet.": "Пользовательских агентов пока нет.",
    "no custom agents yet": "Пользовательских агентов пока нет",
    "mcp servers": "MCP-серверы",

    // Model picker & project selection & execution steps
    "select project": "Выбрать проект",
    "select project...": "Выбрать проект...",
    "leaving soon": "Скоро будет недоступна",
    "leaving soon ⓘ": "Скоро будет недоступна ⓘ",
    "notice": "Уведомление",
    "notice ⓘ": "Уведомление ⓘ",
    "notice:": "Уведомление:",
    "exploring files, running commands": "Исследование файлов, выполнение команд",
    "verify": "Проверить",
    "start using gemini 3.8 flash, our best flash model.": "Начните использовать Gemini 3.8 Flash, нашу лучшую модель Flash.",
    "start using gemini 3.8 flash, our best flash model": "Начните использовать Gemini 3.8 Flash, нашу лучшую модель Flash",

    // Меню и команды (Command Palette, Tabs, Conversation Menu, Context Menus)
    "close tab": "Закрыть вкладку",
    "reopen closed tab": "Восстановить закрытую вкладку",
    "restore_page reopen closed tab": "Восстановить закрытую вкладку",
    "restore_page": "↺",
    "move conversation up": "Переместить диалог вверх",
    "move conversation down": "Переместить диалог вниз",
    "permission preset": "Профиль разрешений",
    "permission presets": "Профили разрешений",
    "built-in browser": "Встроенный браузер",
    "configure link opening and built-in browser preferences.": "Настройка открытия ссылок и параметров встроенного браузера.",
    "configure link opening and built-in browser preferences": "Настройка открытия ссылок и параметров встроенного браузера",
    "open links in": "Открывать ссылки в",
    "choose where links open by default when clicked.": "Выберите, где по умолчанию открывать ссылки при нажатии.",
    "choose where links open by default when clicked": "Выберите, где по умолчанию открывать ссылки при нажатии",
    "external browser": "Внешний браузер",
    "split conversation horizontally": "Разделить диалог по горизонтали",
    "split conversation vertically": "Разделить диалог по вертикали",
    "open conversation history": "Открыть историю диалогов",
    "commands": "Команды",
    "collapse all folders": "Свернуть все папки",
    "expand all folders": "Развернуть все папки",
    "open keyboard shortcuts": "Открыть сочетания клавиш",
    "download diagnostics": "Скачать диагностику",
    "toggle between light/dark themes": "Переключить светлую/тёмную тему",
    "next aux pane tab": "Следующая вкладка вспомогательной панели",
    "previous aux pane tab": "Предыдущая вкладка вспомогательной панели",
    "new terminal tab": "Новая вкладка терминала",
    "split terminal": "Разделить терминал",
    "unpin this conversation": "Открепить этот диалог",
    "mark this conversation as unread": "Пометить этот диалог как непрочитанный",
    "mark conversation as unread": "Пометить диалог как непрочитанный",
    "unpin conversation": "Открепить диалог",
    "pin this conversation": "Закрепить этот диалог",
    "pin conversation": "Закрепить диалог",
    "rename this conversation": "Переименовать этот диалог",
    "archive this conversation": "Архивировать этот диалог",
    "copy conversation markdown": "Копировать Markdown диалога",
    "find in conversation": "Найти в диалоге",
    "open command palette": "Открыть палитру команд",
    "open project picker": "Открыть выбор проекта",

    // Квоты и овердрафт (Скриншот 1)
    "see plans": "Посмотреть тарифы",
    "enable overages": "Включить перерасход",
    "enable ai credit overages": "Включить оплату перерасхода (AI Credit)",
    "disable overages": "Отключить перерасход",
    "disable": "Отключить",
    "remove": "Удалить",
    "see 6 more": "Показать ещё 6",
    "+ see 6 more": "+ Показать ещё 6",
    "see more": "Показать ещё",
    "+ see more": "+ Показать ещё",

    // Действия агента (Скриншоты 2, 3, 4, 5)
    "explored artifact": "Исследован артефакт",
    "explored artifacts": "Исследованы артефакты",
    "explored artifact, ran commands, edited files": "Исследован артефакт, выполнены команды, изменены файлы",
    "explored artifact, ran commands, edited file": "Исследован артефакт, выполнены команды, изменен файл",
    "explored artifact, ran command, edited file": "Исследован артефакт, выполнена команда, изменен файл",
    "explored artifact, ran command, edited files": "Исследован артефакт, выполнена команда, изменены файлы",
    "explored artifacts, ran commands, edited files": "Исследованы артефакты, выполнены команды, изменены файлы",
    "explored artifacts, ran commands, edited file": "Исследованы артефакты, выполнены команды, изменен файл",
    "explored artifact, ran commands": "Исследован артефакт, выполнены команды",
    "explored artifact, ran command": "Исследован артефакт, выполнена команда",
    "explored artifacts, ran commands": "Исследованы артефакты, выполнены команды",
    "explored artifacts, ran command": "Исследованы артефакты, выполнена команда",
    "explored artifact, edited files": "Исследован артефакт, изменены файлы",
    "explored artifact, edited file": "Исследован артефакт, изменен файл",
    "explored artifacts, edited files": "Исследованы артефакты, изменены файлы",
    "explored artifacts, edited file": "Исследованы артефакты, изменен файл",
    "explored files, ran commands": "Исследованы файлы, выполнены команды",
    "explored files, ran commands, edited file": "Исследованы файлы, выполнены команды, изменен файл",
    "explored files, ran commands, edited files": "Исследованы файлы, выполнены команды, изменены файлы",
    "explored files, edited file": "Исследованы файлы, изменен файл",
    "explored files, edited files": "Исследованы файлы, изменены файлы",
    "explored files": "Исследованы файлы",
    "explored file": "Исследован файл",
    "ran commands": "Выполнены команды",
    "edited": "Изменено",
    "editing": "Изменение",
    "edited file": "Изменен файл",
    "edited files": "Изменены файлы",
    "run real hook acceptance test": "Выполнение приёмочного теста хука",
    "run real hook acceptance test —": "Выполнение приёмочного теста хука —",
    "run real hook acceptance test finished": "Выполнение приёмочного теста хука завершено",
    "acceptance test": "Приёмочный тест",
    "acceptance tests": "Приёмочные тесты",

    // Действия агента и цели проверок (Скриншоты 1-5)
    "exploring file, running command": "Исследование файла, выполнение команды",
    "exploring files, running command": "Исследование файлов, выполнение команды",
    "exploring file, running commands": "Исследование файла, выполнение команд",
    "explored file, ran command": "Исследован файл, выполнена команда",
    "explored files, ran command": "Исследованы файлы, выполнена команда",
    "explored file, ran commands": "Исследован файл, выполнены команды",
    "running command": "Выполнение команды",
    "running commands": "Выполнение команд",
    "ran command": "Выполнена команда",
    "recent commits": "недавние коммиты",
    "consilium commit": "коммит Consilium",
    "git status": "статус git",
    "active contract": "активный контракт",
    "thinking for 2s": "Размышляет 2 сек",
    "commit files": "файлы коммита",
    "upsert function": "функция upsert",
    "staged diff": "staged diff",
    "new modules": "новые модули",
    "resources dir": "каталог resources",
    "untracked module files": "Неотслеживаемые файлы модулей",
    "consilium config audit path": "Путь аудита конфигурации Consilium",
    "schema migration pattern": "Шаблон миграции схемы",
    "contract approval step (a)": "Шаг утверждения контракта (a)",
    "git pickaxe search": "Поиск Git pickaxe",
    "commit stat": "Статистика коммита",
    "staged diff stat": "Статистика staged diff",
    "universal invoker toolchain": "Тулчейн universal invoker",
    "testing shouldignore with mock nodes": "Тестирование shouldIgnore с mock-узлами",
    "listing resources dir": "Список каталога resources",
    "search app.asar": "Поиск в app.asar",
    "search thinking for": "Поиск Thinking for",
    "dispatch_cli help": "Справка dispatch_cli",
    "dispatch_cli config help": "Справка по конфигурации dispatch_cli",
    "upsert_toolchain_model body": "Тело upsert_toolchain_model",
    "validator and config getter": "Валидатор и геттер конфигурации",
    "validator and config getter >": "Валидатор и геттер конфигурации >",
    "cancel task": "Отменить задачу",
    "stop recording": "Остановить запись",
    "start recording": "Начать запись",
    "task log": "Лог задачи",
    "task logs": "Логи задачи",
    "checked task": "Проверена задача",
    "killed task": "Завершена задача",
    "auto (preview)": "Авто (Предпросмотр)",
    "automatically decide if commands run.": "Автоматически решать, запускать ли команды.",
    "automatically decide if commands run": "Автоматически решать, запускать ли команды",
    "enter tool name or server...": "Введите название инструмента или сервера...",
    "enter tool name or server…": "Введите название инструмента или сервера…",
    "enter tool name or server": "Введите название инструмента или сервера",
    "give feedback": "Оставить отзыв",
    "give feedback...": "Оставить отзыв...",
    "extensions": "Расширения",
    "no extensions available": "Нет доступных расширений",
    "no extensions available.": "Нет доступных расширений.",
    "customize sections": "Настроить разделы",
    "goals": "Цели",
    "goal": "Цель",
    "documents": "Документы",
    "document": "Документ",
    "links": "Ссылки",
    "link": "Ссылка",
    "modified files": "Изменённые файлы",
    "search tabs, files, extensions, subagents, artifacts, tasks ...": "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач ...",
    "search tabs, files, extensions, subagents, artifacts, tasks...": "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач...",
    "search tabs, files, extensions, subagents, artifacts, tasks": "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач",
    "поиск tabs, files, extensions, subagents, artifacts, tasks ...": "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач ...",
    "поиск tabs, files, extensions, subagents, artifacts, tasks...": "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач...",
    "поиск tabs, files, extensions, subagents, artifacts, tasks": "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач",
    "open file": "Открыть файл",
    "open files": "Открыть файлы",
    "open folder": "Открыть папку",
    "open folders": "Открыть папки",
    "select folder(s)": "Выбрать папки",
    "select folder": "Выбрать папку",
    "select folders": "Выбрать папки",
    "select file(s)": "Выбрать файлы",
    "select file": "Выбрать файл",
    "select files": "Выбрать файлы",
    "create": "Создать",
    "+ create": "+ Создать",
    "create a plugin with the agent": "Создать плагин с помощью агента",
    "create a skill with the agent": "Создать навык с помощью агента",
    "create a rule with the agent": "Создать правило с помощью агента",
    "create an agent with the agent": "Создать агента с помощью агента",
    "create an automation with the agent": "Создать автоматизацию с помощью агента",
    "5h limit": "5-часовой лимит",
    "5-hour limit": "5-часовой лимит",
    "daily limit": "Дневной лимит",
    "monthly limit": "Месячный лимит",
    "100% left": "Осталось 100%",
    "0% left": "Осталось 0%",
    "workspace": "Рабочая область",
    "workspaces": "Рабочие области",
    "local checkout": "Локальная рабочая копия",
    "new worktree": "Новое рабочее дерево",
    "worktree": "Рабочее дерево",
    "worktrees": "Рабочие деревья",
    "featured": "Рекомендуемое",
    "details": "Подробнее",
    "developer": "Разработчик",
    "website": "Веб-сайт",
    "repository": "Репозиторий",
    "design, creative & media": "Дизайн, креатив и медиа",
    "design, creative, and media tools.": "Инструменты для дизайна, творчества и работы с медиа.",
    "design, creative, and media tools": "Инструменты для дизайна, творчества и работы с медиа",
    "productivity & project management": "Продуктивность и управление проектами",
    "plan work, track issues, sign documents, and manage your notes and files.": "Планируйте работу, отслеживайте задачи, подписывайте документы и управляйте заметками и файлами.",
    "plan work, track issues, sign documents, and manage your notes and files": "Планируйте работу, отслеживайте задачи, подписывайте документы и управляйте заметками и файлами",
    "cloud hosting & deployment": "Облачный хостинг и развёртывание",
    "deploy and host your apps, sites, and their backends.": "Развёртывайте и размещайте свои приложения, сайты и их бэкенды.",
    "deploy and host your apps, sites, and their backends": "Развёртывайте и размещайте свои приложения, сайты и их бэкенды",
    "developer tools": "Инструменты разработчика",
    "apis, services, and tools to build, test, secure, and run your apps.": "API, сервисы и инструменты для сборки, тестирования, защиты и запуска ваших приложений.",
    "apis, services, and tools to build, test, secure, and run your apps": "API, сервисы и инструменты для сборки, тестирования, защиты и запуска ваших приложений",
    "business": "Бизнес",
    "payments, crm, accounting, data, identity, customer support, marketing, and workflow automation.": "Платежи, CRM, бухгалтерия, данные, идентификация, поддержка клиентов, маркетинг и автоматизация процессов.",
    "payments, crm, accounting, data, identity, customer support, marketing, and workflow automation": "Платежи, CRM, бухгалтерия, данные, идентификация, поддержка клиентов, маркетинг и автоматизация процессов",
    "google does not control the availability or functionality of third party developer tools. your data from third party developer tools connected to your antigravity instance may be shared with google. google will protect any such data in accordance with the google privacy policy, found here:": "Google не контролирует доступность или функциональность сторонних инструментов для разработчиков. Ваши данные из сторонних инструментов, подключенных к вашему экземпляру Antigravity, могут передаваться в Google. Google защищает такие данные в соответствии с Политикой конфиденциальности Google, доступной по ссылке:",
    "google does not control the availability or functionality of third party developer tools. your data from third party developer tools connected to your antigravity instance may be shared with google. google will protect any such data in accordance with the google privacy policy, found here": "Google не контролирует доступность или функциональность сторонних инструментов для разработчиков. Ваши данные из сторонних инструментов, подключенных к вашему экземпляру Antigravity, могут передаваться в Google. Google защищает такие данные в соответствии с Политикой конфиденциальности Google, доступной по ссылке",
    "what's included": "Что включено",
    "whats included": "Что включено",
    "mcp server": "MCP-сервер",
    "prerequisites": "Предварительные требования",
    "example prompts": "Примеры запросов",
    "resources": "Ресурсы",
    "api key": "API-ключ",
    "api key:": "API-ключ:",
    "sdk installation": "Установка SDK",
    "sdk installation:": "Установка SDK:",
    ": provides": ": Предоставляет",
    "): provides": "): Предоставляет",
    "provides": "Предоставляет",
    "so your agent can search and read official gemini api documentation directly without manual url fetching.": "чтобы ваш агент мог искать и читать официальную документацию Gemini API напрямую без ручной загрузки URL.",
    "so your agent can search and read official gemini api documentation directly without manual url fetching": "чтобы ваш агент мог искать и читать официальную документацию Gemini API напрямую без ручной загрузки URL",
    ": set the": ": Установите для переменной окружения",
    "set the": "Установите для переменной окружения",
    "environment variable with a key from": "значение ключа из",
    "equip your agent with current sdk patterns, model identifiers, and live documentation lookup for building applications with the": "Оснастите вашего агента актуальными шаблонами SDK, идентификаторами моделей и поиском по живой документации для создания приложений с",
    "equip your agent with current sdk patterns, model identifiers, and live documentation lookup for building applications with the gemini api.": "Оснастите вашего агента актуальными шаблонами SDK, идентификаторами моделей и поиском по живой документации для создания приложений с Gemini API.",
    "equip your agent with current sdk patterns, model identifiers, and live documentation lookup for building applications with the gemini api": "Оснастите вашего агента актуальными шаблонами SDK, идентификаторами моделей и поиском по живой документации для создания приложений с Gemini API",
    "gemini api documentation in google ai studio": "Документация Gemini API в Google AI Studio",
    "interactions api guide": "Руководство по Interactions API",
    "github repository (": "Репозиторий GitHub (",
    "github repository": "Репозиторий GitHub",
    "build applications with the gemini interactions api and live api, including text, image, video, and speech generation, managed agents, and real-time multimodal streaming.": "Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, изображений, видео и речи, управляемых агентов и мультимодальный стриминг в реальном времени.",
    "build applications with the gemini interactions api and live api, including text, image, video, and speech generation, managed agents, and real-time multimodal streaming .": "Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, изображений, видео и речи, управляемых агентов и мультимодальный стриминг в реальном времени.",
    "build applications with the gemini interactions api and live api, including text, image, video, and speech generation, managed agents, and real-time multimodal streaming": "Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, изображений, видео и речи, управляемых агентов и мультимодальный стриминг в реальном времени",
    "сборка applications with the gemini interactions api and live api, including text, image, video, and speech generation, managed agents, and real-time multimodal streaming .": "Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, изображений, видео и речи, управляемых агентов и мультимодальный стриминг в реальном времени.",
    "сборка applications with the gemini interactions api and live api, including text, image, video, and speech generation, managed agents, and real-time multimodal streaming.": "Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, изображений, видео и речи, управляемых агентов и мультимодальный стриминг в реальном времени.",
    "build a stateful multi-turn chat script using the interactions api and the latest models": "Создать скрипт многошагового чата с сохранением состояния с помощью Interactions API и новейших моделей",
    "build a stateful multi-turn chat script using the interactions api and the latest models.": "Создать скрипт многошагового чата с сохранением состояния с помощью Interactions API и новейших моделей.",
    '"build a stateful multi-turn chat script using the interactions api and the latest models."': "«Создать скрипт многошагового чата с сохранением состояния с помощью Interactions API и новейших моделей.»",
    "сборка a stateful multi-turn chat script using the interactions api and the latest models": "Создать скрипт многошагового чата с сохранением состояния с помощью Interactions API и новейших моделей",
    "create a real-time voice agent using the gemini live api and non-blocking function calling": "Создать голосового агента реального времени с использованием Gemini Live API и неблокирующего вызова функций",
    "create a real-time voice agent using the gemini live api and non-blocking function calling.": "Создать голосового агента реального времени с использованием Gemini Live API и неблокирующего вызова функций.",
    '"create a real-time voice agent using the gemini live api and non-blocking function calling."': "«Создать голосового агента реального времени с использованием Gemini Live API и неблокирующего вызова функций.»",
    "migrate my project from client.models.generate_content to the interactions api": "Мигрировать мой проект с client.models.generate_content на Interactions API",
    "migrate my project from client.models.generate_content to the interactions api.": "Мигрировать мой проект с client.models.generate_content на Interactions API.",
    '"generate multi-speaker dialogue audio using the latest gemini tts models and': "«Сгенерировать аудио диалога с несколькими спикерами с помощью новейших моделей Gemini TTS и аннотаций",
    "generate multi-speaker dialogue audio using the latest gemini tts models and": "Сгенерировать аудио диалога с несколькими спикерами с помощью новейших моделей Gemini TTS и аннотаций",
    'annotations."': "».",
    "annotations.": ".",
    '"migrate': "«Мигрировать",
    "migrate": "Мигрировать",
    '."': "».",
    "investigate production issues with real dynatrace data: problems and root causes, logs, metrics, traces, and vulnerabilities, via skills and the mcp server.": "Исследуйте проблемы в продакшене на реальных данных Dynatrace: сбои и первопричины, логи, метрики, трейсы и уязвимости с помощью навыков и MCP-сервера.",
    "investigate production issues with real dynatrace data: problems and root causes, logs, metrics, traces, and vulnerabilities, via skills and the mcp server": "Исследуйте проблемы в продакшене на реальных данных Dynatrace: сбои и первопричины, логи, метрики, трейсы и уязвимости с помощью навыков и MCP-сервера",
    "accept payments and grow your business. stripe's official mcp server enables ai agents to manage customers, products, prices, payment links, invoices,...": "Принимайте платежи и развивайте свой бизнес. Официальный MCP-сервер Stripe позволяет ИИ-агентам управлять клиентами, продуктами, ценами, платежными ссылками, счетами и...",
    "accept payments and grow your business. stripe's official mcp server enables ai agents to manage customers, products, prices, payment links, invoices, subscriptions, and refunds, as well as search stripe documentation.": "Принимайте платежи и развивайте свой бизнес. Официальный MCP-сервер Stripe позволяет ИИ-агентам управлять клиентами, продуктами, ценами, платежными ссылками, счетами, подписками и возвратами, а также искать в документации Stripe.",
    "connect antigravity to your notion workspace with the notion mcp server, plus skills for research, documentation, meeting prep, specs, trackers, and...": "Подключите Antigravity к вашему рабочему пространству Notion с помощью MCP-сервера Notion, а также навыков для исследований, документации, подготовки к встречам, спецификаций, трекеров и...",
    "connect antigravity to your notion workspace with the notion mcp server, plus skills for research, documentation, meeting prep, specs, trackers, and project updates.": "Подключите Antigravity к вашему рабочему пространству Notion с помощью MCP-сервера Notion, а также навыков для исследований, документации, подготовки к встречам, спецификаций, трекеров и обновлений проектов.",
    "connect antigravity to your notion workspace with the notion mcp server, plus skills for research, documentation, meeting prep, specs, trackers, and project updates": "Подключите Antigravity к вашему рабочему пространству Notion с помощью MCP-сервера Notion, а также навыков для исследований, документации, подготовки к встречам, спецификаций, трекеров и обновлений проектов",
    "the product development system for teams and agents. manage issues, projects, and documents across your linear workspace from antigravity.": "Система разработки продуктов для команд и агентов. Управляйте задачами, проектами и документами в вашем рабочем пространстве Linear прямо из Antigravity.",
    "the product development system for teams and agents. manage issues, projects, and documents across your linear workspace from antigravity": "Система разработки продуктов для команд и агентов. Управляйте задачами, проектами и документами в вашем рабочем пространстве Linear прямо из Antigravity",
    "the product development system for teams and agents.": "Система разработки продуктов для команд и агентов.",
    "turn figma designs into production code, map components with code connect, and create or edit figma files in antigravity.": "Превращайте макеты Figma в готовый код, связывайте компоненты через Code Connect и создавайте или редактируйте файлы Figma в Antigravity.",
    "create, edit, review, resize, and brand-check canva designs with the canva mcp server.": "Создавайте, редактируйте, проверяйте, меняйте размер и контролируйте соответствие бренду дизайнов Canva с помощью MCP-сервера Canva.",
    "connect antigravity to dropbox to search, inspect, summarize, share, collect uploads, organize folders, and clean up files with confirmation for write actions.": "Подключите Antigravity к Dropbox для поиска, просмотра, суммаризации, обмена, сбора загрузок, организации папок и очистки файлов с подтверждением операций записи.",
    "build and deploy on netlify: functions, edge functions, blobs, database, identity, forms, image cdn, caching, and ai gateway, plus the netlify mcp server.": "Собирайте и развертывайте на Netlify: функции, edge-функции, хранилища, базы данных, авторизацию, формы, CDN изображений, кэширование и AI Gateway вместе с MCP-сервером Netlify.",
    "deploy, configure, monitor, and troubleshoot apps, databases, and infrastructure on railway from antigravity with railway's agent skill and hosted mcp server.": "Развертывайте, настраивайте, отслеживайте и отлаживайте приложения, базы данных и инфраструктуру в Railway из Antigravity с помощью навыка агента и MCP-сервера Railway.",
    "build and deploy web apps and ai agents on vercel with skills for next.js, ai sdk, and cloud services, plus the official vercel mcp server.": "Создавайте и развертывайте веб-приложения и ИИ-агентов на Vercel с навыками для Next.js, AI SDK и облачных сервисов, а также официальным MCP-сервером Vercel.",
    "add auth0 authentication to any app: login, mfa, sso, organizations, rbac, custom domains, and branding. debug auth errors and migrate from other providers.": "Добавляйте аутентификацию Auth0 в любое приложение: вход, MFA, SSO, организации, RBAC, кастомные домены и брендинг. Отлаживайте ошибки авторизации и мигрируйте от других провайдеров.",
    "databricks skills for the cli, apps, lakebase, model serving, lakeflow jobs, spark declarative pipelines, declarative automation bundles (dabs), and classic-to-serverless migration.": "Навыки Databricks для CLI, приложений, Lakebase, обслуживания моделей, задач Lakeflow, декларативных пайплайнов Spark, пакетов автоматизации (DAB) и миграции на serverless.",
    "give your agent a real browser: navigate, click, type, screenshot, and extract data from any site, locally or on browserbase cloud browsers.": "Дайте вашему агенту полноценный браузер: переходите по страницам, нажимайте, вводите текст, делайте скриншоты и извлекайте данные с любых сайтов локально или в облаке Browserbase.",
    // v2.1.10 — Canva, Figma, Mobbin, Atlassian Teamwork Graph CLI, Dropbox, Linear
    "resize this canva design for instagram and linkedin": "Изменить размер этого дизайна Canva для Instagram и LinkedIn",
    "review this canva design and suggest improvements": "Проверить этот дизайн Canva и предложить улучшения",
    "check this canva design against my brand kit": "Проверить этот дизайн Canva на соответствие моему бренд-киту",
    "проверка this canva design against my brand kit": "Проверить этот дизайн Canva на соответствие моему бренд-киту",
    "implement this figma frame as a react component: <link>": "Реализовать этот фрейм Figma как React-компонент: <ссылка>",
    "connect my button component to its figma component with code connect": "Связать мой компонент Button с компонентом Figma через Code Connect",
    "create a figma design for a login screen that matches my design system": "Создать дизайн экрана входа в Figma в соответствии с моей дизайн-системой",
    "give your ai agent 600,000+ real app screens, and the skills to use them. includes the mobbin mcp and a skill that redesigns your screen from patterns real apps ship, in your own design system, with the references behind every change.": "Предоставьте вашему ИИ-агенту более 600 000 экранов реальных приложений и навыки работы с ними. Включает Mobbin MCP и навык редизайна экранов на основе проверенных паттернов реальных приложений в вашей дизайн-системе с референсами для каждого изменения.",
    "find home screen examples from banking apps and save them to a collection": "Найти примеры главных экранов банковских приложений и сохранить их в коллекцию",
    "compare how ai tools design their pricing sections": "Сравнить, как ИИ-сервисы оформляют разделы с тарифами",
    "review my paywall screen against the ones i saved in collections": "Проверить мой экран пейволла в сравнении с сохранёнными в коллекциях",
    'teamwork graph cli is atlassian\'s agent-first interface to your entire work context: jira issues, confluence pages, bitbucket prs, along with your connected third-party data sources. purpose-built for coding agents like antigravity (terminal or desktop), and powered by atlassian\'s context graph. try: "draft a jira issue from this pr and link it to the epic." run /twg-setup after install to connect atlassian teamwork graph cli to antigravity.': 'Teamwork Graph CLI — это интерфейс Atlassian для ИИ-агентов ко всему вашему рабочему контексту: задачам Jira, страницам Confluence, пул-реквестам Bitbucket и подключённым сторонним источникам данных. Создан специально для кодинг-агентов вроде Antigravity (в терминале или на десктопе) на базе графа контекста Atlassian. Попробуйте: «составь задачу в Jira из этого PR и привяжи её к эпику». Запустите /twg-setup после установки, чтобы подключить Atlassian Teamwork Graph CLI к Antigravity.',
    "help me implement [jira-123]. retrieve the requirements, acceptance criteria, and linked design decisions. inspect this repository and propose an implementation plan before changing code.": "Помоги мне реализовать [JIRA-123]. Получи требования, критерии приёмки и связанные архитектурные решения. Изучи этот репозиторий и предложи план реализации перед изменением кода.",
    "investigate [jira-123] in this repository. find related bugs, previous fixes, and relevant technical decisions. recommend a fix and the tests needed to verify it.": "Исследуй [JIRA-123] в этом репозитории. Найди связанные баги, предыдущие исправления и релевантные технические решения. Предложи исправление и тесты для его проверки.",
    "review my current changes against [jira-123] and its linked specification. flag missed requirements, conflicting decisions, and missing tests.": "Проверь мои текущие изменения на соответствие [JIRA-123] и связанной спецификации. Отметь пропущенные требования, противоречивые решения и недостающие тесты.",
    "find and summarize the q4 planning deck in dropbox": "Найти и сделать сводку презентации планирования на 4-й квартал в Dropbox",
    "create a shared link for the launch folder": "Создать общую ссылку для папки Launch",
    "review duplicate exports in this folder and ask before deleting anything": "Проверить дубликаты экспортов в этой папке и спросить перед удалением",
    "dropbox for google antigravity": "Dropbox для Google Antigravity",
    "find, summarize, share, collect uploads, and organize your dropbox files in antigravity. antigravity asks before making changes to your files.": "Находите, делайте сводки, делитесь, собирайте загрузки и упорядочивайте файлы Dropbox в Antigravity. Antigravity запрашивает подтверждение перед внесением изменений в ваши файлы.",
    "show my assigned linear issues, grouped by priority.": "Покажи назначенные мне задачи в Linear, сгруппированные по приоритету.",
    "show my assigned linear issues, grouped by priority": "Покажи назначенные мне задачи в Linear, сгруппированные по приоритету",
    "summarize recent updates to my linear projects.": "Сделай сводку последних обновлений по моим проектам в Linear.",
    "summarize recent updates to my linear projects": "Сделай сводку последних обновлений по моим проектам в Linear",
    "find linear issues related to the code i am working on.": "Найди задачи в Linear, связанные с кодом, над которым я работаю.",
    "find linear issues related to the code i am working on": "Найди задачи в Linear, связанные с кодом, над которым я работаю",
    "create a linear issue for the bug we just found.": "Создай задачу в Linear для только что найденного бага.",
    "create a linear issue for the bug we just found": "Создай задачу в Linear для только что найденного бага",
    "add a progress update to the issue i am working on.": "Добавь обновление статуса в задачу, над которой я работаю.",
    "add a progress update to the issue i am working on": "Добавь обновление статуса в задачу, над которой я работаю",
    "linear for antigravity": "Linear для Antigravity",
    "bring your linear workspace into antigravity": "Подключите рабочее пространство Linear к Antigravity",
    "find issues, manage projects, and keep your work up to date. connect your code to the work happening in linear.": "Находите задачи, управляйте проектами и поддерживайте актуальность работы. Свяжите свой код с задачами в Linear.",
    "find issues, manage projects, and keep your work up to date.": "Находите задачи, управляйте проектами и поддерживайте актуальность работы.",
    "connect your code to the work happening in linear.": "Свяжите свой код с задачами в Linear.",
    "the linear plugin connects antigravity to your linear workspace. find issues, read project updates, and create or update issues and documents without leaving your development workflow.": "Плагин Linear подключает Antigravity к вашему рабочему пространству Linear. Находите задачи, читайте обновления проектов, создавайте или обновляйте задачи и документы, не покидая процесс разработки.",
    "the plugin uses": "Плагин использует",
    "linear's hosted mcp server": "облачный MCP-сервер Linear",
    "linear’s hosted mcp server": "облачный MCP-сервер Linear",
    ". sign in with your linear account to get started. no api key or local server is required.": ". Войдите в аккаунт Linear, чтобы начать работу. API-ключ или локальный сервер не требуются.",
    "sign in with your linear account to get started. no api key or local server is required.": "Войдите в аккаунт Linear, чтобы начать работу. API-ключ или локальный сервер не требуются.",
    "1. install from the marketplace": "1. Установка из Маркетплейса",
    "in antigravity, find": "в Antigravity, найдите",
    "in the marketplace, and click": "в Маркетплейсе и нажмите",
    "2. connect your linear account": "2. Подключение аккаунта Linear",
    "installing the plugin is the first step. connect your account before using linear tools.": "Установка плагина — это первый шаг. Подключите свой аккаунт перед использованием инструментов Linear.",
    ", on macos).": " на macOS).",
    "on macos).": "на macOS).",
    "2. click": "2. Нажмите",
    "click": "Нажмите",
    "install": "Установить",
    "customizations → plugins": "Персонализация → Плагины",
    "agent settings → customizations": "Настройки агента → Персонализация",
    "next to the plugin's linear mcp server.": "рядом с MCP-сервером Linear этого плагина.",
    "next to the plugin’s linear mcp server.": "рядом с MCP-сервером Linear этого плагина.",
    "3. sign in to linear in your browser and authorize your workspace.": "3. Войдите в Linear в браузере и авторизуйте рабочее пространство.",
    "sign in to linear in your browser and authorize your workspace.": "Войдите в Linear в браузере и авторизуйте рабочее пространство.",
    "4. copy the authorization code shown after approval.": "4. Скопируйте код авторизации, отобразившийся после подтверждения.",
    "copy the authorization code shown after approval.": "Скопируйте код авторизации, отобразившийся после подтверждения.",
    "5. return to antigravity, paste the code into the authentication field in settings, and click": "5. Вернитесь в Antigravity, вставьте код в поле аутентификации в настройках и нажмите",
    "return to antigravity, paste the code into the authentication field in settings, and click": "Вернитесь в Antigravity, вставьте код в поле аутентификации в настройках и нажмите",
    "paste the code into settings, not agent chat. antigravity reconnects the server after authentication and refreshes expired access tokens automatically.": "Вставляйте код в настройки, а не в чат агента. Antigravity автоматически переподключает сервер после аутентификации и обновляет истёкшие токены доступа.",
    "3. try it out": "3. Попробуйте в деле",
    "ask antigravity:": "Спросите Antigravity:",
    "once antigravity retrieves your issues from linear, you're connected. you can also try:": "Как только Antigravity получит ваши задачи из Linear, подключение готово. Вы также можете попробовать:",
    "once antigravity retrieves your issues from linear, you’re connected. you can also try:": "Как только Antigravity получит ваши задачи из Linear, подключение готово. Вы также можете попробовать:",
    "troubleshooting": "Устранение неполадок",
    "installed, but linear tools are unavailable": "Плагин установлен, но инструменты Linear недоступны",
    "check that the plugin is enabled, then open": "Убедитесь, что плагин включён, затем откройте",
    "проверка that the plugin is enabled, then open": "Убедитесь, что плагин включён, затем откройте",
    "and authenticate its linear mcp server. installation does not sign you in automatically.": "и авторизуйте его MCP-сервер Linear. Установка не выполняет вход автоматически.",
    "browser sign-in finished, but antigravity is still waiting": "Вход в браузере завершён, но Antigravity всё ещё ожидает",
    "copy the authorization code from the browser, return to the authentication field in antigravity settings, and click": "Скопируйте код авторизации из браузера, вернитесь к полю аутентификации в настройках Antigravity и нажмите",
    "this manual handoff is part of": "Эта ручная передача кода является частью",
    "antigravity's oauth flow": "процесса OAuth в Antigravity",
    "antigravity’s oauth flow": "процесса OAuth в Antigravity",
    "the connection stopped working": "Соединение перестало работать",
    "refresh or reconnect the linear mcp server in antigravity. complete authentication again if prompted. for workspace access and authentication help, see the": "Обновите или переподключите MCP-сервер Linear в Antigravity. При появлении запроса повторите аутентификацию. Справку по доступу к рабочему пространству и аутентификации см. в",
    "linear mcp documentation": "документации Linear MCP",
    "development": "Разработка",
    "for local installation, package details, and release validation, see": "Инструкции по локальной установке, сведения о пакете и проверке релизов см. в",
    "fix quote escaping in localization_injected.js, validate, build and deploy app.asar": "Исправление экранирования кавычек в localization_injected.js, проверка, сборка и деплой app.asar",
    // v2.1.12 — monday.com, Notion, PandaDoc, Trello
    "plan and track work in monday.com from antigravity: create, update and assign items, write docs, and build forms that turn requests into items.": "Планируйте и отслеживайте работу в monday.com из Antigravity: создавайте, обновляйте и назначайте элементы, пишите документацию и создавайте формы, превращающие заявки в задачи.",
    "plan and track work in monday.com from antigravity: create, update and assign items, write docs, and build forms that turn requests into items": "Планируйте и отслеживайте работу в monday.com из Antigravity: создавайте, обновляйте и назначайте элементы, пишите документацию и создавайте формы, превращающие заявки в задачи",
    "onboard me to monday.com": "Помоги мне начать работу с monday.com",
    "onboard me to monday.com.": "Помоги мне начать работу с monday.com.",
    "create a monday.com item for each todo in this file and assign them to me": "Создать элемент monday.com для каждого TODO в этом файле и назначить их мне",
    "create a monday.com item for each todo in this file and assign them to me.": "Создать элемент monday.com для каждого TODO в этом файле и назначить их мне.",
    "create a monday.com bug report form with summary, steps to reproduce and severity questions": "Создать форму отчёта об ошибке в monday.com с полями описания, шагов воспроизведения и серьёзности",
    "create a monday.com bug report form with summary, steps to reproduce and severity questions.": "Создать форму отчёта об ошибке в monday.com с полями описания, шагов воспроизведения и серьёзности.",
    "bring monday.com into antigravity. create, update and assign items, write docs and set up forms without leaving your editor.": "Подключите monday.com к Antigravity. Создавайте, обновляйте и назначайте элементы, пишите документы и настраивайте формы, не покидая редактор.",
    "what you get": "Что вы получаете",
    "monday.com mcp server": "MCP-сервер monday.com",
    "- the official monday.com mcp server (": "— официальный MCP-сервер monday.com (",
    "the official monday.com mcp server (": "— официальный MCP-сервер monday.com (",
    "), with tools for boards, items, columns, docs, forms, dashboards, workspaces and more.": "), с инструментами для досок, элементов, столбцов, документов, форм, дашбордов, рабочих пространств и многого другого.",
    "- first-run setup: builds a board tailored to your work, with starter items and an automation.": "— первичная настройка: создаёт доску под ваши задачи со стартовыми элементами и автоматизацией.",
    "first-run setup: builds a board tailored to your work, with starter items and an automation.": "— первичная настройка: создаёт доску под ваши задачи со стартовыми элементами и автоматизацией.",
    "- create, update, assign and move items, with correct column-value formats.": "— создание, обновление, назначение и перемещение элементов с правильными форматами значений столбцов.",
    "create, update, assign and move items, with correct column-value formats.": "— создание, обновление, назначение и перемещение элементов с правильными форматами значений столбцов.",
    "- create, read, edit and comment on monday docs, including live column embeds and mentions.": "— создание, чтение, редактирование и комментирование документов monday, включая встраивание столбцов и упоминания.",
    "create, read, edit and comment on monday docs, including live column embeds and mentions.": "— создание, чтение, редактирование и комментирование документов monday, включая встраивание столбцов и упоминания.",
    "- create, edit and publish monday workforms.": "— создание, редактирование и публикация форм monday WorkForms.",
    "create, edit and publish monday workforms.": "— создание, редактирование и публикация форм monday WorkForms.",
    "getting started": "Начало работы",
    "1. install the plugin from": "1. Установите плагин через",
    "install the plugin from": "Установите плагин через",
    "in antigravity, or from the terminal:": "в Antigravity или из терминала:",
    "2. on first use, sign in to monday.com in the browser window that opens and approve access.": "2. При первом использовании войдите в monday.com в открывшемся окне браузера и подтвердите доступ.",
    "on first use, sign in to monday.com in the browser window that opens and approve access.": "При первом использовании войдите в monday.com в открывшемся окне браузера и подтвердите доступ.",
    "3. try a starter prompt, or ask something like \"mark the 'login bug' item on my sprint board as done\"": "3. Попробуйте стартовый запрос или напишите, например: «Отметь задачу 'Login bug' на моей доске Спринт как выполненную»",
    "try a starter prompt, or ask something like \"mark the 'login bug' item on my sprint board as done\"": "Попробуйте стартовый запрос или напишите, например: «Отметь задачу 'Login bug' на моей доске Спринт как выполненную»",
    "try a starter prompt, or ask something like \"mark the 'login bug' item on my sprint board as done\".": "Попробуйте стартовый запрос или напишите, например: «Отметь задачу 'Login bug' на моей доске Спринт как выполненную».",
    "you only get access to what your monday.com user can already see. account admins can manage ai connector access in": "Вы получаете доступ только к тому, что уже доступно вашему пользователю monday.com. Администраторы аккаунта могут управлять доступом ИИ-коннектора в разделе",
    "administration → ai governance → ai permissions": "Администрирование → Управление ИИ → Разрешения ИИ",
    "support": "Поддержка",
    "help:": "Справка:",
    "contact:": "Контакт:",
    "set up notion so you can use my workspace as context": "Настроить Notion, чтобы использовать моё рабочее пространство как контекст",
    "set up notion so you can use my workspace as context.": "Настроить Notion, чтобы использовать моё рабочее пространство как контекст.",
    "turn this spec in notion into an implementation plan with tasks": "Превратить эту спецификацию в Notion в план реализации с задачами",
    "turn this spec in notion into an implementation plan with tasks.": "Превратить эту спецификацию в Notion в план реализации с задачами.",
    "write a weekly update for my project from what changed in notion": "Написать еженедельный отчёт по моему проекту на основе изменений в Notion",
    "write a weekly update for my project from what changed in notion.": "Написать еженедельный отчёт по моему проекту на основе изменений в Notion.",
    "notion plugin for antigravity": "Плагин Notion для Antigravity",
    "connects": "Подключает",
    "to the": "к",
    "notion mcp server": "MCP-серверу Notion",
    "and adds the": "и добавляет",
    "mcp client skills": "навыки клиента MCP",
    "the first notion tool call opens a browser window to authorize your workspace.": "При первом вызове инструмента Notion откроется окно браузера для авторизации вашего рабочего пространства.",
    "purpose": "Назначение",
    "antigravity manifest": "Манифест Antigravity",
    "notion mcp server at": "MCP-сервер Notion по адресу",
    "plugin icon": "Иконка плагина",
    "generated from": "Сгенерировано из",
    ". do not edit.": ". Не редактировать.",
    "do not edit.": "Не редактировать.",
    "maintain": "Обслуживание",
    "edit skills in": "Редактируйте навыки в",
    ", then run": ", затем запустите",
    "from the repository root and commit the result. ci runs": "из корня репозитория и зафиксируйте результат. CI запускает",
    "and fails when": "и завершается с ошибкой, если папка",
    "is out of date.": "устарела.",
    "check the plugin the way antigravity loads it:": "Проверьте плагин так, как его загружает Antigravity:",
    "проверка the plugin the way antigravity loads it:": "Проверьте плагин так, как его загружает Antigravity:",
    "проверка the plugin the way antigravity loads it :": "Проверьте плагин так, как его загружает Antigravity:",
    "check the plugin the way antigravity loads it :": "Проверьте плагин так, как его загружает Antigravity:",
    "create and send proposals, quotes, and contracts for e-signature. track signing progress and identify documents that need follow-up.": "Создавайте и отправляйте коммерческие предложения, сметы и договоры на электронную подпись. Отслеживайте статус подписания и находите документы, требующие напоминания.",
    "create and send proposals, quotes, and contracts for e-signature. track signing progress and identify documents that need follow-up": "Создавайте и отправляйте коммерческие предложения, сметы и договоры на электронную подпись. Отслеживайте статус подписания и находите документы, требующие напоминания",
    "list my 5 most recently modified pandadoc documents with their status.": "Показать 5 моих недавно изменённых документов PandaDoc с их статусами.",
    "list my 5 most recently modified pandadoc documents with their status": "Показать 5 моих недавно изменённых документов PandaDoc с их статусами",
    "список my 5 most recently modified pandadoc documents with their status .": "Показать 5 моих недавно изменённых документов PandaDoc с их статусами.",
    "список my 5 most recently modified pandadoc documents with their status.": "Показать 5 моих недавно изменённых документов PandaDoc с их статусами.",
    "список my 5 most recently modified pandadoc documents with their status": "Показать 5 моих недавно изменённых документов PandaDoc с их статусами",
    "show my signing pipeline and identify documents that are stuck.": "Показать мою воронку подписания и выявить зависшие документы.",
    "show my signing pipeline and identify documents that are stuck": "Показать мою воронку подписания и выявить зависшие документы",
    "find unsigned documents and draft follow-up messages without sending them.": "Найти неподписанные документы и подготовить черновики напоминаний без отправки.",
    "find unsigned documents and draft follow-up messages without sending them": "Найти неподписанные документы и подготовить черновики напоминаний без отправки",
    "official trello plugin with the trello mcp server and a skill for boards, lists, cards, checklists, inbox, and planner.": "Официальный плагин Trello с MCP-сервером Trello и навыком для работы с досками, списками, карточками, чек-листами, Входящими и Планировщиком.",
    "official trello plugin with the trello mcp server and a skill for boards, lists, cards, checklists, inbox, and planner": "Официальный плагин Trello с MCP-сервером Trello и навыком для работы с досками, списками, карточками, чек-листами, Входящими и Планировщиком",
    "summarize the cards that are due this week across my trello boards.": "Сделать сводку карточек со сроком выполнения на этой неделе по всем моим доскам Trello.",
    "summarize the cards that are due this week across my trello boards": "Сделать сводку карточек со сроком выполнения на этой неделе по всем моим доскам Trello",
    "create a trello card on my board for each todo in this file.": "Создать карточку Trello на моей доске для каждого TODO в этом файле.",
    "create a trello card on my board for each todo in this file": "Создать карточку Trello на моей доске для каждого TODO в этом файле",
    "show what is in my trello inbox and suggest a board and list for each card.": "Показать содержимое моих Входящих в Trello и предложить доску и список для каждой карточки.",
    "show what is in my trello inbox and suggest a board and list for each card": "Показать содержимое моих Входящих в Trello и предложить доску и список для каждой карточки",
    // v2.1.14 — Background Commands & timers, Diff Viewer & Git panel, Timeline turns & image attachments
    "background commands": "Фоновые команды",
    "background command": "Фоновая команда",
    "view split diff": "Раздельный режим сравнения",
    "просмотр split diff": "Раздельный режим сравнения",
    "split diff": "Раздельный режим сравнения",
    "view inline diff": "Встроенный режим сравнения",
    "просмотр inline diff": "Встроенный режим сравнения",
    "inline diff": "Встроенный режим сравнения",
    "view unified diff": "Встроенный режим сравнения",
    "просмотр unified diff": "Встроенный режим сравнения",
    "hide whitespace changes": "Скрыть изменения пробелов",
    "show whitespace changes": "Показать изменения пробелов",
    "staged changes": "Подготовленные изменения",
    "unstaged changes": "Неподготовленные изменения",
    "merge changes": "Изменения слияния",
    "untracked files": "Неотслеживаемые файлы",
    "untracked changes": "Неотслеживаемые изменения",
    "no file changes": "Нет изменений в файлах",
    "no file changes.": "Нет изменений в файлах.",
    "no staged changes": "Нет подготовленных изменений",
    "no staged changes.": "Нет подготовленных изменений.",
    "no changes": "Нет изменений",
    "no changes.": "Нет изменений.",
    "changes": "Изменения",
    "commit": "Зафиксировать",
    "commit...": "Зафиксировать...",
    "amend": "Дополнить коммит (Amend)",
    "commit amend": "Дополнить коммит (Amend)",
    "push": "Отправить (Push)",
    "pull": "Получить (Pull)",
    "fetch": "Загрузить (Fetch)",
    "sync": "Синхронизировать",
    "sync changes": "Синхронизировать изменения",
    "commit & push": "Зафиксировать и отправить",
    "commit and push": "Зафиксировать и отправить",
    "commit & sync": "Зафиксировать и синхронизировать",
    "search": "Поиск",
    "1 turn": "1 шаг",
    "cancel (ctrl+d)": "Отмена (Ctrl+D)",
    "sends after agent finishes working": "Отправится после завершения работы агента",
    "send after agent finishes working": "Отправится после завершения работы агента",
    "queue message enter": "Поставить сообщение в очередь Enter",
    "queue message": "Поставить сообщение в очередь",
    "send immediately": "Отправить немедленно",
    "send immediately alt+enter": "Отправить немедленно Alt+Enter",
    "send now": "Отправить сейчас",
    "summarize this design doc and list the open questions": "Сделать сводку этого дизайн-документа и выписать открытые вопросы",
    "summarize this design doc and list the open questions.": "Сделать сводку этого дизайн-документа и выписать открытые вопросы.",
    "draft a launch announcement in a new doc from my notes": "Составить черновик анонса запуска в новом документе на основе моих заметок",
    "draft a launch announcement in a new doc from my notes.": "Составить черновик анонса запуска в новом документе на основе моих заметок.",
    "reply to the open comments on my doc and resolve them": "Ответить на открытые комментарии в моём документе и закрыть их",
    "reply to the open comments on my doc and resolve them.": "Ответить на открытые комментарии в моём документе и закрыть их.",
    "tool arguments": "Аргументы инструмента",
    "tool output": "Вывод инструмента",
    "tool input": "Входные данные инструмента",
    "tool result": "Результат инструмента",
    "agents": "Агенты",
    "context usage": "Использование контекста",
    "science plugin": "Плагин Science",
    "science plugin: scientific tools for your agent": "Плагин Science: научные инструменты для вашего агента",
    "customizing or creating extensions": "Настройка и создание расширений",
    "licensing & disclaimer": "Лицензирование и отказ от ответственности",
    "copyright 2026 google llc": "Copyright 2026 Google LLC",
    "skill licences and terms of use": "Лицензии навыков и условия использования",
    "authentication & setup": "Аутентификация и настройка",
    "1. enable the developer knowledge api": "1. Включите Developer Knowledge API",
    "2. configure credentials": "2. Настройте учётные данные",
    "choose one of the following authentication methods:": "Выберите один из следующих способов аутентификации:",
    "option 1: application default credentials (recommended for mcp)": "Вариант 1: Стандартные учётные данные приложения — ADC (рекомендуется для MCP)",
    "option 2: developer knowledge api key": "Вариант 2: API-ключ Developer Knowledge",
    "included components": "Включённые компоненты",
    "google developer knowledge documentation": "Документация Google Developer Knowledge",
    "developer knowledge mcp server guide": "Руководство по MCP-серверу Developer Knowledge",
    "google cloud console credentials page": "странице учётных данных Google Cloud Console",
    "why?": "Зачем это нужно?",
    "what's included?": "Что включено?",
    "core disciplines": "Основные направления",
    "user experience": "Пользовательский опыт (UX)",
    "css layout": "CSS-вёрстка и макеты",
    "forms & ui": "Формы и элементы UI",
    "built-in ai": "Встроенный ИИ (Built-in AI)",
    "the full list": "Полный список",
    "232 modern web features": "232 современные веб-возможности",
    "186 real-world developer use cases": "186 практических сценариев разработки",
    "safe adoption of modern features": "Безопасное внедрение современных возможностей",
    "progressive enhancement & nuanced fallbacks": "Прогрессивное улучшение и продуманные фолбэки",
    "responsible fallbacks": "Ответственные фолбэки",
    "gotchas & quirks": "Подводные камни и особенности",
    "baseline-aware integration": "Интеграция с учётом Baseline",
    "modern browser apis": "Современные API браузеров",
    "performance & accessibility": "Производительность и доступность",
    "how it works": "Как это работает",
    "activation": "Активация",
    "local semantic search": "Локальный семантический поиск",
    "поиск local semantic": "Локальный семантический поиск",
    "guide fetch": "Загрузка руководства",
    "evals to prove this works well ;)": "Оценки (Evals), доказывающие эффективность ;)",
    "simulated developer tasks": "Симуляция задач разработчика",
    "browser-based assertions": "Проверки в реальном браузере",
    "self-healing calibration": "Самовосстанавливающаяся калибровка",
    "e2e testing": "Сквозное (E2E) тестирование",
    "recent eval results snapshot": "Срез последних результатов оценок",
    "date": "Дата",
    "agent + model": "Агент + Модель",
    "tasks / assertions": "Задачи / Проверки",
    "unguided → guided (uplift)": "Без навыка → С навыком (Прирост)",
    "telemetry & privacy": "Телеметрия и конфиденциальность",
    "to opt-out:": "Чтобы отказаться от телеметрии:",
    "contributors": "Участники проекта",
    "huge thanks to everyone who has contributed!": "Огромное спасибо всем, кто внёс свой вклад!",
    "attribution": "Атрибуция и источники",
    "flutter agent plugin": "Плагин агента Flutter",
    "available skills": "Доступные навыки",
    "dart skills": "Навыки Dart",
    "flutter skills": "Навыки Flutter",
    "configuration": "Конфигурация",
    "features and common uses": "Возможности и основные сценарии использования",
    "data engineering:": "Инженерия данных:",
    "data science:": "Наука о данных (Data Science):",
    "data analysis:": "Анализ данных:",
    "install the gcloud cli": "Установите gcloud CLI",
    "log in with your google cloud account:": "Войдите в свой аккаунт Google Cloud:",
    "log in to": "Авторизуйтесь в",
    "usage statistics": "Статистика использования",
    "open an issue": "создайте ишью",
    "data agent kit homepage": "Домашняя страница Data Agent Kit",
    "data agent kit documentation": "Документация Data Agent Kit",
    "service account impersonation": "имперсонацию сервисного аккаунта",
    "roles it needs": "необходимые ему роли",
    "principal access boundary policies": "политики границ доступа принципалов (Principal Access Boundary)",
    "mitigate prompt injection risks": "снизить риски промпт-инъекций",
    "google cloud developer plugin": "Плагин Google Cloud Developer",
    "bundled skills": "Встроенные навыки",
    "developer knowledge mcp server": "MCP-сервер Developer Knowledge",
    "routing rules": "Правила маршрутизации",
    "plugin in action": "Плагин в действии",
    "environment awareness": "Осведомлённость об окружении",
    "interaction with guardrails": "Взаимодействие с защитными ограничениями",
    "network, sandbox, and permission requirements": "Требования к сети, песочнице и разрешениям",
    "1. required outbound url allowlist": "1. Список разрешённых исходящих URL",
    "2. required terminal command permissions": "2. Требуемые разрешения для команд терминала",
    "domain / endpoint": "Домен / Эндпоинт",
    "used by": "Где используется",
    "recent": "Недавние",
    "recent:": "Недавние:",
    "recent projects": "Недавние проекты",
    "recent workspaces": "Недавние рабочие области",
    "recent conversations": "Недавние диалоги",
    "recent files": "Недавние файлы",
    "trigger": "Триггер",
    "triggers": "Триггеры",
    "time zone": "Часовой пояс",
    "timezone": "Часовой пояс",
    "this computer": "Этот компьютер",
    "this computer >": "Этот компьютер >",
    "cloud": "Облако",
    "runs on": "Где запускать",
    "schedule": "Расписание",
    "scheduled task": "Запланированная задача",
    "new scheduled task": "Новая запланированная задача",
    "add scheduled task": "Добавить запланированную задачу",
    "enter scheduled task name...": "Введите название задачи...",
    "environment": "Окружение",
    "execution identity": "Учётная запись выполнения",
    "standalone": "Вне проекта",
    "no projects created": "Нет созданных проектов",
    "select workspace": "Выберите рабочую область",
    "you don't have any projects created. please create a project first.": "У вас нет созданных проектов. Пожалуйста, сначала создайте проект.",
    "not cloned locally": "Не клонировано локально",
    "search workspaces…": "Поиск рабочих областей…",
    "search workspaces...": "Поиск рабочих областей...",
    "search projects…": "Поиск проектов…",
    "search projects...": "Поиск проектов...",
    "more actions": "Другие действия",
    "skill": "Навык",
    "command": "Команда",
    "note": "ПРИМЕЧАНИЕ",
    "tip": "СОВЕТ",
    "ui extensions": "UI-расширения",
    "accounts": "Аккаунты",
    "hooks": "Хуки",
    "context providers": "Провайдеры контекста",
    "explore the plugin marketplace": "Откройте для себя маркетплейс плагинов",
    "find plugins - bundles of skills, agents, mcp servers, ui extensions and more, and install them in one click.": "Находите плагины — наборы навыков, агентов, MCP-серверов, UI-расширений и многого другого — и устанавливайте их в один клик.",
    "empty message": "Пустое сообщение",
    "unread": "Непрочитанные",
    "context usage": "Использование контекста",
    "key capabilities": "Ключевые возможности",
    "🚀 key capabilities": "🚀 Ключевые возможности",
    "project scaffolding": "Создание каркаса проекта",
    "🛠️ project scaffolding": "🛠️ Создание каркаса проекта",
    "device & emulator management": "Управление устройствами и эмуляторами",
    "📱 device & emulator management": "📱 Управление устройствами и эмуляторами",
    "agent skills management": "Управление навыками агента",
    "🧠 agent skills management": "🧠 Управление навыками агента",
    "ui layout inspection & screen analysis": "Инспекция UI-разметки и анализ экрана",
    "🔍 ui layout inspection & screen analysis": "🔍 Инспекция UI-разметки и анализ экрана",
    "journey testing": "Тестирование пользовательских сценариев (Journey)",
    "🧪 journey testing": "🧪 Тестирование пользовательских сценариев (Journey)",
    "official android knowledge base": "Официальная база знаний Android",
    "📚 official android knowledge base": "📚 Официальная база знаний Android",
    "device hub & compose preview panes": "Панели Device Hub и Compose Preview",
    "🖥️ device hub & compose preview panes": "🖥️ Панели Device Hub и Compose Preview",
    "installation & setup": "Установка и настройка",
    "📦 installation & setup": "📦 Установка и настройка",
    "initialize android cli": "Инициализация Android CLI",
    "update android cli": "Обновление Android CLI",
    "starter prompts": "Примеры стартовых запросов",
    "💡 starter prompts": "💡 Примеры стартовых запросов",
    "once enabled, try asking your agent:": "После включения попробуйте попросить вашего агента:",
    "creating a new android project": "Создание нового проекта Android",
    "создание a new android project": "Создание нового проекта Android",
    "running on a device": "Запуск на устройстве",
    "запуск on a device": "Запуск на устройстве",
    "testing & play readiness": "Тестирование и готовность к Google Play",
    "тестирование & play readiness": "Тестирование и готовность к Google Play",
    "command reference": "Справочник команд",
    "📖 command reference": "📖 Справочник команд",
    "android developer tools team": "Команда Android Developer Tools",
    "find the trends and outliers in this sales sheet": "Найти тренды и аномалии в этой таблице продаж",
    "build a monthly budget tracker with formulas and a chart": "Создать трекер ежемесячного бюджета с формулами и диаграммой",
    "import this csv and turn it into a pivot table by region": "Импортировать этот CSV и превратить его в сводную таблицу по регионам",
    "read, write, and format your google sheets. fill in formulas, sort and clean columns, import csvs, build charts and pivot tables, and export the result.": "Чтение, запись и форматирование ваших таблиц Google Sheets. Заполняйте формулы, сортируйте и очищайте столбцы, импортируйте CSV-файлы, стройте диаграммы и сводные таблицы, а также экспортируйте результат.",
    "turn my project notes into a 10-slide pitch deck": "Превратить мои заметки по проекту в презентацию из 10 слайдов",
    "add a summary slide and speaker notes to my review deck": "Добавить итоговый слайд и заметки докладчика в мою презентацию",
    "export the final deck as a pdf": "Экспортировать готовую презентацию в PDF",
    "find last quarter's budget and share it with alex": "Найти бюджет за прошлый квартал и поделиться им с Алексом",
    "move this week's design exports into the launch folder": "Переместить экспорты дизайна за эту неделю в папку Launch",
    "download the q3 report as a pdf": "Скачать отчёт за 3-й квартал в формате PDF",
    "book 30 minutes with priya and sam next week": "Забронировать 30 минут с Прией и Сэмом на следующей неделе",
    "what's on my calendar today? flag any conflicts": "Что в моём календаре на сегодня? Отметь любые пересечения",
    "block focus time before friday's launch review": "Выделить время для фокусировки перед пятничным обзором запуска",
    "read and write your google docs. summarize any doc from its link, draft proposals and announcements in a new doc, and reply to and resolve open comments.": "Чтение и редактирование ваших документов Google Docs. Делайте сводки любого документа по ссылке, составляйте черновики предложений и анонсов в новом документе, а также отвечайте на открытые комментарии и закрывайте их.",
    "чтение and write your google docs. summarize any doc from its link, draft proposals and announcements in a new doc, and reply to and resolve open comments .": "Чтение и редактирование ваших документов Google Docs. Делайте сводки любого документа по ссылке, составляйте черновики предложений и анонсов в новом документе, а также отвечайте на открытые комментарии и закрывайте их.",
    "чтение and write your google docs. summarize any doc from its link, draft proposals and announcements in a new doc, and reply to and resolve open comments.": "Чтение и редактирование ваших документов Google Docs. Делайте сводки любого документа по ссылке, составляйте черновики предложений и анонсов в новом документе, а также отвечайте на открытые комментарии и закрывайте их."
};

function localizeActionTarget(target) {
    if (!target) return '';
    const t = target.trim();
    const lower = t.toLowerCase();
    
    if (/^github\s+actions\s+workflow\s+run\s+(\S+)\s+status$/i.test(t)) {
        const id = t.match(/^github\s+actions\s+workflow\s+run\s+(\S+)\s+status$/i)[1];
        return `статуса запуска рабочего процесса GitHub Actions ${id}`;
    }
    if (/^github\s+actions\s+run\s+(\S+)\s+status$/i.test(t)) {
        const id = t.match(/^github\s+actions\s+run\s+(\S+)\s+status$/i)[1];
        return `статуса запуска GitHub Actions ${id}`;
    }
    if (/^github\s+actions\s+workflow\s+run\s+status$/i.test(t)) return 'статуса запуска рабочего процесса GitHub Actions';
    if (/^github\s+actions\s+run\s+status$/i.test(t)) return 'статуса запуска GitHub Actions';
    if (/^github\s+actions\s+status$/i.test(t)) return 'статуса GitHub Actions';
    if (/^github\s+actions\s+run\s+(\S+)$/i.test(t)) {
        const id = t.match(/^github\s+actions\s+run\s+(\S+)$/i)[1];
        return `запуска GitHub Actions ${id}`;
    }
    if (/^run\s+(\S+)\s+status$/i.test(t)) {
        const id = t.match(/^run\s+(\S+)\s+status$/i)[1];
        return `статуса запуска ${id}`;
    }
    
    if (/^validator\s+and\s+config\s+getter$/i.test(t)) return 'валидатора и геттера конфигурации';
    if (/^config\s+getter$/i.test(t)) return 'геттера конфигурации';
    if (/^validator$/i.test(t)) return 'валидатора';
    if (/^split\s+diff$/i.test(t)) return 'в раздельном режиме';
    if (/^(?:inline|unified)\s+diff$/i.test(t)) return 'во встроенном режиме';
    if (/^for\s+any\s+newer\s+screenshots$/i.test(t)) return 'наличия новых скриншотов';
    if (/^for\s+any\s+more\s+uploaded\s+screenshots$/i.test(t)) return 'наличия новых загруженных скриншотов';
    if (/^for\s+any\s+additional\s+screenshots\s+in\s+queue$/i.test(t)) return 'дополнительных скриншотов в очереди';
    if (/^for\s+any\s+new\s+screenshots\s+in\s+queue$/i.test(t)) return 'новых скриншотов в очереди';
    if (/^for\s+any\s+new\s+uploaded\s+screenshots$/i.test(t)) return 'новых загруженных скриншотов';
    if (/^if\s+any\s+new\s+screenshots\s+arrived$/i.test(t)) return 'появления новых скриншотов';
    if (/^if\s+more\s+screenshots\s+were\s+uploaded$/i.test(t)) return 'загрузки новых скриншотов';
    if (/^no\s+new\s+screenshots\s+in\s+queue$/i.test(t)) return 'отсутствия новых скриншотов в очереди';
    if (/^latest\s+uploaded\s+screenshots$/i.test(t)) return 'последних загруженных скриншотов';
    
    if (/^server\s+log\s+for\s+order$/i.test(t)) return 'лога сервера для заказа';
    if (/^server\s+log$/i.test(t)) return 'лога сервера';
    if (/^health\s+of\s+approval\s+server$/i.test(t)) return 'состояния сервера утверждений';
    if (/^approval\s+server$/i.test(t)) return 'сервера утверждений';
    if (/^health\s+of\s+(.+)$/i.test(t)) return 'состояния ' + localizeActionTarget(t.match(/^health\s+of\s+(.+)$/i)[1]);
    if (/^antigravity-cli\s+(\S+)\s+release\s+notes$/i.test(t)) return 'примечаний к релизу antigravity-cli ' + t.match(/^antigravity-cli\s+(\S+)\s+release\s+notes$/i)[1];
    if (/^(.+?)\s+release\s+notes$/i.test(t)) return 'примечаний к релизу ' + t.match(/^(.+?)\s+release\s+notes$/i)[1];
    if (/^release\s+notes$/i.test(t)) return 'примечаний к релизу';
    if (/^(.+?)\s+release\s+installer$/i.test(t)) return 'установщика релиза ' + t.match(/^(.+?)\s+release\s+installer$/i)[1];
    if (/^release\s+installer$/i.test(t)) return 'установщика релиза';
    if (/^installer$/i.test(t)) return 'установщика';
    if (/^(.+?)\s+release\s+executable$/i.test(t)) return 'исполняемого файла релиза ' + t.match(/^(.+?)\s+release\s+executable$/i)[1];
    if (/^release\s+executable$/i.test(t)) return 'исполняемого файла релиза';
    if (/^executable$/i.test(t)) return 'исполняемого файла';
    if (/^(.+?)\s+executable$/i.test(t)) return 'исполняемого файла ' + t.match(/^(.+?)\s+executable$/i)[1];
    if (/^(.+?)\s+release\s+binary$/i.test(t)) return 'бинарного файла релиза ' + t.match(/^(.+?)\s+release\s+binary$/i)[1];
    if (/^release\s+binary$/i.test(t)) return 'бинарного файла релиза';
    if (/^binary$/i.test(t)) return 'бинарного файла';
    if (/^(.+?)\s+release\s+build$/i.test(t)) return 'релизной сборки ' + t.match(/^(.+?)\s+release\s+build$/i)[1];
    if (/^release\s+build$/i.test(t)) return 'релизной сборки';
    if (/^(.+?)\s+release\s+package$/i.test(t)) return 'пакета релиза ' + t.match(/^(.+?)\s+release\s+package$/i)[1];
    if (/^release\s+package$/i.test(t)) return 'пакета релиза';
    if (/^proposal\s+watcher$/i.test(t)) return 'наблюдателя предложений';
    if (/^(.+?)\s+strings$/i.test(t)) {
        const inner = t.match(/^(.+?)\s+strings$/i)[1].replace(/\s+and\s+/gi, ' и ');
        return `строк ${inner}`;
    }
    if (/^(.+?)\s+(?:in|в)\s+([a-zA-Z0-9_.\-\/\\]+\.[a-zA-Z0-9_]+)$/i.test(t)) {
        const m = t.match(/^(.+?)\s+(?:in|в)\s+([a-zA-Z0-9_.\-\/\\]+\.[a-zA-Z0-9_]+)$/i);
        const sub = localizeActionTarget(m[1]);
        return `${sub} в ${m[2]}`;
    }
    if (/^(\d+\s*[a-zA-Z]{1,3})\s+log$/i.test(t)) return 'лога ' + t.match(/^(\d+\s*[a-zA-Z]{1,3})\s+log$/i)[1];
    if (/^test\s+vectors?$/i.test(t)) return 'тестового вектора';
    if (/^tailwind\s+css$/i.test(t)) return 'Tailwind CSS';
    if (/^\.?tauri-keys$/i.test(t)) return '.tauri-keys';
    
    if (/^commit\s+and\s+tag\s+(\S+)\s+with\s+github\s+token$/i.test(t)) {
        const tag = t.match(/^commit\s+and\s+tag\s+(\S+)\s+with\s+github\s+token$/i)[1];
        return `коммита и тега ${tag} с токеном GitHub`;
    }
    if (/^commit\s+and\s+tag\s+(\S+)\s+to\s+github$/i.test(t)) {
        const tag = t.match(/^commit\s+and\s+tag\s+(\S+)\s+to\s+github$/i)[1];
        return `коммита и тега ${tag} в GitHub`;
    }
    if (/^commit\s+and\s+tag\s+(\S+)$/i.test(t)) {
        const tag = t.match(/^commit\s+and\s+tag\s+(\S+)$/i)[1];
        return `коммита и тега ${tag}`;
    }
    if (/^task\s+log$/i.test(t)) return 'лога задачи';
    if (/^task\s+logs$/i.test(t)) return 'логов задачи';
    
    if (/^commit\s+files$/i.test(t)) return 'файлов коммита';
    if (/^upsert\s+function$/i.test(t)) return 'функции upsert';
    if (/^staged\s+diff$/i.test(t)) return 'staged diff';
    if (/^new\s+modules$/i.test(t)) return 'новых модулей';
    if (/^resources\s+dir$/i.test(t)) return 'каталога resources';
    if (/^install\s+js\s+files$/i.test(t)) return 'установочных JS-файлов';
    if (/^recent\s+commits$/i.test(t)) return 'недавних коммитов';
    if (/^consilium\s+commit$/i.test(t)) return 'коммита Consilium';
    if (/^git\s+status$/i.test(t)) return 'статуса git';
    if (/^active\s+contract$/i.test(t)) return 'активного контракта';
    if (/^current\s+hash\s+of\s+app\.asar$/i.test(t)) return 'текущего хэша app.asar';
    if (/^resources\s+directory\s+in\s+antigravity$/i.test(t)) return 'директории resources в Antigravity';
    if (/^dictionary\s+for\s+new\s+strings$/i.test(t)) return 'словаря на новые строки';
    if (/^notice\s+in\s+localization\s+script$/i.test(t)) return 'уведомления в скрипте локализации';
    if (/^app\.asar$/i.test(t)) return 'в app.asar';
    if (/^thinking\s+for$/i.test(t)) return 'Thinking for';
    if (/^shouldignore\s+with\s+mock\s+nodes$/i.test(t)) return 'shouldIgnore с mock-узлами';
    if (/^router\s+processes$/i.test(t)) return 'процессов маршрутизатора';
    if (/^passwall\s+processes$/i.test(t)) return 'процессов Passwall';
    if (/^running\s+processes$/i.test(t)) return 'запущенных процессов';
    if (/^system\s+logread$/i.test(t)) return 'системного logread';
    if (/^passwall\s+runtime\s+log$/i.test(t)) return 'рантайм-лога Passwall';
    if (/^final\s+processes$/i.test(t)) return 'итоговых процессов';
    if (/^process\s+arguments$/i.test(t)) return 'аргументов процесса';
    if (/^process\s+completion$/i.test(t)) return 'завершения процесса';
    if (/^dns\s+resolution$/i.test(t)) return 'DNS-разрешения';
    if (/^range\s+request$/i.test(t)) return 'диапазонного запроса';
    if (/^lines\s+(\d+)\s*[-–—]\s*(\d+)$/i.test(t)) {
        const m = t.match(/^lines\s+(\d+)\s*[-–—]\s*(\d+)$/i);
        return `строк ${m[1]}–${m[2]}`;
    }
    if (/^line\s+(\d+)\s+with\s+(.+)$/i.test(t)) {
        const m = t.match(/^line\s+(\d+)\s+with\s+(.+)$/i);
        return `строки ${m[1]} с помощью ${m[2]}`;
    }
    if (/^line\s+(\d+)$/i.test(t)) {
        return `строки ${t.match(/^line\s+(\d+)$/i)[1]}`;
    }
    if (/^whitelist\s+in\s+(\S+)$/i.test(t)) {
        return `белого списка в ${t.match(/^whitelist\s+in\s+(\S+)$/i)[1]}`;
    }
    if (/^regexTranslations\s+for\s+terminal\s+tab$/i.test(t)) {
        return 'regexTranslations для вкладки терминала';
    }
    if (/^Russian\s+menu\s+translations\s+in\s+(.+)$/i.test(t)) {
        return `русских переводов меню в ${t.match(/^Russian\s+menu\s+translations\s+in\s+(.+)$/i)[1]}`;
    }
    if (/^fix\s+quote\s+escaping\s+in\s+localization_injected\.js,\s*validate,\s*build\s+and\s+deploy\s+app\.asar$/i.test(t)) return 'Исправление экранирования кавычек в localization_injected.js, проверка, сборка и деплой app.asar';
    if (/^cli\s+versions$/i.test(t)) return 'версий CLI';
    if (/^openwrt\s+hosts$/i.test(t)) return 'openwrt hosts';
    if (/unit\s+tests?$/i.test(t)) return t.replace(/unit\s+tests?$/i, 'unit-тестов');
    if (/tests?$/i.test(t)) return t.replace(/tests?$/i, 'тестов');

    if (translationDictionary[lower]) {
        return translationDictionary[lower];
    }

    return t;
}

const regexTranslations = [
    {
        // "Good Response" / "Good response"
        pattern: /^Good\s+response(!?)$/i,
        replace: (match) => "Хороший ответ" + (match[1] || '')
    },
    {
        // "Bad Response" / "Bad response"
        pattern: /^Bad\s+response(!?)$/i,
        replace: (match) => "Плохой ответ" + (match[1] || '')
    },
    {
        // "1 file changed", "2 files changed", "1 file changed +", "1 file changed +10 -2"
        pattern: /^(\d+)\s+files?\s+changed(\s*[\(\[\{]?\s*[\+\-].*)?$/i,
        replace: (match) => {
            const count = match[1];
            const diff = match[2] ? match[2].trim() : '';
            const n = parseInt(count, 10);
            let word = 'файлов изменено';
            if (n % 10 === 1 && n % 100 !== 11) {
                word = 'файл изменен';
            } else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
                word = 'файла изменено';
            }
            return `${n} ${word}${diff ? ' ' + diff : ''}`;
        }
    },
    {
        // "file changed +", "files changed +", "file changed", "files changed"
        pattern: /^files?\s+changed(\s*[\(\[\{]?\s*[\+\-].*)?$/i,
        replace: (match) => {
            const isPlural = /^files/i.test(match[0]);
            const isCapital = /^[A-Z]/.test(match[0]);
            const diff = match[1] ? match[1].trim() : '';
            let base = isPlural ? "файлы изменены" : "файл изменен";
            if (isCapital) {
                base = base.charAt(0).toUpperCase() + base.slice(1);
            }
            return base + (diff ? ' ' + diff : '');
        }
    },
    {
        // "The subagent Implementation Worker (worker) with id "..." encountered an error..."
        pattern: /^The subagent (.+?) with id "([^"]+)" encountered an error and has either stopped or failed to start execution:\s*([\s\S]+)$/i,
        replace: (match) => {
            const role = match[1];
            const id = match[2];
            let reason = match[3].trim();
            if (/User location is not supported for (the )?API use/i.test(reason)) {
                reason = reason
                    .replace(/FAILED_PRECONDITION\s*\(code\s*(\d+)\)/gi, 'FAILED_PRECONDITION (код $1)')
                    .replace(/User location is not supported for (the )?API use\.?/gi, 'Местоположение пользователя не поддерживается для использования API.');
            }
            return `Субагент ${role} с ID "${id}" столкнулся с ошибкой и остановился либо не смог запуститься: ${reason}`;
        }
    },
    {
        // "The subagent ... with id "..." encountered an error..." (without reason)
        pattern: /^The subagent (.+?) with id "([^"]+)" encountered an error and has either stopped or failed to start execution:?$/i,
        replace: (match) => `Субагент ${match[1]} с ID "${match[2]}" столкнулся с ошибкой и остановился либо не смог запуститься:`
    },
    {
        // "The subagent ... encountered an error..."
        pattern: /^The subagent (.+?) encountered an error and has either stopped or failed to start execution:?$/i,
        replace: (match) => `Субагент ${match[1]} столкнулся с ошибкой и остановился либо не смог запуститься:`
    },
    {
        // "FAILED_PRECONDITION (code 400): User location is not supported for the API use."
        pattern: /^FAILED_PRECONDITION\s*\(code\s*(\d+)\):\s*User location is not supported for (the )?API use\.?$/i,
        replace: (match) => `FAILED_PRECONDITION (код ${match[1]}): Местоположение пользователя не поддерживается для использования API.`
    },
    {
        // "Error from Implementation Worker (worker)"
        pattern: /^Error from (.+)$/i,
        replace: (match) => `Ошибка: ${match[1].trim()}`
    },
    {
        // "<action / task> finished" (e.g. "Run full clean architect session finished", "Directory analysis finished")
        pattern: /^(.+?)\s+finished$/i,
        replace: (match) => {
            const raw = match[1].trim();
            const lower = raw.toLowerCase();
            if (translationDictionary[lower]) {
                const trans = translationDictionary[lower];
                if (trans.endsWith('сессия') || trans.endsWith('задача') || trans.endsWith('команда') || trans.endsWith('операция') || trans.endsWith('проверка')) {
                    return trans + ' завершена';
                }
                if (trans.endsWith('запуск') || trans.endsWith('анализ') || trans.endsWith('поиск') || trans.endsWith('процесс')) {
                    return trans + ' завершен';
                }
                return trans + ' — завершено';
            }
            if (/^Restore\s+(.+?)\s+from\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Restore\s+(.+?)\s+from\s+(.+)$/i);
                return `Восстановление ${m[1]} из ${m[2]} — завершено`;
            }
            if (/^Search\s+(.+?)\s+in\s+transcript$/i.test(raw)) {
                const m = raw.match(/^Search\s+(.+?)\s+in\s+transcript$/i);
                return `Поиск ${m[1]} в стенограмме — завершен`;
            }
            if (/^Inspect\s+(.+?)\s+with\s+parameters$/i.test(raw)) {
                const m = raw.match(/^Inspect\s+(.+?)\s+with\s+parameters$/i);
                return `Проверка ${m[1]} с параметрами — завершена`;
            }
            if (/^Inspect\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Inspect\s+(.+)$/i);
                return `Проверка ${m[1]} — завершена`;
            }
            if (/^Check\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Check\s+(.+)$/i);
                return `Проверка ${m[1]} — завершена`;
            }
            if (/^Compare\s+(?:against|with)\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Compare\s+(?:against|with)\s+(.+)$/i);
                return `Сравнение с ${m[1]} — завершено`;
            }
            if (/architect session/i.test(raw)) {
                return 'Сессия архитектора завершена';
            }
            if (/^Run\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Run\s+(.+)$/i);
                let target = m[1].trim();
                if (/real hook acceptance test/i.test(target)) {
                    return 'Выполнение приёмочного теста хука — завершено';
                }
                if (/acceptance test/i.test(target)) {
                    return 'Выполнение приёмочного теста — завершено';
                }
                return `Запуск ${target} — завершен`;
            }
            if (/^View\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^View\s+(.+)$/i);
                return `Просмотр ${m[1]} — завершен`;
            }
            if (/^Test\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Test\s+(.+)$/i);
                return `Тест ${m[1]} — завершен`;
            }
            return raw + ' — завершено';
        }
    },
    {
        // "finished" / "finished." standalone
        pattern: /^finished\.?$/i,
        replace: () => "Завершено"
    },
    {
        // "Exploring file ˅" / "Exploring files >" / "Exploring file"
        pattern: /^Exploring\s+files?(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => (match[0].toLowerCase().includes("files") ? "Исследование файлов" : "Исследование файла") + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Exploring codebase / workspace / project / directory / folder"
        pattern: /^Exploring\s+(codebase|workspace|project|directory|folder|repository)(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => {
            const targets = {
                codebase: 'кодовой базы',
                workspace: 'рабочего пространства',
                project: 'проекта',
                directory: 'директории',
                folder: 'папки',
                repository: 'репозитория'
            };
            const target = targets[match[1].toLowerCase()] || match[1];
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Исследование ${target}${arrow}`;
        }
    },
    {
        // "Analyzed <target>"
        pattern: /^Analyzed\s+(.*)$/i,
        replace: (match) => `Проанализировано ${match[1]}`
    },
    {
        // "Edited <target>" or "Edited" (e.g. "Edited 📄 Sudo Proposal Agy Update 135 +11 -0", "Edited")
        pattern: /^Edited(?:\s+(.*))?$/i,
        replace: (match) => match[1] ? `Изменено ${match[1]}` : 'Изменено'
    },
    {
        // === Gemini API Skills Table & Android CLI Plugin Page (must precede generic Creating/Ran/Test/Build rules!) ===
        pattern: /^This\s+Computer(\s*>)?$/i,
        replace: (m) => "Этот компьютер" + (m[1] ? " >" : "")
    },
    {
        pattern: /^(?:Build|Сборка)\s+applications\s+with\s+the(?:\s+Interactions\s+API\.?|\s*)$/i,
        replace: (m) => /interactions/i.test(m[0])
            ? "Создавайте приложения с помощью Interactions API."
            : "Создавайте приложения с помощью "
    },
    {
        pattern: /^\.?\s*Covers\s+text\s+generation,\s*stateful\s+multi-turn\s+chat.*$/i,
        replace: () => ". Охватывает генерацию текста, многошаговый чат с сохранением состояния, потоковую передачу, вызов функций, структурированный вывод, генерацию изображений, синтез речи (TTS), дизайн и клонирование голоса, управляемых агентов, Deep Research и миграцию с "
    },
    {
        pattern: /^(?:Build|Сборка)\s+low-latency,\s*bidirectional\s+voice\s+and\s+video\s+applications\s+over\s+WebSockets\s+with\s+the(?:\s+Gemini\s+Live\s+API\.?|\s*)$/i,
        replace: (m) => /gemini/i.test(m[0])
            ? "Создавайте двунаправленные голосовые и видеоприложения с низкой задержкой поверх WebSockets с помощью Gemini Live API."
            : "Создавайте двунаправленные голосовые и видеоприложения с низкой задержкой поверх WebSockets с помощью "
    },
    {
        pattern: /^\.?\s*Covers\s+real-time\s+audio\/video\s+streaming,\s*background\s+reasoning.*$/i,
        replace: () => ". Охватывает потоковую передачу аудио и видео в реальном времени, фоновые рассуждения (расширенное мышление), асинхронные неблокирующие вызовы инструментов, транскрибацию в реальном времени, живой перевод речи и управление сессиями."
    },
    {
        pattern: /^Generate\s+and\s+edit\s+videos\s+with\s+Gemini\s+Omni\s+Flash\s+using\s+the\s+Interactions\s+API.*$/i,
        replace: () => "Генерируйте и редактируйте видео с помощью Gemini Omni Flash через Interactions API, включая генерацию видео по тексту, переходы по первому и последнему кадру, генерацию по референсам и продление видео."
    },
    {
        // Android CLI Example Prompts & Starter Prompts
        pattern: /^"?(?:Create|Создать|Создано)\s+a\s+new\s+Android\s+project\s+called\s+MyFirstApp\s+using\s+the\s+empty-activity\s+template\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Создать новый проект Android с именем MyFirstApp на основе шаблона empty-activity»"
            : "Создать новый проект Android с именем MyFirstApp на основе шаблона empty-activity"
    },
    {
        pattern: /^"?(?:Run|Запуск)\s+my\s+app\s+on\s+a\s+Samsung\s+Galaxy\s+Ultra\s+device\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Запустить моё приложение на устройстве Samsung Galaxy Ultra.»"
            : "Запустить моё приложение на устройстве Samsung Galaxy Ultra."
    },
    {
        pattern: /^"?(?:Test|Тест:?|Тестирование)\s+my\s+app\s+and\s+make\s+sure\s+that\s+it['’]s\s+ready\s+to\s+publish\s+to\s+Google\s+Play\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Протестировать моё приложение и убедиться, что оно готово к публикации в Google Play.»"
            : "Протестировать моё приложение и убедиться, что оно готово к публикации в Google Play."
    },
    {
        pattern: /^(?:Creating|Создание)\s+a\s+new\s+Android\s+project(:?)$/i,
        replace: (m) => "Создание нового проекта Android" + (m[1] || "")
    },
    {
        pattern: /^(?:Running|Запуск)\s+on\s+a\s+device(:?)$/i,
        replace: (m) => "Запуск на устройстве" + (m[1] || "")
    },
    {
        pattern: /^(?:Testing|Тестирование)\s*&\s*Play\s+readiness(:?)$/i,
        replace: (m) => "Тестирование и готовность к Google Play" + (m[1] || "")
    },
    {
        // Android CLI Overview & Key Capabilities
        pattern: /^is\s+the\s+official\s+command-line\s+interface\s+that\s+standardizes\s+core\s+Android\s+development.*$/i,
        replace: () => " — это официальный интерфейс командной строки, стандартизирующий ключевые компетенции Android-разработки для рабочих процессов с участием ИИ-агентов. Он предоставляет кодинг-агентам и разработчикам единую точку входа к официальным инструментам, навыкам и документации для эффективной разработки под Android."
    },
    {
        pattern: /^Whether\s+you\s+are\s+scaffolding\s+a\s+new\s+app,\s*launching\s+virtual\s+devices.*$/i,
        replace: () => "Создаёте ли вы каркас нового приложения, запускаете виртуальные устройства, выполняете быстрые инкрементальные сборки, инспектируете живую разметку экрана или тестируете пользовательские сценарии — Android CLI оптимизирует разработку прямо из вашей рабочей области."
    },
    {
        pattern: /^Initialize\s+modern\s+Android\s+projects\s+from\s+official\s+templates\s+using\s*$/i,
        replace: () => "Инициализируйте современные проекты Android из официальных шаблонов с помощью "
    },
    {
        pattern: /^Pre-configured\s+with\s+the\s+latest\s+Android\s+Gradle\s+Plugin\s+\(AGP\).*$/i,
        replace: () => "Предварительно настроено с новейшим Android Gradle Plugin (AGP), Jetpack Compose и лучшими практиками."
    },
    {
        pattern: /^Print\s+environment\s+information\s+including\s+SDK\s+location,\s*connected\s+devices,\s*and\s+configuration\s+variables(?:\s+using\s*|\.\s*Use\s+specific\s+fields\s+to\s+narrow\s+the\s+output\.?)$/i,
        replace: (m) => /using\s*$/i.test(m[0])
            ? "Выводите информацию об окружении, включая расположение SDK, подключённые устройства и переменные конфигурации, с помощью "
            : "Вывод информации об окружении, включая путь к SDK, подключённые устройства и переменные конфигурации. Используйте конкретные поля для сужения вывода."
    },
    {
        pattern: /^\(use\s+specific\s+fields\s+to\s+narrow\s+the\s+output\)\.?$/i,
        replace: () => " (используйте конкретные поля для сужения вывода)."
    },
    {
        pattern: /^(?:Inspect|Проверка),\s*create,\s*and\s+launch\s+Android\s+Virtual\s+Devices\s+\(AVDs\)\s+directly\s+from\s+the\s+terminal\s+with\s*$/i,
        replace: () => "Проверяйте, создавайте и запускайте виртуальные устройства Android (AVD) прямо из терминала с помощью "
    },
    {
        pattern: /^Deploy\s+and\s+launch\s+applications\s+with\s+fast\s+delta\s+installs\s+using\s*$/i,
        replace: () => "Развёртывайте и запускайте приложения с быстрой дельта-установкой с помощью "
    },
    {
        pattern: /^command\s+provides\s+an\s+official\s+way\s+to\s+discover,\s*install,\s*update,\s*and\s+manage\s+recommended\s+skills\.?$/i,
        replace: () => " предоставляет официальный способ находить, устанавливать, обновлять и управлять рекомендуемыми навыками."
    },
    {
        pattern: /^Skills\s+installed\s+using\s+this\s+command\s+aren['’]t\s+removed\s+if\s+the\s+Android\s+plugin\s+for\s+Antigravity\s+is\s+uninstalled\.?$/i,
        replace: () => "Навыки, установленные с помощью этой команды, не удаляются при удалении плагина Android для Antigravity."
    },
    {
        pattern: /^(?:Extract|Извлечение)\s+the\s+live\s+application\s+layout\s+tree\s+in\s+structured\s+JSON\s+using\s*$/i,
        replace: () => "Извлекайте живое дерево разметки приложения в структурированном формате JSON с помощью "
    },
    {
        pattern: /^(?:Inspect|Проверка)\s+UI\s+hierarchies,\s*interactive\s+bounds,\s*accessibility\s+attributes,\s*and\s+focus\s+states\.?$/i,
        replace: () => "Инспектируйте иерархию интерфейса, границы интерактивных элементов, атрибуты доступности и состояния фокуса."
    },
    {
        pattern: /^Capture\s+device\s+screenshots\s+and\s+resolve\s+visual\s+coordinates\s+for\s+automated\s+interactions\s+using\s*$/i,
        replace: () => "Делайте скриншоты устройства и определяйте визуальные координаты для автоматизированных взаимодействий с помощью "
    },
    {
        pattern: /^(?:Test|Тест:?|Тестирование)\s+end-to-end\s+user\s+flows\s+with\s+Journey\s+tests\s+defined\s+using\s+natural\s+language,\s*using\s*$/i,
        replace: () => "Тестируйте сквозные пользовательские сценарии с помощью Journey-тестов, описанных на естественном языке, используя "
    },
    {
        pattern: /^and\s+visual\s+verification\.?$/i,
        replace: () => " и визуальную проверку."
    },
    {
        pattern: /^Output\s+structured\s+Markdown\s+reports\s+detailing\s+pass\/fail\s+statuses.*$/i,
        replace: () => "Формируйте структурированные отчёты в формате Markdown со статусами прохождения, командами взаимодействия ADB и проверочными скриншотами."
    },
    {
        pattern: /^(?:Search|Поиск)\s+authoritative,\s*up-to-date\s+Android\s+developer\s+documentation\s+directly\s+from\s+the\s+CLI\s+via\s*$/i,
        replace: () => "Ищите авторитетную и актуальную документацию для разработчиков Android прямо из CLI через "
    },
    {
        pattern: /^Fetch\s+full\s+articles\s+and\s+migration\s+guides\s+using\s*$/i,
        replace: () => "Загружайте полные статьи и руководства по миграции с помощью "
    },
    {
        pattern: /^:\s*list,\s*start,\s*stop,\s*create,\s*and\s+remove\s+Android\s+Virtual\s+Devices.*$/i,
        replace: () => ": просматривайте список, запускайте, останавливайте, создавайте и удаляйте виртуальные устройства Android, а также транслируйте экран и управляйте эмуляторами и физическими устройствами, подключёнными к adb, на боковой панели."
    },
    {
        pattern: /^:\s*render\s+Jetpack\s+Compose\s*$/i,
        replace: () => ": рендерите функции Jetpack Compose "
    },
    {
        pattern: /^functions\s+with\s*$/i,
        replace: () => " с помощью "
    },
    {
        pattern: /^and\s+review\s+the\s+results\s+in\s+a\s+side\s+pane\.?$/i,
        replace: () => " и просматривайте результаты на боковой панели."
    },
    {
        pattern: /^Both\s+panes\s+are\s+served\s+by\s+the\s+Android\s+CLI\s*\($/i,
        replace: () => "Обе панели обслуживаются через Android CLI ("
    },
    {
        pattern: /^\),\s*which\s+downloads\s+their\s+implementation\s+on\s+first\s+use\.?$/i,
        replace: () => "), который загружает их реализацию при первом использовании."
    },
    {
        pattern: /^tool\s+is\s+not\s+already\s+in\s+your\s*$/i,
        replace: () => " ещё не добавлен в ваш "
    },
    {
        pattern: /^,\s*install\s+it\s+using\s+the\s+platform-specific\s+installer:$/i,
        replace: () => ", установите его с помощью установщика для вашей платформы:"
    },
    {
        pattern: /^You\s+must\s+run\s*$/i,
        replace: () => "Необходимо выполнить "
    },
    {
        pattern: /^for\s+Antigravity\s+to\s+discover\s+and\s+use\s+Android\s+CLI:$/i,
        replace: () => ", чтобы Antigravity обнаружил и начал использовать Android CLI:"
    },
    {
        pattern: /^The\s+skill\s+installed\s+by\s+running\s+this\s+command\s+isn['’]t\s+removed\s+if\s+the\s+Android\s+plugin\s+for\s+Antigravity\s+is\s+uninstalled\.?$/i,
        replace: () => "Навык, установленный при выполнении этой команды, не удаляется при удалении плагина Android для Antigravity."
    },
    {
        pattern: /^To\s+keep\s+your\s+CLI\s+and\s+embedded\s+skills\s+up\s+to\s+date,\s*run:$/i,
        replace: () => "Чтобы поддерживать актуальность CLI и встроенных навыков, выполните:"
    },
    {
        pattern: /^Initialize\s+a\s+new\s+Android\s+project\s+from\s+available\s+templates\.?$/i,
        replace: () => "Инициализировать новый проект Android из доступных шаблонов."
    },
    {
        pattern: /^Generate\s+descriptive\s+build\s+target\s+and\s+artifact\s+metadata\s+for\s+a\s+project\.?$/i,
        replace: () => "Сгенерировать метаданные целей сборки и артефактов для проекта."
    },
    {
        pattern: /^(?:Build|Сборка),\s*deploy,\s*and\s+launch\s+an\s+application\s+on\s+a\s+connected\s+device\s+or\s+emulator\.?$/i,
        replace: () => "Собрать, развернуть и запустить приложение на подключённом устройстве или эмуляторе."
    },
    {
        pattern: /^Returns\s+the\s+active\s+UI\s+layout\s+tree\s+in\s+JSON\s+format\s*\(supports\s*$/i,
        replace: () => "Возвращает дерево активной UI-разметки в формате JSON (поддерживает "
    },
    {
        pattern: /^filtering\)\.?$/i,
        replace: () => ")."
    },
    {
        pattern: /^Commands\s+to\s+view,\s*capture,\s*and\s+target\s+UI\s+elements\s+visually\s+on\s+device\.?$/i,
        replace: () => "Команды для визуального просмотра, захвата и наведения на элементы интерфейса устройства."
    },
    {
        pattern: /^(?:Create|Создать|Создано),\s*start,\s*stop,\s*and\s+list\s+Android\s+Virtual\s+Devices\s+\(AVDs\)\.?$/i,
        replace: () => "Создание, запуск, остановка и просмотр списка виртуальных устройств Android (AVD)."
    },
    {
        pattern: /^Manage\s+Android\s+SDK\s+packages,\s*platforms,\s*and\s+build\s+tools\.?$/i,
        replace: () => "Управление пакетами Android SDK, платформами и инструментами сборки."
    },
    {
        pattern: /^(?:Search|Поиск)\s+and\s+fetch\s+documentation\s+from\s+the\s+official\s+Android\s+Knowledge\s+Base\.?$/i,
        replace: () => "Поиск и загрузка документации из официальной базы знаний Android."
    },
    {
        pattern: /^Initialize\s+the\s+environment\s+and\s+install\s+default\s+Android\s+CLI\s+agent\s+skills.*$/i,
        replace: () => "Инициализация окружения и установка стандартных навыков агента Android CLI (установленные навыки не удаляются при удалении плагина Android для Antigravity)."
    },
    {
        pattern: /^Manage\s+Android\s+CLI\s+skills\s+\(search,\s*add,\s*remove,\s*list,\s*update\).*$/i,
        replace: () => "Управление навыками Android CLI (поиск, добавление, удаление, просмотр списка, обновление). Установленные навыки не удаляются при удалении плагина Android для Antigravity."
    },
    {
        pattern: /^(?:Update|Обновление)\s+the\s+Android\s+CLI\s+to\s+the\s+latest\s+version\.?$/i,
        replace: () => "Обновить Android CLI до последней версии."
    },
    {
        pattern: /^For\s+more\s+documentation,\s*visit\s*$/i,
        replace: () => "Дополнительную документацию см. на сайте "
    },
    {
        pattern: /^Provides\s+instructions\s+for\s+installing\s+and\s+using\s+the\s+`?android`?\s+CLI\..*$/i,
        replace: () => "Содержит инструкции по установке и использованию CLI `android`. Инструмент командной строки `android` — ключевой инструмент для Android-разработки, который помогает создавать новые проекты Android, запускать приложения на устройствах, управлять виртуальными устройствами Android и взаимодействовать с ними (включая скриншоты и инспекцию UI), управлять компонентами Android SDK, искать в официальной документации Android, а также находить и устанавливать официальные навыки Android."
    },
    {
        pattern: /^Instructions\s+for\s+working\s+with\s+the\s+Android\s+Device\s+Hub\s+sidecar.*$/i,
        replace: () => "Инструкции по работе с сайдкаром Android Device Hub, который выводит список, запускает, останавливает, создаёт и удаляет виртуальные устройства Android (AVD), показывает физические устройства, подключённые к adb, и позволяет пользователю транслировать экран и управлять любым из них (видео, касания, клавиатура, колесо мыши) на панели Device Hub. Также объясняет, как инспектировать экран и взаимодействовать с ним с помощью `android layout`, `android screen` и `adb`."
    },
    {
        pattern: /^Instructions\s+for\s+the\s+Android\s+Compose\s+Preview\s+sidecar.*$/i,
        replace: () => "Инструкции для сайдкара Android Compose Preview, который рендерит функции Jetpack Compose @Preview с помощью `android preview render` и отображает их на панели Android Compose Preview. Используйте его, когда пользователь хочет увидеть превью Compose или проверить результат изменений интерфейса — выполняйте повторный рендеринг после изменения кода, чтобы панель отобразила актуальный результат."
    },
    {
        pattern: /^Renders\s+Jetpack\s+Compose\s+previews\s+with\s+`?android\s+preview`?\s+and\s+shows\s+them\s+in\s+a\s+pane\.?$/i,
        replace: () => "Рендерит превью Jetpack Compose с помощью `android preview` и отображает их на боковой панели."
    },
    {
        pattern: /^Sidecar\s+for\s+managing\s+Android\s+Virtual\s+Devices\s+\(list,\s*start,\s*stop,\s*create,\s*remove\).*$/i,
        replace: () => "Сайдкар для управления виртуальными устройствами Android (список, запуск, остановка, создание, удаление) через CLI эмулятора Android, а также для трансляции экрана и управления эмуляторами и физическими устройствами, подключёнными к adb."
    },
    {
        // === v2.1.22: Official Plugins (Firebase, Science, Google Developer Knowledge, Modern Web Guidance, Maps, Flutter, Data Agent Kit, Google Cloud Developer) ===
        // Emoji section headers (Android CLI & Modern Web Guidance)
        pattern: /^(?:🚀\s*)?Key\s+Capabilities$/i,
        replace: (m) => (/^🚀/.test(m[0]) ? "🚀 " : "") + "Ключевые возможности"
    },
    {
        pattern: /^(?:🛠️?\s*)?Project\s+Scaffolding$/i,
        replace: (m) => (/^🛠/.test(m[0]) ? "🛠️ " : "") + "Каркас и инициализация проекта"
    },
    {
        pattern: /^(?:📱\s*)?Device\s*&\s*Emulator\s+Management$/i,
        replace: (m) => (/^📱/.test(m[0]) ? "📱 " : "") + "Управление устройствами и эмуляторами"
    },
    {
        pattern: /^(?:🧠\s*)?Agent\s+Skills\s+Management$/i,
        replace: (m) => (/^🧠/.test(m[0]) ? "🧠 " : "") + "Управление навыками агента"
    },
    {
        pattern: /^(?:🔍\s*)?UI\s+Layout\s+Inspection\s*&\s*Screen\s+Analysis$/i,
        replace: (m) => (/^🔍/.test(m[0]) ? "🔍 " : "") + "Инспекция UI-разметки и анализ экрана"
    },
    {
        pattern: /^(?:🧪\s*)?Journey\s+Testing$/i,
        replace: (m) => (/^🧪/.test(m[0]) ? "🧪 " : "") + "Сценарное тестирование (Journey Testing)"
    },
    {
        pattern: /^(?:📚\s*)?Official\s+Android\s+Knowledge\s+Base$/i,
        replace: (m) => (/^📚/.test(m[0]) ? "📚 " : "") + "Официальная база знаний Android"
    },
    {
        pattern: /^(?:🖥️?\s*)?Device\s+Hub\s*&\s*Compose\s+Preview\s+Panes$/i,
        replace: (m) => (/^🖥/.test(m[0]) ? "🖥️ " : "") + "Панели Device Hub и предпросмотра Compose"
    },
    {
        pattern: /^(?:🎨\s*)?User\s+Experience$/i,
        replace: (m) => (/^🎨/.test(m[0]) ? "🎨 " : "") + "Пользовательский опыт (UX)"
    },
    {
        pattern: /^(?:📐\s*)?CSS\s+Layout$/i,
        replace: (m) => (/^📐/.test(m[0]) ? "📐 " : "") + "CSS-вёрстка и макеты"
    },
    {
        pattern: /^(?:⚡\s*)?(?:Performance|Производительность)$/i,
        replace: (m) => (/^⚡/.test(m[0]) ? "⚡ " : "") + "Производительность"
    },
    {
        pattern: /^(?:📝\s*)?Forms\s*&\s*UI$/i,
        replace: (m) => (/^📝/.test(m[0]) ? "📝 " : "") + "Формы и элементы UI"
    },
    {
        pattern: /^(?:♿\s*)?(?:Accessibility|Доступность)$/i,
        replace: (m) => (/^♿/.test(m[0]) ? "♿ " : "") + "Доступность"
    },
    {
        pattern: /^(?:🤖\s*)?Built-in\s+AI$/i,
        replace: (m) => (/^🤖/.test(m[0]) ? "🤖 " : "") + "Встроенный ИИ"
    },
    {
        // Context usage tokens: "(713 tokens)" / "713 / 20 000 tokens (3.6%)"
        pattern: /^\(([\d\s,.]+)\s+tokens\)\s*([\d.,]+%)?$/i,
        replace: (m) => `(${m[1]} токенов)` + (m[2] ? ` ${m[2]}` : "")
    },
    {
        pattern: /^([\d\s,.]+)\s*\/\s*([\d\s,.]+)\s+tokens\s*\(([^)]+)\)$/i,
        replace: (m) => `${m[1]} / ${m[2]} токенов (${m[3]})`
    },
    // --- 1. FIREBASE PLUGIN ---
    {
        pattern: /^(?:Set\s+up|Установите\s+для\s+переменной\s+окружения\s+up)\s+Firebase\s+in\s+my\s+app\s+and\s+connect\s+it\s+to\s+a\s+Firebase\s+project\.?$/i,
        replace: () => "Настроить Firebase в моём приложении и подключить его к проекту Firebase"
    },
    {
        pattern: /^Add\s+Firebase\s+Authentication\s+with\s+Google\s+sign-in\s+to\s+my\s+app\.?$/i,
        replace: () => "Добавить аутентификацию Firebase со входом через Google в моё приложение"
    },
    {
        pattern: /^Write\s+and\s+audit\s+Firestore\s+security\s+rules\s+for\s+my\s+data\s+model\.?$/i,
        replace: () => "Написать и проверить правила безопасности Firestore для моей модели данных"
    },
    {
        pattern: /^Add\s+a\s+Gemini-powered\s+feature\s+to\s+my\s+app\s+with\s+Firebase\s+AI\s+Logic\.?$/i,
        replace: () => "Добавить функцию на базе Gemini в моё приложение с помощью Firebase AI Logic"
    },
    {
        pattern: /^Deploy\s+my\s+web\s+app\s+with\s+Firebase\s+App\s+Hosting\.?$/i,
        replace: () => "Развернуть моё веб-приложение с помощью Firebase App Hosting"
    },
    {
        pattern: /^(?:Skill|Навык)\s+for\s+converting\s+an\s+installed\s+Firebase\s+Extension.*$/i,
        replace: () => "Навык для преобразования установленного расширения Firebase (или его исходного кода) в отдельную кодовую базу Cloud Functions для Firebase или публикуемый npm-пакет, включая обновление триггеров V1 до V2, хуки жизненного цикла и декларативную безопасность."
    },
    {
        pattern: /^Official\s+skill\s+for\s+integrating\s+Firebase\s+AI\s+Logic\s+\(Gemini\s+API\)\s+into\s+web\s+applications.*$/i,
        replace: () => "Официальный навык для интеграции Firebase AI Logic (Gemini API) в веб-приложения. Охватывает настройку, мультимодальный инференс, структурированный вывод и безопасность."
    },
    {
        pattern: /^Deploys\s+and\s+manages\s+full-stack\s+web\s+applications\s+\(Next\.js,\s*Angular\)\s+with\s+Server-Side\s+Rendering.*$/i,
        replace: () => "Развёртывание и управление full-stack веб-приложениями (Next.js, Angular) с серверным рендерингом (SSR) через Firebase App Hosting (конфигурация apphosting.yaml, секреты, CI/CD с GitHub)."
    },
    {
        pattern: /^Guide\s+for\s+setting\s+up\s+and\s+using\s+Firebase\s+Authentication.*$/i,
        replace: () => "Руководство по настройке и использованию Firebase Authentication. Используйте этот навык, когда приложению требуются вход пользователей, управление аккаунтами или защита доступа к данным."
    },
    {
        pattern: /^Provides\s+foundational\s+Firebase\s+CLI\s+setup,\s*CLI\s+installation.*$/i,
        replace: () => "Базовая настройка и установка Firebase CLI, проверка версий, вход в аккаунт (firebase login), создание и выбор проекта (firebase use), а также скачивание конфигурационных файлов приложения (google-services.json, GoogleService-Info.plist)."
    },
    {
        pattern: /^Comprehensive\s+guide\s+for\s+Firebase\s+Crashlytics,\s*including\s+provisioning\s+and\s+SDK\s+usage.*$/i,
        replace: () => "Полное руководство по Firebase Crashlytics, включая подключение и использование SDK для сбора отчётов о сбоях в приложении."
    },
    {
        pattern: /^Builds\s+and\s+deploys\s+Firebase\s+SQL\s+Connect\s+\(aka\s+Firebase\s+Data\s+Connect\)\s+backends\s+with\s+PostgreSQL.*$/i,
        replace: () => "Создание и безопасное развёртывание бэкендов Firebase SQL Connect (Firebase Data Connect) на базе PostgreSQL: проектирование схем, авторизованные запросы и мутации, обновления в реальном времени и генерация типобезопасных SDK."
    },
    {
        pattern: /^Sets\s+up,\s*manages,\s*queries,\s*and\s+configures\s+Cloud\s+Firestore\s+databases.*$/i,
        replace: () => "Настройка, управление и запросы к базам данных Cloud Firestore (Standard/Enterprise), включая моделирование данных, правила безопасности, индексы и интеграцию SDK (Web, Python, iOS, Android, Flutter)."
    },
    {
        pattern: /^Deploys\s+and\s+configures\s+classic\s+Firebase\s+Hosting\s+for\s+static\s+websites.*$/i,
        replace: () => "Развёртывание и настройка классического Firebase Hosting для статических сайтов, одностраничных приложений (SPA) и микросервисов (кастомные домены, редиректы, заголовки и каналы предпросмотра)."
    },
    {
        pattern: /^Manages\s+Firebase\s+Remote\s+Config\s+templates,\s*feature\s+flags,\s*loading\s+strategies.*$/i,
        replace: () => "Управление шаблонами Firebase Remote Config, фича-флагами, стратегиями загрузки и SDK (Android, iOS), включая версионирование, значения по умолчанию и слушатели в реальном времени."
    },
    {
        pattern: /^Audits\s+Firebase\s+\(Firestore,\s*Cloud\s+Storage\)\s+security\s+rules\s+for\s+vulnerabilities.*$/i,
        replace: () => "Аудит правил безопасности Firebase (Firestore, Cloud Storage) на уязвимости, повышение привилегий, обход ролей, несоответствия при создании/обновлении и проверку владения данными."
    },
    {
        pattern: /^Designs,\s*authors,\s*refactors,\s*and\s+hardens\s+production-grade\s+Cloud\s+Firestore\s+Security\s+Rules.*$/i,
        replace: () => "Проектирование, написание, рефакторинг и укрепление промышленных правил безопасности Cloud Firestore (firestore.rules)."
    },
    {
        pattern: /^Safely\s+modifies\s+Xcode\s+projects\s+\(\.pbxproj\)\s+to\s+add\s+Swift\s+Packages\s+and\s+link\s+files.*$/i,
        replace: () => "Безопасная модификация проектов Xcode (.pbxproj) для добавления пакетов Swift и привязки файлов при установке зависимостей в iOS-проектах (например, Firebase, Alamofire)."
    },
    {
        pattern: /^MANDATORY\s+specialist\s+subagent\s+for\s+Cloud\s+Firestore\s+Security\s+Rules\s+\(firestore\.rules\).*$/i,
        replace: () => "ОБЯЗАТЕЛЬНЫЙ специализированный субагент для правил безопасности Cloud Firestore (firestore.rules). При создании, написании или изменении правил безопасности Firestore делегируйте задачу этому субагенту."
    },
    // --- 2. SCIENCE PLUGIN ---
    {
        pattern: /^Curated\s+collection\s+of\s+agent\s+skills\s+for\s+science\s+tasks\.?$/i,
        replace: () => "Курируемая коллекция навыков агента для научных задач."
    },
    {
        pattern: /^A\s+collection\s+of\s+extensions\s+\(e\.g\.\s+skills\)\s+for\s+scientific\s+research\s+tasks.*$/i,
        replace: () => "Коллекция расширений (навыков) для научно-исследовательских задач, охватывающая геномику, структурную биологию, хемоинформатику, научную литературу и многое другое."
    },
    {
        pattern: /^Each\s+extension\s+provides\s+structured\s+instructions,\s*scripts,\s*and\s+resources\s+that\s+extend\s+Antigravity['’]s\s+capabilities\s+for\s+specialized\s+scientific\s+tasks\.?$/i,
        replace: () => "Каждое расширение содержит структурированные инструкции, скрипты и ресурсы, которые расширяют возможности Antigravity для решения специализированных научных задач."
    },
    {
        pattern: /^We\s+use\s+the\s*$/i,
        replace: () => "Мы используем пакетный менеджер "
    },
    {
        pattern: /^package\s+manager\s+to\s+handle\s+dependencies\.\s*The\s+first\s+time\s+you\s+trigger\s+an\s+extension\s+in\s+the\s+Science\s+Plugin,\s*the\s+agent\s+will\s+ask\s+for\s+approval\s+to\s+install\s*$/i,
        replace: () => " для управления зависимостями. При первом вызове расширения из плагина Science агент запросит подтверждение на установку "
    },
    {
        pattern: /^,\s*and\s+then\s+proceed\s+to\s+respond\s+to\s+your\s+scientific\s+query\s*\/\s*task\.\s*We\s+recommend\s+restarting\s+Antigravity\s+after\s+this\s+first\s+time\s+installation\.?$/i,
        replace: () => ", а затем перейдёт к выполнению вашего научного запроса или задачи. Рекомендуем перезапустить Antigravity после этой первой установки."
    },
    {
        pattern: /^Some\s+skills,\s*such\s+as\s+AlphaGenome,\s*require\s+an\s+API\s+key\s+to\s+function\..*$/i,
        replace: () => "Некоторые навыки, такие как AlphaGenome, требуют API-ключ для работы. Другим, например ClinVar и OpenAlex, API-ключ позволяет повысить лимиты запросов, но они работают и без него. Агент подскажет, как получить API-ключ, и поможет сохранить его в нужное место. Если вы предпочитаете сделать это самостоятельно, выполните в терминале команду: "
    },
    {
        pattern: /^If\s+you\s+want\s+to\s+customize\s+an\s+existing\s+extension\s+or\s+create\s+a\s+new\s+extension\s+of\s+your\s+own,\s*you\s+should\s*$/i,
        replace: () => "Если вы хотите настроить существующее расширение или создать собственное, вам "
    },
    {
        pattern: /^modify\s+the\s+files\s+inside\s+the\s+Science\s+Plugin\s+installation\s+directory.*$/i,
        replace: () => " следует изменять файлы внутри установочной директории плагина Science, так как ваши изменения будут перезаписаны при обновлении плагина. Вместо этого размещайте свои или изменённые расширения в другом месте — например, в личной директории навыков:"
    },
    {
        pattern: /^You\s+can\s+find\s+examples\s+of\s+Science\s+Plugin\s+use\s+cases,\s*including\s+demos,\s*at\s*$/i,
        replace: () => "Примеры сценариев использования плагина Science, включая демоверсии, доступны на "
    },
    {
        pattern: /^All\s+software\s+is\s+licensed\s+under\s+the\s+Apache\s+License,\s*Version\s+2\.0\s*\(Apache\s+2\.0\);\s*you\s+may\s+not\s+use\s+this\s+file\s+except\s+in\s+compliance\s+with\s+the\s+Apache\s+2\.0\s+license\.\s*You\s+may\s+obtain\s+a\s+copy\s+of\s+the\s+Apache\s+2\.0\s+license\s+at:?\s*$/i,
        replace: () => "Всё программное обеспечение лицензировано по лицензии Apache License, Version 2.0 (Apache 2.0); вы можете использовать этот файл только в соответствии с лицензией Apache 2.0. Копию лицензии Apache 2.0 можно получить по адресу: "
    },
    {
        pattern: /^As\s+set\s+out\s+in\s+the\s+attached\s+file\s*[‘'"]?$/i,
        replace: () => "Как указано в прилагаемом файле «"
    },
    {
        pattern: /^[’'"]?\s*certain\s+third\s+party\s+data\s+sources\s+referenced\s+within\s+individual\s+Skill\s+files\s+have\s+their\s+own\s+applicable\s+licenses\s+and\/or\s+terms\s+of\s+use\.\s*See\s+the\s*[‘'"]?$/i,
        replace: () => "», некоторые сторонние источники данных, на которые ссылаются отдельные файлы навыков, имеют собственные применимые лицензии и/или условия использования. Подробности см. в файле «"
    },
    {
        pattern: /^[’'"]?\s*file\s+for\s+more\s+information\.\s*You\s+are\s+responsible\s+for\s+ensuring\s+that\s+your\s+use\s+of\s+individual\s+Skill\s+files\s+complies\s+with\s+any\s+such\s+applicable\s+licenses\/\s*terms\s+of\s+use\.?$/i,
        replace: () => "». Вы несёте ответственность за соблюдение всех применимых лицензий и условий использования при работе с отдельными файлами навыков."
    },
    {
        pattern: /^All\s+other\s+materials\s+are\s+licensed\s+under\s+the\s+Creative\s+Commons\s+Attribution\s+4\.0\s+International\s+License\s+\(CC-BY\)\.\s*You\s+may\s+obtain\s+a\s+copy\s+of\s+the\s+CC-BY\s+license\s+at:?\s*$/i,
        replace: () => "Все остальные материалы лицензированы по лицензии Creative Commons Attribution 4.0 International (CC-BY). Копию лицензии CC-BY можно получить по адресу: "
    },
    {
        pattern: /^Unless\s+required\s+by\s+applicable\s+law\s+or\s+agreed\s+to\s+in\s+writing,\s*all\s+software\s+and\s+materials\s+distributed\s+here.*$/i,
        replace: () => "Если иное не требуется применимым законодательством и не согласовано в письменной форме, всё программное обеспечение и материалы распространяются на условиях «КАК ЕСТЬ» (AS IS), БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ ИЛИ УСЛОВИЙ, явных или подразумеваемых. См. тексты лицензий для ознакомления с конкретными правами и ограничениями."
    },
    {
        pattern: /^Interactive\s+3D\s+biomolecular\s+structure\s+viewer\s+via\s+Mol\*.*$/i,
        replace: () => "Интерактивный 3D-просмотрщик биомолекулярных структур на базе Mol*. Отображает трёхмерные молекулярные структуры из локальных файлов (.cif, .mmcif, .pdb) и управляет 3D-аннотациями."
    },
    {
        pattern: /^Retrieve\s+and\s+analyze\s+AlphaFold\s+predicted\s+structures\s+for\s+a\s+protein.*$/i,
        replace: () => "Получение и анализ предсказанных структур белков AlphaFold по идентификатору UniProt (метрики достоверности pLDDT, границы доменов и оценка неупорядоченности)."
    },
    {
        pattern: /^Constructs\s+deep-links\s+and\s+URLs\s+for\s+the\s+AlphaGenome\s+Atlas\s+website.*$/i,
        replace: () => "Формирование прямых ссылок и URL для сайта AlphaGenome Atlas: просмотр одиночных вариантов, геномных локусов, сводных таблиц кандидатов и сравнений предсказаний."
    },
    {
        pattern: /^Analyzes\s+genetic\s+variant\s+effects\s+on\s+gene\s+expression\s+\(RNA-seq\).*$/i,
        replace: () => "Анализ влияния генетических вариантов на экспрессию генов (RNA-seq), доступность хроматина (DNASE), гистоновые метки (ChIP) и факторы транскрипции через AlphaGenome API."
    },
    {
        pattern: /^Score,\s*annotate,\s*and\s+analyze\s+the\s+functional\s+impact\s+of\s+genetic\s+variants\s+using\s+AlphaGenome\s+Variant\s+Impact.*$/i,
        replace: () => "Оценка, аннотирование и анализ функционального влияния генетических вариантов с помощью метрик AlphaGenome Variant Impact (AVI) через AlphaGenome Atlas API."
    },
    {
        pattern: /^Query\s+the\s+ChEMBL\s+database\s+for\s+bioactive\s+molecules,\s*drug\s+targets.*$/i,
        replace: () => "Запросы к базе данных ChEMBL по биоактивным молекулам, мишеням лекарств, данным биоактивности (IC50/Ki), одобренным препаратам и химическим структурам."
    },
    {
        pattern: /^Query\s+ClinicalTrials\.gov\s+via\s+APIv2\..*$/i,
        replace: () => "Поиск клинических исследований на ClinicalTrials.gov через APIv2 по заболеванию, препарату, локации, статусу, фазе или идентификатору NCT ID."
    },
    {
        pattern: /^Use\s+when\s+needing\s+clinical\s+significance,\s*pathogenicity\s+classifications.*$/i,
        replace: () => "Получение данных о клинической значимости, классификации патогенности (Pathogenic, Benign, VUS) и доказательной базы для генетических вариантов человека в ClinVar."
    },
    {
        pattern: /^Instructions\s+for\s+handling\s+API\s+keys\s+and\s+credentials\s+safely.*$/i,
        replace: () => "Инструкции по безопасной работе с API-ключами и учётными данными, проверке их наличия и безопасному запросу недостающих ключей у пользователя."
    },
    {
        pattern: /^Use\s+when\s+you\s+want\s+to\s+look\s+up,\s*map,\s*and\s+search\s+for\s+short\s+genetic\s+variants.*$/i,
        replace: () => "Поиск и сопоставление коротких генетических вариантов (SNP, инделов) в базе dbSNP NCBI по rsID, геномным координатам VCF и строкам HGVS."
    },
    {
        pattern: /^Query\s+and\s+search\s+the\s+EMBL-EBI\s+Ontology\s+Lookup\s+Service\s+\(OLS\).*$/i,
        replace: () => "Поиск и навигация по биомедицинским терминам, определениям и иерархиям в более чем 250 онтологиях (GO, DOID, HP) через EMBL-EBI OLS."
    },
    {
        pattern: /^Query\s+the\s+ENCODE\s+Registry\s+of\s+cis-Regulatory\s+Elements\s+\(cCREs\).*$/i,
        replace: () => "Запросы к реестру цис-регуляторных элементов ENCODE (cCREs) через SCREEN GraphQL API и к порталу ENCODE REST API для получения экспериментальных данных по типам клеток."
    },
    {
        pattern: /^Query\s+the\s+Ensembl\s+database\s+to\s+resolve\s+gene,\s*transcript,\s*and\s+protein\s+IDs.*$/i,
        replace: () => "Запросы к базе данных Ensembl для сопоставления ID генов, транскриптов и белков, получения последовательностей, структур экзонов и предсказания эффектов вариантов (VEP)."
    },
    {
        pattern: /^Performs\s+3D\s+structural\s+searches\s+of\s+proteins\s+against\s+various\s+databases.*$/i,
        replace: () => "Трёхмерный структурный поиск белков по базам данных (PDB, AlphaFold, CATH, MGnify и др.) с помощью Foldseek API по файлу 3D-координат (.cif, .mmcif, .pdb)."
    },
    {
        pattern: /^Query\s+the\s+Genome\s+Aggregation\s+Database\s+\(gnomAD\).*$/i,
        replace: () => "Запросы к базе данных gnomAD для определения частоты аллелей генетических вариантов, метрик толерантности генов к потере функции (pLI, LOEUF) и структурных вариантов."
    },
    {
        pattern: /^Use\s+when\s+you\s+want\s+to\s+retrieve\s+quantitative\s+RNA\s+expression\s+data\s+and\s+variant\s+eQTL.*$/i,
        replace: () => "Получение количественных данных об экспрессии РНК и информации о вариантах eQTL из проекта GTEx (Genotype-Tissue Expression) по 54 типам здоровых тканей."
    },
    {
        pattern: /^Use\s+when\s+you\s+want\s+to\s+retrieve\s+semi-quantitative\s+protein\s+expression\s+and\s+spatial\s+localisation.*$/i,
        replace: () => "Получение полуколичественных данных об экспрессии белков и их пространственной локализации из базы Human Protein Atlas (HPA)."
    },
    {
        pattern: /^Identify\s+domains,\s*families,\s*and\s+sites\s+in\s+proteins;\s*find\s+all\s+proteins\s+in\s+a\s+family.*$/i,
        replace: () => "Идентификация доменов, семейств и функциональных сайтов в белках, анализ распределения по видам и аннотирование геномов терминами GO с помощью объединённого ресурса InterPro."
    },
    {
        pattern: /^Query\s+the\s+JASPAR\s+database\s+for\s+Transcription\s+Factor\s+\(TF\)\s+binding\s+profiles.*$/i,
        replace: () => "Запросы к базе данных JASPAR для получения профилей связывания факторов транскрипции (TF), частотных и весовых матриц (PFM/PWM) в форматах MEME, TRANSFAC, JASPAR и YAML."
    },
    {
        pattern: /^(?:Search|Поиск)\s+for\s+scientific\s+papers,\s*preprints,\s*and\s+publications\s+on\s+arXiv.*$/i,
        replace: () => "Поиск научных статей, препринтов и публикаций на arXiv: извлечение метаданных, аннотаций и скачивание полных текстов в PDF или HTML."
    },
    {
        pattern: /^Browse,\s*filter,\s*and\s+download\s+life\s+sciences,\s*biology,\s*and\s+medical\s+preprints\s+from\s+bioRxiv\s+and\s+medRxiv.*$/i,
        replace: () => "Просмотр, фильтрация и скачивание препринтов по биологии и медицине с bioRxiv и medRxiv по DOI, диапазону дат, категориям и ключевым словам."
    },
    {
        pattern: /^(?:Search|Поиск)\s+Europe\s+PMC\s+for\s+scientific\s+literature\s+and\s+download\s+open-access\s+full\s+texts.*$/i,
        replace: () => "Поиск научной литературы в Europe PMC, скачивание полных текстов и PDF в открытом доступе по PMCID, получение списков цитирования и библиографии."
    },
    {
        pattern: /^Query\s+the\s+OpenAlex\s+scholarly\s+database\s+for\s+research\s+papers,\s*authors.*$/i,
        replace: () => "Запросы к научной базе OpenAlex по статьям, авторам, институтам, темам и источникам: поиск по DOI, библиометрические показатели (цитирования, h-index) и открытые PDF."
    },
    {
        pattern: /^Retrieve\s+protein\s+and\s+nucleotide\s+sequences\s+from\s+NCBI\s+databases\s+using\s+E-utilities.*$/i,
        replace: () => "Получение белковых и нуклеотидных последовательностей из баз данных NCBI с помощью E-utilities по идентификатору (accession), имени гена, локусу, PubMed ID или номеру патента."
    },
    {
        pattern: /^Query,\s*search,\s*and\s+download\s+data\s+from\s+the\s+openFDA\s+API\s+for\s+drugs,\s*devices.*$/i,
        replace: () => "Запросы и выгрузка данных из openFDA API по лекарствам, медицинским изделиям, продуктам питания и веществам (побочные эффекты, отзывы продукции, маркировка, одобрения FDA)."
    },
    {
        pattern: /^Query\s+Open\s+Targets\s+Platform\s+for\s+target-disease\s+associations,\s*drug\s+target\s+discovery.*$/i,
        replace: () => "Запросы к платформе Open Targets для анализа связей «мишень — заболевание», поиска лекарственных мишеней, оценки безопасности, омиксных доказательств и известных препаратов."
    },
    {
        pattern: /^Use\s+when\s+you\s+want\s+to\s+search\s+for\s+or\s+download\s+experimentally-determined\s+3D\s+structures.*$/i,
        replace: () => "Поиск и скачивание экспериментально определённых 3D-структур биомолекул (белков, нуклеиновых кислот, лигандов) и метаданных экспериментов в базе данных PDB."
    },
    {
        pattern: /^Ancient\s+text\s+restoration,\s*attribution,\s*dating,\s*contextualization,\s*and\s+embedding\s+via\s+Aeneas.*$/i,
        replace: () => "Реставрация, атрибуция, датировка, контекстуализация и эмбеддинг древних текстов и эпиграфических надписей с помощью моделей Aeneas (латынь) и Ithaca (древнегреческий)."
    },
    {
        pattern: /^Performs\s+multiple\s+sequence\s+alignment\s+of\s+proteins\s+with\s+EBI\s+Clustal\s+Omega.*$/i,
        replace: () => "Множественное выравнивание белковых последовательностей (MSA) с помощью EBI Clustal Omega для оценки сходства и консервативности доменов или ключевых остатков."
    },
    {
        pattern: /^Searches\s+for\s+homologous\s+protein\s+sequences\s+using\s+MMseqs2\s+\(fast,\s*default\)\s+or\s+BLAST.*$/i,
        replace: () => "Поиск гомологичных белковых последовательностей с помощью MMseqs2 (быстрый, по умолчанию) или BLAST для определения функции белка по сходству последовательностей."
    },
    {
        pattern: /^Query\s+PubChem,\s*search\s+by\s+name\/CID\/SMILES,\s*retrieve\s+properties.*$/i,
        replace: () => "Запросы к базе PubChem по названию, CID или SMILES: получение физико-химических свойств, поиск по структурному сходству и подструктуре, анализ биоактивности."
    },
    {
        pattern: /^(?:Search|Поиск)\s+PubMed\s+for\s+scientific\s+literature,\s*including\s+published\s+clinical\s+trials.*$/i,
        replace: () => "Поиск научной литературы и клинических исследований в PubMed, загрузка аннотаций и полных текстов, связывание публикаций с биологическими базами данных NCBI и PubChem."
    },
    {
        pattern: /^Visualize,\s*analyze,\s*and\s+render\s+protein\s+and\s+molecular\s+structures\s+using\s+PyMOL.*$/i,
        replace: () => "Визуализация, анализ и рендеринг структур белков и молекул с помощью PyMOL: выравнивание структур, измерение расстояний и контактов, выделение активных центров и окраска по pLDDT."
    },
    {
        pattern: /^Query\s+the\s+QuickGO\s+and\s+Evidence\s*&\s*Conclusion\s+Ontology\s+\(ECO\)\s+REST\s+API.*$/i,
        replace: () => "Запросы к REST API QuickGO и ECO для сопоставления генов с биологическими процессами, молекулярными функциями и клеточными компонентами, а также навигации по иерархии Gene Ontology."
    },
    {
        pattern: /^Query\s+the\s+Reactome\s+database\s+\(Analysis\s+and\s+Content\s+Services\).*$/i,
        replace: () => "Запросы к базе данных Reactome: анализ сигнальных и метаболических путей, обогащение списков генов, участники реакций, иерархия путей и экспорт диаграмм."
    },
    {
        pattern: /^Query\s+the\s+STRING\s+database\s+for\s+protein-protein\s+interactions\s+\(PPIs\).*$/i,
        replace: () => "Запросы к базе данных STRING для анализа белок-белковых взаимодействий (PPI), оценки достоверности связей, поиска партнёров взаимодействия и функционального обогащения."
    },
    {
        pattern: /^Fetch\s+Evolutionary\s+Conservation\s+scores\s+\(phyloP,\s*phastCons\)\s+and\s+Transcription\s+Factor\s+Binding\s+Sites.*$/i,
        replace: () => "Получение оценок эволюционной консервативности (phyloP, phastCons) и сайтов связывания факторов транскрипции (TFBS) из UCSC Genome Browser (проекты ENCODE, JASPAR, ReMap)."
    },
    {
        pattern: /^Queries\s+the\s+UniBind\s+database\s+for\s+experimentally\s+validated\s+transcription\s+factor.*$/i,
        replace: () => "Запросы к базе данных UniBind по экспериментально подтверждённым сайтам связывания факторов транскрипции (TF) и скачивание координат (BED/FASTA) по видам и клеточным линиям."
    },
    {
        pattern: /^Access\s+protein\s+metadata,\s*function,\s*taxonomy,\s*and\s+sequences\s+across\s+UniProtKB.*$/i,
        replace: () => "Доступ к метаданным, функциям, таксономии и последовательностям белков в UniProtKB, UniParc и UniRef: поиск белков, сопоставление идентификаторов и функциональные аннотации."
    },
    {
        pattern: /^Checks\s+whether\s+the\s+uv\s+Python\s+package\s+manager\s+is\s+installed\s+and\s+installs\s+it\s+if\s+missing.*$/i,
        replace: () => "Проверяет наличие пакетного менеджера Python uv в системе, устанавливает его при отсутствии и проверяет доступность в PATH."
    },
    {
        pattern: /^Distills\s+a\s+completed\s+user\s+workflow\s+or\s+interaction\s+into\s+a\s+reusable\s+agent\s+skill.*$/i,
        replace: () => "Преобразует выполненный рабочий процесс или многошаговое взаимодействие пользователя в переиспользуемый навык агента."
    },
    // --- 3. GOOGLE DEVELOPER KNOWLEDGE PLUGIN ---
    {
        pattern: /^"?Look\s+up\s+the\s+exact(?:\s+`?gcloud`?\s+CLI\s+command\s+and\s+IAM\s+roles\s+needed\s+to\s+deploy\s+a\s+Cloud\s+Run\s+service\s+with\s+Secret\s+Manager\.?|\s*)$/i,
        replace: (m) => /clouds+run/i.test(m[0])
            ? (m[0].startsWith('"') ? "«Найди точную команду gcloud CLI и роли IAM, необходимые для развёртывания сервиса Cloud Run с Secret Manager.»" : "Найди точную команду gcloud CLI и роли IAM, необходимые для развёртывания сервиса Cloud Run с Secret Manager")
            : "«Найди точную команду "
    },
    {
        pattern: /^CLI\s+command\s+and\s+IAM\s+roles\s+needed\s+to\s+deploy\s+a\s+Cloud\s+Run\s+service\s+with\s+Secret\s+Manager\.?"?$/i,
        replace: () => " CLI и роли IAM, необходимые для развёртывания сервиса Cloud Run с Secret Manager.»"
    },
    {
        pattern: /^"?(?:Search|Поиск)\s+official\s+Google\s+documentation\s+for\s+how\s+to\s+implement\s+structured\s+outputs\s+with\s+the\s+Gemini\s+API\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Найди в официальной документации Google, как реализовать структурированный вывод с помощью Gemini API.»"
            : "Найди в официальной документации Google, как реализовать структурированный вывод с помощью Gemini API"
    },
    {
        pattern: /^"?Compare\s+Cloud\s+Run,\s*GKE\s+Autopilot,\s*and\s+App\s+Engine\s+based\s+on\s+official\s+Google\s+Cloud\s+architecture\s+guides\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Сравни Cloud Run, GKE Autopilot и App Engine на основе официальных архитектурных руководств Google Cloud.»"
            : "Сравни Cloud Run, GKE Autopilot и App Engine на основе официальных архитектурных руководств Google Cloud"
    },
    {
        pattern: /^"?What\s+are\s+the\s+latest\s+Compose\s+navigation\s+best\s+practices\s+according\s+to\s+official\s+Android\s+developer\s+docs\?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Каковы актуальные лучшие практики навигации в Compose согласно официальной документации для разработчиков Android?»"
            : "Каковы актуальные лучшие практики навигации в Compose согласно официальной документации для разработчиков Android?"
    },
    {
        pattern: /^Equip\s+your\s+agent\s+with\s+direct\s+access\s+to\s+Google['’]s\s+official\s+developer\s+documentation\s+and\s+knowledge\s+base.*$/i,
        replace: () => "Обеспечьте своего агента прямым доступом к официальной документации и базе знаний Google для разработчиков. Ищите документацию, загружайте полные справочные страницы и получайте точные ответы по всей экосистеме Google."
    },
    {
        pattern: /^plugin\s+connects\s+your\s+coding\s+agent\s+to\s+the\s+official\s*$/i,
        replace: () => " подключает вашего кодинг-агента к официальному "
    },
    {
        pattern: /^and\s+Model\s+Context\s+Protocol\s+\(MCP\)\s+server\.\s*Instead\s+of\s+relying\s+on\s+model\s+training\s+cutoffs.*$/i,
        replace: () => " и серверу Model Context Protocol (MCP). Вместо того чтобы полагаться на устаревшие обучающие данные модели или непроверенные результаты веб-поиска, ваш агент может напрямую запрашивать авторитетную документацию по следующим направлениям:"
    },
    {
        pattern: /^Using\s+the\s+Google\s+Developer\s+Knowledge\s+API\s+and\s+MCP\s+server\s+requires\s+a\s+Google\s+Cloud\s+project\s+with\s+the\s*$/i,
        replace: () => "Для использования Google Developer Knowledge API и MCP-сервера требуется проект Google Cloud с включённым "
    },
    {
        pattern: /^\)\s*enabled\.\s*You\s+can\s+authenticate\s+using\s+either\s*$/i,
        replace: () => "). Вы можете аутентифицироваться с помощью "
    },
    {
        pattern: /^or\s+an\s*$/i,
        replace: () => " или "
    },
    {
        pattern: /^Enable\s+the\s+API\s+on\s+your\s+Google\s+Cloud\s+project\s+using\s+the\s*$/i,
        replace: () => "Включите API в вашем проекте Google Cloud с помощью "
    },
    {
        pattern: /^or\s+the\s*$/i,
        replace: () => " или "
    },
    {
        pattern: /^The\s+bundled\s*$/i,
        replace: () => "Встроенная конфигурация MCP-сервера "
    },
    {
        pattern: /^MCP\s+server\s+configuration\s+uses\s+local\s+Google\s+Cloud\s+Application\s+Default\s+Credentials\s*\($/i,
        replace: () => " автоматически использует локальные стандартные учётные данные приложения Google Cloud ("
    },
    {
        pattern: /^\)\s*automatically:$/i,
        replace: () => "):"
    },
    {
        pattern: /^Ensure\s+your\s+account\s+has\s+the\s*$/i,
        replace: () => "Убедитесь, что у вашего аккаунта есть IAM-роль "
    },
    {
        pattern: /^\)\s*IAM\s+role\s+on\s*$/i,
        replace: () => ") в проекте "
    },
    {
        pattern: /^Alternatively,\s*create\s+an\s+API\s+key\s+in\s+the\s*$/i,
        replace: () => "В качестве альтернативы создайте API-ключ на "
    },
    {
        pattern: /^\(restricted\s+to\s+the\s*$/i,
        replace: () => " (ограниченный использованием "
    },
    {
        pattern: /^\)\s*and\s+export\s+it\s+in\s+your\s+environment\s+for\s+the\s+skill['’]s\s+REST\s+API\s+fallback:$/i,
        replace: () => ") и экспортируйте его в переменные окружения для резервного доступа навыка через REST API:"
    },
    {
        pattern: /^To\s+authenticate\s+the\s+remote\s+MCP\s+server\s+directly\s+with\s+an\s+API\s+key\s+instead\s+of\s+ADC,\s*configure\s+the\s*$/i,
        replace: () => "Чтобы аутентифицировать удалённый MCP-сервер напрямую с помощью API-ключа вместо ADC, укажите заголовок "
    },
    {
        pattern: /^header\s+in\s+your\s+MCP\s+server\s+configuration:$/i,
        replace: () => " в конфигурации вашего MCP-сервера:"
    },
    {
        pattern: /^Remote\s+MCP\s+Server\s*\($/i,
        replace: () => "Удалённый MCP-сервер ("
    },
    {
        pattern: /^Connects\s+to\s*$/i,
        replace: () => "Подключается к "
    },
    {
        pattern: /^and\s+provides\s+tools\s+for\s+documentation\s+retrieval:$/i,
        replace: () => " и предоставляет инструменты для получения документации:"
    },
    {
        pattern: /^:\s*Ask\s+natural-language\s+technical\s+questions\s+and\s+receive\s+synthesized\s+answers.*$/i,
        replace: () => ": Задавайте технические вопросы на естественном языке и получайте сводные ответы на основе официальной документации Google со ссылками на источники."
    },
    {
        pattern: /^:\s*(?:Search|Поиск)\s+across\s+official\s+Google\s+developer\s+documentation\s+for\s+matching\s+pages\s+and\s+snippets\.?$/i,
        replace: () => ": Ищите подходящие страницы и фрагменты по всей официальной документации Google для разработчиков."
    },
    {
        pattern: /^:\s*Fetch\s+the\s+full\s+Markdown\s+content\s+of\s+one\s+or\s+more\s+documentation\s+pages.*$/i,
        replace: () => ": Загружайте полное содержимое одной или нескольких страниц документации в формате Markdown по имени документа (принимает до 20 имён документов за один вызов)."
    },
    {
        pattern: /^Agent\s+Skill\s*\($/i,
        replace: () => "Навык агента ("
    },
    {
        pattern: /^Provides\s+structured\s+workflows\s+and\s+domain\s+filter\s+guidance\s+so\s+the\s+agent\s+selects\s+the\s+best\s+query\s+strategy.*$/i,
        replace: () => "Предоставляет структурированные рабочие процессы и правила фильтрации доменов, чтобы агент выбирал оптимальную стратегию запросов, ограничивал поиск нужными продуктами Google, проверял версионно-зависимые детали API и корректно использовал резервный режим."
    },
    {
        pattern: /^Searches,\s*retrieves,\s*and\s+synthesizes\s+official\s+Google\s+developer\s+documentation\s+across\s+Google\s+Cloud.*$/i,
        replace: () => "Ищет, извлекает и обобщает официальную документацию Google для разработчиков по Google Cloud, AI/Gemini, Android, Chrome, Web, Flutter, Go, Firebase и другим платформам через MCP-сервер Developer Knowledge или резервный REST API."
    },
    // --- 4. MODERN WEB GUIDANCE PLUGIN ---
    {
        pattern: /^Audit\s+this\s+project\s+for\s+modern\s+web\s+best\s+practices\s+and\s+modernization\s+opportunities\.?$/i,
        replace: () => "Провести аудит этого проекта на соответствие современным веб-практикам и найти возможности для модернизации"
    },
    {
        pattern: /^What\s+is\s+the\s+recommended\s+modern\s+way\s+to\s+implement\s+responsive\s+dialogs\s+and\s+popovers\?$/i,
        replace: () => "Каков рекомендуемый современный способ реализации адаптивных диалоговых окон и поповеров?"
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+Chrome\s+Extension\s+with\s+a\s+side\s+panel\s+using\s+Manifest\s+V3\s+best\s+practices\.?$/i,
        replace: () => "Создать расширение Chrome с боковой панелью по лучшим практикам Manifest V3"
    },
    {
        pattern: /^is\s+a\s+set\s+of\s+skills\s+that\s+embed\s+web\s+platform\s+expertise,\s*best\s+practices,\s*and\s+browser\s+compatibility\s+data\s+directly\s+into\s+your\s+coding\s+agents.*$/i,
        replace: () => " — это набор навыков, встраивающих экспертизу по веб-платформе, лучшие практики и данные о совместимости браузеров прямо в ваших кодинг-агентов. Он помогает направлять агентов от устаревших подходов к решениям, использующим всю мощь и возможности современной веб-платформы."
    },
    {
        pattern: /^Supported\s+by\s+the\s+Google\s+Chrome\s+team,\s*the\s+Microsoft\s+Edge\s+team,\s*and\s+the\s+web\s+development\s+community\.?$/i,
        replace: () => "Поддерживается командами Google Chrome, Microsoft Edge и сообществом веб-разработчиков."
    },
    {
        pattern: /^This\s+is\s+a\s*$/i,
        replace: () => "Это "
    },
    {
        pattern: /^preview\s+release$/i,
        replace: () => "предварительный релиз (preview)"
    },
    {
        pattern: /^of\s+Modern\s+Web\s+Guidance\.\s*We['’]re\s+actively\s+adding\s+new\s+content\s+and\s+we\s*$/i,
        replace: () => " Modern Web Guidance. Мы активно добавляем новый контент и "
    },
    {
        pattern: /^welcome\s+contributions\s+or\s+feedback\s+on\s+GitHub$/i,
        replace: () => "будем рады вашему вкладу и отзывам на GitHub"
    },
    {
        pattern: /^Coding\s+agents\s+often\s+default\s+to\s+older\s+patterns\s+because\s+LLM\s+training\s+data\s+contains\s+vast\s+amounts\s+of\s+legacy\s+code.*$/i,
        replace: () => "Кодинг-агенты часто по умолчанию используют устаревшие подходы, поскольку обучающие данные LLM содержат огромное количество старого кода. Это нередко приводит к генерации громоздкого JavaScript для задач, у которых уже есть нативные, высокопроизводительные решения веб-платформы."
    },
    {
        pattern: /^Even\s+if\s+a\s+model\s+knows\s+an\s+API\s+exists,\s*it\s+often\s+lacks\s+the\s+density\s+of\s+real-world,\s*modern\s+implementation\s+patterns\s+required\s+for\s+production-ready\s+code\.?$/i,
        replace: () => "Даже если модель знает о существовании API, ей часто не хватает концентрации реальных современных паттернов реализации, необходимых для промышленного кода."
    },
    {
        pattern: /^Modern\s+Web\s+Guidance\s+bridges\s+this\s+gap\.$/i,
        replace: () => "Modern Web Guidance устраняет этот пробел."
    },
    {
        pattern: /^Our\s+skill['’]s\s+CLI\s+returns\s+targeted,\s*expert-curated\s+guidelines\s+directly\s+into\s+your\s+agent['’]s\s+context\s+window,\s*focusing\s+on:$/i,
        replace: () => "CLI нашего навыка возвращает точечные, проверенные экспертами руководства прямо в контекстное окно вашего агента, фокусируясь на:"
    },
    {
        pattern: /^:\s*Helping\s+models\s+correctly\s+structure\s+APIs\s+they\s+frequently\s+misuse\.?$/i,
        replace: () => ": Помогает моделям правильно структурировать API, которые они часто используют некорректно."
    },
    {
        pattern: /^:\s*Preferring\s+platform-level\s+APIs\s+that\s+can\s+be\s+optimized\s+by\s+the\s+browser\s+and\s+include\s+built-in\s+accessibility\s+affordances\.?$/i,
        replace: () => ": Отдаёт приоритет API уровня платформы, которые оптимизируются браузером и включают встроенные механизмы доступности."
    },
    {
        pattern: /^:\s*Guiding\s+models\s+to\s+use\s+sensible,\s*lightweight\s+fallbacks\s+instead\s+of\s+heavy\s+polyfills\s+or\s+legacy\s+libraries\.?$/i,
        replace: () => ": Направляет модели к использованию разумных легковесных фолбэков вместо тяжёлых полифилов или устаревших библиотек."
    },
    {
        pattern: /^We\s+cover\s+the\s+past\s+several\s+years\s+of\s+the\s+web\s+platform['’]s\s+new\s+features,\s*all\s+the\s+way\s+up\s+to\s+the\s+cutting\s+edge\.\s*The\s+guides\s+are\s*$/i,
        replace: () => "Мы охватываем новые возможности веб-платформы за последние несколько лет, вплоть до самых передовых технологий. Руководства "
    },
    {
        pattern: /^designed\s+to\s+be\s+token-efficient$/i,
        replace: () => "спроектированы для максимальной экономии токенов"
    },
    {
        pattern: /^;\s*we\s+run\s+evals\s+enabling\s+us\s+to\s+prune\s+lowest-common-denominator\s+content\s+that\s+models\s+already\s+know\.?$/i,
        replace: () => "; мы проводим оценки (evals), позволяющие отсекать очевидный базовый контент, который модели уже знают."
    },
    {
        pattern: /^Smooth\s+visual\s+states\s+\(View\s+Transitions,\s*entry\/exit\s+animations,\s*parallax\s+scroll,\s*CSS\s*$/i,
        replace: () => "Плавные визуальные состояния (View Transitions, анимации появления/скрытия, параллакс-скролл, CSS "
    },
    {
        pattern: /^Modern\s+layout\s+systems\s+\(container\s+queries,\s*$/i,
        replace: () => "Современные системы вёрстки (контейнерные запросы, "
    },
    {
        pattern: /^,\s*modern\s+color\s+spaces\s+like\s*$/i,
        replace: () => ", современные цветовые пространства вроде "
    },
    {
        pattern: /^,\s*text-wrap\s+tuning,\s*and\s+line-height\s+trimming\)\.?$/i,
        replace: () => ", настройка переноса текста и подрезка высоты строки)."
    },
    {
        pattern: /^Speed\s+optimizations\s+\(instant\s+preloading,\s*Interaction\s+to\s+Next\s+Paint\s+\(INP\)\s+diagnostics,\s*and\s+scheduling\s+tasks\s+via\s*$/i,
        replace: () => "Оптимизации скорости (мгновенная предзагрузка, диагностика Interaction to Next Paint (INP) и планирование задач через "
    },
    {
        pattern: /^Native\s+components\s+\(Anchor\s+Positioning\s+for\s+tooltips,\s*Popover\s+API,\s*dialogs,\s*$/i,
        replace: () => "Нативные компоненты (Anchor Positioning для тултипов, Popover API, диалоги, валидация "
    },
    {
        pattern: /^validation,\s*and\s+auto-sizing\s+fields\)\.?$/i,
        replace: () => " и авторазмер полей ввода)."
    },
    {
        pattern: /^Important\s+considerations\s+\(screen\s+reader\s+and\s+keyboard\s+operability,\s*content\s+navigation\s+and\s+discoverability\)\.?$/i,
        replace: () => "Важные аспекты доступности (работа со скринридерами и клавиатурой, навигация по контенту и его обнаруживаемость)."
    },
    {
        pattern: /^Local\s+client\s+models\s+\(native\s+translation,\s*summarization,\s*and\s+language\s+detection\s+APIs\)\.?$/i,
        replace: () => "Локальные клиентские модели (нативные API перевода, суммаризации и определения языка)."
    },
    {
        pattern: /^(?:View|Просмотр)\s+an\s+example:?$/i,
        replace: () => "Пример:"
    },
    {
        pattern: /^:\s*We\s+distinguish\s+between\s+purely\s+additive\s+enhancements.*$/i,
        replace: () => ": Мы различаем чисто аддитивные улучшения (такие как спекулятивная предзагрузка), которые старые браузеры могут безопасно игнорировать, и критически важное поведение (элементы управления диалогами или сетевые маяки), для которого мы пишем продуманные легковесные фолбэки."
    },
    {
        pattern: /^:\s*We\s+prioritize\s+lightweight,\s*case-specific\s+custom\s+fallbacks\s+\(<50\s+LOC\).*$/i,
        replace: () => ": Мы отдаём приоритет легковесным специализированным фолбэкам (<50 строк кода) или условно подгружаемым полифилам вместо тяжёлых сторонних бандлов."
    },
    {
        pattern: /^:\s*We\s+document\s+hidden\s+platform\s+limitations,\s*such\s+as\s+the\s+64KB\s+payload\s+quota\s+for\s*$/i,
        replace: () => ": Мы документируем скрытые ограничения платформы, такие как квота 64 КБ полезной нагрузки для "
    },
    {
        pattern: /^or\s+macOS-specific\s+scrollbar\s+behaviors\.?$/i,
        replace: () => " или специфичное для macOS поведение полос прокрутки."
    },
    {
        pattern: /^:\s*We\s+leverage\s+real-time\s+compatibility\s+data\s+from\s+the\s*$/i,
        replace: () => ": Мы используем актуальные данные о совместимости из проекта "
    },
    {
        pattern: /^project\s+so\s+agents\s+can\s+dynamically\s+adapt\s+to\s+current\s+browser\s+support\s+and\s+any\s+browser\s+support\s+preferences\.?$/i,
        replace: () => ", чтобы агенты могли динамически адаптироваться к текущей поддержке браузеров и заданным требованиям совместимости."
    },
    {
        pattern: /^:\s*The\s+coding\s+agent\s+activates\s+the\s*$/i,
        replace: () => ": Кодинг-агент активирует навык "
    },
    {
        pattern: /^skill\s+because\s+of\s+a\s+relevant\s+task\.\s*The\s+agent\s+is\s+instructed\s+to\s+use\s+the\s*$/i,
        replace: () => " при появлении релевантной задачи. Агент получает инструкцию использовать CLI "
    },
    {
        pattern: /^CLI\s+for\s+web\s+platform\s+queries\.?$/i,
        replace: () => " для запросов по веб-платформе."
    },
    {
        pattern: /^:\s*The\s+agent\s+runs\s*$/i,
        replace: () => ": Агент выполняет команду "
    },
    {
        pattern: /^\.\s*The\s+tool\s+matches\s+the\s+query\s+to\s+the\s+best\s+guide\s+using\s+an\s+offline,\s*CPU-efficient\s+TensorFlow\.js\s+model\s+\(no\s+network\s+calls,\s*no\s+API\s+keys\)\.?$/i,
        replace: () => ". Инструмент сопоставляет запрос с лучшим руководством с помощью офлайн-модели TensorFlow.js, эффективной для процессора (без сетевых вызовов и API-ключей)."
    },
    {
        pattern: /^:\s*The\s+agent\s+retrieves\s+the\s+guide\s+via\s*$/i,
        replace: () => ": Агент загружает руководство через "
    },
    {
        pattern: /^,\s*inserting\s+targeted\s+code\s+patterns,\s*gotchas,\s*and\s+fallbacks\s+directly\s+into\s+its\s+context\s+window\.?$/i,
        replace: () => ", вставляя целевые паттерны кода, подводные камни и фолбэки прямо в своё контекстное окно."
    },
    {
        pattern: /^Note:\s*We\s+use\s*$/i,
        replace: () => "Примечание: мы используем "
    },
    {
        pattern: /^to\s+ensure\s+the\s+content\s+doesn['’]t\s+go\s+stale,\s*but\s+the\s+CLI\s+works\s+offline,\s*completely\s+private\s+and\s+local\.\s*The\s+npm\s+package\s+is\s+self-contained,\s*with\s+no\s+extra\s+dependencies\s+to\s+ensure\s+both\s+low-latency\s+and\s+supply-chain\s+security\.?$/i,
        replace: () => ", чтобы контент не устаревал, однако сам CLI работает офлайн, полностью приватно и локально. Пакет npm самодостаточен и не имеет внешних зависимостей, что обеспечивает минимальную задержку и безопасность цепочки поставок."
    },
    {
        pattern: /^We\s+developed\s+a\s+robust\s+eval\s+harness\s+to\s+ensure\s+that\s+the\s+content\s+is\s*$/i,
        replace: () => "Мы разработали надёжную систему тестирования (eval harness), гарантирующую, что контент "
    },
    {
        pattern: /^empirically\s+proven\s+and\s+continuously\s+calibrated$/i,
        replace: () => "эмпирически проверен и непрерывно калибруется"
    },
    {
        pattern: /^to\s+ensure\s+AI\s+agents\s+write\s+better\s+code\.\s*We\s+run\s+automated\s+evaluations\s+using\s+a\s+closed-loop\s+validation\s+pipeline:$/i,
        replace: () => ", помогая ИИ-агентам писать более качественный код. Мы запускаем автоматизированные проверки с использованием замкнутого конвейера валидации:"
    },
    {
        pattern: /^:\s*We\s+define\s+realistic,\s*developer\s+prompts\s+that\s+mimic\s+real-world\s+requests.*$/i,
        replace: () => ": Мы формируем реалистичные запросы разработчиков, имитирующие практические задачи (например, «сделай так, чтобы изображения загружались быстрее»). В запросах специально не называются конкретные API или функции — так проверяется, сможет ли агент самостоятельно найти нужные руководства."
    },
    {
        pattern: /^:\s*We\s+write\s+browser\s+automation\s+scripts\s+that\s+verify\s+the\s+guide\s+was\s+followed\s+correctly.*$/i,
        replace: () => ": Мы пишем скрипты браузерной автоматизации, проверяющие точное соблюдение руководства: реальное поведение во время выполнения, вычисленные стили, состояния доступности и т.д."
    },
    {
        pattern: /^:\s*Graders\s+are\s+calibrated\s+against\s+both\s+a\s+reference\s+implementation\s+\(100%\s+pass\s+target\).*$/i,
        replace: () => ": Грейдеры калибруются как на эталонной реализации (цель — 100% прохождение), так и на контрольной странице с антипаттерном (цель — 0% прохождение). При сбоях агент автоматически дорабатывает тесты."
    },
    {
        pattern: /^:\s*We\s+measure\s+coding\s+agent\s+performance\s+on\s+real\s+tasks\s+with\s+and\s+without\s+guidance\.\s*The\s*$/i,
        replace: () => ": Мы измеряем эффективность кодинг-агентов на реальных задачах с использованием навыка и без него. Ключевые метрики — "
    },
    {
        pattern: /^opportunity$/i,
        replace: () => "потенциал роста (opportunity)"
    },
    {
        pattern: /^\(100%\s*-\s*unguided\s+pass\s+rate\)\s+and\s*$/i,
        replace: () => " (100% − доля успешных прохождений без навыка) и "
    },
    {
        pattern: /^uplift$/i,
        replace: () => "прирост (uplift)"
    },
    {
        pattern: /^\(guided\s*-\s*unguided\s+pass\s+rate\)\s+are\s+key\..*$/i,
        replace: () => " (разница успешных прохождений с навыком и без него). Если потенциал роста невелик, значит модели уже отлично справляются сами. На основе результатов мы дорабатываем руководства для максимизации прироста."
    },
    {
        pattern: /^Google\s+collects\s+anonymous\s+usage\s+information\s+to\s+improve\s+the\s+tool['’]s\s+reliability,\s*relevance,\s*and\s+performance.*$/i,
        replace: () => "Google собирает анонимную статистику использования для повышения надёжности, релевантности и производительности инструмента. Собираемая информация включает количество установок, имя вызывающего агента, идентификаторы запрошенных руководств и поисковые запросы к CLI (например, «dark mode scrollbar color-scheme»). Исходные промпты пользователя не собираются. Вы можете проверить, какие данные собираются, в файле "
    },
    {
        pattern: /^(?:set\s+the|Установите\s+для\s+переменной\s+окружения)\s*$/i,
        replace: () => "установите переменную окружения "
    },
    {
        pattern: /^env\s+variable\s+in\s+your\s+shell\s+profile\s+\(e\.g\.,\s*$/i,
        replace: () => " в профиле вашей командной оболочки (например, "
    },
    {
        pattern: /^Google\s+handles\s+this\s+data\s+in\s+accordance\s+with\s+the\s*$/i,
        replace: () => "Google обрабатывает эти данные в соответствии с "
    },
    {
        pattern: /^Google\s+Privacy\s+Policy$/i,
        replace: () => "Политикой конфиденциальности Google"
    },
    {
        pattern: /^If\s+you['’]d\s+like\s+to\s+contribute\s+to\s+modern-web-guidance,\s*please\s+see\s+the\s*$/i,
        replace: () => "Если вы хотите внести вклад в развитие modern-web-guidance, ознакомьтесь с файлом "
    },
    {
        pattern: /^source\s+repo['’]s\s*$/i,
        replace: () => "исходного репозитория "
    },
    {
        pattern: /^\.\s*The\s*$/i,
        replace: () => ". Репозиторий "
    },
    {
        pattern: /^repo\s+is\s+purely\s+a\s+publish\s+target\s+for\s+clean\s+skills\s+installation\.?$/i,
        replace: () => " служит исключительно целевым репозиторием публикации для чистой установки навыков."
    },
    {
        pattern: /^Portions\s+of\s+the\s+documentation\s+in\s+this\s+project\s+are\s+derived\s+from\s*$/i,
        replace: () => "Часть документации в этом проекте основана на материалах "
    },
    {
        pattern: /^by\s+Mozilla\s+Contributors\s+and\s*$/i,
        replace: () => " от участников сообщества Mozilla, а также на спецификациях "
    },
    {
        pattern: /^,\s*and\s*$/i,
        replace: () => " и "
    },
    {
        pattern: /^specifications\.?$/i,
        replace: () => "."
    },
    // --- 5. GOOGLE MAPS PLATFORM PLUGIN ---
    {
        pattern: /^A\s+collection\s+of\s+skills\s+for\s+architecting\s+and\s+implementing\s+production-ready\s+code\s+using\s+Google\s+Map.*$/i,
        replace: () => "Набор навыков для проектирования и реализации готового к продакшену кода с использованием API и SDK Google Maps Platform (карты, места, адреса, геокодирование, маршруты/ETA, Street View, 3D-карты и данные об окружающей среде)."
    },
    // --- 6. DART AND FLUTTER PLUGIN ---
    {
        pattern: /^(?:Build|Сборка)\s+a\s+responsive\s+Flutter\s+layout\s+that\s+adapts\s+across\s+mobile,\s*tablet,\s*and\s+desktop\s+form\s+factors\.?$/i,
        replace: () => "Создать адаптивный макет Flutter, подстраивающийся под экраны телефонов, планшетов и компьютеров"
    },
    {
        pattern: /^Write\s+a\s+widget\s+test\s+using\s+WidgetTester\s+to\s+verify\s+UI\s+rendering\s+and\s+user\s+interactions\.?$/i,
        replace: () => "Написать тест виджета с использованием WidgetTester для проверки рендеринга UI и действий пользователя"
    },
    {
        pattern: /^Audit\s+my\s+app\s+for\s+accessibility\.?$/i,
        replace: () => "Провести аудит моего приложения на доступность (accessibility)"
    },
    {
        pattern: /^Diagnose\s+and\s+fix\s+layout\s+overflows\s+or\s+constraint\s+issues\s+in\s+this\s+Flutter\s+widget\.?$/i,
        replace: () => "Диагностировать и исправить переполнение макета (overflow) или ошибки ограничений в этом виджете Flutter"
    },
    {
        pattern: /^The\s+official\s+plugin\s+for\s+Dart\s+and\s+Flutter\s+maintained\s+by\s+the\s+Flutter\s+team\.?$/i,
        replace: () => "Официальный плагин для Dart и Flutter, поддерживаемый командой Flutter."
    },
    {
        pattern: /^This\s+plugin\s+is\s+designed\s+to\s+extend\s+AI\s+agent\s+capabilities\s+for\s+Flutter\s+development.*$/i,
        replace: () => "Этот плагин создан для расширения возможностей ИИ-агентов при разработке на Flutter. Он объединяет навыки, конфигурацию MCP-сервера и правила, предоставляя специализированные рабочие процессы и инструкции для типовых задач разработки на Dart и Flutter. Экспертные знания предметной области помогают радикально сократить количество ошибок и гарантировать надёжное выполнение задач по лучшим практикам."
    },
    {
        pattern: /^Write\s+and\s+organize\s+unit\s+tests\s+for\s+functions,\s*methods,\s*and\s+classes\s+using\s+`?package:test`?.*$/i,
        replace: () => "Написание и организация модульных (unit) тестов для функций, методов и классов с использованием `package:test` для защиты кода от регрессий."
    },
    {
        pattern: /^Architectural\s+patterns,\s*entrypoint\s+structure,\s*exit\s+codes,\s*stream\s+routing,\s*and\s+subprocess\s+spawning\s+for\s+D.*$/i,
        replace: () => "Архитектурные паттерны, структура точки входа, коды возврата, маршрутизация потоков и запуск подпроцессов для консольных (CLI) приложений на Dart (`package:args`)."
    },
    {
        pattern: /^Collect\s+coverage\s+using\s+the\s+coverage\s+packa?ge\s+and\s+create\s+an\s+LCOV\s+report\.?$/i,
        replace: () => "Сбор данных о покрытии кода тестами с помощью пакета `coverage` и формирование отчёта в формате LCOV."
    },
    {
        pattern: /^Uses\s+get_runtime_errors\s+and\s+lsp\s+to\s+fetch\s+an\s+active\s+stack\s+trace,\s*locate\s+the\s+failing\s+line.*$/i,
        replace: () => "Использует `get_runtime_errors` и LSP для получения активного стектрейса, поиска проблемной строки, внесения исправления и проверки через `hot_reload`."
    },
    {
        pattern: /^Define\s+and\s+generate\s+mock\s+objects\s+for\s+external\s+dependencies\s+using\s+`?package:mockito`?.*$/i,
        replace: () => "Определение и генерация mock-объектов для внешних зависимостей с помощью `package:mockito` и `build_runner` при модульном тестировании."
    },
    {
        pattern: /^Replace\s+the\s+usage\s+of\s+`?expect`?\s+and\s+similar\s+functions\s+from\s+`?package:matcher`?.*$/i,
        replace: () => "Миграция с `expect` и аналогичных функций из `package:matcher` на современные эквиваленты из `package:checks`."
    },
    {
        pattern: /^Workflow\s+for\s+fixing\s+package\s+version\s+conflicts\.\s*Use\s+this\s+when\s+`?pub\s+get`?\s+fails.*$/i,
        replace: () => "Рабочий процесс разрешения конфликтов версий пакетов при ошибках `pub get`, вызванных несовместимыми зависимостями."
    },
    {
        pattern: /^(?:Execute|Выполнение)\s+`?dart\s+analyze`?\s+to\s+identify\s+warnings\s+and\s+errors,\s*and\s+use\s+`?dart\s+fix\s+--apply`?.*$/i,
        replace: () => "Выполнение `dart analyze` для выявления предупреждений и ошибок и `dart fix --apply` для автоматического исправления замечаний линтера."
    },
    {
        pattern: /^Guides\s+agents\s+in\s+compiling\s+and\s+packaging\s+C\/C\+\+\s+source\s+code\s+into\s+dynamic\s+or\s+static\s+libraries.*$/i,
        replace: () => "Компиляция и упаковка исходного кода C/C++ в динамические или статические библиотеки (Code Assets) с использованием системы хуков Native Assets в Dart (`hook/build.dart`, `hook/link.dart`)."
    },
    {
        pattern: /^How\s+to\s+inject\s+external\s+code\s+examples\s+into\s+Dartdoc\s+using\s+the\s+\{@example\}\s+directive.*$/i,
        replace: () => "Встраивание внешних примеров кода в документацию Dartdoc с помощью директивы `{@example}` и фильтрация через теги `#hide`, `#region` и `#endregion`."
    },
    {
        pattern: /^Guide\s+agents\s+to\s+use\s+`?package:ffigen`?\s+to\s+automatically\s+generate\s+FFI\s+bindings.*$/i,
        replace: () => "Автоматическая генерация FFI-привязок с помощью `package:ffigen` вместо ручного написания `dart:ffi` для интеграций с C/Objective-C/Swift."
    },
    {
        pattern: /^Cross-platform\s+file\s+and\s+directory\s+path\s+manipulation,\s*segment\s+splitting,\s*extension\s+extraction.*$/i,
        replace: () => "Кроссплатформенная работа с путями к файлам и директориям, разделение сегментов и извлечение расширений с помощью `package:path` и `package:file`."
    },
    {
        pattern: /^Applies\s+Dart\s+3\s+pattern\s+matching,\s*switch\s+expressions,\s*and\s+destructuring\s+idiomatically.*$/i,
        replace: () => "Идиоматическое применение сопоставления с образцом (pattern matching), switch-выражений и деструктуризации в Dart 3 для проверки схем данных и алгебраических типов."
    },
    {
        pattern: /^Help\s+users\s+write\s+syntactically\s+and\s+semantically\s+correct\s+primary\s+constructors\s+in\s+Dart.*$/i,
        replace: () => "Написание синтаксически и семантически корректных первичных конструкторов (primary constructors) в Dart и миграция на сокращённый синтаксис конструкторов."
    },
    {
        pattern: /^Rules\s+and\s+formatting\s+guidelines\s+for\s+writing\s+Dart\s+\/\/\/\s+API\s+documentation\s+and\s+doc\s+comments.*$/i,
        replace: () => "Правила и рекомендации по форматированию API-документации и doc-комментариев `///` в соответствии со стандартами Effective Dart."
    },
    {
        pattern: /^Configures\s+Flutter\s+Driver\s+for\s+app\s+interaction\s+and\s+converts\s+MCP\s+actions\s+into\s+permanent\s+integr.*$/i,
        replace: () => "Настройка Flutter Driver для взаимодействия с приложением и преобразование действий MCP в постоянные интеграционные тесты с пакетом `integration_test`."
    },
    {
        pattern: /^Adds\s+interactive\s+widget\s+previews\s+to\s+the\s+project\s+using\s+the\s+previews\.dart\s+system.*$/i,
        replace: () => "Добавление интерактивных превью виджетов в проект с помощью системы `previews.dart` для удобного тестирования UI-компонентов."
    },
    {
        pattern: /^Implement\s+a\s+component-level\s+test\s+using\s+`?WidgetTester`?\s+to\s+verify\s+UI\s+rendering\s+and\s+user\s+interactio.*$/i,
        replace: () => "Реализация компонентного теста виджета с использованием `WidgetTester` для проверки рендеринга UI и пользовательских взаимодействий (нажатий, прокрутки, ввода текста)."
    },
    {
        pattern: /^Architects\s+a\s+Flutter\s+application\s+using\s+the\s+recommended\s+layered\s+approach\s+\(UI,\s*L.*$/i,
        replace: () => "Проектирование архитектуры приложения Flutter с использованием рекомендуемого многослойного подхода (UI, логика, данные) для масштабируемости проекта."
    },
    {
        pattern: /^Use\s+`?LayoutBuilder`?,\s*`?MediaQuery`?,\s*or\s+`?Expanded\/Flexible`?\s+to\s+create\s+a\s+layout\s+that\s+adapts\s+to.*$/i,
        replace: () => "Использование `LayoutBuilder`, `MediaQuery` и `Expanded/Flexible` для создания адаптивных макетов под разные размеры экранов телефонов, планшетов и десктопов."
    },
    {
        pattern: /^Fixes\s+Flutter\s+layout\s+errors\s+\(overflows,\s*unbounded\s+constraints\)\s+using\s+Dart\s+and\s+Flutter\s+MCP\s+tools.*$/i,
        replace: () => "Исправление ошибок вёрстки во Flutter (RenderFlex overflowed, неограниченная высота/ширина) с помощью инструментов Dart и Flutter MCP."
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+model\s+classes\s+with\s+`?fromJson`?\s+and\s+`?toJson`?\s+methods\s+using\s+`?dart:convert`?.*$/i,
        replace: () => "Создание классов моделей данных с методами `fromJson` и `toJson` с использованием `dart:convert` для сериализации JSON."
    },
    {
        pattern: /^Configure\s+`?MaterialApp\.router`?\s+using\s+a\s+package\s+like\s+`?go_router`?\s+for\s+advanced\s+URL-base.*$/i,
        replace: () => "Настройка декларативной маршрутизации `MaterialApp.router` с пакетом `go_router` для навигации по URL, глубоких ссылок (deep linking) и истории браузера."
    },
    {
        pattern: /^Add\s+`?flutter_localizations`?\s+and\s+`?intl`?\s+dependencies,\s*enable\s+["“]generate\s+true["”]\s+in\s+`?pubspec\.yaml`?.*$/i,
        replace: () => "Добавление зависимостей `flutter_localizations` и `intl`, включение генерации в `pubspec.yaml` и создание конфигурации `l10n.yaml` для локализации проекта Flutter."
    },
    {
        pattern: /^Use\s+the\s+`?http`?\s+package\s+to\s+execute\s+GET,\s*POST,\s*PUT,\s*or\s+DELETE\s+requests.*$/i,
        replace: () => "Использование пакета `http` для выполнения запросов GET, POST, PUT и DELETE при обмене данными с REST API."
    },
    {
        pattern: /^Audits\s+Flutter\s+code\s+for\s+accessibility\s+\(a11y\)\.\s*Invoke\s+this\s+agent\s+when\s+you\s+need\s+to\s+review\s+an\s+application.*$/i,
        replace: () => "Аудит кода Flutter на доступность (a11y). Вызывайте этого агента для проверки приложения, пулреквеста или отдельного виджета на проблемы доступности и соответствие стандартам WCAG."
    },
    // --- 7. DATA AGENT KIT PLUGIN ---
    {
        pattern: /^"?(?:Create|Создать|Создано)\s+a\s+PySpark\s+notebook\s+to\s+train\s+a\s+distributed\s+Random\s+Forest\s+model\s+on\s+the\s+BigQuery\s+table(?:\s+`?my_transactions`?\s*"?|\s*)$/i,
        replace: (m) => /my_transactions/i.test(m[0])
            ? (m[0].startsWith('"') ? "«Создай ноутбук PySpark для обучения распределённой модели Random Forest на таблице BigQuery my_transactions»" : "Создать ноутбук PySpark для обучения распределённой модели Random Forest на таблице BigQuery my_transactions")
            : (m[0].startsWith('"') ? "«Создай ноутбук PySpark для обучения распределённой модели Random Forest на таблице BigQuery " : "Создать ноутбук PySpark для обучения распределённой модели Random Forest на таблице BigQuery ")
    },
    {
        pattern: /^"?Find\s+datasets\s+about\s+customer\s+orders\s+in\s+Knowledge\s+Catalog\s+and\s+show\s+their\s+lineage\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Найди наборы данных о заказах клиентов в Knowledge Catalog и покажи их происхождение (lineage)»"
            : "Найти наборы данных о заказах клиентов в Knowledge Catalog и показать их происхождение (lineage)"
    },
    {
        pattern: /^"?(?:Create|Создать|Создано)\s+an\s+Airflow\s+DAG\s+that\s+runs\s+the\s+dedup\s+notebook,\s*the\s+dbt\s+pipeline,\s*and\s+model\s+training\s+every\s+Monday\s+morning\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Создай DAG Airflow, который запускает ноутбук дедупликации, конвейер dbt и обучение модели каждый понедельник утром»"
            : "Создать DAG Airflow, который запускает ноутбук дедупликации, конвейер dbt и обучение модели каждый понедельник утром"
    },
    {
        pattern: /^"?My\s+last\s+Dataflow\s+job\s+failed\.\s*Find\s+the\s+root\s+cause\s+in\s+the\s+logs\s+and\s+propose\s+a\s+fix\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Моя последняя задача Dataflow завершилась сбоем. Найди первопричину в логах и предложи исправление»"
            : "Моя последняя задача Dataflow завершилась сбоем. Найди первопричину в логах и предложи исправление"
    },
    {
        pattern: /^Data\s+Agent\s+Kit\s+is\s+a\s*$/i,
        replace: () => "Data Agent Kit — это "
    },
    {
        pattern: /^plugin\s+that\s+connects\s+your\s+coding\s+agent\s+to\s+15\+\s+Google\s+Data\s+Cloud\s+services.*$/i,
        replace: () => " плагин, который подключает вашего кодинг-агента к более чем 15 сервисам Google Data Cloud, включая BigQuery, Cloud Storage, Spanner, AlloyDB, Managed Service for Apache Spark и Knowledge Catalog."
    },
    {
        pattern: /^Spend\s+your\s+time\s+on\s+insights,\s*not\s+boilerplate\.\s*Describe\s+a\s+data\s+task\s+in\s+plain\s+language.*$/i,
        replace: () => "Тратьте время на аналитику, а не на шаблонный код. Опишите задачу по работе с данными простым языком, и агент возьмёт всю рутину на себя: написание SQL-запросов, создание ноутбуков, генерацию кода конвейеров, настройку ML-процессов и многое другое."
    },
    {
        pattern: /^\(latest\s+LTS\s+recommended\)\.?$/i,
        replace: () => "(рекомендуется последняя LTS-версия)."
    },
    {
        pattern: /^,\s*installed\s+and\s+authenticated:$/i,
        replace: () => ", установленный и авторизованный:"
    },
    {
        pattern: /^Provide\s+any\s+prompt\s+to\s+your\s+agent\s+and\s+it\s+will\s+walk\s+you\s+through\s+configuring\s+Data\s+Agent\s+Kit\.?$/i,
        replace: () => "Отправьте любой запрос вашему агенту, и он пошагово проведёт вас через настройку Data Agent Kit."
    },
    {
        pattern: /^Alternatively,\s*you\s+can\s+manually\s+invoke\s+the\s+Data\s+Agent\s+Kit\s+setup\s+skill:$/i,
        replace: () => "В качестве альтернативы вы можете вручную вызвать навык настройки Data Agent Kit:"
    },
    {
        pattern: /^Restart\s+your\s+agent\s+when\s+prompted\s+to\s+complete\s+the\s+setup\.?$/i,
        replace: () => "Перезапустите агента по запросу для завершения настройки."
    },
    {
        pattern: /^(?:Build|Сборка)\s+pipelines\s+that\s+turn\s+source\s+data\s+into\s+analysis-ready\s+tables.*$/i,
        replace: () => "Создавайте конвейеры, преобразующие исходные данные в готовые для анализа таблицы с проверками качества на каждом этапе. Разрабатывайте трансформации с помощью dbt или Dataform, планируйте рабочие процессы в Managed Service for Apache Airflow и отлаживайте сбои по логам и коду."
    },
    {
        pattern: /^Develop\s+experiments\s+in\s+Jupyter\s+notebooks\s+on\s+local\s+Python\s+or\s+remote\s+Managed\s+Service\s+for\s+Apache\s+Spark\s+kernels.*$/i,
        replace: () => "Проводите эксперименты в ноутбуках Jupyter на локальном Python или удалённых ядрах Managed Service for Apache Spark. Готовьте признаки из BigQuery, обучайте модели в BigQuery ML и планируйте пакетный инференс."
    },
    {
        pattern: /^Explore\s+data\s+across\s+BigQuery,\s*AlloyDB,\s*and\s+Cloud\s+SQL\.\s*Find\s+datasets\s+with\s+Knowledge\s+Catalog.*$/i,
        replace: () => "Исследуйте данные в BigQuery, AlloyDB и Cloud SQL. Находите наборы данных через Knowledge Catalog с учётом метрик качества и происхождения (lineage), а затем стройте визуализации и переиспользуемые модели данных."
    },
    {
        pattern: /^If\s+you\s+see\s*$/i,
        replace: () => "Если вы видите ошибку "
    },
    {
        pattern: /^or\s+other\s+auth\s+errors,\s*ensure\s+you\s+are\s+logged\s+into\s+gcloud\.?$/i,
        replace: () => " или другие ошибки аутентификации, убедитесь, что вы авторизованы в gcloud."
    },
    {
        pattern: /^Exit\s+your\s+agent,\s*run\s*$/i,
        replace: () => "Выйдите из агента, выполните "
    },
    {
        pattern: /^followed\s+by\s*$/i,
        replace: () => ", а затем "
    },
    {
        pattern: /^,\s*then\s+restart\s+your\s+agent\.?$/i,
        replace: () => ", после чего перезапустите агента."
    },
    {
        pattern: /^Your\s+agent\s+can\s+run\s+tools\s+and\s+commands\s+on\s+your\s+behalf\.\s*Apply\s+the\s*$/i,
        replace: () => "Ваш агент может запускать инструменты и команды от вашего имени. Применяйте "
    },
    {
        pattern: /^principle\s+of\s+least\s+privilege$/i,
        replace: () => "принцип наименьших привилегий"
    },
    {
        pattern: /^to\s+every\s+CLI,\s*MCP\s+server,\s*and\s+resource\s+it\s+can\s+access:$/i,
        replace: () => " к каждому CLI, MCP-серверу и ресурсу, к которому он имеет доступ:"
    },
    {
        pattern: /^instead\s+of\s+end-user\s+credentials\.?$/i,
        replace: () => " вместо учётных данных конечного пользователя."
    },
    {
        pattern: /^Grant\s+the\s+service\s+account\s+only\s+the\s*$/i,
        replace: () => "Предоставляйте сервисному аккаунту только "
    },
    {
        pattern: /^with\s+a\s+condition\s+in\s+the\s+policy\s+binding\s+to\s+restrict\s+your\s+agent['’]s\s+service\s+accounts\s+to\s+intended\s+projects\.?$/i,
        replace: () => " с условием в привязке политики, чтобы ограничить сервисные аккаунты вашего агента только целевыми проектами."
    },
    {
        pattern: /^Learn\s+how\s+to\s*$/i,
        replace: () => "Узнайте, как "
    },
    {
        pattern: /^with\s+Google\s+Cloud\s+MCP\.?$/i,
        replace: () => " при использовании Google Cloud MCP."
    },
    {
        pattern: /^Data\s+Agent\s+Kit\s+collects\s+usage\s+statistics\s+\(such\s+as\s+when\s+included\s+skills\s+and\s+MCP\s+tools\s+are\s+used\).*$/i,
        replace: () => "Data Agent Kit собирает статистику использования (например, факты вызова встроенных навыков и инструментов MCP) для повышения надёжности и производительности. Пользовательский код, содержимое файлов и значения данных приложений не собираются."
    },
    {
        pattern: /^To\s+opt\s+out,\s*either\s+set\s*$/i,
        replace: () => "Чтобы отказаться от сбора статистики, установите переменную "
    },
    {
        pattern: /^in\s+your\s+environment:$/i,
        replace: () => " в вашем окружении:"
    },
    {
        pattern: /^Or\s+create\s+or\s+update\s*$/i,
        replace: () => "Или создайте / обновите файл "
    },
    {
        pattern: /^We\s+want\s+your\s+feedback!\s*Please\s*$/i,
        replace: () => "Нам важна ваша обратная связь! Пожалуйста, "
    },
    {
        pattern: /^to\s+report\s+bugs,\s*file\s+feature\s+requests,\s*or\s+ask\s+questions\.?$/i,
        replace: () => ", чтобы сообщить об ошибках, предложить новые функции или задать вопросы."
    },
    {
        // Data Agent Kit 40 skills
        pattern: /^\*\*STOP\s+AND\s+VERIFY\*\*:\s*Before\s+running\s+any\s+command\s+or\s+tool\s+that\s+results\s+in\s+irreversible\s+d.*$/i,
        replace: () => "**ОСТАНОВИТЕСЬ И ПРОВЕРЬТЕ**: Перед выполнением любой команды или инструмента, приводящих к необратимой потере данных (DROP, TRUNCATE, удаление бакетов/ресурсов), необходимо получить явное согласие пользователя."
    },
    {
        pattern: /^Leverages\s+BigQuery['’]s\s+built-in\s+machine\s+learning\s+and\s+GenAI\s+capabilities\s+for\s+advanced\s+data\s+analytics.*$/i,
        replace: () => "Использование встроенных возможностей машинного обучения и GenAI в BigQuery для продвинутой аналитики данных (прогнозирование временных рядов, поиск аномалий, векторный поиск, классификация и генеративный ИИ в SQL)."
    },
    {
        pattern: /^Generates\s+Python\s+code\s+using\s+BigQuery\s+DataFrames\s+\(BigFrames\).*$/i,
        replace: () => "Генерация Python-кода с использованием BigQuery DataFrames (BigFrames) для обработки данных, аналитики и машинного обучения в BigQuery."
    },
    {
        pattern: /^Discovers\s+and\s+inspects\s+BigQuery\s+Data\s+Transfer\s+Service\s+\(DTS\)\s+configurations.*$/i,
        replace: () => "Обнаружение и инспекция конфигураций BigQuery Data Transfer Service (DTS) для анализа существующих конвейеров загрузки данных."
    },
    {
        pattern: /^Provides\s+an\s+end-to-end\s+journey\s+for\s+authoring\s+a\s+BigQuery\s+property\s+graph\s+from\s+your\s+tables.*$/i,
        replace: () => "Полный цикл создания графа свойств (Property Graph) в BigQuery на основе таблиц или диаграмм модели данных (CREATE PROPERTY GRAPH DDL и проверка связей)."
    },
    {
        pattern: /^Provides\s+guidelines\s+and\s+best\s+practices\s+for\s+querying\s+BigQuery\s+property\s+graphs\s+and\s+semantic\s+graph.*$/i,
        replace: () => "Рекомендации и лучшие практики выполнения запросов к графам свойств и семантическим графам в BigQuery с помощью нативного языка GQL и GRAPH_TABLE."
    },
    {
        pattern: /^Provides\s+data-retrieval\s+best\s+practices,\s*tool\s+selection\s+guidance,\s*and\s+performant\s+SQL\s+query\s+syntax\s+f.*$/i,
        replace: () => "Лучшие практики получения телеметрии BigQuery через INFORMATION_SCHEMA, Cloud Monitoring и REST API для анализа производительности, слотов и стоимости."
    },
    {
        pattern: /^Provides\s+workflows\s+to\s+optimize\s+BigQuery\s+environments\s+\(capacity\s+planning,\s*editions\),\s*storage\s+asse.*$/i,
        replace: () => "Рабочие процессы оптимизации окружений BigQuery (планирование ёмкости, редакции), хранилища (партиционирование, кластеризация) и SQL-запросов."
    },
    {
        pattern: /^Provides\s+diagnostic\s+workflows\s+and\s+step-by-step\s+root-cause\s+analysis\s+procedures\s+for\s+actively\s+br.*$/i,
        replace: () => "Диагностические процессы и пошаговый анализ первопричин (RCA) для сбойных, медленных или неожиданно дорогих задач и запросов в BigQuery."
    },
    {
        pattern: /^Provisions\s+instances\s+and\s+tables,\s*designs\s+performant\s+schemas,\s*and\s+queries\s+data\s+in\s+Bigtable.*$/i,
        replace: () => "Развёртывание инстансов и таблиц, проектирование производительных схем ключей строк и выполнение запросов к данным в Google Cloud Bigtable."
    },
    {
        pattern: /^(?:Build|Сборка)\s+modern\s+data\s+apps,\s*dashboards,\s*and\s+interactive\s+reports\s+using\s+either\s+React\s*\+\s*Vite\s+or\s+Streamlit.*$/i,
        replace: () => "Создание современных приложений данных, дашбордов и интерактивных отчётов на React + Vite или Streamlit с поддержкой чата Gemini Data Analytics."
    },
    {
        pattern: /^Guides\s+users\s+through\s+discovering\s+their\s+database\s+requirements,\s*recommends\s+a\s+Google\s+Clou.*$/i,
        replace: () => "Анализ требований к базе данных, подбор оптимальной СУБД в Google Cloud (или целевой СУБД для миграции) и помощь в её создании."
    },
    {
        pattern: /^Configures\s+\(or\s+reconfigures\)\s+the\s+Google\s+Cloud\s+Data\s+Agent\s+Kit\s+\(DAK\)\s+plugin\s+by\s+checking\s+gcloud.*$/i,
        replace: () => "Настройка и перенастройка плагина Google Cloud Data Agent Kit (DAK): проверка учётных данных gcloud и ADC, выбор проекта, региона и сервисов GCP."
    },
    {
        pattern: /^Automated\s+data\s+quality\s+and\s+transformation\s+capabilities\s+for\s+Dataform\/dbt\/BigQuery\s+pipelines.*$/i,
        replace: () => "Автоматизированный контроль качества, очистка и трансформация данных для конвейеров Dataform, dbt и BigQuery из источников BigQuery и Cloud Storage."
    },
    {
        pattern: /^Expertise\s+in\s+generating\s+clean,\s*correct,\s*and\s+efficient\s+Dataform\s+pipeline\s+code\s+for\s+BigQuery\s+ELT.*$/i,
        replace: () => "Генерация чистого, корректного и эффективного кода конвейеров Dataform (SQLX) для ELT-процессов в BigQuery."
    },
    {
        pattern: /^Expert\s+guidance\s+for\s+creating,\s*modifying,\s*and\s+optimizing\s+dbt\s+pipelines\s+for\s+BigQuery.*$/i,
        replace: () => "Экспертное руководство по созданию, модификации и оптимизации моделей и конвейеров dbt для BigQuery."
    },
    {
        pattern: /^Finds\s+and\s+inspects\s+data\s+assets\s+within\s+Google\s+Cloud\.\s*Relevant\s+when\s+any\s+of\s+the\s+following\s+con.*$/i,
        replace: () => "Поиск и инспекция активов данных в Google Cloud (наборы данных, таблицы и представления BigQuery, каталоги BigLake, базы Spanner, метаданные и политики)."
    },
    {
        pattern: /^Enforces\s+resource\s+attribution\s+for\s+CLI\s+commands\.\s*Use\s+this\s+skill\s+whenever\s+you\s+are\s+running.*$/i,
        replace: () => "Обязательная атрибуция и маркировка ресурсов при выполнении CLI-команд `bq` и `gcloud`."
    },
    {
        pattern: /^Sets\s+up\s+Google\s+Cloud\s+Lakehouse\s+federated\s+catalogs\s+to\s+remote\s+Iceberg\s+REST\s+Catalogs.*$/i,
        replace: () => "Настройка федеративных каталогов Google Cloud Lakehouse для подключения к внешним каталогам Iceberg REST (Databricks Unity, AWS Glue) и выполнения запросов из BigQuery и Spark."
    },
    {
        pattern: /^Provides\s+expert\s+guidance\s+for\s+troubleshooting\s+Cloud\s+Composer\s+\(Apache\s+Airflow\)\s+and\s+Orc.*$/i,
        replace: () => "Экспертное руководство по диагностике и устранению сбоев в конвейерах и DAG Cloud Composer (Apache Airflow) с формированием отчёта о первопричинах (RCA)."
    },
    {
        pattern: /^Primary\s+entry\s+point\s+for\s+building,\s*managing,\s*and\s+orchestrating\s+data\s+pipelines\s+on\s+Google\s+Cloud.*$/i,
        replace: () => "Основная точка входа для создания, управления и оркестрации конвейеров данных в Google Cloud (маршрутизация между dbt, Dataflow, Dataform, Spark, DTS и Cloud Composer)."
    },
    {
        pattern: /^Guides\s+writing,\s*packaging,\s*executing,\s*and\s+troubleshooting\s+Apache\s+Beam\s+pipelines\s+on\s+Dataflow.*$/i,
        replace: () => "Разработка, упаковка, запуск и диагностика конвейеров Apache Beam в Google Cloud Dataflow (Java/Python/Go, Flex Templates, анализ производительности и автоскейлинга)."
    },
    {
        pattern: /^Guides\s+the\s+authoring\s+and\s+validation\s+of\s+Apache\s+Airflow\s+DAGs\s+for\s+Managed\s+Service\s+f.*$/i,
        replace: () => "Разработка и валидация DAG Apache Airflow для Managed Service for Apache Airflow (MSAA / Cloud Composer) с учётом совместимости Airflow 2 и 3."
    },
    {
        pattern: /^Provides\s+guidance\s+for\s+migrating\s+Apache\s+Airflow\s+DAGs\s+in\s+Managed\s+Service\s+for\s+Apache.*$/i,
        replace: () => "Руководство по миграции DAG Apache Airflow в Managed Service for Apache Airflow (MSAA) на версии Airflow 2.11.1 и Airflow 3 с проверкой несовместимых изменений."
    },
    {
        pattern: /^Provides\s+recommendations\s+and\s+best\s+practices\s+for\s+creating,\s*configuring,\s*tuning.*$/i,
        replace: () => "Рекомендации и лучшие практики по созданию, настройке, масштабированию и оптимизации окружений Managed Service for Apache Airflow (Cloud Composer)."
    },
    {
        pattern: /^Upgrades\s+Spark\s+workloads\s+on\s+Google\s+Cloud\s+Managed\s+Service\s+for\s+Apache\s+Spark\s+\(formerly.*$/i,
        replace: () => "Обновление рабочих нагрузок Spark в Google Cloud Managed Service for Apache Spark (Dataproc и Serverless) на новые версии рантайма со статическим анализом совместимости."
    },
    {
        pattern: /^This\s+skill\s+helps\s+the\s+agent\s+generate\s+or\s+update\s+orchestration\s+pipeline\s+definitions\s+for\s+Google\s+Clo.*$/i,
        replace: () => "Генерация, обновление и развёртывание определений оркестрационных конвейеров в Google Cloud Composer для dbt, ноутбуков, задач Spark, Dataform, Vertex AI и BigQuery SQL."
    },
    {
        pattern: /^Automates\s+declarative\s+resource\s+creation\s+and\s+provisioning\s+for\s+data\s+pipelines,\s*supporti.*$/i,
        replace: () => "Автоматизация декларативного создания и развёртывания ресурсов конвейеров данных (BigQuery, Dataform, Dataproc, DTS) через файл `deployment.yaml`."
    },
    {
        pattern: /^Authors,\s*optimizes,\s*and\s+runs\s+PySpark\s+and\s+Spark\s+code\s+on\s+Google\s+Cloud\s+Managed\s+Spark\s+\(Dataproc\s+Serverless.*$/i,
        replace: () => "Написание, оптимизация и запуск кода PySpark и Spark SQL в Google Cloud Managed Spark (Dataproc Serverless, кластеры и Spark Connect)."
    },
    {
        pattern: /^Monitors,\s*inventories,\s*and\s+assesses\s+Google\s+Cloud\s+Managed\s+Service\s+for\s+Apache\s+Spark\s+\(Dataproc\s+S.*$/i,
        replace: () => "Мониторинг, инвентаризация и оценка окружений, кластеров, пакетных задач, метрик и затрат в Google Cloud Managed Service for Apache Spark (Dataproc)."
    },
    {
        pattern: /^Provides\s+expert\s+guidance\s+for\s+troubleshooting\s+Google\s+Cloud\s+Spark\s+and\s+Dataproc\s+workloads.*$/i,
        replace: () => "Экспертное руководство по диагностике и анализу первопричин (RCA) сбоев задач Google Cloud Spark и Dataproc, включая анализ логов драйвера и событий Spark в Cloud Storage."
    },
    {
        pattern: /^Assesses\s+the\s+security\s+posture\s+of\s+Google\s+Cloud\s+Storage\s+\(GCS\)\s+buckets\s+and\s+projects.*$/i,
        replace: () => "Оценка защищённости бакетов и проектов Google Cloud Storage (GCS): проверка публичного доступа, прав IAM, шифрования CMEK, VPC Service Controls и аудит-логов."
    },
    {
        pattern: /^Stores,\s*retrieves,\s*and\s+manages\s+data\s+as\s+objects\s+in\s+Cloud\s+Storage\s+on\s+Google\s+Cloud\s+\(also\s+kno.*$/i,
        replace: () => "Хранение, получение и управление объектами в бакетах Google Cloud Storage (GCS): настройка прав доступа, классов хранения, жизненного цикла и защита данных."
    },
    {
        pattern: /^Creates\s+Cloud\s+Storage\s+\(Google\s+Cloud\s+Storage,\s*or\s+GCS\)\s+buckets\.\s*Analyzes\s+the\s+wor.*$/i,
        replace: () => "Проектирование и создание бакетов Google Cloud Storage (GCS) с безопасной и экономичной конфигурацией по умолчанию под конкретный тип рабочей нагрузки."
    },
    {
        pattern: /^Mounts\s+Cloud\s+Storage\s+buckets\s+as\s+a\s+POSIX\s+file\s+system\s+with\s+Cloud\s+Storage\s+FUSE\s+\(gcsfuse\).*$/i,
        replace: () => "Монтирование бакетов Cloud Storage как файловой системы POSIX с помощью Cloud Storage FUSE (gcsfuse) в GKE, Compute Engine и Cloud Run с настройкой кэширования."
    },
    {
        pattern: /^Ensures\s+proper\s+Python\s+dependency\s+management,\s*avoiding\s+global\s+`?pip\s+install`?\s+and\s+adhe.*$/i,
        replace: () => "Обеспечивает правильное управление зависимостями Python в виртуальных окружениях проекта без глобального запуска `pip install`."
    },
    {
        pattern: /^CRITICAL\s+RULE:\s*You\s+MUST\s+use\s+this\s+skill\s+whenever\s+the\s+task\s+involves\s+any\s+machine\s+learning\s+tasks\s+or\s+data\s+a.*$/i,
        replace: () => "КРИТИЧЕСКОЕ ПРАВИЛО: Обязательный навык для любых задач машинного обучения и анализа данных (кластеризация, классификация, регрессия, временные ряды, статтесты и сравнение моделей)."
    },
    {
        pattern: /^This\s+skill\s+guides\s+the\s+use\s+of\s+Jupyter\s+notebooks\s+for\s+data\s+analysis,\s*exploration,\s*and\s+visualization.*$/i,
        replace: () => "Руководство по использованию ноутбуков Jupyter для анализа, исследования и визуализации данных (особенно с BigQuery через магические команды `%%bqsql`)."
    },
    {
        pattern: /^Mandatory\s+Step\s+0\s+pre-flight\s+check\s+for\s+regional\s+Google\s+Cloud\s+MCP\s+servers\s+\(e\.g\.\s+Dataproc\).*$/i,
        replace: () => "Обязательная предварительная проверка (Шаг 0) региональных MCP-серверов Google Cloud (например, Dataproc) для подстановки региона вместо плейсхолдера `$GCP_REGION`."
    },
    {
        pattern: /^Guides\s+the\s+process\s+of\s+analyzing,\s*mapping,\s*and\s+documenting\s+transformations\s+between\s+source\s+and\s+targ.*$/i,
        replace: () => "Анализ, сопоставление и документирование трансформаций между исходными и целевыми схемами данных (формирование плана Mapping Manifesto перед написанием ETL/ELT-кода)."
    },
    // --- 8. GOOGLE CLOUD DEVELOPER PLUGIN ---
    {
        pattern: /^Help\s+me\s+set\s+up\s+a\s+new\s+Google\s+Cloud\s+project,\s*link\s+billing,\s*and\s+configure\s+local\s+authentication\.?$/i,
        replace: () => "Помоги мне настроить новый проект Google Cloud, привязать биллинг и настроить локальную аутентификацию."
    },
    {
        pattern: /^Configure\s+Application\s+Default\s+Credentials\s+\(ADC\)\s+and\s+IAM\s+permissions\s+for\s+my\s+local\s+development\s+environment\.?$/i,
        replace: () => "Настроить стандартные учётные данные приложения (ADC) и права IAM для моего локального окружения разработки."
    },
    {
        pattern: /^(?:Search|Поиск)\s+official\s+Google\s+Cloud\s+documentation\s+using\s+Developer\s+Knowledge\s+and\s+validate\s+my\s+gcloud\s+CLI\s+commands\.?$/i,
        replace: () => "Найти в официальной документации Google Cloud через Developer Knowledge и проверить мои команды gcloud CLI."
    },
    {
        pattern: /^plugin\s+equips\s+Antigravity\s+with\s+foundational\s+skills,\s*safety\s+guardrails,\s*and\s+live\s+documentation\s+grounding\s+for\s+building\s+on\s+Google\s+Cloud\.?$/i,
        replace: () => " оснащает Antigravity базовыми навыками, защитными ограничениями безопасности и прямым доступом к актуальной документации для разработки в Google Cloud."
    },
    {
        pattern: /^This\s+plugin\s+bundles\s+curated\s+Agent\s+Skills,\s*routing\s+rules,\s*and\s+configuration\s+for\s+the\s*$/i,
        replace: () => "Этот плагин объединяет курируемые навыки агента, правила маршрутизации и конфигурацию "
    },
    {
        pattern: /^into\s+a\s+single\s+portable\s+package\.?$/i,
        replace: () => " в единый переносимый пакет."
    },
    {
        pattern: /^:\s*Safety-critical\s+validation,\s*best\s+practices,\s*and\s+execution\s+guardrails\s+for\s*$/i,
        replace: () => ": Критически важная проверка безопасности, лучшие практики и защитные ограничения выполнения для команд "
    },
    {
        pattern: /^CLI\s+commands\.?$/i,
        replace: () => " CLI."
    },
    {
        pattern: /^:\s*Authentication\s+workflows,\s*credential\s+selection,\s*and\s+service\s+identity\s+best\s+practices\.?$/i,
        replace: () => ": Рабочие процессы аутентификации, выбор учётных данных и лучшие практики использования сервисных удостоверений."
    },
    {
        pattern: /^:\s*First-project\s+onboarding,\s*account\s+setup,\s*and\s+billing\s+configuration\.?$/i,
        replace: () => ": Первичная настройка проекта, создание аккаунта и конфигурация биллинга."
    },
    {
        pattern: /^:\s*Discovery\s+and\s+on-demand\s+installation\s+of\s+specialized\s+skills\s+from\s+the\s+Google\s+Agent\s+Skills\s+repo\.?$/i,
        replace: () => ": Поиск и установка по требованию специализированных навыков из репозитория Google Agent Skills."
    },
    {
        pattern: /^:\s*Grounded\s+retrieval\s+of\s+official\s+Google\s+documentation\.?$/i,
        replace: () => ": Достоверное получение официальной документации Google."
    },
    {
        pattern: /^:\s*Provides\s+AI\s+agents\s+with\s+up-to-date\s+grounding\s+in\s+official\s+Google\s+developer\s+documentation\s+over\s+streamable\s+HTTP\.?$/i,
        replace: () => ": Обеспечивает ИИ-агентов актуальными данными из официальной документации Google для разработчиков по протоколу потокового HTTP."
    },
    {
        pattern: /^:\s*Always-on\s+routing\s+map\s+that\s+guides\s+the\s+agent\s+to\s+discover\s+and\s+suggest\s+deeper\s+product-specific\s+skills\s+\(such\s+as\s*$/i,
        replace: () => ": Постоянно активная карта маршрутизации, помогающая агенту находить и предлагать узкоспециализированные продуктовые навыки (такие как "
    },
    {
        pattern: /^\)\s*when\s+a\s+task\s+requires\s+specialized\s+domain\s+knowledge\s+beyond\s+the\s+foundational\s+bundle\.?$/i,
        replace: () => "), когда задача требует глубоких предметных знаний за пределами базового набора."
    },
    {
        pattern: /^To\s+see\s+how\s+this\s+plugin\s+works,\s*consider\s+a\s+situation\s+where\s+you['’]re\s+bootstrapping\s+a\s+new\s+project\s+as\s+part\s+of\s+working\s+on\s+a\s+script\.\s*With\s+the\s*$/i,
        replace: () => "Чтобы увидеть, как работает этот плагин, представьте ситуацию, когда вы разворачиваете новый проект при работе над скриптом. С установленным плагином "
    },
    {
        pattern: /^plugin\s+installed,\s*you\s+can\s+prompt\s+your\s+agent:$/i,
        replace: () => " вы можете отправить агенту запрос:"
    },
    {
        pattern: /^I['’]m\s+brand\s+new\s+to\s+this\s+platform,\s*and\s+I\s+need\s+to\s+get\s+an\s+account\s+and\s+a\s+first\s+project\s+with\s+billing\s+set\s+up.*$/i,
        replace: () => "Я впервые работаю с этой платформой, и мне нужно создать аккаунт и первый проект с настроенным биллингом. Затем нужно авторизовать мою локальную машину так, чтобы скрипт, который я пишу, вызывал API от имени сервисного аккаунта, а не от моего личного имени."
    },
    {
        pattern: /^:\s*The\s+agent\s+silently\s+runs\s+background\s+checks\s+against\s+your\s+live\s+environment.*$/i,
        replace: () => ": Агент незаметно выполняет фоновые проверки вашего окружения на наличие необходимых компонентов, таких как доступность CLI и существующие проекты или организации."
    },
    {
        pattern: /^:\s*The\s+agent\s+considers\s+IAM\s+best\s+practices\s+to\s+avoid\s+risks\s+that\s+might\s+be\s+assumed\s+as\s+part\s+of\s+the\s+prompt.*$/i,
        replace: () => ": Агент учитывает лучшие практики IAM, чтобы избежать рисков, которые могли подразумеваться в запросе, таких как случайная утечка ключей или их коммит в git."
    },
    {
        pattern: /^:\s*The\s+agent\s+outlines\s+a\s+workflow\s+roadmap\s+and\s+offers\s+to\s+act\s+on\s+those\s+steps\s+before\s+modifying\s+any\s+resources\.?$/i,
        replace: () => ": Агент составляет пошаговый план действий и предлагает подтвердить выполнение шагов перед изменением любых ресурсов."
    },
    {
        pattern: /^If\s+you\s+run\s+Antigravity\s+with\s+terminal\s+sandboxing\s+or\s+behind\s+a\s+corporate\s+firewall\/proxy.*$/i,
        replace: () => "Если вы запускаете Antigravity с песочницей терминала или за корпоративным файрволом/прокси, настройте окружение так, чтобы разрешить следующие исходящие URL-адреса и команды терминала."
    },
    {
        pattern: /^Google\s+platform\s+decision\s+and\s+setup\s+guidance,\s*loaded\s+on\s+demand\s+from\s+Google['’]s\s+skill\s+catalog.*$/i,
        replace: () => "Руководство по выбору и настройке продуктов платформы Google, загружаемое по требованию из каталога навыков Google при выборе стека (вычисления, БД, хранилище, ИИ и др.)."
    },
    {
        pattern: /^Provides\s+safety-critical\s+validation,\s*guardrails,\s*and\s+data\s+reduction\s+for\s+gcloud\s+CLI\s+operations.*$/i,
        replace: () => "Критически важная проверка безопасности, защитные ограничения и сокращение объёма вывода для операций gcloud CLI при работе с сервисами и инфраструктурой Google Cloud Platform (GCP)."
    },
    {
        pattern: /^Provides\s+expert\s+guidance\s+on\s+Identity\s+and\s+Access\s+Management\s+\(IAM\)\s+and\s+authenticating\s+and\s+authorizing\s+to\s+Google\s+Cloud.*$/i,
        replace: () => "Экспертное руководство по управлению идентификацией и доступом (IAM), аутентификации и авторизации в сервисах и API Google Cloud (пользователи, сервисные аккаунты, ADC)."
    },
    {
        pattern: /^Guides\s+a\s+developer['’]s\s+first\s+steps\s+on\s+Google\s+Cloud,\s*covering\s+account\s+creation,\s*billing\s+setup.*$/i,
        replace: () => "Пошаговое руководство для первых шагов разработчика в Google Cloud: создание аккаунта, настройка биллинга, управление проектом и развёртывание первого ресурса."
    },
    {
        // "Editing <target>" or "Editing"
        pattern: /^Editing(?:\s+(.*))?$/i,
        replace: (match) => match[1] ? `Изменение ${match[1]}` : 'Изменение'
    },
    {
        // "Created <target>" or "Created"
        pattern: /^Created(?:\s+(.*))?$/i,
        replace: (match) => match[1] ? `Создано ${match[1]}` : 'Создано'
    },
    {
        // "Creating <target>" or "Creating"
        pattern: /^Creating(?:\s+(.*))?$/i,
        replace: (match) => match[1] ? `Создание ${match[1]}` : 'Создание'
    },
    {
        // "Canceled <target>" or "Canceled" / "Cancelled"
        pattern: /^(?:Canceled|Cancelled)(?:\s+(.*))?$/i,
        replace: (match) => match[1] ? `Отменено: ${match[1]}` : 'Отменено'
    },
    {
        // "Canceling <target>" or "Canceling" / "Cancelling"
        pattern: /^(?:Canceling|Cancelling)(?:\s+(.*))?$/i,
        replace: (match) => match[1] ? `Отмена ${match[1]}` : 'Отмена'
    },
    {
        // "Thought for 4s >" / "Thought for 4s ˅" / "Thought for 4s"
        pattern: /^Thought\s+for\s+(\d+(?:\.\d+)?)\s*([smhd]|sec|min|hr|day|days)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const count = match[1];
            const unit = match[2].toLowerCase();
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const units = { s: 'сек', sec: 'сек', secs: 'сек', m: 'мин', min: 'мин', mins: 'мин', h: 'ч', hr: 'ч', hrs: 'ч', d: 'дн', day: 'дн', days: 'дн' };
            return `Размышлял ${count} ${units[unit] || unit}${arrow}`;
        }
    },
    {
        // General "Thought for <duration>"
        pattern: /^Thought\s+for\s+(.*?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const time = (typeof translateRelativeTime === 'function' ? translateRelativeTime(match[1]) : '') || (typeof translateDuration === 'function' ? translateDuration(match[1]) : '') || match[1];
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Размышлял ${time}${arrow}`;
        }
    },
    {
        // "Thinking for 11s ˅" / "Thinking for 2s ˅" / "Thinking for 2s"
        pattern: /^Thinking\s+for\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const count = match[1];
            const unit = match[2].toLowerCase();
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const units = { s: 'сек', sec: 'сек', secs: 'сек', second: 'сек', seconds: 'сек', m: 'мин', min: 'мин', mins: 'мин', minute: 'мин', minutes: 'мин', h: 'ч', hr: 'ч', hrs: 'ч', hour: 'ч', hours: 'ч', d: 'дн', day: 'дн', days: 'дн' };
            return `Размышляет ${count} ${units[unit] || unit}${arrow}`;
        }
    },
    {
        // "for 16s ˅" / "for 2s" (when Thinking is rendered in a separate span from duration)
        pattern: /^for\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const count = match[1];
            const unit = match[2].toLowerCase();
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const units = { s: 'сек', sec: 'сек', secs: 'сек', second: 'сек', seconds: 'сек', m: 'мин', min: 'мин', mins: 'мин', minute: 'мин', minutes: 'мин', h: 'ч', hr: 'ч', hrs: 'ч', hour: 'ч', hours: 'ч', d: 'дн', day: 'дн', days: 'дн' };
            return `${count} ${units[unit] || unit}${arrow}`;
        }
    },
    {
        // General "Thinking for <duration>"
        pattern: /^Thinking\s+for\s+(.*?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const time = (typeof translateRelativeTime === 'function' ? translateRelativeTime(match[1]) : '') || (typeof translateDuration === 'function' ? translateDuration(match[1]) : '') || match[1];
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Размышляет ${time}${arrow}`;
        }
    },
    {
        // "Exploring files/file, running commands/command, editing file(s) ˅" / "Exploring file, running command"
        pattern: /^Exploring\s+files?,\s*running\s+commands?(?:,\s*editing\s+files?)?(?:\s*(.*))?$/i,
        replace: (match) => {
            const isFilesPlural = /files/i.test(match[0]);
            const isCmdsPlural = /commands/i.test(match[0]);
            const hasEditing = /editing\s+files?/i.test(match[0]);
            const isEditPlural = /editing\s+files/i.test(match[0]);
            const arrow = match[1] ? (' ' + match[1].trim()) : '';

            const filePart = isFilesPlural ? 'Исследование файлов' : 'Исследование файла';
            const cmdPart = isCmdsPlural ? 'выполнение команд' : 'выполнение команды';

            if (hasEditing) {
                const editPart = isEditPlural ? 'редактирование файлов' : 'редактирование файла';
                return `${filePart}, ${cmdPart}, ${editPart}${arrow}`;
            }
            return `${filePart}, ${cmdPart}${arrow}`;
        }
    },
    {
        // "Explored files/file/artifact(s), ran commands/command, edited file(s)/artifact(s) ˅"
        pattern: /^Explored\s+(files?|artifacts?),\s*ran\s+commands?(?:,\s*edited\s+(files?|artifacts?))?(?:\s*(.*))?$/i,
        replace: (match) => {
            const exploredWord = match[1].toLowerCase();
            let exploredPart = 'Исследован файл';
            if (exploredWord === 'files') exploredPart = 'Исследованы файлы';
            else if (exploredWord === 'artifact') exploredPart = 'Исследован артефакт';
            else if (exploredWord === 'artifacts') exploredPart = 'Исследованы артефакты';

            const isCmdsPlural = /commands/i.test(match[0]);
            const cmdPart = isCmdsPlural ? 'выполнены команды' : 'выполнена команда';

            const hasEdited = /edited\s+(files?|artifacts?)/i.test(match[0]);
            const arrow = match[3] ? (' ' + match[3].trim()) : '';

            if (hasEdited) {
                const editWord = (match[2] || '').toLowerCase();
                let editPart = 'изменен файл';
                if (editWord === 'files') editPart = 'изменены файлы';
                else if (editWord === 'artifact') editPart = 'изменен артефакт';
                else if (editWord === 'artifacts') editPart = 'изменены артефакты';
                return `${exploredPart}, ${cmdPart}, ${editPart}${arrow}`;
            }
            return `${exploredPart}, ${cmdPart}${arrow}`;
        }
    },
    {
        // "Explored files/artifacts, edited file(s)/artifact(s) ˅"
        pattern: /^Explored\s+(files?|artifacts?),\s*edited\s+(files?|artifacts?)(?:\s*(.*))?$/i,
        replace: (match) => {
            const exploredWord = match[1].toLowerCase();
            let exploredPart = 'Исследован файл';
            if (exploredWord === 'files') exploredPart = 'Исследованы файлы';
            else if (exploredWord === 'artifact') exploredPart = 'Исследован артефакт';
            else if (exploredWord === 'artifacts') exploredPart = 'Исследованы артефакты';

            const editWord = match[2].toLowerCase();
            let editPart = 'изменен файл';
            if (editWord === 'files') editPart = 'изменены файлы';
            else if (editWord === 'artifact') editPart = 'изменен артефакт';
            else if (editWord === 'artifacts') editPart = 'изменены артефакты';

            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `${exploredPart}, ${editPart}${arrow}`;
        }
    },
    {
        // "Explored file(s)/artifact(s) >"
        pattern: /^Explored\s+(files?|artifacts?)(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => {
            const w = match[1].toLowerCase();
            let res = 'Исследован файл';
            if (w === 'files') res = 'Исследованы файлы';
            else if (w === 'artifact') res = 'Исследован артефакт';
            else if (w === 'artifacts') res = 'Исследованы артефакты';
            return res + (match[2] ? (' ' + match[2].trim()) : '');
        }
    },
    {
        // Standalone action targets when verb is stripped: "lines 4100-4170 >"
        pattern: /^lines\s+(\d+)\s*[-–—]\s*(\d+)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => `Строки ${match[1]}–${match[2]}${match[3] ? (' ' + match[3].trim()) : ''}`
    },
    {
        // Standalone action targets: "whitelist in shouldIgnore >"
        pattern: /^whitelist\s+in\s+(\S+)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => `Белый список в ${match[1]}${match[2] ? (' ' + match[2].trim()) : ''}`
    },
    {
        // Standalone action targets: "regexTranslations for terminal tab >"
        pattern: /^regexTranslations\s+for\s+terminal\s+tab(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => `regexTranslations для вкладки терминала${match[1] ? (' ' + match[1].trim()) : ''}`
    },
    {
        // Standalone action targets: "Line 774 with Node >"
        pattern: /^Line\s+(\d+)\s+with\s+(.+?)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => `Строка ${match[1]} с помощью ${match[2]}${match[3] ? (' ' + match[3].trim()) : ''}`
    },
    {
        // "Ran commands >" / "Ran commands ˅"
        pattern: /^Ran\s+commands(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => "Выполнены команды" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Ran <command>" / "Ran <command> >"
        pattern: /^Ran\s+(.+?)(\s+([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40]))?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const cmd = match[1].trim();
            if (/^terminal command$/i.test(cmd)) {
                return `Выполнена команда терминала${arrow}`;
            }
            if (/^command$/i.test(cmd)) {
                return `Выполнена команда${arrow}`;
            }
            if (/^commands$/i.test(cmd)) {
                return `Выполнены команды${arrow}`;
            }
            return `Запуск ${cmd}${arrow}`;
        }
    },
    {
        // "Cancel Task"
        pattern: /^Cancel\s+Task$/i,
        replace: () => "Отменить задачу"
    },
    {
        // "Stop Recording" / "Start Recording"
        pattern: /^(Stop|Start)\s+Recording$/i,
        replace: (match) => match[1].toLowerCase() === 'stop' ? "Остановить запись" : "Начать запись"
    },
    {
        // "This project overrides your global permission settings."
        pattern: /^This\s+project\s+overrides\s+your\s+global\s+permission\s+settings\.?$/i,
        replace: () => "Этот проект переопределяет ваши глобальные настройки разрешений."
    },
    {
        // "Every command requires approval."
        pattern: /^Every\s+command\s+requires\s+approval\.?$/i,
        replace: () => "Каждая команда требует подтверждения."
    },
    {
        // "Ask before sensitive operations."
        pattern: /^Ask\s+before\s+sensitive\s+operations\.?$/i,
        replace: () => "Спрашивать перед конфиденциальными операциями."
    },
    {
        // "Run/Запуск all commands without restrictions."
        pattern: /^(?:Run|Запуск)\s+all\s+commands\s+without\s+restrictions\.?$/i,
        replace: () => "Выполнение всех команд без ограничений."
    },
    {
        // "Use Global Settings"
        pattern: /^Use\s+Global\s+Settings\.?$/i,
        replace: () => "Использовать глобальные настройки"
    },
    {
        // "Project Settings ⓘ" / "Project Настройки ⓘ"
        pattern: /^Project\s+(?:Settings|Настройки)(?:\s*([ⓘi]|[^a-zA-Z0-9\s]+))?$/i,
        replace: (match) => "Настройки проекта" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Auto (Preview)"
        pattern: /^Auto\s*\(Preview\)$/i,
        replace: () => "Авто (Предпросмотр)"
    },
    {
        // "Automatically decide if commands run."
        pattern: /^Automatically\s+decide\s+if\s+commands\s+run(\.?)$/i,
        replace: (match) => "Автоматически решать, запускать ли команды" + (match[1] || "")
    },
    {
        // "Enter tool name or server..."
        pattern: /^Enter\s+tool\s+name\s+or\s+server(\.{3}|…)?$/i,
        replace: (match) => "Введите название инструмента или сервера" + (match[1] || "")
    },
    {
        // "Give Feedback"
        pattern: /^Give\s+Feedback(\.{3}|…)?$/i,
        replace: (match) => "Оставить отзыв" + (match[1] || "")
    },
    {
        // "Create a Plugin with the Agent" / "Create a Skill with the Agent" / etc.
        pattern: /^Create\s+(?:a|an)\s+(.+?)\s+with\s+the\s+Agent(\.?)$/i,
        replace: (match) => {
            const item = match[1].trim().toLowerCase();
            const map = {
                plugin: 'плагин',
                skill: 'навык',
                rule: 'правило',
                agent: 'агента',
                automation: 'автоматизацию',
                workflow: 'рабочий процесс',
                hook: 'хук'
            };
            return `Создать ${map[item] || match[1].trim()} с помощью агента${match[2] || ''}`;
        }
    },
    {
        // "+ Create" / "Create"
        pattern: /^(\+\s*)?Create$/i,
        replace: (match) => (match[1] ? "+ " : "") + "Создать"
    },
    {
        // "5h limit" / "5-hour limit" / "24h limit"
        pattern: /^(\d+)\s*(?:h|hr|hrs|hour|hours)[\s-]*limit$/i,
        replace: (match) => `${match[1]}-часовой лимит`
    },
    {
        // "100% left" / "85% left" / "100% remaining"
        pattern: /^(\d+(?:[.,]\d+)?)%\s+(?:left|remaining)$/i,
        replace: (match) => `Осталось ${match[1]}%`
    },
    // --- v2.1.10: Chat Tool Steps & Marketplace Plugin Details (must precede generic verb rules) ---
    {
        // "Searched marketplace for "<query>"" / "Searching marketplace for "<query>""
        pattern: /^(?:Searched|Searching|Поиск(?:\s+в)?)\s+marketplace(?:\s+for\s+(.+))?$/i,
        replace: (match) => match[1] ? `Поиск в Маркетплейсе: ${match[1].trim()}` : "Поиск в Маркетплейсе"
    },
    {
        // "<action> · Exited with code 1 >" or standalone "Exited with code 1 >"
        pattern: /^(?:(.+?)\s*([·•・])\s*)?(?:Exited\s+with\s+code|Завершено\s+с\s+кодом)\s+(-?\d+)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const code = match[3];
            const arrow = match[4] ? (' ' + match[4].trim()) : '';
            if (match[1]) {
                const rawCmd = match[1].trim();
                const lowerCmd = rawCmd.toLowerCase();
                const locCmd = translationDictionary[lowerCmd] || localizeActionTarget(rawCmd) || rawCmd;
                const bullet = match[2] || '·';
                return `${locCmd} ${bullet} Завершено с кодом ${code}${arrow}`;
            }
            const leadingBullet = match[2] ? (match[2] + ' ') : '';
            return `${leadingBullet}Завершено с кодом ${code}${arrow}`;
        }
    },
    {
        // Canva example prompts & commands
        pattern: /^Resize\s+this\s+Canva\s+design\s+for\s+Instagram\s+and\s+LinkedIn\.?$/i,
        replace: () => "Изменить размер этого дизайна Canva для Instagram и LinkedIn"
    },
    {
        pattern: /^Review\s+this\s+Canva\s+design\s+and\s+suggest\s+improvements\.?$/i,
        replace: () => "Проверить этот дизайн Canva и предложить улучшения"
    },
    {
        pattern: /^(?:Check|Проверка)\s+this\s+Canva\s+design\s+against\s+my\s+brand\s+kit\.?$/i,
        replace: () => "Проверить этот дизайн Canva на соответствие моему бренд-киту"
    },
    {
        pattern: /^(?:Check|Проверка)\s+a\s+Canva\s+design\s+against\s+a\s+brand\s+kit\s+and\s+report\s+where\s+it\s+diverges.*$/i,
        replace: () => "Проверить дизайн Canva на соответствие бренд-киту и сообщить о расхождениях — цветах вне палитры, несоответствующих шрифтах..."
    },
    {
        pattern: /^Bulk-create\s+Canva\s+designs\s+from\s+tabular\s+data\s+using\s+a\s+brand\s+template.*$/i,
        replace: () => "Массовое создание дизайнов Canva из табличных данных по брендовому шаблону с полями автозаполнения..."
    },
    {
        pattern: /^(?:Review|Read|Чтение|Просмотр)\s+a\s+Canva\s+design\s+and\s+return\s+structured,\s*actionable\s+design\s+feedback.*$/i,
        replace: () => "Проанализировать дизайн Canva и вернуть структурированные рекомендации по визуальной иерархии, тексту и композиции..."
    },
    {
        pattern: /^Make\s+edits\s+to\s+an\s+existing\s+Canva\s+design\s*[—–-]\s*change\s+or\s+fix\s+text.*$/i,
        replace: () => "Внести правки в существующий дизайн Canva — изменить или исправить текст, заменить/вставить/удалить изображения и видео..."
    },
    {
        pattern: /^Implement\s+reviewer\s+feedback\s+on\s+a\s+Canva\s+design\.\s*Reads\s+all\s+comment\s+threads.*$/i,
        replace: () => "Применить правки ревьюера к дизайну Canva: чтение всех веток комментариев и внесение изменений..."
    },
    {
        pattern: /^Resize\s+a\s+Canva\s+design\s+into\s+multiple\s+social\s+media\s+formats.*$/i,
        replace: () => "Изменить размер дизайна Canva под форматы соцсетей (пост и история Facebook, Instagram и др.)..."
    },
    {
        // Figma example prompts
        pattern: /^Implement\s+this\s+Figma\s+frame\s+as\s+a\s+React\s+component:\s*(?:<link>|<ссылка>)$/i,
        replace: () => "Реализовать этот фрейм Figma как React-компонент: <ссылка>"
    },
    {
        pattern: /^Connect\s+my\s+Button\s+component\s+to\s+its\s+Figma\s+component\s+with\s+Code\s+Connect\.?$/i,
        replace: () => "Связать мой компонент Button с компонентом Figma через Code Connect"
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+Figma\s+design\s+for\s+a\s+login\s+screen\s+that\s+matches\s+my\s+design\s+system\.?$/i,
        replace: () => "Создать дизайн экрана входа в Figma в соответствии с моей дизайн-системой"
    },
    {
        // Mobbin description, example prompts & commands
        pattern: /^Give\s+your\s+AI\s+agent\s+600[,.]?000\+\s+real\s+app\s+screens,\s*and\s+the\s+skills\s+to\s+use\s+them\.\s*Includes\s+the\s+Mobbin\s+MCP.*$/i,
        replace: () => "Предоставьте вашему ИИ-агенту более 600 000 экранов реальных приложений и навыки работы с ними. Включает Mobbin MCP и навык редизайна экранов на основе проверенных паттернов реальных приложений в вашей дизайн-системе с референсами для каждого изменения."
    },
    {
        pattern: /^Find\s+home\s+screen\s+examples\s+from\s+banking\s+apps\s+and\s+save\s+them\s+to\s+a\s+collection\.?$/i,
        replace: () => "Найти примеры главных экранов банковских приложений и сохранить их в коллекцию"
    },
    {
        pattern: /^Compare\s+how\s+AI\s+tools\s+design\s+their\s+pricing\s+sections\.?$/i,
        replace: () => "Сравнить, как ИИ-сервисы оформляют разделы с тарифами"
    },
    {
        pattern: /^Review\s+my\s+paywall\s+screen\s+against\s+the\s+ones\s+I\s+saved\s+in\s+collections\.?$/i,
        replace: () => "Проверить мой экран пейволла в сравнении с сохранёнными в коллекциях"
    },
    {
        pattern: /^Tells\s+your\s+agent\s+what\s+Mobbin\s+can\s+and\s+can(?:'t|’t)\s+do\s+and\s+how\s+the\s+Mobbin\s+skills\s+work\s+together.*$/i,
        replace: () => "Объясняет агенту возможности Mobbin и то, как навыки Mobbin работают вместе для выбора правильного подхода..."
    },
    {
        pattern: /^Makes\s+every\s+report\s+a\s+Mobbin\s+skill\s+writes\s+read\s+like\s+a\s+person\s+wrote\s+it.*$/i,
        replace: () => "Делает каждый отчёт навыка Mobbin живым и понятным, простым языком интерфейса..."
    },
    {
        pattern: /^Redesign\s+any\s+screen\s+from\s+patterns\s+real\s+apps\s+ship\.\s*Share\s+a\s+screenshot.*$/i,
        replace: () => "Редизайн любого экрана на основе паттернов реальных приложений по скриншоту, коду или макету..."
    },
    {
        pattern: /^Gets\s+better\s+results\s+from\s+every\s+Mobbin\s+search,\s*so\s+the\s+references\s+match.*$/i,
        replace: () => "Улучшает результаты каждого поиска в Mobbin, чтобы референсы точно соответствовали вашей задаче..."
    },
    {
        // Atlassian Teamwork Graph CLI description, prompts & commands
        pattern: /^Teamwork\s+Graph\s+CLI\s+is\s+Atlassian(?:'s|’s)\s+agent-first\s+interface\s+to\s+your\s+entire\s+work\s+context:[\s\S]*$/i,
        replace: (m) => /Purpose-built/i.test(m[0])
            ? "Teamwork Graph CLI — это интерфейс Atlassian для ИИ-агентов ко всему вашему рабочему контексту: задачам Jira, страницам Confluence, пул-реквестам Bitbucket и подключённым сторонним источникам данных. Создан специально для кодинг-агентов вроде Antigravity (в терминале или на десктопе) на базе графа контекста Atlassian. Попробуйте: «составь задачу в Jira из этого PR и привяжи её к эпику». Запустите /twg-setup после установки, чтобы подключить Atlassian Teamwork Graph CLI к Antigravity."
            : "Teamwork Graph CLI — это интерфейс Atlassian для ИИ-агентов ко всему вашему рабочему контексту: задачам Jira, страницам Confluence, пул-реквестам Bitbucket и подключенным источникам данных."
    },
    {
        pattern: /^Help\s+me\s+implement\s+\[JIRA-123\]\.\s*Retrieve\s+the\s+requirements.*$/i,
        replace: () => "Помоги мне реализовать [JIRA-123]. Получи требования, критерии приёмки и связанные архитектурные решения. Изучи этот репозиторий и предложи план реализации перед изменением кода."
    },
    {
        pattern: /^Investigate\s+\[JIRA-123\]\s+in\s+this\s+repository\.\s*Find\s+related\s+bugs.*$/i,
        replace: () => "Исследуй [JIRA-123] в этом репозитории. Найди связанные баги, предыдущие исправления и релевантные технические решения. Предложи исправление и тесты для его проверки."
    },
    {
        pattern: /^Review\s+my\s+current\s+changes\s+against\s+\[JIRA-123\]\s+and\s+its\s+linked\s+specification.*$/i,
        replace: () => "Проверь мои текущие изменения на соответствие [JIRA-123] и связанной спецификации. Отметь пропущенные требования, противоречивые решения и недостающие тесты."
    },
    {
        pattern: /^Install,\s*upgrade,\s*authenticate,\s*or\s+repair\s+`?twg`?\s+for\s+Antigravity.*$/i,
        replace: () => "Установка, обновление, авторизация или восстановление `twg` для Antigravity, включая установку CLI, навыков и проверку авторизации..."
    },
    {
        // Dropbox prompts, overview & commands
        pattern: /^Find\s+and\s+summarize\s+the\s+Q4\s+planning\s+deck\s+in\s+Dropbox\.?$/i,
        replace: () => "Найти и сделать сводку презентации планирования на 4-й квартал в Dropbox"
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+shared\s+link\s+for\s+the\s+Launch\s+folder\.?$/i,
        replace: () => "Создать общую ссылку для папки Launch"
    },
    {
        pattern: /^Review\s+duplicate\s+exports\s+in\s+this\s+folder\s+and\s+ask\s+before\s+deleting\s+anything\.?$/i,
        replace: () => "Проверить дубликаты экспортов в этой папке и спросить перед удалением"
    },
    {
        pattern: /^Dropbox\s+for\s+Google\s+Antigravity$/i,
        replace: () => "Dropbox для Google Antigravity"
    },
    {
        pattern: /^Find,\s*summarize,\s*share,\s*collect\s+uploads,\s*and\s+organize\s+your\s+Dropbox\s+files\s+in\s+Antigravity.*$/i,
        replace: () => "Находите, делайте сводки, делитесь, собирайте загрузки и упорядочивайте файлы Dropbox в Antigravity. Antigravity запрашивает подтверждение перед внесением изменений в ваши файлы."
    },
    {
        pattern: /^Clean\s+up\s+Dropbox\s+content\s+by\s+identifying\s+obsolete,\s*duplicate,\s*temporary,\s*or\s+unwanted\s+files.*$/i,
        replace: () => "Очистка содержимого Dropbox путём выявления устаревших, дублирующихся, временных или ненужных файлов..."
    },
    {
        pattern: /^(?:Create|Создать|Создано),\s*inspect,\s*and\s+manage\s+Dropbox\s+file\s+requests\s+for\s+collecting\s+uploads.*$/i,
        replace: () => "Создание, проверка и управление запросами файлов в Dropbox для сбора загрузок от других пользователей..."
    },
    {
        pattern: /^Find\s+Dropbox\s+files\s+and\s+folders\s+relevant\s+to\s+a\s+user\s+request.*$/i,
        replace: () => "Поиск файлов и папок в Dropbox по запросу пользователя..."
    },
    {
        pattern: /^(?:Inspect|Проверка)\s+a\s+Dropbox\s+file\s+or\s+folder\s+by\s+checking\s+metadata,\s*shared\s+links.*$/i,
        replace: () => "Проверка файла или папки в Dropbox: просмотр метаданных, общих ссылок и содержимого файла..."
    },
    {
        pattern: /^Organize\s+Dropbox\s+files\s+and\s+folders\s+by\s+creating\s+folders,\s*copying\s+content.*$/i,
        replace: () => "Организация файлов и папок в Dropbox: создание папок, копирование и перемещение содержимого..."
    },
    {
        pattern: /^Share\s+Dropbox\s+files\s+or\s+folders\s+by\s+creating\s+shared\s+links,\s*inspecting\s+existing.*$/i,
        replace: () => "Общий доступ к файлам и папкам Dropbox: создание и проверка общих ссылок..."
    },
    {
        // Linear prompts & README sections
        pattern: /^Show\s+my\s+assigned\s+Linear\s+issues,\s*grouped\s+by\s+priority\.?$/i,
        replace: () => "Покажи назначенные мне задачи в Linear, сгруппированные по приоритету."
    },
    {
        pattern: /^Summarize\s+recent\s+updates\s+to\s+my\s+Linear\s+projects\.?$/i,
        replace: () => "Сделай сводку последних обновлений по моим проектам в Linear."
    },
    {
        pattern: /^Find\s+Linear\s+issues\s+related\s+to\s+the\s+code\s+I\s+am\s+working\s+on\.?$/i,
        replace: () => "Найди задачи в Linear, связанные с кодом, над которым я работаю."
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+Linear\s+issue\s+for\s+the\s+bug\s+we\s+just\s+found\.?$/i,
        replace: () => "Создай задачу в Linear для только что найденного бага."
    },
    {
        pattern: /^Add\s+a\s+progress\s+update\s+to\s+the\s+issue\s+I\s+am\s+working\s+on\.?$/i,
        replace: () => "Добавь обновление статуса в задачу, над которой я работаю."
    },
    {
        pattern: /^(?:Check|Проверка)\s+that\s+the\s+plugin\s+is\s+enabled,\s*then\s+open$/i,
        replace: () => "Убедитесь, что плагин включён, затем откройте"
    },
    {
        pattern: /^Linear\s+for\s+Antigravity$/i,
        replace: () => "Linear для Antigravity"
    },
    {
        pattern: /^Bring\s+your\s+Linear\s+workspace\s+into\s+Antigravity$/i,
        replace: () => "Подключите рабочее пространство Linear к Antigravity"
    },
    {
        pattern: /^Find\s+issues,\s*manage\s+projects,\s*and\s+keep\s+your\s+work\s+up\s+to\s+date\.\s*Connect\s+your\s+code\s+to\s+the\s+work\s+happening\s+in\s+Linear\.?$/i,
        replace: () => "Находите задачи, управляйте проектами и поддерживайте актуальность работы. Свяжите свой код с задачами в Linear."
    },
    {
        pattern: /^The\s+Linear\s+plugin\s+connects\s+Antigravity\s+to\s+your\s+Linear\s+workspace\..*$/i,
        replace: () => "Плагин Linear подключает Antigravity к вашему рабочему пространству Linear. Находите задачи, читайте обновления проектов, создавайте или обновляйте задачи и документы, не покидая процесс разработки."
    },
    // --- v2.1.12: monday.com, Notion, PandaDoc, Trello ---
    {
        pattern: /^Plan\s+and\s+track\s+work\s+in\s+monday\.com\s+from\s+Antigravity:\s*create,\s*update\s+and\s+assign\s+items,\s*write\s+docs,\s*and\s+build\s+forms.*$/i,
        replace: () => "Планируйте и отслеживайте работу в monday.com из Antigravity: создавайте, обновляйте и назначайте элементы, пишите документацию и создавайте формы, превращающие заявки в задачи."
    },
    {
        pattern: /^Onboard\s+me\s+to\s+monday\.com\.?$/i,
        replace: () => "Помоги мне начать работу с monday.com"
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+monday\.com\s+item\s+for\s+each\s+TODO\s+in\s+this\s+file\s+and\s+assign\s+them\s+to\s+me\.?$/i,
        replace: () => "Создать элемент monday.com для каждого TODO в этом файле и назначить их мне"
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+monday\.com\s+bug\s+report\s+form\s+with\s+summary,\s*steps\s+to\s+reproduce\s+and\s+severity\s+questions\.?$/i,
        replace: () => "Создать форму отчёта об ошибке в monday.com с полями описания, шагов воспроизведения и серьёзности"
    },
    {
        pattern: /^Bring\s+monday\.com\s+into\s+Antigravity\.\s*Create,\s*update\s+and\s+assign\s+items,\s*write\s+docs\s+and\s+set\s+up\s+forms\s+without\s+leaving\s+your\s+editor\.?$/i,
        replace: () => "Подключите monday.com к Antigravity. Создавайте, обновляйте и назначайте элементы, пишите документы и настраивайте формы, не покидая редактор."
    },
    {
        pattern: /^(?:\d+\.\s*)?Try\s+a\s+starter\s+prompt,\s*or\s+ask\s+something\s+like\s+["“«]Mark\s+the\s+'Login\s+bug'\s+item\s+on\s+my\s+Sprint\s+board\s+as\s+Done["”»]\.?$/i,
        replace: (m) => (/^\d+\./.test(m[0]) ? "3. " : "") + "Попробуйте стартовый запрос или напишите, например: «Отметь задачу 'Login bug' на моей доске Спринт как выполненную»"
    },
    {
        pattern: /^Creates,\s*reads,\s*edits,\s*and\s+comments\s+on\s+monday\.com\s+docs\s*[—–-]\s*the\s+rich-content\s+surface\s+inside\s+monday.*$/i,
        replace: () => "Создаёт, читает, редактирует и комментирует документы monday.com — рабочую среду с форматированным контентом..."
    },
    {
        pattern: /^Creates\s+and\s+edits\s+monday\.com\s+WorkForms\s*[—–-]\s*public\s+intake\s+forms\s+that\s+capture\s+responses\s+as\s+new\s+items.*$/i,
        replace: () => "Создаёт и редактирует формы monday.com WorkForms — публичные формы сбора заявок, сохраняющие ответы как новые элементы..."
    },
    {
        pattern: /^First-run\s+onboarding\s+for\s+people\s+who\s+just\s+connected\s+monday\.com\s+and\s+have\s+not\s+set\s+anything\s+up\s+yet.*$/i,
        replace: () => "Первичная настройка и знакомство для пользователей, которые только что подключили monday.com..."
    },
    {
        pattern: /^Creates,\s*updates,\s*assigns,\s*and\s+manages\s+items\s+across\s+monday\.com\s+boards\.\s*monday\.com\s+is\s+a\s+customiza.*$/i,
        replace: () => "Создаёт, обновляет, назначает и управляет элементами на досках monday.com..."
    },
    {
        // Notion example prompts, overview & commands
        pattern: /^(?:Set\s+up|Установите\s+для\s+переменной\s+окружения\s+up)\s+Notion\s+so\s+you\s+can\s+use\s+my\s+workspace\s+as\s+context\.?$/i,
        replace: () => "Настроить Notion, чтобы использовать моё рабочее пространство как контекст"
    },
    {
        pattern: /^Turn\s+this\s+spec\s+in\s+Notion\s+into\s+an\s+implementation\s+plan\s+with\s+tasks\.?$/i,
        replace: () => "Превратить эту спецификацию в Notion в план реализации с задачами"
    },
    {
        pattern: /^Write\s+a\s+weekly\s+update\s+for\s+my\s+project\s+from\s+what\s+changed\s+in\s+Notion\.?$/i,
        replace: () => "Написать еженедельный отчёт по моему проекту на основе изменений в Notion"
    },
    {
        pattern: /^(?:Check|Проверка)\s+the\s+plugin\s+the\s+way\s+Antigravity\s+loads\s+it\s*:$/i,
        replace: () => "Проверьте плагин так, как его загружает Antigravity:"
    },
    {
        // Notion 7 commands (/notion-database-designer .. /notion-weekly-project-digest)
        pattern: /^Turns\s+scattered\s+notes\s+and\s+recurring\s+work\s+into\s+useful\s+Notion\s+trackers\s+for\s+requests.*$/i,
        replace: () => "Превращает разрозненные заметки и регулярные задачи в удобные трекеры Notion для заявок, контент-планов..."
    },
    {
        pattern: /^Captures\s+conversations\s+and\s+supplied\s+notes\s+as\s+Notion\s+wiki\s+pages,\s*how-to\s+guides,\s*FAQs.*$/i,
        replace: () => "Сохраняет диалоги и заметки в виде вики-страниц Notion, практических руководств, FAQ и решений..."
    },
    {
        pattern: /^Prepares\s+meeting\s+agendas,\s*internal\s+pre-reads,\s*and\s+decision\s+briefs\s+using\s+Notion\s+context.*$/i,
        replace: () => "Готовит повестки встреч, предварительные материалы и резюме решений с использованием контекста Notion..."
    },
    {
        pattern: /^Researches\s+questions\s+across\s+Notion\s+sources\s+and\s+synthesizes\s+cited\s+briefs,\s*comparisons.*$/i,
        replace: () => "Исследует вопросы по источникам Notion и формирует сводки с цитатами, сравнения и обзоры..."
    },
    {
        pattern: /^A\s+guided\s+setup\s+flow\s+to\s+get\s+the\s+most\s+out\s+of\s+Notion\s+that\s+is\s+recommended\s+for\s+all\s+users.*$/i,
        replace: () => "Пошаговый процесс настройки для эффективной работы с Notion, рекомендуемый всем пользователям плагина..."
    },
    {
        pattern: /^Converts\s+Notion\s+product\s+or\s+technical\s+specs\s+into\s+implementation\s+plans,\s*linked\s+tasks.*$/i,
        replace: () => "Преобразует продуктовые или технические спецификации Notion в планы реализации, связанные задачи и..."
    },
    {
        pattern: /^Produces\s+evidence-based\s+weekly\s+project\s+or\s+team\s+updates\s+by\s+comparing\s+reporting\s+periods.*$/i,
        replace: () => "Формирует еженедельные отчёты по проектам и командам на основе данных путём сравнения отчётных периодов..."
    },
    {
        // PandaDoc description, example prompts & 10 commands
        pattern: /^(?:Create|Создать|Создано)\s+and\s+send\s+proposals,\s*quotes,\s*and\s+contracts\s+for\s+e-signature\.\s*Track\s+signing\s+progress\s+and\s+identify\s+documents\s+that\s+need\s+follow-up\.?$/i,
        replace: () => "Создавайте и отправляйте коммерческие предложения, сметы и договоры на электронную подпись. Отслеживайте статус подписания и находите документы, требующие напоминания."
    },
    {
        pattern: /^(?:List|Список)\s+my\s+5\s+most\s+recently\s+modified\s+PandaDoc\s+documents\s+with\s+their\s+status\s*\.?$/i,
        replace: () => "Показать 5 моих недавно изменённых документов PandaDoc с их статусами."
    },
    {
        pattern: /^Show\s+my\s+signing\s+pipeline\s+and\s+identify\s+documents\s+that\s+are\s+stuck\.?$/i,
        replace: () => "Показать мою воронку подписания и выявить зависшие документы."
    },
    {
        pattern: /^Find\s+unsigned\s+documents\s+and\s+draft\s+follow-up\s+messages\s+without\s+sending\s+them\.?$/i,
        replace: () => "Найти неподписанные документы и подготовить черновики напоминаний без отправки."
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+document\s+from\s+a\s+template\s+and\s+route\s+it\s+through\s+its\s+internal\s+approval\s+chain.*$/i,
        replace: () => "Создать документ по шаблону и направить его по внутренней цепочке согласования — чтение правил и отправка..."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+register\s+of\s+(?:signed|completed\s+and\s+active\s+PandaDoc)\s+contracts.*$/i,
        replace: () => "Сформировать реестр подписанных договоров с ключевыми условиями — контрагентом, датами, суммой и..."
    },
    {
        pattern: /^Track\s+per-recipient\s+signing\s+progress\s+across\s+documents\s+that\s+are\s+out.*$/i,
        replace: () => "Отслеживать прогресс подписания по каждому получателю для отправленных документов — кто подписал, кто..."
    },
    {
        pattern: /^Sweep\s+documents\s+that\s+are\s+still\s+out\s+for\s+signature,\s*rank\s+them\s+by\s+how\s+long\s+they\s+have\s+been\s+waiting.*$/i,
        replace: () => "Проверить документы, ожидающие подписи, отсортировать их по времени ожидания и подготовить список..."
    },
    {
        pattern: /^Turn\s+a\s+signed\s+quote\s+or\s+proposal\s+into\s+an\s+invoice\s*[—–-]\s*find\s+quotes\s+that\s+completed.*$/i,
        replace: () => "Превратить подписанную смету или предложение в счёт — найти завершённые сметы без выставленного счёта..."
    },
    {
        pattern: /^Send\s+a\s+standard\s+NDA\s+to\s+a\s+counterparty\s+in\s+one\s+motion\s*[—–-]\s*find\s+the\s+right\s+NDA\s+template.*$/i,
        replace: () => "Отправить стандартное NDA контрагенту в одно действие — найти нужный шаблон NDA, предзаполнить..."
    },
    {
        pattern: /^Generate\s+an\s+onboarding\s+or\s+employment\s+document\s+from\s+a\s+template\s+with\s+the\s+new\s+join.*$/i,
        replace: () => "Сформировать документ о приёме на работу или онбординге по шаблону с данными нового сотрудника..."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+priced\s+PandaDoc\s+quote\s+or\s+proposal\s+from\s+a\s+template.*$/i,
        replace: () => "Создать коммерческое предложение или смету PandaDoc с расчётом стоимости по шаблону — заполнить таблицу цен..."
    },
    {
        pattern: /^Digest\s+of\s+signed\s+contracts\s+approaching\s+renewal\s+or\s+expiry,\s*with\s+counterparty,\s*value.*$/i,
        replace: () => "Сводка подписанных договоров с подходящим сроком продления или истечения: контрагент, сумма и остаток дней..."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+signing\s+pipeline\s+report.*$/i,
        replace: () => "Сформировать отчёт по воронке подписания — количество по статусам, среднее время подписания, сумма в работе..."
    },
    {
        // Trello description, example prompts & commands
        pattern: /^Official\s+Trello\s+plugin\s+with\s+the\s+Trello\s+MCP\s+server\s+and\s+a\s+skill\s+for\s+boards,\s*lists,\s*cards,\s*checklists,\s*Inbox,\s*and\s+Planner\.?$/i,
        replace: () => "Официальный плагин Trello с MCP-сервером Trello и навыком для работы с досками, списками, карточками, чек-листами, Входящими и Планировщиком."
    },
    {
        pattern: /^Summarize\s+the\s+cards\s+that\s+are\s+due\s+this\s+week\s+across\s+my\s+Trello\s+boards\.?$/i,
        replace: () => "Сделать сводку карточек со сроком выполнения на этой неделе по всем моим доскам Trello."
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+a\s+Trello\s+card\s+on\s+my\s+board\s+for\s+each\s+TODO\s+in\s+this\s+file\.?$/i,
        replace: () => "Создать карточку Trello на моей доске для каждого TODO в этом файле."
    },
    {
        pattern: /^Show\s+what\s+is\s+in\s+my\s+Trello\s+Inbox\s+and\s+suggest\s+a\s+board\s+and\s+list\s+for\s+each\s+card\.?$/i,
        replace: () => "Показать содержимое моих Входящих в Trello и предложить доску и список для каждой карточки."
    },
    {
        pattern: /^\*\*MANDATORY\s+prerequisite\*\*\s*[—–-]\s*load\s+this\s+BEFORE\s+calling\s+any\s+Trello\s+MCP\s+tool.*$/i,
        replace: () => "**ОБЯЗАТЕЛЬНОЕ требование** — загрузите этот навык ПЕРЕД вызовом любого инструмента Trello MCP (`trelloRead*`, `trelloWrite*`, `trello...`)..."
    },
    // --- v2.1.14: Background Commands, Timers, Diff Viewer, Git Panel & Timeline ---
    {
        // "Cancel (Ctrl+D)" / general "<Label> (<Shortcut>)"
        pattern: /^(Cancel|Search|Copy|Paste|Cut|Undo|Redo|Save|Close|Open|Refresh|Reload|Submit|Send|Stop)\s*\(((?:Ctrl|Alt|Shift|Cmd|⌘|⌥|⇧|Enter|Esc)[^)]*)\)$/i,
        replace: (match) => {
            const word = match[1].toLowerCase();
            const map = {
                cancel: 'Отмена',
                search: 'Поиск',
                copy: 'Копировать',
                paste: 'Вставить',
                cut: 'Вырезать',
                undo: 'Отменить',
                redo: 'Повторить',
                save: 'Сохранить',
                close: 'Закрыть',
                open: 'Открыть',
                refresh: 'Обновить',
                reload: 'Перезагрузить',
                submit: 'Отправить',
                send: 'Отправить',
                stop: 'Остановить'
            };
            return `${map[word] || match[1]} (${match[2]})`;
        }
    },
    {
        // "Sends after agent finishes working"
        pattern: /^Sends?\s+after\s+agent\s+finishes\s+working\.?$/i,
        replace: () => "Отправится после завершения работы агента"
    },
    {
        // "Queue Message Enter" / "Queue Message"
        pattern: /^Queue\s+Message(?:\s+(Enter|Ctrl\+Enter|Shift\+Enter|Alt\+Enter|⌘\+Enter))?$/i,
        replace: (match) => "Поставить сообщение в очередь" + (match[1] ? (" " + match[1]) : "")
    },
    {
        // "Send Immediately Alt+Enter" / "Send Now Alt+Enter"
        pattern: /^Send\s+(Immediately|Now)(?:\s+(Enter|Ctrl\+Enter|Shift\+Enter|Alt\+Enter|⌘\+Enter))?$/i,
        replace: (match) => (/^immediately$/i.test(match[1]) ? "Отправить немедленно" : "Отправить сейчас") + (match[2] ? (" " + match[2]) : "")
    },
    {
        // Google Docs example prompts, overview & /gdocs command
        pattern: /^Summarize\s+this\s+design\s+doc\s+and\s+list\s+the\s+open\s+questions\.?$/i,
        replace: () => "Сделать сводку этого дизайн-документа и выписать открытые вопросы"
    },
    {
        pattern: /^Draft\s+a\s+launch\s+announcement\s+in\s+a\s+new\s+doc\s+from\s+my\s+notes\.?$/i,
        replace: () => "Составить черновик анонса запуска в новом документе на основе моих заметок"
    },
    {
        pattern: /^Reply\s+to\s+the\s+open\s+comments\s+on\s+my\s+doc\s+and\s+resolve\s+them\.?$/i,
        replace: () => "Ответить на открытые комментарии в моём документе и закрыть их"
    },
    {
        pattern: /^(?:Read|Чтение)\s+and\s+write\s+your\s+Google\s+Docs\.\s*Summarize\s+any\s+doc\s+from\s+its\s+link,\s*draft\s+proposals\s+and\s+announcements\s+in\s+a\s+new\s+doc,\s*and\s+reply\s+to\s+and\s+resolve\s+open\s+comments\s*\.?$/i,
        replace: () => "Чтение и редактирование ваших документов Google Docs. Делайте сводки любого документа по ссылке, составляйте черновики предложений и анонсов в новом документе, а также отвечайте на открытые комментарии и закрывайте их."
    },
    {
        pattern: /^(?:Read|Чтение),\s*create,\s*edit,\s*and\s+manage\s+Google\s+Docs\.\s*Use\s+when\s+the\s+user\s+shares\s+a\s+docs\.google\.com\s+URL.*$/i,
        replace: () => "Чтение, создание, редактирование и управление документами Google Docs. Используется, когда пользователь делится ссылкой docs.google.com, просит сделать сводку..."
    },
    // --- v2.1.15: Tool arguments / Tool Output & Google Workspace Plugins (Sheets, Slides, Drive, Calendar) ---
    {
        // "Tool arguments" / "Tool Arguments" / "Tool output" / "Tool Output" / "Tool input" / "Tool result"
        pattern: /^Tool\s+(arguments?|outputs?|inputs?|results?|parameters?|calls?)$/i,
        replace: (match) => {
            const w = match[1].toLowerCase();
            if (w.startsWith('argument')) return "Аргументы инструмента";
            if (w.startsWith('output')) return "Вывод инструмента";
            if (w.startsWith('input')) return "Входные данные инструмента";
            if (w.startsWith('result')) return "Результат инструмента";
            if (w.startsWith('parameter')) return "Параметры инструмента";
            return "Вызов инструмента";
        }
    },
    {
        // Google Sheets: subtitle, example prompts, overview & /gsheets command/skill
        pattern: /^(?:Read|Чтение),\s*write,\s*and\s+format\s+spreadsheets\.?$/i,
        replace: () => "Чтение, запись и форматирование электронных таблиц."
    },
    {
        pattern: /^Find\s+the\s+trends\s+and\s+outliers\s+in\s+this\s+sales\s+sheet\.?$/i,
        replace: () => "Найти тренды и аномалии в этой таблице продаж"
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+monthly\s+budget\s+tracker\s+with\s+formulas\s+and\s+a\s+chart\.?$/i,
        replace: () => "Создать трекер ежемесячного бюджета с формулами и диаграммой"
    },
    {
        pattern: /^Import\s+this\s+CSV\s+and\s+turn\s+it\s+into\s+a\s+pivot\s+table\s+by\s+region\.?$/i,
        replace: () => "Импортировать этот CSV и превратить его в сводную таблицу по регионам"
    },
    {
        pattern: /^(?:Read|Чтение),\s*write,\s*and\s+format\s+your\s+Google\s+Sheets\.\s*Fill\s+in\s+formulas,\s*sort\s+and\s+clean\s+columns,\s*import\s+CSVs,\s*build\s+charts\s+and\s+pivot\s+tables,\s*and\s+export\s+the\s+result\s*\.?$/i,
        replace: () => "Чтение, запись и форматирование ваших таблиц Google Sheets. Заполняйте формулы, сортируйте и очищайте столбцы, импортируйте CSV-файлы, стройте диаграммы и сводные таблицы, а также экспортируйте результат."
    },
    {
        pattern: /^(?:Read|Чтение),\s*write,\s*format,\s*and\s+manage\s+Google\s+Sheets\.\s*Use\s+when\s+the\s+user\s+shares\s+a\s+sheets\.google\.com.*$/i,
        replace: () => "Чтение, запись, форматирование и управление таблицами Google Sheets. Используется, когда пользователь делится ссылкой sheets.google.com или docs.google.com..."
    },
    {
        // Google Slides: subtitle, example prompts, overview & /gslides command/skill
        pattern: /^(?:Read|Чтение),\s*edit,\s*and\s+export\s+presentations\.?$/i,
        replace: () => "Чтение, редактирование и экспорт презентаций."
    },
    {
        pattern: /^Turn\s+my\s+project\s+notes\s+into\s+a\s+10-slide\s+pitch\s+deck\.?$/i,
        replace: () => "Превратить мои заметки по проекту в презентацию из 10 слайдов"
    },
    {
        pattern: /^Add\s+a\s+summary\s+slide\s+and\s+speaker\s+notes\s+to\s+my\s+review\s+deck\.?$/i,
        replace: () => "Добавить итоговый слайд и заметки докладчика в мою презентацию"
    },
    {
        pattern: /^Export\s+the\s+final\s+deck\s+as\s+a\s+PDF\.?$/i,
        replace: () => "Экспортировать готовую презентацию в PDF"
    },
    {
        pattern: /^(?:Build|Сборка)\s+and\s+polish\s+your\s+Google\s+Slides\.\s*Turn\s+notes\s+into\s+a\s+deck,\s*add\s+slides,\s*images,\s*and\s+speaker\s+notes,\s*and\s+export\s+the\s+result\s+to\s+PDF\s+or\s+PowerPoint\s*\.?$/i,
        replace: () => "Создавайте и оформляйте презентации Google Slides. Превращайте заметки в презентацию, добавляйте слайды, изображения и заметки докладчика, а также экспортируйте результат в PDF или PowerPoint."
    },
    {
        pattern: /^(?:Read|Чтение),\s*create,\s*and\s+edit\s+Google\s+Slides\s+presentations\.\s*Use\s+when\s+creating\s+presentations.*$/i,
        replace: () => "Чтение, создание и редактирование презентаций Google Slides. Используется при создании презентаций, когда пользователь делится ссылкой slides.google.com..."
    },
    {
        // Google Drive: subtitle, example prompts, overview & /gdrive command/skill
        pattern: /^(?:Search|Поиск),\s*upload,\s*download,\s*and\s+share\s+files\.?$/i,
        replace: () => "Поиск, загрузка, скачивание и совместный доступ к файлам."
    },
    {
        pattern: /^Find\s+last\s+quarter(?:'s|’s)\s+budget\s+and\s+share\s+it\s+with\s+Alex\.?$/i,
        replace: () => "Найти бюджет за прошлый квартал и поделиться им с Алексом"
    },
    {
        pattern: /^Move\s+this\s+week(?:'s|’s)\s+design\s+exports\s+into\s+the\s+Launch\s+folder\.?$/i,
        replace: () => "Переместить экспорты дизайна за эту неделю в папку Launch"
    },
    {
        pattern: /^(?:Download|Скачивание)\s+the\s+Q3\s+report\s+as\s+a\s+PDF\.?$/i,
        replace: () => "Скачать отчёт за 3-й квартал в формате PDF"
    },
    {
        pattern: /^Find\s+and\s+organize\s+your\s+Google\s+Drive\.\s*Search\s+across\s+your\s+files,\s*tidy\s+up\s+folders,\s*share\s+them\s+with\s+the\s+right\s+people,\s*and\s+download\s+or\s+export\s+them\s+as\s+PDF,\s*CSV,\s*or\s+Markdown\s*\.?$/i,
        replace: () => "Находите и упорядочивайте файлы на Google Диске. Ищите по всем файлам, наводите порядок в папках, делитесь ими с нужными людьми и скачивайте или экспортируйте их в PDF, CSV или Markdown."
    },
    {
        pattern: /^Browse,\s*search,\s*and\s+manage\s+Google\s+Drive\s+files\s+and\s+folders\.\s*Use\s+when\s+the\s+user\s+shares\s+a\s+drive\.google\.com\s+URL.*$/i,
        replace: () => "Просмотр, поиск и управление файлами и папками Google Диска. Используется, когда пользователь делится ссылкой drive.google.com, спрашивает о содержимом папки..."
    },
    {
        // Google Calendar: subtitle, example prompts, overview & /gcalendar command/skill
        pattern: /^(?:Check|Проверка)\s+availability,\s*schedule\s+events,\s*and\s+RSVP\.?$/i,
        replace: () => "Проверка занятости, планирование встреч и ответы на приглашения."
    },
    {
        pattern: /^Book\s+30\s+minutes\s+with\s+Priya\s+and\s+Sam\s+next\s+week\.?$/i,
        replace: () => "Забронировать 30 минут с Прией и Сэмом на следующей неделе"
    },
    {
        pattern: /^What(?:'s|’s)\s+on\s+my\s+calendar\s+today\?\s*Flag\s+any\s+conflicts\.?$/i,
        replace: () => "Что в моём календаре на сегодня? Отметь любые пересечения"
    },
    {
        pattern: /^Block\s+focus\s+time\s+before\s+Friday(?:'s|’s)\s+launch\s+review\.?$/i,
        replace: () => "Выделить время для фокусировки перед пятничным обзором запуска"
    },
    {
        pattern: /^(?:Run|Запуск)\s+your\s+Google\s+Calendar\.\s*Find\s+a\s+time\s+that\s+works\s+for\s+everyone,\s*send\s+invites,\s*block\s+focus\s+time,\s*and\s+get\s+briefed\s+on\s+your\s+day\s+with\s+any\s+conflicts\s+flagged\s*\.?$/i,
        replace: () => "Управляйте своим Google Календарём. Находите удобное для всех время, отправляйте приглашения, выделяйте время для фокусировки и получайте сводку на день с отметкой пересечений."
    },
    {
        pattern: /^(?:Read|Чтение),\s*create,\s*and\s+manage\s+Google\s+Calendar\s+events\.\s*Use\s+when\s+the\s+user\s+shares\s+a\s+calendar\.google\.com\s+URL.*$/i,
        replace: () => "Чтение, создание и управление событиями Google Календаря. Используется, когда пользователь делится ссылкой calendar.google.com, спрашивает о своём расписании..."
    },
    {
        // "Background Commands" / "Background Commands 50"
        pattern: /^Background\s+Commands?(?:\s+(\d+))?$/i,
        replace: (match) => (/commands/i.test(match[0]) ? "Фоновые команды" : "Фоновая команда") + (match[1] ? (" " + match[1]) : "")
    },
    {
        // "30s timer" / "45s timer" / "1m timer" / "1m 30s timer"
        pattern: /^((?:\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\s*)+)timer(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const rawDur = match[1].trim().replace(/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/gi, (m, c, u) => {
                const first = u.toLowerCase()[0];
                const map = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                return `${c} ${map[first] || u}`;
            });
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Таймер на ${rawDur}${arrow}`;
        }
    },
    {
        // "View Split Diff" / "Просмотр Split Diff" / "View Inline Diff" / "Просмотр Inline Diff"
        pattern: /^(?:(?:View|Просмотр)\s+)?(Split|Inline|Unified)\s+Diff$/i,
        replace: (match) => /^split$/i.test(match[1]) ? "Раздельный режим сравнения" : "Встроенный режим сравнения"
    },
    {
        // "Hide Whitespace Changes" / "Show Whitespace Changes"
        pattern: /^(Hide|Show)\s+Whitespace\s+Changes$/i,
        replace: (match) => /^hide$/i.test(match[1]) ? "Скрыть изменения пробелов" : "Показать изменения пробелов"
    },
    {
        // "+3 more lines" / "+1 more line" / "3 more lines"
        pattern: /^(\+\s*)?(\d+)\s+more\s+lines?(\.{3}|…)?$/i,
        replace: (match) => {
            const plus = match[1] ? '+ ' : '';
            const count = parseInt(match[2], 10);
            const dots = match[3] || '';
            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            let word = 'строк';
            if (n > 10 && n < 20) word = 'строк';
            else if (n1 > 1 && n1 < 5) word = 'строки';
            else if (n1 === 1) word = 'строка';
            return `${plus}ещё ${count} ${word}${dots}`;
        }
    },
    {
        // "Staged Changes" / "Unstaged Changes" / "Merge Changes" / "Changes" (with optional count)
        pattern: /^(?:(Staged|Unstaged|Merge)\s+)?Changes(?:\s*\(?(\d+)\)?)?$/i,
        replace: (match) => {
            const kind = (match[1] || '').toLowerCase();
            const count = match[2] ? (` (${match[2]})`) : '';
            if (kind === 'staged') return `Подготовленные изменения${count}`;
            if (kind === 'unstaged') return `Неподготовленные изменения${count}`;
            if (kind === 'merge') return `Изменения слияния${count}`;
            return `Изменения${count}`;
        }
    },
    {
        // "No file changes" / "No staged changes" / "No changes"
        pattern: /^No\s+(?:(file|staged)\s+)?changes(\.?)$/i,
        replace: (match) => {
            const kind = (match[1] || '').toLowerCase();
            const dot = match[2] || '';
            if (kind === 'file') return `Нет изменений в файлах${dot}`;
            if (kind === 'staged') return `Нет подготовленных изменений${dot}`;
            return `Нет изменений${dot}`;
        }
    },
    {
        // "1 turn" / "7 turns"
        pattern: /^(\d+)\s+turns?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            let word = 'шагов';
            if (n > 10 && n < 20) word = 'шагов';
            else if (n1 > 1 && n1 < 5) word = 'шага';
            else if (n1 === 1) word = 'шаг';
            return `${count} ${word}`;
        }
    },
    {
        // "2 image attachments" / "1 image attachment" / "17:07 2 image attachments" / "1 file attachment"
        pattern: /^(?:(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s+)?(\d+)\s+(?:(image|file|video|audio|media|code)\s+)?attachments?$/i,
        replace: (match) => {
            const timePrefix = match[1] ? (match[1] + ' ') : '';
            const count = parseInt(match[2], 10);
            const kind = (match[3] || '').toLowerCase();
            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            if (kind === 'image') {
                let phrase = 'прикреплённых изображений';
                if (n > 10 && n < 20) phrase = 'прикреплённых изображений';
                else if (n1 > 1 && n1 < 5) phrase = 'прикреплённых изображения';
                else if (n1 === 1) phrase = 'прикреплённое изображение';
                return `${timePrefix}${count} ${phrase}`;
            }
            if (kind === 'file') {
                let phrase = 'прикреплённых файлов';
                if (n > 10 && n < 20) phrase = 'прикреплённых файлов';
                else if (n1 > 1 && n1 < 5) phrase = 'прикреплённых файла';
                else if (n1 === 1) phrase = 'прикреплённый файл';
                return `${timePrefix}${count} ${phrase}`;
            }
            let phrase = 'вложений';
            if (n > 10 && n < 20) phrase = 'вложений';
            else if (n1 > 1 && n1 < 5) phrase = 'вложения';
            else if (n1 === 1) phrase = 'вложение';
            return `${timePrefix}${count} ${phrase}`;
        }
    },
    {
        // "Workspace" / "Workspaces"
        pattern: /^Workspaces?$/i,
        replace: (match) => /^workspaces$/i.test(match[0]) ? "Рабочие области" : "Рабочая область"
    },
    {
        // "Search tabs, files, extensions, subagents, artifacts, tasks ..."
        pattern: /^(?:Search|Поиск)\s+tabs,\s*files,\s*extensions,\s*subagents,\s*artifacts,\s*tasks(\s*(?:\.{3}|…))?$/i,
        replace: (match) => "Поиск вкладок, файлов, расширений, субагентов, артефактов, задач" + (match[1] || "")
    },
    {
        // "No extensions available"
        pattern: /^No\s+extensions\s+available(\.?)$/i,
        replace: (match) => "Нет доступных расширений" + (match[1] || "")
    },
    {
        // "Customize Sections"
        pattern: /^Customize\s+Sections$/i,
        replace: () => "Настроить разделы"
    },
    {
        // "Modified Files"
        pattern: /^Modified\s+Files$/i,
        replace: () => "Изменённые файлы"
    },
    {
        // "Open File" / "Open Files" / "Open Folder" / "Open Folders"
        pattern: /^Open\s+(File|Files|Folder|Folders)$/i,
        replace: (match) => {
            const w = match[1].toLowerCase();
            if (w === 'file') return "Открыть файл";
            if (w === 'files') return "Открыть файлы";
            if (w === 'folder') return "Открыть папку";
            return "Открыть папки";
        }
    },
    {
        // "Select Folder(s)" / "Select File(s)"
        pattern: /^Select\s+(Folder\(s\)|Folders|Folder|File\(s\)|Files|File)$/i,
        replace: (match) => {
            const w = match[1].toLowerCase();
            if (w === 'folder') return "Выбрать папку";
            if (w.startsWith('folder')) return "Выбрать папки";
            if (w === 'file') return "Выбрать файл";
            return "Выбрать файлы";
        }
    },
    {
        // "Run <target> —" / "Run <target>" / "Running <target>"
        pattern: /^(?:Running|Run)\s+(.+?)(\s*([—–-]|finished|завершено).*|\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40]))?$/i,
        replace: (match) => {
            const trailing = match[2] ? match[2] : '';
            const cmd = match[1].trim();
            if (/^real hook acceptance test$/i.test(cmd)) {
                return `Выполнение приёмочного теста хука${trailing}`;
            }
            if (/^acceptance test$/i.test(cmd)) {
                return `Выполнение приёмочного теста${trailing}`;
            }
            if (/^terminal command$/i.test(cmd)) {
                return `Выполнение команды терминала${trailing}`;
            }
            if (/^command$/i.test(cmd)) {
                return `Выполнение команды${trailing}`;
            }
            if (/^tests?$/i.test(cmd)) {
                return `Выполнение тестов${trailing}`;
            }
            if (/^(?:Check|Checking|Проверка)\s+(.+)$/i.test(cmd)) {
                const sub = cmd.match(/^(?:Check|Checking|Проверка)\s+(.+)$/i)[1];
                return `Выполняется: Проверка ${localizeActionTarget(sub)}${trailing}`;
            }
            if (/^[а-яё]/i.test(cmd)) {
                return `Выполняется: ${cmd}${trailing}`;
            }
            const locCmd = localizeActionTarget(cmd);
            if (locCmd !== cmd && /^[а-яё]/i.test(locCmd)) {
                return `Выполняется: ${locCmd}${trailing}`;
            }
            return `Запуск ${locCmd}${trailing}`;
        }
    },
    {
        // "Compacting · 59s" / "Compacting · 1m" / "Compacting"
        pattern: /^Compacting(?:\s*([·•・])\s*(.*?))?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            if (!match[2]) return 'Сжатие контекста' + arrow;
            const bullet = match[1] || '·';
            let duration = match[2].trim().replace(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g, (m, count, unit) => {
                const u = unit.toLowerCase();
                const units = { s: 'сек', sec: 'сек', secs: 'сек', m: 'мин', min: 'мин', mins: 'мин', h: 'ч', hr: 'ч', hrs: 'ч' };
                return count + ' ' + (units[u] || u);
            });
            return `Сжатие контекста ${bullet} ${duration}${arrow}`;
        }
    },
    {
        // "This page is going away soon"
        pattern: /^This\s+page\s+is\s+going\s+away\s+soon\.?$/i,
        replace: () => "Эта страница скоро будет недоступна."
    },
    {
        // "Search / Поиск conversations with 🔍 in the top left."
        pattern: /^(?:(?:Search|Поиск)\s+)?conversations\s+(?:with\s+)?(.*?)\s*in\s+the\s+top\s+left\.?$/i,
        replace: (match) => {
            const icon = match[1] ? (match[1].trim() + ' ') : '🔍 ';
            return `Поиск диалогов с помощью ${icon}в левом верхнем углу.`;
        },
    },
    {
        // "(≡ menu)." / "(𝌆 menu)" / "(menu)"
        pattern: /^\((.*?)\s*menu\)\.?$/i,
        replace: (match) => {
            const icon = match[1] ? (' ' + match[1].trim()) : '';
            return `(меню${icon}).`;
        },
    },
    {
        // "Click for commands ..." / "Type / or click for commands ..."
        pattern: /^(?:(?:Type|Press)\s+\/\s+(?:or\s+)?|(?:Type|Press)\s+)?(?:Click\s+)?for\s+commands(?:\s*\.{3}|\s*\u2026)?$/i,
        replace: (match) => {
            const m = match[0].toLowerCase();
            const dots = /(\.{3}|\u2026)$/.test(match[0].trim()) ? ' ...' : '';
            if (m.includes('type / or click') || m.includes('press / or click')) return `Введите / или нажмите для выбора команд${dots}`;
            if (m.includes('type /') || m.includes('press /')) return `Введите / для выбора команд${dots}`;
            if (m.startsWith('click')) return `Нажмите для выбора команд${dots}`;
            return `для выбора команд${dots}`;
        }
    },
    {
        // "View / Просмотр archived in the sidebar (𝌆 menu)."
        pattern: /^(?:View|Просмотр)\s+archived\s+in\s+the\s+sidebar\s*(?:\((.*?)\s*menu\))?\.?$/i,
        replace: (match) => {
            const icon = match[1] ? match[1].trim() : '𝌆';
            return `Просмотр архива в боковой панели (меню ${icon}).`;
        }
    },
    {
        // "Mark All as Read"
        pattern: /^Mark\s+All\s+as\s+Read\.?$/i,
        replace: () => "Пометить все как прочитанные"
    },
    {
        // "Sort By" / "Sort by" / "Sort by:"
        pattern: /^Sort\s+By:?$/i,
        replace: () => "Сортировка"
    },
    {
        // "Last Updated"
        pattern: /^Last\s+Updated$/i,
        replace: () => "По дате обновления"
    },
    {
        // "Last Prompt"
        pattern: /^Last\s+Prompt$/i,
        replace: () => "По последнему запросу"
    },
    {
        // "Custom Order"
        pattern: /^Custom\s+Order$/i,
        replace: () => "Пользовательский порядок"
    },
    {
        // "Toggle Maximize Auxiliary Pane"
        pattern: /^Toggle\s+Maximize\s+Auxiliary\s+Pane(?:\s+(.+))?$/i,
        replace: (match) => "Развернуть/восстановить дополнительную панель" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Mark This Conversation as Unread"
        pattern: /^Mark\s+(?:This\s+)?Conversation\s+as\s+Unread$/i,
        replace: () => "Пометить этот диалог как непрочитанный"
    },
    {
        // "Mark This Conversation as Read"
        pattern: /^Mark\s+(?:This\s+)?Conversation\s+as\s+Read$/i,
        replace: () => "Пометить этот диалог как прочитанный"
    },
    {
        // "New Tab" / "+ New Tab"
        pattern: /^(\+?\s*)New\s+Tab$/i,
        replace: (match) => (match[1] ? "+ " : "") + "Новая вкладка"
    },
    {
        // "Toggle Overview Panel"
        pattern: /^Toggle\s+Overview\s+Panel(?:\s+(Ctrl\+[^\s]+|⌘[^\s]+))?$/i,
        replace: (match) => "Показать/скрыть панель обзора" + (match[1] ? (" " + match[1]) : "")
    },
    {
        // "View / Viewing <target> >" / "View / Viewing <target>"
        pattern: /^(?:View|Viewing)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const suffix = match[2] ? match[2] : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `Просмотр ${localizeActionTarget(match[1])}${suffix}${arrow}`;
        }
    },
    {
        // "Просмотр <target> >" (if target is still in English)
        pattern: /^Просмотр\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const suffix = match[2] ? match[2] : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized !== match[1]) {
                return `Просмотр ${localized}${suffix}${arrow}`;
            }
            return match[0];
        }
    },
    // --- Настройки уведомлений и звуков (Notification & Sound Settings) ---
    {
        pattern: /^Manage\s+your\s+notification\s+preferences\.?$/i,
        replace: () => "Управление настройками уведомлений."
    },
    {
        pattern: /^Enable\s+Notifications\s+for\s+Agent\.?$/i,
        replace: () => "Включить уведомления для агента"
    },
    {
        pattern: /^Show\s+system\s+notifications\s+when\s+your\s+action\s+is\s+needed\s+or\s+the\s+agent\s+finishes\.?$/i,
        replace: () => "Показывать системные уведомления, когда требуется ваше действие или агент завершил работу."
    },
    {
        pattern: /^Sound$/i,
        replace: () => "Звук"
    },
    {
        pattern: /^Enable\s+Sounds\s+for\s+Agent\.?$/i,
        replace: () => "Включить звуки для агента"
    },
    {
        pattern: /^Play\s+a\s+sound\s+when\s+your\s+action\s+is\s+needed\s+or\s+the\s+agent\s+finishes\.?$/i,
        replace: () => "Воспроизводить звук, когда требуется ваше действие или агент завершил работу."
    },
    {
        pattern: /^Volume$/i,
        replace: () => "Громкость"
    },
    {
        pattern: /^Set\s+the\s+volume\s+of\s+agent\s+sounds\.?$/i,
        replace: () => "Настройка громкости звуков агента."
    },
    // --- Навыки и слэш-команды (Skills & Slash Commands) ---
    {
        // "/plan" - "Plan carefully before executing a task."
        pattern: /^Plan\s+carefully\s+before\s+executing\s+a\s+task\.?$/i,
        replace: () => "Тщательное планирование перед выполнением задачи."
    },
    {
        // "/boost" - "Invoke the Boost multi-agent orchestrator for complex tasks."
        pattern: /^Invoke\s+the\s+Boost\s+multi-agent\s+orchestrator\s+for\s+complex\s+tasks\.?$/i,
        replace: () => "Запуск мультиагентного оркестратора Boost для сложных задач."
    },
    {
        // "/compact" - "Compact the conversation now (summarize history to free up the context window)."
        pattern: /^(?:Compact|Сжать(?:\s+контекст)?)\s+the\s+conversation\s+now\s*\(summarize\s+history\s+to\s+free\s+up\s+the\s+context\s+window\)\.?$/i,
        replace: () => "Сжать диалог сейчас (суммировать историю, чтобы освободить контекстное окно)."
    },
    {
        // "mcp:github-mcp-server:AssignCodingAgent"
        pattern: /^Assign\s+GitHub\s+Coding\s+Agent\s+to\s+multiple\s+tasks\s+in\s+a\s+GitHub\s+repository\.?$/i,
        replace: () => "Назначить кодинг-агента GitHub (GitHub Coding Agent) на несколько задач в репозитории GitHub."
    },
    {
        // "mcp:github-mcp-server:issue_to_fix_workflow"
        pattern: /^(?:Create|Создать|Создано)\s+an\s+issue\s+for\s+a\s+problem\s+and\s+then\s+generate\s+a\s+pull\s+request\s+to\s+fix\s+it\.?$/i,
        replace: () => "Создать задачу (issue) по проблеме, а затем сформировать пул-реквест (pull request) для её исправления"
    },
    {
        pattern: /^Ask\s+a\s+quick\s+question\s+without\s+interrupting\s+the\s+main\s+conversation\.?$/i,
        replace: () => "Задать быстрый вопрос, не прерывая основной диалог."
    },
    {
        pattern: /^(?:Run|Запуск)\s+until\s+the\s+specified\s+goal\s+is\s+completely\s+finished\.?$/i,
        replace: () => "Работать до полного достижения указанной цели."
    },
    {
        pattern: /^(?:Run|Запуск)\s+an\s+instruction\s+on\s+a\s+recurring\s+schedule\s+or\s+as\s+a\s+one-time\s+timer\.?$/i,
        replace: () => "Запуск инструкций по расписанию или через разовый таймер."
    },
    {
        pattern: /^Invoke\s+a\s+browser\s+agent\s+for\s+web\s+tasks\.?$/i,
        replace: () => "Вызов браузерного агента для задач в сети."
    },
    {
        pattern: /^Interview\s+me\s+to\s+align\s+on\s+a\s+plan\.?$/i,
        replace: () => "Интервью для детального согласования плана."
    },
    {
        pattern: /^Invoke\s+a\s+team\s+of\s+agents\s+to\s+autonomously\s+tackle\s+large\s+projects\.?$/i,
        replace: () => "Вызов команды агентов для автономной работы над крупными проектами."
    },
    {
        pattern: /^Reflect\s+on\s+recent\s+successes\s+or\s+corrections\s+to\s+capture\s+reusable\s+skills\s+or\s+rules\.?$/i,
        replace: () => "Анализ успехов и правок для сохранения полезных навыков и правил."
    },
    {
        // "chrome-extensions" skill description (включая защиту от поломки "Build" -> "Сборка")
        pattern: /^(?:Build|Сборка)\s+and\s+publish\s+Chrome\s+Extensions\s+using\s+Manifest\s+V3\s+best\s+practices.*/i,
        replace: () => "Создание и публикация расширений Chrome с использованием лучших практик Manifest V3. Используйте этот навык всякий раз, когда пользователь просит создать, изменить, отладить или понять работу расширений браузера Chrome, плагинов или чего-либо, связанного с Chrome Extensions API. Срабатывает при упоминании: «Chrome extension», «браузерное расширение», «manifest.json», «content script», «service worker» (в контексте браузера), «popup», «side panel», «chrome.* API», «declarativeNetRequest», «omnibox», «context menu», «userScripts», «пользовательский скрипт» или при любых запросах на создание функций для браузера Chrome. Также используйте для публикации в Chrome Web Store: публикация расширения, подготовка к публикации, ответы на отклонения модерации, обоснование разрешений или составление политики конфиденциальности."
    },
    {
        // "chrome-devtools" skill description
        pattern: /^Uses\s+Chrome\s+DevTools\s+via\s+MCP\s+for\s+efficient\s+debugging.*/i,
        replace: () => "Использует Chrome DevTools через MCP для эффективной отладки, устранения неполадок и автоматизации браузера. Используйте при отладке веб-страниц, автоматизации взаимодействия с браузером, анализе производительности или проверке сетевых запросов. Этот навык не применяется в режиме «--slim» (конфигурация MCP)."
    },
    {
        // "a11y-debugging" skill description
        pattern: /^Uses\s+Chrome\s+DevTools\s+MCP\s+for\s+accessibility\s+\(a11y\)\s+debugging.*/i,
        replace: () => "Использует Chrome DevTools MCP для отладки и аудита доступности (a11y) на основе рекомендаций web.dev. Используйте при тестировании семантического HTML, меток ARIA, состояний фокуса, навигации с клавиатуры, областей нажатия и контрастности цветов."
    },
    {
        // "cookie-debugging" skill description
        pattern: /^Uses\s+Chrome\s+DevTools\s+MCP\s+for\s+inspecting,\s*debugging,\s*and\s+testing\s+cookies.*/i,
        replace: () => "Использует Chrome DevTools MCP для проверки, отладки и тестирования файлов cookie, состояния сессии, проблем с аутентификацией и соответствия согласиям на cookie. Используйте при диагностике ошибок 401/403, перенаправлений аутентификации, истечения сессий, заголовков Cookie/Set-Cookie или предупреждений сторонних cookie."
    },
    {
        // "debug-optimize-lcp" skill description
        pattern: /^Guides\s+debugging\s+and\s+optimizing\s+Largest\s+Contentful\s+Paint\s+\(LCP\).*/i,
        replace: () => "Руководство по отладке и оптимизации Largest Contentful Paint (LCP) с помощью инструментов Chrome DevTools MCP. Используйте этот навык при вопросах о производительности LCP, медленной загрузке страниц, оптимизации Core Web Vitals или когда основной контент отображается слишком долго."
    },
    {
        // "memory-leak-debugging" skill description
        pattern: /^Diagnoses\s+and\s+resolves\s+memory\s+leaks\s+in\s+JavaScript\/Node\.js\s+applications.*/i,
        replace: () => "Диагностика и устранение утечек памяти в приложениях JavaScript/Node.js. Используйте при сообщениях о высоком потреблении памяти, ошибках OOM или для создания, сравнения и анализа снимков кучи с помощью Chrome DevTools MCP."
    },
    {
        // "automation" skill description
        pattern: /^Interactive\s+guide\s+to\s+design\s+and\s+create\s+a\s+scheduled\s+background\s+automation.*/i,
        replace: () => "Интерактивное руководство по проектированию и созданию фоновой автоматизации по расписанию. Используйте этот навык, когда пользователь хочет создать автоматизированную или периодическую задачу (например, «каждое утро присылай сводку писем», «каждый понедельник отправляй список дел»). Также вызывается командой /automation."
    },
    {
        // "modern-web-guidance" skill description (включая защиту от "Search" -> "Поиск")
        pattern: /^(?:Search|Поиск)\s+tool\s+for\s+modern\s+web\s+development\s+best\s+practices.*/i,
        replace: () => "Инструмент поиска лучших практик современной веб-разработки. Рекомендации по UI/Layout, анимациям, производительности (CWV) и современным стандартам веб-платформы."
    },
    {
        // "agy-customizations" skill description
        pattern: /^Comprehensive\s+guide\s+and\s+reference\s+for\s+the\s+Antigravity\s+Customization\s+System.*/i,
        replace: () => "Полное руководство и справочник по системе персонализации Antigravity. Используйте для объяснения принципов работы персонализаций, приоритетов загрузки, механизмов обнаружения, а также для создания навыков, правил, плагинов, хуков и серверов MCP."
    },
    {
        // "antigravity-guide" skill description
        pattern: /^Provides\s+a\s+comprehensive\s+guide,\s*quick\s+reference,\s*and\s+sitemap\s+for\s+Google\s+Antigravity.*/i,
        replace: () => "Предоставляет подробное руководство, краткий справочник и карту Google Antigravity (AGY), включая Antigravity CLI (agy), Antigravity 2.0, Antigravity IDE, Python SDK, слэш-команды, горячие клавиши и персонализации (навыки, правила, MCP, sidecars). Активируйте этот навык при вопросах об использовании, настройке или кастомизации Antigravity."
    },
    {
        // "generative_ui" skill description
        pattern: /^How\s+to\s+render\s+rich\s+interactive\s+HTML\s+widgets\s+inline\s+in\s+the\s+chat.*/i,
        replace: () => "Отрисовка интерактивных HTML-виджетов прямо в чате или в виде отдельных артефактов. Используйте этот навык, когда требуется показать диаграммы, визуализацию данных, интерактивные элементы управления, обучающие руководства или любой насыщенный визуальный контент за рамками простого текста и markdown."
    },
    {
        // "google-antigravity-sdk" skill description
        pattern: /^Design,\s*implement,\s*and\s+debug\s+autonomous\s+AI\s+agents\s+and\s+multi-agent\s+systems.*/i,
        replace: () => "Проектирование, реализация и отладка автономных ИИ-агентов и мультиагентных систем с использованием Google Antigravity (AGY) SDK. Активируйте этот навык, когда пользователь хочет создать, настроить или оркестрировать агентов Google Antigravity."
    },
    {
        // "migrate-workflows" skill description
        pattern: /^Automatically\s+migrate\s+legacy\s+workflows\s+to\s+modern\s+skills.*/i,
        replace: () => "Автоматическая миграция устаревших рабочих процессов (workflows) в современные навыки (skills) в глобальных и рабочих конфигурациях. Сканирует существующие процессы, создает целевые файлы SKILL.md и безопасно архивирует старые файлы."
    },
    {
        // "permissioned-github" skill description
        pattern: /^Guidelines\s+for\s+interacting\s+with\s+GitHub\s+and\s+request\s+permissions.*/i,
        replace: () => "Рекомендации по взаимодействию с GitHub и запрос разрешений у пользователя при сбоях команд из-за ограничений в среде агента."
    },
    {
        // "plugin" skill description
        pattern: /^How\s+to\s+manage\s+and\s+create\s+plugins\s*[—–-]\s*namespaced\s+bundles\s+of\s+skills.*/i,
        replace: () => "Управление и создание плагинов — изолированных пакетов навыков, агентов, правил, MCP-серверов и хуков, которые устанавливаются, включаются и отключаются как единое целое. Используйте этот навык, когда пользователь хочет включить, отключить, установить или удалить плагин, создать новый плагин или запаковать персонализации в плагин. Также вызывается командой /plugin."
    },
    {
        // "run-workflow" skill description
        pattern: /^How\s+to\s+write\s+and\s+run\s+a\s+dynamic\s+workflow\s+script\s+with\s+the\s+`?run_workflow`?\s+tool.*/i,
        replace: () => "Написание и выполнение динамических скриптов рабочих процессов с помощью инструмента run_workflow: скрипт Python, оркестрирующий множество агентов."
    },
    {
        // "troubleshooting" skill description
        pattern: /^Uses\s+Chrome\s+DevTools\s+MCP\s+and\s+documentation\s+to\s+troubleshoot\s+connection\s+and\s+target\s+issues.*/i,
        replace: () => "Использует Chrome DevTools MCP и документацию для устранения неполадок с подключением и целевыми страницами. Запускайте этот навык при сбоях list_pages, new_page или navigate_page, либо при ошибках инициализации сервера."
    },
    {
        // "ui-plugin-navigation" skill description
        pattern: /^Discover\s+UI\s+plugin\s+panels\s+relevant\s+to\s+the\s+current\s+task.*/i,
        replace: () => "Обнаружение панелей UI-плагинов, актуальных для текущей задачи, и отображение в чате кнопки для быстрого открытия (переключения) их на боковой панели."
    },
    {
        // "Test Thinking for 10s >" / "Test <target> >"
        pattern: /^Test\s+(.+?)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            let target = match[1].trim();
            if (/^Thinking\s+for\s+(\d+)\s*([smhd])$/i.test(target)) {
                target = target.replace(/^Thinking\s+for\s+(\d+)\s*([smhd])$/i, (m, c, u) => {
                    const units = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                    return `размышления на ${c} ${units[u.toLowerCase()] || u}`;
                });
                return `Тест ${target}${arrow}`;
            }
            return `Тест: ${target}${arrow}`;
        }
    },
    {
        // "Verify <target> >"
        pattern: /^(?:Verify|Verifying)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !arrow) return match[0];
            return `Проверка ${localized}${arrow}`;
        }
    },
    {
        // "Approve <target> >" / "Approve <target>"
        pattern: /^(?:Approve|Approving)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Утверждение ${localizeActionTarget(match[1])}${arrow}`;
        }
    },
    {
        // "Approved <target> >" / "Approved <target>"
        pattern: /^Approved\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Утверждено ${localizeActionTarget(match[1])}${arrow}`;
        }
    },
    {
        // "Execute <target> >" / "Execute <target>"
        pattern: /^(?:Execute|Executing)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Выполнение ${localizeActionTarget(match[1])}${arrow}`;
        }
    },
    {
        // "Executed <target> >" / "Executed <target>"
        pattern: /^Executed\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Выполнено ${localizeActionTarget(match[1])}${arrow}`;
        }
    },
    {
        // "Start using <model>, our best <type> model."
        pattern: /^Start\s+using\s+(.+?),\s*our\s+best\s+(.+?)\s+model\.?$/i,
        replace: (match) => `Начните использовать ${match[1]}, нашу лучшую модель ${match[2]}.`
    },
    {
        // "Leaving Soon ⓘ" / "Leaving Soon"
        pattern: /^Leaving\s+Soon(?:\s*([ⓘi]|[^a-zA-Z0-9\s]+))?$/i,
        replace: (match) => "Скоро будет недоступна" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Notice ⓘ" / "Notice"
        pattern: /^Notice(?:\s*([ⓘi]|[^a-zA-Z0-9\s]+))?$/i,
        replace: (match) => "Уведомление" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Select Project Ctrl+;" / "Select Project <shortcut>"
        pattern: /^Select\s+Project(?:\s+(Ctrl\+[^\s]+|⌘[^\s]+))?$/i,
        replace: (match) => "Выбрать проект" + (match[1] ? (" " + match[1]) : "")
    },
    {
        // "Search <query> in transcript >" / "Search <query> in transcript"
        pattern: /^Search\s+(.+?)\s+in\s+transcript(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Поиск ${match[1]} в стенограмме${arrow}`;
        }
    },
    {
        // "Checked task <task>" or "Checked task", "Killed task <task>" or "Killed task"
        pattern: /^(Checked|Killed)\s+task(?:\s+(.+))?$/i,
        replace: (match) => {
            const isChecked = match[1].toLowerCase() === 'checked';
            const action = isChecked ? 'Проверена задача' : 'Завершена задача';
            if (match[2]) {
                return `${action}: ${match[2].trim()}`;
            }
            return action;
        }
    },
    {
        // "Push / Pushing <target> >"
        pattern: /^(?:Push|Pushing)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const suffix = match[2] ? match[2] : '';
            return `Отправка ${localizeActionTarget(match[1])}${suffix}${arrow}`;
        }
    },
    {
        // "Analyzed / Проанализировано <icon> Task Log"
        pattern: /^(?:Analyzed|Проанализировано)\s+(.*?)\s*Task\s+Log$/i,
        replace: (match) => `Проанализировано ${match[1] ? match[1].trim() + ' ' : ''}Лог задачи`
    },
    {
        // "Message from <agent> >" or "Message from <agent> ˅"
        pattern: /^Message\s+from\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Сообщение от ${match[1].trim()}${arrow}`;
        }
    },
    {
        // "Inspect <target> with parameters >"
        pattern: /^Inspect\s+(.+?)\s+with\s+parameters(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Проверка ${localizeActionTarget(match[1])} с параметрами${arrow}`;
        }
    },
    {
        // "Inspect / Inspecting <target> >"
        pattern: /^(?:Inspect|Inspecting)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !arrow) return match[0];
            return `Проверка ${localized}${arrow}`;
        }
    },
    {
        // "Extract / Extracting <target> >"
        pattern: /^(?:Extract|Extracting)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !arrow) return match[0];
            return `Извлечение ${localized}${arrow}`;
        }
    },
    {
        // "Read / Reading <target> >"
        pattern: /^(?:Read|Reading)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !arrow) return match[0];
            return `Чтение ${localized}${arrow}`;
        }
    },
    {
        // "List / Listing <target> >"
        pattern: /^(?:List|Listing)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !arrow) return match[0];
            return `Список ${localized}${arrow}`;
        }
    },
    {
        // "Test / Testing <target> >"
        pattern: /^(?:Test|Testing)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            let target = match[1].trim();
            if (/^Thinking\s+for\s+(\d+)\s*([smhd])$/i.test(target)) {
                target = target.replace(/^Thinking\s+for\s+(\d+)\s*([smhd])$/i, (m, c, u) => {
                    const units = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                    return `размышления на ${c} ${units[u.toLowerCase()] || u}`;
                });
                return `Тест ${target}${arrow}`;
            }
            return `Тестирование ${localizeActionTarget(target)}${arrow}`;
        }
    },
    {
        // Gemini API Marketplace & Details description (must precede generic Build -> Сборка rule!)
        pattern: /^(?:Build|Сборка)\s+applications\s+with\s+the\s+Gemini\s+Interactions\s+API\s+and\s+Live\s+API.*$/i,
        replace: () => "Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, изображений, видео и речи, управляемых агентов и мультимодальный стриминг в реальном времени."
    },
    {
        // Gemini API Example prompt 1 (must precede generic Build -> Сборка rule!)
        pattern: /^"?(?:Build|Сборка)\s+a\s+stateful\s+multi-turn\s+chat\s+script\s+using\s+the\s+Interactions\s+API\s+and\s+the\s+latest\s+models\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Создать скрипт многошагового чата с сохранением состояния с помощью Interactions API и новейших моделей.»"
            : "Создать скрипт многошагового чата с сохранением состояния с помощью Interactions API и новейших моделей"
    },
    {
        // Gemini API Example prompt 2
        pattern: /^"?(?:Create|Создать|Создано)\s+a\s+real-time\s+voice\s+agent\s+using\s+the\s+Gemini\s+Live\s+API\s+and\s+non-blocking\s+function\s+calling\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Создать голосового агента реального времени с использованием Gemini Live API и неблокирующего вызова функций.»"
            : "Создать голосового агента реального времени с использованием Gemini Live API и неблокирующего вызова функций"
    },
    {
        // Gemini API Example prompt 3
        pattern: /^"?Migrate\s+my\s+project\s+from\s+client\.models\.generate_content\s+to\s+the\s+Interactions\s+API\.?"?$/i,
        replace: (m) => m[0].startsWith('"')
            ? "«Мигрировать мой проект с client.models.generate_content на Interactions API.»"
            : "Мигрировать мой проект с client.models.generate_content на Interactions API"
    },
    {
        // Gemini API Example prompt 4 (TTS)
        pattern: /^"?Generate\s+multi-speaker\s+dialogue\s+audio\s+using\s+the\s+latest\s+Gemini\s+TTS\s+models\s+and\s*$/i,
        replace: () => "«Сгенерировать аудио диалога с несколькими спикерами с помощью новейших моделей Gemini TTS и аннотаций "
    },
    {
        // Gemini API subhead in Details
        pattern: /^Equip\s+your\s+agent\s+with\s+current\s+SDK\s+patterns,\s*model\s+identifiers,\s*and\s+live\s+documentation\s+lookup\s+for\s+building\s+applications\s+with\s+the(?:\s+Gemini\s+API\.?|\s*)$/i,
        replace: (m) => /gemini\s+api/i.test(m[0])
            ? "Оснастите вашего агента актуальными шаблонами SDK, идентификаторами моделей и поиском по живой документации для создания приложений с Gemini API."
            : "Оснастите вашего агента актуальными шаблонами SDK, идентификаторами моделей и поиском по живой документации для создания приложений с "
    },
    {
        // Gemini API skills under Commands (/gemini-api-dev, /gemini-live-api-dev, /gemini-omni-flash-api)
        pattern: /^Use\s+this\s+skill\s+when\s+writing\s+code\s+that\s+calls\s+the\s+Gemini\s+API\s+for\s+text\s+generation.*$/i,
        replace: () => "Используйте этот навык при написании кода, вызывающего Gemini API для генерации текста, многошагового чата, мультимодального ввода..."
    },
    {
        pattern: /^Use\s+this\s+skill\s+when\s+building\s+real-time,\s*bidirectional\s+streaming\s+applications\s+with\s+the\s+Gemini\s+Live\s+API.*$/i,
        replace: () => "Используйте этот навык при создании приложений двунаправленного потокового вещания в реальном времени с помощью Gemini Live API..."
    },
    {
        pattern: /^Use\s+this\s+skill\s+for\s+generative\s+video\s+editing,\s*text-to-video,\s*image-referenced\s+video\s+generation.*$/i,
        replace: () => "Используйте этот навык для генеративного видеомонтажа, генерации видео по тексту и изображениям, генерации по первому кадру..."
    },
    {
        // Dynatrace Featured / Marketplace card
        pattern: /^Investigate\s+production\s+issues\s+with\s+real\s+Dynatrace\s+data:.*$/i,
        replace: () => "Исследуйте проблемы в продакшене на реальных данных Dynatrace: сбои и первопричины, логи, метрики, трейсы и уязвимости с помощью навыков и MCP-сервера."
    },
    {
        // Marketplace shelves & headers
        pattern: /^Design,\s*Creative\s*&\s*Media$/i,
        replace: () => "Дизайн, креатив и медиа"
    },
    {
        pattern: /^Design,\s*creative,\s*and\s+media\s+tools\.?$/i,
        replace: () => "Инструменты для дизайна, творчества и работы с медиа."
    },
    {
        pattern: /^Productivity\s*&\s*Project\s+Management$/i,
        replace: () => "Продуктивность и управление проектами"
    },
    {
        pattern: /^Plan\s+work,\s*track\s+issues,\s*sign\s+documents,\s*and\s+manage\s+your\s+notes\s+and\s+files\.?$/i,
        replace: () => "Планируйте работу, отслеживайте задачи, подписывайте документы и управляйте заметками и файлами."
    },
    {
        pattern: /^Cloud\s+Hosting\s*&\s*Deployment$/i,
        replace: () => "Облачный хостинг и развёртывание"
    },
    {
        pattern: /^Deploy\s+and\s+host\s+your\s+apps,\s*sites,\s*and\s+their\s+backends\.?$/i,
        replace: () => "Развёртывайте и размещайте свои приложения, сайты и их бэкенды."
    },
    {
        pattern: /^Developer\s+Tools$/i,
        replace: () => "Инструменты разработчика"
    },
    {
        pattern: /^APIs,\s*services,\s*and\s+tools\s+to\s+build,\s*test,\s*secure,\s*and\s+run\s+your\s+apps\.?$/i,
        replace: () => "API, сервисы и инструменты для сборки, тестирования, защиты и запуска ваших приложений."
    },
    {
        pattern: /^Business$/i,
        replace: () => "Бизнес"
    },
    {
        pattern: /^Payments,\s*CRM,\s*accounting,\s*data,\s*identity,\s*customer\s+support,\s*marketing,\s*and\s+workflow\s+automation\.?$/i,
        replace: () => "Платежи, CRM, бухгалтерия, данные, идентификация, поддержка клиентов, маркетинг и автоматизация процессов."
    },
    {
        pattern: /^Google\s+does\s+not\s+control\s+the\s+availability\s+or\s+functionality\s+of\s+third[\s-]party\s+developer\s+tools[\s\S]*?found\s+here:?\s*$/i,
        replace: () => "Google не контролирует доступность или функциональность сторонних инструментов для разработчиков. Ваши данные из сторонних инструментов, подключенных к вашему экземпляру Antigravity, могут передаваться в Google. Google защищает такие данные в соответствии с Политикой конфиденциальности Google, доступной по ссылке:"
    },
    {
        // Stripe Featured / Marketplace card (matches both 48-char grid truncation and full description)
        pattern: /^Accept\s+payments\s+and\s+grow\s+your\s+business\..*$/i,
        replace: (m) => m[0].length < 70
            ? "Принимайте платежи и развивайте свой бизнес. MCP-сервер Stripe..."
            : (/\.\.\.|…/.test(m[0])
                ? "Принимайте платежи и развивайте свой бизнес. Официальный MCP-сервер Stripe позволяет ИИ-агентам управлять клиентами, продуктами, ценами, платежными ссылками, счетами,..."
                : "Принимайте платежи и развивайте свой бизнес. Официальный MCP-сервер Stripe позволяет ИИ-агентам управлять клиентами, продуктами, ценами, платежными ссылками, счетами, подписками и возвратами, а также искать в документации Stripe.")
    },
    {
        // Auth0, Browserbase, CodeRabbit, Context7, CrowdStrike, Bigin, Databricks, Intercom, Semrush, Wispr Flow, Mobbin, Postman, Qodo, Zoho Projects, Harness, Zapier, Leapwork, Keenable, Parallel, Supabase, PandaDoc, monday.com
        pattern: /^Add\s+Auth0\s+authentication\s+to\s+any\s+app:.*$/i,
        replace: () => "Добавляйте аутентификацию Auth0 в любое приложение: вход, MFA, SSO, организации, RBAC, кастомные домены и брендинг."
    },
    {
        pattern: /^Give\s+your\s+agent\s+a\s+real\s+browser:.*$/i,
        replace: () => "Дайте вашему агенту полноценный браузер: переходите по страницам, нажимайте, вводите текст, делайте скриншоты и извлекайте данные с любых сайтов."
    },
    {
        pattern: /^AI-powered\s+code\s+review\s+and\s+review-comment.*$/i,
        replace: () => "Ревью кода на базе ИИ и автоматическое исправление замечаний с помощью CodeRabbit."
    },
    {
        pattern: /^Up-to-date\s+documentation\s+lookup\..*$/i,
        replace: () => "Поиск актуальной документации. Загружайте документацию и примеры кода нужной версии напрямую из репозиториев в контекст LLM."
    },
    {
        pattern: /^Use\s+the\s+official\s+CrowdStrike-hosted\s+MCP\s+server.*$/i,
        replace: () => "Используйте официальный MCP-сервер CrowdStrike для работы с платформой Falcon: обнаружениями, инцидентами, аналитикой угроз, SIEM, хостами и уязвимостями."
    },
    {
        pattern: /^Databricks\s+skills\s+for\s+the\s+CLI,.*$/i,
        replace: () => "Навыки Databricks для CLI, приложений, Lakebase, обслуживания моделей, задач Lakeflow, декларативных пайплайнов Spark и пакетов автоматизации (DAB)."
    },
    {
        pattern: /^(?:Search|Поиск)\s+Intercom\s+conversations,\s*contacts.*$/i,
        replace: () => "Поиск диалогов, контактов и компаний в Intercom, анализ трендов поддержки и установка Intercom Messenger с проверкой подлинности."
    },
    {
        pattern: /^SEO\s+workflows\s+on\s+live\s+Semrush\s+data:.*$/i,
        replace: () => "SEO-процессы на живых данных Semrush: подбор ключевых слов, аудит сайтов, обратные ссылки, анализ конкурентов, трафика и рынка."
    },
    {
        pattern: /^(?:Search|Поиск)\s+and\s+read\s+your\s+Wispr\s+Flow\s+meeting\s+notes.*$/i,
        replace: () => "Поиск и чтение заметок со встреч, расшифровок, черновиков и событий календаря в Wispr Flow."
    },
    {
        pattern: /^Give\s+your\s+AI\s+agent\s+600[,.]?000\+\s+real\s+app\s+screens.*$/i,
        replace: () => "Предоставьте вашему ИИ-агенту более 600 000 экранов реальных приложений и навыки работы с ними через Mobbin MCP."
    },
    {
        pattern: /^Equip\s+Antigravity\s+with\s+specialized\s+Postman\s+skills.*$/i,
        replace: () => "Оснастите Antigravity специализированными навыками Postman для полного жизненного цикла API: проектирования, тестирования, документирования и мониторинга."
    },
    {
        pattern: /^(?:Set\s+up|Установите\s+для\s+переменной\s+окружения\s+up)\s+Qodo,\s*explore\s+code.*$/i,
        replace: () => "Настройте Qodo, исследуйте код и историю репозитория, проверяйте локальные изменения и устраняйте замечания в пул-реквестах прямо из Antigravity."
    },
    {
        pattern: /^Connect\s+Zoho\s+Projects\s+to\s+Antigravity.*$/i,
        replace: () => "Подключите Zoho Projects к Antigravity, чтобы превращать задачи и ошибки в рабочий код, исследовать баги и обновлять статусы задач."
    },
    {
        pattern: /^(?:Build|Сборка)\s+and\s+debug\s+pipelines,\s*manage\s+deployments.*$/i,
        replace: () => "Собирайте и отлаживайте пайплайны, управляйте развёртываниями, исследуйте уязвимости и работайте с Harness через подключенные инструменты и навыки."
    },
    {
        pattern: /^Connect\s+9[,.]?000\+\s+apps\s+to\s+your\s+AI\s+workflow.*$/i,
        replace: () => "Подключите более 9 000 приложений к вашему рабочему процессу ИИ. Находите, включайте и выполняйте действия Zapier напрямую из клиента."
    },
    {
        pattern: /^(?:Create|Создать|Создано),\s*run\s+and\s+debug\s+Leapwork\s+Play\s+tests.*$/i,
        replace: () => "Создавайте, запускайте и отлаживайте тесты Leapwork Play, собирайте агентов и передавайте задачи в ИИ-процессы Play прямо из Antigravity."
    },
    {
        pattern: /^(?:Search|Поиск)\s+the\s+web\s+and\s+read\s+any\s+page\s+as\s+clean\s+markdown\s+with\s+Keenable.*$/i,
        replace: () => "Ищите в интернете и читайте любые страницы в виде чистого Markdown с помощью поисковой системы Keenable для ИИ-агентов (без регистрации и API-ключа)."
    },
    {
        pattern: /^(?:Search|Поиск)\s+the\s+live\s+web\s+and\s+fetch\s+page\s+content\s+with\s+Parallel.*$/i,
        replace: () => "Ищите информацию в живом интернете и извлекайте содержимое страниц с помощью облачного MCP-сервера Parallel (бесплатно, без аккаунта и API-ключа)."
    },
    {
        pattern: /^Official\s+Supabase\s+plugin\s+for\s+Antigravity.*$/i,
        replace: () => "Официальный плагин Supabase для Antigravity с навыками и MCP-доступом для управления проектами, работы с БД, авторизацией, хранилищем и Postgres."
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+and\s+send\s+proposals,\s*quotes,\s*and\s+contracts\s+for\s+e-signature.*$/i,
        replace: () => "Создавайте и отправляйте коммерческие предложения, сметы и договоры на электронную подпись в PandaDoc. Отслеживайте статус подписания документов."
    },
    {
        pattern: /^Plan\s+and\s+track\s+work\s+in\s+monday\.com\s+from\s+Antigravity.*$/i,
        replace: () => "Планируйте и отслеживайте работу в monday.com из Antigravity: создавайте, обновляйте и назначайте задачи, пишите документацию и создавайте формы."
    },
    {
        // Base44 Marketplace card (must precede generic Build -> Сборка)
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+Base44\s+full-stack\s+apps:.*$/i,
        replace: () => "Создавайте и развертывайте полнофункциональные приложения Base44: управление проектами через CLI, разработка на JavaScript/TypeScript SDK и навыки отладки в продакшене."
    },
    {
        // Netlify & Vercel (also placed before generic Build -> Сборка)
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+on\s+Netlify:.*$/i,
        replace: () => "Собирайте и развертывайте на Netlify: функции, edge-функции, хранилища, базы данных, авторизацию, формы, CDN изображений, кэширование и AI Gateway вместе с MCP-сервером Netlify."
    },
    {
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+web\s+apps\s+and\s+AI\s+agents\s+on\s+Vercel.*$/i,
        replace: () => "Создавайте и развертывайте веб-приложения и ИИ-агентов на Vercel с навыками для Next.js, AI SDK и облачных сервисов, а также официальным MCP-сервером Vercel."
    },
    {
        // Atlassian Teamwork Graph CLI, Bigin, MongoDB Atlas, SentinelOne, Endor Labs, Exabeam, CrowdStrike, Datadog
        pattern: /^Teamwork\s+Graph\s+CLI\s+is\s+Atlassian(?:'s|’s)\s+agent-first\s+interface.*$/i,
        replace: () => "Teamwork Graph CLI — это интерфейс Atlassian для ИИ-агентов ко всему вашему рабочему контексту: задачам Jira, страницам Confluence, пул-реквестам Bitbucket и подключенным источникам данных."
    },
    {
        pattern: /^Manage\s+your\s+Bigin\s+CRM\s+from\s+Antigravity:.*$/i,
        replace: () => "Управляйте вашей CRM Bigin из Antigravity: просматривайте воронки продаж, находите контакты и сделки, фиксируйте звонки, планируйте задачи и отправляйте письма клиентам."
    },
    {
        pattern: /^Official\s+Antigravity\s+plugin\s+for\s+MongoDB\s+Atlas.*$/i,
        replace: () => "Официальный плагин Antigravity для MongoDB Atlas (хостируемый MCP-сервер + навыки). Подключайтесь к серверу Atlas MCP, исследуйте данные, управляйте коллекциями и оптимизируйте запросы."
    },
    {
        pattern: /^Query\s+your\s+SentinelOne\s+Singularity\s+Console\s+from\s+Antigravity.*$/i,
        replace: () => "Выполняйте запросы к консоли SentinelOne Singularity из Antigravity через MCP-сервер Purple AI. Требуется активная консоль, URL консоли и API-токен."
    },
    {
        pattern: /^Packaged\s+workflows\s+for\s+SCA\s+remediation,\s*AI\s+SAST\s+triage.*$/i,
        replace: () => "Готовые рабочие процессы для устранения уязвимостей SCA, триажа AI SAST, проверки CI/CD, реагирования на вредоносный код и настройки Endor Labs."
    },
    {
        pattern: /^Triage\s+Exabeam\s+New-Scale\s+alerts\s+and\s+cases\s+end\s+to\s+end:.*$/i,
        replace: () => "Полный цикл триажа оповещений и инцидентов Exabeam New-Scale: сбор доказательств, сопоставление с MITRE, вынесение вердикта и запись с подтверждением."
    },
    {
        pattern: /^Use\s+the\s+official\s+CrowdStrike-hosted\s+MCP\s+server\s+to\s+work\s+across\s+Falcon:.*$/i,
        replace: () => "Используйте официальный MCP-сервер CrowdStrike для работы с платформой Falcon: обнаружениями, инцидентами, аналитикой угроз, SIEM, хостами и уязвимостями."
    },
    {
        pattern: /^Use\s+Datadog\s+directly\s+in\s+Antigravity\s+through\s+a\s+preconfigured\s+Datadog\s+MCP\s+server.*$/i,
        replace: () => "Используйте Datadog напрямую в Antigravity через преднастроенный MCP-сервер Datadog. Запрашивайте логи, метрики, трейсы и дашборды на естественном языке."
    },
    {
        // Marketplace description: "Search and retrieve official documentation across ..."
        // Must precede generic Search rule to prevent partial collision ("Поиск and retrieve...")
        pattern: /^(?:Search|Поиск)\s+and\s+retrieve\s+official\s+documentation.*/i,
        replace: () => "Поиск и получение официальной документации по платформам Google для разработчиков..."
    },
    {
        // Marketplace description: "Core tools and knowledge required to develop for..."
        pattern: /^Core\s+tools\s+and\s+knowledge\s+required\s+to\s+develop\s+for.*/i,
        replace: () => "Основные инструменты и знания, необходимые для разработки под Android..."
    },
    {
        // Marketplace description: "Prototype, build & run modern apps that users lov..."
        pattern: /^Prototype,\s*build\s*&\s*run\s*modern\s*apps.*/i,
        replace: () => "Прототипируйте, создавайте и запускайте современные приложения, которые нравятся пользователям..."
    },
    {
        // Marketplace description: "Integration skill and tools for Google Maps Platfor..."
        pattern: /^Integration\s+skill\s+and\s+tools\s+for\s+Google\s+Maps.*/i,
        replace: () => "Навык интеграции и инструменты для Google Maps Platform..."
    },
    {
        // Marketplace description: "Official plugin for Dart and Flutter that installs Flut..."
        pattern: /^Official\s+plugin\s+for\s+Dart\s+and\s+Flutter.*/i,
        replace: () => "Официальный плагин для Dart и Flutter, устанавливающий Flutter..."
    },
    {
        // Marketplace description: "This plugin provides a specialized suite of skills for..."
        pattern: /^This\s+plugin\s+provides\s+a\s+specialized\s+suite\s+of\s+skills\s+for.*/i,
        replace: () => "Этот плагин предоставляет специализированный набор навыков для инженеров данных в Google Cloud..."
    },
    {
        // Marketplace description: "Google Cloud guidance for coding agents: first-pr..."
        pattern: /^Google\s+Cloud\s+guidance\s+for\s+coding\s+agents.*/i,
        replace: () => "Руководство по Google Cloud для кодинг-агентов: основные рекомендации..."
    },
    {
        // Marketplace pagination link: "+ See 6 more", "See 6 more", "+ See more", "See more"
        pattern: /^(\+?\s*)See\s+(?:(\d+)\s+)?more$/i,
        replace: (match) => `${match[1] ? '+ ' : ''}Показать ещё${match[2] ? ' ' + match[2] : ''}`
    },
    {
        // Context menu items
        pattern: /^Disable$/i,
        replace: () => "Отключить"
    },
    {
        pattern: /^Remove$/i,
        replace: () => "Удалить"
    },
    {
        // MCP button tooltips
        pattern: /^Add\s+MCP\s+Server(\s*\(.*?\))?$/i,
        replace: (match) => "Добавить MCP-сервер" + (match[1] ? ' ' + match[1].trim() : '')
    },
    {
        pattern: /^Copy\s+Config\s+File\s+Path(\s*\(.*?\))?$/i,
        replace: (match) => "Копировать путь к файлу конфигурации" + (match[1] ? ' ' + match[1].trim() : '')
    },
    {
        // Marketplace description: "Search your Google Cloud projects using natural language ."
        pattern: /^(?:Search|Поиск)\s+your\s+Google\s+Cloud\s+projects.*/i,
        replace: () => "Поиск по вашим проектам Google Cloud с использованием естественного языка."
    },
    {
        // Marketplace description: "Mobbin"
        pattern: /^(?:Search|Поиск)\s+and\s+reference\s+over\s+600[,.]?000\s+real-world\s+app\s+screens.*/i,
        replace: () => "Ищите и используйте более 600 000 экранов реальных приложений, пользовательских сценариев и шаблонов интерфейса из Mobbin прямо в ваших инструментах ИИ."
    },
    {
        // Marketplace description: "Google Cloud App Optimize"
        pattern: /^The\s+App\s+Optimize\s+\(AppOptimize\)\s+remote\s+MCP\s+server.*/i,
        replace: () => "Удаленный MCP-сервер App Optimize (AppOptimize) позволяет создавать, управлять и анализировать отчеты о затратах на облако, использовании и оптимизации для ваших ресурсов Google Cloud."
    },
    {
        // Product name: "Parallel Search"
        pattern: /^(?:Parallel\s+Search|Search\s+Parallel|Поиск\s+Parallel)$/i,
        replace: () => "Parallel Search"
    },
    {
        // Marketplace description: "Parallel" / "Parallel Search"
        pattern: /^(?:Search|Поиск)\s+the\s+live\s+web\s+and\s+extract\s+content\s+from\s+URLs\s+directly\s+in\s+Antigravity.*/i,
        replace: () => "Ищите информацию в реальном времени в интернете и извлекайте контент по URL-адресам прямо в Antigravity. Parallel предоставляет релевантные результаты поиска и читаемый контент для вашего агента..."
    },
    {
        // Marketplace description: "Finnhub"
        pattern: /^(?:Search|Поиск)\s+and\s+retrieve\s+real-time\s+financial\s+and\s+stock\s+market\s+data\s+from\s+Finnhub.*/i,
        replace: () => "Ищите и получайте финансовые данные и данные фондового рынка в реальном времени из Finnhub на естественном языке. Этот MCP-сервер подключается к вашему аккаунту Finnhub для доступа к котировкам акций, новостям рынка и профилям компаний."
    },
    {
        // Marketplace description: "S&P Global"
        pattern: /^(?:Search|Поиск)\s+and\s+retrieve\s+comprehensive\s+financial\s+and\s+corporate\s+data\s+from\s+S&P\s+Global.*/i,
        replace: () => "Ищите и получайте подробные финансовые и корпоративные данные от S&P Global на естественном языке. Этот MCP-сервер подключается к S&P Global Market Intelligence для предоставления рыночной аналитики и сведений о компаниях."
    },
    {
        // Marketplace description: "Guidepoint"
        pattern: /^(?:Search|Поиск)\s+Guidepoint's\s+expert\s+network\s+for\s+interview\s+transcripts.*/i,
        replace: () => "Ищите стенограммы интервью в экспертной сети Guidepoint, просматривайте каталоги мероприятий и получайте личное расписание событий. Этот MCP-сервер также позволяет напрямую запрашивать экспертные данные и материалы мероприятий."
    },
    {
        // Marketplace description: "NetDocuments"
        pattern: /^(?:Search|Поиск)\s+and\s+retrieve\s+documents\s+from\s+your\s+NetDocuments\s+repository.*/i,
        replace: () => "Ищите и извлекайте документы из репозитория NetDocuments на естественном языке. Этот MCP-сервер позволяет инструментам ИИ безопасно искать документы и электронные письма, фильтровать по метаданным..."
    },
    {
        // Marketplace description: "Salesforce"
        pattern: /^(?:Search|Поиск)\s+and\s+manage\s+Salesforce\s+records\s+from\s+your\s+Salesforce\s+remote\s+MCP\s+server.*/i,
        replace: () => "Ищите записи Salesforce и управляйте ими с удаленного MCP-сервера Salesforce. Подключайтесь к вашему инстансу Salesforce для поиска по объектам (SOSL), выполнения запросов SOQL и работы с данными."
    },
    {
        // "Search / Searching <target> >"
        pattern: /^(?:Search|Searching)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4) {
                return match[0];
            }
            return `Поиск ${localized}${arrow}`;
        }
    },
    {
        // "Update / Updating / Upgrade / Upgrading <target> >"
        pattern: /^(?:Update|Updating|Upgrade|Upgrading)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const suffix = match[2] ? match[2] : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `Обновление ${localizeActionTarget(match[1])}${suffix}${arrow}`;
        }
    },
    {
        // "Updated <target> >"
        pattern: /^Updated(?:\s+(.+?))?(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const target = match[1] ? ` ${localizeActionTarget(match[1])}` : '';
            const suffix = match[2] ? match[2] : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `Обновлено${target}${suffix}${arrow}`;
        }
    },
    {
        // "Обновление <target> >" (if target is still in English)
        pattern: /^Обновление\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized !== match[1]) {
                return `Обновление ${localized}${arrow}`;
            }
            return match[0];
        }
    },
    {
        // "Revert / Reverting <target> >"
        pattern: /^(?:Revert|Reverting)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Откат ${localizeActionTarget(match[1])}${arrow}`;
        }
    },
    {
        // "Download / Downloading <target> >"
        pattern: /^(?:Download|Downloading)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Загрузка ${localizeActionTarget(match[1])}${arrow}`;
        }
    },
    {
        // "Compare against / with <target> >"
        pattern: /^Compare\s+(?:against|with)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Сравнение с ${match[1]}${arrow}`;
        }
    },
    {
        // "Restore <target> from <source> >"
        pattern: /^Restore\s+(.+?)\s+from\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `Восстановление ${match[1]} из ${match[2]}${arrow}`;
        }
    },
    {
        // "Restore <target> >"
        pattern: /^Restore\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Восстановление ${match[1]}${arrow}`;
        }
    },
    {
        // "Check diff <target> >"
        pattern: /^Check\s+diff\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Проверка diff ${match[1]}${arrow}`;
        }
    },
    {
        // "Check / Checking <target> >"
        pattern: /^(?:Check|Checking)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !arrow) return match[0];
            return `Проверка ${localized}${arrow}`;
        }
    },
    {
        // "Проверка <target> >" (if target is still in English)
        pattern: /^Проверка\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized !== match[1]) {
                return `Проверка ${localized}${arrow}`;
            }
            return match[0];
        }
    },
    {
        // "GitHub Actions run <id> status >"
        pattern: /^GitHub\s+Actions\s+(?:workflow\s+)?run\s+(\S+)\s+status(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Статус запуска GitHub Actions ${match[1]}${arrow}`;
        }
    },
    {
        // "GitHub Actions run status >"
        pattern: /^GitHub\s+Actions\s+(?:workflow\s+)?run\s+status(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[1] ? (' ' + match[1].trim()) : '';
            return `Статус запуска GitHub Actions${arrow}`;
        }
    },
    {
        // "Чтение <target> >" (if target is still in English)
        pattern: /^Чтение\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const localized = localizeActionTarget(match[1]);
            if (localized !== match[1]) {
                return `Чтение ${localized}${arrow}`;
            }
            return match[0];
        }
    },
    {
        // Compound actions with "and" (e.g. "Build Tailwind CSS and check .tauri-keys — завершено >", "Clear 143MB log and generate test vector >")
        pattern: /^(Build|Building|Clear|Clearing|Inspect|Inspecting|Check|Checking|Read|Reading|Run|Running|Test|Testing|Update|Updating|Upgrade|Upgrading)\s+(.+?)\s+and\s+(check|generate|test|verify|build|clear|inspect|read|run|update|upgrade)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const verb1Map = {
                build: 'Сборка', building: 'Сборка',
                clear: 'Очистка', clearing: 'Очистка',
                inspect: 'Проверка', inspecting: 'Проверка',
                check: 'Проверка', checking: 'Проверка',
                read: 'Чтение', reading: 'Чтение',
                run: 'Запуск', running: 'Запуск',
                test: 'Тестирование', testing: 'Тестирование',
                update: 'Обновление', updating: 'Обновление',
                upgrade: 'Обновление', upgrading: 'Обновление'
            };
            const verb2Map = {
                check: 'проверка',
                generate: 'генерация',
                test: 'тестирование',
                verify: 'проверка',
                build: 'сборка',
                clear: 'очистка',
                inspect: 'проверка',
                read: 'чтение',
                run: 'запуск',
                update: 'обновление',
                upgrade: 'обновление'
            };
            const v1 = verb1Map[match[1].toLowerCase()] || match[1];
            const t1 = localizeActionTarget(match[2]);
            const v2 = verb2Map[match[3].toLowerCase()] || match[3];
            const t2 = localizeActionTarget(match[4]);
            const suffix = match[5] ? match[5] : '';
            const arrow = match[6] ? (' ' + match[6].trim()) : '';
            return `${v1} ${t1} и ${v2} ${t2}${suffix}${arrow}`;
        }
    },
    {
        // "Build / Building <target> >"
        pattern: /^(?:Build|Building)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const suffix = match[2] ? match[2] : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && match[1].trim().split(/\s+/).length > 4 && !suffix && !arrow) {
                return match[0];
            }
            return `Сборка ${localized}${suffix}${arrow}`;
        }
    },
    {
        // "Сборка <target>" (if target is still in English)
        pattern: /^Сборка\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const suffix = match[2] ? match[2] : '';
            const localized = localizeActionTarget(match[1]);
            if (localized !== match[1]) {
                return `Сборка ${localized}${suffix}${arrow}`;
            }
            return match[0];
        }
    },
    {
        // "Clear / Clearing <target> >"
        pattern: /^(?:Clear|Clearing)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const suffix = match[2] ? match[2] : '';
            return `Очистка ${localizeActionTarget(match[1])}${suffix}${arrow}`;
        }
    },
    {
        // "<cmd> help >" / "<cmd> config help >"
        pattern: /^(.+?)\s+help(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            let cmd = match[1].trim();
            if (/config$/i.test(cmd)) {
                return `Справка по конфигурации ${cmd.replace(/\s+config$/i, '')}${arrow}`;
            }
            return `Справка ${cmd}${arrow}`;
        }
    },
    {
        // "<target> stat >" (e.g. "Commit stat >", "Staged diff stat >")
        pattern: /^(.+?)\s+stat(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const t = match[1].trim();
            if (/^commit$/i.test(t)) return `Статистика коммита${arrow}`;
            if (/^staged\s+diff$/i.test(t)) return `Статистика staged diff${arrow}`;
            return `Статистика ${localizeActionTarget(t)}${arrow}`;
        }
    },
    {
        // "<target> search >" (e.g. "Git pickaxe search >")
        pattern: /^(.+?)\s+search(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            if (/^parallel$/i.test(match[1].trim())) return "Parallel Search";
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Поиск ${match[1].trim()}${arrow}`;
        }
    },
    {
        // "<target> body >" (e.g. "upsert_toolchain_model body >")
        pattern: /^(.+?)\s+body(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Тело ${match[1].trim()}${arrow}`;
        }
    },
    {
        // "<target> toolchain >" (e.g. "Universal invoker toolchain >")
        pattern: /^(.+?)\s+toolchain(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Тулчейн ${match[1].trim()}${arrow}`;
        }
    },
    {
        // Specific step titles
        pattern: /^(Untracked module files|Consilium config audit path|Schema migration pattern|Contract approval step \(a\)|Validator and config getter)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const map = {
                'untracked module files': 'Неотслеживаемые файлы модулей',
                'consilium config audit path': 'Путь аудита конфигурации Consilium',
                'schema migration pattern': 'Шаблон миграции схемы',
                'contract approval step (a)': 'Шаг утверждения контракта (a)',
                'validator and config getter': 'Валидатор и геттер конфигурации'
            };
            return (map[match[1].toLowerCase()] || match[1]) + arrow;
        }
    },
    {
        // "now" / "just now"
        pattern: /^(?:just\s+)?now$/i,
        replace: () => "только что"
    },
    {
        // "Automations Ctrl+U" / "Automations <shortcut>"
        pattern: /^Automations(?:\s+(Ctrl\+[A-Za-z0-9]|⌘[A-Za-z0-9]))?$/i,
        replace: (match) => "Автоматизации" + (match[1] ? (" " + match[1]) : "")
    },
    {
        // General "<Item> Ctrl+<Key>" or "⌘<Key>"
        pattern: /^([A-Za-z\s]+)\s+(Ctrl\+[^\s]+|⌘[^\s]+)$/i,
        replace: (match) => {
            const lower = match[1].trim().toLowerCase();
            const translated = translationDictionary[lower];
            if (translated) {
                return `${translated} ${match[2]}`;
            }
            return match[0];
        }
    },
    {
        // "+ Create" / "+ Create plugin"
        pattern: /^\+\s*Create(\s+[A-Za-z]+)?$/i,
        replace: (match) => {
            const suffix = match[1] ? match[1].trim().toLowerCase() : '';
            if (suffix === 'plugin') return '+ Создать плагин';
            if (suffix === 'skill') return '+ Создать навык';
            if (suffix === 'agent') return '+ Создать агента';
            return '+ Создать' + (match[1] || '');
        }
    },
    {
        // "Search for <target>..." / "Search <target>..."
        pattern: /^Search(?:\s+for)?\s+(.+?)(\.{3})?$/i,
        replace: (match) => {
            const target = match[1].trim().toLowerCase();
            const dots = match[2] || '';
            const map = {
                'conversations': 'диалогов',
                'automations': 'автоматизаций',
                'customizations': 'персонализаций',
                'plugins': 'плагинов',
                'skills': 'навыков',
                'agents': 'агентов',
                'settings': 'настроек',
                'files': 'файлов',
                'commands': 'команд'
            };
            if (map[target]) {
                return `Поиск ${map[target]}${dots}`;
            }
            return match[0];
        }
    },
    {
        // "Cut"
        pattern: /^Cut$/i,
        replace: () => "Вырезать"
    },
    {
        // "Copy" / "Copy!"
        pattern: /^Copy!?$/i,
        replace: (m) => m[0].endsWith('!') ? "Копировать!" : "Копировать"
    },
    {
        // "Copied" / "Copied!"
        pattern: /^Copied!?$/i,
        replace: (m) => m[0].endsWith('!') ? "Скопировано!" : "Скопировано"
    },
    {
        // "Paste"
        pattern: /^Paste$/i,
        replace: () => "Вставить"
    },
    {
        // "Select All"
        pattern: /^Select\s+All$/i,
        replace: () => "Выделить всё"
    },
    {
        // "Undo"
        pattern: /^Undo$/i,
        replace: () => "Отменить"
    },
    {
        // "Redo"
        pattern: /^Redo$/i,
        replace: () => "Повторить"
    },
    {
        // "Copy code" / "Copy Code"
        pattern: /^Copy\s+code$/i,
        replace: () => "Скопировать код"
    },
    {
        // "Copy to clipboard"
        pattern: /^Copy\s+to\s+clipboard$/i,
        replace: () => "Копировать в буфер обмена"
    },
    {
        // "Working..." / "Working.." / "Working." / "Working"
        pattern: /^Working\.{0,3}$/i,
        replace: () => "Выполняется..."
    },
    {
        // "Thinking..." / "Thinking.." / "Thinking."
        pattern: /^Thinking\.{1,3}$/i,
        replace: () => "Размышляет..."
    },
    {
        // "Model unavailable, retrying in 31s (attempt 7/9)." / "Model unavailable, retrying in 11s (attempt 7/9).."
        pattern: /^Model\s+unavailable,\s*retrying\s+in\s+(\d+)\s*(?:s|сек)?\s*\(attempt\s*(\d+\/\d+)\)\.{0,3}$/i,
        replace: (match) => `Модель недоступна, повторная попытка через ${match[1]} сек (попытка ${match[2]}).`
    },
    {
        // "Model unavailable, retrying in 31s"
        pattern: /^Model\s+unavailable,\s*retrying\s+in\s+(\d+)\s*(?:s|сек)?\.{0,3}$/i,
        replace: (match) => `Модель недоступна, повторная попытка через ${match[1]} сек.`
    },
    {
        // "Error Our servers are experiencing high traffic right now, please try again in a minute."
        pattern: /^(?:Error\s*:?\s*)?Our\s+servers\s+are\s+experiencing\s+high\s+traffic\s+right\s+now,\s*please\s+try\s+again\s+in\s+a\s+minute\.?(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => {
            const hasError = /^Error/i.test(match[0]);
            const suffix = match[1] ? (' ' + match[1].trim()) : '';
            return (hasError ? "Ошибка: " : "") + "Наши серверы сейчас испытывают высокую нагрузку, пожалуйста, повторите попытку через минуту." + suffix;
        }
    },
    {
        // "Error Agent execution terminated due to error." / "Agent execution terminated due to error."
        pattern: /^(?:Error\s*:?\s*)?Agent\s+execution\s+terminated\s+due\s+to\s+error\.?(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => {
            const hasError = /^Error/i.test(match[0]);
            const suffix = match[1] ? (' ' + match[1].trim()) : '';
            return (hasError ? "Ошибка: " : "") + "Выполнение агента прервано из-за ошибки." + suffix;
        }
    },
    {
        // "Error ID: df2c77df-5bdd-44d5-9cf8-fdab3e6a446b-67602-2010"
        pattern: /^Error\s+ID\s*:\s*(.*)$/i,
        replace: (match) => `ID ошибки: ${match[1]}`
    },
    {
        // "Worked for 15m >" / "Worked for 15m" / "Worked for 30s"
        pattern: /^Worked\s+for\s+(\d+)\s*([smhd])(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => {
            const count = match[1];
            const unit = match[2].toLowerCase();
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const units = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
            return `Работа заняла ${count} ${units[unit] || unit}${arrow}`;
        }
    },
    {
        // General "Worked for <time>"
        pattern: /^Worked\s+for\s+(.*?)(\s*>)?$/i,
        replace: (match) => {
            const time = (typeof translateRelativeTime === 'function' ? translateRelativeTime(match[1]) : '') || (typeof translateDuration === 'function' ? translateDuration(match[1]) : '') || match[1];
            const arrow = match[2] ? ' >' : '';
            return `Работа заняла ${time}${arrow}`;
        }
    },
    {
        // "See our troubleshooting_guide for more help."
        pattern: /^See\s+our\s+troubleshooting[_ ]guide\s+for\s+more\s+help\.?$/i,
        replace: () => "Подробнее см. в руководстве по устранению неполадок."
    },
    {
        // "This conversation grew too large..."
        pattern: /this\s+conversation\s+grew\s+too\s+large[,\s]+so\s+the\s+history\s+before\s+this\s+point\s+may\s+be\s+missing\s+or\s+incomplete\.?/i,
        replace: () => "Этот диалог стал слишком большим, поэтому история до этого момента может отсутствовать или быть неполной."
    },
    {
        pattern: /this\s+conversation\s+grew\s+too\s+large/i,
        replace: () => "Этот диалог стал слишком большим, поэтому история до этого момента может отсутствовать или быть неполной."
    },
    {
        // Canva MCP description
        pattern: /^the\s+canva\s+mcp\s+server\s+enables\s+ai\s+assistants\s+to\s+seamlessly\s+interact\s+with\s+canva['’]s\s+design\s+capabilities\..*$/i,
        replace: (match) => {
            if (match[0].includes('asset and brand management')) {
                return "MCP-сервер Canva позволяет ИИ-ассистентам легко взаимодействовать с возможностями дизайна Canva. Предоставляя функции Canva (включая создание и редактирование дизайна, управление ресурсами и брендом, поиск по библиотеке, экспорт и комментирование) в виде MCP-совместимых инструментов, вы открываете пользователям доступ к возможностям дизайна Canva на естественном языке прямо из привычных инструментов ИИ.";
            }
            return "MCP-сервер Canva позволяет ИИ-ассистентам легко взаимодействовать с возможностями дизайна Canva. Предоставляя функции Canva (включая создание и редактирование дизайна,...";
        }
    },
    {
        // "Visit Legal Help..."
        pattern: /^visit\s+legal\s+help\s+to\s+ask\s+for\s+content\s+changes\s+for\s+legal\s+reasons\.?$/i,
        replace: () => "Посетите раздел «Юридическая помощь», чтобы запросить изменение содержания по юридическим причинам."
    },
    {
        pattern: /^to\s+ask\s+for\s+content\s+changes\s+for\s+legal\s+reasons\.?$/i,
        replace: () => ", чтобы запросить изменение содержания по юридическим причинам."
    },
    {
        // "1 subagent running" / "2 subagents running"
        pattern: /^(\d+)\s+subagents?\s+running$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const pluralize = (count, one, two, five) => {
                const n = Math.abs(count) % 100;
                const n1 = n % 10;
                if (n > 10 && n < 20) return five;
                if (n1 > 1 && n1 < 5) return two;
                if (n1 === 1) return one;
                return five;
            };
            const word = pluralize(count, 'субагент запущен', 'субагента запущены', 'субагентов запущено');
            return `${count} ${word}`;
        }
    },
    {
        // "1 task running" / "2 tasks running"
        pattern: /^(\d+)\s+tasks?\s+running$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const pluralize = (count, one, two, five) => {
                const n = Math.abs(count) % 100;
                const n1 = n % 10;
                if (n > 10 && n < 20) return five;
                if (n1 > 1 && n1 < 5) return two;
                if (n1 === 1) return one;
                return five;
            };
            const word = pluralize(count, 'задача запущена', 'задачи запущены', 'задач запущено');
            return `${count} ${word}`;
        }
    },
    {
        // "1 Yes, allow this time" -> "1 Да, разрешить в этот раз"
        pattern: /^(?:\d+[\s.]*)?yes,\s*allow\s*this\s*time$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, разрешить в этот раз`;
        }
    },
    {
        // "2 Yes, and always allow in this conversation" -> "2 Да, и всегда разрешать в этом диалоге"
        pattern: /^(?:\d+[\s.]*)?yes,\s*and\s*always\s*allow\s*in\s*this\s*conversation$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать в этом диалоге`;
        }
    },
    {
        // "2 Yes, and always allow '...' in this conversation" -> "2 Да, и всегда разрешать '...' в этом диалоге"
        pattern: /^(?:\d+[\s.]*)?yes,\s*and\s*always\s*allow\s+(.*?)in\s+this\s+conversation$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать ${match[1]}в этом диалоге`;
        }
    },
    {
        // Partially translated: "2 Да, и всегда разрешать in this conversation" -> "2 Да, и всегда разрешать в этом диалоге"
        pattern: /^(?:\d+[\s.]*)?да,\s*и\s*всегда\s*разрешать\s*in\s*this\s*conversation$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать в этом диалоге`;
        }
    },
    {
        // Partially translated: "2 Да, и всегда разрешать '...' in this conversation"
        pattern: /^(?:\d+[\s.]*)?да,\s*и\s*всегда\s*разрешать\s+(.*?)in\s+this\s+conversation$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать ${match[1]}в этом диалоге`;
        }
    },
    {
        // "2 Yes, and always allow when not in a project" -> "2 Да, и всегда разрешать вне проекта"
        pattern: /^(?:\d+[\s.]*)?yes,\s*and\s*always\s*allow\s*when\s*not\s*in\s*a\s*project$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать вне проекта`;
        }
    },
    {
        // "2 Yes, and always allow '...' in this project" -> "2 Да, и всегда разрешать '...' в этом проекте"
        pattern: /^(?:\d+[\s.]*)?yes,\s*and\s*always\s*allow\s+(.*?)in\s+this\s+project$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать ${match[1]}в этом проекте`;
        }
    },
    {
        // "3 Yes, and always allow" -> "3 Да, и всегда разрешать"
        pattern: /^(?:\d+[\s.]*)?yes,\s*and\s*always\s*allow$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Да, и всегда разрешать`;
        }
    },
    {
        // "3 Yes, and always allow '...'" -> "3 Да, и всегда разрешать '...'"
        pattern: /^(?:\d+[\s.]*)?yes,\s*and\s*always\s*allow\s+(.+)$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            // Make sure it doesn't end with "in this project" or "in this conversation"
            if (/in\s+this\s+project$/i.test(match[1])) {
                const rest = match[1].replace(/in\s+this\s+project$/i, '').trim();
                return `${prefix}Да, и всегда разрешать${rest ? ' ' + rest : ''} в этом проекте`;
            }
            if (/in\s+this\s+conversation$/i.test(match[1])) {
                const rest = match[1].replace(/in\s+this\s+conversation$/i, '').trim();
                return `${prefix}Да, и всегда разрешать${rest ? ' ' + rest : ''} в этом диалоге`;
            }
            return `${prefix}Да, и всегда разрешать ${match[1]}`;
        }
    },
    {
        // "4 No (tell the agent what to do instead)" -> "4 Нет (указать агенту, что делать вместо этого)"
        pattern: /^(?:\d+[\s.]*)?no\s*\(tell\s+the\s+agent/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Нет (указать агенту, что делать вместо этого)`;
        }
    },
    {
        // "2 No" -> "2 Нет"
        pattern: /^(?:\d+[\s.]*)?no$/i,
        replace: (match) => {
            const prefix = match[0].match(/^(\d+[\s.]*)/)?.[1] || '';
            return `${prefix}Нет`;
        }
    },
    {
        pattern: /^see\s+all\s*\((\d+)\)$/i,
        replace: (match) => `Показать все (${match[1]})`
    },
    {
        pattern: /^file\s+access\s+rules\s*\(?(\d+)\)?$/i,
        replace: (match) => `Правила доступа к файлам (${match[1]})`
    },
    {
        pattern: /^file\s+access\s+rules\s+(\d+)$/i,
        replace: (match) => `Правила доступа к файлам (${match[1]})`
    },
    {
        pattern: /^(\d+)\s+active\s+conversation(s)?\.?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const hasDot = match[0].endsWith('.');
            let word = "активных диалогов";
            if (count % 10 === 1 && count % 100 !== 11) word = "активный диалог";
            else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) word = "активных диалога";
            return `${count} ${word}${hasDot ? '.' : ''}`;
        }
    },
    {
        pattern: /^(\d+)\s+archived\s+conversation(s)?\.?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const hasDot = match[0].endsWith('.');
            let word = "архивированных диалогов";
            if (count % 10 === 1 && count % 100 !== 11) word = "архивированный диалог";
            else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) word = "архивированных диалога";
            return `${count} ${word}${hasDot ? '.' : ''}`;
        }
    },
    {
        pattern: /^show\s*(\d+)\s*breakdown(s)?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            let word = "разбивок";
            if (count % 10 === 1 && count % 100 !== 11) {
                word = "разбивку";
            } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
                word = "разбивки";
            }
            return `Показать ${count} ${word}`;
        }
    },
    {
        pattern: /^skills\s*\((\d+)\)$/i,
        replace: (match) => `Навыки (${match[1]})`
    },
    {
        pattern: /^rules\s*\((\d+)\)$/i,
        replace: (match) => `Правила (${match[1]})`
    },
    {
        pattern: /^mcp\s+tools\s*\((\d+)\)$/i,
        replace: (match) => `Инструменты MCP (${match[1]})`
    },
    {
        pattern: /^.*?(?:([\d.,]+)%\s*)?of\s+the\s+customization\s+budget\s+is\s+available\.?$/i,
        replace: (match) => {
            if (match[1]) {
                return `Доступно ${match[1]}% бюджета кастомизаций.`;
            }
            return "бюджета кастомизаций доступно.";
        }
    },
    {
        pattern: /^rules\s*\(([\d.]+)%\)\s*([\d\s]+)?$/i,
        replace: (match) => `Правила (${match[1]}%)${match[2] ? ' ' + match[2] : ''}`
    },
    {
        pattern: /^skills\s*\(([\d.]+)%\)\s*([\d\s]+)?$/i,
        replace: (match) => `Навыки (${match[1]}%)${match[2] ? ' ' + match[2] : ''}`
    },
    {
        pattern: /^mcp tools\s*\(([\d.]+)%\)\s*([\d\s]+)?$/i,
        replace: (match) => `Инструменты MCP (${match[1]}%)${match[2] ? ' ' + match[2] : ''}`
    },
    {
        pattern: /^your plan:\s*(.*)$/i,
        replace: (match) => `Ваш тариф: ${match[1]}`
    },
    {
        pattern: /^see\s*less$/i,
        replace: () => "Скрыть"
    },
    {
        pattern: /^you\s+have\s+used\s+some\s+of\s+your\s+weekly\s+limit,\s*it\s+will\s+fully\s+refresh\s+in\s*(.*)$/i,
        replace: (match) => {
            const time = translateDuration(match[1].replace(/\.$/, ''));
            return `Вы использовали часть недельного лимита, он полностью восстановится через ${time}.`;
        }
    },
    {
        pattern: /^you\s+have\s+used\s+some\s+of\s+your\s+5-hour\s+limit,\s*it\s+will\s+fully\s+refresh\s+in\s*(.*)$/i,
        replace: (match) => {
            const time = translateDuration(match[1].replace(/\.$/, ''));
            return `Вы использовали часть 5-часового лимита, он полностью восстановится через ${time}.`;
        }
    },
    {
        pattern: /^yes,\s*and\s*always\s*allow\s*'(.*?)'\s*in\s*this\s*conversation$/i,
        replace: (match) => `Да, и всегда разрешать '${match[1]}' в этом диалоге`
    },
    {
        pattern: /^yes,\s*and\s*always\s*allow\s*in\s*this\s*conversation$/i,
        replace: () => `Да, и всегда разрешать в этом диалоге`
    },
    {
        pattern: /^yes,\s*and\s*always\s*allow\s*'(.*?)'\s*when\s*not\s*in\s*a\s*project$/i,
        replace: (match) => `Да, и всегда разрешать '${match[1]}' вне проекта`
    },
    {
        pattern: /^yes,\s*and\s*always\s*allow\s*'(.*?)'$/i,
        replace: (match) => `Да, и всегда разрешать '${match[1]}'`
    },
    {
        pattern: /^(\d+)\s+tools\s+enabled$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            let word = "инструментов";
            if (count % 10 === 1 && count % 100 !== 11) {
                word = "инструмент";
            } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
                word = "инструмента";
            }
            return `Включено ${count} ${word}`;
        }
    },
    {
        pattern: /^send\s+feedback\s+as\s+(.*)$/i,
        replace: (match) => `Отправить отзыв от имени ${match[1]}`
    },
    // MCP View Translations
    {
        pattern: /^add\s+mcp\s*$/i,
        replace: (match) => `Добавить MCP`
    },
    {
        pattern: /^add\s+mcp\s*\+?\s*$/i,
        replace: (match) => `Добавить MCP +`
    },
    {
        pattern: /^(?:[\s←]*)(add\s+mcp\s+servers)(?:\s*)$/i,
        replace: (match) => {
            const hasArrow = match[0].includes('←');
            return (hasArrow ? '← ' : '') + 'Добавить MCP-серверы';
        }
    },
    // 36 MCP Server Descriptions
    {
        pattern: /^Query your GitLab SDLC as a knowledge graph.*/i,
        replace: () => `Запросы к вашему GitLab SDLC в виде графа знаний. Orbit индексирует группы, проекты, исходный код, запросы на слияние, пайплайны, рабочие элементы и результаты безопасности в единый граф...`
    },
    {
        pattern: /^Enable Antigravity to deploy apps to Google Cloud Run.*/i,
        replace: () => `Позволяет Antigravity развертывать приложения в Google Cloud Run.`
    },
    {
        pattern: /^Interact directly with the PostHog product analytics platform.*/i,
        replace: () => `Взаимодействуйте напрямую с платформой продуктовой аналитики PostHog на естественном языке. Запускайте запросы, управляйте флагами функций, отслеживайте ошибки и управляйте проектами.`
    },
    {
        pattern: /^Enable Antigravity to interact with Google Kubernetes Engine.*/i,
        replace: () => `Позволяет Antigravity взаимодействовать с Google Kubernetes Engine (GKE).`
    },
    {
        pattern: /^The Dart and Flutter MCP server exposes.*/i,
        replace: () => `MCP-сервер Dart и Flutter предоставляет действия инструментов разработки Dart (и Flutter) для совместимых клиентов AI-ассистентов.`
    },
    {
        pattern: /^The Firebase Model Context Protocol.*gives AI-powered.*/i,
        replace: () => `MCP-сервер Firebase дает инструментам разработки на базе ИИ возможность работать с вашими проектами Firebase и кодовой базой вашего приложения.`
    },
    {
        pattern: /^The Genkit Model Context Protocol.*gives AI-powered.*/i,
        replace: () => `MCP-сервер Genkit дает инструментам разработки на базе ИИ возможность собирать, отлаживать и инспектировать ваше приложение Genkit.`
    },
    {
        pattern: /^The gopls Model Context Protocol.*provides tools.*/i,
        replace: () => `MCP-сервер gopls предоставляет инструменты для семантического анализа кода, живой диагностики и преобразования вашей кодовой базы Go (не-google3).`
    },
    {
        pattern: /^Interact with your BigQuery data.*/i,
        replace: () => `Взаимодействуйте с вашими данными BigQuery на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашим наборам данных для поиска, проверки метаданных таблиц...`
    },
    {
        pattern: /^Interact with your AlloyDB for PostgreSQL data.*/i,
        replace: () => `Взаимодействуйте с вашими данными AlloyDB для PostgreSQL на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов...`
    },
    {
        pattern: /^The Bigtable Admin remote MCP server.*/i,
        replace: () => `Удаленный MCP-сервер Bigtable Admin позволяет управлять ресурсами Bigtable.`
    },
    {
        pattern: /^The Spanner remote MCP server.*/i,
        replace: () => `Удаленный MCP-сервер Spanner позволяет получать доступ и запускать инструменты Spanner для создания, управления и выполнения запросов к ресурсам Spanner из вашей среды разработки с поддержкой ИИ...`
    },
    {
        pattern: /^Interact with your Cloud SQL for PostgreSQL data.*/i,
        replace: () => `Взаимодействуйте с вашими данными Cloud SQL для PostgreSQL на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов...`
    },
    {
        pattern: /^Interact with your Cloud SQL for MySQL data.*/i,
        replace: () => `Взаимодействуйте с вашими данными Cloud SQL для MySQL на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов, проверки...`
    },
    {
        pattern: /^Interact with your Cloud SQL for SQL Server data.*/i,
        replace: () => `Взаимодействуйте с вашими данными Cloud SQL для SQL Server на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашей базе данных для выполнения SQL-запросов...`
    },
    {
        pattern: /^Connect your AI assistants to Looker.*/i,
        replace: () => `Подключите ваших ИИ-ассистентов к бизнес-аналитике Looker. Этот MCP-сервер позволяет исследовать данные и управлять контентом, выполняя естественные...`
    },
    {
        pattern: /^Connect your AI assistants to the Knowledge Catalog.*/i,
        replace: () => `Подключите ваших ИИ-ассистентов к Каталогу знаний (ранее известному как Dataplex). Этот MCP-сервер позволяет находить данные и управлять ими, выполняя поиск...`
    },
    {
        pattern: /^The MCP Toolbox for Databases is.*/i,
        replace: () => `MCP Toolbox для баз данных — это MCP-сервер с открытым исходным кодом, созданный для упрощения и обеспечения безопасности разработки инструментов взаимодействия с базами данных.`
    },
    {
        pattern: /^AlloyDB for PostgreSQL Admin MCP Server enables.*/i,
        replace: () => `MCP-сервер AlloyDB для PostgreSQL Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами AlloyDB для PostgreSQL, включая создание кластеров и администрирование пользователей.`
    },
    {
        pattern: /^Cloud SQL for PostgreSQL Admin MCP Server enables.*/i,
        replace: () => `MCP-сервер Cloud SQL для PostgreSQL Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами Cloud SQL для PostgreSQL, включая создание инстансов, администрирование...`
    },
    {
        pattern: /^Cloud SQL for MySQL Admin MCP Server enables.*/i,
        replace: () => `MCP-сервер Cloud SQL для MySQL Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами Cloud SQL для MySQL, включая создание инстансов, администрирование пользователей и...`
    },
    {
        pattern: /^Cloud SQL for SQL Server Admin MCP Server enables.*/i,
        replace: () => `MCP-сервер Cloud SQL для SQL Server Admin позволяет ИИ-ассистентам взаимодействовать с ресурсами Cloud SQL для SQL Server, включая создание инстансов, администрирование...`
    },
    {
        pattern: /^Interact with your Oracle Database data.*/i,
        replace: () => `Взаимодействуйте с вашими данными Oracle Database на естественном языке. Этот MCP-сервер позволяет безопасно подключаться к вашим базам данных для выполнения SQL-запросов...`
    },
    {
        pattern: /^The Dev Mode MCP Server brings Figma.*/i,
        replace: () => `MCP-сервер Dev Mode переносит Figma напрямую в ваш рабочий процесс, предоставляя важную информацию о дизайне и контекст ИИ-агентам, генерирующим код из Figma...`
    },
    {
        pattern: /^The GitHub MCP Server is.*/i,
        replace: () => `MCP-сервер GitHub — это сервер Model Context Protocol, обеспечивающий бесшовную интеграцию с API GitHub, что делает возможным продвинутую автоматизацию и взаимодействие...`
    },
    {
        pattern: /^Neon MCP Server is an open-source.*/i,
        replace: () => `MCP-сервер Neon — это инструмент с открытым исходным кодом, который позволяет вам взаимодействовать с базами данных Neon Postgres на естественном языке.`
    },
    {
        pattern: /^The Stripe Model Context Protocol server.*/i,
        replace: () => `MCP-сервер Stripe позволяет интегрироваться с API Stripe посредством вызова функций. Этот протокол поддерживает различные инструменты для взаимодействия с...`
    },
    {
        pattern: /^Interact with Redis key-value.*/i,
        replace: () => `Взаимодействуйте с хранилищами ключ-значение Redis`
    },
    {
        pattern: /^A Model Context Protocol server for interacting with MongoDB.*/i,
        replace: () => `Сервер Model Context Protocol для взаимодействия с MongoDB Atlas.`
    },
    {
        pattern: /^Official Notion MCP Server.*/i,
        replace: () => `Официальный MCP-сервер Notion, позволяющий взаимодействовать с рабочими пространствами, страницами, базами данных и комментариями Notion через Notion API.`
    },
    {
        pattern: /^Official Linear\.app MCP Server.*/i,
        replace: () => `Официальный MCP-сервер Linear.app для взаимодействия с проектами, задачами и рабочими процессами Linear.`
    },
    {
        pattern: /^An MCP server implementation that integrates the Perplexity.*/i,
        replace: () => `Реализация MCP-сервера, которая интегрирует Perplexity Sonar API для предоставления возможностей поиска в реальном времени по всей сети.`
    },
    {
        pattern: /^Official PayPal MCP Server.*/i,
        replace: () => `Официальный MCP-сервер PayPal, позволяющий интегрироваться с API PayPal для обработки платежей, управления транзакциями и операций с аккаунтами.`
    },
    {
        pattern: /^The Heroku Platform MCP Server enables.*/i,
        replace: () => `MCP-сервер Heroku Platform обеспечивает бесшовное взаимодействие с ресурсами Heroku Platform, позволяя LLM читать, управлять и оперировать приложениями, аддонами...`
    },
    {
        pattern: /^The Pinecone MCP Server enables.*/i,
        replace: () => `MCP-сервер Pinecone позволяет инструментам ИИ искать в документации Pinecone, настраивать индексы, генерировать код на основе конфигурации ваших индексов и...`
    },
    {
        pattern: /^Connect your Supabase projects to.*/i,
        replace: () => `Подключите ваши проекты Supabase к ИИ-ассистентам. Этот MCP-сервер позволяет управлять таблицами, получать конфигурацию, выполнять SQL-запросы, управлять edge-функциями и работать...`
    },
    {
        pattern: /^The Prisma MCP Server enables.*/i,
        replace: () => `MCP-сервер Prisma позволяет ИИ-инструментам легко взаимодействовать с Prisma для создания и управления базами данных Postgres.`
    },
    {
        pattern: /^The Locofy MCP Server enables.*/i,
        replace: () => `MCP-сервер Locofy позволяет интегрировать и расширять код Locofy.ai в вашей IDE.`
    },
    {
        pattern: /^Airweave lets agents.*/i,
        replace: () => `Airweave позволяет агентам искать в любом приложении.`
    },
    {
        pattern: /^Atlassian MCP Server for.*/i,
        replace: () => `MCP-сервер Atlassian для взаимодействия с продуктами Atlassian.`
    },
    {
        pattern: /^Harness MCP Server allows.*/i,
        replace: () => `MCP-сервер Harness позволяет ИИ-ассистентам взаимодействовать с API платформы Harness, обеспечивая интеллектуальную автоматизацию и помощь в доставке ПО и облачных...`
    },
    {
        pattern: /^SonarQube MCP Server enables.*/i,
        replace: () => `MCP-сервер SonarQube позволяет ИИ-ассистентам взаимодействовать с инстансами SonarQube для анализа качества кода, управления проектами и работы с воротами качества.`
    },
    {
        pattern: /^Netlify MCP Server enables.*/i,
        replace: () => `MCP-сервер Netlify позволяет ИИ-ассистентам взаимодействовать с платформой Netlify для управления сайтами, деплоями, доменами и другими процессами веб-разработки.`
    },
    {
        pattern: /^A Model Context Protocol server that provides structured thinking.*/i,
        replace: () => `Сервер Model Context Protocol, предоставляющий возможности структурированного мышления и рассуждения для диалогов с LLM.`
    },
    {
        pattern: /^Sonatype MCP server for.*/i,
        replace: () => `MCP-сервер Sonatype для взаимодействия с нашей платформой управления зависимостями и анализа безопасности.`
    },
    {
        pattern: /^The Google Maps Platform Code Assist.*/i,
        replace: () => `MCP-сервер Google Maps Platform Code Assist предоставляет вашему любимому ИИ-ассистенту актуальную официальную документацию и код Google Maps Platform...`
    },
    {
        pattern: /^This MCP server provides your LLM with docs.*/i,
        replace: () => `Этот MCP-сервер предоставляет вашей LLM документацию и примеры для инструментирования ИИ-приложений с помощью Arize AX, а также доступ к поддержке Arize. Подключите его к вашей IDE...`
    },
    {
        pattern: /^The Postman MCP Server connects.*/i,
        replace: () => `MCP-сервер Postman подключает Postman к ИИ-инструментам, предоставляя ИИ-агентам и ассистентам возможность доступа к рабочим пространствам, управления коллекциями и окружениями...`
    },
    {
        pattern: /^The Stitch MCP server enables.*/i,
        replace: () => `MCP-сервер Stitch позволяет ИИ-ассистентам взаимодействовать со Stitch для проектирования интерфейсов: генерации дизайнов из текста и изображений, доступа к деталям проектов и экранов...`
    },
    {
        pattern: /^The Google Developer Knowledge MCP server.*/i,
        replace: () => `MCP-сервер Google Developer Knowledge дает инструментам разработки на базе ИИ возможность искать и извлекать данные из официальной документации Google для разработчиков...`
    },
    {
        pattern: /^The ClickHouse MCP server enables.*/i,
        replace: () => `MCP-сервер ClickHouse позволяет агентам безопасно взаимодействовать с базами данных ClickHouse. Он предоставляет универсальный интерфейс для выполнения SQL, исследования данных...`
    },
    {
        pattern: /^Perform a range of infrastructure management tasks.*/i,
        replace: () => `Выполняйте широкий спектр задач по управлению инфраструктурой, включая: управление инстансами виртуальных машин (ВМ), управление группами инстансов и шаблонами...`
    },
    {
        pattern: /^Access enterprise mobility data using.*/i,
        replace: () => `Доступ к корпоративным данным мобильности с использованием запросов на естественном языке об устройствах, автоматического аудита соответствия политикам и интеграции...`
    },
    {
        pattern: /^Search your Google Cloud projects.*/i,
        replace: () => `Поиск по вашим проектам Google Cloud с использованием естественного языка.`
    },
    {
        pattern: /^Perform searches on ingested data.*/i,
        replace: () => `Выполняйте поиск по загруженным данным в хранилищах данных Google.`
    },
    {
        pattern: /^Interact with documents stored in a Firestore.*/i,
        replace: () => `Взаимодействуйте с документами, хранящимися в базе данных Firestore, используя естественный язык.`
    },
    {
        pattern: /^Access resources in the Cloud Logging.*/i,
        replace: () => `Доступ к ресурсам платформы Cloud Logging с использованием естественного языка.`
    },
    {
        pattern: /^Manage clusters for Managed Service for Apache Kafka.*/i,
        replace: () => `Управляйте кластерами Managed Service для Apache Kafka и Kafka Connect с использованием естественного языка.`
    },
    {
        pattern: /^Access resources in the Cloud Monitoring.*/i,
        replace: () => `Доступ к ресурсам платформы Cloud Monitoring с использованием естественного языка.`
    },
    {
        pattern: /^Manage Pub\/Sub resources and publish messages.*/i,
        replace: () => `Управляйте ресурсами Pub/Sub и публикуйте сообщения. Создавайте, просматривайте, получайте, обновляйте и удаляйте топики, подписки и снимки Pub/Sub, а также публикуйте сообщения.`
    },
    {
        pattern: /^The Cloud SQL remote MCP server.*/i,
        replace: () => `Удаленный MCP-сервер Cloud SQL позволяет получать доступ и запускать инструменты Cloud SQL для создания, управления и выполнения запросов к ресурсам Cloud SQL из вашей среды разработки...`
    },
    {
        pattern: /^Enable Antigravity to control and inspect a live Chrome.*/i,
        replace: () => `Позволяет Antigravity управлять и инспектировать запущенный браузер Chrome с доступом ко всей мощи Chrome DevTools для надежной автоматизации, глубокой отладки и...`
    },
    {
        pattern: /^Allow (.*)\?$/i,
        replace: (m) => `Разрешить ${translateText(m[1])}?`
    },
    {
        pattern: /\bin this conversation\b/i,
        replace: (m) => m.input.replace(/\bin this conversation\b/gi, 'в этом диалоге')
    },
    {
        pattern: /when not in a project/i,
        replace: (m) => m.input.replace(/when not in a project/gi, 'вне проекта')
    },
    {
        pattern: /^Send feedback as (.+)$/i,
        replace: (m) => `Отправить отзыв как ${m[1]}`
    },
    {
        pattern: /^Comprehensive guide and reference for the Antigravity Customization System.*/i,
        replace: () => `Полное руководство и справочник по системе персонализации Antigravity. Объясняет работу настроек, приоритеты загрузки, механизмы обнаружения и создание навыков, правил, плагинов, хуков и серверов MCP.`
    },
    {
        pattern: /^Provides a comprehensive guide, quick reference, and sitemap for Google Antigravity.*/i,
        replace: () => `Предоставляет полное руководство, быстрый справочник и карту Google Antigravity (AGY), включая Antigravity CLI (agy), Antigravity 2.0, Antigravity IDE, Python SDK, слэш-команды, горячие клавиши и персонализацию.`
    },
    {
        pattern: /^Investigate and fix software issues using AI-powered root cause analysis.*/i,
        replace: () => `Исследуйте и устраняйте проблемы с ПО с помощью анализа первопричин на базе ИИ. Этот MCP-сервер подключается к вашей учетной записи Antimetal для поиска ошибок, чтения аналитических отчетов...`
    },
    {
        pattern: /^Query and act on your marketing, analytics, CRM.*/i,
        replace: () => `Запрашивайте и обрабатывайте данные маркетинга, аналитики, CRM, электронной коммерции и хранилищ через 325+ коннекторов (Meta Ads, Google Ads, TikTok Ads, GA4, HubSpot, Salesforce...)`
    },
    {
        pattern: /^Ask questions\. Get answers\. The MCP is a server your coding agent talks to.*/i,
        replace: () => `Задавайте вопросы и получайте ответы. MCP — это сервер, с которым общается ваш агент. Он выполняет запросы к вашим данным PostHog и возвращает результат прямо в диалог...`
    },
    {
        pattern: /^Search and reference over 600,000 real-world app screens.*/i,
        replace: () => `Ищите и используйте более 600 000 экранов реальных приложений, пользовательских сценариев и шаблонов интерфейса из Mobbin прямо в ваших инструментах ИИ.`
    },
    {
        pattern: /^Build, edit, deploy, and manage full-stack web apps with Lovable.*/i,
        replace: () => `Создавайте, редактируйте, развертывайте и управляйте full-stack веб-приложениями с помощью Lovable на естественном языке. Этот MCP-сервер подключает ваш ИИ-клиент к сервисам Lovable...`
    },
    {
        pattern: /^The GKE remote MCP server provides read write access.*/i,
        replace: () => `Удаленный MCP-сервер GKE предоставляет доступ на чтение и запись к ресурсам Kubernetes в GKE. Он позволяет ИИ-агенту инспектировать и отслеживать ваше окружение.`
    },
    {
        pattern: /^The AlloyDB for PostgreSQL remote MCP server.*/i,
        replace: () => `Удаленный MCP-сервер AlloyDB for PostgreSQL позволяет получать доступ и запускать инструменты AlloyDB для управления кластерами, инстансами, пользователями, создания и восстановления резервных копий...`
    },
    {
        pattern: /^Cloud CLI MCP Server provides tools to run gcloud and bq.*/i,
        replace: () => `MCP-сервер Cloud CLI предоставляет инструменты для выполнения команд gcloud и bq в изолированной удаленной песочнице.`
    },
    {
        pattern: /^The Apigee API hub remote MCP server.*/i,
        replace: () => `Удаленный MCP-сервер Apigee API hub позволяет управлять API, версиями, спецификациями, развертываниями, атрибутами и зависимостями, зарегистрированными в...`
    },
    {
        pattern: /^The Google Home Developer MCP server allows you to search through.*/i,
        replace: () => `MCP-сервер Google Home Developer позволяет выполнять поиск по документации Google Home, спецификациям OpenThread и Matter.`
    },
    {
        pattern: /^Interact with your Harness account using natural language.*/i,
        replace: () => `Взаимодействуйте со своим аккаунтом Harness на естественном языке. Этот MCP-сервер позволяет ИИ-агентам проверять и управлять пайплайнами CI/CD, выполнениями, сервисами и окружениями...`
    },
    {
        pattern: /^The Cloud Quotas MCP server allows you to view quota allocations.*/i,
        replace: () => `MCP-сервер Cloud Quotas позволяет просматривать выделенные квоты, запрашивать увеличение лимитов квот и управлять конфигурациями автоматической корректировки квот (Quota Adjuster).`
    },
    {
        pattern: /^Build applications with the Gemini Interactions API and Live API.*/i,
        replace: () => `Создавайте приложения с помощью Gemini Interactions API и Live API, включая генерацию текста, многоэтапные диалоги, стриминг, вызов функций, управляемых агентов и связь в реальном времени...`
    },
    {
        pattern: /^Scan the code to open this device in Remote Control, or (.*)\.?$/i,
        replace: (m) => `Отсканируйте код, чтобы открыть это устройство в Remote Control, или ${translateText(m[1])}.`
    },
    {
        pattern: /^Continue your work from another device with Remote Control.*/i,
        replace: () => `Продолжайте работу с другого устройства с помощью Remote Control. Отсканируйте QR-код или перейдите по ссылке ниже.`
    },
    {
        pattern: /^Work with local agents from another device.*/i,
        replace: () => `Работайте с локальными агентами с другого устройства.`
    },
    {
        pattern: /^Manage Antigravity app settings.*/i,
        replace: () => `Управление настройками приложения Antigravity.`
    },
    {
        pattern: /^Scan the code to open this device in Remote Control, or\s*$/i,
        replace: () => `Отсканируйте код, чтобы открыть это устройство в Remote Control, или `
    },
    {
        pattern: /^to be installed\.\s*The browser subagent can be invoked by typing\s*(\/browser.*)/i,
        replace: (m) => `. Браузер-субагент можно запустить, введя ${m[1]}`
    },
    {
        pattern: /^to be installed\.\s*The browser subagent can be invoked by typing/i,
        replace: () => `. Браузер-субагент можно запустить, введя`
    },
    {
        pattern: /^(Controls the actions the agent can take\.)\s*Modified in\s*(\d+)\s*(projects?|проекты?|проектах)/i,
        replace: (m) => {
            const count = parseInt(m[2], 10);
            const plural = (count % 10 === 1 && count % 100 !== 11) ? 'проекте' : 'проектах';
            return `Управляет действиями, которые может выполнять агент. Изменено в ${count} ${plural}`;
        }
    },
    {
        pattern: /^(Whether the agent asks you to review its documents\.)\s*Modified in\s*(\d+)\s*(projects?|проекты?|проектах)/i,
        replace: (m) => {
            const count = parseInt(m[2], 10);
            const plural = (count % 10 === 1 && count % 100 !== 11) ? 'проекте' : 'проектах';
            return `Запрашивать ли проверку создаваемых агентом документов. Изменено в ${count} ${plural}`;
        }
    },
    {
        pattern: /Modified in\s*(\d+)\s*(projects?|проекты?|проектах)/i,
        replace: (m) => {
            const count = parseInt(m[1], 10);
            const plural = (count % 10 === 1 && count % 100 !== 11) ? 'проекте' : 'проектах';
            return `Изменено в ${count} ${plural}`;
        }
    },
    {
        pattern: /^Controls the actions the agent can take\./i,
        replace: () => `Управляет действиями, которые может выполнять агент.`
    },
    {
        pattern: /^Whether the agent asks you to review its documents\./i,
        replace: () => `Запрашивать ли проверку создаваемых агентом документов.`
    },
    {
        pattern: /^Available AI Credits:\s*(\d+)/i,
        replace: (m) => `Доступные AI-кредиты: ${m[1]}`
    },
    {
        pattern: /^Models within this group:\s*(.*)$/i,
        replace: (m) => `Модели в этой группе: ${m[1]}`
    },
    {
        pattern: /^Browse and enable plugins from the Build With Google catalog\./i,
        replace: () => `Просматривайте и включайте плагины из каталога Build With Google.`
    },
    {
        pattern: /^The Cloud Audit Manager remote MCP server allows you to enroll projects.*/i,
        replace: (m) => {
            const isEurope = m.input.includes('europe-west');
            const region = isEurope ? 'europe-west1' : 'us-central1';
            return `Удаленный MCP-сервер Cloud Audit Manager позволяет подключать проекты, создавать отчеты об аудите и области охвата, а также проверять статусы подключения ресурсов в регионе ${region}...`;
        }
    },
    {
        pattern: /^Let your agents talk to your Splunk data.*/i,
        replace: () => `Позвольте вашим агентам общаться с данными Splunk. Спрашивайте, что сломалось, почему и что изменилось на обычном языке — агенты найдут ваши события, сохраненные поисковые запросы и...`
    },
    {
        pattern: /^The Wiz MCP Server connects multiple security data sources.*/i,
        replace: () => `MCP-сервер Wiz объединяет множество источников данных о безопасности через центральный хост и сервер. Это создает единое контекстное представление о состоянии вашей безопасности...`
    },
    {
        pattern: /^Access Personalized Service Health events impacting Google Cloud products.*/i,
        replace: () => `Получайте доступ к событиям Personalized Service Health, влияющим на продукты и службы Google Cloud, актуальные для ваших проектов, на естественном языке.`
    },
    {
        pattern: /^The Unified Maintenance MCP server allows you to discover and query planned.*/i,
        replace: () => `MCP-сервер Unified Maintenance позволяет находить и запрашивать информацию о запланированных работах по обслуживанию ресурсов Google Cloud.`
    },
    {
        pattern: /^Interact with your Neo4j graph database using natural language.*/i,
        replace: () => `Взаимодействуйте с графовой базой данных Neo4j на естественном языке. Этот MCP-сервер подключается напрямую к вашему инстансу Neo4j для исследования схемы графа, выполнения чтения и...`
    },
    {
        pattern: /^Author, run, and maintain mabl end-to-end tests.*/i,
        replace: () => `Создавайте, запускайте и поддерживайте сквозные тесты mabl с помощью ваших ИИ-инструментов. Подключайтесь к рабочим пространствам mabl для генерации и редактирования тестов, запуска...`
    },
    {
        pattern: /^Connect your Miro boards to AI assistants.*/i,
        replace: () => `Подключайте доски Miro к ИИ-ассистентам. Этот MCP-сервер позволяет обобщать и искать доски, создавать и обновлять элементы доски (стикеры, фигуры, фреймы...`
    },
    {
        pattern: /^Search the live web and extract content from URLs directly in Antigravity.*/i,
        replace: () => `Ищите информацию в реальном времени в интернете и извлекайте контент по URL-адресам прямо в Antigravity. Parallel предоставляет релевантные результаты поиска и читаемый контент для вашего агента...`
    },
    {
        pattern: /^The Grafana Cloud MCP server is a remotely hosted Model Context Protocol.*/i,
        replace: () => `MCP-сервер Grafana Cloud — это удаленный сервер Model Context Protocol (MCP), который позволяет внешним ИИ-агентам подключаться напрямую к вашим данным Grafana Cloud...`
    },
    {
        pattern: /^Give your agent real-time web search and content retrieval.*/i,
        replace: () => `Предоставьте вашему агенту поиск в реальном времени и извлечение веб-контента. Этот MCP-сервер подключается к API поиска Exa для выполнения веб-поиска, чтения содержимого страниц...`
    },
    {
        pattern: /^Use natural language to find hosts, review detections, search events.*/i,
        replace: () => `Используйте естественный язык для поиска хостов, просмотра обнаружений, поиска событий и выполнения других операций безопасности в среде Falcon...`
    },
    {
        pattern: /^Browser settings have moved to the Browser section of General settings\./i,
        replace: () => `Настройки браузера перемещены в раздел «Браузер» общих настроек.`
    },
    {
        pattern: /^Also includes\s*(Global Permissions|глобальные разрешения)\s*when working in this project\./i,
        replace: () => `Также включает глобальные разрешения при работе в этом проекте.`
    },
    {
        pattern: /^Inherits your Global Permissions when working in this project\./i,
        replace: () => `Наследует ваши глобальные разрешения при работе в этом проекте.`
    },
    {
        pattern: /^Install Antigravity IDE to run and edit your workspace scripts\./i,
        replace: () => `Установите Antigravity IDE для запуска и редактирования скриптов вашего рабочего пространства.`
    },
    {
        pattern: /^Подробнее о Inherit Global/i,
        replace: () => `Подробнее о режиме «Наследовать глобальные»`
    },
    {
        pattern: /^Learn more about Inherit Global/i,
        replace: () => `Подробнее о режиме «Наследовать глобальные»`
    },
    {
        pattern: /^Remote Control Issue\s*$/i,
        replace: () => `Проблема с дистанционным управлением`
    },
    {
        pattern: /^Copy Project Name\s*$/i,
        replace: () => `Скопировать название проекта`
    },
    {
        pattern: /^Project Settings\s*$/i,
        replace: () => `Настройки проекта`
    },
    {
        pattern: /^New Conversation in Project\s*$/i,
        replace: () => `Новый диалог в проекте`
    },
    {
        pattern: /^Display Options\s*$/i,
        replace: () => `Параметры отображения`
    },
    {
        pattern: /^Create New Project\s*$/i,
        replace: () => `Создать новый проект`
    },
    {
        pattern: /^You have hit your weekly limit, it refreshes in (.*?)\.\s*If on a supported paid plan, you can use AI credits in the interim or upgrade to a higher tier\.?$/i,
        replace: (m) => `Вы исчерпали недельный лимит, он обновится через ${translateDuration(m[1])}. Если вы используете поддерживаемый платный тариф, вы можете использовать AI-кредиты в это время или перейти на более высокий тариф.`
    },
    {
        pattern: /^You have hit your weekly limit, the 5-hour limit does not currently apply\.\s*Your weekly limit will fully refresh in (.*?)\.?$/i,
        replace: (m) => `Вы исчерпали недельный лимит, 5-часовой лимит в данный момент не применяется. Ваш недельный лимит полностью обновится через ${translateDuration(m[1])}.`
    },
    {
        pattern: /^\s*\.?\s*The browser subagent can be invoked by typing\s*(\/browser.*?)$/i,
        replace: (m) => `. Запустить браузер-субагент можно, введя ${m[1]}`
    },
    {
        pattern: /^\s*\.?\s*The browser subagent can be invoked by typing/i,
        replace: () => `. Запустить браузер-субагент можно, введя`
    },
    {
        pattern: /^Manage your Neon backend with the Neon MCP Server.*/i,
        replace: () => `Управляйте вашим бэкендом Neon с помощью MCP-сервера Neon: Lakebase Postgres, ветвление, объектное хранилище, функции и AI Gateway.`
    },
    {
        pattern: /^Send feedback as\s+(.*)$/i,
        replace: (m) => `Отправить отзыв от имени ${m[1]}`
    },
    {
        pattern: /^Updated\s+(.*)$/i,
        replace: (m) => `Обновлено ${translateRelativeTime(m[1])}`
    },
    {
        pattern: /^Manage Google Cloud resources with gcloud and bq CLI tools.*/i,
        replace: () => `Управляйте ресурсами Google Cloud с помощью CLI-инструментов gcloud и bq в изолированной удаленной песочнице.`
    },
    {
        pattern: /^Google Cloud CLI \(Preview\)/i,
        replace: () => `Google Cloud CLI (Предварительный просмотр)`
    },
    {
        pattern: /^Archive Conversation\s*$/i,
        replace: () => `Архивировать диалог`
    },
    {
        pattern: /^Mark Unread\s*$/i,
        replace: () => `Пометить как непрочитанное`
    },
    {
        pattern: /^More Actions\s*$/i,
        replace: () => `Другие действия`
    },
    {
        pattern: /^Send message\s+Enter\s*$/i,
        replace: () => `Отправить сообщение Enter`
    },
    {
        pattern: /^Send message\s*$/i,
        replace: () => `Отправить сообщение`
    },
    {
        pattern: /^Record Audio(\s*.*)$/i,
        replace: (m) => `Запись аудио${m[1]}`
    },
    {
        pattern: /^Resets in\s*(.*)$/i,
        replace: (m) => m[1] ? `Сброс через ${translateDuration(m[1])}` : `Сброс через`
    },
    {
        pattern: /^Select Model(\s*.*)$/i,
        replace: (m) => `Выбор модели${m[1]}`
    },
    {
        pattern: /^Stop Execution\s*$/i,
        replace: () => `Остановить выполнение`
    },
    {
        pattern: /^Pin\s*$/i,
        replace: () => `Закрепить`
    },
    {
        pattern: /^Original:\s*(.*)$/i,
        replace: (m) => `Оригинал: ${translateText(m[1])}`
    },
    {
        pattern: /^Show in File Explorer\s*$/i,
        replace: () => `Показать в проводнике`
    },
    {
        pattern: /^Plan Review Policy\s*$/i,
        replace: () => `Политика проверки плана`
    },
    {
        pattern: /^Type\s*(\/|.)?\s*and select\s*(plan)?\s*to have the agent generate a plan\.?/i,
        replace: () => `Введите / и выберите plan, чтобы агент составил план.`
    },
    {
        pattern: /^Discover, manage, and audit organization policies.*/i,
        replace: () => `Находите, управляйте и проводите аудит политик организации и пользовательских ограничений для ваших ресурсов Google Cloud на естественном языке.`
    },
    {
        pattern: /^Create, inspect, restrict, and manage the lifecycle of API keys.*/i,
        replace: () => `Создавайте, проверяйте, ограничивайте и управляйте жизненным циклом API-ключей в ваших проектах Google Cloud на естественном языке.`
    },
    {
        pattern: /^Interact with your Vercel projects using natural language.*/i,
        replace: () => `Взаимодействуйте с вашими проектами Vercel на естественном языке. Vercel MCP позволяет инструментам ИИ искать документацию Vercel, инспектировать проекты и развертывания, анализировать логи и управлять ресурсами.`
    },
    {
        pattern: /^Connect to FactSet AI-Ready Data to search and read institutional-grade financial data.*/i,
        replace: () => `Подключайтесь к FactSet AI-Ready Data для поиска и чтения финансовых данных институционального уровня на естественном языке. Этот MCP-сервер предоставляет единый доступ к финансовым показателям, прогнозам и рыночным данным компаний.`
    },
    {
        pattern: /^Stand up matters, shape workspace schema, govern access.*/i,
        replace: () => `Создавайте дела, настраивайте схему рабочего пространства, управляйте доступом и анализируйте использование в RelativityOne. Этот MCP-сервер позволяет безопасно подключаться к вашей среде RelativityOne для оптимизации юридических процессов.`
    },
    {
        pattern: /^Connect to Daloopa to discover companies, series, get company fundamentals.*/i,
        replace: () => `Подключайтесь к Daloopa для поиска компаний, серий, получения фундаментальных показателей компаний, поиска финансовых документов и цен акций. Доступ к проверенным финансовым данным и KPI из отчетов SEC.`
    },
    {
        pattern: /^Search and retrieve real-time financial and stock market data from Finnhub.*/i,
        replace: () => `Ищите и получайте финансовые данные и данные фондового рынка в реальном времени из Finnhub на естественном языке. Этот MCP-сервер подключается к вашему аккаунту Finnhub для доступа к котировкам акций, новостям рынка и профилям компаний.`
    },
    {
        pattern: /^Search and retrieve comprehensive financial and corporate data from S&P Global.*/i,
        replace: () => `Ищите и получайте подробные финансовые и корпоративные данные от S&P Global на естественном языке. Этот MCP-сервер подключается к S&P Global Market Intelligence для предоставления рыночной аналитики и сведений о компаниях.`
    },
    {
        pattern: /^Explore deep global markets data and financial analytics from LSEG.*/i,
        replace: () => `Исследуйте глубокие данные мировых рынков и финансовую аналитику от LSEG (London Stock Exchange Group). Этот MCP-сервер подключает ваши инструменты ИИ к LSEG Financial Analytics для предоставления подробных данных и глубины рынка.`
    },
    {
        pattern: /^Bring Harvey's legal intelligence into your AI tools.*/i,
        replace: () => `Используйте юридический интеллект Harvey в ваших ИИ-инструментах для общих юридических запросов, анализа проектов Vault и исследования специализированных источников знаний. MCP-сервер Harvey подключает ваши рабочие процессы к передовому юридическому анализу.`
    },
    {
        pattern: /^Search Guidepoint's expert network for interview transcripts.*/i,
        replace: () => `Ищите стенограммы интервью в экспертной сети Guidepoint, просматривайте каталоги мероприятий и получайте личное расписание событий. Этот MCP-сервер также позволяет напрямую запрашивать экспертные данные и материалы мероприятий.`
    },
    {
        pattern: /^Models\s*&\s*Usage\s*$/i,
        replace: () => `Модели и использование`
    },
    {
        pattern: /^Manage your model quota and credits\.?/i,
        replace: () => `Управление квотами моделей и кредитами.`
    },
    {
        pattern: /^You are subscribed to the best Google AI plan\.?/i,
        replace: () => `Вы подписаны на лучший тариф Google AI.`
    },
    {
        pattern: /^Contrast\s*$/i,
        replace: () => `Контрастность`
    },
    {
        pattern: /^Strong\s*$/i,
        replace: () => `Высокая`
    },
    {
        pattern: /^App\s*version\s*$/i,
        replace: () => `Версия приложения`
    },
    {
        pattern: /^Version\s*$/i,
        replace: () => `Версия`
    },
    {
        pattern: /^(\d+)\s*(projects?|проекты?|проектах)$/i,
        replace: (m) => {
            const count = parseInt(m[1], 10);
            const plural = (count % 10 === 1 && count % 100 !== 11) ? 'проекте' : 'проектах';
            return `${count} ${plural}`;
        }
    },
    {
        pattern: /^Access institutional-grade financial data in your AI tools.*/i,
        replace: () => `Доступ к финансовым данным институционального уровня в ваших инструментах ИИ: фундаментальные показатели, коэффициенты, KPI, сегменты, скорректированные метрики, отчеты SEC, звонки о доходах и котировки рынка.`
    },
    {
        pattern: /^Connect with your Docusign account using natural language.*/i,
        replace: () => `Подключайтесь к вашей учетной записи Docusign на естественном языке. Этот MCP-сервер позволяет искать и находить конверты, шаблоны и документы Docusign, просматривать элементы и управлять ими.`
    },
    {
        pattern: /^LegalZoom(?:'s|’s)? MCP connector gives users instant access.*/i,
        replace: () => `MCP-коннектор LegalZoom предоставляет мгновенный доступ к информации о юридических продуктах, руководствам по регистрации бизнеса и консультациям юристов по запросу без лишних усилий.`
    },
    {
        pattern: /^Search and retrieve documents from your NetDocuments repository.*/i,
        replace: () => `Ищите и извлекайте документы из репозитория NetDocuments на естественном языке. Этот MCP-сервер позволяет инструментам ИИ безопасно искать документы и электронные письма.`
    },
    {
        pattern: /^Interact with your iManage Work platform using natural language.*/i,
        replace: () => `Взаимодействуйте с платформой iManage Work на естественном языке. Этот MCP-сервер подключается к вашему аккаунту iManage для поиска рабочих пространств, папок и документов.`
    },
    {
        pattern: /^Search and manage Salesforce records from your Salesforce remote MCP server.*/i,
        replace: () => `Ищите записи Salesforce и управляйте ими с удаленного MCP-сервера Salesforce. Подключайтесь к вашему инстансу Salesforce для поиска по объектам (SOSL), выполнения запросов SOQL и работы с данными.`
    },
    {
        pattern: /^Civil legal guidance for people navigating court without a lawyer.*/i,
        replace: () => `Гражданско-правовая помощь для тех, кто участвует в судебном процессе без адвоката. Этот MCP-сервер предоставляет обучающие руководства для самостоятельных участников гражданских судебных процессов в США.`
    },
    {
        pattern: /^Intelligent DevSecOps automation for your development workflow.*/i,
        replace: () => `Интеллектуальная автоматизация DevSecOps для ваших процессов разработки на естественном языке. Подключает вашего ИИ-кодинг-агента (Antigravity) к более чем 150 интегрированным инструментам.`
    },
    {
        pattern: /^Forge is an AI-powered platform that automates the earliest.*/i,
        replace: () => `Forge — это платформа на базе ИИ, автоматизирующая самый ранний и трудоемкий этап разработки ПО — планирование «Дня 0», которое обычно занимает недели.`
    },
    {
        pattern: /^Bring Endor Labs security into your AI tools.*/i,
        replace: () => `Интегрируйте безопасность Endor Labs в ваши инструменты ИИ. С помощью этого MCP-сервера вы можете проверять зависимости, риски безопасности и соответствие политикам кодовой базы.`
    },
    {
        pattern: /^Check for Updates\s*$/i,
        replace: () => `Проверить обновления`
    },
    {
        pattern: /^No updates available\.?\s*$/i,
        replace: () => `Нет доступных обновлений`
    },
    {
        pattern: /^Checking for updates\.{0,3}\s*$/i,
        replace: () => `Проверка обновлений...`
    },
    {
        pattern: /^Downloading update\.{0,3}\s*$/i,
        replace: () => `Загрузка обновления...`
    },
    {
        pattern: /^Restart to update\s*$/i,
        replace: () => `Перезапустить для обновления`
    },
    {
        pattern: /^Are you sure you want to delete the project\s*(.*?)\??$/i,
        replace: (m) => m[1] ? `Вы уверены, что хотите удалить проект ${m[1]}?` : `Вы уверены, что хотите удалить проект?`
    },
    {
        pattern: /^Edit\s+Conversation\s+Title\s*$/i,
        replace: () => `Изменить название диалога`
    },
    {
        pattern: /^Limited[\s-]+time\s*$/i,
        replace: () => `Ограниченное время`
    },
    {
        pattern: /^The breakdown below shows token usage from customizations like rules, skills, and MCP\..*/i,
        replace: () => `В приведенной ниже таблице показано использование токенов персонализациями (правила, навыки и MCP). При превышении лимита большие правила заменяются на указатели путей, а крупные персонализации исключаются автоматически.`
    },
    {
        pattern: /^([\d\s\u00a0\xa0,.]+)\s*\/\s*([\d\s\u00a0\xa0,.]+)\s*tokens\s*(\(.*?\))?$/i,
        replace: (m) => `${m[1].trim()} / ${m[2].trim()} токенов${m[3] ? ' ' + m[3] : ''}`
    },
    {
        pattern: /^([\d\s\u00a0\xa0,.]+)\s*tokens\s*(\(.*?\))?$/i,
        replace: (m) => `${m[1].trim()} токенов${m[2] ? ' ' + m[2] : ''}`
    },
    {
        pattern: /^Previous\s+Pane\s+Tab\s*$/i,
        replace: () => `Предыдущая вкладка панели`
    },
    {
        pattern: /^Next\s+Pane\s+Tab\s*$/i,
        replace: () => `Следующая вкладка панели`
    },
    {
        pattern: /^Add\s+to\s+Chat\s*\/\s*Quote\s*$/i,
        replace: () => `Добавить в чат / Цитировать`
    },
    {
        pattern: /^Toggle\s+Terminal\s*$/i,
        replace: () => `Показать/скрыть терминал`
    },
    {
        pattern: /^Show\s+Less\s*$/i,
        replace: () => `Свернуть`
    },
    {
        pattern: /^Show\s+More\s*$/i,
        replace: () => `Развернуть`
    },
    {
        pattern: /^Authenticate\s*$/i,
        replace: () => `Авторизоваться`
    },
    {
        pattern: /^Plugins\s*$/i,
        replace: () => `Плагины`
    },
    {
        pattern: /^Error:\s*calling\s*"initialize":\s*sending\s*"initialize":\s*Unauthorized\s*$/i,
        replace: () => `Ошибка: вызов "initialize": отправка "initialize": Не авторизовано`
    },
    {
        pattern: /^Error:\s*calling\s*"initialize":\s*sending\s*"initialize":\s*(.*)$/i,
        replace: (m) => `Ошибка: вызов "initialize": отправка "initialize": ${m[1]}`
    },
    {
        pattern: /^Uploads\s*$/i,
        replace: () => `Загрузки`
    },
    {
        pattern: /^Upload\s*$/i,
        replace: () => `Загрузить`
    },
    {
        pattern: /^No\s+subagents\s*$/i,
        replace: () => `Нет субагентов`
    },
    {
        pattern: /^Subagents\s*$/i,
        replace: () => `Субагенты`
    },
    {
        pattern: /^Subagent\s*$/i,
        replace: () => `Субагент`
    },
    {
        pattern: /^Uncommitted\s*$/i,
        replace: () => `Не зафиксировано`
    },
    {
        pattern: /^Staged\s+index\s+changes\s+and\s+working\s+tree\s+changes\s*$/i,
        replace: () => `Изменения в индексе и рабочем дереве`
    },
    {
        pattern: /^Branch\s+(.*)$/i,
        replace: (m) => `Ветка ${m[1]}`
    },
    {
        pattern: /^All\s+changes\s+since\s+(.*)$/i,
        replace: (m) => `Все изменения относительно ${m[1]}`
    },
    {
        pattern: /^Agent\s+Edits\s*$/i,
        replace: () => `Правки агента`
    },
    {
        pattern: /^Files\s+modified\s+by\s+the\s+agent.*in this conversation/i,
        replace: () => `Файлы, измененные агентом в этом диалоге`
    },
    {
        pattern: /^Files\s+modified\s+by\s+the\s+agent.*when not in a project/i,
        replace: () => `Файлы, измененные агентом вне проекта`
    },
    {
        pattern: /^Files\s+modified\s+by\s+the\s+agent.*в этом диалоге/i,
        replace: () => `Файлы, измененные агентом в этом диалоге`
    },
    {
        pattern: /^Files\s+modified\s+by\s+the\s+agent\s*$/i,
        replace: () => `Файлы, измененные агентом`
    },
    {
        // "Skills & Rules 9 >" / "Skills & Rules 9" / "Skills & Rules" / "Skills & Rules >"
        pattern: /^Skills\s*&\s*Rules(?:\s+(\d+))?(?:\s*([>˅^v]))?$/i,
        replace: (match) => "Навыки и правила" + (match[1] ? " " + match[1] : "") + (match[2] ? " " + match[2] : "")
    },
    {
        // "Custom Agents 0 ˅" / "Custom Agents 0" / "Custom Agents" / "Custom Agents ˅"
        pattern: /^Custom\s+Agents(?:\s+(\d+))?(?:\s*([>˅^v]))?$/i,
        replace: (match) => "Пользовательские агенты" + (match[1] ? " " + match[1] : "") + (match[2] ? " " + match[2] : "")
    },
    {
        // "MCP Servers 2 ˅" / "MCP Servers 2" / "MCP Servers" / "MCP Servers ˅"
        pattern: /^MCP\s+Servers(?:\s+(\d+))?(?:\s*([>˅^v]))?$/i,
        replace: (match) => "MCP-серверы" + (match[1] ? " " + match[1] : "") + (match[2] ? " " + match[2] : "")
    },
    {
        // "Commands ˅" / "Commands >" / "Commands"
        pattern: /^Commands(?:\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => "Команды" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Your plan's baseline quota will refresh on Oct 8, 2026, 12:00 AM. To continue using this model now, enable AI Credit overages."
        pattern: /^Your plan's baseline quota will refresh on (.+?),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\. To continue using this model now, enable AI Credit overages\.?$/i,
        replace: (match) => {
            const months = { jan: 'янв.', feb: 'февр.', mar: 'марта', apr: 'апр.', may: 'мая', jun: 'июня', jul: 'июля', aug: 'авг.', sep: 'сент.', oct: 'окт.', nov: 'нояб.', dec: 'дек.' };
            const date = match[1].replace(/([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})?/, (m, mon, day, year) => {
                const ruMon = months[mon.toLowerCase()] || mon;
                return day + ' ' + ruMon + (year ? ' ' + year + ' г.' : '');
            });
            return `Базовая квота вашего тарифа обновится ${date} в ${match[2]}. Чтобы продолжить использование этой модели сейчас, включите оплату перерасхода (AI Credit overages).`;
        }
    },
    {
        // General fallback for quota refresh full sentence
        pattern: /^Your plan's baseline quota will refresh on (.*?)\. To continue using this model now, enable AI Credit overages\.?$/i,
        replace: (match) => `Базовая квота вашего тарифа обновится ${match[1]}. Чтобы продолжить использование этой модели сейчас, включите оплату перерасхода (AI Credit overages).`
    },
    {
        // "Your plan's baseline quota will refresh on Oct 8, 2026, 12:00 AM."
        pattern: /^Your plan's baseline quota will refresh on (.+?),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\.?$/i,
        replace: (match) => {
            const months = { jan: 'янв.', feb: 'февр.', mar: 'марта', apr: 'апр.', may: 'мая', jun: 'июня', jul: 'июля', aug: 'авг.', sep: 'сент.', oct: 'окт.', nov: 'нояб.', dec: 'дек.' };
            const date = match[1].replace(/([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})?/, (m, mon, day, year) => {
                const ruMon = months[mon.toLowerCase()] || mon;
                return day + ' ' + ruMon + (year ? ' ' + year + ' г.' : '');
            });
            return `Базовая квота вашего тарифа обновится ${date} в ${match[2]}.`;
        }
    },
    {
        // "To continue using this model now, enable AI Credit overages."
        pattern: /^To continue using this model now, enable AI Credit overages\.?$/i,
        replace: () => "Чтобы продолжить использование этой модели сейчас, включите оплату перерасхода (AI Credit overages)."
    },
    {
        pattern: /^(?:restore_page\s+)?Reopen\s+Closed\s+Tab$/i,
        replace: () => "Восстановить закрытую вкладку"
    },
    {
        pattern: /^Move\s+Conversation\s+Up$/i,
        replace: () => "Переместить диалог вверх"
    },
    {
        pattern: /^Move\s+Conversation\s+Down$/i,
        replace: () => "Переместить диалог вниз"
    },
    {
        pattern: /^Permission\s+Presets?$/i,
        replace: (m) => /s$/i.test(m[0]) ? "Профили разрешений" : "Профиль разрешений"
    },
    {
        pattern: /^Built-in\s+Browser$/i,
        replace: () => "Встроенный браузер"
    },
    {
        pattern: /^External\s+Browser$/i,
        replace: () => "Внешний браузер"
    },
    {
        pattern: /^Open\s+Links\s+In$/i,
        replace: () => "Открывать ссылки в"
    },
    {
        pattern: /^Configure\s+link\s+opening\s+and\s+built-in\s+browser\s+preferences\.?$/i,
        replace: () => "Настройка открытия ссылок и параметров встроенного браузера."
    },
    {
        pattern: /^Choose\s+where\s+links\s+open\s+by\s+default\s+when\s+clicked\.?$/i,
        replace: () => "Выберите, где по умолчанию открывать ссылки при нажатии."
    },
    {
        pattern: /^Local\s+Checkout(?:\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40\u2303]|[^a-zA-Z0-9\s]+))?$/i,
        replace: (match) => "Локальная рабочая копия" + (match[1] ? " " + match[1].trim() : "")
    },
    {
        pattern: /^New\s+Worktree$/i,
        replace: () => "Новое рабочее дерево"
    },
    {
        pattern: /^Featured$/i,
        replace: () => "Рекомендуемое"
    },
    {
        pattern: /^Details$/i,
        replace: () => "Подробнее"
    },
    {
        pattern: /^Developer$/i,
        replace: () => "Разработчик"
    },
    {
        pattern: /^Website(?:\s*([↗⧉]|[^a-zA-Z0-9\s]+))?$/i,
        replace: (match) => "Веб-сайт" + (match[1] ? " " + match[1].trim() : "")
    },
    {
        pattern: /^Repository(?:\s*([↗⧉]|[^a-zA-Z0-9\s]+))?$/i,
        replace: (match) => "Репозиторий" + (match[1] ? " " + match[1].trim() : "")
    },
    {
        pattern: /^Connect\s+Antigravity\s+to\s+your\s+Notion\s+workspace\s+with\s+the\s+Notion\s+MCP\s+server.*$/i,
        replace: (match) => /\.\.\.|…/.test(match[0])
            ? "Подключите Antigravity к вашему рабочему пространству Notion с помощью MCP-сервера Notion, а также навыков для исследований, документации, подготовки к встречам, спецификаций, трекеров и..."
            : "Подключите Antigravity к вашему рабочему пространству Notion с помощью MCP-сервера Notion, а также навыков для исследований, документации, подготовки к встречам, спецификаций, трекеров и обновлений проектов."
    },
    {
        pattern: /^The\s+product\s+development\s+system\s+for\s+teams\s+and\s+agents.*$/i,
        replace: () => "Система разработки продуктов для команд и агентов. Управляйте задачами, проектами и документами в вашем рабочем пространстве Linear прямо из Antigravity."
    },
    {
        pattern: /^Turn\s+Figma\s+designs\s+into\s+production\s+code.*$/i,
        replace: () => "Превращайте макеты Figma в готовый код, связывайте компоненты через Code Connect и создавайте или редактируйте файлы Figma в Antigravity."
    },
    {
        pattern: /^(?:Create|Создать|Создано),\s*edit,\s*review,\s*resize,\s*and\s+brand-check\s+Canva\s+designs.*$/i,
        replace: () => "Создавайте, редактируйте, проверяйте, меняйте размер и контролируйте соответствие бренду дизайнов Canva с помощью MCP-сервера Canva."
    },
    {
        pattern: /^Connect\s+Antigravity\s+to\s+Dropbox\s+to\s+search.*$/i,
        replace: () => "Подключите Antigravity к Dropbox для поиска, просмотра, суммаризации, обмена, сбора загрузок, организации папок и очистки файлов с подтверждением операций записи."
    },
    {
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+on\s+Netlify:.*$/i,
        replace: () => "Собирайте и развертывайте на Netlify: функции, edge-функции, хранилища, базы данных, авторизацию, формы, CDN изображений, кэширование и AI Gateway вместе с MCP-сервером Netlify."
    },
    {
        pattern: /^Deploy,\s*configure,\s*monitor,\s*and\s+troubleshoot\s+apps,\s*databases,\s*and\s+infrastructure\s+on\s+Railway.*$/i,
        replace: () => "Развертывайте, настраивайте, отслеживайте и отлаживайте приложения, базы данных и инфраструктуру в Railway из Antigravity с помощью навыка агента и MCP-сервера Railway."
    },
    {
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+web\s+apps\s+and\s+AI\s+agents\s+on\s+Vercel.*$/i,
        replace: () => "Создавайте и развертывайте веб-приложения и ИИ-агентов на Vercel с навыками для Next.js, AI SDK и облачных сервисов, а также официальным MCP-сервером Vercel."
    },
    {
        pattern: /^Add\s+Auth0\s+authentication\s+to\s+any\s+app:.*$/i,
        replace: () => "Добавляйте аутентификацию Auth0 в любое приложение: вход, MFA, SSO, организации, RBAC, кастомные домены и брендинг. Отлаживайте ошибки авторизации и мигрируйте от других провайдеров."
    },
    {
        pattern: /^Databricks\s+skills\s+for\s+the\s+CLI,.*$/i,
        replace: () => "Навыки Databricks для CLI, приложений, Lakebase, обслуживания моделей, задач Lakeflow, декларативных пайплайнов Spark, пакетов автоматизации (DAB) и миграции на serverless."
    },
    {
        pattern: /^Give\s+your\s+agent\s+a\s+real\s+browser:.*$/i,
        replace: () => "Дайте вашему агенту полноценный браузер: переходите по страницам, нажимайте, вводите текст, делайте скриншоты и извлекайте данные с любых сайтов локально или в облаке Browserbase."
    }
];
















let translationObserver = null;
let isTranslating = false;

function shouldIgnore(node) {
    if (!node) return true;
    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        return false;
    }

    const textVal = normalizeText(node.nodeValue || node.textContent || '').toLowerCase();
    const ariaVal = normalizeText(node.getAttribute && node.getAttribute('aria-label') || '').toLowerCase();
    const titleVal = normalizeText(node.getAttribute && node.getAttribute('title') || '').toLowerCase();
    const tooltipVal = normalizeText(node.getAttribute && node.getAttribute('data-tooltip') || '').toLowerCase();
    const placeholderVal = normalizeText(node.getAttribute && node.getAttribute('placeholder') || '').toLowerCase();

    const parentText = (node.parentElement ? (node.parentElement.textContent || '') : '').toLowerCase();
    const grandParentText = (node.parentElement && node.parentElement.parentElement ? (node.parentElement.parentElement.textContent || '') : '').toLowerCase();
    const fullContext = parentText + ' ' + grandParentText;

    const isTroubleshootingSentence = (
        fullContext.includes('troubleshooting_guide') ||
        fullContext.includes('troubleshooting guide') ||
        fullContext.includes('руководстве по устранению неполадок') ||
        fullContext.includes('подробнее см. в')
    );

    const isMatchSpecial = (val) => {
        if (!val) return false;
        return (
            val === 'see plans' ||
            val === 'running' ||
            val === 'run' ||
            val === 'ran' ||
            val === 'auto (preview)' ||
            val.startsWith('automatically decide') ||
            val.startsWith('enter tool name') ||
            val === 'give feedback' ||
            val.startsWith('give feedback') ||
            val === 'extensions' ||
            val.startsWith('no extensions available') ||
            val === 'customize sections' ||
            val === 'goals' ||
            val === 'documents' ||
            val === 'links' ||
            val === 'modified files' ||
            val.includes('tabs, files, extensions') ||
            val === 'open file' ||
            val === 'open files' ||
            val === 'open folder' ||
            val === 'open folders' ||
            val === 'select folder(s)' ||
            val === 'select folder' ||
            val === 'select folders' ||
            val === 'select file(s)' ||
            val.startsWith('проверка ') ||
            val === 'sound' ||
            val === 'volume' ||
            val.startsWith('enable notifications for agent') ||
            val.startsWith('enable sounds for agent') ||
            val.startsWith('manage your notification preferences') ||
            val.startsWith('show system notifications') ||
            val.startsWith('play a sound when your action') ||
            val.startsWith('set the volume of agent') ||
            val.includes('for commands') ||
            val.includes('conversations with') ||
            val.includes('(≡ menu)') ||
            val.includes('menu)') ||
            val === 'created' ||
            val.startsWith('created ') ||
            val === 'creating' ||
            val.startsWith('creating ') ||
            val === 'canceled' ||
            val === 'cancelled' ||
            val.startsWith('canceled ') ||
            val.startsWith('cancelled ') ||
            val === 'completed' ||
            val.startsWith('plan carefully') ||
            val.startsWith('invoke the boost') ||
            val.startsWith('compact the conversation now') ||
            val.startsWith('сжать контекст the conversation now') ||
            val.startsWith('assign github coding agent') ||
            val.startsWith('create an issue for a problem') ||
            val.startsWith('создать an issue for a problem') ||
            val.startsWith('создано an issue for a problem') ||
            val.startsWith('ask a quick question') ||
            val.startsWith('run until the specified') ||
            val.startsWith('run an instruction') ||
            val.startsWith('invoke a browser') ||
            val.startsWith('interview me to align') ||
            val.startsWith('invoke a team') ||
            val.startsWith('reflect on recent') ||
            val.startsWith('uses chrome devtools') ||
            val.startsWith('interactive guide to design') ||
            val.startsWith('guides debugging') ||
            val.startsWith('diagnoses and resolves') ||
            val.startsWith('search tool for modern') ||
            val.startsWith('поиск tool for modern') ||
            val.startsWith('search tool') ||
            val.startsWith('поиск tool') ||
            val.startsWith('build and publish chrome extensions') ||
            val.startsWith('сборка and publish chrome extensions') ||
            val.startsWith('comprehensive guide and reference') ||
            val.startsWith('provides a comprehensive guide') ||
            val.startsWith('how to render rich') ||
            val.startsWith('design, implement, and debug') ||
            val.startsWith('automatically migrate legacy') ||
            val.startsWith('guidelines for interacting with github') ||
            val.startsWith('how to manage and create plugins') ||
            val.startsWith('how to write and run a dynamic workflow') ||
            val.startsWith('discover ui plugin panels') ||
            val === 'enable overages' ||
            val.startsWith('enable overages') ||
            val.startsWith('see plans') ||
            val.startsWith('explored') ||
            val === 'sort by' ||
            val === 'sort by:' ||
            val === 'last updated' ||
            val === 'last prompt' ||
            val === 'custom order' ||
            val.includes('subagent running') ||
            val.includes('subagents running') ||
            val.startsWith('lines ') ||
            val.startsWith('whitelist in') ||
            val.startsWith('regexTranslations for') ||
            val.startsWith('line ') ||
            val.startsWith('ran ') ||
            val.startsWith('run ') ||
            val.startsWith('running ') ||
            val === 'view' ||
            val === 'viewing' ||
            val.startsWith('view ') ||
            val.startsWith('viewing ') ||
            val.startsWith('test ') ||
            val === 'edited' ||
            val.startsWith('edited ') ||
            val === 'editing' ||
            val.startsWith('editing ') ||
            val === 'updated' ||
            val.startsWith('updated ') ||
            val === 'updating' ||
            val.startsWith('updating ') ||
            val.startsWith('update ') ||
            val === 'build' ||
            val === 'building' ||
            val.startsWith('build ') ||
            val.startsWith('building ') ||
            val.startsWith('message from') ||
            val === 'media' ||
            val === 'folder' ||
            val === 'mentions' ||
            val === 'actions' ||
            val === 'compacting' ||
            val.startsWith('compacting') ||
            val === 'mark all as read' ||
            val.startsWith('mark all as read') ||
            val.startsWith('this page is going away soon') ||
            val.startsWith('toggle maximize auxiliary pane') ||
            val.startsWith('toggle overview panel') ||
            val === 'overview panel' ||
            val === 'disable' ||
            val === 'remove' ||
            val === 'add mcp server' ||
            val === 'copy config file path' ||
            val.startsWith('see ') ||
            val.startsWith('+ see ') ||
            val.startsWith('core tools and knowledge') ||
            val.startsWith('prototype, build') ||
            val.startsWith('integration skill') ||
            val.startsWith('official plugin for dart') ||
            val.startsWith('this plugin provides') ||
            val.startsWith('google cloud guidance') ||
            val === 'parallel search' ||
            val === 'поиск parallel' ||
            val === 'search parallel' ||
            val === 'google cloud app optimize' ||
            val.startsWith('the app optimize') ||
            val.startsWith('search your google cloud') ||
            val.startsWith('поиск your google cloud') ||
            val.startsWith('search and reference') ||
            val.startsWith('поиск and reference') ||
            val.startsWith('search the live web') ||
            val.startsWith('поиск the live web') ||
            val.startsWith('search and retrieve') ||
            val.startsWith('поиск and retrieve') ||
            val === 'new tab' ||
            val === '+ new tab' ||
            val.endsWith('new tab') ||
            val.includes('auxiliary pane') ||
            val.includes('toggle maximize') ||
            val.includes('mark this conversation') ||
            val.includes('as unread') ||
            val.includes('in the top left') ||
            val.includes('in the sidebar') ||
            val.startsWith('sincpro') ||
            val.startsWith('clear ') ||
            val.startsWith('clearing ') ||
            val.startsWith('push ') ||
            val.startsWith('pushing ') ||
            val === 'cancel task' ||
            val === 'stop recording' ||
            val === 'start recording' ||
            val === 'use global settings' ||
            val.includes('overrides your global permission') ||
            val.includes('every command requires approval') ||
            val.includes('ask before sensitive operations') ||
            val.includes('without restrictions') ||
            val.startsWith('project настройки') ||
            val.startsWith('project settings') ||
            val === 'task log' ||
            val.includes('task log') ||
            val.startsWith('killed task') ||
            val === 'killed task' ||
            val === 'checked task' ||
            val.startsWith('approve ') ||
            val.startsWith('approved ') ||
            val.startsWith('execute ') ||
            val.startsWith('executed ') ||
            val === 'commands' ||
            val.startsWith('commands ') ||
            val === 'close tab' ||
            val.startsWith('split conversation') ||
            val === 'open conversation history' ||
            val === 'collapse all folders' ||
            val === 'expand all folders' ||
            val === 'open keyboard shortcuts' ||
            val === 'download diagnostics' ||
            val === 'toggle between light/dark themes' ||
            val.includes('aux pane') ||
            val.includes('terminal') ||
            val.includes('conversation') ||
            val === 'open command palette' ||
            val === 'open project picker' ||
            val === 'cut' ||
            val === 'copy' ||
            val === 'copied' ||
            val === 'copied!' ||
            val === 'paste' ||
            val === 'paste as plain text' ||
            val === 'select all' ||
            val === 'undo' ||
            val === 'redo' ||
            val === 'delete' ||
            val === 'copy code' ||
            val === 'copy all' ||
            val === 'copy message' ||
            val.startsWith('copy ') ||
            val.startsWith('error') ||
            val.startsWith('agent execution') ||
            val.startsWith('our servers') ||
            val.startsWith('model unavailable') ||
            val.startsWith('worked for') ||
            val.startsWith('working') ||
            val.startsWith('thinking') ||
            val.startsWith('see our troubleshooting') ||
            val === 'troubleshooting_guide' ||
            val === 'troubleshooting guide' ||
            val === 'good response' ||
            val === 'bad response' ||
            val.startsWith('good response') ||
            val.startsWith('bad response') ||
            val.includes('file changed') ||
            val.includes('files changed') ||
            val.endsWith(' finished') ||
            val === 'finished' ||
            val.includes('architect session') ||
            val.startsWith('error from') ||
            (val.startsWith('the subagent') && (val.includes('encountered an error') || val.includes('stopped or failed'))) ||
            val.startsWith('failed_precondition') ||
            val.includes('user location is not supported') ||
            val === 'now' ||
            val === 'just now' ||
            val === 'thinking' ||
            val.startsWith('thinking ') ||
            val.startsWith('thought ') ||
            (val.startsWith('for ') && /\b\d+\s*(s|sec|m|min|h|d)\b/i.test(val)) ||
            val.startsWith('inspecting') ||
            val.startsWith('extracting') ||
            val.startsWith('listing') ||
            val.startsWith('reading') ||
            val.startsWith('testing') ||
            val.startsWith('searching') ||
            val.startsWith('checking') ||
            val.startsWith('updating') ||
            val.startsWith('upgrading') ||
            val.startsWith('viewing') ||
            val.startsWith('building') ||
            val.startsWith('message from') ||
            val.startsWith('github actions') ||
            val.includes('github actions run') ||
            val.startsWith('reverting') ||
            val.startsWith('downloading') ||
            val.startsWith('untracked') ||
            val.startsWith('consilium') ||
            val.startsWith('schema') ||
            val.startsWith('contract') ||
            val.startsWith('validator') ||
            val.includes('validator and config getter') ||
            val.startsWith('dispatch_cli') ||
            val.startsWith('git pickaxe') ||
            val.endsWith(' stat') ||
            val.endsWith(' help') ||
            val.endsWith(' body') ||
            val.endsWith(' toolchain') ||
            val.includes('search app.asar') ||
            val.includes('search thinking for') ||
            val.startsWith('thought for') ||
            val.startsWith('thinking for') ||
            val.startsWith('exploring') ||
            val === 'analyzed' ||
            val.startsWith('analyzed ') ||
            val.startsWith('automations') ||
            val === 'marketplace' ||
            val.includes('marketplace') ||
            val === 'maximize pane' ||
            val === 'restore pane' ||
            val === 'minimize pane' ||
            val === 'close pane' ||
            val === 'workspace' ||
            val === 'workspaces' ||
            val === 'local checkout' ||
            val.startsWith('local checkout') ||
            val === 'new worktree' ||
            val === 'worktree' ||
            val === 'worktrees' ||
            val === 'featured' ||
            val === 'details' ||
            val.includes('exited with code') ||
            val.includes('завершено с кодом') ||
            val.startsWith('searched marketplace') ||
            val.startsWith('searching marketplace') ||
            val.startsWith('fix quote escaping') ||
            val.startsWith('resize this canva') ||
            val.startsWith('review this canva') ||
            val.startsWith('check this canva') ||
            val.startsWith('проверка this canva') ||
            val.startsWith('check a canva') ||
            val.startsWith('проверка a canva') ||
            val.startsWith('bulk-create canva') ||
            val.startsWith('review a canva') ||
            val.startsWith('read a canva') ||
            val.startsWith('чтение a canva') ||
            val.startsWith('make edits to an existing canva') ||
            val.startsWith('implement reviewer feedback') ||
            val.startsWith('resize a canva') ||
            val.startsWith('implement this figma') ||
            val.startsWith('connect my button') ||
            val.startsWith('create a figma') ||
            val.startsWith('find home screen examples') ||
            val.startsWith('compare how ai tools') ||
            val.startsWith('review my paywall') ||
            val.startsWith('tells your agent what mobbin') ||
            val.startsWith('makes every report a mobbin') ||
            val.startsWith('redesign any screen') ||
            val.startsWith('gets better results from every mobbin') ||
            val.startsWith('help me implement [jira-123]') ||
            val.startsWith('investigate [jira-123]') ||
            val.startsWith('review my current changes against [jira-123]') ||
            val.startsWith('install, upgrade, authenticate, or repair') ||
            val.startsWith('find and summarize the q4') ||
            val.startsWith('create a shared link for the launch') ||
            val.startsWith('review duplicate exports') ||
            val === 'dropbox for google antigravity' ||
            val.startsWith('find, summarize, share, collect uploads') ||
            val.startsWith('clean up dropbox content') ||
            val.startsWith('create, inspect, and manage dropbox') ||
            val.startsWith('find dropbox files') ||
            val.startsWith('inspect a dropbox') ||
            val.startsWith('проверка a dropbox') ||
            val.startsWith('organize dropbox files') ||
            val.startsWith('share dropbox files') ||
            val.startsWith('show my assigned linear') ||
            val.startsWith('summarize recent updates to my linear') ||
            val.startsWith('find linear issues') ||
            val.startsWith('create a linear issue') ||
            val.startsWith('add a progress update') ||
            val === 'linear for antigravity' ||
            val === 'bring your linear workspace into antigravity' ||
            val.startsWith('find issues, manage projects') ||
            val.startsWith('connect your code to the work') ||
            val.startsWith('the linear plugin connects') ||
            val === 'the plugin uses' ||
            val.includes('hosted mcp server') ||
            val.includes('sign in with your linear account') ||
            val === '1. install from the marketplace' ||
            val === 'in antigravity, find' ||
            val === 'in the marketplace, and click' ||
            val === '2. connect your linear account' ||
            val.startsWith('installing the plugin is the first step') ||
            val.endsWith('on macos).') ||
            val === '2. click' ||
            val === 'click' ||
            val === 'install' ||
            val === 'customizations → plugins' ||
            val === 'agent settings → customizations' ||
            val.startsWith('sign in to linear in your browser') ||
            val.startsWith('copy the authorization code shown') ||
            val.startsWith('return to antigravity, paste the code') ||
            val.startsWith('install from the marketplace') ||
            val.startsWith('connect your linear account') ||
            val === 'try it out' ||
            val.includes('linear mcp server') ||
            val.startsWith('3. sign in to linear') ||
            val.startsWith('4. copy the authorization code') ||
            val.startsWith('5. return to antigravity') ||
            val.startsWith('paste the code into settings') ||
            val === '3. try it out' ||
            val === 'ask antigravity:' ||
            val.startsWith('once antigravity retrieves') ||
            val === 'troubleshooting' ||
            val === 'installed, but linear tools are unavailable' ||
            val.startsWith('check that the plugin is enabled') ||
            val.startsWith('проверка that the plugin is enabled') ||
            val.startsWith('and authenticate its linear') ||
            val.startsWith('browser sign-in finished') ||
            val.startsWith('copy the authorization code from the browser') ||
            val.startsWith('this manual handoff is part of') ||
            val.includes('oauth flow') ||
            val === 'the connection stopped working' ||
            val.startsWith('refresh or reconnect the linear') ||
            val === 'linear mcp documentation' ||
            val === 'development' ||
            val.startsWith('for local installation, package details') ||
            val.startsWith('onboard me to monday') ||
            val.startsWith('create a monday.com') ||
            val.startsWith('bring monday.com into antigravity') ||
            val === 'what you get' ||
            val === 'monday.com mcp server' ||
            val.startsWith('- the official monday.com') ||
            val.startsWith('the official monday.com') ||
            val.startsWith('), with tools for boards') ||
            val.startsWith('- first-run setup:') ||
            val.startsWith('first-run setup:') ||
            val.startsWith('- create, update, assign') ||
            val.startsWith('create, update, assign') ||
            val.startsWith('- create, read, edit') ||
            val.startsWith('create, read, edit') ||
            val.startsWith('- create, edit and publish') ||
            val.startsWith('create, edit and publish') ||
            val === 'getting started' ||
            val.startsWith('1. install the plugin') ||
            val.startsWith('install the plugin from') ||
            val === 'in antigravity, or from the terminal:' ||
            val.startsWith('2. on first use, sign in to monday') ||
            val.startsWith('on first use, sign in to monday') ||
            val.startsWith('3. try a starter prompt') ||
            val.startsWith('try a starter prompt') ||
            val.startsWith('you only get access to what your monday') ||
            val === 'administration → ai governance → ai permissions' ||
            val === 'support' ||
            val === 'help:' ||
            val === 'contact:' ||
            val.startsWith('creates, reads, edits, and comments on monday') ||
            val.startsWith('creates and edits monday.com workforms') ||
            val.startsWith('first-run onboarding for people') ||
            val.startsWith('creates, updates, assigns, and manages items') ||
            val.startsWith('set up notion so you can') ||
            val.startsWith('turn this spec in notion') ||
            val.startsWith('write a weekly update for my project') ||
            val === 'notion plugin for antigravity' ||
            val === 'connects' ||
            val === 'to the' ||
            val === 'notion mcp server' ||
            val === 'and adds the' ||
            val === 'mcp client skills' ||
            val.startsWith('the first notion tool call') ||
            val === 'purpose' ||
            val === 'antigravity manifest' ||
            val === 'notion mcp server at' ||
            val === 'plugin icon' ||
            val === 'generated from' ||
            val === '. do not edit.' ||
            val === 'do not edit.' ||
            val === 'maintain' ||
            val === 'edit skills in' ||
            val === ', then run' ||
            val.startsWith('from the repository root and commit') ||
            val === 'and fails when' ||
            val === 'is out of date.' ||
            val.startsWith('check the plugin the way antigravity') ||
            val.startsWith('проверка the plugin the way antigravity') ||
            val.startsWith('turns scattered notes and recurring work') ||
            val.startsWith('captures conversations and supplied notes') ||
            val.startsWith('prepares meeting agendas') ||
            val.startsWith('researches questions across notion') ||
            val.startsWith('a guided setup flow to get the most') ||
            val.startsWith('converts notion product or technical') ||
            val.startsWith('produces evidence-based weekly project') ||
            val.startsWith('list my 5 most recently modified pandadoc') ||
            val.startsWith('список my 5 most recently modified pandadoc') ||
            val.startsWith('show my signing pipeline') ||
            val.startsWith('find unsigned documents') ||
            val.startsWith('create a document from a template') ||
            val.startsWith('build a register of signed') ||
            val.startsWith('сборка a register of signed') ||
            val.startsWith('track per-recipient signing progress') ||
            val.startsWith('sweep documents that are still out') ||
            val.startsWith('turn a signed quote or proposal') ||
            val.startsWith('send a standard nda to a counterparty') ||
            val.startsWith('generate an onboarding or employment') ||
            val.startsWith('build a priced pandadoc') ||
            val.startsWith('сборка a priced pandadoc') ||
            val.startsWith('digest of signed contracts approaching') ||
            val.startsWith('build a signing pipeline') ||
            val.startsWith('сборка a signing pipeline') ||
            val.startsWith('official trello plugin') ||
            val.startsWith('summarize the cards that are due') ||
            val.startsWith('create a trello card') ||
            val.startsWith('show what is in my trello') ||
            val.startsWith('**mandatory prerequisite**') ||
            val === 'background commands' ||
            val === 'background command' ||
            /^background\s+commands?(?:\s+\d+)?$/i.test(val) ||
            /^(?:\d+(?:\.\d+)?\s*(?:s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)\s*)+timer$/i.test(val) ||
            val === 'view split diff' ||
            val === 'просмотр split diff' ||
            val === 'split diff' ||
            val === 'view inline diff' ||
            val === 'просмотр inline diff' ||
            val === 'inline diff' ||
            val === 'view unified diff' ||
            val === 'просмотр unified diff' ||
            val === 'hide whitespace changes' ||
            val === 'show whitespace changes' ||
            /^\+?\s*\d+\s+more\s+lines?(?:\.{3}|…)?$/i.test(val) ||
            val === 'staged changes' ||
            val === 'unstaged changes' ||
            val === 'merge changes' ||
            val === 'untracked files' ||
            val === 'untracked changes' ||
            val === 'no file changes' ||
            val === 'no file changes.' ||
            val === 'no staged changes' ||
            val === 'no changes' ||
            val === 'changes' ||
            val === 'commit' ||
            val === 'commit...' ||
            val === 'amend' ||
            val === 'push' ||
            val === 'pull' ||
            val === 'fetch' ||
            val === 'sync' ||
            val === 'sync changes' ||
            val === 'commit & push' ||
            val === 'commit & sync' ||
            val === 'search' ||
            /^cancel\s*\(/i.test(val) ||
            val.startsWith('sends after agent finishes') ||
            val.startsWith('send after agent finishes') ||
            val.startsWith('queue message') ||
            val.startsWith('send immediately') ||
            val.startsWith('send now') ||
            val.startsWith('summarize this design doc') ||
            val.startsWith('draft a launch announcement') ||
            val.startsWith('reply to the open comments') ||
            val.startsWith('read and write your google docs') ||
            val.startsWith('чтение and write your google docs') ||
            val.startsWith('read, create, edit, and manage google docs') ||
            val.startsWith('чтение, create, edit, and manage google docs') ||
            /^tool\s+(arguments?|outputs?|inputs?|results?|parameters?|calls?)$/i.test(val) ||
            val === 'recent' ||
            val === 'recent:' ||
            val === 'trigger' ||
            val === 'triggers' ||
            val === 'time zone' ||
            val === 'timezone' ||
            val === 'this computer' ||
            val === 'this computer >' ||
            val === 'cloud' ||
            val === 'runs on' ||
            val === 'schedule' ||
            val === 'scheduled task' ||
            val === 'new scheduled task' ||
            val === 'add scheduled task' ||
            val === 'environment' ||
            val === 'execution identity' ||
            val === 'standalone' ||
            val === 'no projects created' ||
            val === 'select workspace' ||
            val === 'not cloned locally' ||
            val === 'skill' ||
            val === 'command' ||
            val === 'note' ||
            val === 'tip' ||
            val === 'ui extensions' ||
            val === 'accounts' ||
            val === 'hooks' ||
            val === 'context providers' ||
            val === 'empty message' ||
            val === 'unread' ||
            val === 'context usage' ||
            val === 'agents' ||
            val === 'not' ||
            val === 'free' ||
            val === 'use' ||
            val.includes('low-latency, bidirectional voice') ||
            val.includes('stateful multi-turn chat') ||
            val.includes('real-time audio/video streaming') ||
            val.includes('gemini omni flash') ||
            val.includes('myfirstapp') ||
            val.includes('samsung galaxy ultra') ||
            val.includes('ready to publish to google play') ||
            val.includes('android cli') ||
            val.includes('android virtual devices') ||
            val.includes('jetpack compose') ||
            val.includes('android gradle plugin') ||
            val.includes('android knowledge base') ||
            val.includes('android sdk') ||
            val.includes('device hub') ||
            val.startsWith('find the trends and outliers') ||
            val.startsWith('build a monthly budget tracker') ||
            val.startsWith('сборка a monthly budget tracker') ||
            val.startsWith('import this csv and turn it') ||
            val.startsWith('read, write, and format your google sheets') ||
            val.startsWith('чтение, write, and format your google sheets') ||
            val.startsWith('read, write, format, and manage google sheets') ||
            val.startsWith('чтение, write, format, and manage google sheets') ||
            val.startsWith('turn my project notes into a 10-slide') ||
            val.startsWith('add a summary slide and speaker notes') ||
            val.startsWith('export the final deck as a pdf') ||
            val.startsWith('build and polish your google slides') ||
            val.startsWith('сборка and polish your google slides') ||
            val.startsWith('read, create, and edit google slides') ||
            val.startsWith('чтение, create, and edit google slides') ||
            val.startsWith("find last quarter's budget") ||
            val.startsWith("move this week's design exports") ||
            val.startsWith('download the q3 report') ||
            val.startsWith('скачивание the q3 report') ||
            val.startsWith('find and organize your google drive') ||
            val.startsWith('browse, search, and manage google drive') ||
            val.startsWith('book 30 minutes with priya') ||
            val.startsWith("what's on my calendar today") ||
            val.startsWith("block focus time before friday") ||
            val.startsWith('run your google calendar') ||
            val.startsWith('запуск your google calendar') ||
            val.startsWith('read, create, and manage google calendar') ||
            val.startsWith('чтение, create, and manage google calendar') ||
            /^\d+\s+turns?$/i.test(val) ||
            /^(?:\d{1,2}:\d{2}(?:\s*[ap]m)?\s+)?\d+\s+(?:(?:image|file|video|audio|media|code)\s+)?attachments?$/i.test(val) ||
            val === 'developer' ||
            val === 'website' ||
            val === 'repository' ||
            val === 'design, creative & media' ||
            val.startsWith('design, creative, and media') ||
            val === 'productivity & project management' ||
            val.startsWith('plan work, track issues') ||
            val === 'cloud hosting & deployment' ||
            val.startsWith('deploy and host your apps') ||
            val === 'developer tools' ||
            val.startsWith('apis, services, and tools') ||
            val === 'business' ||
            val.startsWith('payments, crm, accounting') ||
            val.startsWith('google does not control the availability') ||
            val.startsWith('ai-powered code review') ||
            val.startsWith('up-to-date documentation lookup') ||
            val.startsWith('search intercom conversations') ||
            val.startsWith('поиск intercom conversations') ||
            val.startsWith('seo workflows on live semrush') ||
            val.startsWith('search and read your wispr flow') ||
            val.startsWith('поиск and read your wispr flow') ||
            val.startsWith('give your ai agent 600') ||
            val.startsWith('equip antigravity with specialized postman') ||
            val.startsWith('set up qodo') ||
            val.startsWith('connect zoho projects') ||
            val.startsWith('build and debug pipelines') ||
            val.startsWith('сборка and debug pipelines') ||
            val.startsWith('connect 9,000+ apps') ||
            val.startsWith('create, run and debug leapwork') ||
            val.startsWith('search the web and read any page') ||
            val.startsWith('поиск the web and read any page') ||
            val.startsWith('search the live web and fetch') ||
            val.startsWith('поиск the live web and fetch') ||
            val.startsWith('official supabase plugin') ||
            val.startsWith('create and send proposals') ||
            val.startsWith('plan and track work in monday') ||
            val === "what's included" ||
            val === 'whats included' ||
            val === 'mcp server' ||
            val === 'prerequisites' ||
            val === 'example prompts' ||
            val === 'resources' ||
            val === 'api key' ||
            val === 'api key:' ||
            val === 'sdk installation' ||
            val === 'sdk installation:' ||
            val.startsWith('equip your agent with current sdk') ||
            val.startsWith('so your agent can search and read') ||
            val.startsWith('environment variable with a key') ||
            val.startsWith('gemini api documentation') ||
            val === 'interactions api guide' ||
            val.startsWith('github repository') ||
            val.startsWith('build applications with the gemini') ||
            val.startsWith('сборка applications with the gemini') ||
            val.includes('stateful multi-turn chat script') ||
            val.includes('real-time voice agent using the gemini') ||
            val.includes('migrate my project from') ||
            val.includes('generate multi-speaker dialogue audio') ||
            val.startsWith('use this skill when writing code') ||
            val.startsWith('use this skill when building real-time') ||
            val.startsWith('use this skill for generative video') ||
            val.startsWith('investigate production issues with real dynatrace') ||
            val.startsWith('accept payments and grow your business') ||
            val.startsWith('build and deploy base44') ||
            val.startsWith('teamwork graph cli is atlassian') ||
            val.startsWith('manage your bigin crm') ||
            val.startsWith('official antigravity plugin for mongodb') ||
            val.startsWith('query your sentinelone') ||
            val.startsWith('packaged workflows for sca') ||
            val.startsWith('triage exabeam') ||
            val.startsWith('use the official crowdstrike') ||
            val.startsWith('use datadog directly') ||
            val.startsWith('connect antigravity to your notion') ||
            val.startsWith('the product development system for teams') ||
            val.startsWith('turn figma designs') ||
            val.startsWith('create, edit, review, resize') ||
            val.startsWith('connect antigravity to dropbox') ||
            val.startsWith('build and deploy on netlify') ||
            val.startsWith('deploy, configure, monitor') ||
            val.startsWith('build and deploy web apps') ||
            val.startsWith('add auth0 authentication') ||
            val.startsWith('databricks skills for') ||
            val.startsWith('give your agent a real browser') ||
            val === 'permission preset' ||
            val === 'permission presets' ||
            val === 'built-in browser' ||
            val === 'external browser' ||
            val === 'open links in' ||
            val.startsWith('configure link opening') ||
            val.startsWith('choose where links open') ||
            val === 'reopen closed tab' ||
            val === 'restore_page reopen closed tab' ||
            val === 'restore_page' ||
            val === 'move conversation up' ||
            val === 'move conversation down' ||
            val === '5h limit' ||
            /^\d+\s*(?:h|hr|hour|hours)[\s-]*limit$/i.test(val) ||
            val.endsWith('% left') ||
            val.endsWith('% remaining') ||
            val === 'create' ||
            val === 'create with prompt' ||
            val.startsWith('+ create') ||
            val.startsWith('create a ') ||
            val.startsWith('create an ') ||
            val === 'browse the marketplace' ||
            val.startsWith('find skills, agents') ||
            val.startsWith('no automations configured') ||
            val.includes('baseline quota') ||
            val.includes('ai credit overages') ||
            val.includes('skills & rules') ||
            val.includes('custom agents') ||
            val.includes('mcp servers') ||
            val.startsWith('all automations run') ||
            val === 'new automation' ||
            val === 'add automation' ||
            val === 'no custom agents yet' ||
            val === 'no custom agents yet.' ||
            (val.startsWith('search ') && val.includes('in transcript')) ||
            val.startsWith('checked task') ||
            val.startsWith('inspect ') ||
            val.startsWith('compare ') ||
            val.startsWith('restore ') ||
            val.startsWith('check ') ||
            val.startsWith('select project') ||
            val.startsWith('leaving soon') ||
            val.startsWith('notice') ||
            val.startsWith('exploring files') ||
            val.startsWith('verify ') ||
            val.startsWith('start using gemini') ||
            (isTroubleshootingSentence && (
                val === 'see our' ||
                val === 'see our:' ||
                val.startsWith('for more help') ||
                val.startsWith('see our')
            ))
        );
    };

    const isSpecialUiText = isMatchSpecial(textVal) || isMatchSpecial(ariaVal) || isMatchSpecial(titleVal) || isMatchSpecial(tooltipVal) || isMatchSpecial(placeholderVal);

    if (node.parentElement && typeof node.parentElement.closest === 'function') {
        if (node.parentElement.closest('#antigravity-topbar-controls, script, style, [contenteditable="true"], .view-lines, .view-line, .margin-view-overlays, .minimap, .xterm, .terminal-container')) {
            return true;
        }
    }
    
    let parent = node.parentElement;
    while (parent) {
        const tagName = parent.tagName;
        const className = parent.className || '';
        const isStringClass = typeof className === 'string';
        const lowerClass = isStringClass ? className.toLowerCase() : '';
        
        // 1. Абсолютный игнор (Hard Ignore) — элементы редактора кода, логов, терминала
        if (
            tagName === 'SCRIPT' || 
            tagName === 'STYLE' || 
            parent.contentEditable === 'true' ||
            (isStringClass && (
                lowerClass.includes('view-lines') || 
                lowerClass.includes('view-line') || 
                lowerClass.includes('minimap') || 
                lowerClass.includes('terminal-container') || 
                lowerClass.includes('xterm') ||
                (!isSpecialUiText && (
                    lowerClass.includes('monaco-editor') || 
                    lowerClass.includes('margin') || 
                    lowerClass.includes('terminal')
                ))
            ))
        ) {
            return true;
        }

        // Защищаем код внутри <code> от перевода, если это не специальный UI-текст
        if (tagName === 'CODE' && !isSpecialUiText) {
            return true;
        }

        if (tagName === 'PRE' && !isSpecialUiText) {
            return true;
        }
        
        // 2. Белый список (White List) для интерфейса настроек, кнопок и модалок.
        // Переводим их сразу, даже если они внутри контейнера чата!
        if (
            isSpecialUiText ||
            tagName === 'BUTTON' || 
            parent.getAttribute('role') === 'button' || 
            parent.getAttribute('role') === 'alert' || 
            parent.getAttribute('role') === 'status' || 
            parent.getAttribute('role') === 'toolbar' || 
            parent.getAttribute('role') === 'tooltip' || 
            tagName === 'A' ||
            (isStringClass && (
                lowerClass.includes('settings') || 
                lowerClass.includes('modal') || 
                lowerClass.includes('dialog') || 
                lowerClass.includes('popup') || 
                lowerClass.includes('dropdown') || 
                lowerClass.includes('select') || 
                lowerClass.includes('confirm') || 
                lowerClass.includes('action') || 
                lowerClass.includes('prompt') || 
                lowerClass.includes('card') || 
                lowerClass.includes('drawer') || 
                lowerClass.includes('panel') || 
                lowerClass.includes('overlay') || 
                lowerClass.includes('btn') || 
                lowerClass.includes('button') || 
                lowerClass.includes('popover') || 
                lowerClass.includes('switch') || 
                lowerClass.includes('toggle') || 
                lowerClass.includes('tab') || 
                lowerClass.includes('menu') || 
                lowerClass.includes('item') || 
                lowerClass.includes('error') || 
                lowerClass.includes('alert') || 
                lowerClass.includes('status') || 
                lowerClass.includes('callout') || 
                lowerClass.includes('banner') || 
                lowerClass.includes('badge') || 
                lowerClass.includes('notification') || 
                lowerClass.includes('warning') || 
                lowerClass.includes('accordion') || 
                lowerClass.includes('collapse') || 
                lowerClass.includes('progress') || 
                lowerClass.includes('copy') || 
                lowerClass.includes('clipboard') || 
                lowerClass.includes('toolbar') || 
                lowerClass.includes('tooltip') || 
                lowerClass.includes('feedback') || 
                lowerClass.includes('rating') || 
                lowerClass.includes('thumbs') || 
                lowerClass.includes('diff') || 
                lowerClass.includes('changes') || 
                lowerClass.includes('stat') || 
                lowerClass.includes('thought') || 
                lowerClass.includes('thinking') || 
                lowerClass.includes('subagent') || 
                lowerClass.includes('tool') || 
                lowerClass.includes('step') || 
                lowerClass.includes('header') || 
                lowerClass.includes('footer')
            ))
        ) {
            return false;
        }
        
        // 3. Мягкий игнор (Soft Ignore) — чат, сообщения
        if (isStringClass && (
            lowerClass.includes('message-content') || 
            lowerClass.includes('message-text') ||
            lowerClass.includes('chat-output') ||
            lowerClass.includes('markdown-body')
        )) {
            return true;
        }
        
        parent = parent.parentElement;
    }
    return false;
}

function isFileName(text, parent) {
    if (!text) return false;
    const trimmed = text.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    
    if (
        lowerTrimmed === 'troubleshooting_guide' || 
        lowerTrimmed === 'running' ||
        lowerTrimmed === 'run' ||
        lowerTrimmed === 'ran' ||
        lowerTrimmed === 'auto (preview)' ||
        lowerTrimmed.startsWith('automatically decide') ||
        lowerTrimmed.startsWith('enter tool name') ||
        lowerTrimmed === 'give feedback' ||
        lowerTrimmed.startsWith('give feedback') ||
        lowerTrimmed === 'extensions' ||
        lowerTrimmed.startsWith('no extensions available') ||
        lowerTrimmed === 'customize sections' ||
        lowerTrimmed === 'goals' ||
        lowerTrimmed === 'documents' ||
        lowerTrimmed === 'links' ||
        lowerTrimmed === 'modified files' ||
        lowerTrimmed.includes('tabs, files, extensions') ||
        lowerTrimmed === 'open file' ||
        lowerTrimmed === 'open files' ||
        lowerTrimmed === 'open folder' ||
        lowerTrimmed === 'open folders' ||
        lowerTrimmed === 'select folder(s)' ||
        lowerTrimmed === 'select folder' ||
        lowerTrimmed === 'select folders' ||
        lowerTrimmed === 'select file(s)' ||
        lowerTrimmed.startsWith('проверка ') ||
        lowerTrimmed === 'sound' ||
        lowerTrimmed === 'volume' ||
        lowerTrimmed.startsWith('enable notifications for agent') ||
        lowerTrimmed.startsWith('enable sounds for agent') ||
        lowerTrimmed.startsWith('manage your notification preferences') ||
        lowerTrimmed.startsWith('show system notifications') ||
        lowerTrimmed.startsWith('play a sound when your action') ||
        lowerTrimmed.startsWith('set the volume of agent') ||
        lowerTrimmed.includes('for commands') ||
        lowerTrimmed.includes('conversations with') ||
        lowerTrimmed.includes('(≡ menu)') ||
        lowerTrimmed.includes('menu)') ||
        lowerTrimmed === 'created' ||
        lowerTrimmed.startsWith('created ') ||
        lowerTrimmed === 'creating' ||
        lowerTrimmed.startsWith('creating ') ||
        lowerTrimmed === 'canceled' ||
        lowerTrimmed === 'cancelled' ||
        lowerTrimmed.startsWith('canceled ') ||
        lowerTrimmed.startsWith('cancelled ') ||
        lowerTrimmed === 'completed' ||
        lowerTrimmed.startsWith('plan carefully') ||
        lowerTrimmed.startsWith('invoke the boost') ||
        lowerTrimmed.startsWith('compact the conversation now') ||
        lowerTrimmed.startsWith('сжать контекст the conversation now') ||
        lowerTrimmed.startsWith('assign github coding agent') ||
        lowerTrimmed.startsWith('create an issue for a problem') ||
        lowerTrimmed.startsWith('создать an issue for a problem') ||
        lowerTrimmed.startsWith('создано an issue for a problem') ||
        lowerTrimmed.startsWith('ask a quick question') ||
        lowerTrimmed.startsWith('run until the specified') ||
        lowerTrimmed.startsWith('run an instruction') ||
        lowerTrimmed.startsWith('invoke a browser') ||
        lowerTrimmed.startsWith('interview me to align') ||
        lowerTrimmed.startsWith('invoke a team') ||
        lowerTrimmed.startsWith('reflect on recent') ||
        lowerTrimmed.startsWith('uses chrome devtools') ||
        lowerTrimmed.startsWith('interactive guide to design') ||
        lowerTrimmed.startsWith('guides debugging') ||
        lowerTrimmed.startsWith('diagnoses and resolves') ||
        lowerTrimmed.startsWith('search tool for modern') ||
        lowerTrimmed.startsWith('поиск tool for modern') ||
        lowerTrimmed.startsWith('search tool') ||
        lowerTrimmed.startsWith('поиск tool') ||
        lowerTrimmed.startsWith('build and publish chrome extensions') ||
        lowerTrimmed.startsWith('сборка and publish chrome extensions') ||
        lowerTrimmed.startsWith('comprehensive guide and reference') ||
        lowerTrimmed.startsWith('provides a comprehensive guide') ||
        lowerTrimmed.startsWith('how to render rich') ||
        lowerTrimmed.startsWith('design, implement, and debug') ||
        lowerTrimmed.startsWith('automatically migrate legacy') ||
        lowerTrimmed.startsWith('guidelines for interacting with github') ||
        lowerTrimmed.startsWith('how to manage and create plugins') ||
        lowerTrimmed.startsWith('how to write and run a dynamic workflow') ||
        lowerTrimmed.startsWith('discover ui plugin panels') ||
        lowerTrimmed.startsWith('working') || 
        lowerTrimmed.startsWith('thinking') || 
        lowerTrimmed.startsWith('worked for') || 
        lowerTrimmed.startsWith('copy') || 
        lowerTrimmed.startsWith('copied') || 
        lowerTrimmed === 'cut' || 
        lowerTrimmed === 'paste' || 
        lowerTrimmed === 'select all' || 
        lowerTrimmed.includes('file changed') || 
        lowerTrimmed.includes('files changed') || 
        lowerTrimmed.startsWith('good response') || 
        lowerTrimmed.startsWith('bad response') ||
        lowerTrimmed.endsWith(' finished') ||
        lowerTrimmed === 'finished' ||
        lowerTrimmed.includes('architect session') ||
        lowerTrimmed.startsWith('error from') ||
        lowerTrimmed.startsWith('the subagent') ||
        lowerTrimmed.startsWith('failed_precondition') ||
        lowerTrimmed.includes('user location is not supported') ||
        lowerTrimmed === 'now' ||
        lowerTrimmed === 'just now' ||
        lowerTrimmed.startsWith('thought for') ||
        lowerTrimmed.startsWith('thinking for') ||
        lowerTrimmed.startsWith('exploring') ||
        lowerTrimmed === 'analyzed' ||
        lowerTrimmed.startsWith('analyzed ') ||
        lowerTrimmed.startsWith('automations') ||
        lowerTrimmed === 'marketplace' ||
        lowerTrimmed.includes('marketplace') ||
        lowerTrimmed === 'maximize pane' ||
        lowerTrimmed === 'restore pane' ||
        lowerTrimmed === 'minimize pane' ||
        lowerTrimmed === 'close pane' ||
        lowerTrimmed === 'workspace' ||
        lowerTrimmed === 'workspaces' ||
        lowerTrimmed === 'local checkout' ||
        lowerTrimmed.startsWith('local checkout') ||
        lowerTrimmed === 'new worktree' ||
        lowerTrimmed === 'worktree' ||
        lowerTrimmed === 'worktrees' ||
        lowerTrimmed === 'featured' ||
        lowerTrimmed === 'details' ||
        lowerTrimmed.includes('exited with code') ||
        lowerTrimmed.includes('завершено с кодом') ||
        lowerTrimmed.startsWith('searched marketplace') ||
        lowerTrimmed.startsWith('searching marketplace') ||
        lowerTrimmed.startsWith('fix quote escaping') ||
        lowerTrimmed.startsWith('resize this canva') ||
        lowerTrimmed.startsWith('review this canva') ||
        lowerTrimmed.startsWith('check this canva') ||
        lowerTrimmed.startsWith('проверка this canva') ||
        lowerTrimmed.startsWith('check a canva') ||
        lowerTrimmed.startsWith('проверка a canva') ||
        lowerTrimmed.startsWith('bulk-create canva') ||
        lowerTrimmed.startsWith('review a canva') ||
        lowerTrimmed.startsWith('read a canva') ||
        lowerTrimmed.startsWith('чтение a canva') ||
        lowerTrimmed.startsWith('make edits to an existing canva') ||
        lowerTrimmed.startsWith('implement reviewer feedback') ||
        lowerTrimmed.startsWith('resize a canva') ||
        lowerTrimmed.startsWith('implement this figma') ||
        lowerTrimmed.startsWith('connect my button') ||
        lowerTrimmed.startsWith('create a figma') ||
        lowerTrimmed.startsWith('find home screen examples') ||
        lowerTrimmed.startsWith('compare how ai tools') ||
        lowerTrimmed.startsWith('review my paywall') ||
        lowerTrimmed.startsWith('tells your agent what mobbin') ||
        lowerTrimmed.startsWith('makes every report a mobbin') ||
        lowerTrimmed.startsWith('redesign any screen') ||
        lowerTrimmed.startsWith('gets better results from every mobbin') ||
        lowerTrimmed.startsWith('help me implement [jira-123]') ||
        lowerTrimmed.startsWith('investigate [jira-123]') ||
        lowerTrimmed.startsWith('review my current changes against [jira-123]') ||
        lowerTrimmed.startsWith('install, upgrade, authenticate, or repair') ||
        lowerTrimmed.startsWith('find and summarize the q4') ||
        lowerTrimmed.startsWith('create a shared link for the launch') ||
        lowerTrimmed.startsWith('review duplicate exports') ||
        lowerTrimmed === 'dropbox for google antigravity' ||
        lowerTrimmed.startsWith('find, summarize, share, collect uploads') ||
        lowerTrimmed.startsWith('clean up dropbox content') ||
        lowerTrimmed.startsWith('create, inspect, and manage dropbox') ||
        lowerTrimmed.startsWith('find dropbox files') ||
        lowerTrimmed.startsWith('inspect a dropbox') ||
        lowerTrimmed.startsWith('проверка a dropbox') ||
        lowerTrimmed.startsWith('organize dropbox files') ||
        lowerTrimmed.startsWith('share dropbox files') ||
        lowerTrimmed.startsWith('show my assigned linear') ||
        lowerTrimmed.startsWith('summarize recent updates to my linear') ||
        lowerTrimmed.startsWith('find linear issues') ||
        lowerTrimmed.startsWith('create a linear issue') ||
        lowerTrimmed.startsWith('add a progress update') ||
        lowerTrimmed === 'linear for antigravity' ||
        lowerTrimmed === 'bring your linear workspace into antigravity' ||
        lowerTrimmed.startsWith('find issues, manage projects') ||
        lowerTrimmed.startsWith('connect your code to the work') ||
        lowerTrimmed.startsWith('the linear plugin connects') ||
        lowerTrimmed === 'the plugin uses' ||
        lowerTrimmed.includes('hosted mcp server') ||
        lowerTrimmed.includes('sign in with your linear account') ||
        lowerTrimmed === '1. install from the marketplace' ||
        lowerTrimmed === 'in antigravity, find' ||
        lowerTrimmed === 'in the marketplace, and click' ||
        lowerTrimmed === '2. connect your linear account' ||
        lowerTrimmed.startsWith('installing the plugin is the first step') ||
        lowerTrimmed.endsWith('on macos).') ||
        lowerTrimmed === '2. click' ||
        lowerTrimmed === 'click' ||
        lowerTrimmed === 'install' ||
        lowerTrimmed === 'customizations → plugins' ||
        lowerTrimmed === 'agent settings → customizations' ||
        lowerTrimmed.startsWith('sign in to linear in your browser') ||
        lowerTrimmed.startsWith('copy the authorization code shown') ||
        lowerTrimmed.startsWith('return to antigravity, paste the code') ||
        lowerTrimmed.startsWith('install from the marketplace') ||
        lowerTrimmed.startsWith('connect your linear account') ||
        lowerTrimmed === 'try it out' ||
        lowerTrimmed.includes('linear mcp server') ||
        lowerTrimmed.startsWith('3. sign in to linear') ||
        lowerTrimmed.startsWith('4. copy the authorization code') ||
        lowerTrimmed.startsWith('5. return to antigravity') ||
        lowerTrimmed.startsWith('paste the code into settings') ||
        lowerTrimmed === '3. try it out' ||
        lowerTrimmed === 'ask antigravity:' ||
        lowerTrimmed.startsWith('once antigravity retrieves') ||
        lowerTrimmed === 'troubleshooting' ||
        lowerTrimmed === 'installed, but linear tools are unavailable' ||
        lowerTrimmed.startsWith('check that the plugin is enabled') ||
        lowerTrimmed.startsWith('проверка that the plugin is enabled') ||
        lowerTrimmed.startsWith('and authenticate its linear') ||
        lowerTrimmed.startsWith('browser sign-in finished') ||
        lowerTrimmed.startsWith('copy the authorization code from the browser') ||
        lowerTrimmed.startsWith('this manual handoff is part of') ||
        lowerTrimmed.includes('oauth flow') ||
        lowerTrimmed === 'the connection stopped working' ||
        lowerTrimmed.startsWith('refresh or reconnect the linear') ||
        lowerTrimmed === 'linear mcp documentation' ||
        lowerTrimmed === 'development' ||
        lowerTrimmed.startsWith('for local installation, package details') ||
        lowerTrimmed === 'developer' ||
        lowerTrimmed === 'website' ||
        lowerTrimmed === 'repository' ||
        lowerTrimmed === 'design, creative & media' ||
        lowerTrimmed.startsWith('design, creative, and media') ||
        lowerTrimmed === 'productivity & project management' ||
        lowerTrimmed.startsWith('plan work, track issues') ||
        lowerTrimmed === 'cloud hosting & deployment' ||
        lowerTrimmed.startsWith('deploy and host your apps') ||
        lowerTrimmed === 'developer tools' ||
        lowerTrimmed.startsWith('apis, services, and tools') ||
        lowerTrimmed === 'business' ||
        lowerTrimmed.startsWith('payments, crm, accounting') ||
        lowerTrimmed.startsWith('google does not control the availability') ||
        lowerTrimmed.startsWith('ai-powered code review') ||
        lowerTrimmed.startsWith('up-to-date documentation lookup') ||
        lowerTrimmed.startsWith('search intercom conversations') ||
        lowerTrimmed.startsWith('поиск intercom conversations') ||
        lowerTrimmed.startsWith('seo workflows on live semrush') ||
        lowerTrimmed.startsWith('search and read your wispr flow') ||
        lowerTrimmed.startsWith('поиск and read your wispr flow') ||
        lowerTrimmed.startsWith('give your ai agent 600') ||
        lowerTrimmed.startsWith('equip antigravity with specialized postman') ||
        lowerTrimmed.startsWith('set up qodo') ||
        lowerTrimmed.startsWith('connect zoho projects') ||
        lowerTrimmed.startsWith('build and debug pipelines') ||
        lowerTrimmed.startsWith('сборка and debug pipelines') ||
        lowerTrimmed.startsWith('connect 9,000+ apps') ||
        lowerTrimmed.startsWith('create, run and debug leapwork') ||
        lowerTrimmed.startsWith('search the web and read any page') ||
        lowerTrimmed.startsWith('поиск the web and read any page') ||
        lowerTrimmed.startsWith('search the live web and fetch') ||
        lowerTrimmed.startsWith('поиск the live web and fetch') ||
        lowerTrimmed.startsWith('official supabase plugin') ||
        lowerTrimmed.startsWith('create and send proposals') ||
        lowerTrimmed.startsWith('plan and track work in monday') ||
        lowerTrimmed.startsWith('onboard me to monday') ||
        lowerTrimmed.startsWith('create a monday.com') ||
        lowerTrimmed.startsWith('bring monday.com into antigravity') ||
        lowerTrimmed === 'what you get' ||
        lowerTrimmed === 'monday.com mcp server' ||
        lowerTrimmed.startsWith('- the official monday.com') ||
        lowerTrimmed.startsWith('the official monday.com') ||
        lowerTrimmed.startsWith('), with tools for boards') ||
        lowerTrimmed.startsWith('- first-run setup:') ||
        lowerTrimmed.startsWith('first-run setup:') ||
        lowerTrimmed.startsWith('- create, update, assign') ||
        lowerTrimmed.startsWith('create, update, assign') ||
        lowerTrimmed.startsWith('- create, read, edit') ||
        lowerTrimmed.startsWith('create, read, edit') ||
        lowerTrimmed.startsWith('- create, edit and publish') ||
        lowerTrimmed.startsWith('create, edit and publish') ||
        lowerTrimmed === 'getting started' ||
        lowerTrimmed.startsWith('1. install the plugin') ||
        lowerTrimmed.startsWith('install the plugin from') ||
        lowerTrimmed === 'in antigravity, or from the terminal:' ||
        lowerTrimmed.startsWith('2. on first use, sign in to monday') ||
        lowerTrimmed.startsWith('on first use, sign in to monday') ||
        lowerTrimmed.startsWith('3. try a starter prompt') ||
        lowerTrimmed.startsWith('try a starter prompt') ||
        lowerTrimmed.startsWith('you only get access to what your monday') ||
        lowerTrimmed === 'administration → ai governance → ai permissions' ||
        lowerTrimmed === 'support' ||
        lowerTrimmed === 'help:' ||
        lowerTrimmed === 'contact:' ||
        lowerTrimmed.startsWith('creates, reads, edits, and comments on monday') ||
        lowerTrimmed.startsWith('creates and edits monday.com workforms') ||
        lowerTrimmed.startsWith('first-run onboarding for people') ||
        lowerTrimmed.startsWith('creates, updates, assigns, and manages items') ||
        lowerTrimmed.startsWith('set up notion so you can') ||
        lowerTrimmed.startsWith('turn this spec in notion') ||
        lowerTrimmed.startsWith('write a weekly update for my project') ||
        lowerTrimmed === 'notion plugin for antigravity' ||
        lowerTrimmed === 'connects' ||
        lowerTrimmed === 'to the' ||
        lowerTrimmed === 'notion mcp server' ||
        lowerTrimmed === 'and adds the' ||
        lowerTrimmed === 'mcp client skills' ||
        lowerTrimmed.startsWith('the first notion tool call') ||
        lowerTrimmed === 'purpose' ||
        lowerTrimmed === 'antigravity manifest' ||
        lowerTrimmed === 'notion mcp server at' ||
        lowerTrimmed === 'plugin icon' ||
        lowerTrimmed === 'generated from' ||
        lowerTrimmed === '. do not edit.' ||
        lowerTrimmed === 'do not edit.' ||
        lowerTrimmed === 'maintain' ||
        lowerTrimmed === 'edit skills in' ||
        lowerTrimmed === ', then run' ||
        lowerTrimmed.startsWith('from the repository root and commit') ||
        lowerTrimmed === 'and fails when' ||
        lowerTrimmed === 'is out of date.' ||
        lowerTrimmed.startsWith('check the plugin the way antigravity') ||
        lowerTrimmed.startsWith('проверка the plugin the way antigravity') ||
        lowerTrimmed.startsWith('turns scattered notes and recurring work') ||
        lowerTrimmed.startsWith('captures conversations and supplied notes') ||
        lowerTrimmed.startsWith('prepares meeting agendas') ||
        lowerTrimmed.startsWith('researches questions across notion') ||
        lowerTrimmed.startsWith('a guided setup flow to get the most') ||
        lowerTrimmed.startsWith('converts notion product or technical') ||
        lowerTrimmed.startsWith('produces evidence-based weekly project') ||
        lowerTrimmed.startsWith('list my 5 most recently modified pandadoc') ||
        lowerTrimmed.startsWith('список my 5 most recently modified pandadoc') ||
        lowerTrimmed.startsWith('show my signing pipeline') ||
        lowerTrimmed.startsWith('find unsigned documents') ||
        lowerTrimmed.startsWith('create a document from a template') ||
        lowerTrimmed.startsWith('build a register of signed') ||
        lowerTrimmed.startsWith('сборка a register of signed') ||
        lowerTrimmed.startsWith('track per-recipient signing progress') ||
        lowerTrimmed.startsWith('sweep documents that are still out') ||
        lowerTrimmed.startsWith('turn a signed quote or proposal') ||
        lowerTrimmed.startsWith('send a standard nda to a counterparty') ||
        lowerTrimmed.startsWith('generate an onboarding or employment') ||
        lowerTrimmed.startsWith('build a priced pandadoc') ||
        lowerTrimmed.startsWith('сборка a priced pandadoc') ||
        lowerTrimmed.startsWith('digest of signed contracts approaching') ||
        lowerTrimmed.startsWith('build a signing pipeline') ||
        lowerTrimmed.startsWith('сборка a signing pipeline') ||
        lowerTrimmed.startsWith('official trello plugin') ||
        lowerTrimmed.startsWith('summarize the cards that are due') ||
        lowerTrimmed.startsWith('create a trello card') ||
        lowerTrimmed.startsWith('show what is in my trello') ||
        lowerTrimmed.startsWith('**mandatory prerequisite**') ||
        lowerTrimmed === 'background commands' ||
        lowerTrimmed === 'background command' ||
            /^background\s+commands?(?:\s+\d+)?$/i.test(lowerTrimmed) ||
            /^(?:\d+(?:\.\d+)?\s*(?:s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)\s*)+timer$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'view split diff' ||
        lowerTrimmed === 'просмотр split diff' ||
        lowerTrimmed === 'split diff' ||
        lowerTrimmed === 'view inline diff' ||
        lowerTrimmed === 'просмотр inline diff' ||
        lowerTrimmed === 'inline diff' ||
        lowerTrimmed === 'view unified diff' ||
        lowerTrimmed === 'просмотр unified diff' ||
        lowerTrimmed === 'hide whitespace changes' ||
        lowerTrimmed === 'show whitespace changes' ||
            /^\+?\s*\d+\s+more\s+lines?(?:\.{3}|…)?$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'staged changes' ||
        lowerTrimmed === 'unstaged changes' ||
        lowerTrimmed === 'merge changes' ||
        lowerTrimmed === 'untracked files' ||
        lowerTrimmed === 'untracked changes' ||
        lowerTrimmed === 'no file changes' ||
        lowerTrimmed === 'no file changes.' ||
        lowerTrimmed === 'no staged changes' ||
        lowerTrimmed === 'no changes' ||
        lowerTrimmed === 'changes' ||
        lowerTrimmed === 'commit' ||
        lowerTrimmed === 'commit...' ||
        lowerTrimmed === 'amend' ||
        lowerTrimmed === 'push' ||
        lowerTrimmed === 'pull' ||
        lowerTrimmed === 'fetch' ||
        lowerTrimmed === 'sync' ||
        lowerTrimmed === 'sync changes' ||
        lowerTrimmed === 'commit & push' ||
        lowerTrimmed === 'commit & sync' ||
        lowerTrimmed === 'search' ||
            /^cancel\s*\(/i.test(lowerTrimmed) ||
        lowerTrimmed.startsWith('sends after agent finishes') ||
        lowerTrimmed.startsWith('send after agent finishes') ||
        lowerTrimmed.startsWith('queue message') ||
        lowerTrimmed.startsWith('send immediately') ||
        lowerTrimmed.startsWith('send now') ||
        lowerTrimmed.startsWith('summarize this design doc') ||
        lowerTrimmed.startsWith('draft a launch announcement') ||
        lowerTrimmed.startsWith('reply to the open comments') ||
        lowerTrimmed.startsWith('read and write your google docs') ||
        lowerTrimmed.startsWith('чтение and write your google docs') ||
        lowerTrimmed.startsWith('read, create, edit, and manage google docs') ||
        lowerTrimmed.startsWith('чтение, create, edit, and manage google docs') ||
        /^tool\s+(arguments?|outputs?|inputs?|results?|parameters?|calls?)$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'recent' ||
        lowerTrimmed === 'recent:' ||
        lowerTrimmed === 'trigger' ||
        lowerTrimmed === 'triggers' ||
        lowerTrimmed === 'time zone' ||
        lowerTrimmed === 'timezone' ||
        lowerTrimmed === 'this computer' ||
        lowerTrimmed === 'this computer >' ||
        lowerTrimmed === 'cloud' ||
        lowerTrimmed === 'runs on' ||
        lowerTrimmed === 'schedule' ||
        lowerTrimmed === 'scheduled task' ||
        lowerTrimmed === 'skill' ||
        lowerTrimmed === 'command' ||
        lowerTrimmed === 'note' ||
        lowerTrimmed === 'tip' ||
        lowerTrimmed === 'ui extensions' ||
        lowerTrimmed === 'accounts' ||
        lowerTrimmed === 'hooks' ||
        lowerTrimmed === 'context providers' ||
        lowerTrimmed === 'empty message' ||
        lowerTrimmed === 'unread' ||
        lowerTrimmed === 'context usage' ||
        lowerTrimmed === 'agents' ||
        lowerTrimmed === 'not' ||
        lowerTrimmed === 'free' ||
        lowerTrimmed === 'use' ||
        lowerTrimmed === 'domain / endpoint' ||
        lowerTrimmed === 'tasks / assertions' ||
        lowerTrimmed.includes('low-latency, bidirectional voice') ||
        lowerTrimmed.includes('stateful multi-turn chat') ||
        lowerTrimmed.includes('real-time audio/video streaming') ||
        lowerTrimmed.includes('gemini omni flash') ||
        lowerTrimmed.includes('myfirstapp') ||
        lowerTrimmed.includes('samsung galaxy ultra') ||
        lowerTrimmed.includes('ready to publish to google play') ||
        lowerTrimmed.includes('android cli') ||
        lowerTrimmed.includes('android virtual devices') ||
        lowerTrimmed.includes('jetpack compose') ||
        lowerTrimmed.includes('android gradle plugin') ||
        lowerTrimmed.includes('android knowledge base') ||
        lowerTrimmed.includes('android sdk') ||
        lowerTrimmed.includes('device hub') ||
        lowerTrimmed.startsWith('find the trends and outliers') ||
        lowerTrimmed.startsWith('build a monthly budget tracker') ||
        lowerTrimmed.startsWith('сборка a monthly budget tracker') ||
        lowerTrimmed.startsWith('import this csv and turn it') ||
        lowerTrimmed.startsWith('read, write, and format your google sheets') ||
        lowerTrimmed.startsWith('чтение, write, and format your google sheets') ||
        lowerTrimmed.startsWith('read, write, format, and manage google sheets') ||
        lowerTrimmed.startsWith('чтение, write, format, and manage google sheets') ||
        lowerTrimmed.startsWith('turn my project notes into a 10-slide') ||
        lowerTrimmed.startsWith('add a summary slide and speaker notes') ||
        lowerTrimmed.startsWith('export the final deck as a pdf') ||
        lowerTrimmed.startsWith('build and polish your google slides') ||
        lowerTrimmed.startsWith('сборка and polish your google slides') ||
        lowerTrimmed.startsWith('read, create, and edit google slides') ||
        lowerTrimmed.startsWith('чтение, create, and edit google slides') ||
        lowerTrimmed.startsWith("find last quarter's budget") ||
        lowerTrimmed.startsWith("move this week's design exports") ||
        lowerTrimmed.startsWith('download the q3 report') ||
        lowerTrimmed.startsWith('скачивание the q3 report') ||
        lowerTrimmed.startsWith('find and organize your google drive') ||
        lowerTrimmed.startsWith('browse, search, and manage google drive') ||
        lowerTrimmed.startsWith('book 30 minutes with priya') ||
        lowerTrimmed.startsWith("what's on my calendar today") ||
        lowerTrimmed.startsWith("block focus time before friday") ||
        lowerTrimmed.startsWith('run your google calendar') ||
        lowerTrimmed.startsWith('запуск your google calendar') ||
        lowerTrimmed.startsWith('read, create, and manage google calendar') ||
        lowerTrimmed.startsWith('чтение, create, and manage google calendar') ||
            /^\d+\s+turns?$/i.test(lowerTrimmed) ||
            /^(?:\d{1,2}:\d{2}(?:\s*[ap]m)?\s+)?\d+\s+(?:(?:image|file|video|audio|media|code)\s+)?attachments?$/i.test(lowerTrimmed) ||
        lowerTrimmed === "what's included" ||
        lowerTrimmed === 'whats included' ||
        lowerTrimmed === 'mcp server' ||
        lowerTrimmed === 'prerequisites' ||
        lowerTrimmed === 'example prompts' ||
        lowerTrimmed === 'resources' ||
        lowerTrimmed === 'api key' ||
        lowerTrimmed === 'api key:' ||
        lowerTrimmed === 'sdk installation' ||
        lowerTrimmed === 'sdk installation:' ||
        lowerTrimmed.startsWith('equip your agent with current sdk') ||
        lowerTrimmed.startsWith('so your agent can search and read') ||
        lowerTrimmed.startsWith('environment variable with a key') ||
        lowerTrimmed.startsWith('gemini api documentation') ||
        lowerTrimmed === 'interactions api guide' ||
        lowerTrimmed.startsWith('github repository') ||
        lowerTrimmed.startsWith('build applications with the gemini') ||
        lowerTrimmed.startsWith('сборка applications with the gemini') ||
        lowerTrimmed.includes('stateful multi-turn chat script') ||
        lowerTrimmed.includes('real-time voice agent using the gemini') ||
        lowerTrimmed.includes('migrate my project from') ||
        lowerTrimmed.includes('generate multi-speaker dialogue audio') ||
        lowerTrimmed.startsWith('use this skill when writing code') ||
        lowerTrimmed.startsWith('use this skill when building real-time') ||
        lowerTrimmed.startsWith('use this skill for generative video') ||
        lowerTrimmed.startsWith('investigate production issues with real dynatrace') ||
        lowerTrimmed.startsWith('accept payments and grow your business') ||
        lowerTrimmed.startsWith('build and deploy base44') ||
        lowerTrimmed.startsWith('teamwork graph cli is atlassian') ||
        lowerTrimmed.startsWith('manage your bigin crm') ||
        lowerTrimmed.startsWith('official antigravity plugin for mongodb') ||
        lowerTrimmed.startsWith('query your sentinelone') ||
        lowerTrimmed.startsWith('packaged workflows for sca') ||
        lowerTrimmed.startsWith('triage exabeam') ||
        lowerTrimmed.startsWith('use the official crowdstrike') ||
        lowerTrimmed.startsWith('use datadog directly') ||
        lowerTrimmed.startsWith('connect antigravity to your notion') ||
        lowerTrimmed.startsWith('the product development system for teams') ||
        lowerTrimmed.startsWith('turn figma designs') ||
        lowerTrimmed.startsWith('create, edit, review, resize') ||
        lowerTrimmed.startsWith('connect antigravity to dropbox') ||
        lowerTrimmed.startsWith('build and deploy on netlify') ||
        lowerTrimmed.startsWith('deploy, configure, monitor') ||
        lowerTrimmed.startsWith('build and deploy web apps') ||
        lowerTrimmed.startsWith('add auth0 authentication') ||
        lowerTrimmed.startsWith('databricks skills for') ||
        lowerTrimmed.startsWith('give your agent a real browser') ||
        lowerTrimmed === 'permission preset' ||
        lowerTrimmed === 'permission presets' ||
        lowerTrimmed === 'built-in browser' ||
        lowerTrimmed === 'external browser' ||
        lowerTrimmed === 'open links in' ||
        lowerTrimmed.startsWith('configure link opening') ||
        lowerTrimmed.startsWith('choose where links open') ||
        lowerTrimmed === 'reopen closed tab' ||
        lowerTrimmed === 'restore_page reopen closed tab' ||
        lowerTrimmed === 'restore_page' ||
        lowerTrimmed === 'move conversation up' ||
        lowerTrimmed === 'move conversation down' ||
        lowerTrimmed === '5h limit' ||
        /^\d+\s*(?:h|hr|hour|hours)[\s-]*limit$/i.test(lowerTrimmed) ||
        lowerTrimmed.endsWith('% left') ||
        lowerTrimmed.endsWith('% remaining') ||
        lowerTrimmed === 'create' ||
        lowerTrimmed === 'create with prompt' ||
        lowerTrimmed.startsWith('+ create') ||
        lowerTrimmed.startsWith('create a ') ||
        lowerTrimmed.startsWith('create an ') ||
        lowerTrimmed === 'browse the marketplace' ||
        lowerTrimmed.startsWith('find skills, agents') ||
        lowerTrimmed.startsWith('no automations configured') ||
        lowerTrimmed.includes('baseline quota') ||
        lowerTrimmed.includes('ai credit overages') ||
        lowerTrimmed.includes('skills & rules') ||
        lowerTrimmed.includes('custom agents') ||
        lowerTrimmed.includes('mcp servers') ||
        lowerTrimmed.startsWith('all automations run') ||
        lowerTrimmed === 'new automation' ||
        lowerTrimmed === 'add automation' ||
        lowerTrimmed === 'no custom agents yet' ||
        lowerTrimmed === 'no custom agents yet.' ||
        (lowerTrimmed.startsWith('search ') && lowerTrimmed.includes('in transcript')) ||
        lowerTrimmed.startsWith('checked task') ||
        lowerTrimmed.startsWith('inspect ') ||
        lowerTrimmed.startsWith('compare ') ||
        lowerTrimmed.startsWith('restore ') ||
        lowerTrimmed.startsWith('check ') ||
        lowerTrimmed.startsWith('select project') ||
        lowerTrimmed.startsWith('leaving soon') ||
        lowerTrimmed.startsWith('notice') ||
        lowerTrimmed.startsWith('exploring files') ||
        lowerTrimmed.startsWith('verify ') ||
        lowerTrimmed.startsWith('start using gemini') ||
        lowerTrimmed === 'commands' ||
        lowerTrimmed.startsWith('commands ') ||
        lowerTrimmed.startsWith('explored') ||
        lowerTrimmed === 'sort by' ||
        lowerTrimmed === 'sort by:' ||
        lowerTrimmed === 'last updated' ||
        lowerTrimmed === 'last prompt' ||
        lowerTrimmed === 'custom order' ||
        lowerTrimmed.includes('subagent running') ||
        lowerTrimmed.includes('subagents running') ||
        lowerTrimmed.startsWith('lines ') ||
        lowerTrimmed.startsWith('whitelist in') ||
        lowerTrimmed.startsWith('regexTranslations for') ||
        lowerTrimmed.startsWith('line ') ||
        lowerTrimmed.startsWith('ran ') ||
        lowerTrimmed.startsWith('run ') ||
        lowerTrimmed.startsWith('running ') ||
        lowerTrimmed === 'view' ||
        lowerTrimmed === 'viewing' ||
        lowerTrimmed.startsWith('view ') ||
        lowerTrimmed.startsWith('viewing ') ||
        lowerTrimmed.startsWith('test ') ||
        lowerTrimmed.startsWith('see plans') ||
        lowerTrimmed.startsWith('enable overages') ||
        lowerTrimmed === 'edited' ||
        lowerTrimmed.startsWith('edited ') ||
        lowerTrimmed === 'editing' ||
        lowerTrimmed.startsWith('editing ') ||
        lowerTrimmed === 'updated' ||
        lowerTrimmed.startsWith('updated ') ||
        lowerTrimmed === 'updating' ||
        lowerTrimmed.startsWith('updating ') ||
        lowerTrimmed.startsWith('update ') ||
        lowerTrimmed === 'build' ||
        lowerTrimmed === 'building' ||
        lowerTrimmed.startsWith('build ') ||
        lowerTrimmed.startsWith('building ') ||
        lowerTrimmed.startsWith('message from ') ||
        lowerTrimmed === 'media' ||
        lowerTrimmed === 'folder' ||
        lowerTrimmed === 'mentions' ||
        lowerTrimmed === 'actions' ||
        lowerTrimmed === 'compacting' ||
        lowerTrimmed.startsWith('compacting') ||
        lowerTrimmed === 'mark all as read' ||
        lowerTrimmed.startsWith('this page is going away soon') ||
        lowerTrimmed.startsWith('toggle maximize auxiliary pane') ||
        lowerTrimmed.startsWith('toggle overview panel') ||
        lowerTrimmed.includes('in the top left') ||
        lowerTrimmed === 'disable' ||
        lowerTrimmed === 'remove' ||
        lowerTrimmed === 'add mcp server' ||
        lowerTrimmed === 'copy config file path' ||
        lowerTrimmed.startsWith('see ') ||
        lowerTrimmed.startsWith('+ see ') ||
        lowerTrimmed.startsWith('core tools and knowledge') ||
        lowerTrimmed.startsWith('prototype, build') ||
        lowerTrimmed.startsWith('integration skill') ||
        lowerTrimmed.startsWith('official plugin for dart') ||
        lowerTrimmed.startsWith('this plugin provides') ||
        lowerTrimmed.startsWith('google cloud guidance') ||
        lowerTrimmed === 'parallel search' ||
        lowerTrimmed === 'поиск parallel' ||
        lowerTrimmed === 'search parallel' ||
        lowerTrimmed === 'google cloud app optimize' ||
        lowerTrimmed.startsWith('the app optimize') ||
        lowerTrimmed.startsWith('search your google cloud') ||
        lowerTrimmed.startsWith('поиск your google cloud') ||
        lowerTrimmed.startsWith('search and reference') ||
        lowerTrimmed.startsWith('поиск and reference') ||
        lowerTrimmed.startsWith('search the live web') ||
        lowerTrimmed.startsWith('поиск the live web') ||
        lowerTrimmed.startsWith('search and retrieve') ||
        lowerTrimmed.startsWith('поиск and retrieve') ||
        lowerTrimmed === 'new tab' ||
        lowerTrimmed === '+ new tab' ||
        lowerTrimmed.endsWith('new tab') ||
        lowerTrimmed.includes('auxiliary pane') ||
        lowerTrimmed.includes('toggle maximize') ||
        lowerTrimmed.includes('mark this conversation') ||
        lowerTrimmed.includes('as unread') ||
        lowerTrimmed.includes('in the sidebar') ||
        lowerTrimmed.startsWith('sincpro ') ||
        lowerTrimmed.startsWith('clear ') ||
        lowerTrimmed.startsWith('clearing ') ||
        lowerTrimmed.startsWith('push ') ||
        lowerTrimmed.startsWith('pushing ') ||
        lowerTrimmed === 'cancel task' ||
        lowerTrimmed === 'stop recording' ||
        lowerTrimmed === 'start recording' ||
        lowerTrimmed === 'use global settings' ||
        lowerTrimmed.includes('overrides your global permission') ||
        lowerTrimmed.includes('every command requires approval') ||
        lowerTrimmed.includes('ask before sensitive operations') ||
        lowerTrimmed.includes('without restrictions') ||
        lowerTrimmed.startsWith('project настройки') ||
        lowerTrimmed.startsWith('project settings') ||
        lowerTrimmed === 'task log' ||
        lowerTrimmed.includes('task log') ||
        lowerTrimmed.startsWith('killed task') ||
        lowerTrimmed === 'killed task' ||
        lowerTrimmed === 'checked task' ||
        lowerTrimmed.startsWith('approve ') ||
        lowerTrimmed.startsWith('approved ') ||
        lowerTrimmed.startsWith('execute ') ||
        lowerTrimmed.startsWith('executed ') ||
        lowerTrimmed.startsWith('inspecting ') ||
        lowerTrimmed.startsWith('extracting ') ||
        lowerTrimmed.startsWith('listing ') ||
        lowerTrimmed.startsWith('reading ') ||
        lowerTrimmed.startsWith('testing ') ||
        lowerTrimmed.startsWith('searching ') ||
        lowerTrimmed.startsWith('checking ') ||
        lowerTrimmed.startsWith('updating ') ||
        lowerTrimmed.startsWith('upgrading ') ||
        lowerTrimmed.startsWith('reverting ') ||
        lowerTrimmed.startsWith('downloading ') ||
        lowerTrimmed.startsWith('github actions') ||
        lowerTrimmed.startsWith('untracked ') ||
        lowerTrimmed.startsWith('consilium ') ||
        lowerTrimmed.startsWith('schema ') ||
        lowerTrimmed.startsWith('contract ') ||
        lowerTrimmed.startsWith('validator ') ||
        lowerTrimmed.startsWith('dispatch_cli ') ||
        lowerTrimmed.startsWith('git pickaxe ') ||
        lowerTrimmed.endsWith(' stat') ||
        lowerTrimmed.endsWith(' help') ||
        lowerTrimmed.endsWith(' body') ||
        lowerTrimmed.endsWith(' toolchain')
    ) {
        return false;
    }
    
    // Исключения: фразы с пробелами, содержащие email или известные глаголы интерфейса — не имена файлов!
    if (trimmed.includes(' ')) {
        if (/@/.test(trimmed) || /^(?:\d+\s*h\s+limit|\d+(?:[.,]\d+)?%\s+left|create\s+(?:a|an)\s+|no\s+extensions\s+available|customize\s+sections|modified\s+files|open\s+file|select\s+folder|поиск\s+tabs|auto\s*\(preview\)|automatically\s+decide|enter\s+tool\s+name|give\s+feedback|проверка\s+|enable\s+(?:notifications|sounds)\s+for\s+agent|manage\s+your\s+notification|show\s+system\s+notifications|play\s+a\s+sound|set\s+the\s+volume)\b/i.test(trimmed) || /for\s+commands/i.test(trimmed) || /conversations\s+with/i.test(trimmed) || /\(.*?menu\)/i.test(trimmed) || /^created\s+/i.test(trimmed) || /^creating\s+/i.test(trimmed) || /^(?:canceled|cancelled)\s+/i.test(trimmed) || /^plan\s+carefully/i.test(trimmed) || /^invoke\s+the\s+boost/i.test(trimmed) || /^compact\s+the\s+conversation/i.test(trimmed) || /^assign\s+github\s+coding/i.test(trimmed) || /^create\s+an\s+issue/i.test(trimmed) || /^ask\s+a\s+quick\s+question/i.test(trimmed) || /^interview\s+me/i.test(trimmed) || /^invoke\s+a\s+(?:browser|team)/i.test(trimmed) || /^reflect\s+on\s+recent/i.test(trimmed) || /^uses\s+chrome\s+devtools/i.test(trimmed) || /^interactive\s+guide/i.test(trimmed) || /^guides\s+debugging/i.test(trimmed) || /^diagnoses\s+and\s+resolves/i.test(trimmed) || /^(?:search|поиск)\s+tool\s+for\s+modern/i.test(trimmed) || /^(?:build|сборка)\s+and\s+publish/i.test(trimmed) || /^comprehensive\s+guide/i.test(trimmed) || /^provides\s+a\s+comprehensive/i.test(trimmed) || /^how\s+to\s+render\s+rich/i.test(trimmed) || /^design,\s*implement/i.test(trimmed) || /^automatically\s+migrate/i.test(trimmed) || /^guidelines\s+for\s+interacting/i.test(trimmed) || /^how\s+to\s+manage\s+and\s+create/i.test(trimmed) || /^how\s+to\s+write\s+and\s+run/i.test(trimmed) || /^discover\s+ui\s+plugin/i.test(trimmed) || /^inspecting\s+/i.test(trimmed) || /^extracting\s+/i.test(trimmed) || /^listing\s+/i.test(trimmed) || /^reading\s+/i.test(trimmed) || /^testing\s+/i.test(trimmed) || /^searching\s+/i.test(trimmed) || /^checking\s+/i.test(trimmed) || /^updating\s+/i.test(trimmed) || /^updated\s+/i.test(trimmed) || /^update\s+/i.test(trimmed) || /^upgrading\s+/i.test(trimmed) || /^viewing\s+/i.test(trimmed) || /^message\s+from\s+/i.test(trimmed) || /^compacting/i.test(trimmed) || /^mark\s+all\s+as\s+read/i.test(trimmed) || /^this\s+page\s+is\s+going/i.test(trimmed) || /^toggle\s+maximize/i.test(trimmed) || /^toggle\s+overview/i.test(trimmed) || /^sincpro\s+/i.test(trimmed) || /^reverting\s+/i.test(trimmed) || /^downloading\s+/i.test(trimmed) || /^github\s+actions/i.test(trimmed) || /^untracked\s+/i.test(trimmed) || /^consilium\s+/i.test(trimmed) || /^schema\s+/i.test(trimmed) || /^contract\s+/i.test(trimmed) || /^validator\s+/i.test(trimmed) || /^dispatch_cli\s+/i.test(trimmed) || /^git\s+pickaxe/i.test(trimmed) || /\s+stat$/i.test(trimmed) || /\s+help$/i.test(trimmed) || /\s+body$/i.test(trimmed) || /\s+toolchain$/i.test(trimmed) || /^edited\s+/i.test(trimmed) || /^editing\s+/i.test(trimmed) || /^build\s+/i.test(trimmed) || /^building\s+/i.test(trimmed) || /^clear\s+/i.test(trimmed) || /^clearing\s+/i.test(trimmed) || /^push\s+/i.test(trimmed) || /^pushing\s+/i.test(trimmed) || /^killed\s+task/i.test(trimmed) || /^cancel\s+task/i.test(trimmed) || /^stop\s+recording/i.test(trimmed) || /^approve\s+/i.test(trimmed) || /^approved\s+/i.test(trimmed) || /^execute\s+/i.test(trimmed) || /^executed\s+/i.test(trimmed) || /^see\s+plans/i.test(trimmed) || /^enable\s+overages/i.test(trimmed) || /^explored\s+/i.test(trimmed) || /^ran\s+/i.test(trimmed) || /^run\s+/i.test(trimmed) || /^running\s+/i.test(trimmed) || /^view\s+/i.test(trimmed) || /^test\s+/i.test(trimmed) || /^commands/i.test(trimmed) || /^close\s+tab/i.test(trimmed) || /^split\s+/i.test(trimmed) || /^open\s+/i.test(trimmed) || /^collapse\s+/i.test(trimmed) || /^expand\s+/i.test(trimmed) || /^unpin\s+/i.test(trimmed) || /^pin\s+/i.test(trimmed) || /^rename\s+/i.test(trimmed) || /^archive\s+/i.test(trimmed) || /^download\s+/i.test(trimmed) || /^toggle\s+/i.test(trimmed) || /^next\s+aux/i.test(trimmed) || /^previous\s+aux/i.test(trimmed) || /^send\s+feedback/i.test(trimmed) || /^this\s+conversation/i.test(trimmed) || /^visit\s+/i.test(trimmed) || /^the\s+canva/i.test(trimmed) || /^our\s+servers/i.test(trimmed) || /^error\s+/i.test(trimmed) || /^model\s+unavailable/i.test(trimmed) || /^agent\s+execution/i.test(trimmed) || /^working/i.test(trimmed) || /^worked\s+for/i.test(trimmed) || /^copy/i.test(trimmed) || /^select\s+all/i.test(trimmed) || /files?\s+changed/i.test(trimmed) || /^(good|bad)\s+response/i.test(trimmed) || / finished$/i.test(trimmed) || /^the\s+subagent/i.test(trimmed) || /^failed_precondition/i.test(trimmed) || /architect\s+session/i.test(trimmed) || /^thought\s+for/i.test(trimmed) || /^thinking\s+for/i.test(trimmed) || /^exploring\s+/i.test(trimmed) || /^analyzed\s+/i.test(trimmed) || /^automations/i.test(trimmed) || /marketplace/i.test(trimmed) || /pane$/i.test(trimmed) || /^\+\s*create/i.test(trimmed) || /baseline quota/i.test(trimmed) || /ai credit overages/i.test(trimmed) || /all automations run/i.test(trimmed) || /google workspace/i.test(trimmed) || /custom agents/i.test(trimmed) || /skills & rules/i.test(trimmed) || /mcp servers/i.test(trimmed) || /^search\s+/i.test(trimmed) || /^inspect\s+/i.test(trimmed) || /^compare\s+/i.test(trimmed) || /^restore\s+/i.test(trimmed) || /^check\s+/i.test(trimmed) || /^checked\s+task/i.test(trimmed) || /^select\s+project/i.test(trimmed) || /^leaving\s+soon/i.test(trimmed) || /^notice/i.test(trimmed) || /^verify\s+/i.test(trimmed) || /^start\s+using/i.test(trimmed)) {
            return false;
        }
    }
    
    // 1. Проверяем наличие расширения файла на конце (только если нет пробелов или не более двух слов без email)
    if (/\.[a-zA-Z0-9]{1,5}$/.test(trimmed)) {
        if (!trimmed.includes(' ') || trimmed.split(' ').length <= 2) {
            if (!/@\w+\.[a-zA-Z]{2,}$/.test(trimmed)) {
                return true;
            }
        }
    }
    
    // 2. Проверяем наличие путей к файлам (содержат слэши, исключая простые даты)
    const hasPathChar = trimmed.startsWith('/') || trimmed.startsWith('\\') || /^[a-zA-Z]:\\/.test(trimmed) || trimmed.startsWith('file://');
    if ((trimmed.includes('/') || trimmed.includes('\\')) && !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmed)) {
        if (trimmed.includes(' ') && !hasPathChar) {
            return false;
        }
        return true;
    }
    
    // 3. Проверяем родительские классы
    let current = parent;
    while (current) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            const className = current.className || '';
            if (typeof className === 'string') {
                const lowerClass = className.toLowerCase();
                if (
                    lowerClass.includes('file-name') ||
                    lowerClass.includes('filename') ||
                    lowerClass.includes('filepath') ||
                    lowerClass.includes('file-path') ||
                    lowerClass.includes('artifact-name') ||
                    lowerClass.includes('artifact-title') ||
                    lowerClass.includes('artifact-filename') ||
                    lowerClass.includes('artifact-header') ||
                    lowerClass.includes('file-info')
                ) {
                    return true;
                }
            }
        }
        current = current.parentElement;
    }
    
    return false;
}

function translateTextNode(node) {
    try {
        if (localStorage.getItem('antigravity_lang') === 'en') return;
        if (node.nodeType !== Node.TEXT_NODE) return;

        const text = node.nodeValue;
        const normalized = text.replace(/[\s\u00a0\xa0\u2007\u202f\r\n\t]+/g, ' ').trim();
        if (!normalized) return;
        
        if (isFileName(normalized, node.parentElement)) return;
        
        const lowerText = normalized.toLowerCase();
        let translated = null;

        const parentText = (node.parentElement ? (node.parentElement.textContent || '') : '').toLowerCase();
        const grandParentText = (node.parentElement && node.parentElement.parentElement ? (node.parentElement.parentElement.textContent || '') : '').toLowerCase();
        const fullContext = parentText + ' ' + grandParentText;
        const isTroubleshootingSentence = (
            fullContext.includes('troubleshooting_guide') ||
            fullContext.includes('troubleshooting guide') ||
            fullContext.includes('руководстве по устранению неполадок') ||
            fullContext.includes('подробнее см. в')
        );

        if (isTroubleshootingSentence) {
            if (lowerText === 'see our' || lowerText === 'see our:') {
                translated = 'Подробнее см. в';
            } else if (lowerText === 'troubleshooting_guide' || lowerText === 'troubleshooting guide') {
                translated = 'руководстве по устранению неполадок';
            } else if (lowerText.startsWith('for more help')) {
                translated = '.';
            }
        }
        
        if (!translated) {
            if (translationDictionary[lowerText]) {
                translated = translationDictionary[lowerText];
            } else {
                for (const rule of regexTranslations) {
                    const match = normalized.match(rule.pattern);
                    if (match) {
                        translated = rule.replace(match);
                        break;
                    }
                }
            }
        }
        
        if (!translated) {
            if (/\bin this conversation\b/i.test(normalized) || /files modified by the agent/i.test(normalized)) {
                translated = normalized
                    .replace(/files modified by the agent/gi, 'Файлы, измененные агентом')
                    .replace(/\bin this conversation\b/gi, 'в этом диалоге')
                    .replace(/when not in a project/gi, 'вне проекта');
            } else if (/when not in a project/i.test(normalized)) {
                translated = normalized.replace(/when not in a project/gi, 'вне проекта');
            } else if (lowerText === 'type') {
                const parentText = node.parentElement ? node.parentElement.textContent : '';
                if (/plan/i.test(parentText) || /\//.test(parentText)) {
                    translated = 'Введите';
                }
            } else if (lowerText === 'visit') {
                const parentText = node.parentElement ? node.parentElement.textContent.toLowerCase() : '';
                if (parentText.includes('legal help') || parentText.includes('legal reasons')) {
                    translated = 'Посетите раздел';
                }
            } else if (lowerText === 'legal help') {
                translated = '«Юридическая помощь»';
            } else if (lowerText.includes('to ask for content changes for legal reasons')) {
                translated = ', чтобы запросить изменение содержания по юридическим причинам.';
            } else if (lowerText === 'thinking') {
                const parentText = node.parentElement ? node.parentElement.textContent.toLowerCase() : '';
                const grandText = node.parentElement && node.parentElement.parentElement ? node.parentElement.parentElement.textContent.toLowerCase() : '';
                if (/\bfor\s+\d+\s*(?:s|sec|m|min|h)\b/i.test(parentText + ' ' + grandText) || /thought|thinking/i.test((node.parentElement && node.parentElement.className) || '')) {
                    translated = 'Размышляет';
                }
            } else if (lowerText === 'thought') {
                translated = 'Размышлял';
            } else if (lowerText === 'edited') {
                translated = 'Изменено';
            } else if (lowerText === 'editing') {
                translated = 'Изменение';
            } else if (lowerText === 'running') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent) : '';
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent) : '';
                if ((pText.length > 8 && /^running\b/i.test(pText)) || (gpText.length > 8 && /^running\b/i.test(gpText))) {
                    translated = 'Выполняется:';
                } else {
                    translated = 'Выполняется';
                }
            } else if (lowerText === 'the') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('android skills')) {
                    translated = 'Команда';
                } else if (pText.includes('google developer knowledge') && pText.includes('connects your coding agent')) {
                    translated = 'Плагин';
                } else if (pText.includes('google-cloud-developer') && pText.includes('equips antigravity')) {
                    translated = 'Плагин';
                } else if (pText.includes('modern-web-guidance') && pText.includes('publish target')) {
                    translated = 'Репозиторий';
                } else if (pText.includes('navigation-drawer')) {
                    translated = 'руководство';
                }
            } else if (lowerText === 'guide') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('navigation-drawer')) {
                    translated = ' ';
                }
            } else if (lowerText === 'not') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent).toLowerCase() : '';
                if ((pText + ' ' + gpText).includes('science plugin') || (pText + ' ' + gpText).includes('плагина science')) {
                    translated = 'не';
                }
            } else if (lowerText === 'free') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent).toLowerCase() : '';
                if ((pText + ' ' + gpText).includes('data agent kit')) {
                    translated = 'бесплатный';
                }
            } else if (lowerText === 'use') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('service account') || pText.includes('имперсонацию') || pText.includes('principal access') || pText.includes('политики границ')) {
                    translated = 'Используйте';
                }
            } else if (lowerText === 'if the') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('android') && (pText.includes('path') || pText.includes('installer') || pText.includes('установщик'))) {
                    translated = 'Если инструмент';
                }
            } else if (lowerText === 'left') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent) : '';
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent) : '';
                if (/\d+%\s*left/i.test(pText) || /\d+%\s*left/i.test(gpText)) {
                    translated = 'осталось';
                }
            }
        }

        
        if (translated) {
            if (shouldIgnore(node)) return;
            
            const parent = node.parentElement;
            if (parent) {
                if (normalizeText(node.nodeValue) === translated) {
                    return;
                }
                
                parent.setAttribute('data-translated', 'true');
                parent.setAttribute('data-original-text', text);
            }

            
            const match = node.nodeValue.match(/^(\s*)(.*?)(\s*)$/);
            if (match) {
                let leadingSpaces = match[1];
                const trailingSpaces = match[3];
                if ((translated.startsWith(',') || translated.startsWith('.')) && leadingSpaces) {
                    leadingSpaces = '';
                }
                node.nodeValue = leadingSpaces + translated + trailingSpaces;
            } else {
                node.nodeValue = translated;
            }
        }
    } catch (e) {
        console.error('Error in translateTextNode:', e);
    }
}

function translatePlaceholder(element) {
    try {
        if (!element || element.nodeType !== Node.ELEMENT_NODE || !element.getAttribute) return;
        if (shouldIgnore(element)) return;
        if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') return;
        const placeholder = element.getAttribute('placeholder');
        if (!placeholder) return;
        
        const normalized = normalizeText(placeholder);
        const lowerPlaceholder = normalized.toLowerCase();
        
        let translatedValue = null;
        if (translationDictionary[lowerPlaceholder]) {
            translatedValue = translationDictionary[lowerPlaceholder];
        } else {
            for (const rule of regexTranslations) {
                const match = normalized.match(rule.pattern);
                if (match) {
                    translatedValue = rule.replace(match);
                    break;
                }
            }
        }
        
        if (translatedValue) {
            if (element.getAttribute('placeholder') === translatedValue) return;
            
            element.setAttribute('data-translated-placeholder', 'true');
            element.setAttribute('data-original-placeholder', placeholder);
            element.setAttribute('placeholder', translatedValue);
        }
    } catch (e) {
        console.error('Error in translatePlaceholder:', e);
    }
}

function translateTitle(element) {
    try {
        if (!element || element.nodeType !== Node.ELEMENT_NODE || !element.getAttribute) return;
        if (shouldIgnore(element)) return;
        
        const title = element.getAttribute('title');
        if (title && typeof title === 'string') {
            const normalized = normalizeText(title);
            const lowerTitle = normalized.toLowerCase();
            
            let translated = null;
            if (translationDictionary[lowerTitle]) {
                translated = translationDictionary[lowerTitle];
            } else {
                for (const rule of regexTranslations) {
                    const match = normalized.match(rule.pattern);
                    if (match) {
                        translated = rule.replace(match);
                        break;
                    }
                }
            }
            
            if (translated) {
                if (element.getAttribute('title') === translated) return;
                element.setAttribute('data-translated-title', 'true');
                element.setAttribute('data-original-title', title);
                element.setAttribute('title', translated);
            }
        }

        const tooltip = element.getAttribute('data-tooltip');
        if (tooltip && typeof tooltip === 'string') {
            const normalized = normalizeText(tooltip);
            const lowerTooltip = normalized.toLowerCase();
            
            let translated = null;
            if (translationDictionary[lowerTooltip]) {
                translated = translationDictionary[lowerTooltip];
            } else {
                for (const rule of regexTranslations) {
                    const match = normalized.match(rule.pattern);
                    if (match) {
                        translated = rule.replace(match);
                        break;
                    }
                }
            }
            
            if (translated) {
                if (element.getAttribute('data-tooltip') === translated) return;
                element.setAttribute('data-translated-tooltip', 'true');
                element.setAttribute('data-original-tooltip', tooltip);
                element.setAttribute('data-tooltip', translated);
            }
        }
    } catch (e) {
        console.error('Error in translateTitle:', e);
    }
}

function translateAriaLabel(element) {
    try {
        if (!element || element.nodeType !== Node.ELEMENT_NODE || !element.getAttribute) return;
        if (shouldIgnore(element)) return;
        
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel && typeof ariaLabel === 'string') {
            const normalized = normalizeText(ariaLabel);
            const lower = normalized.toLowerCase();
            
            let translated = null;
            if (translationDictionary[lower]) {
                translated = translationDictionary[lower];
            } else {
                for (const rule of regexTranslations) {
                    const match = normalized.match(rule.pattern);
                    if (match) {
                        translated = rule.replace(match);
                        break;
                    }
                }
            }
            
            if (translated) {
                if (element.getAttribute('aria-label') === translated) return;
                element.setAttribute('data-translated-aria', 'true');
                element.setAttribute('data-original-aria', ariaLabel);
                element.setAttribute('aria-label', translated);
            }
        }
    } catch (e) {
        console.error('Error in translateAriaLabel:', e);
    }
}

function translateTree(root) {
    if (isTranslating) return;
    isTranslating = true;
    
    try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            translateTextNode(node);
        }
        
        if (root.nodeType === Node.ELEMENT_NODE) {
            if (root.tagName === 'INPUT' || root.tagName === 'TEXTAREA') {
                translatePlaceholder(root);
            }
            translateTitle(root);
            translateAriaLabel(root);
            
            if (root.querySelectorAll) {
                const inputs = root.querySelectorAll('input, textarea');
                inputs.forEach(translatePlaceholder);
                
                const allElements = root.querySelectorAll('*');
                allElements.forEach(el => {
                    translateTitle(el);
                    translateAriaLabel(el);
                });
            }
        }
    } catch (e) {
        console.error('Error in translateTree:', e);
    } finally {
        isTranslating = false;
    }
}


function restoreOriginalTree() {
    isTranslating = true;
    
    try {
        const elements = document.querySelectorAll('[data-translated="true"]');
        elements.forEach(el => {
            const originalText = el.getAttribute('data-original-text');
            if (originalText) {
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while (node = walker.nextNode()) {
                    node.nodeValue = originalText;
                }
            }
            el.removeAttribute('data-translated');
            el.removeAttribute('data-original-text');
            el.removeAttribute('title');
        });
        
        const inputs = document.querySelectorAll('[data-translated-placeholder="true"]');
        inputs.forEach(el => {
            const originalPlaceholder = el.getAttribute('data-original-placeholder');
            if (originalPlaceholder) {
                el.setAttribute('placeholder', originalPlaceholder);
            }
            el.removeAttribute('data-translated-placeholder');
            el.removeAttribute('data-original-placeholder');
        });

        const titles = document.querySelectorAll('[data-translated-title="true"]');
        titles.forEach(el => {
            const originalTitle = el.getAttribute('data-original-title');
            if (originalTitle) {
                el.setAttribute('title', originalTitle);
            }
            el.removeAttribute('data-translated-title');
            el.removeAttribute('data-original-title');
        });

        const tooltips = document.querySelectorAll('[data-translated-tooltip="true"]');
        tooltips.forEach(el => {
            const originalTooltip = el.getAttribute('data-original-tooltip');
            if (originalTooltip) {
                el.setAttribute('data-tooltip', originalTooltip);
            }
            el.removeAttribute('data-translated-tooltip');
            el.removeAttribute('data-original-tooltip');
        });

        const arias = document.querySelectorAll('[data-translated-aria="true"]');
        arias.forEach(el => {
            const originalAria = el.getAttribute('data-original-aria');
            if (originalAria) {
                el.setAttribute('aria-label', originalAria);
            }
            el.removeAttribute('data-translated-aria');
            el.removeAttribute('data-original-aria');
        });
    } catch (e) {
        console.error('Error in restoreOriginalTree:', e);
    } finally {
        isTranslating = false;
    }
}

function startObserving() {
    if (translationObserver) return;
    if (window.__antigravity_active_observer) {
        try { window.__antigravity_active_observer.disconnect(); } catch (e) {}
        window.__antigravity_active_observer = null;
    }
    
    try {
        translationObserver = new MutationObserver((mutations) => {
            // Временно отключаем наблюдение, чтобы избежать бесконечного цикла из собственных изменений
            stopObserving();
            
            try {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        if (target.nodeType === Node.ELEMENT_NODE) {
                            if (mutation.attributeName === 'placeholder') {
                                translatePlaceholder(target);
                            } else if (mutation.attributeName === 'title' || mutation.attributeName === 'data-tooltip') {
                                translateTitle(target);
                            } else if (mutation.attributeName === 'aria-label') {
                                translateAriaLabel(target);
                            }
                        }
                    } else {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                translateTree(node);
                            } else if (node.nodeType === Node.TEXT_NODE) {
                                translateTextNode(node);
                            }
                        });
                        if (mutation.type === 'characterData') {
                            translateTextNode(mutation.target);
                        }
                    }
                });
            } catch (e) {
                console.error('Error in MutationObserver loop:', e);
            } finally {
                startObserving();
            }
        });
        
        translationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['title', 'data-tooltip', 'placeholder', 'aria-label']
        });
        window.__antigravity_active_observer = translationObserver;
    } catch (e) {
        console.error('Error in startObserving:', e);
    }
}

function stopObserving() {
    if (translationObserver) {
        translationObserver.disconnect();
        translationObserver = null;
    }
    if (window.__antigravity_active_observer) {
        try { window.__antigravity_active_observer.disconnect(); } catch (e) {}
        window.__antigravity_active_observer = null;
    }
}

function getSavedLanguage() {
    try {
        if (window.name && window.name.includes('antigravity_lang=en')) return 'en';
        if (window.name && window.name.includes('antigravity_lang=ru')) return 'ru';
        const local = localStorage.getItem('antigravity_lang');
        if (local) return local;
    } catch(e) {}
    return 'ru';
}

function setSavedLanguage(lang) {
    try {
        localStorage.setItem('antigravity_lang', lang);
        window.name = 'antigravity_lang=' + lang;
    } catch(e) {}
}

function compareSemverClient(vA, vB) {
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

    const FALLBACK_VERSION = '2.1.22';
    if (!window.__antigravity_local_version || compareSemverClient(FALLBACK_VERSION, window.__antigravity_local_version) > 0) {
        window.__antigravity_local_version = FALLBACK_VERSION;
    }
    let currentLocalVersion = window.__antigravity_local_version;
    if (!window.__antigravity_remote_version || compareSemverClient(currentLocalVersion, window.__antigravity_remote_version) > 0) {
        window.__antigravity_remote_version = currentLocalVersion;
        window.__antigravity_remote_changelog = 'Локализация v2.1.22: полный перевод официальных плагинов Firebase, Science, Google Developer Knowledge, Modern Web Guidance, Google Maps Platform, Dart & Flutter, Data Agent Kit и Google Cloud Developer.';
    }
    let latestGithubVersion = window.__antigravity_remote_version;
    let latestGithubChangelog = window.__antigravity_remote_changelog || 'Локализация v2.1.22: полный перевод официальных плагинов Firebase, Science, Google Developer Knowledge, Modern Web Guidance, Google Maps Platform, Dart & Flutter, Data Agent Kit и Google Cloud Developer.';
    let isUpdatePending = false;
    let isHotUpdated = false;
    let hasRemoteUpdate = false;
    let isBusyUpdating = false;
    let lastCheckedTimeStr = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'antigravity-topbar-controls';
    wrapper.className = 'topbar-controls-wrapper';
    wrapper.innerHTML = `
        <div id="antigravity-lang-switcher" class="lang-switcher">
            <div class="lang-btn" id="lang-btn-en" title="Switch interface to English">EN</div>
            <div class="lang-btn" id="lang-btn-ru" title="Переключить интерфейс на русский язык">
                <span class="ru-text" id="ru-btn-label">RU</span>
            </div>
        </div>
        <div id="antigravity-version-btn" class="version-status-btn state-ok" title="Локализация актуальна (v${currentLocalVersion}). Нажмите для проверки обновлений">
            <span class="agy-info-glyph" aria-hidden="true">
                <span class="agy-info-dot" id="version-btn-dot"></span>
                <span class="agy-info-stem"></span>
            </span>
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
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.id = 'antigravity-lang-switcher-style';
    style.innerHTML = `
        .topbar-controls-wrapper {
            position: fixed;
            top: 5px;
            right: 180px;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 3px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-app-region: no-drag;
            user-select: none;
        }
        .lang-switcher {
            display: flex;
            background: #202124;
            border: 1px solid #3c4043;
            border-radius: 4px;
            padding: 2px;
            font-size: 10px;
            color: #bdc1c6;
            transition: all 0.2s ease;
        }
        [data-theme="light"] .lang-switcher {
            background: #f1f3f4;
            border: 1px solid #dadce0;
            color: #5f6368;
        }
        .lang-btn {
            display: flex;
            align-items: center;
            gap: 3px;
            padding: 1px 6px;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .lang-btn.active {
            background: #3c4043;
            color: #ffffff;
            font-weight: bold;
        }
        [data-theme="light"] .lang-btn.active {
            background: #ffffff;
            color: #202124;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .lang-btn:hover:not(.active) {
            background: rgba(255, 255, 255, 0.08);
        }
        [data-theme="light"] .lang-btn:hover:not(.active) {
            background: rgba(0, 0, 0, 0.06);
        }

        /* Frameless Minimalist "i" Status Icon next to EN | RU */
        .version-status-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 15px;
            height: 20px;
            background: transparent;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.18s ease;
            padding: 0;
            box-sizing: border-box;
            opacity: 0.72;
        }
        .version-status-btn:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.06);
        }
        [data-theme="light"] .version-status-btn:hover {
            background: rgba(0, 0, 0, 0.05);
        }
        .agy-info-glyph {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
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
            height: 6px;
            border-radius: 1px;
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }

        /* STATE 1: Calm Gray by default (Zero visual noise when everything is OK) */
        .version-status-btn.state-ok .agy-info-dot,
        .version-status-btn.state-ok .agy-info-stem {
            background-color: #80868b;
            box-shadow: none;
        }
        [data-theme="light"] .version-status-btn.state-ok .agy-info-dot,
        [data-theme="light"] .version-status-btn.state-ok .agy-info-stem {
            background-color: #5f6368;
        }
        /* Subtle green dot feedback only when hovering over the "i" icon */
        .version-status-btn.state-ok:hover .agy-info-dot {
            background-color: #34d399;
            box-shadow: 0 0 4px rgba(52, 211, 153, 0.7);
        }
        .version-status-btn.state-ok:hover .agy-info-stem {
            background-color: #e8eaed;
        }
        [data-theme="light"] .version-status-btn.state-ok:hover .agy-info-stem {
            background-color: #202124;
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
            top: 25px;
            right: 0;
            width: 300px;
            background: #1e1f22;
            border: 1px solid #3c4043;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            display: none;
            flex-direction: column;
            gap: 8px;
            z-index: 1000000;
            backdrop-filter: blur(10px);
        }
        /* Invisible hover bridge so moving mouse from A• icon to popup never loses hover */
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
        [data-theme="light"] .update-popup {
            background: #ffffff;
            border: 1px solid #dadce0;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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
            color: #34d399;
            line-height: 1.3;
        }
        [data-theme="light"] .update-popup-title {
            color: #059669;
        }
        .update-popup.warn-mode .update-popup-title {
            color: #fbbf24;
        }
        [data-theme="light"] .update-popup.warn-mode .update-popup-title {
            color: #d97706;
        }
        .update-popup-close {
            font-size: 11px;
            color: #9aa0a6;
            cursor: pointer;
            padding: 0 4px;
            border-radius: 3px;
        }
        .update-popup-close:hover {
            color: #ffffff;
            background: rgba(255,255,255,0.1);
        }
        .update-version-badge {
            display: inline-block;
            align-self: flex-start;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
            color: #e8eaed;
            font-weight: 600;
        }
        [data-theme="light"] .update-version-badge {
            background: #f1f3f4;
            border-color: #dadce0;
            color: #202124;
        }
        .update-popup-desc {
            font-size: 10px;
            line-height: 1.45;
            color: #9aa0a6;
            max-height: 110px;
            overflow-y: auto;
            white-space: pre-line;
        }
        [data-theme="light"] .update-popup-desc {
            color: #5f6368;
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
            border-radius: 4px;
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
            background: rgba(255, 255, 255, 0.08);
            color: #bdc1c6;
            border: 1px solid rgba(255, 255, 255, 0.12);
        }
        [data-theme="light"] .update-action-btn.secondary {
            background: #f1f3f4;
            color: #5f6368;
            border-color: #dadce0;
        }
        .update-action-btn.primary:hover {
            background: #059669;
            transform: translateY(-1px);
        }
        .update-popup.warn-mode .update-action-btn.primary:hover {
            background: #fbbf24;
        }
        .update-action-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.14);
            color: #ffffff;
        }
        .update-action-btn:disabled {
            opacity: 0.6;
            cursor: wait;
            transform: none !important;
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
            versionBtn.title = '🟠 Доступно обновление v' + latestGithubVersion + '! Нажмите для скачивания и установки.';

            popupTitle.innerText = '🟠 Доступно обновление на GitHub!';
            popupVersionBadge.innerText = 'Обновление: v' + currentLocalVersion + ' → v' + latestGithubVersion;
            popupDesc.innerText = (latestGithubChangelog ? latestGithubChangelog + '\n' : '') + 'Нажмите на иконку «i» или кнопку ниже, чтобы скачать и установить обновление.';
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

    // Poll local MCP control server (port 39228) for local version & patch status
    async function checkUpdateStatus() {
        if (isBusyUpdating) return;
        try {
            const resp = await fetch('http://127.0.0.1:39228/status');
            if (resp.ok) {
                const data = await resp.json();
                if (data.version && compareSemverClient(data.version, currentLocalVersion) >= 0) {
                    currentLocalVersion = data.version;
                    window.__antigravity_local_version = currentLocalVersion;
                }
                if (data.latestRemoteVersion && compareSemverClient(data.latestRemoteVersion, latestGithubVersion) > 0) {
                    latestGithubVersion = data.latestRemoteVersion;
                    window.__antigravity_remote_version = latestGithubVersion;
                }
                isUpdatePending = !!data.updatePending;
                if (data.hotUpdateNotice) {
                    isHotUpdated = true;
                    if (data.hotUpdateNotice.to) {
                        currentLocalVersion = data.hotUpdateNotice.to;
                        window.__antigravity_local_version = currentLocalVersion;
                    }
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
                    } else if (resData.remoteVersion && compareSemverClient(resData.remoteVersion, currentLocalVersion) >= 0) {
                        latestGithubVersion = resData.remoteVersion;
                        window.__antigravity_remote_version = latestGithubVersion;
                    }
                }
            } catch (errServer) {}

            if ((isNewerOnGh || forceInstall) && !serverUpdated) {
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

    // Clicking the compact "A•" icon stimulates checking/downloading/installing updates
    versionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerUpdateCheckAndInstall(false);
    });

    checkInstallBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await triggerUpdateCheckAndInstall(true);
    });

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

    window.__antigravity_status_interval = setInterval(checkUpdateStatus, 4000);
    window.__antigravity_remote_check_interval = setInterval(checkGithubRemoteVersion, 45000);
    checkUpdateStatus();
    checkGithubRemoteVersion();
    updateUI();
}


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
        const hostname = window.location.hostname;
        const isInternal = protocol === 'vscode-file:' || protocol === 'vscode-webview:' || protocol === 'antigravity-ide:' || hostname === '127.0.0.1' || hostname === 'localhost';
        if (isInternal) {
            initLanguageSwitcher();
            initTerminalInjection();
            if (localStorage.getItem('antigravity_lang') !== 'en') {
                startObserving();
                translateTree(document.body);
            }
        }
    }
}, 50);


