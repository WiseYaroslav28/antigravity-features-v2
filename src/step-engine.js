function lowercaseFirstCyrillic(str) {
    if (!str || typeof str !== 'string') return str;
    if (/^[А-ЯЁ]/.test(str) && !/^[А-ЯЁ]{2}/.test(str)) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
    return str;
}

function uppercaseFirstCyrillic(str) {
    if (!str || typeof str !== 'string') return str;
    if (/^[а-яё]/.test(str)) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    return str;
}

function translateScheduleTimes(timesStr) {
    if (!timesStr) return '';
    return timesStr.trim().replace(/\s+and\s+/gi, ' и ');
}

function translateScheduleDays(daysStr, capitalize) {
    if (!daysStr) return '';
    const raw = daysStr.trim();
    const low = raw.toLowerCase();
    const exactMap = {
        'weekdays': 'по будням',
        'weekends': 'по выходным',
        'sundays': 'по воскресеньям',
        'mondays': 'по понедельникам',
        'tuesdays': 'по вторникам',
        'wednesdays': 'по средам',
        'thursdays': 'по четвергам',
        'fridays': 'по пятницам',
        'saturdays': 'по субботам'
    };
    let res = exactMap[low];
    if (!res) {
        const shortDayMap = {
            sun: 'Вс', mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб'
        };
        const converted = raw
            .replace(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/gi, (d) => shortDayMap[d.toLowerCase()] || d)
            .replace(/\s+and\s+/gi, ' и ');
        res = `по ${converted}`;
    }
    return capitalize ? uppercaseFirstCyrillic(res) : res;
}

function translateNextRunDate(dateStr) {
    if (!dateStr) return '';
    const raw = dateStr.trim();
    const low = raw.toLowerCase();
    if (low === 'today') return 'сегодня';
    if (low === 'tomorrow') return 'завтра';
    const dowAccMap = {
        'on sunday': 'в воскресенье',
        'on monday': 'в понедельник',
        'on tuesday': 'во вторник',
        'on wednesday': 'в среду',
        'on thursday': 'в четверг',
        'on friday': 'в пятницу',
        'on saturday': 'в субботу'
    };
    if (dowAccMap[low]) return dowAccMap[low];
    const mDate = raw.match(/^on\s+([A-Za-z]+)\s+(\d{1,2})$/i);
    if (mDate) {
        const monthMap = {
            january: 'января', jan: 'января',
            february: 'февраля', feb: 'февраля',
            march: 'марта', mar: 'марта',
            april: 'апреля', apr: 'апреля',
            may: 'мая',
            june: 'июня', jun: 'июня',
            july: 'июля', jul: 'июля',
            august: 'августа', aug: 'августа',
            september: 'сентября', sep: 'сентября', sept: 'сентября',
            october: 'октября', oct: 'октября',
            november: 'ноября', nov: 'ноября',
            december: 'декабря', dec: 'декабря'
        };
        const mRu = monthMap[mDate[1].toLowerCase()];
        if (mRu) return `${mDate[2]} ${mRu}`;
    }
    return raw;
}

const SUMMARY_HEAD_NOUNS_GEN = [
    [/^dev(?:elopment)?\s+server\s+daemon$/i, 'фонового dev-сервера', 'm'],
    [/^web\s+server\s+daemon$/i, 'фонового веб-сервера', 'm'],
    [/^server\s+daemon$/i, 'фонового сервера', 'm'],
    [/^background\s+daemon$/i, 'фонового процесса', 'm'],
    [/^dev(?:elopment)?\s+servers?$/i, 'dev-сервера', 'm'],
    [/^preview\s+servers?$/i, 'сервера предпросмотра', 'm'],
    [/^web\s+servers?$/i, 'веб-сервера', 'm'],
    [/^http\s+servers?$/i, 'HTTP-сервера', 'm'],
    [/^api\s+servers?$/i, 'API-сервера', 'm'],
    [/^mcp\s+servers?$/i, 'MCP-сервера', 'm'],
    [/^local\s+servers?$/i, 'локального сервера', 'm'],
    [/^servers?$/i, 'сервера', 'm'],
    [/^daemons?$/i, 'фонового процесса', 'm'],
    [/^project\s+integrity$/i, 'целостности проекта', 'f'],
    [/^code(?:base)?\s+integrity$/i, 'целостности кода', 'f'],
    [/^file\s+integrity$/i, 'целостности файлов', 'f'],
    [/^data\s+integrity$/i, 'целостности данных', 'f'],
    [/^package\s+integrity$/i, 'целостности пакета', 'f'],
    [/^build\s+integrity$/i, 'целостности сборки', 'f'],
    [/^system\s+integrity$/i, 'целостности системы', 'f'],
    [/^integrity\s+checks?$/i, 'проверки целостности', 'f'],
    [/^integrity\s+verification$/i, 'проверки целостности', 'f'],
    [/^integrity$/i, 'целостности', 'f'],
    [/^lint(?:ing)?\s+and\s+type[\s-]?checks?$/i, 'линтинга и проверки типов', 'm'],
    [/^type[\s-]?checks?\s+and\s+lint(?:ing)?$/i, 'проверки типов и линтинга', 'f'],
    [/^lint\s+checks?$/i, 'проверки линтером', 'f'],
    [/^linter$/i, 'линтера', 'm'],
    [/^lint(?:ing)?$/i, 'линтинга', 'm'],
    [/^type[\s-]?check(?:s|ing)?$/i, 'проверки типов', 'f'],
    [/^type\s+errors?$/i, 'ошибок типов', 'pl'],
    [/^lint\s+errors?$/i, 'ошибок линтера', 'pl'],
    [/^types$/i, 'типов', 'pl'],
    [/^syntax\s+checks?$/i, 'проверки синтаксиса', 'f'],
    [/^syntax$/i, 'синтаксиса', 'm'],
    [/^unit\s+tests?$/i, 'unit-тестов', 'pl'],
    [/^integration\s+tests?$/i, 'интеграционных тестов', 'pl'],
    [/^e2e\s+tests?$/i, 'e2e-тестов', 'pl'],
    [/^smoke\s+tests?$/i, 'smoke-тестов', 'pl'],
    [/^regression\s+tests?$/i, 'регрессионных тестов', 'pl'],
    [/^test\s+suites?$/i, 'набора тестов', 'm'],
    [/^tests$/i, 'тестов', 'pl'],
    [/^test$/i, 'теста', 'm'],
    [/^prod(?:uction)?\s+builds?$/i, 'продакшен-сборки', 'f'],
    [/^dev(?:elopment)?\s+builds?$/i, 'dev-сборки', 'f'],
    [/^build\s+(?:output|artifacts?)$/i, 'артефактов сборки', 'pl'],
    [/^builds?$/i, 'сборки', 'f'],
    [/^bundles?$/i, 'бандла', 'm'],
    [/^npm\s+dependencies$/i, 'npm-зависимостей', 'pl'],
    [/^npm\s+packages$/i, 'npm-пакетов', 'pl'],
    [/^dependencies$/i, 'зависимостей', 'pl'],
    [/^deps$/i, 'зависимостей', 'pl'],
    [/^packages$/i, 'пакетов', 'pl'],
    [/^package$/i, 'пакета', 'm'],
    [/^repository\s+traffic\s+stat(?:istic)?s$/i, 'статистики трафика репозитория', 'f'],
    [/^traffic\s+stat(?:istic)?s$/i, 'статистики трафика', 'f'],
    [/^stat(?:istic)?s$/i, 'статистики', 'f'],
    [/^git\s+status$/i, 'статуса Git', 'm'],
    [/^git\s+diff$/i, 'изменений Git', 'pl'],
    [/^git\s+log$/i, 'истории коммитов Git', 'f'],
    [/^commit\s+history$/i, 'истории коммитов', 'f'],
    [/^working\s+tree$/i, 'рабочего дерева', 'n'],
    [/^status$/i, 'статуса', 'm'],
    [/^state$/i, 'состояния', 'n'],
    [/^health(?:\s*checks?)?$/i, 'работоспособности', 'f'],
    [/^versions$/i, 'версий', 'pl'],
    [/^version$/i, 'версии', 'f'],
    [/^release\s+notes$/i, 'примечаний к релизу', 'pl'],
    [/^releases$/i, 'релизов', 'pl'],
    [/^release$/i, 'релиза', 'm'],
    [/^branches$/i, 'веток', 'pl'],
    [/^branch$/i, 'ветки', 'f'],
    [/^commits$/i, 'коммитов', 'pl'],
    [/^commit$/i, 'коммита', 'm'],
    [/^pull\s+requests?$/i, 'пул-реквеста', 'm'],
    [/^changes$/i, 'изменений', 'pl'],
    [/^files$/i, 'файлов', 'pl'],
    [/^file$/i, 'файла', 'm'],
    [/^(?:directories|folders)$/i, 'директорий', 'pl'],
    [/^(?:directory|folder)$/i, 'директории', 'f'],
    [/^project$/i, 'проекта', 'm'],
    [/^workspace$/i, 'рабочей области', 'f'],
    [/^repo(?:sitory)?$/i, 'репозитория', 'm'],
    [/^codebase$/i, 'кодовой базы', 'f'],
    [/^source\s+code$/i, 'исходного кода', 'm'],
    [/^code$/i, 'кода', 'm'],
    [/^config(?:uration)?$/i, 'конфигурации', 'f'],
    [/^settings$/i, 'настроек', 'pl'],
    [/^env(?:ironment)?$/i, 'окружения', 'n'],
    [/^(?:database|db)\s+schema$/i, 'схемы БД', 'f'],
    [/^(?:database|db)$/i, 'базы данных', 'f'],
    [/^schema$/i, 'схемы', 'f'],
    [/^migrations$/i, 'миграций', 'pl'],
    [/^migration$/i, 'миграции', 'f'],
    [/^cache$/i, 'кэша', 'm'],
    [/^logs$/i, 'логов', 'pl'],
    [/^log$/i, 'лога', 'm'],
    [/^output$/i, 'вывода', 'm'],
    [/^errors$/i, 'ошибок', 'pl'],
    [/^error$/i, 'ошибки', 'f'],
    [/^warnings$/i, 'предупреждений', 'pl'],
    [/^issues$/i, 'проблем', 'pl'],
    [/^ports$/i, 'портов', 'pl'],
    [/^port$/i, 'порта', 'm'],
    [/^processes$/i, 'процессов', 'pl'],
    [/^process$/i, 'процесса', 'm'],
    [/^tasks$/i, 'задач', 'pl'],
    [/^task$/i, 'задачи', 'f'],
    [/^scripts$/i, 'скриптов', 'pl'],
    [/^script$/i, 'скрипта', 'm'],
    [/^components$/i, 'компонентов', 'pl'],
    [/^component$/i, 'компонента', 'm'],
    [/^pages$/i, 'страниц', 'pl'],
    [/^page$/i, 'страницы', 'f'],
    [/^routes$/i, 'маршрутов', 'pl'],
    [/^route$/i, 'маршрута', 'm'],
    [/^endpoints$/i, 'эндпоинтов', 'pl'],
    [/^endpoint$/i, 'эндпоинта', 'm'],
    [/^styles$/i, 'стилей', 'pl'],
    [/^assets$/i, 'ресурсов', 'pl'],
    [/^translations$/i, 'переводов', 'pl'],
    [/^dictionary$/i, 'словаря', 'm'],
    [/^screenshots$/i, 'скриншотов', 'pl'],
    [/^screenshot$/i, 'скриншота', 'm'],
    [/^patch(?:es)?$/i, 'патча', 'm'],
    [/^runtime\s+error\s+logs$/i, 'рантайм-логов ошибок', 'pl'],
    [/^runtime\s+error\s+log$/i, 'рантайм-лога ошибок', 'm'],
    [/^error\s+logs$/i, 'логов ошибок', 'pl'],
    [/^error\s+log$/i, 'лога ошибок', 'm'],
    [/^crate\s+sources?$/i, 'исходников крейта', 'pl'],
    [/^raw\s+endpoints?$/i, 'прямого эндпоинта', 'm'],
    [/^capabilities$/i, 'возможностей', 'pl'],
    [/^capability$/i, 'возможности', 'f'],
    [/^permissions$/i, 'разрешений', 'pl'],
    [/^permission$/i, 'разрешения', 'n'],
    [/^plugins$/i, 'плагинов', 'pl'],
    [/^plugin$/i, 'плагина', 'm'],
    [/^crates$/i, 'крейтов', 'pl'],
    [/^crate$/i, 'крейта', 'm'],
    [/^sources$/i, 'исходников', 'pl'],
    [/^source$/i, 'исходного кода', 'm'],
    [/^modules$/i, 'модулей', 'pl'],
    [/^module$/i, 'модуля', 'm'],
    [/^functions$/i, 'функций', 'pl'],
    [/^function$/i, 'функции', 'f'],
    [/^methods$/i, 'методов', 'pl'],
    [/^method$/i, 'метода', 'm'],
    [/^hooks$/i, 'хуков', 'pl'],
    [/^hook$/i, 'хука', 'm'],
    [/^handlers$/i, 'обработчиков', 'pl'],
    [/^handler$/i, 'обработчика', 'm'],
    [/^manifests?$/i, 'манифеста', 'm'],
    [/^artifacts$/i, 'артефактов', 'pl'],
    [/^artifact$/i, 'артефакта', 'm'],
    [/^verifications?$/i, 'проверки', 'f'],
    [/^checks$/i, 'проверок', 'pl'],
    [/^check$/i, 'проверки', 'f'],
    [/^stage\s+phases?$/i, 'фазы сцены', 'f'],
    [/^phases$/i, 'фаз', 'pl'],
    [/^phase$/i, 'фазы', 'f'],
    [/^table\s+progress$/i, 'прогресса таблицы', 'm'],
    [/^progress$/i, 'прогресса', 'm'],
    [/^speech\s+bubbles$/i, 'речевых облачков', 'pl'],
    [/^speech\s+bubble$/i, 'облачка речи', 'n'],
    [/^mobile\s+bubbles$/i, 'мобильных облачков', 'pl'],
    [/^mobile\s+bubble$/i, 'мобильного облачка', 'n'],
    [/^bubbles$/i, 'облачков', 'pl'],
    [/^bubble$/i, 'облачка', 'n'],
    [/^heights?$/i, 'высоты', 'f'],
    [/^widths?$/i, 'ширины', 'f'],
    [/^sizes$/i, 'размеров', 'pl'],
    [/^size$/i, 'размера', 'm'],
    [/^bounds$/i, 'границ', 'pl'],
    [/^positions?$/i, 'позиции', 'f'],
    [/^offsets?$/i, 'смещения', 'n'],
    [/^alignments?$/i, 'выравнивания', 'n'],
    [/^margins?$/i, 'отступов', 'pl'],
    [/^paddings?$/i, 'внутренних отступов', 'pl'],
    [/^gaps?$/i, 'отступов', 'pl'],
    [/^icons$/i, 'иконок', 'pl'],
    [/^icon$/i, 'иконки', 'f'],
    [/^buttons$/i, 'кнопок', 'pl'],
    [/^button$/i, 'кнопки', 'f'],
    [/^badges$/i, 'бейджей', 'pl'],
    [/^badge$/i, 'бейджа', 'm'],
    [/^pills$/i, 'плашек', 'pl'],
    [/^pill$/i, 'плашки', 'f'],
    [/^cards$/i, 'карточек', 'pl'],
    [/^card$/i, 'карточки', 'f'],
    [/^modals?$/i, 'модального окна', 'n'],
    [/^dialogs?$/i, 'диалога', 'm'],
    [/^(?:popups?|popovers?)$/i, 'всплывающего окна', 'n'],
    [/^tooltips?$/i, 'подсказки', 'f'],
    [/^headers?$/i, 'шапки', 'f'],
    [/^footers?$/i, 'подвала', 'm'],
    [/^sidebars?$/i, 'боковой панели', 'f'],
    [/^navbars?$/i, 'навигации', 'f'],
    [/^menus?$/i, 'меню', 'n'],
    [/^tabs$/i, 'вкладок', 'pl'],
    [/^tab$/i, 'вкладки', 'f'],
    [/^tables$/i, 'таблиц', 'pl'],
    [/^table$/i, 'таблицы', 'f'],
    [/^rows$/i, 'строк', 'pl'],
    [/^row$/i, 'строки', 'f'],
    [/^columns$/i, 'столбцов', 'pl'],
    [/^column$/i, 'столбца', 'm'],
    [/^cells$/i, 'ячеек', 'pl'],
    [/^cell$/i, 'ячейки', 'f'],
    [/^sections$/i, 'секций', 'pl'],
    [/^section$/i, 'секции', 'f'],
    [/^blocks$/i, 'блоков', 'pl'],
    [/^block$/i, 'блока', 'm'],
    [/^containers$/i, 'контейнеров', 'pl'],
    [/^container$/i, 'контейнера', 'm'],
    [/^wrappers$/i, 'обёрток', 'pl'],
    [/^wrapper$/i, 'обёртки', 'f'],
    [/^panels$/i, 'панелей', 'pl'],
    [/^panel$/i, 'панели', 'f'],
    [/^frames$/i, 'фреймов', 'pl'],
    [/^frame$/i, 'фрейма', 'm'],
    [/^viewports?$/i, 'области просмотра', 'f'],
    [/^screens$/i, 'экранов', 'pl'],
    [/^screen$/i, 'экрана', 'm'],
    [/^layouts?$/i, 'вёрстки', 'f'],
    [/^animations?$/i, 'анимации', 'f'],
    [/^transitions$/i, 'переходов', 'pl'],
    [/^transition$/i, 'перехода', 'm'],
    [/^scroll(?:ing)?$/i, 'прокрутки', 'f'],
    [/^elements$/i, 'элементов', 'pl'],
    [/^element$/i, 'элемента', 'm'],
    [/^nodes$/i, 'узлов', 'pl'],
    [/^node$/i, 'узла', 'm'],
    [/^selectors$/i, 'селекторов', 'pl'],
    [/^selector$/i, 'селектора', 'm'],
    [/^labels$/i, 'меток', 'pl'],
    [/^label$/i, 'метки', 'f'],
    [/^titles$/i, 'заголовков', 'pl'],
    [/^title$/i, 'заголовка', 'm'],
    [/^texts?$/i, 'текста', 'm'],
    [/^inputs?$/i, 'поля ввода', 'n'],
    [/^forms?$/i, 'формы', 'f'],
    [/^links$/i, 'ссылок', 'pl'],
    [/^link$/i, 'ссылки', 'f'],
    [/^readmes$/i, 'файлов README', 'pl'],
    [/^readme$/i, 'файла README', 'm'],
    [/^profiles$/i, 'профилей', 'pl'],
    [/^profile$/i, 'профиля', 'm'],
    [/^channels$/i, 'каналов', 'pl'],
    [/^channel$/i, 'канала', 'm'],
    [/^images$/i, 'изображений', 'pl'],
    [/^image$/i, 'изображения', 'n'],
    [/^loads?$/i, 'загрузки', 'f'],
    [/^freezes?$/i, 'зависания', 'n']
];

const SUMMARY_ADJ_GEN = {
    fresh: { m: 'чистого', f: 'чистой', n: 'чистого', pl: 'чистых' },
    clean: { m: 'чистого', f: 'чистой', n: 'чистого', pl: 'чистых' },
    new: { m: 'нового', f: 'новой', n: 'нового', pl: 'новых' },
    local: { m: 'локального', f: 'локальной', n: 'локального', pl: 'локальных' },
    remote: { m: 'удалённого', f: 'удалённой', n: 'удалённого', pl: 'удалённых' },
    background: { m: 'фонового', f: 'фоновой', n: 'фонового', pl: 'фоновых' },
    live: { m: 'актуального', f: 'актуальной', n: 'актуального', pl: 'актуальных' },
    temp: { m: 'временного', f: 'временной', n: 'временного', pl: 'временных' },
    temporary: { m: 'временного', f: 'временной', n: 'временного', pl: 'временных' },
    raw: { m: 'прямого', f: 'прямой', n: 'прямого', pl: 'прямых' },
    mobile: { m: 'мобильного', f: 'мобильной', n: 'мобильного', pl: 'мобильных' },
    desktop: { m: 'десктопного', f: 'десктопной', n: 'десктопного', pl: 'десктопных' },
    responsive: { m: 'адаптивного', f: 'адаптивной', n: 'адаптивного', pl: 'адаптивных' },
    sticky: { m: 'закреплённого', f: 'закреплённой', n: 'закреплённого', pl: 'закреплённых' },
    fixed: { m: 'фиксированного', f: 'фиксированной', n: 'фиксированного', pl: 'фиксированных' },
    hidden: { m: 'скрытого', f: 'скрытой', n: 'скрытого', pl: 'скрытых' },
    visible: { m: 'видимого', f: 'видимой', n: 'видимого', pl: 'видимых' },
    inline: { m: 'встроенного', f: 'встроенной', n: 'встроенного', pl: 'встроенных' },
    parallel: { m: 'параллельного', f: 'параллельной', n: 'параллельного', pl: 'параллельных' },
    final: { m: 'финального', f: 'финальной', n: 'финального', pl: 'финальных' },
    initial: { m: 'начального', f: 'начальной', n: 'начального', pl: 'начальных' },
    speech: { m: 'речевого', f: 'речевой', n: 'речевого', pl: 'речевых' },
    current: { m: 'текущего', f: 'текущей', n: 'текущего', pl: 'текущих' },
    latest: { m: 'последнего', f: 'последней', n: 'последнего', pl: 'последних' },
    existing: { m: 'существующего', f: 'существующей', n: 'существующего', pl: 'существующих' },
    updated: { m: 'обновлённого', f: 'обновлённой', n: 'обновлённого', pl: 'обновлённых' },
    patched: { m: 'пропатченного', f: 'пропатченной', n: 'пропатченного', pl: 'пропатченных' },
    full: { m: 'полного', f: 'полной', n: 'полного', pl: 'полных' },
    complete: { m: 'полного', f: 'полной', n: 'полного', pl: 'полных' },
    quick: { m: 'быстрого', f: 'быстрой', n: 'быстрого', pl: 'быстрых' },
    fast: { m: 'быстрого', f: 'быстрой', n: 'быстрого', pl: 'быстрых' },
    all: { m: 'всего', f: 'всей', n: 'всего', pl: 'всех' },
    unused: { m: 'неиспользуемого', f: 'неиспользуемой', n: 'неиспользуемого', pl: 'неиспользуемых' },
    missing: { m: 'недостающего', f: 'недостающей', n: 'недостающего', pl: 'недостающих' },
    broken: { m: 'сломанного', f: 'сломанной', n: 'сломанного', pl: 'сломанных' },
    stale: { m: 'старого', f: 'старой', n: 'старого', pl: 'старых' },
    old: { m: 'старого', f: 'старой', n: 'старого', pl: 'старых' },
    active: { m: 'активного', f: 'активной', n: 'активного', pl: 'активных' },
    running: { m: 'запущенного', f: 'запущенной', n: 'запущенного', pl: 'запущенных' },
    staged: { m: 'проиндексированного', f: 'проиндексированной', n: 'проиндексированного', pl: 'проиндексированных' },
    untracked: { m: 'неотслеживаемого', f: 'неотслеживаемой', n: 'неотслеживаемого', pl: 'неотслеживаемых' },
    modified: { m: 'изменённого', f: 'изменённой', n: 'изменённого', pl: 'изменённых' },
    remaining: { m: 'оставшегося', f: 'оставшейся', n: 'оставшегося', pl: 'оставшихся' }
};

const SUMMARY_MODIFIER_NOUN_GEN = {
    project: 'проекта',
    app: 'приложения',
    application: 'приложения',
    workspace: 'рабочей области',
    repo: 'репозитория',
    repository: 'репозитория',
    server: 'сервера',
    client: 'клиента',
    frontend: 'фронтенда',
    backend: 'бэкенда',
    ui: 'интерфейса',
    db: 'БД',
    database: 'БД',
    runtime: 'рантайма',
    error: 'ошибок',
    updater: 'апдейтера',
    stage: 'сцены',
    table: 'таблицы',
    frame: 'фрейма',
    page: 'страницы',
    browser: 'браузера',
    crate: 'крейта',
    plugin: 'плагина',
    author: 'автора',
    channel: 'каналов',
    profile: 'профиля'
};

const SUMMARY_KNOWN_TECH_LOWER = new Set([
    'git', 'github', 'npm', 'pnpm', 'yarn', 'bun', 'npx', 'node', 'nodejs', 'deno',
    'vite', 'next', 'nextjs', 'nuxt', 'astro', 'remix', 'react', 'vue', 'svelte', 'angular',
    'tailwind', 'tailwindcss', 'postcss', 'prisma', 'drizzle', 'supabase', 'firebase',
    'docker', 'playwright', 'puppeteer', 'cypress', 'vitest', 'jest', 'mocha',
    'eslint', 'biome', 'oxlint', 'prettier', 'tsc', 'ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'css', 'scss', 'html', 'json',
    'rust', 'cargo', 'python', 'pip', 'uv', 'pytest', 'go', 'asar', 'cdp', 'mcp', 'cli', 'sdk', 'api',
    'ssh', 'http', 'https', 'dns', 'sql', 'sqlite', 'postgres', 'postgresql', 'mysql', 'redis', 'graphql', 'webpack', 'turbopack', 'esbuild', 'rollup', 'tauri', 'electron'
]);

function translateSummaryAtomicObjectGenitive(phrase, isStepContext) {
    if (!phrase) return null;
    let p = phrase.trim();
    if (isStepContext) {
        p = p.replace(/^(?:the|a|an)\s+/i, '').trim();
    }
    if (!p) return null;

    const tails = [];
    let changedTail = true;
    let guardIter = 0;
    while (changedTail && guardIter < 5) {
        changedTail = false;
        guardIter++;
        let m;
        if ((m = p.match(/^(.+?)\s+on\s+port\s+(\d+)$/i))) {
            tails.unshift(`на порту ${m[2]}`);
            p = m[1].trim();
            changedTail = true;
        } else if ((m = p.match(/^(.+?)\s+(?:at|on)\s+((?:localhost|127\.0\.0\.1)(?::\d+)?|https?:\/\/\S+)$/i))) {
            tails.unshift(`на ${m[2]}`);
            p = m[1].trim();
            changedTail = true;
        } else if ((m = p.match(/^(.+?)\s+in\s+background(?:\s+mode)?$/i))) {
            tails.unshift('в фоновом режиме');
            p = m[1].trim();
            changedTail = true;
        } else if ((m = p.match(/^(.+?)\s+as\s+(?:a\s+)?daemon$/i))) {
            tails.unshift('в фоновом режиме');
            p = m[1].trim();
            changedTail = true;
        } else if ((m = p.match(/^(.+?)\s+in\s+(workspace|project|repo|repository|production|dev|development|[A-Za-z0-9_.\-\/]+\.[A-Za-z0-9]+)$/i))) {
            const locMap = {
                workspace: 'в рабочей области',
                project: 'в проекте',
                repo: 'в репозитории',
                repository: 'в репозитории',
                production: 'в продакшене',
                dev: 'в режиме разработки',
                development: 'в режиме разработки'
            };
            tails.unshift(locMap[m[2].toLowerCase()] || `в ${m[2]}`);
            p = m[1].trim();
            changedTail = true;
        } else if ((m = p.match(/^(.+?)\s+for\s+(production|dev|development|windows|macos|linux|[A-Za-z0-9_.\-\/]+)$/i))) {
            const forMap = {
                production: 'для продакшена',
                dev: 'для разработки',
                development: 'для разработки',
                windows: 'для Windows',
                macos: 'для macOS',
                linux: 'для Linux'
            };
            const targetTok = m[2];
            if (forMap[targetTok.toLowerCase()] || /[A-Z0-9._\-\/]/.test(targetTok) || SUMMARY_KNOWN_TECH_LOWER.has(targetTok.toLowerCase())) {
                tails.unshift(forMap[targetTok.toLowerCase()] || `для ${targetTok}`);
                p = m[1].trim();
                changedTail = true;
            }
        } else if ((m = p.match(/^(.+?)\s+via\s+([A-Za-z0-9_.\-\/()]+)$/i))) {
            if (/[A-Z0-9._\-\/()]/.test(m[2]) || SUMMARY_KNOWN_TECH_LOWER.has(m[2].toLowerCase())) {
                tails.unshift(`через ${m[2]}`);
                p = m[1].trim();
                changedTail = true;
            }
        } else if (isStepContext && (m = p.match(/^(.+?)\s+from\s+(.+)$/i)) && !/\s+from\s+/i.test(m[2])) {
            const rawFrom = m[2].trim();
            const subFrom = translateSummaryAtomicObjectGenitive(rawFrom, true);
            if (subFrom) {
                const prep = /\b(?:endpoint|server|site|page|branch|эндпоинт|сервер|сайт|страниц|ветк)/i.test(rawFrom) ? 'с' : 'из';
                tails.unshift(`${prep} ${subFrom}`);
                p = m[1].trim();
                changedTail = true;
            }
        } else if (isStepContext && (m = p.match(/^(.+?)\s+with\s+(.+)$/i)) && !/\s+with\s+/i.test(m[2])) {
            const rawWith = m[2].trim();
            if (/^[A-Za-z0-9_.#\-()]+$/.test(rawWith)) {
                const prep = /[A-Z()]/.test(rawWith) ? 'с помощью' : 'с';
                tails.unshift(`${prep} ${rawWith}`);
                p = m[1].trim();
                changedTail = true;
            } else {
                const subWith = translateSummaryAtomicObjectGenitive(rawWith, true);
                if (subWith) {
                    tails.unshift(`с ${subWith}`);
                    p = m[1].trim();
                    changedTail = true;
                }
            }
        } else if (isStepContext && (m = p.match(/^(.+?)\s+(after|before)\s+(.+)$/i)) && !/\s+(?:after|before)\s+/i.test(m[3])) {
            const subTime = translateSummaryAtomicObjectGenitive(m[3].trim(), true);
            if (subTime) {
                tails.unshift(`${m[2].toLowerCase() === 'after' ? 'после' : 'до'} ${subTime}`);
                p = m[1].trim();
                changedTail = true;
            }
        }
    }

    const tailStr = tails.length ? (' ' + tails.join(' ')) : '';

    const words = p.split(/\s+/);
    for (let splitIdx = 0; splitIdx < words.length; splitIdx++) {
        const suffixCandidate = words.slice(splitIdx).join(' ');
        for (const [re, ruHead, gender] of SUMMARY_HEAD_NOUNS_GEN) {
            if (re.test(suffixCandidate)) {
                const prefixTokens = words.slice(0, splitIdx);
                const ruAdjs = [];
                const postMods = [];
                for (const tok of prefixTokens) {
                    const lowTok = tok.toLowerCase();
                    if (isStepContext && (lowTok === 'the' || lowTok === 'a' || lowTok === 'an')) {
                        continue;
                    }
                    if (SUMMARY_ADJ_GEN[lowTok]) {
                        const adjVal = SUMMARY_ADJ_GEN[lowTok][gender] || SUMMARY_ADJ_GEN[lowTok].m;
                        if (!ruHead.toLowerCase().startsWith(adjVal.toLowerCase())) {
                            ruAdjs.push(adjVal);
                        }
                    } else if (SUMMARY_MODIFIER_NOUN_GEN[lowTok]) {
                        postMods.push(SUMMARY_MODIFIER_NOUN_GEN[lowTok]);
                    } else if (/[A-Z0-9._\-\/@:+#()]/.test(tok) || SUMMARY_KNOWN_TECH_LOWER.has(lowTok)) {
                        postMods.push(tok);
                    } else {
                        return null;
                    }
                }
                const adjPart = ruAdjs.length ? (ruAdjs.join(' ') + ' ') : '';
                const postPart = postMods.length ? (' ' + postMods.join(' ')) : '';
                return `${adjPart}${ruHead}${postPart}${tailStr}`.replace(/\s+/g, ' ').trim();
            }
        }
    }

    const lastWord = words[words.length - 1];
    if (/[A-Z0-9._\-\/@:+#()]/.test(lastWord) || SUMMARY_KNOWN_TECH_LOWER.has(lastWord.toLowerCase())) {
        if (words.length === 1) {
            return `${lastWord}${tailStr}`;
        }
        const leadAdjs = [];
        let allLeadAdj = true;
        for (let i = 0; i < words.length - 1; i++) {
            const lw = words[i].toLowerCase();
            if (isStepContext && (lw === 'the' || lw === 'a' || lw === 'an')) continue;
            if (SUMMARY_ADJ_GEN[lw]) {
                leadAdjs.push(SUMMARY_ADJ_GEN[lw].m);
            } else {
                allLeadAdj = false;
                break;
            }
        }
        if (allLeadAdj && leadAdjs.length > 0 && /[._\/@:+#()]/.test(lastWord)) {
            return `${leadAdjs.join(' ')} ${lastWord}${tailStr}`;
        }
    }

    return null;
}

function translateSummaryObjectGenitive(rest, isStepContext) {
    if (!rest) return null;
    const trimmed = rest.trim();
    if (/(?:,\s+and\s+|\s+and\s+|,\s+)/i.test(trimmed)) {
        const parts = trimmed.split(/\s*(?:,\s+and\s+|\s+and\s+|,\s+)\s*/i).filter(Boolean);
        if (parts.length >= 2 && parts.length <= 8) {
            const out = [];
            let ok = true;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const tr = translateSummaryAtomicObjectGenitive(part, isStepContext);
                if (tr) {
                    out.push(tr);
                } else if (isStepContext && i === parts.length - 1 && out.length >= 1 && /^[A-Za-z0-9_.#\-()]{1,16}$/.test(part)) {
                    // Truncated final token before ellipsis (e.g. "..., CTA icon, and pi...")
                    out.push(part);
                } else {
                    ok = false;
                    break;
                }
            }
            if (ok && out.length >= 2) {
                if (out.length === 2) return `${out[0]} и ${out[1]}`;
                return out.slice(0, -1).join(', ') + ' и ' + out[out.length - 1];
            }
        }
    }
    return translateSummaryAtomicObjectGenitive(trimmed, isStepContext);
}

function translateStepLooseRemainder(rawRest) {
    if (!rawRest) return rawRest;
    let r = rawRest.trim().replace(/^(?:the|a|an)\s+/i, '');
    const chunks = r.split(/(\s*,\s+and\s+|\s+and\s+|\s*,\s+)/i);
    const out = chunks.map((chunk) => {
        if (/^\s*,\s+and\s+$/i.test(chunk) || /^\s+and\s+$/i.test(chunk)) return ' и ';
        if (/^\s*,\s*$/.test(chunk)) return ', ';
        const strictChunk = translateSummaryAtomicObjectGenitive(chunk, true);
        if (strictChunk) return strictChunk;
        return chunk
            .replace(/\bafter\s+frame\s+load\b/gi, 'после загрузки фрейма')
            .replace(/\bafter\s+page\s+load\b/gi, 'после загрузки страницы')
            .replace(/\bafter\s+fr([a-z]*)$/i, 'после фр$1')
            .replace(/\btable\s+pr([a-z]*)$/i, 'прогресса таблицы')
            .replace(/\bspeec([a-z]*)$/i, 'речевого облачка')
            .replace(/\bverifi([a-z]*)$/i, 'проверки')
            .replace(/\bmob([a-z]*)$/i, 'мобильного элемента')
            .replace(/\bstage\s+phase\b/gi, 'фазы сцены')
            .replace(/\btable\s+progress\b/gi, 'прогресса таблицы')
            .replace(/\bmobile\s+bubble\b/gi, 'мобильного облачка')
            .replace(/\bspeech\s+bubble\b/gi, 'облачка речи')
            .replace(/\bruntime\s+error\s+logs?\b/gi, 'рантайм-логов ошибок')
            .replace(/\berror\s+logs?\b/gi, 'логов ошибок')
            .replace(/\braw\s+endpoints?\b/gi, 'прямого эндпоинта')
            .replace(/\bcrate\s+sources?\b/gi, 'исходников крейта')
            .replace(/\bcapabilities\b/gi, 'возможностей')
            .replace(/\bphase\b/gi, 'фазы')
            .replace(/\bprogress\b/gi, 'прогресса')
            .replace(/\bheight\b/gi, 'высоты')
            .replace(/\bwidth\b/gi, 'ширины')
            .replace(/\bicon\b/gi, 'иконки')
            .replace(/\bbutton\b/gi, 'кнопки')
            .replace(/\bpill\b/gi, 'плашки')
            .replace(/\bafter\s+/gi, 'после ')
            .replace(/\bbefore\s+/gi, 'до ')
            .replace(/\bwith\s+/gi, 'с ')
            .replace(/\bfrom\s+/gi, 'из ')
            .replace(/\bin\s+(?=[A-Za-z0-9_.#\/])/gi, 'в ')
            .replace(/\bon\s+(?=[A-Za-z0-9_.#\/])/gi, 'на ');
    });
    return out.join('').replace(/\s+/g, ' ').trim();
}

function translateSingleEnglishClause(clause, isFirstClause, isStepContext = false, strictOnly = false) {
    if (!clause) return clause;
    const c = clause.trim();
    const lower = c.toLowerCase();

    const pluralizeRu = (count, one, two, five) => {
        const n = Math.abs(count) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    };

    const standaloneVerbNouns = {
        'lint': ['Линтинг', 'линтинг'],
        'linting': ['Линтинг', 'линтинг'],
        'typecheck': ['Проверка типов', 'проверка типов'],
        'type-check': ['Проверка типов', 'проверка типов'],
        'typechecking': ['Проверка типов', 'проверка типов'],
        'build': ['Сборка', 'сборка'],
        'compile': ['Компиляция', 'компиляция'],
        'test': ['Тестирование', 'тестирование'],
        'tests': ['Тесты', 'тесты'],
        'format': ['Форматирование', 'форматирование'],
        'clean': ['Очистка', 'очистка'],
        'deploy': ['Развёртывание', 'развёртывание'],
        'stage': ['Индексация', 'индексация'],
        'commit': ['Коммит', 'коммит'],
        'push': ['Отправка', 'отправка'],
        'pull': ['Получение', 'получение'],
        'verify': ['Проверка', 'проверка'],
        'validate': ['Валидация', 'валидация'],
        'restore clean core': ['Восстановление чистого ядра', 'восстановление чистого ядра'],
        'create atomic snapshot': ['Создание атомарного снимка', 'создание атомарного снимка']
    };
    if (standaloneVerbNouns[lower]) {
        return isFirstClause ? standaloneVerbNouns[lower][0] : standaloneVerbNouns[lower][1];
    }

    // "search lib.rs for updater plugin and write_js_log" -> "Поиск плагина апдейтера и write_js_log в lib.rs"
    const mSearchInFor = c.match(/^(search|grep|scan)\s+([A-Za-z0-9_.\-\/\\]+)\s+for\s+(.+)$/i);
    if (mSearchInFor) {
        const vWord = mSearchInFor[1].toLowerCase() === 'scan'
            ? (isFirstClause ? 'Сканирование' : 'сканирование')
            : (isFirstClause ? 'Поиск' : 'поиск');
        const whereTarget = mSearchInFor[2];
        const queryObj = translateSummaryObjectGenitive(mSearchInFor[3].trim(), isStepContext)
            || (isStepContext && !strictOnly ? translateStepLooseRemainder(mSearchInFor[3].trim()) : null);
        if (queryObj) {
            return `${vWord} ${queryObj} в ${whereTarget}`;
        }
    }

    if (/^publish\s+(all\s+)?(\d+)\s+approved\s+doc(?:ument)?\s+revisions?\s+to\s+(\S+)$/i.test(c)) {
        const m = c.match(/^publish\s+(all\s+)?(\d+)\s+approved\s+doc(?:ument)?\s+revisions?\s+to\s+(\S+)$/i);
        const hasAll = Boolean(m[1]);
        const cnt = parseInt(m[2], 10);
        const revPhrase = hasAll ? 'утверждённых ревизий' : pluralizeRu(cnt, 'утверждённой ревизии', 'утверждённых ревизий', 'утверждённых ревизий');
        const dest = /^db$/i.test(m[3]) ? 'БД' : m[3];
        const prefix = isFirstClause ? 'Публикация' : 'публикация';
        return `${prefix} ${hasAll ? 'всех ' : ''}${cnt} ${revPhrase} документов в ${dest}`;
    }
    if (/^publish\s+(all\s+)?(\d+)\s+doc(?:ument)?\s+revisions?\s+to\s+(\S+)$/i.test(c)) {
        const m = c.match(/^publish\s+(all\s+)?(\d+)\s+doc(?:ument)?\s+revisions?\s+to\s+(\S+)$/i);
        const hasAll = Boolean(m[1]);
        const cnt = parseInt(m[2], 10);
        const revPhrase = hasAll ? 'ревизий' : pluralizeRu(cnt, 'ревизии', 'ревизий', 'ревизий');
        const dest = /^db$/i.test(m[3]) ? 'БД' : m[3];
        const prefix = isFirstClause ? 'Публикация' : 'публикация';
        return `${prefix} ${hasAll ? 'всех ' : ''}${cnt} ${revPhrase} документов в ${dest}`;
    }

    const verbMap = [
        [/^wait\s+(?:for|until)\s+(.+)$/i, 'Ожидание', 'ожидание'],
        [/^align\s+(.+)$/i, 'Выравнивание', 'выравнивание'],
        [/^scroll\s+(?:to|into\s+view)\s+(.+)$/i, 'Прокрутка к', 'прокрутка к'],
        [/^scroll\s+(.+)$/i, 'Прокрутка', 'прокрутка'],
        [/^(?:navigate|go)\s+to\s+(.+)$/i, 'Переход к', 'переход к'],
        [/^switch\s+to\s+(.+)$/i, 'Переключение на', 'переключение на'],
        [/^click(?:\s+on)?\s+(.+)$/i, 'Нажатие на', 'нажатие на'],
        [/^hover(?:\s+over)?\s+(.+)$/i, 'Наведение на', 'наведение на'],
        [/^(?:fill(?:\s+in)?|type\s+into)\s+(.+)$/i, 'Заполнение', 'заполнение'],
        [/^(?:capture|take)\s+(.+)$/i, 'Снятие', 'снятие'],
        [/^measure\s+(.+)$/i, 'Измерение', 'измерение'],
        [/^assert\s+(.+)$/i, 'Проверка', 'проверка'],
        [/^ensure\s+(.+)$/i, 'Проверка', 'проверка'],
        [/^confirm\s+(.+)$/i, 'Подтверждение', 'подтверждение'],
        [/^observe\s+(.+)$/i, 'Наблюдение', 'наблюдение'],
        [/^resize\s+(.+)$/i, 'Изменение размера', 'изменение размера'],
        [/^toggle\s+(.+)$/i, 'Переключение', 'переключение'],
        [/^select\s+(.+)$/i, 'Выбор', 'выбор'],
        [/^submit\s+(.+)$/i, 'Отправка', 'отправка'],
        [/^re-?run\s+(.+)$/i, 'Повторный запуск', 'повторный запуск'],
        [/^re-?(?:check|verify)\s+(.+)$/i, 'Повторная проверка', 'повторная проверка'],
        [/^re-?test\s+(.+)$/i, 'Повторное тестирование', 'повторное тестирование'],
        [/^re-?build\s+(.+)$/i, 'Пересборка', 'пересборка'],
        [/^(?:start|spin\s+up|boot)\s+(.+)$/i, 'Запуск', 'запуск'],
        [/^(?:stop|shut\s*down|kill|terminate)\s+(.+)$/i, 'Остановка', 'остановка'],
        [/^(?:restart|relaunch)\s+(.+)$/i, 'Перезапуск', 'перезапуск'],
        [/^(?:reload|refresh)\s+(.+)$/i, 'Перезагрузка', 'перезагрузка'],
        [/^lint\s+(.+)$/i, 'Линтинг', 'линтинг'],
        [/^type[\s-]?check\s+(.+)$/i, 'Проверка типов', 'проверка типов'],
        [/^format\s+(.+)$/i, 'Форматирование', 'форматирование'],
        [/^compile\s+(.+)$/i, 'Компиляция', 'компиляция'],
        [/^(?:bundle|pack)\s+(.+)$/i, 'Упаковка', 'упаковка'],
        [/^audit\s+(.+)$/i, 'Аудит', 'аудит'],
        [/^(?:analyze|analyse)\s+(.+)$/i, 'Анализ', 'анализ'],
        [/^(?:debug|diagnose)\s+(.+)$/i, 'Отладка', 'отладка'],
        [/^restore\s+(.+)$/i, 'Восстановление', 'восстановление'],
        [/^publish\s+(.+)$/i, 'Публикация', 'публикация'],
        [/^create\s+(.+)$/i, 'Создание', 'создание'],
        [/^add\s+(.+)$/i, 'Добавление', 'добавление'],
        [/^verify\s+(.+)$/i, 'Проверка', 'проверка'],
        [/^validate\s+(.+)$/i, 'Валидация', 'валидация'],
        [/^check\s+(.+)$/i, 'Проверка', 'проверка'],
        [/^inspect\s+(.+)$/i, 'Проверка', 'проверка'],
        [/^read\s+(.+)$/i, 'Чтение', 'чтение'],
        [/^(?:write|save)\s+(.+)$/i, 'Запись', 'запись'],
        [/^(?:edit|modify)\s+(.+)$/i, 'Изменение', 'изменение'],
        [/^patch\s+(.+)$/i, 'Патчинг', 'патчинг'],
        [/^apply\s+(.+)$/i, 'Применение', 'применение'],
        [/^(?:fetch|retrieve|get|load)\s+(.+)$/i, 'Получение', 'получение'],
        [/^query\s+(.+)$/i, 'Запрос', 'запрос'],
        [/^list\s+(.+)$/i, 'Список', 'список'],
        [/^scan\s+(.+)$/i, 'Сканирование', 'сканирование'],
        [/^sync(?:hronize)?\s+(.+)$/i, 'Синхронизация', 'синхронизация'],
        [/^seed\s+(.+)$/i, 'Заполнение', 'заполнение'],
        [/^populate\s+(.+)$/i, 'Заполнение', 'заполнение'],
        [/^migrate\s+(.+)$/i, 'Миграция', 'миграция'],
        [/^upsert\s+(.+)$/i, 'Обновление', 'обновление'],
        [/^(?:update|upgrade|bump)\s+(.+)$/i, 'Обновление', 'обновление'],
        [/^extract\s+(.+)$/i, 'Извлечение', 'извлечение'],
        [/^(?:compare|diff)\s+(.+)$/i, 'Сравнение', 'сравнение'],
        [/^(?:find|locate|grep)\s+(.+)$/i, 'Поиск', 'поиск'],
        [/^search\s+(.+)$/i, 'Поиск', 'поиск'],
        [/^seal\s+(.+)$/i, 'Фиксация', 'фиксация'],
        [/^print\s+(.+)$/i, 'Вывод', 'вывод'],
        [/^count\s+(.+)$/i, 'Подсчёт', 'подсчёт'],
        [/^launch\s+(.+)$/i, 'Запуск', 'запуск'],
        [/^execute\s+(.+)$/i, 'Выполнение', 'выполнение'],
        [/^run\s+(.+)$/i, 'Запуск', 'запуск'],
        [/^test\s+(.+)$/i, 'Тестирование', 'тестирование'],
        [/^(?:clean|clear|purge|prune)\s+(.+)$/i, 'Очистка', 'очистка'],
        [/^reset\s+(.+)$/i, 'Сброс', 'сброс'],
        [/^revert\s+(.+)$/i, 'Откат', 'откат'],
        [/^stage\s+(.+)$/i, 'Индексация', 'индексация'],
        [/^commit\s+(.+)$/i, 'Коммит', 'коммит'],
        [/^push\s+(.+)$/i, 'Отправка', 'отправка'],
        [/^pull\s+(.+)$/i, 'Получение', 'получение'],
        [/^merge\s+(.+)$/i, 'Слияние', 'слияние'],
        [/^clone\s+(.+)$/i, 'Клонирование', 'клонирование'],
        [/^upload\s+(.+)$/i, 'Загрузка', 'загрузка'],
        [/^download\s+(.+)$/i, 'Скачивание', 'скачивание'],
        [/^copy\s+(.+)$/i, 'Копирование', 'копирование'],
        [/^(?:move|rename)\s+(.+)$/i, 'Переименование', 'переименование'],
        [/^(?:delete|remove|uninstall)\s+(.+)$/i, 'Удаление', 'удаление'],
        [/^build\s+(.+)$/i, 'Сборка', 'сборка'],
        [/^deploy\s+(.+)$/i, 'Развёртывание', 'развёртывание'],
        [/^(?:fix|repair|resolve)\s+(.+)$/i, 'Исправление', 'исправление'],
        [/^generate\s+(.+)$/i, 'Генерация', 'генерация'],
        [/^init(?:ialize)?\s+(.+)$/i, 'Инициализация', 'инициализация'],
        [/^install\s+(.+)$/i, 'Установка', 'установка'],
        [/^(?:configure|set\s+up|setup)\s+(.+)$/i, 'Настройка', 'настройка'],
        [/^open\s+(.+)$/i, 'Открытие', 'открытие'],
        [/^close\s+(.+)$/i, 'Закрытие', 'закрытие'],
        [/^serve\s+(.+)$/i, 'Раздача', 'раздача'],
        [/^(?:watch|monitor)\s+(.+)$/i, 'Мониторинг', 'мониторинг'],
        [/^disable\s+(.+)$/i, 'Отключение', 'отключение'],
        [/^enable\s+(.+)$/i, 'Включение', 'включение']
    ];

    for (const [re, capNoun, lowNoun] of verbMap) {
        const m = c.match(re);
        if (m) {
            let rest = m[1].trim();
            const origRest = rest;
            const hasEnglishProseTokens = isStepContext
                ? /\b(?:my|your|our|their|its|this|that|these|those|it|by|or|if|so|we|you|me|us|they|them|when|where|while|whether|without|against|should|would|could|can|will)\b/i.test(origRest)
                : /\b(?:a|an|the|my|your|our|their|its|this|that|these|those|it|on|by|as|or|if|so|we|you|me|us|they|them|when|where|while|whether|before|after|without|against|should|would|could|can|will)\b/i.test(origRest);

            if (!hasEnglishProseTokens) {
                const compObj = translateSummaryObjectGenitive(origRest, isStepContext);
                if (compObj) {
                    return `${isFirstClause ? capNoun : lowNoun} ${compObj}`;
                }
            }

            if (strictOnly) {
                return null;
            }

            rest = rest
                .replace(/\bclean\s+core\b/gi, 'чистого ядра')
                .replace(/\batomic\s+pre-worker\s+snapshot\b/gi, 'атомарного снимка перед воркером')
                .replace(/\batomic\s+pre-execution\s+snapshot\b/gi, 'атомарного снимка перед выполнением')
                .replace(/\bpre-worker\s+snapshot\b/gi, 'снимка перед воркером')
                .replace(/\batomic\s+snapshot\b/gi, 'атомарного снимка')
                .replace(/\bapproved\s+doc(?:ument)?\s+revisions?\b/gi, 'утверждённых ревизий документов')
                .replace(/\bdoc(?:ument)?\s+revisions?\b/gi, 'ревизий документов')
                .replace(/\bcanonical\s+role\s+presets?\b/gi, 'канонических пресетов ролей')
                .replace(/\bmissing\s+canonical\s+role\s+presets?\b/gi, 'недостающих канонических пресетов ролей')
                .replace(/\bin\s+read-only\s+mode\b/gi, 'в режиме только для чтения')
                .replace(/\bacross\s+all\s+(\d+)\s+modules\s+in\s+(\S+)\s+contour\b/gi, 'по всем $1 модулям в контуре $2')
                .replace(/\bacross\s+contours\b/gi, 'между контурами')
                .replace(/\bacross\s+workspace,\s*beta,\s*and\s*main\b/gi, 'между рабочей областью, beta и main')
                .replace(/\bin\s+Beta\s+project\s+DB\b/gi, 'в БД проекта Beta')
                .replace(/\bfrom\s+Beta\s+project\s+DB\b/gi, 'из БД проекта Beta')
                .replace(/\bin\s+Beta\s+DBs?\b/gi, 'в БД Beta')
                .replace(/\bto\s+DB\b/gi, 'в БД')
                .replace(/\bin\s+DB\b/gi, 'в БД')
                .replace(/\bto\s+(\S+\.db)\b/gi, 'в $1')
                .replace(/\bfrom\s+snapshot\b/gi, 'из снимка')
                .replace(/\bwith\s+snapshot\b/gi, 'со снимком')
                .replace(/\bsource\s+code\b/gi, 'исходного кода')
                .replace(/\bsignatures?\b/gi, 'сигнатур');
            if (!hasEnglishProseTokens) {
                rest = rest.replace(/\bin\s+(\S+)\b/gi, 'в $1');
            }
            if (rest === origRest) {
                if (isStepContext && !hasEnglishProseTokens) {
                    const loose = translateStepLooseRemainder(origRest);
                    return `${isFirstClause ? capNoun : lowNoun} ${loose}`;
                }
                if (rest.split(/\s+/).length > 3 || hasEnglishProseTokens || /\b(?:with|from|into|for|to)\b/i.test(rest)) {
                    return null;
                }
            }
            return `${isFirstClause ? capNoun : lowNoun} ${rest}`;
        }
    }

    const SUMMARY_ADJ_NOM = {
        full: { m: 'Полный', f: 'Полная', n: 'Полное' },
        complete: { m: 'Полный', f: 'Полная', n: 'Полное' },
        quick: { m: 'Быстрый', f: 'Быстрая', n: 'Быстрое' },
        fast: { m: 'Быстрый', f: 'Быстрая', n: 'Быстрое' },
        clean: { m: 'Чистый', f: 'Чистая', n: 'Чистое' },
        fresh: { m: 'Чистый', f: 'Чистая', n: 'Чистое' },
        initial: { m: 'Начальный', f: 'Начальная', n: 'Начальное' },
        final: { m: 'Финальный', f: 'Финальная', n: 'Финальное' },
        local: { m: 'Локальный', f: 'Локальная', n: 'Локальное' },
        remote: { m: 'Удалённый', f: 'Удалённая', n: 'Удалённое' }
    };
    const nounFinalMap = [
        [/^(.+?)\s+(?:checks?|verification)$/i, 'Проверка', 'проверка', 'f'],
        [/^(.+?)\s+validation$/i, 'Валидация', 'валидация', 'f'],
        [/^(.+?)\s+execution$/i, 'Выполнение', 'выполнение', 'n'],
        [/^(.+?)\s+(?:startup|launch)$/i, 'Запуск', 'запуск', 'm'],
        [/^(.+?)\s+shutdown$/i, 'Остановка', 'остановка', 'f'],
        [/^(.+?)\s+cleanup$/i, 'Очистка', 'очистка', 'f'],
        [/^(.+?)\s+compilation$/i, 'Компиляция', 'компиляция', 'f'],
        [/^(.+?)\s+installation$/i, 'Установка', 'установка', 'f'],
        [/^(.+?)\s+build$/i, 'Сборка', 'сборка', 'f']
    ];
    for (const [re, capNoun, lowNoun, gender] of nounFinalMap) {
        const m = c.match(re);
        if (m) {
            const rawObj = m[1].trim();
            const objGen = translateSummaryObjectGenitive(rawObj, isStepContext);
            if (objGen) {
                return `${isFirstClause ? capNoun : lowNoun} ${objGen}`;
            }
            const adjSplit = rawObj.match(/^([A-Za-z]+)\s+(.+)$/);
            if (adjSplit && SUMMARY_ADJ_NOM[adjSplit[1].toLowerCase()]) {
                const subGen = translateSummaryObjectGenitive(adjSplit[2].trim(), isStepContext);
                if (subGen) {
                    const nomAdj = SUMMARY_ADJ_NOM[adjSplit[1].toLowerCase()][gender] || SUMMARY_ADJ_NOM[adjSplit[1].toLowerCase()].f;
                    const adjFormatted = isFirstClause ? nomAdj : lowercaseFirstCyrillic(nomAdj);
                    return `${adjFormatted} ${lowNoun} ${subGen}`;
                }
            }
        }
    }

    return null;
}

function translateEnglishCommandSummary(text, isStepContext = false) {
    if (!text) return null;
    let rawInput = text.trim();
    // Allow re-translating half-translated "Тест: <English>" from older regex
    if (/^Тест:\s+[A-Za-z#.]/.test(rawInput)) {
        rawInput = 'Test ' + rawInput.replace(/^Тест:\s+/, '');
    }
    if (/[а-яА-ЯёЁ]/.test(rawInput)) return null;

    let trailingEllipsis = '';
    const mEll = rawInput.match(/^(.*?)(\.{3}|…)$/);
    if (mEll && mEll[1].trim()) {
        rawInput = mEll[1].trim();
        trailingEllipsis = mEll[2];
    }

    const t = rawInput;
    const lower = t.toLowerCase();

    if (lower === 'restore clean core, publish 21 doc revisions to db, and create atomic snapshot') {
        return 'Восстановление чистого ядра, публикация 21 ревизии документов в БД и создание атомарного снимка' + trailingEllipsis;
    }
    if (lower === 'publish 21 approved doc revisions to project.db and create atomic snapshot') {
        return 'Публикация 21 утверждённой ревизии документов в project.db и создание атомарного снимка' + trailingEllipsis;
    }

    // First try strict single-clause parse so comma-separated object lists ("Inspect stage phase, table progress, ...") stay grouped under one verb
    const singleStrict = translateSingleEnglishClause(t, true, isStepContext, true);
    if (singleStrict) {
        return singleStrict + trailingEllipsis;
    }

    const verbLookahead = '(?:wait\\s+for|wait\\s+until|align|scroll|navigate\\s+to|go\\s+to|click|hover|fill|capture|measure|assert|ensure|confirm|observe|resize|re-?run|re-?check|re-?verify|re-?test|re-?build|start|spin\\s+up|boot|stop|shut\\s*down|kill|terminate|restart|relaunch|reload|refresh|lint|type[\\s-]?check|format|compile|bundle|pack|audit|analyze|analyse|debug|diagnose|restore|publish|create|add|verify|validate|check|inspect|read|write|save|edit|modify|patch|apply|fetch|retrieve|get|load|query|list|scan|sync|synchronize|seed|populate|migrate|upsert|update|upgrade|bump|extract|compare|diff|find|locate|grep|search|seal|print|count|launch|execute|run|test|clean|clear|purge|prune|reset|revert|stage|commit|push|pull|merge|clone|upload|download|copy|move|rename|delete|remove|uninstall|build|deploy|fix|repair|resolve|generate|init|initialize|install|configure|set\\s+up|setup|open|close|serve|watch|monitor|disable|enable)(?:\\s|,|$)';
    const splitRe = new RegExp(`\\s*(?:,\\s+and\\s+|\\s+and\\s+(?=${verbLookahead})|,\\s+(?=${verbLookahead}))`, 'i');

    if (splitRe.test(t)) {
        const rawParts = t.split(splitRe);
        const translatedParts = [];
        let allTranslated = rawParts.length > 0;
        for (let i = 0; i < rawParts.length; i++) {
            const tr = translateSingleEnglishClause(rawParts[i], i === 0, isStepContext, false);
            if (tr) {
                translatedParts.push(tr);
            } else {
                allTranslated = false;
                break;
            }
        }
        if (allTranslated) {
            if (translatedParts.length === 2) {
                return `${translatedParts[0]} и ${translatedParts[1]}${trailingEllipsis}`;
            }
            if (translatedParts.length > 2) {
                return translatedParts.slice(0, -1).join(', ') + ' и ' + translatedParts[translatedParts.length - 1] + trailingEllipsis;
            }
            return translatedParts[0] + trailingEllipsis;
        }
    }

    const fallbackSingle = translateSingleEnglishClause(t, true, isStepContext, false);
    return fallbackSingle ? (fallbackSingle + trailingEllipsis) : null;
}

function translateBrowserStepIntent(raw) {
    if (!raw) return raw;
    let s = raw.trim();
    if (!s) return raw;
    const mThink = s.match(/^Thinking(?:\s*\((\d+(?:\.\d+)?)s\))?([\u2026.]*)$/i);
    if (mThink) {
        return `Размышляет${mThink[1] ? ` (${mThink[1]} сек)` : ''}${mThink[2] || ''}`;
    }
    let repeatSuffix = '';
    const mRep = s.match(/^(.*?)\s*(×\d+)$/);
    if (mRep && mRep[1].trim()) {
        s = mRep[1].trim();
        repeatSuffix = ' ' + mRep[2];
    }
    if (s.includes('↔')) {
        const segs = s.split(/\s*↔\s*/);
        const trSegs = segs.map(seg => {
            const dict = translationDictionary[seg.toLowerCase()];
            if (dict) return dict;
            const cmd = translateEnglishCommandSummary(seg, true);
            return cmd ? uppercaseFirstCyrillic(cmd) : seg;
        });
        return trSegs.join(' ↔ ') + repeatSuffix;
    }
    const dictHit = translationDictionary[s.toLowerCase()];
    if (dictHit) return dictHit + repeatSuffix;
    const cmdHit = translateEnglishCommandSummary(s, true);
    if (cmdHit) return uppercaseFirstCyrillic(cmdHit) + repeatSuffix;
    return raw;
}

function localizeActionTarget(target, isStepContext = false) {
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
    if (/^git\s+status$/i.test(t)) return 'статуса Git';
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
    if (translationDictionary[lower]) {
        return translationDictionary[lower];
    }

    if (!isStepContext) {
        const objFirst = translateSummaryObjectGenitive(t, true);
        if (objFirst && objFirst !== t) {
            return objFirst;
        }
    }

    const cmdSummaryTranslated = translateEnglishCommandSummary(t, isStepContext);
    if (cmdSummaryTranslated) {
        return cmdSummaryTranslated;
    }

    const objGenTranslated = translateSummaryObjectGenitive(t, isStepContext);
    if (objGenTranslated && objGenTranslated !== t) {
        return objGenTranslated;
    }

    if (/unit\s+tests?$/i.test(t)) return t.replace(/unit\s+tests?$/i, 'unit-тестов');
    if (/tests?$/i.test(t)) return t.replace(/tests?$/i, 'тестов');

    return t;
}

function isLikelyEnglishProseTarget(s) {
    if (!s) return false;
    const trimmed = String(s).trim();
    if (!trimmed) return false;
    const words = trimmed.split(/\s+/);
    if (words.length > 3) return true;
    return /\b(?:a|an|the|my|your|our|their|its|this|that|these|those|it|on|by|as|or|if|so|we|you|me|us|they|them|when|where|while|whether|before|after|without|across|into|through|against|between|should|would|could|have|has|had|who|what|which|how|why|can|will|do|does|did|not|only|every|each)\b/i.test(trimmed);
}

function isTitleCaseName(s) {
    if (!s) return false;
    const trimmed = String(s).trim();
    const words = trimmed.split(/\s+/);
    if (words.length === 0 || words.length > 6) return false;
    if (/\b(?:a|an|the|my|your|our|their|its|this|that|these|those|is|are|was|were|be|been|you|we|they|when|where|while|which|what|how|should|would|could)\b/i.test(trimmed)) {
        return false;
    }
    return words.every(w => /^[A-Z0-9][A-Za-z0-9.+_-]*(?:\s*\/\s*[A-Za-z0-9.+_-]+)?$/.test(w) || /^(?:for|of|and|with|in|on|to|by|&|-|–|—)$/i.test(w));
}

function pluralizeRuCount(count, one, two, five) {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    return five;
}
