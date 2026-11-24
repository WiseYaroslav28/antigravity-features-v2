function isEnglishMode() {
    try {
        if (window !== window.top && window.__antigravity_subframe_lang) {
            return window.__antigravity_subframe_lang === 'en';
        }
    } catch (e) {}
    try {
        if (window.name && window.name.includes('antigravity_lang=en')) return true;
        if (window.name && window.name.includes('antigravity_lang=ru')) return false;
        if (typeof localStorage !== 'undefined' && localStorage.getItem('antigravity_lang') === 'en') return true;
    } catch (e) {}
    return false;
}

window.__antigravity_translate_string = function(str) {
    if (!str || typeof str !== 'string') return str;
    if (isEnglishMode()) return str;
    const norm = str.replace(/[\s\u00a0\xa0\u2007\u202f\r\n\t]+/g, ' ').trim();
    if (!norm) return str;
    const lower = norm.toLowerCase();
    if (translationDictionary[lower]) return translationDictionary[lower];
    for (const rule of regexTranslations) {
        const m = norm.match(rule.pattern);
        if (m) {
            const res = rule.replace(m);
            if (res && res !== norm) {
                return res;
            }
        }
    }
    return str;
};

let translationObserver = null;
let isTranslating = false;
const regexTranslationCache = new Map();

function isProtectedChatOrDocProse(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const pEl = node.parentElement;
    if (!pEl || typeof pEl.closest !== 'function') return false;
    // Никогда не блокируем UI-контролы, тултипы, алерты, шаги браузерного субагента и карточки плагинов
    if (pEl.closest('button, [role="button"], [role="tooltip"], [role="alert"], [role="status"], [data-testid="browser-subagent-step"], [data-testid="plugin-card-fallback"]')) {
        return false;
    }
    // 1. Текст сообщений самого пользователя в чате
    if (pEl.closest('[data-testid="user-message-content"]')) {
        return true;
    }
    // 2. Пословные анимированные <span> потокового вывода агента (Gkc: animation: fade-in 0.2s ease-out ...ms both)
    if (pEl.tagName === 'SPAN') {
        const animStyle = (pEl.style && pEl.style.animation) || (pEl.getAttribute && pEl.getAttribute('style')) || '';
        if (animStyle.includes('fade-in')) {
            return true;
        }
    }
    // 3. Markdown-текст ответов агента, расшифровки голосового чата, открытые артефакты и markdown-ячейки ноутбуков
    const inChatOrDocMarkdown = pEl.closest('[data-testid="agent-response"], [data-bubble-side="agent"], [data-testid="voice-user-message"], [data-testid="voice-agent-message"], [data-print-root], .notebook-markdown-cell');
    if (inChatOrDocMarkdown) {
        if (pEl.closest('p, li, blockquote, th, td, h1[dir="auto"], h2[dir="auto"], h3[dir="auto"], h4[dir="auto"], h5[dir="auto"], h6[dir="auto"]')) {
            const ctxText = ((pEl.parentElement && pEl.parentElement.textContent) || pEl.textContent || '').toLowerCase();
            if (!ctxText.includes('troubleshooting_guide') && !ctxText.includes('troubleshooting guide')) {
                return true;
            }
        }
    }
    return false;
}

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

    const checkEl = (node.nodeType === 1 ? node : node.parentElement);
    const isPluginFrame = (typeof window !== 'undefined' && window.location && window.location.protocol === 'plugin:');
    const isInsideSwarmPostOrCode = !!(checkEl && typeof checkEl.closest === 'function' && checkEl.closest('.msg-body, pre, code, kbd, .code-block, .code-line, .line-content'));
    const isInsideCodeOrPre = !!(checkEl && typeof checkEl.closest === 'function' && checkEl.closest('code, pre, .code-block, .code-line, .line-content, .notebook-code-input, .notebook-code-outputs, [data-testid="background-task-command"], span.token'));

    const isPluginMarketplaceOverlay = !!(typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('marketplace=') && !(node.parentElement && typeof node.parentElement.closest === 'function' && node.parentElement.closest('.message-content, .message-text, .chat-output')));

    const isMatchSpecial = (val) => {
        if (!val) return false;
        if (!isInsideCodeOrPre && (val.includes(' ') || (isPluginFrame && !isInsideSwarmPostOrCode) || isPluginMarketplaceOverlay || (typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.startsWith('/customizations'))) && translationDictionary[val]) return true;
        return (
            /^\d+\s*(?:s|sec|m|min|h|hr|d|w|wk|mo|mos|yr|y)$/.test(val) ||
            /^\d+\s*(?:h|hr)\s+\d+\s*(?:m|min)$/.test(val) ||
            /^\d+\s*(?:m|min)\s+\d+\s*(?:s|sec)$/.test(val) ||
            /^\d+\s+pinned(?:\s+conversations?)?$/i.test(val) ||
            val === 'pinned' ||
            val === 'swarm' ||
            val === '🐝 swarm' ||
            val.startsWith('(preview & quota heavy)') ||
            val.startsWith('only for the native-swarm') ||
            val.startsWith('turn an idea into a website') ||
            val.startsWith('build a website for my project') ||
            val.startsWith('сборка a website for my project') ||
            val.startsWith('publish this dashboard') ||
            val.startsWith('update the content and design') ||
            val.startsWith('обновление the content and design') ||
            val.startsWith('apply a spacefast') ||
            val.startsWith('create and publish a new spacefast') ||
            val.startsWith('создать and publish a new spacefast') ||
            val.startsWith('создано and publish a new spacefast') ||
            val.startsWith('find, check, and register domains') ||
            val.startsWith('change the content, design, or source') ||
            val.startsWith('diagnose a failed spacefast') ||
            val.startsWith('save branding, design tokens') ||
            val.startsWith('check the spacefast connection') ||
            val.startsWith('проверка the spacefast connection') ||
            val.startsWith('change who can access a spacefast') ||
            val.startsWith('publish an existing website') ||
            val.startsWith('bring a named existing spacefast') ||
            val.startsWith('verify a spacefast source build') ||
            val.startsWith('проверка a spacefast source build') ||
            val.startsWith('develop an idea, improve a plan') ||
            val.startsWith('develop ideas') ||
            val.startsWith('bootstrap directory readme.md') ||
            val.startsWith('interactive ideation and brainstorming') ||
            val.startsWith('drafts a design document') ||
            val.startsWith('runs drift detection') ||
            val.startsWith('the elephant resolution skill') ||
            val.startsWith('orchestrates the egm') ||
            val.startsWith('executes the antagonistic-review') ||
            val.startsWith('query arize ax') ||
            val.startsWith('list my arize projects') ||
            val.startsWith('список my arize projects') ||
            val.startsWith('manages arize users') ||
            val.startsWith('creates, reads, updates') ||
            val.startsWith('creates and manages annotation') ||
            val.startsWith('invoke this skill') ||
            val.startsWith('creates, manages, and queries arize') ||
            val.startsWith('handles llm-as-judge') ||
            val.startsWith('creates, runs, and analyzes arize') ||
            val.startsWith('adds arize ax tracing') ||
            val.startsWith('audits instrumentation health') ||
            val.startsWith('generates deep links to the arize') ||
            val.startsWith('migrates llm observability') ||
            val.startsWith('migrate existing phoenix') ||
            val.startsWith('optimizes, improves, and debugs llm') ||
            val.startsWith('use when one python service') ||
            val.startsWith('downloads, exports, and inspects') ||
            val.startsWith('ai-powered code review') ||
            val.startsWith('use when the user asks for code review') ||
            val.startsWith('use when setting up coderabbit') ||
            val.startsWith('safely review and apply coderabbit') ||
            val.startsWith('run coderabbit cli reviews') ||
            val.startsWith('запуск coderabbit cli reviews') ||
            val.startsWith('create, update, or validate coderabbit') ||
            val.startsWith('создать, update, or validate coderabbit') ||
            val.startsWith('создано, update, or validate coderabbit') ||
            val.startsWith('keep your coding agent up to date') ||
            val.startsWith('build a chrome extension with a side panel') ||
            val.startsWith('сборка a chrome extension with a side panel') ||
            val.startsWith('investigate files, urls') ||
            val.startsWith('check a file i downloaded') ||
            val.startsWith('проверка a file i downloaded') ||
            val.startsWith('help me assess a suspicious link') ||
            val.startsWith('investigate an ip address') ||
            val.startsWith('no mcp servers found for') ||
            val.startsWith('there are currently no ') ||
            /^show\s+\d+\s+earlier\s+steps?$/i.test(val) ||
            /^\d+\s+comments?$/i.test(val) ||
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
            val.includes('subagents/tasks running') ||
            val.includes('subagent/task running') ||
            val.includes('task running') ||
            val.includes('tasks running') ||
            val.includes('subagent blocked') ||
            val.includes('subagents blocked') ||
            /^\d+\s+blocked$/i.test(val) ||
            val === 'stop' ||
            val === 'stop subagent' ||
            val === 'stop task' ||
            val === 'needs attention' ||
            val === 'started' ||
            val === 'starting' ||
            val === 'timed' ||
            val === 'timing' ||
            val.startsWith('timed ') ||
            val.startsWith('timing ') ||
            val === 'wait for' ||
            val === 'found' ||
            val.startsWith('found ') ||
            val === 'listing' ||
            val === 'defined' ||
            val.startsWith('defined ') ||
            val === 'defining' ||
            val.startsWith('defining ') ||
            val === 'messaged' ||
            val.startsWith('messaged ') ||
            val === 'messaging' ||
            val.startsWith('messaging ') ||
            val === 'killing' ||
            val.startsWith('killing ') ||
            val === 'killed' ||
            val.startsWith('killed ') ||
            val === 'scheduled' ||
            val.startsWith('scheduled ') ||
            val === 'asking' ||
            val.startsWith('asking ') ||
            val === 'asked' ||
            val.startsWith('asked ') ||
            val === 'timer has expired' ||
            val.startsWith('timer has expired') ||
            val.startsWith('cron trigger') ||
            /^cron\s*\(/i.test(val) ||
            val === 'every minute' ||
            val === 'every hour' ||
            val.startsWith('every hour ') ||
            val.startsWith('every hour,') ||
            val === 'custom schedule' ||
            /^every\s+\d+\s+(?:seconds?|minutes?|hours?|days?)/i.test(val) ||
            /^daily\s+at\s+\d/i.test(val) ||
            /^(?:weekdays|weekends|sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|(?:sun|mon|tue|wed|thu|fri|sat)\b.*)\s+at\s+\d/i.test(val) ||
            /^monthly\s+on\s+the\s+/i.test(val) ||
            /^next\s+run\s+(?:today|tomorrow|on\s+)/i.test(val) ||
            val === 'add terminal' ||
            val === 'close terminal' ||
            val === 'failed to create terminal' ||
            val.startsWith('failed to initialize terminal') ||
            val.startsWith('failed to delete terminal') ||
            val.startsWith('terminal sandbox is not supported') ||
            val.startsWith('requesting your permission in terminal') ||
            val === "don't enter corp passwords" ||
            val.startsWith('typing your corp password') ||
            val === 'password prompt blocked' ||
            val === 'allow next non-corp prompt' ||
            val === 'no active tasks.' ||
            val === 'no active tasks' ||
            val === 'no messages.' ||
            val === 'no messages in inbox.' ||
            val === 'no outputs.' ||
            val === 'wait cancelled.' ||
            val === 'questions cancelled.' ||
            val === 'checking command status' ||
            val === 'checked command status' ||
            val.startsWith('waiting for command completion') ||
            val === 'goal verification' ||
            val === 'idle guard warning' ||
            val === 'fork environment notice' ||
            val === 'system message' ||
            val === 'remote debugging required' ||
            val === 'browser configuration required' ||
            val.startsWith('to use browser tools') ||
            val.startsWith('chrome on the machine') ||
            val.startsWith('open google chrome') ||
            val === 'navigate to' ||
            val === 'enable' ||
            val.includes('allow remote debugging for this browser instance') ||
            val.startsWith('devtools port is still closed') ||
            val === 'proceed anyway' ||
            val === 'check again' ||
            val === 'проверка again' ||
            val === 'checking...' ||
            val === 'click to copy url' ||
            val === 'go to' ||
            val === 'enable best-of-2' ||
            val === 'full view' ||
            /^(?:\d+\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|mos|month|months|y|yr|yrs|year|years)|(?:a|an|a\s+few|several)\s+(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?))\s+ago$/i.test(val) ||
            val.includes('side question') ||
            /^question\s+\d+\s+of\s+\d+$/i.test(val) ||
            val === 'previous question' ||
            val === 'next question' ||
            val.startsWith('drag to resize') ||
            val.startsWith('user cancelled') ||
            val.startsWith('user canceled') ||
            val.startsWith('still thinking') ||
            val.startsWith('configure agent execution') ||
            /^turns?\s+\d+/i.test(val) ||
            /\b\d+\s+turns?$/i.test(val) ||
            /^\d+\s+of\s+\d+$/i.test(val) ||
            /^card\s+\d+\s+of\s+\d+$/i.test(val) ||
            /^step\s+\d+\s+of\s+\d+$/i.test(val) ||
            (val === 'of' && /^(?:(?:card|карточка|step|шаг|page|страница|question|вопрос|turn|ход)\s+)?\d+\s+of\s+\d+$/i.test(parentText.trim())) ||
            (val === 'card' && /(?:^|\s)(?:card|карточка)\s*\d+\s+(?:of|из)\s+\d+/i.test(fullContext)) ||
            (val === 'hold' && /(?:to upload|to add to agent|для загрузки|чтобы добавить)/i.test(fullContext)) ||
            val.startsWith('go to turn ') ||
            val === "couldn't load message" ||
            val === 'no message text' ||
            val === 'scroll turns up' ||
            val === 'scroll turns down' ||
            val === "turn on a flag you don't have" ||
            val === 'custom flag to turn on' ||
            val === '% left' ||
            val === 'refreshing...' ||
            val.startsWith('no quota information available') ||
            val.startsWith('search for files') ||
            val.startsWith('search files') ||
            val.startsWith('search for conversations') ||
            val.startsWith('search for commands') ||
            val.startsWith('search projects') ||
            val === 'code search' ||
            val === 'recent conversations' ||
            val === 'untitled conversation' ||
            val === 'command:' ||
            val.startsWith('disk is full.') ||
            val === 'only unread' ||
            val === 'only archived' ||
            val === 'only automations' ||
            val === 'only scheduled' ||
            val === 'sort conversations' ||
            val.startsWith('sort and filter conversations') ||
            /^show\s+\d+\s+more/i.test(val) ||
            ((val === 'show' || val === 'more...' || val === 'more…' || val === 'more') && /^(?:show|показать(?:\s+ещё)?)\s+\d+\s+(?:more(?:\.{3}|…)?|\.{3}|…)$/i.test(parentText.trim())) ||
            val === 'see less' ||
            val === 'see more...' ||
            val === 'see all' ||
            val === 'no results found' ||
            val === 'finalizing...' ||
            val === 'finalizing' ||
            val.startsWith('finalizing transcription') ||
            val.startsWith('sending transcribed message') ||
            val === 'record audio' ||
            val === 'stop recording' ||
            val === 'recording' ||
            val === 'stop recording and send' ||
            val === 'chief of staff voice mode is active' ||
            val.startsWith('voice recording is unavailable') ||
            val === 'send message' ||
            val.startsWith('send message ') ||
            val === 'queue message' ||
            val === 'send immediately' ||
            val === 'subagent conversation' ||
            val === 'subagent ended' ||
            val === 'loading subagent...' ||
            val === 'loading subagent' ||
            val === 'background task output' ||
            val === 'search for content to open' ||
            val === 'search results' ||
            val === 'no results' ||
            val.includes('tabs, files, extensions') ||
            /^(?:\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\s*)+timer\b/i.test(val) ||
            /^(?:(?:found|listing|killing|killed|started|starting|asking|asked|найдено|найден|найдена)\s+)?\d+\s+(?:subagents?|субагент(?:а|ов)?|tasks?|задач[аи]?|results?|результат(?:а|ов)?|questions?|вопрос(?:а|ов)?)(?:\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(val) ||
            /^(?:(?:defined|defining|killing|killed)\s+)?[a-z0-9_\-]+\s+subagent(?:\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(val) ||
            /^\d+\s+subagents?$/i.test(val) ||
            /^\d+(?:\.\d+)?\s*(?:s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)(?:\s+\d+(?:\.\d+)?\s*(?:s|sec|secs|m|min|mins|h|hr|hrs))?(?:\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(val) ||
            val.startsWith('lines ') ||
            val.startsWith('whitelist in') ||
            val.startsWith('regexTranslations for') ||
            val.startsWith('line ') ||
            val.startsWith('ran ') ||
            val.startsWith('run ') ||
            val.startsWith('running ') ||
            val.startsWith('started ') ||
            val.startsWith('starting ') ||
            val.startsWith('wants to run:') ||
            val === 'needs your approval' ||
            val === 'inspected commit' ||
            val.startsWith('captured dom tree') ||
            val.startsWith('fetched network request') ||
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
            /^\d+\s*(?:s|m|h|hr|hour|hours|d|day|days)[\s-]*limit$/i.test(val) ||
            /\blimit,\s*resets\s+in\b/i.test(val) ||
            /,\s*resets\s+in\s+(?:<\s*)?\d+\s*[smhd]/i.test(val) ||
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
            val.includes('leaving on ') ||
            val.includes('for better quality with lower quota usage') ||
            val.startsWith('the original gemini 4 model') ||
            val.startsWith('notice') ||
            val.startsWith('exploring files') ||
            val.startsWith('verify ') ||
            val.startsWith('start using gemini') ||
            val.startsWith('hey ') ||
            val.startsWith('hi ') ||
            val.startsWith('hello,') ||
            val.startsWith('hello ') ||
            val.startsWith('welcome back') ||
            val.startsWith('good to see you') ||
            val.startsWith('welcome to ') ||
            val === 'previous card' ||
            val === 'next card' ||
            val === 'dismiss tip' ||
            val === 'explore the plugin marketplace' ||
            val.startsWith('find plugins - bundles') ||
            val.startsWith('new models have been enabled') ||
            val === 'select a model in the model selector' ||
            val.startsWith('select model with ') ||
            val === 'agent said' ||
            val === 'you said' ||
            val === 'expand message' ||
            val === 'collapse message' ||
            val === 'to upload' ||
            val === 'to add to agent' ||
            val.startsWith('generation steps (') ||
            val.startsWith('show more (') ||
            val.startsWith('show submitted (') ||
            val.startsWith('swarm worker') ||
            val.startsWith('close swarm') ||
            val.includes('messages from board') ||
            val.includes('message from board') ||
            val.startsWith('board (') ||
            (isTroubleshootingSentence && (
                val === 'see our' ||
                val === 'see our:' ||
                val.startsWith('for more help') ||
                val.startsWith('see our')
            ))
        );
    };

    const isSpecialUiText = isMatchSpecial(textVal) || isMatchSpecial(ariaVal) || isMatchSpecial(titleVal) || isMatchSpecial(tooltipVal) || isMatchSpecial(placeholderVal);

    if (checkEl && typeof checkEl.closest === 'function') {
        if (checkEl.closest('#antigravity-topbar-controls, #antigravity-popup-backdrop, script, style, [contenteditable="true"], code, pre, .code-block, .code-line, .line-content, .notebook-code-input, .notebook-code-outputs, [data-testid="background-task-command"], span.token, .view-lines, .view-line, .margin-view-overlays, .minimap, .xterm, .terminal-container')) {
            return true;
        }
        // Защита терминальных команд внутри карточек run-command / terminal-card (не затрагивая кнопки и тултипы)
        if (
            !checkEl.closest('button, [role="button"], [role="tooltip"]') &&
            checkEl.closest('[class*="group/terminal-card"] .whitespace-pre-wrap.break-all, [class*="group/run-command"] .whitespace-pre-wrap.break-all')
        ) {
            return true;
        }
    }
    if (isProtectedChatOrDocProse(node)) {
        return true;
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

        // Защищаем код внутри <code>, <pre>, <kbd> от перевода компактных таймстемпов и содержимого в UI-плагинах
        if (tagName === 'CODE' || tagName === 'PRE' || tagName === 'KBD') {
            if (/^\d+\s*(?:s|sec|m|min|h|hr|d|w|wk|mo|mos|yr|y)$/i.test(textVal)) {
                return true;
            }
            if (isPluginFrame) {
                return true;
            }
        }

        // Всегда защищаем содержимое <code> и <pre> от перевода (например, version, mcp_config.json, assets/ в README)
        if (tagName === 'CODE' || tagName === 'PRE') {
            return true;
        }

        if (isPluginFrame && isStringClass && lowerClass.includes('msg-body')) {
            return true;
        }
        
        // 2. Белый список (White List) для интерфейса настроек, кнопок и модалок.
        // Переводим их сразу, даже если они внутри контейнера чата!
        if (
            (isPluginFrame && !isInsideSwarmPostOrCode) ||
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
                lowerClass.includes('footer') ||
                lowerClass.includes('agy-hover-label') ||
                lowerClass.includes('agy-aux-tab-title')
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
    if (parent && typeof parent.closest === 'function' && parent.closest('[data-testid="browser-subagent-step"]')) {
        return false;
    }
    if (parent) {
        let pWalk = parent;
        for (let d = 0; pWalk && d < 4; d++, pWalk = pWalk.parentElement) {
            const prevSib = pWalk.previousElementSibling;
            if (!prevSib) continue;
            const prevOrig = (prevSib.getAttribute && prevSib.getAttribute('data-original-text') || '').trim();
            const prevTxt = (prevSib.textContent || '').trim();
            if (/^(?:Ran|Running|Killed\s+task|Killing\s+task|Stopped\s+task|Checked\s+task|Checking\s+task|Запущено:?|Выполнено:?|Выполняется:?|Задача\s+остановлена:?)$/i.test(prevOrig) ||
                /^(?:Ran|Running|Killed\s+task|Killing\s+task|Stopped\s+task|Checked\s+task|Checking\s+task|Запущено:?|Выполнено:?|Выполняется:?|Задача\s+остановлена:?)$/i.test(prevTxt)) {
                return false;
            }
        }
    }
    if (parent && typeof parent.className === 'string' && text.trim().includes(' ')) {
        if ((parent.className.includes('agy-hover-label') && parent.className.includes('font-mono')) || parent.className.includes('agy-aux-tab-title')) {
            return false;
        }
    }
    const trimmed = text.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    const inCode = !!(parent && typeof parent.closest === 'function' && parent.closest('code, pre'));
    const inChatMsg = !!(parent && typeof parent.closest === 'function' && parent.closest('.message-content, .message-text, .chat-output'));
    if (!inCode && (lowerTrimmed.includes(' ') || (typeof window !== 'undefined' && window.location && ((window.location.pathname && window.location.pathname.startsWith('/customizations')) || (!inChatMsg && window.location.search && window.location.search.includes('marketplace='))))) && translationDictionary[lowerTrimmed]) return false;
    
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
        lowerTrimmed.includes('subagents/tasks running') ||
        lowerTrimmed.includes('subagent/task running') ||
        lowerTrimmed.includes('task running') ||
        lowerTrimmed.includes('tasks running') ||
        lowerTrimmed.includes('subagent blocked') ||
        lowerTrimmed.includes('subagents blocked') ||
        /^\d+\s+blocked$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'stop' ||
        lowerTrimmed === 'stop subagent' ||
        lowerTrimmed === 'stop task' ||
        lowerTrimmed === 'needs attention' ||
        lowerTrimmed === 'needs your approval' ||
        lowerTrimmed === 'started' ||
        lowerTrimmed === 'starting' ||
        lowerTrimmed.startsWith('started ') ||
        lowerTrimmed.startsWith('starting ') ||
        lowerTrimmed.startsWith('wants to run:') ||
        lowerTrimmed === 'timed' ||
        lowerTrimmed === 'timing' ||
        lowerTrimmed.startsWith('timed ') ||
        lowerTrimmed.startsWith('timing ') ||
        lowerTrimmed === 'wait for' ||
        lowerTrimmed === 'found' ||
        lowerTrimmed.startsWith('found ') ||
        lowerTrimmed === 'listing' ||
        lowerTrimmed === 'defined' ||
        lowerTrimmed.startsWith('defined ') ||
        lowerTrimmed === 'defining' ||
        lowerTrimmed.startsWith('defining ') ||
        lowerTrimmed === 'messaged' ||
        lowerTrimmed.startsWith('messaged ') ||
        lowerTrimmed === 'messaging' ||
        lowerTrimmed.startsWith('messaging ') ||
        lowerTrimmed === 'killing' ||
        lowerTrimmed.startsWith('killing ') ||
        lowerTrimmed === 'killed' ||
        lowerTrimmed.startsWith('killed ') ||
        lowerTrimmed === 'scheduled' ||
        lowerTrimmed.startsWith('scheduled ') ||
        lowerTrimmed === 'asking' ||
        lowerTrimmed.startsWith('asking ') ||
        lowerTrimmed === 'asked' ||
        lowerTrimmed.startsWith('asked ') ||
        lowerTrimmed === 'timer has expired' ||
        lowerTrimmed.startsWith('timer has expired') ||
        lowerTrimmed.startsWith('cron trigger') ||
        /^cron\s*\(/i.test(lowerTrimmed) ||
        lowerTrimmed === 'every minute' ||
        lowerTrimmed === 'every hour' ||
        lowerTrimmed.startsWith('every hour ') ||
        lowerTrimmed.startsWith('every hour,') ||
        lowerTrimmed === 'custom schedule' ||
        /^every\s+\d+\s+(?:seconds?|minutes?|hours?|days?)/i.test(lowerTrimmed) ||
        /^daily\s+at\s+\d/i.test(lowerTrimmed) ||
        /^(?:weekdays|weekends|sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|(?:sun|mon|tue|wed|thu|fri|sat)\b.*)\s+at\s+\d/i.test(lowerTrimmed) ||
        /^monthly\s+on\s+the\s+/i.test(lowerTrimmed) ||
        /^next\s+run\s+(?:today|tomorrow|on\s+)/i.test(lowerTrimmed) ||
        lowerTrimmed === 'no active tasks.' ||
        lowerTrimmed === 'no active tasks' ||
        lowerTrimmed === 'no messages.' ||
        lowerTrimmed === 'no messages in inbox.' ||
        lowerTrimmed === 'no outputs.' ||
        lowerTrimmed === 'wait cancelled.' ||
        lowerTrimmed === 'questions cancelled.' ||
        lowerTrimmed === 'checking command status' ||
        lowerTrimmed === 'checked command status' ||
        lowerTrimmed.startsWith('waiting for command completion') ||
        lowerTrimmed === 'goal verification' ||
        lowerTrimmed === 'idle guard warning' ||
        lowerTrimmed === 'fork environment notice' ||
        lowerTrimmed === 'system message' ||
        lowerTrimmed === 'remote debugging required' ||
        lowerTrimmed === 'browser configuration required' ||
        lowerTrimmed.startsWith('to use browser tools') ||
        lowerTrimmed.startsWith('chrome on the machine') ||
        lowerTrimmed.startsWith('open google chrome') ||
        lowerTrimmed === 'navigate to' ||
        lowerTrimmed === 'enable' ||
        lowerTrimmed.includes('allow remote debugging for this browser instance') ||
        lowerTrimmed.startsWith('devtools port is still closed') ||
        lowerTrimmed === 'proceed anyway' ||
        lowerTrimmed === 'check again' ||
        lowerTrimmed === 'проверка again' ||
        lowerTrimmed === 'checking...' ||
        lowerTrimmed === 'click to copy url' ||
        lowerTrimmed === 'go to' ||
        lowerTrimmed === 'enable best-of-2' ||
        lowerTrimmed === 'full view' ||
        /^(?:\d+\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|mos|month|months|y|yr|yrs|year|years)|(?:a|an|a\s+few|several)\s+(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?))\s+ago$/i.test(lowerTrimmed) ||
        lowerTrimmed.includes('side question') ||
        /^question\s+\d+\s+of\s+\d+$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'previous question' ||
        lowerTrimmed === 'next question' ||
        lowerTrimmed.startsWith('drag to resize') ||
        lowerTrimmed.startsWith('user cancelled') ||
        lowerTrimmed.startsWith('user canceled') ||
        lowerTrimmed.startsWith('still thinking') ||
        lowerTrimmed.startsWith('configure agent execution') ||
        /^turns?\s+\d+/i.test(lowerTrimmed) ||
        /\b\d+\s+turns?$/i.test(lowerTrimmed) ||
        /^\d+\s+of\s+\d+$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'of' ||
        lowerTrimmed.startsWith('go to turn ') ||
        lowerTrimmed === "couldn't load message" ||
        lowerTrimmed === 'no message text' ||
        lowerTrimmed === 'scroll turns up' ||
        lowerTrimmed === 'scroll turns down' ||
        lowerTrimmed === "turn on a flag you don't have" ||
        lowerTrimmed === 'custom flag to turn on' ||
        lowerTrimmed === '% left' ||
        lowerTrimmed === 'refreshing...' ||
        lowerTrimmed.startsWith('no quota information available') ||
        lowerTrimmed.startsWith('search for files') ||
        lowerTrimmed.startsWith('search files') ||
        lowerTrimmed.startsWith('search for conversations') ||
        lowerTrimmed.startsWith('search for commands') ||
        lowerTrimmed.startsWith('search projects') ||
        lowerTrimmed === 'code search' ||
        lowerTrimmed === 'recent conversations' ||
        lowerTrimmed === 'untitled conversation' ||
        lowerTrimmed === 'command:' ||
        lowerTrimmed.startsWith('disk is full.') ||
        lowerTrimmed === 'only unread' ||
        lowerTrimmed === 'only archived' ||
        lowerTrimmed === 'only automations' ||
        lowerTrimmed === 'only scheduled' ||
        lowerTrimmed === 'sort conversations' ||
        lowerTrimmed.startsWith('sort and filter conversations') ||
        /^show\s+\d+\s+more/i.test(lowerTrimmed) ||
        lowerTrimmed === 'show' ||
        lowerTrimmed === 'more...' ||
        lowerTrimmed === 'more…' ||
        lowerTrimmed === 'more' ||
        lowerTrimmed === 'see less' ||
        lowerTrimmed === 'see more...' ||
        lowerTrimmed === 'see all' ||
        lowerTrimmed === 'no results found' ||
        lowerTrimmed === 'finalizing...' ||
        lowerTrimmed === 'finalizing' ||
        lowerTrimmed.startsWith('finalizing transcription') ||
        lowerTrimmed.startsWith('sending transcribed message') ||
        lowerTrimmed === 'record audio' ||
        lowerTrimmed === 'stop recording' ||
        lowerTrimmed === 'recording' ||
        lowerTrimmed === 'stop recording and send' ||
        lowerTrimmed === 'chief of staff voice mode is active' ||
        lowerTrimmed.startsWith('voice recording is unavailable') ||
        lowerTrimmed === 'send message' ||
        lowerTrimmed.startsWith('send message ') ||
        lowerTrimmed === 'queue message' ||
        lowerTrimmed === 'send immediately' ||
        lowerTrimmed === 'subagent conversation' ||
        lowerTrimmed === 'subagent ended' ||
        lowerTrimmed === 'loading subagent...' ||
        lowerTrimmed === 'loading subagent' ||
        lowerTrimmed === 'background task output' ||
        lowerTrimmed === 'search for content to open' ||
        lowerTrimmed === 'search results' ||
        lowerTrimmed === 'no results' ||
        /^(?:\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\s*)+timer\b/i.test(lowerTrimmed) ||
        /^(?:(?:found|listing|killing|killed|started|starting|asking|asked|найдено|найден|найдена)\s+)?\d+\s+(?:subagents?|субагент(?:а|ов)?|tasks?|задач[аи]?|results?|результат(?:а|ов)?|questions?|вопрос(?:а|ов)?)(?:\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(lowerTrimmed) ||
        /^(?:(?:defined|defining|killing|killed)\s+)?[a-z0-9_\-]+\s+subagent(?:\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(lowerTrimmed) ||
        /^\d+\s+subagents?$/i.test(lowerTrimmed) ||
        /^\d+(?:\.\d+)?\s*(?:s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)(?:\s+\d+(?:\.\d+)?\s*(?:s|sec|secs|m|min|mins|h|hr|hrs))?(?:\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(lowerTrimmed) ||
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
        lowerTrimmed.endsWith(' toolchain') ||
        lowerTrimmed === 'fill' ||
        lowerTrimmed === 'verbose' ||
        lowerTrimmed === 'middle click' ||
        lowerTrimmed === 'tokens)' ||
        lowerTrimmed === 'token)' ||
        lowerTrimmed === 'domains:' ||
        lowerTrimmed === 'loading app...' ||
        lowerTrimmed === 'fix with agent' ||
        lowerTrimmed.startsWith('fix with agent:') ||
        lowerTrimmed === 'change\u2026' ||
        lowerTrimmed === 'change...' ||
        lowerTrimmed === 'hello.' ||
        lowerTrimmed.startsWith('hi ') ||
        lowerTrimmed.startsWith('hey ') ||
        lowerTrimmed.startsWith('hello, ') ||
        lowerTrimmed.startsWith('hello ') ||
        lowerTrimmed.startsWith('welcome back') ||
        lowerTrimmed.startsWith('welcome to ') ||
        lowerTrimmed.startsWith('good to see you') ||
        lowerTrimmed === 'previous card' ||
        lowerTrimmed === 'next card' ||
        lowerTrimmed === 'card' ||
        lowerTrimmed === 'hold' ||
        lowerTrimmed === 'dismiss tip' ||
        lowerTrimmed === 'explore the plugin marketplace' ||
        lowerTrimmed.startsWith('find plugins - bundles') ||
        lowerTrimmed.startsWith('new models have been enabled') ||
        lowerTrimmed === 'select a model in the model selector' ||
        lowerTrimmed.startsWith('select model with ') ||
        lowerTrimmed === 'agent said' ||
        lowerTrimmed === 'you said' ||
        lowerTrimmed === 'expand message' ||
        lowerTrimmed === 'collapse message' ||
        lowerTrimmed === 'to upload' ||
        lowerTrimmed === 'to add to agent' ||
        lowerTrimmed.startsWith('generation steps (') ||
        lowerTrimmed.startsWith('show more (') ||
        lowerTrimmed.startsWith('show submitted (') ||
        lowerTrimmed.startsWith('swarm worker') ||
        lowerTrimmed.startsWith('close swarm') ||
        lowerTrimmed.includes('messages from board') ||
        lowerTrimmed.includes('message from board') ||
        lowerTrimmed.startsWith('board (') ||
        /^card\s+\d+\s+of\s+\d+$/i.test(lowerTrimmed) ||
        /^step\s+\d+\s+of\s+\d+$/i.test(lowerTrimmed) ||
        /^\d+\s*(?:s|sec|m|min|h|hr|d|w|wk|mo|mos|yr|y)$/i.test(lowerTrimmed) ||
        /^\d+\s+pinned(?:\s+conversations?)?$/i.test(lowerTrimmed) ||
        lowerTrimmed === 'pinned' ||
        lowerTrimmed === 'swarm' ||
        lowerTrimmed === '🐝 swarm' ||
        lowerTrimmed.startsWith('(preview & quota heavy)') ||
        lowerTrimmed.startsWith('only for the native-swarm') ||
        lowerTrimmed.startsWith('turn an idea into a website') ||
        lowerTrimmed.startsWith('build a website for my project') ||
        lowerTrimmed.startsWith('сборка a website for my project') ||
        lowerTrimmed.startsWith('publish this dashboard') ||
        lowerTrimmed.startsWith('update the content and design') ||
        lowerTrimmed.startsWith('обновление the content and design') ||
        lowerTrimmed.startsWith('apply a spacefast') ||
        lowerTrimmed.startsWith('create and publish a new spacefast') ||
        lowerTrimmed.startsWith('создать and publish a new spacefast') ||
        lowerTrimmed.startsWith('создано and publish a new spacefast') ||
        lowerTrimmed.startsWith('find, check, and register') ||
        lowerTrimmed.startsWith('change the content, design') ||
        lowerTrimmed.startsWith('diagnose a failed spacefast') ||
        lowerTrimmed.startsWith('save branding, design tokens') ||
        lowerTrimmed.startsWith('check the spacefast connection') ||
        lowerTrimmed.startsWith('проверка the spacefast connection') ||
        lowerTrimmed.startsWith('change who can access') ||
        lowerTrimmed.startsWith('publish an existing website') ||
        lowerTrimmed.startsWith('bring a named existing') ||
        lowerTrimmed.startsWith('verify a spacefast') ||
        lowerTrimmed.startsWith('проверка a spacefast') ||
        lowerTrimmed.startsWith('develop an idea') ||
        lowerTrimmed.startsWith('develop ideas') ||
        lowerTrimmed.startsWith('bootstrap directory') ||
        lowerTrimmed.startsWith('interactive ideation') ||
        lowerTrimmed.startsWith('drafts a design document') ||
        lowerTrimmed.startsWith('runs drift detection') ||
        lowerTrimmed.startsWith('the elephant resolution') ||
        lowerTrimmed.startsWith('orchestrates the egm') ||
        lowerTrimmed.startsWith('executes the antagonistic-review') ||
        lowerTrimmed.startsWith('query arize ax') ||
        lowerTrimmed.startsWith('manages arize') ||
        lowerTrimmed.startsWith('creates,') ||
        lowerTrimmed.startsWith('creates and manages') ||
        lowerTrimmed.startsWith('invoke this skill') ||
        lowerTrimmed.startsWith('handles llm-as-judge') ||
        lowerTrimmed.startsWith('adds arize ax') ||
        lowerTrimmed.startsWith('audits instrumentation') ||
        lowerTrimmed.startsWith('generates deep links') ||
        lowerTrimmed.startsWith('migrates llm observability') ||
        lowerTrimmed.startsWith('migrate existing phoenix') ||
        lowerTrimmed.startsWith('optimizes, improves') ||
        lowerTrimmed.startsWith('use when ') ||
        lowerTrimmed.startsWith('downloads, exports') ||
        lowerTrimmed.startsWith('ai-powered code review') ||
        lowerTrimmed.startsWith('safely review and apply') ||
        lowerTrimmed.startsWith('run coderabbit') ||
        lowerTrimmed.startsWith('запуск coderabbit') ||
        lowerTrimmed.startsWith('create, update, or validate') ||
        lowerTrimmed.startsWith('создать, update, or validate') ||
        lowerTrimmed.startsWith('создано, update, or validate') ||
        lowerTrimmed.startsWith('keep your coding agent') ||
        lowerTrimmed.startsWith('investigate ') ||
        lowerTrimmed.startsWith('help me ') ||
        lowerTrimmed.startsWith('open this pane from a conversation') ||
        lowerTrimmed.startsWith('swarms started in this conversation') ||
        lowerTrimmed.includes('what can we get done') ||
        lowerTrimmed.startsWith('settings for ') ||
        lowerTrimmed.startsWith('agent settings and permissions for ') ||
        lowerTrimmed.startsWith('manage ') ||
        lowerTrimmed.startsWith('run zoho books') ||
        lowerTrimmed.startsWith('запуск zoho books') ||
        lowerTrimmed.startsWith('run a query against') ||
        lowerTrimmed.startsWith('запуск a query against') ||
        lowerTrimmed.startsWith('check the health of') ||
        lowerTrimmed.startsWith('check the confirmation box') ||
        lowerTrimmed.startsWith('runs one read-only sql') ||
        lowerTrimmed.startsWith('ask a question of the live web') ||
        lowerTrimmed.startsWith('connect to your managed looker') ||
        lowerTrimmed.startsWith('connect antigravity to your managed') ||
        lowerTrimmed.startsWith('1. register the oauth') ||
        lowerTrimmed.startsWith('2. enable and authenticate') ||
        lowerTrimmed.startsWith('looker developer onboarding') ||
        lowerTrimmed.startsWith('guide for connecting to and using the looker') ||
        lowerTrimmed.startsWith('master developer skill for auditing') ||
        lowerTrimmed.startsWith('use this skill') ||
        lowerTrimmed.startsWith('overview of lookml') ||
        lowerTrimmed.startsWith('guidelines for lookml') ||
        lowerTrimmed.startsWith('deep dive into lookml') ||
        lowerTrimmed.startsWith('guide to using lookml') ||
        lowerTrimmed.startsWith('standards and best practices for writing lookml') ||
        lowerTrimmed === '188 real-world developer use cases' ||
        lowerTrimmed === 'origin trial opt-in gate'
    ) {
        return false;
    }
    
    // Исключения: фразы с пробелами, содержащие email или известные глаголы интерфейса — не имена файлов!
    if (trimmed.includes(' ')) {
        if (/@/.test(trimmed) || /^(?:\d+\s*h\s+limit|\d+(?:[.,]\d+)?%\s+left|create\s+(?:a|an)\s+|no\s+extensions\s+available|customize\s+sections|modified\s+files|open\s+file|select\s+folder|поиск\s+tabs|auto\s*\(preview\)|automatically\s+decide|enter\s+tool\s+name|give\s+feedback|проверка\s+|enable\s+(?:notifications|sounds)\s+for\s+agent|manage\s+your\s+notification|show\s+system\s+notifications|play\s+a\s+sound|set\s+the\s+volume)\b/i.test(trimmed) || /for\s+commands/i.test(trimmed) || /conversations\s+with/i.test(trimmed) || /\(.*?menu\)/i.test(trimmed) || /^created\s+/i.test(trimmed) || /^creating\s+/i.test(trimmed) || /^(?:canceled|cancelled)\s+/i.test(trimmed) || /^plan\s+carefully/i.test(trimmed) || /^invoke\s+the\s+boost/i.test(trimmed) || /^compact\s+the\s+conversation/i.test(trimmed) || /^assign\s+github\s+coding/i.test(trimmed) || /^create\s+an\s+issue/i.test(trimmed) || /^ask\s+a\s+quick\s+question/i.test(trimmed) || /^interview\s+me/i.test(trimmed) || /^invoke\s+a\s+(?:browser|team)/i.test(trimmed) || /^reflect\s+on\s+recent/i.test(trimmed) || /^uses\s+chrome\s+devtools/i.test(trimmed) || /^interactive\s+guide/i.test(trimmed) || /^guides\s+debugging/i.test(trimmed) || /^diagnoses\s+and\s+resolves/i.test(trimmed) || /^(?:search|поиск)\s+tool\s+for\s+modern/i.test(trimmed) || /^(?:build|сборка)\s+and\s+publish/i.test(trimmed) || /^comprehensive\s+guide/i.test(trimmed) || /^provides\s+a\s+comprehensive/i.test(trimmed) || /^how\s+to\s+render\s+rich/i.test(trimmed) || /^design,\s*implement/i.test(trimmed) || /^automatically\s+migrate/i.test(trimmed) || /^guidelines\s+for\s+interacting/i.test(trimmed) || /^how\s+to\s+manage\s+and\s+create/i.test(trimmed) || /^how\s+to\s+write\s+and\s+run/i.test(trimmed) || /^discover\s+ui\s+plugin/i.test(trimmed) || /^inspecting\s+/i.test(trimmed) || /^extracting\s+/i.test(trimmed) || /^listing\s+/i.test(trimmed) || /^reading\s+/i.test(trimmed) || /^testing\s+/i.test(trimmed) || /^searching\s+/i.test(trimmed) || /^checking\s+/i.test(trimmed) || /^updating\s+/i.test(trimmed) || /^updated\s+/i.test(trimmed) || /^update\s+/i.test(trimmed) || /^upgrading\s+/i.test(trimmed) || /^viewing\s+/i.test(trimmed) || /^message\s+from\s+/i.test(trimmed) || /^compacting/i.test(trimmed) || /^mark\s+all\s+as\s+read/i.test(trimmed) || /^this\s+page\s+is\s+going/i.test(trimmed) || /^toggle\s+maximize/i.test(trimmed) || /^toggle\s+overview/i.test(trimmed) || /^sincpro\s+/i.test(trimmed) || /^reverting\s+/i.test(trimmed) || /^downloading\s+/i.test(trimmed) || /^github\s+actions/i.test(trimmed) || /^untracked\s+/i.test(trimmed) || /^consilium\s+/i.test(trimmed) || /^schema\s+/i.test(trimmed) || /^contract\s+/i.test(trimmed) || /^validator\s+/i.test(trimmed) || /^dispatch_cli\s+/i.test(trimmed) || /^git\s+pickaxe/i.test(trimmed) || /\s+stat$/i.test(trimmed) || /\s+help$/i.test(trimmed) || /\s+body$/i.test(trimmed) || /\s+toolchain$/i.test(trimmed) || /^edited\s+/i.test(trimmed) || /^editing\s+/i.test(trimmed) || /^build\s+/i.test(trimmed) || /^building\s+/i.test(trimmed) || /^clear\s+/i.test(trimmed) || /^clearing\s+/i.test(trimmed) || /^push\s+/i.test(trimmed) || /^pushing\s+/i.test(trimmed) || /^killed\s+task/i.test(trimmed) || /^cancel\s+task/i.test(trimmed) || /^stop\s+recording/i.test(trimmed) || /^approve\s+/i.test(trimmed) || /^approved\s+/i.test(trimmed) || /^execute\s+/i.test(trimmed) || /^executed\s+/i.test(trimmed) || /^see\s+plans/i.test(trimmed) || /^enable\s+overages/i.test(trimmed) || /^explored\s+/i.test(trimmed) || /^ran\s+/i.test(trimmed) || /^run\s+/i.test(trimmed) || /^running\s+/i.test(trimmed) || /^view\s+/i.test(trimmed) || /^test\s+/i.test(trimmed) || /^commands/i.test(trimmed) || /^close\s+tab/i.test(trimmed) || /^split\s+/i.test(trimmed) || /^open\s+/i.test(trimmed) || /^collapse\s+/i.test(trimmed) || /^expand\s+/i.test(trimmed) || /^unpin\s+/i.test(trimmed) || /^pin\s+/i.test(trimmed) || /^rename\s+/i.test(trimmed) || /^archive\s+/i.test(trimmed) || /^download\s+/i.test(trimmed) || /^toggle\s+/i.test(trimmed) || /^next\s+aux/i.test(trimmed) || /^previous\s+aux/i.test(trimmed) || /^send\s+feedback/i.test(trimmed) || /^this\s+conversation/i.test(trimmed) || /^visit\s+/i.test(trimmed) || /^the\s+canva/i.test(trimmed) || /^our\s+servers/i.test(trimmed) || /^error\s+/i.test(trimmed) || /^model\s+unavailable/i.test(trimmed) || /^agent\s+execution/i.test(trimmed) || /^working/i.test(trimmed) || /^worked\s+for/i.test(trimmed) || /^copy/i.test(trimmed) || /^select\s+all/i.test(trimmed) || /files?\s+changed/i.test(trimmed) || /^(good|bad)\s+response/i.test(trimmed) || / finished$/i.test(trimmed) || /^the\s+subagent/i.test(trimmed) || /^failed_precondition/i.test(trimmed) || /architect\s+session/i.test(trimmed) || /^thought\s+for/i.test(trimmed) || /^thinking\s+for/i.test(trimmed) || /^exploring\s+/i.test(trimmed) || /^analyzed\s+/i.test(trimmed) || /^automations/i.test(trimmed) || /marketplace/i.test(trimmed) || /pane$/i.test(trimmed) || /^\+\s*create/i.test(trimmed) || /baseline quota/i.test(trimmed) || /ai credit overages/i.test(trimmed) || /all automations run/i.test(trimmed) || /google workspace/i.test(trimmed) || /custom agents/i.test(trimmed) || /skills & rules/i.test(trimmed) || /mcp servers/i.test(trimmed) || /^search\s+/i.test(trimmed) || /^inspect\s+/i.test(trimmed) || /^compare\s+/i.test(trimmed) || /^restore\s+/i.test(trimmed) || /^check\s+/i.test(trimmed) || /^checked\s+task/i.test(trimmed) || /^select\s+project/i.test(trimmed) || /^leaving\s+soon/i.test(trimmed) || /^notice/i.test(trimmed) || /^verify\s+/i.test(trimmed) || /^start\s+/i.test(trimmed) || /^stop\s+/i.test(trimmed) || /^restart\s+/i.test(trimmed) || /^re-?run\s+/i.test(trimmed) || /^lint\s+/i.test(trimmed) || /^type[\s-]?check\s+/i.test(trimmed) || /^format\s+/i.test(trimmed) || /^compile\s+/i.test(trimmed) || /^patch\s+/i.test(trimmed) || /^fix\s+/i.test(trimmed) || /^clean\s+/i.test(trimmed) || /^install\s+/i.test(trimmed) || /^deploy\s+/i.test(trimmed) || /^commit\s+/i.test(trimmed) || /^stage\s+/i.test(trimmed) || /^validate\s+/i.test(trimmed) || /^audit\s+/i.test(trimmed) || /^analyze\s+/i.test(trimmed) || /^started\s+/i.test(trimmed) || /^starting\s+/i.test(trimmed) || /^wants\s+to\s+run:/i.test(trimmed)) {
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

const STEP_PREFIX_EXACT_RE = /^(?:Ran|Running|Killed\s+task|Killing\s+task|Stopped\s+task|Checked\s+task|Checking\s+task|Sent\s+input\s+to\s+task|Sending\s+input\s+to\s+task|Запущено:?|Выполнено:?|Выполняется:?|Задача\s+остановлена:?|Завершена\s+задача:?|Остановка\s+задачи:?|Задача\s+проверена:?|Проверена\s+задача:?|Проверка\s+задачи:?|Ввод\s+отправлен\s+в\s+задачу:?|Отправка\s+ввода\s+в\s+задачу:?)$/i;

function hasFollowingStepTarget(node, normalizedPrefix) {
    if (!node || !normalizedPrefix) return false;
    const pEl = node.parentElement;
    if (!pEl) return false;
    const pClass = (typeof pEl.className === 'string' ? pEl.className : '').toLowerCase();
    if (/\b(?:badge|pill|rounded-full|status-badge|chip)\b/.test(pClass)) return false;

    const escaped = normalizedPrefix.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    const rowStartRe = new RegExp('^' + escaped + '\\s+(.+)$', 'i');

    const candidates = [];
    let cur = pEl;
    for (let d = 0; cur && d < 6; d++, cur = cur.parentElement) {
        candidates.push(cur);
    }
    for (let i = 0; i < candidates.length; i++) {
        const container = candidates[i];
        const cTxt = (container.textContent || '').replace(/[\s\u00a0\r\n\t]+/g, ' ').trim();
        if (!cTxt || cTxt.length > 260) continue;
        const m = cTxt.match(rowStartRe);
        if (m) {
            const rem = m[1].replace(/[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»↺↻⟳⟲·•]/g, '').trim();
            if (rem.length >= 2) {
                const directChild = i > 0 ? candidates[i - 1] : pEl;
                const nextEl = directChild && directChild.nextElementSibling;
                if (nextEl && nextEl.tagName === 'BUTTON') return false;
                return true;
            }
        }
    }
    return false;
}

function getPrecedingStepPrefix(node, normalizedTarget) {
    if (!node || !normalizedTarget) return null;
    const pEl = node.parentElement;
    const prevCandidates = [node.previousSibling];
    let walkEl = pEl;
    for (let d = 0; walkEl && d < 5; d++, walkEl = walkEl.parentElement) {
        if (walkEl.previousElementSibling) {
            prevCandidates.push(walkEl.previousElementSibling);
        }
    }
    for (const prev of prevCandidates) {
        if (!prev) continue;
        const orig = (prev.getAttribute && prev.getAttribute('data-original-text') || '').trim();
        const txt = (prev.textContent || prev.nodeValue || '').trim();
        if (STEP_PREFIX_EXACT_RE.test(orig) || STEP_PREFIX_EXACT_RE.test(txt)) {
            return txt || orig;
        }
    }
    // Also check if compact row container starts with "<stepPrefix> <normalizedTarget>"
    const containers = [];
    let cWalk = pEl;
    for (let d = 0; cWalk && d < 6; d++, cWalk = cWalk.parentElement) {
        containers.push(cWalk);
    }
    for (const c of containers) {
        const cTxt = (c.textContent || '').replace(/[\s\u00a0\r\n\t]+/g, ' ').trim();
        if (!cTxt || cTxt.length > 260) continue;
        const m = cTxt.match(/^(Ran|Running|Killed\s+task|Killing\s+task|Stopped\s+task|Checked\s+task|Checking\s+task|Sent\s+input\s+to\s+task|Sending\s+input\s+to\s+task|Запущено:?|Выполнено:?|Выполняется:?|Задача\s+остановлена:?|Завершена\s+задача:?|Остановка\s+задачи:?|Задача\s+проверена:?|Проверена\s+задача:?|Проверка\s+задачи:?)\s+(.+)$/i);
        if (m) {
            const afterPrefix = m[2].trim();
            if (afterPrefix === normalizedTarget || afterPrefix.startsWith(normalizedTarget + ' ') || afterPrefix.startsWith(normalizedTarget + '·')) {
                return m[1];
            }
        }
    }
    return null;
}

function translateTextNode(node) {
    try {
        if (isEnglishMode()) return;
        if (node.nodeType !== Node.TEXT_NODE) return;
        const pElFast = node.parentElement;
        if (pElFast && typeof pElFast.closest === 'function') {
            if (pElFast.closest('#antigravity-topbar-controls, #antigravity-popup-backdrop, script, style, [contenteditable="true"], code, pre, .code-block, .code-line, .line-content, .notebook-code-input, .notebook-code-outputs, [data-testid="background-task-command"], span.token, .view-lines, .view-line, .margin-view-overlays, .minimap, .xterm, .terminal-container')) {
                return;
            }
            if (
                !pElFast.closest('button, [role="button"], [role="tooltip"]') &&
                pElFast.closest('[class*="group/terminal-card"] .whitespace-pre-wrap.break-all, [class*="group/run-command"] .whitespace-pre-wrap.break-all')
            ) {
                return;
            }
        }
        if (isProtectedChatOrDocProse(node)) return;

        const text = node.nodeValue;
        const normalized = text.replace(/[\s\u00a0\xa0\u2007\u202f\r\n\t]+/g, ' ').trim();
        if (!normalized) return;
        
        if (isFileName(normalized, node.parentElement)) return;
        
        const lowerText = normalized.toLowerCase();
        let translated = null;

        // Защита от перевода имён файлов-ссылок вроде [LICENSE](LICENSE) и коротких inline-тегов внутри непереведённого английского абзаца
        const pEl = node.parentElement;
        const pTag = pEl ? pEl.tagName : '';
        if (pTag === 'A' && /^LICENSE(?:\.[A-Z]+)?$/i.test(normalized) && (normalized === 'LICENSE' || (pEl.getAttribute && (pEl.getAttribute('href') || '').toUpperCase().includes('LICENSE')))) {
            return;
        }
        if ((pTag === 'A' || pTag === 'STRONG' || pTag === 'B' || pTag === 'EM' || pTag === 'SPAN') && typeof pEl.closest === 'function') {
            const proseContainer = pEl.closest('p, li');
            if (proseContainer && proseContainer !== pEl) {
                const encText = (proseContainer.textContent || '').trim();
                const isProse = proseContainer.tagName === 'P' || /[a-z][.!?]$/.test(encText);
                const wordCount = normalized.split(/\s+/).length;
                const encWordCount = encText.split(/\s+/).length;
                if (isProse && !/[а-яА-ЯёЁ]/.test(encText) && wordCount <= 2 && encWordCount >= 5) {
                    return;
                }
                // Защита одиночного <span>-слова (например, пословного рендера Gkc) внутри смешанного русско-английского предложения вне страниц плагинов
                const isPluginPageCtx = !!(typeof window !== 'undefined' && window.location && (
                    (window.location.pathname && window.location.pathname.startsWith('/customizations')) ||
                    (window.location.search && window.location.search.includes('marketplace='))
                ));
                if (!isPluginPageCtx && pTag === 'SPAN' && !(pEl.className && String(pEl.className).trim()) && wordCount === 1 && encWordCount >= 4) {
                    return;
                }
            }
        }

        const parentText = (pEl ? (pEl.textContent || '') : '').toLowerCase();
        const grandParentText = (pEl && pEl.parentElement ? (pEl.parentElement.textContent || '') : '').toLowerCase();
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
        
        const isBrowserSubagentStepRow = !!(pEl && typeof pEl.closest === 'function' && pEl.closest('[data-testid="browser-subagent-step"]'));
        if (!translated && isBrowserSubagentStepRow) {
            const brStep = translateBrowserStepIntent(normalized);
            if (brStep && brStep !== normalized) {
                translated = brStep;
            }
        }
        if (!translated && (lowerText === 'выполнено' || lowerText === 'выполняется' || lowerText === 'запущено' || lowerText === 'задача остановлена')) {
            if (hasFollowingStepTarget(node, normalized)) {
                translated = normalized + ':';
            }
        }

        if (!translated) {
            if (translationDictionary[lowerText]) {
                translated = translationDictionary[lowerText];
                if (lowerText === 'new') {
                    const pTestId = (node.parentElement && node.parentElement.getAttribute) ? (node.parentElement.getAttribute('data-testid') || '') : '';
                    const pClass = (node.parentElement && typeof node.parentElement.className === 'string') ? node.parentElement.className.toLowerCase() : '';
                    const closestBtn = (node.parentElement && typeof node.parentElement.closest === 'function') ? node.parentElement.closest('button, [role="button"]') : null;
                    const btnHasAddIcon = !!(closestBtn && (
                        (closestBtn.textContent || '').trim().startsWith('+') ||
                        (closestBtn.innerHTML || '').includes('>add<') ||
                        /^(?:new|\+\s*new)$/i.test((closestBtn.getAttribute('aria-label') || '').trim())
                    ));
                    if (pTestId === 'swarm-unread-divider' || pClass.includes('divider')) {
                        translated = 'Новые';
                    } else if (
                        !btnHasAddIcon && (
                            pClass.includes('rounded-full') ||
                            pClass.includes('rounded ') ||
                            pClass.includes('badge') ||
                            pClass.includes('pill') ||
                            (node.parentElement && typeof node.parentElement.closest === 'function' && node.parentElement.closest('[role="option"], [role="menuitem"], [role="listbox"], [role="menu"], [data-base-ui-portal]'))
                        )
                    ) {
                        translated = 'Новинка';
                    } else {
                        translated = 'Создать';
                    }
                }
                if (lowerText === 'name' && (parentText.includes(': string') || fullContext.includes('const greet') || fullContext.includes('hello, ${name}'))) {
                    return;
                }
                if (lowerText === 'card' && !/(?:^|\s)(?:card|карточка)\s*\d+\s+(?:of|из)\s+\d+/i.test(fullContext)) {
                    return;
                }
                if (lowerText === 'select' && normalized === 'SELECT') {
                    return;
                }
                if (lowerText === 'stage' && node.parentElement && typeof node.parentElement.closest === 'function' && node.parentElement.closest('[data-agy-layout-option], [data-agy-layout]')) {
                    translated = 'Сцена';
                }
                if (lowerText === 'copy link' && normalized[0] === 'C') {
                    translated = 'Скопировать ссылку';
                }
                if (lowerText === 'plan' && (fullContext.includes('create a plan') || fullContext.includes('составил план') || fullContext.includes('select') || fullContext.includes('выберите'))) {
                    translated = 'План';
                } else if (lowerText === 'click' && node.parentElement && node.parentElement.tagName === 'KBD') {
                    translated = 'Клик';
                } else if (lowerText === 'conversations' && /(?:^\d+\s+|no\s+|нет\s+|search\s+|поиск\s+|delete\s+|удалить\s+)/i.test(parentText.trim())) {
                    translated = 'диалогов';
                } else if (lowerText === 'no' && /\s+yet$/i.test(parentText.trim())) {
                    translated = 'Пока нет';
                } else if (lowerText === 'automations' && /^(?:no|нет|пока нет)\s+/i.test(parentText.trim())) {
                    translated = 'автоматизаций';
                } else if (lowerText === 'scheduled tasks' && /^(?:no|нет|пока нет)\s+/i.test(parentText.trim())) {
                    translated = 'запланированных задач';
                }
                if (lowerText === 'resources' && /^(?:add|добавить)\s+/i.test(parentText.trim())) {
                    translated = 'ресурсы';
                }
                if ((lowerText === 'open' || lowerText === 'открыть') && parentText.includes('google chrome')) {
                    translated = 'Откройте';
                } else if (lowerText === 'show' && /^(?:show|показать(?:\s+ещё)?)\s+\d+\s+(?:more(?:\.{3}|…)?|\.{3}|…)$/i.test(parentText.trim())) {
                    translated = 'Показать ещё';
                } else if (lowerText === 'found' || lowerText === 'killed' || lowerText === 'started' || lowerText === 'asked') {
                    const mCtx = fullContext.match(/(?:^|\s)(\d+)\s*(subagents?|субагент(?:а|ов)?|tasks?|задач[аи]?|results?|результат(?:а|ов)?|questions?|вопрос(?:а|ов)?)\b/i);
                    if (mCtx) {
                        const c = parseInt(mCtx[1], 10);
                        const n = Math.abs(c) % 100;
                        const n1 = n % 10;
                        const isSing = (n <= 10 || n >= 20) && n1 === 1;
                        const isFem = /^(?:task|задач)/i.test(mCtx[2]);
                        if (lowerText === 'found') translated = isSing ? (isFem ? 'Найдена' : 'Найден') : 'Найдено';
                        else if (lowerText === 'killed') translated = isSing ? (isFem ? 'Остановлена' : 'Остановлен') : 'Остановлено';
                        else if (lowerText === 'started') translated = isSing ? (isFem ? 'Запущена' : 'Запущен') : 'Запущено';
                        else if (lowerText === 'asked') translated = isSing ? 'Задан' : 'Задано';
                    }
                } else if (
                    lowerText === 'ran' ||
                    lowerText === 'running' ||
                    lowerText === 'killed task' ||
                    lowerText === 'killing task' ||
                    lowerText === 'checked task' ||
                    lowerText === 'checking task' ||
                    lowerText === 'sent input to task' ||
                    lowerText === 'sending input to task'
                ) {
                    if (hasFollowingStepTarget(node, normalized)) {
                        translated = translated.replace(/:$/, '') + ':';
                    }
                } else if (!STEP_PREFIX_EXACT_RE.test(normalized) && !/^[·•・]/.test(normalized) && getPrecedingStepPrefix(node, normalized)) {
                    translated = lowercaseFirstCyrillic(translated);
                }
            } else {
                const stepPrefixBefore = getPrecedingStepPrefix(node, normalized);
                if (regexTranslationCache.has(normalized)) {
                    const cachedVal = regexTranslationCache.get(normalized);
                    if (cachedVal) translated = cachedVal;
                } else {
                    for (const rule of regexTranslations) {
                        const match = normalized.match(rule.pattern);
                        if (match) {
                            const res = rule.replace(match);
                            if (res && res !== normalized) {
                                translated = res;
                                break;
                            }
                        }
                    }
                    if (regexTranslationCache.size > 3000) regexTranslationCache.clear();
                    regexTranslationCache.set(normalized, translated || '');
                }
                if (!translated && stepPrefixBefore) {
                    const loc = localizeActionTarget(normalized, true);
                    if (loc && loc !== normalized) {
                        translated = loc;
                    }
                }
                if (translated && stepPrefixBefore) {
                    translated = lowercaseFirstCyrillic(translated);
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
                } else if (node.parentElement && (node.parentElement.tagName === 'BUTTON' || (typeof node.parentElement.closest === 'function' && node.parentElement.closest('button, [role="button"]')))) {
                    translated = 'Перейти';
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
                } else if (pText.includes('context7')) {
                    translated = 'Плагин';
                }
            } else if (lowerText === 'yet' && /^(?:no|нет|пока нет)\s+/i.test(parentText.trim())) {
                translated = ' ';
                if (false) {
                }
            } else if (lowerText === 'guide') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('navigation-drawer')) {
                    translated = ' ';
                }
            } else if (lowerText === 'or' && (fullContext.includes('mcp_config.json') || fullContext.includes('assets/'))) {
                translated = 'или';
            } else if (lowerText === 'in' && (fullContext.includes('plugin.json') || fullContext.includes('mcp_config.json') || fullContext.includes('bump'))) {
                translated = 'в';
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
                const testId = (node.parentElement && node.parentElement.getAttribute && node.parentElement.getAttribute('data-testid')) || '';
                if (testId === 'voice-picker-use' || /^use\s+(?:fola|arlo|cleo|finn|gero|lora|neno|olin|tari)$/i.test(pText)) {
                    translated = 'Использовать';
                } else if (pText.includes('service account') || pText.includes('имперсонацию') || pText.includes('principal access') || pText.includes('политики границ')) {
                    translated = 'Используйте';
                }
            } else if (lowerText === 'checks') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('gcloud')) {
                    translated = '';
                }
            } else if (lowerText === 'these skills target the new') {
                translated = 'Эти навыки предназначены для нового ';
            } else if (lowerText === ". they don't generate legacy velo or corvid code.") {
                translated = '. Они не генерируют устаревший код Velo или Corvid.';
            } else if (lowerText === '): lists your sites, calls wix apis on them, and searches the wix docs. the first time a wix tool is used, you sign in to your wix account in the browser; the server shows in') {
                translated = '): выводит список ваших сайтов, вызывает для них API Wix и выполняет поиск по документации Wix. При первом вызове инструмента Wix вы входите в свой аккаунт Wix в браузере; сервер отображается в ';
            } else if (lowerText === 'as') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('wix_mcp')) {
                    translated = 'как';
                }
            } else if (lowerText === ': build and review wix cli app extensions, and prepare an app for the wix app market.') {
                translated = ': создание и проверка расширений приложений Wix CLI, а также подготовка приложения для публикации в Wix App Market.';
            } else if (lowerText === ': wix design system component reference.') {
                translated = ': справочник компонентов Wix Design System.';
            } else if (lowerText === ': rest recipes for configuring wix business solutions: stores, bookings, payments, cms, and more.') {
                translated = ': REST-рецепты для настройки бизнес-решений Wix: магазинов, бронирований, платежей, CMS и многого другого.';
            } else if (lowerText === ': build and release a headless site fast on shipped, per-solution code. the kit fetches that code (') {
                translated = ': быстрое создание и публикация headless-сайтов на основе готового проверенного кода для каждого решения. Набор загружает этот код (';
            } else if (lowerText === ') the first time it builds a site.') {
                translated = ') при первой сборке сайта.';
            } else if (lowerText === ': look up an exact wix endpoint, field or schema before writing code.') {
                translated = ': поиск точного эндпоинта, поля или схемы Wix перед написанием кода.';
            } else if (lowerText === ': the index of the plugin: its skills and the wix mcp tools, with what each does.') {
                translated = ': указатель плагина: список его навыков и инструментов Wix MCP с описанием их возможностей.';
            } else if (lowerText === 'a') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('wix')) {
                    translated = 'Аккаунт ';
                }
            } else if (lowerText === ", for the wix cli and the skills' helper scripts.") {
                translated = ' — для работы Wix CLI и вспомогательных скриптов навыков.';
            } else if (lowerText === 'build, publish, and manage your' || lowerText === 'сборка, publish, and manage your') {
                translated = 'Создавайте, публикуйте и управляйте вашими сайтами ';
            } else if (lowerText === 'sites and') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('wordpress') || pText.includes('jetpack')) {
                    translated = ' и подключёнными через ';
                }
            } else if (lowerText === 'self-hosted wordpress sites directly from google antigravity.') {
                translated = ' автономными (self-hosted) сайтами WordPress напрямую из Google Antigravity.';
            } else if (lowerText === 'ensure mcp access is enabled in your' || lowerText === ': ensure mcp access is enabled in your') {
                translated = (lowerText.startsWith(':') ? ': ' : '') + 'Убедитесь, что доступ MCP включён в ваших ';
            } else if (lowerText === 'for the sites you want to manage. self-hosted wordpress sites can also connect via') {
                translated = ' для сайтов, которыми вы хотите управлять. Автономные сайты WordPress также можно подключить через ';
            } else if (lowerText === 'install the' || lowerText === ': install the') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('wordpress') || pText.includes('antigravity')) {
                    translated = (lowerText.startsWith(':') ? ': ' : '') + 'Установите плагин ';
                }
            } else if (lowerText === 'plugin in antigravity. when prompted, sign in with your wordpress.com account via oauth to authorize access.') {
                translated = ' в Antigravity. При появлении запроса войдите в свой аккаунт WordPress.com через OAuth для авторизации доступа.';
            } else if (lowerText === 'invoke a starter prompt or use the bundled skills (' || lowerText === ': invoke a starter prompt or use the bundled skills (') {
                translated = (lowerText.startsWith(':') ? ': ' : '') + 'Запустите стартовый промпт или используйте встроенные навыки (';
            } else if (lowerText === 'note' || lowerText === 'примечание') {
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent).toLowerCase() : '';
                if (gpText.includes('google-cloud-recipe-onboarding')) {
                    translated = 'ПРИМЕЧАНИЕ — Основные встроенные навыки:';
                }
            } else if (lowerText === 'if the') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                if (pText.includes('android') && (pText.includes('path') || pText.includes('installer') || pText.includes('установщик'))) {
                    translated = 'Если инструмент';
                }
            } else if (/^(\d+(?:\.\d+)?)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)(\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i.test(normalized)) {
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent).toLowerCase() : '';
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                const ctx = pText + ' ' + gpText;
                if (ctx.includes('timed') || ctx.includes('timing') || ctx.includes('таймер') || ctx.includes('wait for') || ctx.includes('ожидание')) {
                    const mDur = normalized.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)(\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i);
                    if (mDur) {
                        const unitMap = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                        const u = unitMap[mDur[2].toLowerCase()[0]] || mDur[2];
                        const arr = mDur[3] ? (' ' + mDur[3].trim()) : '';
                        translated = `${mDur[1]} ${u}${arr}`;
                    }
                }
            } else if (lowerText === 'subagents' || lowerText === 'subagent' || lowerText === 'tasks' || lowerText === 'task' || lowerText === 'questions' || lowerText === 'question') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent).toLowerCase() : '';
                const mSub = pText.match(/(\d+)\s*(subagents?|tasks?|questions?)/i);
                if (mSub) {
                    const count = parseInt(mSub[1], 10);
                    const kind = mSub[2].toLowerCase();
                    const n = Math.abs(count) % 100;
                    const n1 = n % 10;
                    const isSingular = (n <= 10 || n >= 20) && n1 === 1;
                    const isFew = (n <= 10 || n >= 20) && (n1 > 1 && n1 < 5);
                    if (kind.startsWith('task')) {
                        translated = isSingular ? 'задача' : (isFew ? 'задачи' : 'задач');
                    } else if (kind.startsWith('question')) {
                        translated = isSingular ? 'вопрос' : (isFew ? 'вопроса' : 'вопросов');
                    } else {
                        translated = isSingular ? 'субагент' : (isFew ? 'субагента' : 'субагентов');
                    }
                }
            } else if (/^([a-zA-Z0-9_\-]+)\s+subagent$/i.test(normalized)) {
                const mName = normalized.match(/^([a-zA-Z0-9_\-]+)\s+subagent$/i);
                if (mName && (fullContext.includes('defin') || fullContext.includes('kill') || fullContext.includes('определ') || fullContext.includes('останов'))) {
                    const isGen = fullContext.includes('defining') || fullContext.includes('killing') || fullContext.includes('определение') || fullContext.includes('остановка');
                    translated = `${isGen ? 'субагента' : 'субагент'} ${mName[1]}`;
                }
            } else if (lowerText === 'insertion' || lowerText === 'insertions' || lowerText === 'deletion' || lowerText === 'deletions') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent) : '';
                const mDiff = pText.match(/(\d+)\s*(?:insertion|deletion)/i);
                if (mDiff && /\([+-]\)/.test(pText)) {
                    const c = parseInt(mDiff[1], 10);
                    translated = lowerText.startsWith('ins')
                        ? pluralizeRuCount(c, 'вставка', 'вставки', 'вставок')
                        : pluralizeRuCount(c, 'удаление', 'удаления', 'удалений');
                }
            } else if (lowerText === 's' && node.parentElement) {
                const nextTxt = node.nextSibling ? (node.nextSibling.nodeValue || '') : '';
                const prevTxt = node.previousSibling ? (node.previousSibling.nodeValue || '') : '';
                if (/^\s*\([+-]\)\s*$/.test(nextTxt) && /(?:insertion|deletion|встав(?:к|ок)|удален)/i.test(prevTxt)) {
                    translated = '\u200b';
                }
            } else if (lowerText === 'left' || lowerText === '% left') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent) : '';
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent) : '';
                if (/\d+%\s*left/i.test(pText) || /\d+%\s*left/i.test(gpText)) {
                    translated = lowerText === '% left' ? '% осталось' : 'осталось';
                }
            } else if ((lowerText === 'show' || lowerText === 'more...' || lowerText === 'more…' || lowerText === 'more') && node.parentElement) {
                const pText = normalizeText(node.parentElement.textContent);
                if (/^(?:show|показать(?:\s+ещё)?)\s+\d+\s+(?:more(?:\.{3}|…)?|\.{3}|…)$/i.test(pText)) {
                    translated = lowerText === 'show' ? 'Показать ещё' : '...';
                }
            } else if (lowerText === 'of') {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent) : '';
                if (/^(?:(?:card|карточка|step|шаг|page|страница|question|вопрос|turn|ход)\s+)?\d+\s+of\s+\d+$/i.test(pText)) {
                    translated = 'из';
                }
            } else if (lowerText === 'hold') {
                if (/(?:to upload|to add to agent|для загрузки|чтобы добавить)/i.test(fullContext)) {
                    translated = 'Удерживайте';
                }
            } else if (/^pinned(?:\s+conversations?)?$/i.test(normalized)) {
                const pText = node.parentElement ? normalizeText(node.parentElement.textContent) : '';
                const gpText = (node.parentElement && node.parentElement.parentElement) ? normalizeText(node.parentElement.parentElement.textContent) : '';
                const mPin = (pText + ' ' + gpText).match(/(\d+)\s*pinned/i);
                if (mPin) {
                    const c = parseInt(mPin[1], 10);
                    const adj = pluralizeRuCount(c, 'закреплённый', 'закреплённых', 'закреплённых');
                    if (/conversation/i.test(normalized)) {
                        const noun = pluralizeRuCount(c, 'диалог', 'диалога', 'диалогов');
                        translated = `${adj} ${noun}`;
                    } else {
                        translated = adj;
                    }
                } else {
                    translated = 'закреплено';
                }
            } else if (/^over\s+(.+)$/i.test(normalized) && node.parentElement && node.parentElement.id === 'replay-label') {
                const mOver = normalized.match(/^over\s+(.+)$/i);
                if (mOver) {
                    const dur = mOver[1].replace(/(\d+)\s*(s|m|h|d)\b/gi, (_, c, u) => `${c} ${{ s: 'сек', m: 'мин', h: 'ч', d: 'дн.' }[u.toLowerCase()] || u}`);
                    translated = `за ${dur}`;
                }
            } else {
                const stepPrefixFallback = getPrecedingStepPrefix(node, normalized);
                if (stepPrefixFallback) {
                    const loc = localizeActionTarget(normalized, true);
                    if (loc && loc !== normalized) {
                        translated = lowercaseFirstCyrillic(loc);
                    }
                } else if (node.parentElement) {
                    const pCls = typeof node.parentElement.className === 'string' ? node.parentElement.className : '';
                    if (pCls.includes('agy-hover-label') && pCls.includes('font-mono')) {
                        const cmdSum = translateEnglishCommandSummary(normalized, true);
                        if (cmdSum && cmdSum !== normalized) {
                            translated = uppercaseFirstCyrillic(cmdSum);
                        }
                    } else if (pCls.includes('agy-aux-tab-title') || (typeof node.parentElement.closest === 'function' && node.parentElement.closest('[role="tooltip"]'))) {
                        const cmdSum = translateEnglishCommandSummary(normalized, false);
                        if (cmdSum && cmdSum !== normalized) {
                            translated = uppercaseFirstCyrillic(cmdSum);
                        }
                    } else if (lowerText === 'daemon' && (pCls.includes('rounded') || pCls.includes('badge') || pCls.includes('pill') || pCls.includes('text-[10px]') || pCls.includes('text-xs'))) {
                        translated = 'фоновый';
                    }
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
                
                if (!parent.hasAttribute('data-original-nodes') || !/[а-яА-ЯёЁ]/.test(text)) {
                    try {
                        const origNodes = Array.from(parent.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.nodeValue);
                        parent.setAttribute('data-original-nodes', JSON.stringify(origNodes));
                    } catch (e) {}
                }
                parent.setAttribute('data-translated', 'true');
                if (!parent.hasAttribute('data-original-text') || !/[а-яА-ЯёЁ]/.test(text)) {
                    parent.setAttribute('data-original-text', text);
                }
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
        if (isEnglishMode()) return;
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
                    const res = rule.replace(match);
                    if (res && res !== normalized) {
                        translatedValue = res;
                        break;
                    }
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
        if (isEnglishMode()) return;
        if (!element || element.nodeType !== Node.ELEMENT_NODE || !element.getAttribute) return;
        if (shouldIgnore(element)) return;
        
        const title = element.getAttribute('title');
        if (title && typeof title === 'string') {
            const normalized = normalizeText(title);
            const lowerTitle = normalized.toLowerCase();
            
            let translated = null;
            if (typeof element.closest === 'function' && element.closest('[data-testid="browser-subagent-step"]')) {
                const brStep = translateBrowserStepIntent(normalized);
                if (brStep && brStep !== normalized) {
                    translated = brStep;
                }
            }
            if (!translated && translationDictionary[lowerTitle]) {
                translated = translationDictionary[lowerTitle];
            } else if (!translated) {
                for (const rule of regexTranslations) {
                    const match = normalized.match(rule.pattern);
                    if (match) {
                        const res = rule.replace(match);
                        if (res && res !== normalized) {
                            translated = res;
                            break;
                        }
                    }
                }
                if (!translated && element.previousElementSibling) {
                    const prevEl = element.previousElementSibling;
                    const prevOrig = (prevEl.getAttribute && prevEl.getAttribute('data-original-text') || '').trim();
                    const prevTxt = (prevEl.textContent || '').trim();
                    if (STEP_PREFIX_EXACT_RE.test(prevOrig) || STEP_PREFIX_EXACT_RE.test(prevTxt)) {
                        const loc = localizeActionTarget(normalized, true);
                        if (loc && loc !== normalized) {
                            translated = lowercaseFirstCyrillic(loc);
                        }
                    }
                }
                if (!translated && typeof element.className === 'string' && element.className.includes('agy-hover-label') && element.className.includes('font-mono')) {
                    const cmdSum = translateEnglishCommandSummary(normalized, true);
                    if (cmdSum && cmdSum !== normalized) {
                        translated = uppercaseFirstCyrillic(cmdSum);
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
                        const res = rule.replace(match);
                        if (res && res !== normalized) {
                            translated = res;
                            break;
                        }
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
        if (isEnglishMode()) return;
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
                        const res = rule.replace(match);
                        if (res && res !== normalized) {
                            translated = res;
                            break;
                        }
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
            const directTextNodes = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
            const origNodesJson = el.getAttribute('data-original-nodes');
            if (origNodesJson) {
                try {
                    const origNodes = JSON.parse(origNodesJson);
                    if (Array.isArray(origNodes) && origNodes.length === directTextNodes.length) {
                        directTextNodes.forEach((n, idx) => {
                            n.nodeValue = origNodes[idx];
                        });
                    }
                } catch (e) {}
            } else {
                const originalText = el.getAttribute('data-original-text');
                if (originalText) {
                    if (directTextNodes.length === 2 && directTextNodes[0].nodeValue === directTextNodes[1].nodeValue) {
                        directTextNodes[0].nodeValue = ' ';
                        directTextNodes[1].nodeValue = originalText;
                    } else {
                        directTextNodes.forEach(n => {
                            if (/\S/.test(n.nodeValue)) {
                                n.nodeValue = originalText;
                            }
                        });
                    }
                }
            }
            el.removeAttribute('data-translated');
            el.removeAttribute('data-original-text');
            el.removeAttribute('data-original-nodes');
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
    // Clean up any legacy <=v2.1.46 global observer handle and leave it null so old superseded listeners cannot disconnect our private observer
    if (window.__antigravity_active_observer) {
        try { window.__antigravity_active_observer.disconnect(); } catch (e) {}
        window.__antigravity_active_observer = null;
    }

    try {
        let isHandlingMutations = false;
        translationObserver = new MutationObserver((mutations) => {
            if (isHandlingMutations || isEnglishMode()) return;
            isHandlingMutations = true;

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
                // Drain records produced by our own DOM writes without ever disconnecting the observer
                try { if (translationObserver) translationObserver.takeRecords(); } catch (e) {}
                isHandlingMutations = false;
            }
        });

        translationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['title', 'data-tooltip', 'placeholder', 'aria-label']
        });
    } catch (e) {
        console.error('Error in startObserving:', e);
    }
}

function stopObserving() {
    if (translationObserver) {
        translationObserver.disconnect();
        translationObserver = null;
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
