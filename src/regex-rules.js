const regexTranslations = [
    {
        pattern: /^Hey\s+(.+?),\s+what\s+should\s+we\s+build\s+today\?$/i,
        replace: (match) => `Привет, ${match[1].trim()}! Что создадим сегодня?`
    },
    {
        pattern: /^Welcome\s+back,\s+(.+?)\.\s+Where\s+should\s+we\s+pick\s+up\?$/i,
        replace: (match) => `С возвращением, ${match[1].trim()}! С чего продолжим?`
    },
    {
        pattern: /^Good\s+to\s+see\s+you,\s+(.+?)\.\s+What['’]s\s+next\?$/i,
        replace: (match) => `Рады видеть вас, ${match[1].trim()}! Что дальше?`
    },
    {
        pattern: /^Hi\s+(.+?),\s+what can we get done today\?$/i,
        replace: (match) => `Привет, ${match[1].trim()}! Чем займёмся сегодня?`
    },
    {
        pattern: /^(?:Hi|Hello|Hey),?\s+([^${}!?.]+?)[.!]*$/i,
        replace: (match) => `Привет, ${match[1].trim()}!`
    },
    {
        pattern: /^Welcome\s+back,\s+([^${}!?.]+?)[.!]*$/i,
        replace: (match) => `С возвращением, ${match[1].trim()}!`
    },
    {
        pattern: /^Good\s+to\s+see\s+you,\s+([^${}!?.]+?)[.!]*$/i,
        replace: (match) => `Рады видеть вас, ${match[1].trim()}!`
    },
    {
        pattern: /^Welcome\s+to\s+(.+?)!$/i,
        replace: (match) => `Добро пожаловать в ${match[1].trim()}!`
    },
    {
        pattern: /^Card\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (match) => `Карточка ${match[1]} из ${match[2]}`
    },
    {
        pattern: /^Swarm\s+Worker\s*\((.+)\)$/i,
        replace: (match) => `Агент роя (${match[1].trim()})`
    },
    {
        pattern: /^Close\s+Swarm\s+Worker\s*\((.+)\)$/i,
        replace: (match) => `Закрыть агента роя (${match[1].trim()})`
    },
    {
        pattern: /^(\d+)\s+messages?\s+from\s+board\s*\((.+)\)$/i,
        replace: (match) => {
            const c = parseInt(match[1], 10);
            return `${c} ${pluralizeRuCount(c, 'сообщение', 'сообщения', 'сообщений')} с доски (${match[2]})`;
        }
    },
    {
        pattern: /^board\s*\((\d+)\s+messages?\)$/i,
        replace: (match) => {
            const c = parseInt(match[1], 10);
            return `доска (${c} ${pluralizeRuCount(c, 'сообщение', 'сообщения', 'сообщений')})`;
        }
    },
    {
        // Compact sidebar timestamps (case-sensitive so "1M" / "3D" are never touched)
        pattern: /^(\d+)\s*(s|sec|m|min|h|hr|d|w|wk|mo|mos|yr|y)$/,
        replace: (match) => {
            const unitMap = {
                s: 'сек', sec: 'сек',
                m: 'мин', min: 'мин',
                h: 'ч', hr: 'ч',
                d: 'дн.',
                w: 'нед.', wk: 'нед.',
                mo: 'мес.', mos: 'мес.',
                y: 'г.', yr: 'г.'
            };
            return `${match[1]} ${unitMap[match[2]] || match[2]}`;
        }
    },
    {
        pattern: /^(\d+)\s*(?:mo|mos)$/i,
        replace: (match) => `${match[1]} мес.`
    },
    {
        pattern: /^(\d+)\s*(?:h|hr)\s+(\d+)\s*(?:m|min)$/,
        replace: (match) => `${match[1]} ч ${match[2]} мин`
    },
    {
        pattern: /^(\d+)\s*(?:m|min)\s+(\d+)\s*(?:s|sec)$/,
        replace: (match) => `${match[1]} мин ${match[2]} сек`
    },
    {
        pattern: /^(\d+)\s+pinned(?:\s+(conversations?))?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            if (match[2]) {
                const adj = pluralizeRuCount(count, 'закреплённый', 'закреплённых', 'закреплённых');
                const noun = pluralizeRuCount(count, 'диалог', 'диалога', 'диалогов');
                return `${count} ${adj} ${noun}`;
            }
            return `${count} ${pluralizeRuCount(count, 'закреплённый', 'закреплённых', 'закреплённых')}`;
        }
    },
    {
        pattern: /^Fix with Agent:\s*(.+)$/i,
        replace: (match) => `Исправить с агентом: ${match[1]}`
    },
    {
        pattern: /^(?:Error|Ошибка):\s*exit status\s+(.+)$/i,
        replace: (match) => `Ошибка: код выхода ${match[1]}`
    },
    {
        pattern: /^\(([\d\s\u00a0.,]+)\s+tokens?\)\s*(.*)$/i,
        replace: (match) => `(${match[1]} токенов)${match[2] ? ' ' + match[2] : ''}`
    },
    {
        pattern: /^Plugin:\s*(.+)$/i,
        replace: (match) => `Плагин: ${match[1]}`
    },
    {
        pattern: /^Settings for (.+)\.$/i,
        replace: (match) => `Настройки для ${match[1]}.`
    },
    {
        // "3 subagents/tasks running" / "2 tasks running" / "1 subagent running, 1 blocked"
        pattern: /^(?:\d+\s+(?:subagents?\/tasks?|subagents?|tasks?)\s+running|\d+\s+(?:subagents?\s+)?blocked)(?:,\s*(?:\d+\s+(?:subagents?\/tasks?|subagents?|tasks?)\s+running|\d+\s+(?:subagents?\s+)?blocked))*$/i,
        replace: (match) => {
            return match[0].split(/,\s*/).map(part => {
                const mRun = part.match(/^(\d+)\s+(subagents?\/tasks?|subagents?|tasks?)\s+running$/i);
                if (mRun) {
                    const count = parseInt(mRun[1], 10);
                    const kind = mRun[2].toLowerCase();
                    const n = Math.abs(count) % 100;
                    const n1 = n % 10;
                    if (kind.includes('/')) {
                        let noun = 'субагентов/задач';
                        if (n <= 10 || n >= 20) {
                            if (n1 === 1) noun = 'субагент/задача';
                            else if (n1 > 1 && n1 < 5) noun = 'субагента/задачи';
                        }
                        const verb = (n <= 10 || n >= 20) && n1 === 1 ? 'запущен' : 'запущено';
                        return `${count} ${noun} ${verb}`;
                    }
                    if (kind.startsWith('subagent')) {
                        let noun = 'субагентов';
                        if (n <= 10 || n >= 20) {
                            if (n1 === 1) noun = 'субагент';
                            else if (n1 > 1 && n1 < 5) noun = 'субагента';
                        }
                        const verb = (n <= 10 || n >= 20) && n1 === 1 ? 'запущен' : 'запущено';
                        return `${count} ${noun} ${verb}`;
                    }
                    let noun = 'задач';
                    if (n <= 10 || n >= 20) {
                        if (n1 === 1) noun = 'задача';
                        else if (n1 > 1 && n1 < 5) noun = 'задачи';
                    }
                    const verb = (n <= 10 || n >= 20) && n1 === 1 ? 'запущена' : 'запущено';
                    return `${count} ${noun} ${verb}`;
                }
                const mBlk = part.match(/^(\d+)\s+(?:(subagents?)\s+)?blocked$/i);
                if (mBlk) {
                    const count = parseInt(mBlk[1], 10);
                    const n = Math.abs(count) % 100;
                    const n1 = n % 10;
                    if (mBlk[2]) {
                        let noun = 'субагентов';
                        if (n <= 10 || n >= 20) {
                            if (n1 === 1) noun = 'субагент';
                            else if (n1 > 1 && n1 < 5) noun = 'субагента';
                        }
                        const verb = (n <= 10 || n >= 20) && n1 === 1 ? 'ожидает' : 'ожидают';
                        return `${count} ${noun} ${verb}`;
                    }
                    const verb = (n <= 10 || n >= 20) && n1 === 1 ? 'ожидает' : 'ожидают';
                    return `${count} ${verb}`;
                }
                return part;
            }).join(', ');
        }
    },
    {
        // "Timed 5m >" / "Timed 30s" / "Timing 5m >" / "Timed 1m 30s"
        pattern: /^(?:Timed|Timing|Таймер:?)(?:\s+((?:\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|сек|мин|ч|дн)\s*)+))(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const rawDur = match[1].trim().replace(/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/gi, (m, c, u) => {
                const first = u.toLowerCase()[0];
                const map = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                return `${c} ${map[first] || u}`;
            });
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Таймер: ${rawDur}${arrow}`;
        }
    },
    {
        // "Explored, ran command >" / "Explored, edited file >" / "Explored, ran commands, edited files >" (without noun after Explored)
        pattern: /^Explored(?:\s+(files?|artifacts?))?,\s*(?:ran\s+(commands?))?(?:,\s*)?(?:edited(?:\s+(files?|artifacts?))?)?(?:\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»].*))?$/i,
        replace: (match) => {
            const expNoun = (match[1] || '').toLowerCase();
            let expPart = 'Исследовано';
            if (expNoun === 'file') expPart = 'Исследован файл';
            else if (expNoun === 'files') expPart = 'Исследованы файлы';
            else if (expNoun === 'artifact') expPart = 'Исследован артефакт';
            else if (expNoun === 'artifacts') expPart = 'Исследованы артефакты';

            const parts = [expPart];
            if (match[2]) {
                parts.push(match[2].toLowerCase() === 'commands' ? 'выполнены команды' : 'выполнена команда');
            }
            if (/edited/i.test(match[0])) {
                const edNoun = (match[3] || '').toLowerCase();
                if (edNoun === 'file') parts.push('изменен файл');
                else if (edNoun === 'files') parts.push('изменены файлы');
                else if (edNoun === 'artifact') parts.push('изменен артефакт');
                else if (edNoun === 'artifacts') parts.push('изменены артефакты');
                else parts.push('внесены изменения');
            }
            const arrow = match[4] ? (' ' + match[4].trim()) : '';
            return parts.join(', ') + arrow;
        }
    },
    {
        // "Ran command, edited file >" / "Ran commands, edited files >"
        pattern: /^Ran\s+(commands?),\s*edited(?:\s+(files?|artifacts?))?(?:\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»].*))?$/i,
        replace: (match) => {
            const cmdPart = match[1].toLowerCase() === 'commands' ? 'Выполнены команды' : 'Выполнена команда';
            const edNoun = (match[2] || '').toLowerCase();
            let edPart = 'внесены изменения';
            if (edNoun === 'file') edPart = 'изменен файл';
            else if (edNoun === 'files') edPart = 'изменены файлы';
            else if (edNoun === 'artifact') edPart = 'изменен артефакт';
            else if (edNoun === 'artifacts') edPart = 'изменены артефакты';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `${cmdPart}, ${edPart}${arrow}`;
        }
    },
    {
        // "5m timer: Timer has expired >" / "30s timer: ..." / "5m timer:" / "5m timer"
        pattern: /^((?:\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\s*)+)timer(?:\s*:\s*(.*?)?)?(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const rawDur = match[1].trim().replace(/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/gi, (m, c, u) => {
                const first = u.toLowerCase()[0];
                const map = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                return `${c} ${map[first] || u}`;
            });
            const hasColon = /timer\s*:/i.test(match[0]);
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            if (hasColon) {
                let msg = (match[2] || '').trim();
                if (!msg) {
                    return `Таймер (${rawDur}):${arrow}`;
                }
                msg = msg
                    .replace(/^Timer\s+has\s+expired\b/i, 'Время таймера истекло')
                    .replace(/^Cron\s+trigger\s+#(\d+)/i, 'Срабатывание cron #$1')
                    .replace(/\(iteration\s+(\d+)\)/gi, '(итерация $1)');
                const lowerMsg = msg.toLowerCase();
                if (translationDictionary[lowerMsg]) {
                    msg = translationDictionary[lowerMsg];
                }
                return `Таймер (${rawDur}): ${msg}${arrow}`;
            }
            return `Таймер на ${rawDur}${arrow}`;
        }
    },
    {
        // "Timer has expired >" / "Timer has expired (iteration 2) >"
        pattern: /^Timer\s+has\s+expired(?:\s*\(iteration\s+(\d+)\))?(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const iter = match[1] ? ` (итерация ${match[1]})` : '';
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            return `Время таймера истекло${iter}${arrow}`;
        }
    },
    {
        // "Cron trigger #1 >" / "Cron trigger #2 (iteration 2)"
        pattern: /^Cron\s+trigger\s+#(\d+)(?:\s*\(iteration\s+(\d+)\))?(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const iter = match[2] ? ` (итерация ${match[2]})` : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            return `Срабатывание cron #${match[1]}${iter}${arrow}`;
        }
    },
    {
        // "cron (every 5 minutes): ..." / "cron (*/5 * * * *)"
        pattern: /^cron\s*\(([^)]+)\)(?:\s*:\s*(.*?)?)?(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            let sched = match[1].trim()
                .replace(/^every\s+minute$/i, 'каждую минуту')
                .replace(/^every\s+hour$/i, 'каждый час')
                .replace(/^every\s+(\d+)\s*(seconds?|minutes?|hours?|days?)$/i, (m, c, u) => {
                    const map = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                    return `каждые ${c} ${map[u.toLowerCase()[0]] || u}`;
                })
                .replace(/^daily\s+at\s+(\d{1,2}:\d{2})$/i, 'ежедневно в $1');
            const hasColon = /\)\s*:/i.test(match[0]);
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            if (hasColon) {
                let msg = (match[2] || '').trim();
                if (!msg) return `Расписание (${sched}):${arrow}`;
                msg = msg
                    .replace(/^Timer\s+has\s+expired\b/i, 'Время таймера истекло')
                    .replace(/^Cron\s+trigger\s+#(\d+)/i, 'Срабатывание cron #$1')
                    .replace(/\(iteration\s+(\d+)\)/gi, '(итерация $1)');
                const lowerMsg = msg.toLowerCase();
                if (translationDictionary[lowerMsg]) msg = translationDictionary[lowerMsg];
                return `Расписание (${sched}): ${msg}${arrow}`;
            }
            return `Расписание (${sched})${arrow}`;
        }
    },
    {
        // "every 5 minutes" / "every 30 seconds" / "daily at 09:00"
        pattern: /^(?:every\s+(\d+)\s+(seconds?|minutes?|hours?|days?)|daily\s+at\s+(\d{1,2}:\d{2}))(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const arrow = match[4] ? (' ' + match[4].trim()) : '';
            if (match[3]) return `ежедневно в ${match[3]}${arrow}`;
            const map = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
            return `каждые ${match[1]} ${map[match[2].toLowerCase()[0]] || match[2]}${arrow}`;
        }
    },
    {
        // "Found 24 subagents >" / "Found 24 субагента >" / "Listing 3 subagents" / "Killed 2 subagents" / "Found 5 tasks >" / "Started 3 subagents >" / "Asked 2 questions >" / "24 subagents >" / "5 tasks >"
        pattern: /^(?:(Found|Listing|Killing|Killed|Started|Starting|Asking|Asked|Найдено|Найден|Найдена)\s+)?(\d+)\s+(subagents?|субагент(?:а|ов)?|tasks?|задач[аи]?|results?|результат(?:а|ов)?|questions?|вопрос(?:а|ов)?)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const verbRaw = (match[1] || '').toLowerCase();
            const count = parseInt(match[2], 10);
            const nounRaw = match[3].toLowerCase();
            const arrow = match[4] ? (' ' + match[4].trim()) : '';

            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            const isSingular = (n <= 10 || n >= 20) && n1 === 1;
            const isFew = (n <= 10 || n >= 20) && (n1 > 1 && n1 < 5);

            const isTask = nounRaw.startsWith('task') || nounRaw.startsWith('задач');
            const isResult = nounRaw.startsWith('result') || nounRaw.startsWith('результат');
            const isQuestion = nounRaw.startsWith('question') || nounRaw.startsWith('вопрос');
            const isGenitiveVerb = (verbRaw === 'listing' || verbRaw === 'killing' || verbRaw === 'starting');

            let noun = 'субагентов';
            if (isTask) {
                noun = isSingular ? (isGenitiveVerb ? 'задачи' : 'задача') : (isFew ? 'задачи' : 'задач');
            } else if (isResult) {
                noun = isSingular ? 'результат' : (isFew ? 'результата' : 'результатов');
            } else if (isQuestion) {
                noun = isSingular ? 'вопрос' : (isFew ? 'вопроса' : 'вопросов');
            } else {
                noun = isSingular ? (isGenitiveVerb ? 'субагента' : 'субагент') : (isFew ? 'субагента' : 'субагентов');
            }

            if (!verbRaw) {
                return `${count} ${noun}${arrow}`;
            }

            let verb = '';
            if (verbRaw === 'found' || verbRaw.startsWith('найден')) {
                verb = isSingular ? (isTask ? 'Найдена' : 'Найден') : 'Найдено';
            } else if (verbRaw === 'listing') {
                verb = 'Получение списка:';
            } else if (verbRaw === 'killing') {
                verb = 'Остановка';
            } else if (verbRaw === 'killed') {
                verb = isSingular ? (isTask ? 'Остановлена' : 'Остановлен') : 'Остановлено';
            } else if (verbRaw === 'started') {
                verb = isSingular ? (isTask ? 'Запущена' : 'Запущен') : 'Запущено';
            } else if (verbRaw === 'starting') {
                verb = 'Запуск';
            } else if (verbRaw === 'asking') {
                verb = 'Задаётся';
            } else if (verbRaw === 'asked') {
                verb = isSingular ? 'Задан' : 'Задано';
            }

            return `${verb} ${count} ${noun}${arrow}`;
        }
    },
    {
        // "Defined <name> subagent" / "Defining <name> subagent" / "Killing <name> subagent" / "Killed <name> subagent"
        pattern: /^(Defined|Defining|Killing|Killed)\s+([a-zA-Z0-9_\-]+)\s+subagent(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const v = match[1].toLowerCase();
            const name = match[2];
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            if (v === 'defined') return `Определён субагент ${name}${arrow}`;
            if (v === 'defining') return `Определение субагента ${name}${arrow}`;
            if (v === 'killing') return `Остановка субагента ${name}${arrow}`;
            return `Остановлен субагент ${name}${arrow}`;
        }
    },
    {
        // "Send Message Enter" / "Send Message ⏎" / "Queue Message Enter"
        pattern: /^(Send\s+Message|Queue\s+Message)\s+(Enter|\u23ce|Alt\+Enter|\u2325\u23ce)$/i,
        replace: (match) => {
            const prefix = /^send/i.test(match[1]) ? 'Отправить сообщение' : 'Поставить сообщение в очередь';
            return `${prefix} ${match[2]}`;
        }
    },
    {
        // "100% left" / "85% remaining"
        pattern: /^(\d+(?:[.,]\d+)?)%\s*(?:left|remaining)$/i,
        replace: (match) => `${match[1]}% осталось`
    },
    {
        // "Show 533 more..." / "Show 12 more"
        pattern: /^Show\s+(\d+)\s+more(?:\.{3}|…)?$/i,
        replace: (match) => `Показать ещё ${match[1]}...`
    },
    {
        // "Sort and filter conversations (2 active)"
        pattern: /^Sort\s+and\s+filter\s+conversations\s*\((\d+)\s+active\)$/i,
        replace: (match) => `Сортировка и фильтрация диалогов (активно: ${match[1]})`
    },
    {
        // "Turn 498" / "Turn 1"
        pattern: /^Turn\s+(\d+)$/i,
        replace: (match) => `Шаг ${match[1]}`
    },
    {
        // "Turns 1–15" / "Turns 1-15"
        pattern: /^Turns\s+(\d+)\s*([\u2013\u2014\-])\s*(\d+)$/i,
        replace: (match) => `Шаги ${match[1]}${match[2]}${match[3]}`
    },
    {
        // "Turns 1–15 · 15 turns" / "вс, 1 нояб., 16:00 – 16:40 · 7 turns"
        pattern: /^(.*?)\s*([·•・])\s*(\d+)\s+turns?$/i,
        replace: (match) => {
            let prefix = match[1].trim()
                .replace(/^Turns\s+(\d+)\s*([\u2013\u2014\-])\s*(\d+)$/i, 'Шаги $1$2$3')
                .replace(/^Turn\s+(\d+)$/i, 'Шаг $1');
            const sep = match[2];
            const count = parseInt(match[3], 10);
            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            let noun = 'шагов';
            if (n <= 10 || n >= 20) {
                if (n1 === 1) noun = 'шаг';
                else if (n1 > 1 && n1 < 5) noun = 'шага';
            }
            return `${prefix} ${sep} ${count} ${noun}`;
        }
    },
    {
        // "Go to turn 498 of 500"
        pattern: /^Go\s+to\s+turn\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (match) => `Перейти к шагу ${match[1]} из ${match[2]}`
    },
    {
        // "498 of 500"
        pattern: /^(\d+)\s+of\s+(\d+)$/i,
        replace: (match) => `${match[1]} из ${match[2]}`
    },
    {
        // "Waiting for command completion (up to 10 seconds)"
        pattern: /^Waiting\s+for\s+command\s+completion\s*\(up\s+to\s+(\d+)\s*seconds?\)$/i,
        replace: (match) => `Ожидание завершения команды (до ${match[1]} сек)`
    },
    {
        // "Check again" / "Проверка again"
        pattern: /^(?:Check|Проверка)\s+again$/i,
        replace: () => "Проверить снова"
    },
    {
        // '"Allow remote debugging for this browser instance"'
        pattern: /^["“«]?Allow\s+remote\s+debugging\s+for\s+this\s+browser\s+instance["”»]?\.?$/i,
        replace: (m) => `«Allow remote debugging for this browser instance» (Разрешить удалённую отладку для этого экземпляра браузера)${m[0].endsWith('.') ? '.' : ''}`
    },
    {
        // "Access and clone GitHub repositories in remote..."
        pattern: /^Access\s+and\s+clone\s+GitHub\s+repositories\s+in\s+remote\b.*$/i,
        replace: () => "Доступ и клонирование репозиториев GitHub в удалённых средах."
    },
    {
        // "+ Добавить Resource" / "Добавить Resource" / "+ Add Resource"
        pattern: /^(\+?\s*)(?:Add|Добавить)\s+Resource(s)?$/i,
        replace: (m) => `${m[1]}${m[2] ? "Добавить ресурсы" : "Добавить ресурс"}`
    },
    {
        // "Add GitHub resources" / "Add Google Drive resources"
        pattern: /^(?:Add|Добавить)\s+(.+?)\s+resources$/i,
        replace: (m) => `Добавить ресурсы ${m[1]}`
    },
    {
        // "Add (3)"
        pattern: /^(?:Add|Добавить)\s*\((\d+)\)$/i,
        replace: (m) => `Добавить (${m[1]})`
    },
    {
        // "Add all · 5"
        pattern: /^(?:Add|Добавить)\s+all\s*([·•])\s*(\d+)$/i,
        replace: (m) => `Добавить все ${m[1]} ${m[2]}`
    },
    {
        // "Add 3 plugins from Bundle"
        pattern: /^(?:Add|Добавить)\s+(\d+)\s+plugins?\s+from\s+(.+)$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            const n = Math.abs(c) % 100;
            const n1 = n % 10;
            let noun = "плагинов";
            if (n <= 10 || n >= 20) {
                if (n1 === 1) noun = "плагин";
                else if (n1 > 1 && n1 < 5) noun = "плагина";
            }
            return `Добавить ${c} ${noun} из ${m[2]}`;
        }
    },
    {
        // "Adding plugins from Bundle"
        pattern: /^Adding\s+plugins?\s+from\s+(.+)$/i,
        replace: (m) => `Добавление плагинов из ${m[1]}`
    },
    {
        // "Plugins in Bundle"
        pattern: /^Plugins\s+in\s+(.+)$/i,
        replace: (m) => `Плагины в наборе «${m[1]}»`
    },
    {
        // "See more in <Shelf>" / "Show more in <Shelf>"
        pattern: /^(?:See|Show)\s+more\s+in\s+[«"“]?(.+?)[»"”]?$/i,
        replace: (m) => {
            const raw = m[1].trim();
            const low = raw.toLowerCase();
            if (low === 'bundles') return "Показать ещё в наборах";
            if (low === 'plugins') return "Показать ещё в плагинах";
            const t = translationDictionary[low] || raw;
            return `Показать ещё в «${t}»`;
        }
    },
    {
        // "See less in <Shelf>" / "Collapse in <Shelf>"
        pattern: /^(?:See\s+less|Collapse)\s+in\s+[«"“]?(.+?)[»"”]?$/i,
        replace: (m) => {
            const raw = m[1].trim();
            const low = raw.toLowerCase();
            if (low === 'bundles') return "Свернуть в наборах";
            if (low === 'plugins') return "Свернуть в плагинах";
            const t = translationDictionary[low] || raw;
            return `Свернуть в «${t}»`;
        }
    },
    {
        // "System default (Realtek Audio)"
        pattern: /^System\s+default\s*\((.+)\)$/i,
        replace: (m) => `Системный по умолчанию (${m[1]})`
    },
    {
        // "No audio from Microphone"
        pattern: /^No\s+audio\s+from\s+(.+)$/i,
        replace: (m) => `Нет звука с «${m[1]}»`
    },
    {
        // "Voice speed, 1.25x" / "Voice Speed, 1x"
        pattern: /^Voice\s+speed,?\s*(\d+(?:\.\d+)?)x$/i,
        replace: (m) => `Скорость речи, ${m[1]}x`
    },
    {
        // "Environment: Local"
        pattern: /^Environment:\s*(.+)$/i,
        replace: (m) => {
            const env = m[1].trim();
            const map = { "local": "Локально", "worktree": "Worktree (ветка)", "citc clone": "Клон CitC" };
            return `Среда выполнения: ${map[env.toLowerCase()] || env}`;
        }
    },
    {
        // "A project's private resources must all belong to one owner (user@example.com)."
        pattern: /^A\s+project's\s+private\s+resources\s+must\s+all\s+belong\s+to\s+one\s+owner\s*\((.+)\)\.?$/i,
        replace: (m) => `Все личные ресурсы проекта должны принадлежать одному владельцу (${m[1]}).`
    },
    {
        // "Connect your account to browse GitHub."
        pattern: /^Connect\s+your\s+account\s+to\s+browse\s+(.+?)\.?$/i,
        replace: (m) => `Подключите аккаунт для просмотра ${m[1]}.`
    },
    {
        // "Credentials expire in 3d. Refresh credentials to keep this automation running"
        pattern: /^Credentials\s+expire\s+in\s+(.+?)\.\s*Refresh\s+credentials\s+to\s+keep\s+this\s+automation\s+running\.?$/i,
        replace: (m) => `Срок действия учётных данных истекает через ${m[1]}. Обновите их, чтобы автоматизация продолжала работать`
    },
    {
        // "This deletes 3 call recordings (1.2 MB) from your machine. You can't undo this."
        pattern: /^This\s+deletes\s+(\d+)\s+call\s+recordings?\s*\(([^)]+)\)\s*from\s+your\s+machine\.\s*You\s+can't\s+undo\s+this\.?$/i,
        replace: (m) => `Это удалит записи разговоров (${m[1]} шт., ${m[2]}) с вашего компьютера. Это действие нельзя отменить.`
    },
    {
        // "Deleted 3 recordings (1.2 MB)"
        pattern: /^Deleted\s+(\d+)\s+recordings?\s*\(([^)]+)\)$/i,
        replace: (m) => `Удалено записей: ${m[1]} (${m[2]})`
    },
    {
        // "3 calls · 1.2 MB"
        pattern: /^(\d+)\s+calls?\s*([·•])\s*(\d+(?:\.\d+)?\s*MB)$/i,
        replace: (m) => `Записей: ${m[1]} ${m[2]} ${m[3]}`
    },
    {
        // "Sign in to GitHub on this computer" / "Sign in to GitHub remotely"
        pattern: /^Sign\s+in\s+to\s+(.+?)\s+on\s+this\s+computer$/i,
        replace: (m) => `Войти в ${m[1]} на этом компьютере`
    },
    {
        pattern: /^Sign\s+in\s+to\s+(.+?)\s+remotely$/i,
        replace: (m) => `Войти в ${m[1]} удалённо`
    },
    {
        pattern: /^Add\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            const low = sub.toLowerCase();
            if (translationDictionary["add " + low]) return translationDictionary["add " + low];
            const nounMap = {
                "terminal": "терминал",
                "terminals": "терминалы",
                "resource": "ресурс",
                "resources": "ресурсы",
                "folder": "папку",
                "folders": "папки",
                "file": "файл",
                "files": "файлы",
                "workspace": "рабочую область",
                "model": "модель",
                "shortcut": "сочетание клавиш",
                "handler": "обработчик",
                "hook card": "карточку хука",
                "context": "контекст",
                "comment": "комментарий",
                "inline comment": "встроенный комментарий",
                "label": "метку",
                "to allowlist": "в белый список",
                "organization policy": "политику организации"
            };
            if (nounMap[low]) return `Добавить ${nounMap[low]}`;
            if (isLikelyEnglishProseTarget(sub) && !isTitleCaseName(sub)) return m[0];
            return `Добавить ${sub}`;
        }
    },
    {
        pattern: /^Turn\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (m) => `Шаг ${m[1]} из ${m[2]}`
    },
    {
        // "2m ago" / "32m ago" / "15s ago" / "1h ago" / "3d ago" / "2w ago" / "1mo ago" / "1y ago" / "2 minutes ago" / "a minute ago"
        pattern: /^(?:(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|mos|month|months|y|yr|yrs|year|years)|(a|an|a\s+few|several)\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?))\s+ago$/i,
        replace: (match) => {
            const pluralize = (count, one, two, five) => {
                const n = Math.abs(count) % 100;
                const n1 = n % 10;
                if (n > 10 && n < 20) return five;
                if (n1 > 1 && n1 < 5) return two;
                if (n1 === 1) return one;
                return five;
            };
            if (match[1]) {
                const count = parseInt(match[1], 10);
                const u = match[2].toLowerCase();
                if (u === 's' || u === 'sec' || u === 'secs') return `${count} сек назад`;
                if (u === 'm' || u === 'min' || u === 'mins') return `${count} мин назад`;
                if (u === 'h' || u === 'hr' || u === 'hrs') return `${count} ч назад`;
                if (u === 'd') return `${count} дн назад`;
                if (u === 'w' || u === 'wk' || u === 'wks') return `${count} нед назад`;
                if (u === 'mo' || u === 'mos') return `${count} мес назад`;
                if (u === 'y' || u === 'yr' || u === 'yrs') return `${count} ${pluralize(count, 'г.', 'г.', 'лет')} назад`;
                if (u.startsWith('second')) return `${count} ${pluralize(count, 'секунду', 'секунды', 'секунд')} назад`;
                if (u.startsWith('minute')) return `${count} ${pluralize(count, 'минуту', 'минуты', 'минут')} назад`;
                if (u.startsWith('hour')) return `${count} ${pluralize(count, 'час', 'часа', 'часов')} назад`;
                if (u.startsWith('day')) return `${count} ${pluralize(count, 'день', 'дня', 'дней')} назад`;
                if (u.startsWith('week')) return `${count} ${pluralize(count, 'неделю', 'недели', 'недель')} назад`;
                if (u.startsWith('month')) return `${count} ${pluralize(count, 'месяц', 'месяца', 'месяцев')} назад`;
                if (u.startsWith('year')) return `${count} ${pluralize(count, 'год', 'года', 'лет')} назад`;
            }
            const art = (match[3] || '').toLowerCase();
            const u2 = (match[4] || '').toLowerCase();
            if (art.includes('few') || art.includes('several')) {
                if (u2.startsWith('second')) return 'несколько секунд назад';
                if (u2.startsWith('minute')) return 'несколько минут назад';
                if (u2.startsWith('hour')) return 'несколько часов назад';
                if (u2.startsWith('day')) return 'несколько дней назад';
            }
            if (u2.startsWith('second')) return 'секунду назад';
            if (u2.startsWith('minute')) return 'минуту назад';
            if (u2.startsWith('hour')) return 'час назад';
            if (u2.startsWith('day')) return 'день назад';
            if (u2.startsWith('week')) return 'неделю назад';
            if (u2.startsWith('month')) return 'месяц назад';
            if (u2.startsWith('year')) return 'год назад';
            return match[0];
        }
    },
    {
        // "1 Side Question" / "3 Side Questions" / "5 Side Questions"
        pattern: /^(\d+)\s+Side\s+Questions?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            if ((n <= 10 || n >= 20) && n1 === 1) return `${count} быстрый вопрос`;
            if ((n <= 10 || n >= 20) && (n1 > 1 && n1 < 5)) return `${count} быстрых вопроса`;
            return `${count} быстрых вопросов`;
        }
    },
    {
        // "View 3 side questions" / "Просмотр 3 side questions" / "View 1 side question"
        pattern: /^(?:View|Просмотр)\s+(\d+)\s+side\s+questions?$/i,
        replace: (match) => {
            const count = parseInt(match[1], 10);
            const n = Math.abs(count) % 100;
            const n1 = n % 10;
            if ((n <= 10 || n >= 20) && n1 === 1) return `Показать ${count} быстрый вопрос`;
            if ((n <= 10 || n >= 20) && (n1 > 1 && n1 < 5)) return `Показать ${count} быстрых вопроса`;
            return `Показать ${count} быстрых вопросов`;
        }
    },
    {
        // "Side Question:" / "Side Question" / "Side Questions"
        pattern: /^Side\s+Questions?(:?)$/i,
        replace: (match) => {
            const colon = match[1] || '';
            const isPlural = /questions/i.test(match[0]);
            return (isPlural ? 'Быстрые вопросы' : 'Быстрый вопрос') + colon;
        }
    },
    {
        // "Question 1 of 3"
        pattern: /^Question\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (m) => `Вопрос ${m[1]} из ${m[2]}`
    },
    {
        // "Side question failed: ..."
        pattern: /^Side\s+question\s+failed:\s*(.+)$/i,
        replace: (m) => `Ошибка быстрого вопроса: ${m[1]}`
    },
    {
        // "Select model with Ctrl+..."
        pattern: /^Select\s+model\s+with\s+(.+)$/i,
        replace: (m) => `Выберите модель с помощью ${m[1]}`
    },
    {
        // "User cancelled agent execution." / "User canceled agent execution."
        pattern: /^User\s+cancel+ed\s+agent\s+execution(\.?)$/i,
        replace: (m) => "Пользователь отменил выполнение агента" + (m[1] || "")
    },
    {
        // "Agent execution failed."
        pattern: /^Agent\s+execution\s+failed(\.?)$/i,
        replace: (m) => "Ошибка выполнения агента" + (m[1] || "")
    },
    {
        // "Still thinking, 15 seconds"
        pattern: /^Still\s+thinking,\s*(\d+)\s*seconds?$/i,
        replace: (m) => `Продолжает размышлять, ${m[1]} сек`
    },
    {
        // "Configure agent execution, queued message delivery, and permissions."
        pattern: /^Configure\s+agent\s+execution,\s*queued\s+message\s+delivery,\s*and\s+permissions(\.?)$/i,
        replace: (m) => "Настройка выполнения агента, доставки сообщений из очереди и разрешений" + (m[1] || "")
    },
    {
        pattern: /^Load\s+older\s+messages,\s*showing\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (m) => `Загрузить старые сообщения (показано ${m[1]} из ${m[2]})`
    },
    {
        pattern: /^Agent\s+permissions\s+preset\s+selector,\s*(?:current|текущий):\s*(.+)$/i,
        replace: (m) => {
            const raw = m[1].trim();
            const t = translationDictionary[raw.toLowerCase()] || raw;
            return `Выбор профиля разрешений агента, текущий: ${t}`;
        }
    },
    {
        pattern: /^(?:Model\s+selector|Выбор\s+модели),\s*(?:current|текущая):\s*(.+)$/i,
        replace: (m) => {
            const val = m[1].trim().replace(/\s+(Low|Medium|High|Extra|Max|Minimal|Fast)$/i, (_, eff) => {
                const effRu = translationDictionary[eff.toLowerCase()] || eff;
                return ` ${effRu}`;
            });
            return `Выбор модели, текущая: ${val}`;
        }
    },
    {
        pattern: /^Details\s+for\s+(.+)$/i,
        replace: (m) => `Подробнее о ${m[1]}`
    },
    {
        pattern: /^More\s+actions\s+for\s+(.+)$/i,
        replace: (m) => `Дополнительные действия для ${m[1]}`
    },
    {
        pattern: /^Install\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            if (isLikelyEnglishProseTarget(sub) && !isTitleCaseName(sub)) return m[0];
            return `Установить ${sub}`;
        }
    },
    {
        pattern: /^(.+),\s*Installed$/i,
        replace: (m) => `${m[1]}, установлено`
    },
    {
        pattern: /^MCP\s+server\s+(.+?)\s+requires\s+authentication:\s+sign\s+in\s+to\s+"(.+?)"\s+in\s+the\s+Accounts\s+section\s+of\s+plugin\s+"(.+?)"$/i,
        replace: (m) => `MCP-сервер ${m[1]} требует аутентификации: войдите в аккаунт «${m[2]}» в разделе «Аккаунты» плагина «${m[3]}»`
    },
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
        // "<action / task> finished" or re-processed "<action / task> — завершено"
        pattern: /^(.+?)(?:\s+finished|\s*[—–-]\s*завершено)(\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i,
        replace: (match) => {
            const raw = match[1].trim();
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const lower = raw.toLowerCase();
            if (translationDictionary[lower]) {
                const trans = translationDictionary[lower];
                if (trans.endsWith('сессия') || trans.endsWith('задача') || trans.endsWith('команда') || trans.endsWith('операция') || trans.endsWith('проверка')) {
                    return trans + ' завершена' + arrow;
                }
                if (trans.endsWith('запуск') || trans.endsWith('анализ') || trans.endsWith('поиск') || trans.endsWith('процесс')) {
                    return trans + ' завершен' + arrow;
                }
                return trans + ' — завершено' + arrow;
            }
            if (/^Restore\s+(.+?)\s+from\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Restore\s+(.+?)\s+from\s+(.+)$/i);
                return `Восстановление ${m[1]} из ${m[2]} — завершено${arrow}`;
            }
            if (/^Search\s+(.+?)\s+in\s+transcript$/i.test(raw)) {
                const m = raw.match(/^Search\s+(.+?)\s+in\s+transcript$/i);
                return `Поиск ${m[1]} в стенограмме — завершен${arrow}`;
            }
            if (/^Inspect\s+(.+?)\s+with\s+parameters$/i.test(raw)) {
                const m = raw.match(/^Inspect\s+(.+?)\s+with\s+parameters$/i);
                return `Проверка ${m[1]} с параметрами — завершена${arrow}`;
            }
            if (/^Compare\s+(?:against|with)\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Compare\s+(?:against|with)\s+(.+)$/i);
                return `Сравнение с ${m[1]} — завершено${arrow}`;
            }
            if (/architect session/i.test(raw)) {
                return 'Сессия архитектора завершена' + arrow;
            }
            if (/^Run\s+(.+)$/i.test(raw)) {
                const m = raw.match(/^Run\s+(.+)$/i);
                const target = m[1].trim();
                if (/real hook acceptance test/i.test(target)) {
                    return 'Выполнение приёмочного теста хука — завершено' + arrow;
                }
                if (/acceptance test/i.test(target)) {
                    return 'Выполнение приёмочного теста — завершено' + arrow;
                }
            }
            const loc = localizeActionTarget(raw, true);
            if (loc && loc !== raw) {
                return `${uppercaseFirstCyrillic(loc)} — завершено${arrow}`;
            }
            if (/^Inspect\s+(.+)$/i.test(raw)) {
                return `Проверка ${raw.match(/^Inspect\s+(.+)$/i)[1]} — завершена${arrow}`;
            }
            if (/^Check\s+(.+)$/i.test(raw)) {
                return `Проверка ${raw.match(/^Check\s+(.+)$/i)[1]} — завершена${arrow}`;
            }
            if (/^Run\s+(.+)$/i.test(raw)) {
                return `Запуск ${raw.match(/^Run\s+(.+)$/i)[1].trim()} — завершен${arrow}`;
            }
            if (/^View\s+(.+)$/i.test(raw)) {
                return `Просмотр ${raw.match(/^View\s+(.+)$/i)[1]} — завершен${arrow}`;
            }
            if (/^Test\s+(.+)$/i.test(raw)) {
                return `Тест ${raw.match(/^Test\s+(.+)$/i)[1]} — завершен${arrow}`;
            }
            return raw + ' — завершено' + arrow;
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
        // === v2.1.23: Official Plugins (Firebase, Science, Google Developer Knowledge, Modern Web Guidance, Maps, Flutter, Data Agent Kit, Google Cloud Developer) ===
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
        // === Google Cloud Developer (Remaining Bottom Half) ===
        pattern: /^The\s+core\s+bundled\s+skills\s*\(\s*$/i,
        replace: () => "Основные встроенные навыки ("
    },
    {
        pattern: /^\s*\)\s+and\s+the\s*$/i,
        replace: () => ") и MCP-сервер "
    },
    {
        pattern: /^\s*MCP\s+server\s+only\s+require\s*$/i,
        replace: () => " требуют только "
    },
    {
        pattern: /^\s*and\s+HTTPS\s+access\s+to\s*$/i,
        replace: () => " и HTTPS-доступ к "
    },
    {
        pattern: /^\.\s*Access\s+to\s+GitHub\s+domains\s*\(\s*$/i,
        replace: () => ". Доступ к доменам GitHub ("
    },
    {
        pattern: /^\s*is\s+only\s+required\s+at\s+runtime\s+for\s+dynamic\s+skill\s+discovery\s*\(\s*$/i,
        replace: () => " требуется во время выполнения только для динамического обнаружения навыков ("
    },
    {
        pattern: /^\s*\)\s+and\s+the\s+REST\s+API\s+fallback\s+in\s*$/i,
        replace: () => ") и резервного REST API в "
    },
    {
        pattern: /^\.\s*Dynamically\s+fetched\s+skills\s+may\s+require\s+additional\s+product-specific\s+CLI\s+tools\s+or\s+API\s+endpoints\.$/i,
        replace: () => ". Динамически загружаемые навыки могут требовать дополнительных специализированных CLI-инструментов или API-эндпоинтов."
    },
    {
        pattern: /^Fetches\s+the\s*$/i,
        replace: () => "Загружает каталог "
    },
    {
        pattern: /^\s*catalog\s+and\s+on-demand\s*$/i,
        replace: () => " и файлы "
    },
    {
        pattern: /^\s*\/\s*reference\s+files\s+from\s*$/i,
        replace: () => " / справочные материалы по требованию из "
    },
    {
        pattern: /^Installs\s+the\s+plugin\s+and\s+queries\s+the\s+GitHub\s+Trees\s+API\s+fallback\s*\(\s*$/i,
        replace: () => "Устанавливает плагин и обращается к резервному GitHub Trees API ("
    },
    {
        pattern: /^Connects\s+to\s+the\s+remote\s+MCP\s+server\s*\(\s*$/i,
        replace: () => "Подключается к удалённому MCP-серверу ("
    },
    {
        pattern: /^\s*\)\s+and\s+REST\s+API\s+v1\s+fallback\s*\(\s*$/i,
        replace: () => ") и резервному REST API v1 ("
    },
    {
        pattern: /^Authenticates\s+and\s+executes\s*$/i,
        replace: () => "Выполняет аутентификацию и запускает команды "
    },
    {
        pattern: /^\s*CLI\s+commands\s+against\s+Google\s+Cloud\s+APIs\.$/i,
        replace: () => " CLI к API Google Cloud."
    },
    {
        pattern: /^(?:Reads|Чтение)\s+official\s+Google\s+Cloud\s+documentation\s*\(\s*$/i,
        replace: () => "Читает официальную документацию Google Cloud ("
    },
    {
        pattern: /^,\s*and\s+optionally\s*$/i,
        replace: () => ", а также опционально "
    },
    {
        pattern: /^\s*\(only\s+if\s+installing\s+discovered\s+skills\s+locally\)\.$/i,
        replace: () => " (только при локальной установке обнаруженных навыков)."
    },
    {
        pattern: /^Read-only\s*$/i,
        replace: () => "Только для чтения — проверки "
    },
    {
        pattern: /^Interactive\s+or\s+state-changing\s*$/i,
        replace: () => "Интерактивные или изменяющие состояние команды "
    },
    {
        pattern: /^\s*Do\s+not\s+auto-allow\s+these\s+commands;\s+keep\s+them\s+gated\s+behind\s+confirmation\s*\(\s*$/i,
        replace: () => " Не разрешайте эти команды автоматически; оставьте для них запрос подтверждения ("
    },
    {
        pattern: /^\s*\)\s+or\s+run\s+them\s+manually\s+beforehand\.$/i,
        replace: () => ") или выполняйте их вручную заранее."
    },

    // === Figma Plugin ===
    {
        pattern: /^Turn\s+Figma\s+designs\s+into\s+production\s+code,\s*map\s+components\s+with\s+Code\s+Connect,\s*and\s+create\s+or\s+edit\s+Figma\s+files\s+in\s+Antigravity\.?$/i,
        replace: () => "Превращайте дизайны Figma в продакшен-код, связывайте компоненты через Code Connect, а также создавайте и редактируйте файлы Figma в Antigravity."
    },
    {
        pattern: /^Connects\s+Figma\s+design\s+components\s+to\s+code\s+components\s+using\s+Figma\s+Code\s+Connect.*$/i,
        replace: () => "Связывает дизайн-компоненты Figma с компонентами кода через Figma Code Connect, чтобы в Figma Dev Mode отображались реальные сниппеты кода из вашего репозитория."
    },
    {
        pattern: /^Orchestrates\s+design-to-code\s+and\s+code-to-design\s+workflows\s+across\s+Figma\s+Design\s+and\s+Figma\s+Make.*$/i,
        replace: () => "Координирует рабочие процессы «из дизайна в код» и «из кода в дизайн» между Figma Design и Figma Make, включая синхронизацию дизайн-токенов и прототипов."
    },
    {
        pattern: /^Creates\s+a\s+new,\s*blank\s+Figma\s+Design\s+or\s+FigJam\s+file\s+in\s+the\s+user['’]s\s+Figma\s+account.*$/i,
        replace: () => "Создаёт новый пустой файл Figma Design или доску FigJam в аккаунте пользователя и возвращает URL для его открытия."
    },
    {
        pattern: /^Translates\s+Figma\s+designs\s+into\s+production-ready\s+code\s+with\s+1:1\s+visual\s+fidelity.*$/i,
        replace: () => "Переводит дизайны Figma в готовый к продакшену код с визуальной точностью 1:1. Используется при вёрстке UI и компонентов по ссылкам и фреймам Figma."
    },
    {
        pattern: /^Captures\s+a\s+live,\s*running\s+web\s+app\s+or\s+site\s+from\s+a\s+browser\s+and\s+converts\s+it\s+into\s+editable\s+Figma\s+frames.*$/i,
        replace: () => "Захватывает работающее веб-приложение или сайт из браузера и конвертирует его в редактируемые фреймы Figma, а также создаёт экраны в Figma с нуля."
    },
    {
        pattern: /^Generates\s+diagrams\s+in\s+FigJam\s+from\s+natural\s+language\s+descriptions\s+or\s+Mermaid\s+syntax.*$/i,
        replace: () => "Генерирует диаграммы в FigJam из текстовых описаний или синтаксиса Mermaid: блок-схемы, диаграммы последовательности, состояний, архитектуры, пользовательские сценарии и диаграммы Ганта."
    },
    {
        pattern: /^(?:Builds|Сборка)\s+a\s+complete,\s*production-grade\s+design\s+system\s+in\s+Figma\s+from\s+scratch\s+or\s+from\s+codebase\s+tokens.*$/i,
        replace: () => "Создаёт полноценную дизайн-систему промышленного уровня в Figma с нуля или на основе токенов из кодовой базы (переменные, темы, текстовые стили, сетки и компоненты с вариантами)."
    },
    {
        pattern: /^Procedural\s+patterns\s+for\s+generating\s+parametric\s+geometry,\s*organic\s+shapes,\s*algorithmic\s+layouts.*$/i,
        replace: () => "Процедурные паттерны для генерации параметрической геометрии, органических форм, алгоритмических сеток и генеративных иллюстраций на холсте Figma через use_figma."
    },
    {
        pattern: /^Translates\s+motion,\s*animations,\s*transitions,\s*and\s+interactive\s+states\s+from\s+Figma\s+prototypes.*$/i,
        replace: () => "Переводит анимации, переходы и интерактивные состояния из прототипов Figma Design или файлов Figma Make в продакшен-код (CSS, Web Animations API, Framer Motion, GSAP)."
    },
    {
        pattern: /^Writes\s+GLSL\s+fragment\s+shaders\s+and\s+applies\s+them\s+as\s+image\s+fills\s+to\s+nodes\s+in\s+Figma\s+Design.*$/i,
        replace: () => "Пишет фрагментные шейдеры GLSL и применяет их в качестве заливок изображений к узлам в Figma Design, FigJam и Figma Slides (градиенты, шум Перлина, жидкий хром, стекло, дизеринг)."
    },
    {
        pattern: /^Generates\s+a\s+structured\s+product\s+specification\s+or\s+design\s+handoff\s+document\s+from\s+a\s+Figma\s+design.*$/i,
        replace: () => "Генерирует структурированную продуктовую спецификацию или документ передачи дизайна в разработку (design handoff) на основе файла Figma."
    },
    {
        pattern: /^Translates\s+Figma\s+designs\s+into\s+idiomatic\s+SwiftUI\s+code\s+for\s+iOS,\s*macOS,\s*watchOS,\s*tvOS,\s*and\s+visionOS.*$/i,
        replace: () => "Переводит дизайны Figma в идиоматический код SwiftUI для iOS, macOS, watchOS, tvOS и visionOS с сопоставлением Auto Layout, переменных и компонентов."
    },
    {
        pattern: /^Foundational\s+rules,\s*node\s+API\s+patterns,\s*color\/unit\s+conventions,\s*layout\s+discipline.*$/i,
        replace: () => "Базовые правила, паттерны API узлов, соглашения о цветах и единицах измерения, дисциплина вёрстки и пошаговый рабочий процесс для чтения и изменения файлов Figma через use_figma."
    },
    {
        pattern: /^Specialized\s+rules\s+and\s+patterns\s+for\s+working\s+with\s+FigJam\s+boards\s+via\s+use_figma.*$/i,
        replace: () => "Специализированные правила и паттерны для работы с досками FigJam через use_figma: стикеры, коннекторы, фигуры с текстом, секции, таблицы и блоки кода."
    },
    {
        pattern: /^Adds\s+prototyping\s+interactions,\s*transitions,\s*animations,\s*and\s+interactive\s+states\s+directly\s+inside\s+Figma.*$/i,
        replace: () => "Добавляет интерактивные переходы, анимации и состояния прототипирования непосредственно внутри файлов Figma Design через use_figma (Smart Animate, реакции, переходы между экранами)."
    },
    {
        pattern: /^Specialized\s+rules\s+and\s+patterns\s+for\s+creating\s+and\s+editing\s+Figma\s+Slides\s+presentations\s+via\s+use_figma.*$/i,
        replace: () => "Специализированные правила и паттерны для создания и редактирования презентаций Figma Slides через use_figma (сетка слайдов, переходы, заметки докладчика и макеты)."
    },

    // === Netlify Plugin ===
    {
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+on\s+Netlify:\s*functions,\s*edge\s+functions,\s*blobs,\s*database,\s*identity,\s*forms,\s*image\s+CDN,\s*caching,\s*and\s+AI\s+Gateway,\s*plus\s+the\s+Netlify\s+MCP\s+server\.?$/i,
        replace: () => "Сборка и деплой на Netlify: функции, edge-функции, хранилище объектов (blobs), базы данных, аутентификация, формы, CDN для изображений, кэширование и AI Gateway, а также MCP-сервер Netlify."
    },
    {
        pattern: /^Guidance\s+for\s+controlling\s+public\s+access\s+to\s+sites\s+on\s+Netlify,\s*including\s+traffic\s+security.*$/i,
        replace: () => "Руководство по управлению публичным доступом к сайтам на Netlify: безопасность трафика, Web Application Firewall (WAF), ограничение частоты запросов, гео-/IP-блокировки и защита паролем или SSO."
    },
    {
        pattern: /^(?:Run|Запуск)\s+AI\s+agent\s+tasks\s+remotely\s+on\s+Netlify\s+sites\s+using\s+Agent\s+Runners.*$/i,
        replace: () => "Удалённый запуск задач ИИ-агентов на сайтах Netlify с помощью Agent Runners (запуск Claude, Gemini или Codex в изолированной песочнице, создание PR и проверка кода)."
    },
    {
        pattern: /^Guidance\s+for\s+using\s+the\s+Netlify\s+AI\s+Gateway\s+to\s+call\s+OpenAI,\s*Anthropic,\s*and\s+Google\s+Gemini\s+APIs.*$/i,
        replace: () => "Руководство по использованию Netlify AI Gateway для вызова API OpenAI, Anthropic и Google Gemini из функций Netlify без ручного управления API-ключами."
    },
    {
        pattern: /^Guidance\s+for\s+using\s+Netlify\s+Blobs\s+\(@netlify\/blobs\)\s+as\s+an\s+unstructured\s+object\s+and\s+key-value\s+store.*$/i,
        replace: () => "Руководство по использованию Netlify Blobs (@netlify/blobs) в качестве неструктурированного объектного и ключ-значение хранилища на Netlify."
    },
    {
        pattern: /^Guidance\s+for\s+configuring\s+HTTP\s+and\s+CDN\s+caching\s+on\s+Netlify,\s*including\s+Cache-Control\s+headers.*$/i,
        replace: () => "Руководство по настройке HTTP- и CDN-кэширования на Netlify: заголовки Cache-Control, Netlify-CDN-Cache-Control, инвалидация по тегам кэша (Cache-Tag) и stale-while-revalidate."
    },
    {
        pattern: /^Guidance\s+for\s+configuring\s+Netlify\s+sites\s+using\s+netlify\.toml,\s*_redirects,\s*and\s+_headers.*$/i,
        replace: () => "Руководство по настройке сайтов Netlify с помощью файлов netlify.toml, _redirects и _headers (настройки сборки, редиректы, прокси-правила, заголовки и переменные окружения)."
    },
    {
        pattern: /^Guidance\s+for\s+using\s+Netlify\s+Database\s+\(powered\s+by\s+Neon\s+serverless\s+Postgres\)\s+via\s+@netlify\/neon.*$/i,
        replace: () => "Руководство по использованию Netlify Database (на базе бессерверной СУБД Neon Postgres) через @netlify/neon: автоматическое создание БД, SQL-запросы, миграции и интеграция с Drizzle/Prisma."
    },
    {
        pattern: /^Deploy\s+sites\s+and\s+applications\s+to\s+Netlify\s+using\s+the\s+Netlify\s+CLI\s+or\s+MCP\s+server.*$/i,
        replace: () => "Развёртывание сайтов и приложений на Netlify с помощью Netlify CLI или MCP-сервера: создание и привязка сайтов, превью- и продакшен-деплои, проверка логов и отладка сборки."
    },
    {
        pattern: /^Guidance\s+for\s+writing\s+and\s+configuring\s+Netlify\s+Edge\s+Functions\s+running\s+on\s+Deno\s+at\s+the\s+network\s+edge.*$/i,
        replace: () => "Руководство по написанию и настройке Netlify Edge Functions на базе Deno на границе сети (модификация запросов/ответов, геолокация, A/B-тестирование, переписывание URL и стриминг)."
    },
    {
        pattern: /^Guidance\s+for\s+implementing\s+Netlify\s+Forms\s+in\s+static\s+HTML\s+and\s+JavaScript\s+frameworks.*$/i,
        replace: () => "Руководство по реализации форм Netlify Forms в статическом HTML и JS-фреймворках (React, Next.js, Astro, SvelteKit, Nuxt): защита от спама, AJAX-отправка, загрузка файлов и вебхуки."
    },
    {
        pattern: /^Framework-specific\s+configuration\s+and\s+deployment\s+guidance\s+for\s+Netlify.*$/i,
        replace: () => "Специфичное для фреймворков руководство по настройке и деплою на Netlify (Next.js, Astro, Remix / React Router, SvelteKit, Nuxt, Angular, SolidStart, TanStack Start, Gatsby, Hugo, Vite)."
    },
    {
        pattern: /^Guidance\s+for\s+writing\s+and\s+configuring\s+Netlify\s+Functions\s+\(serverless,\s*background,\s*and\s+scheduled\s+functions\).*$/i,
        replace: () => "Руководство по написанию и настройке функций Netlify Functions (бессерверных, фоновых до 15 минут и планируемых по расписанию cron)."
    },
    {
        pattern: /^Guidance\s+for\s+adding\s+authentication\s+and\s+user\s+management\s+to\s+Netlify\s+sites.*$/i,
        replace: () => "Руководство по добавлению аутентификации и управления пользователями на сайты Netlify (Auth0, Clerk, Supabase Auth, Better Auth и поддержка устаревшего Netlify Identity)."
    },
    {
        pattern: /^Guidance\s+for\s+optimizing\s+and\s+transforming\s+images\s+on\s+Netlify\s+using\s+the\s+Netlify\s+Image\s+CDN.*$/i,
        replace: () => "Руководство по оптимизации и трансформации изображений на Netlify с помощью Netlify Image CDN (изменение размера, кроп, конвертация в WebP/AVIF и интеграция с фреймворками)."
    },
    {
        pattern: /^Guidance\s+for\s+building\s+and\s+deploying\s+remote\s+Model\s+Context\s+Protocol\s+\(MCP\)\s+servers\s+on\s+Netlify.*$/i,
        replace: () => "Руководство по созданию и развёртыванию удалённых MCP-серверов (Model Context Protocol) на базе бессерверных функций Netlify Functions."
    },

    // === Railway Plugin ===
    {
        pattern: /^Deploy,\s*configure,\s*monitor,\s*and\s+troubleshoot\s+apps,\s*databases,\s*and\s+infrastructure\s+on\s+Railway\s+from\s+Antigravity.*$/i,
        replace: () => "Развёртывайте, настраивайте, отслеживайте и отлаживайте приложения, базы данных и инфраструктуру на Railway из Antigravity с помощью навыка агента и облачного MCP-сервера Railway."
    },
    {
        pattern: /^Operate\s+Railway\s+infrastructure:\s*sign\s+up\s+for\s+or\s+sign\s+in\s+to\s+a\s+Railway\s+account.*$/i,
        replace: () => "Управление инфраструктурой Railway: регистрация и вход в аккаунт, создание проектов, развёртывание сервисов, БД и бакетов, деплой кода, настройка окружений и переменных, домены, трассировка OpenTelemetry и диагностика сбоев."
    },

    // === Vercel Plugin ===
    {
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+web\s+apps\s+and\s+AI\s+agents\s+on\s+Vercel\s+with\s+skills\s+for\s+Next\.js,\s*AI\s+SDK,\s*and\s+cloud\s+services,\s*plus\s+the\s+official\s+Vercel\s+MCP\s+server\.?$/i,
        replace: () => "Создавайте и развёртывайте веб-приложения и ИИ-агентов на Vercel с навыками для Next.js, AI SDK и облачных сервисов, а также официальным MCP-сервером Vercel."
    },
    {
        pattern: /^Access\s+and\s+test\s+Vercel\s+deployments\s+protected\s+by\s+Vercel\s+Authentication,\s*SSO,\s*or\s+Deployment\s+Protection.*$/i,
        replace: () => "Доступ и тестирование развёртываний Vercel, защищённых Vercel Authentication, SSO или Deployment Protection (через vercel curl или заголовок x-vercel-trusted-oidc-idp-token)."
    },
    {
        pattern: /^Vercel\s+AI\s+Gateway\s+guidance\s+for\s+setup,\s*model\s+discovery,\s*authentication,\s*routing,\s*fallbacks.*$/i,
        replace: () => "Руководство по Vercel AI Gateway: настройка, поиск моделей, аутентификация, маршрутизация, фолбэки, виртуальные модели, BYOK, бюджеты, отчётность по расходам и наблюдаемость."
    },
    {
        pattern: /^Vercel\s+AI\s+SDK\s+expert\s+guidance\.\s*Use\s+when\s+building\s+AI-powered\s+features.*$/i,
        replace: () => "Экспертное руководство по Vercel AI SDK: чат-интерфейсы, генерация текста, структурированный вывод, вызов инструментов, агенты, интеграция MCP, стриминг, эмбеддинги и генерация изображений."
    },
    {
        pattern: /^Authentication\s+integration\s+guidance\s*[—–-]\s*Clerk\s+\(native\s+Vercel\s+Marketplace\),\s*Better\s+Auth,\s*Descope,\s*and\s+Auth0.*$/i,
        replace: () => "Руководство по интеграции аутентификации: настройка Clerk, Better Auth, Descope и Auth0 для приложений Next.js, а также Sign in with Vercel, Vercel Passport и Vercel KMS."
    },
    {
        pattern: /^Project\s+bootstrapping\s+orchestrator\s+for\s+repos\s+that\s+depend\s+on\s+Vercel-linked\s+resources.*$/i,
        replace: () => "Оркестратор начальной настройки проекта для репозиториев, зависящих от привязанных ресурсов Vercel (БД, аутентификация и управляемые интеграции) в безопасном порядке."
    },
    {
        pattern: /^Default\s+guidance\s+for\s+building\s+AI\s+agents\.\s*Use\s+for\s+generic\s+requests\s+to\s+build,\s*create,\s*scaffold.*$/i,
        replace: () => "Базовое руководство по созданию ИИ-агентов: проектирование и реализация агентных приложений, агентов с вызовом инструментов, устойчивых (durable) агентов, мультиагентных систем и агентов по расписанию."
    },
    {
        pattern: /^Debug\s+Vercel\s+CDN\s+caching\s*[—–-]\s*cache\s+hit\s+rate,\s*stale\s+content,\s*revalidation\s+behavior.*$/i,
        replace: () => "Отладка CDN-кэширования Vercel: процент попаданий в кэш (cache hit rate), устаревший контент, ревалидация, ISR + PPR, причины кэширования каждого запроса (cacheReason) и расходы."
    },
    {
        pattern: /^Vercel\s+Chat\s+SDK\s+expert\s+guidance\.\s*Use\s+when\s+building\s+multi-platform\s+chat\s+bots.*$/i,
        replace: () => "Экспертное руководство по Vercel Chat SDK для создания кроссплатформенных чат-ботов (Slack, Telegram, Microsoft Teams, Discord, Google Chat, GitHub, Linear) с единой кодовой базой."
    },
    {
        pattern: /^Backend\s+architecture\s+guidance\.\s*Use\s+when\s+planning,\s*building,\s*or\s+migrating\s+an\s+API\s+or\s+backend.*$/i,
        replace: () => "Руководство по архитектуре бэкенда на Vercel: выбор между Functions, Services, контейнерами, Daemons, Workflow, Queues и базами данных из Marketplace."
    },
    {
        pattern: /^Emit\s+and\s+query\s+Vercel\s+Custom\s+Metrics\.\s*Use\s+when\s+instrumenting\s+application\s+or\s+business\s+measurements.*$/i,
        replace: () => "Отправка и запрос пользовательских метрик Vercel Custom Metrics: инструментирование прикладных и бизнес-метрик в Vercel Functions через metric() из @vercel/functions и запрос через vc metrics."
    },
    {
        pattern: /^Vercel\s+Daemons\s+guidance\s*[—–-]\s*long-running\s+background\s+workers\s+built\s+from\s+a\s+Dockerfile.*$/i,
        replace: () => "Руководство по Vercel Daemons: долгоживущие фоновые воркеры из Dockerfile (ключ daemons в vercel.json) для обработчиков очередей, Celery/Sidekiq/BullMQ и фоновых заданий."
    },
    {
        pattern: /^Vercel\s+deployment\s+and\s+CI\/CD\s+expert\s+guidance\.\s*Use\s+when\s+deploying,\s*promoting,\s*rolling\s+back.*$/i,
        replace: () => "Экспертное руководство по деплою и CI/CD на Vercel: развёртывание, продвижение в продакшен (promote), откат (rollback), инспекция деплоев, сборка с --prebuilt и настройка CI-пайплайнов."
    },
    {
        pattern: /^(?:Search|Поиск),\s*register,\s*connect,\s*transfer,\s*and\s+renew\s+domain\s+names\s+on\s+Vercel\s+using\s+the\s+CLI\s+or\s+Domains\s+Registrar\s+API.*$/i,
        replace: () => "Поиск, регистрация, подключение, трансфер и продление доменных имён на Vercel через CLI или Domains Registrar API (проверка доступности и цен, DNS-записи, NS-серверы)."
    },
    {
        pattern: /^Vercel\s+environment\s+variable\s+expert\s+guidance\.\s*Use\s+when\s+working\s+with\s+\.env\s+files.*$/i,
        replace: () => "Экспертное руководство по переменным окружения Vercel: работа с файлами .env, командами vercel env, секретными и конфигурационными переменными, OIDC-токенами и настройками сред."
    },
    {
        pattern: /^eve\s+framework\s+guidance\s+for\s+durable\s+AI\s+agents\s+and\s+agent-powered\s+applications.*$/i,
        replace: () => "Руководство по фреймворку eve для создания устойчивых (durable) ИИ-агентов и агентных приложений: сессии, инструменты, навыки, подключения, каналы, песочницы, субагенты, расписания и наблюдаемость Agent Runs."
    },
    {
        pattern: /^Implement\s+feature\s+flags\s+in\s+Next\.js\s+or\s+SvelteKit\s+code\s+with\s+the\s+Flags\s+SDK.*$/i,
        replace: () => "Реализация фича-флагов в коде Next.js или SvelteKit с помощью Flags SDK (пакет flags): объявление флагов через flag(), подключение адаптеров провайдеров, предварительное вычисление (precompute) и Flags Explorer."
    },
    {
        pattern: /^Score\s+how\s+ready\s+a\s+website,\s*domain,\s*or\s+public\s+MCP\s+endpoint\s+is\s+for\s+AI\s+agents\s+using\s+Is\s+Agentic.*$/i,
        replace: () => "Оценка готовности веб-сайта, домена или публичного MCP-эндпоинта для ИИ-агентов с помощью Is Agentic, получение JSON-отчёта и устранение проблем, снижающих оценку."
    },
    {
        pattern: /^Corrects\s+outdated\s+LLM\s+knowledge\s+about\s+the\s+Vercel\s+platform\s+and\s+introduces\s+new\s+products.*$/i,
        replace: () => "Корректирует устаревшие знания языковой модели о платформе Vercel и знакомит с актуальными продуктами и возможностями. Внедряется при старте сессии."
    },
    {
        pattern: /^Vercel\s+Marketplace\s+expert\s+guidance\s*[—–-]\s*discovering,\s*installing,\s*and\s+managing\s+third-party\s+integrations.*$/i,
        replace: () => "Экспертное руководство по Vercel Marketplace: поиск, установка и управление сторонними интеграциями через CLI vercel integration (электронная коммерция, платежи, мониторинг, почта, поиск, CMS)."
    },
    {
        pattern: /^Guide\s+for\s+building,\s*configuring,\s*and\s+deploying\s+microfrontends\s+on\s+Vercel.*$/i,
        replace: () => "Руководство по созданию, настройке и развёртыванию микрофронтендов на Vercel: мульти-зоны, разделение приложения между командами, microfrontends.json, @vercel/microfrontends и маршрутизация по путям."
    },
    {
        pattern: /^Offload\s+heavy\s+builds,\s*full\s+test\s+suites\s+and\s+parallel\s+experiments\s+from\s+the\s+local\s+machine\s+to\s+Vercel\s+Sandboxes.*$/i,
        replace: () => "Выгрузка ресурсоёмких сборок, полных наборов тестов и параллельных экспериментов с локальной машины в облачные песочницы Vercel Sandboxes через CLI vercel sandbox."
    },
    {
        pattern: /^Vercel\s+Queues\s+guidance\s*[—–-]\s*durable\s+topics\s+with\s+at-least-once\s+delivery,\s*independent\s+consumer\s+groups.*$/i,
        replace: () => "Руководство по Vercel Queues: надёжные топики с гарантией доставки at-least-once, независимыми группами консьюмеров, повторами, задержками и ключами идемпотентности через @vercel/queue и vercel-queue."
    },
    {
        pattern: /^Vercel['’]s\s+React\s+and\s+Next\.js\s+performance\s+rules\s+\(70\s+rules\s+in\s+8\s+categories\s+ordered\s+by\s+impact.*$/i,
        replace: () => "Правила производительности React и Next.js от Vercel (70 правил в 8 категориях по степени влияния: устранение каскадных запросов, размер бандла, SSR, клиентская загрузка данных, ре-рендеры)."
    },
    {
        pattern: /^Vercel\s+Routing\s+Middleware\s+guidance\s*[—–-]\s*request\s+interception\s+before\s+cache,\s*rewrites,\s*redirects,\s*personalization.*$/i,
        replace: () => "Руководство по Vercel Routing Middleware: перехват запросов до кэша, переписывание URL (rewrites), редиректы и персонализация для любых фреймворков (Edge, Node.js и Bun)."
    },
    {
        pattern: /^Vercel\s+Runtime\s+Cache\s+API\s+guidance\s*[—–-]\s*ephemeral\s+per-region\s+key-value\s+cache\s+with\s+tag-based\s+invalidation.*$/i,
        replace: () => "Руководство по Vercel Runtime Cache API: эфемерный региональный ключ-значение кэш с инвалидацией по тегам, общий для Functions, Routing Middleware и сборок."
    },
    {
        pattern: /^Vercel\s+Agent\s+guidance\s*[—–-]\s*dashboard\s+and\s+Slack\s+chat,\s*code\s+review,\s*production\s+investigation.*$/i,
        replace: () => "Руководство по Vercel Agent: чат в панели управления и Slack, ревью кода, расследование инцидентов в продакшене, подтверждаемые действия и установка продуктов."
    },
    {
        pattern: /^Vercel\s+CLI\s+expert\s+guidance\.\s*Use\s+when\s+deploying,\s*managing\s+environment\s+variables,\s*linking\s+projects.*$/i,
        replace: () => "Экспертное руководство по Vercel CLI: деплой, управление переменными окружения, привязка проектов, просмотр логов и метрик, отладка ошибок 5xx и таймаутов, управление доменами и флагами."
    },
    {
        pattern: /^Vercel\s+Connect\s+expert\s+guidance\s+for\s+securely\s+obtaining\s+scoped\s+credentials\s+for\s+third-party\s+services.*$/i,
        replace: () => "Экспертное руководство по Vercel Connect для безопасного получения учётных данных и токенов сторонних сервисов (OAuth, API-ключи, MCP-серверы, коннекторы eve и токены Passport)."
    },
    {
        pattern: /^Vercel\s+Firewall\s+expert\s+guidance\s*[—–-]\s*automatic\s+DDoS\s+mitigation,\s*the\s+Vercel\s+WAF.*$/i,
        replace: () => "Экспертное руководство по Vercel Firewall: автоматическая защита от DDoS, Vercel WAF (пользовательские правила, блокировка IP, управляемые наборы правил, rate limiting), Attack Mode и защита от ботов."
    },
    {
        pattern: /^Feature\s+flags,\s*A\/B\s+tests,\s*and\s+gradual\s+rollouts\s+with\s+Vercel\s+Flags,\s*in\s+any\s+app\s+or\s+framework.*$/i,
        replace: () => "Фича-флаги, A/B-тесты и постепенные раскатки с помощью Vercel Flags в любом приложении или фреймворке (выбор интеграции, панель управления, CLI vercel flags, правила таргетинга и сегменты)."
    },
    {
        pattern: /^Vercel\s+Functions\s+expert\s+guidance\s*[—–-]\s*Node\.js\/Bun\/Python\s+runtimes,\s*Fluid\s+Compute,\s*long-duration.*$/i,
        replace: () => "Экспертное руководство по Vercel Functions: среды выполнения Node.js/Bun/Python, Fluid Compute, длительные функции (до 30 мин), большие бандлы (до 5 ГБ), Docker/OCI-контейнеры, стриминг, WebSockets и Cron Jobs."
    },
    {
        pattern: /^Vercel\s+Sandbox\s+guidance\s*[—–-]\s*ephemeral\s+Firecracker\s+microVMs\s+for\s+running\s+untrusted\s+code\s+safely.*$/i,
        replace: () => "Руководство по Vercel Sandbox: эфемерные микро-ВМ Firecracker для безопасного выполнения недоверенного или сгенерированного ИИ кода в изоляции."
    },
    {
        pattern: /^Configure\s+and\s+troubleshoot\s+Vercel\s+Services\s+for\s+multiple\s+frontends\s+and\s+backends\s+in\s+one\s+project.*$/i,
        replace: () => "Настройка и диагностика Vercel Services для объединения нескольких фронтендов и бэкендов в одном проекте Vercel (ключ services, межсервисная маршрутизация, привязки и запуск через vercel dev)."
    },
    {
        pattern: /^Vercel\s+storage\s+expert\s+guidance\s*[—–-]\s*Blob,\s*Global\s+Config\s+\(formerly\s+Edge\s+Config\),\s*and\s+Marketplace\s+storage.*$/i,
        replace: () => "Экспертное руководство по хранилищам Vercel: Vercel Blob, Global Config (ранее Edge Config) и хранилища из Marketplace (Neon Postgres, Upstash Redis)."
    },
    {
        pattern: /^Set\s+up\s+OpenTelemetry\s+instrumentation\s+for\s+Vercel\s+Tracing\s+and\s+query\s+the\s+resulting\s+spans.*$/i,
        replace: () => "Настройка инструментирования OpenTelemetry для Vercel Tracing (@vercel/otel) и поиск спанов трассировки через vercel traces для отладки медленных или сбойных серверных запросов."
    },
    {
        pattern: /^Full-story\s+verification\s*[—–-]\s*infers\s+what\s+the\s+user\s+is\s+building,\s*then\s+verifies\s+the\s+complete\s+flow\s+end-to-end.*$/i,
        replace: () => "Сквозная проверка пользовательского сценария (end-to-end): определяет, что именно создаёт пользователь, и проверяет всю цепочку целиком (браузер → API → данные → ответ)."
    },
    {
        pattern: /^Vercel\s+Workflow\s+SDK\s+expert\s+guidance\.\s*Use\s+when\s+building\s+durable\s+workflows,\s*long-running\s+tasks.*$/i,
        replace: () => "Экспертное руководство по Vercel Workflow SDK: создание устойчивых (durable) рабочих процессов, долгих задач, API-маршрутов и агентов с паузой/возобновлением, повторами и защитой от сбоев."
    },
    {
        pattern: /^Specializes\s+in\s+architecting\s+AI-powered\s+applications\s+on\s+Vercel\s*[—–-]\s*choosing\s+between\s+AI\s+SDK\s+patterns.*$/i,
        replace: () => "Специализируется на архитектуре ИИ-приложений на Vercel: выбор паттернов AI SDK, настройка провайдеров, создание агентов, устойчивых рабочих процессов и интеграция MCP-серверов."
    },
    {
        pattern: /^Specializes\s+in\s+Vercel\s+deployment\s+strategies,\s*CI\/CD\s+pipelines,\s*preview\s+URLs,\s*production\s+promotions.*$/i,
        replace: () => "Специализируется на стратегиях развёртывания Vercel, пайплайнах CI/CD, превью-ссылках, продвижении в продакшен, откатах, переменных окружения и настройке доменов."
    },
    {
        pattern: /^Specializes\s+in\s+optimizing\s+Vercel\s+application\s+performance\s*[—–-]\s*Core\s+Web\s+Vitals,\s*rendering\s+strategies.*$/i,
        replace: () => "Специализируется на оптимизации производительности приложений на Vercel: Core Web Vitals, стратегии рендеринга, кэширование, оптимизация изображений и шрифтов, Edge-вычисления и размер бандла."
    },

    // === Wix Plugin ===
    {
        pattern: /^(?:Build|Сборка)\s+Wix\s+apps\s+and\s+headless\s+sites,\s*and\s+manage\s+Wix\s+stores,\s*bookings,\s*CMS\s+and\s+more,\s*with\s+Wix\s+CLI\s+skills\s+and\s+the\s+official\s+Wix\s+MCP\s+server\.?$/i,
        replace: () => "Создавайте приложения и headless-сайты Wix, управляйте магазинами, бронированиями, CMS и многим другим с помощью навыков Wix CLI и официального MCP-сервера Wix."
    },
    {
        pattern: /^(?:Build|Сборка)\s+Wix\s+apps\s+and\s+headless\s+websites,\s*and\s+manage\s+your\s+Wix\s+business,\s*from\s+Antigravity\.\s*The\s+plugin\s+connects\s+the\s+agent\s+to\s+your\s+Wix\s+account\s+through\s+the\s+official\s+Wix\s+MCP\s+server\s+and\s+adds\s+skills\s+for\s+the\s+Wix\s+CLI,\s*Wix\s+Headless,\s*and\s+the\s+Wix\s+business\s+APIs\.$/i,
        replace: () => "Создавайте приложения и headless-сайты Wix, а также управляйте своим бизнесом на Wix прямо из Antigravity. Плагин подключает агента к вашему аккаунту Wix через официальный MCP-сервер Wix и добавляет навыки для Wix CLI, Wix Headless и бизнес-API Wix."
    },
    {
        pattern: /^\s*dashboard\s+pages\s+and\s+modals,\s*site\s+widgets\s+and\s+plugins,\s*backend\s+APIs\s+and\s+events,\s*service\s+plugins\s+\(shipping,\s*tax,\s*discounts\),\s*embedded\s+scripts,\s*and\s+data\s+collections\.$/i,
        replace: () => " страницы и модальные окна панели управления, виджеты и плагины сайта, бэкенд-API и события, сервисные плагины (доставка, налоги, скидки), встраиваемые скрипты и коллекции данных."
    },
    {
        pattern: /^\s*a\s+store,\s*bookings,\s*blog,\s*events,\s*restaurant,\s*portfolio,\s*members\s+area,\s*and\s+more,\s*on\s+shipped,\s*verified\s+Wix\s+code,\s*released\s+to\s+Wix\s+hosting\s+or\s+wired\s+into\s+a\s+front\s+end\s+you\s+already\s+have\.$/i,
        replace: () => " магазин, бронирования, блог, мероприятия, ресторан, портфолио, личный кабинет и многое другое на базе готового проверенного кода Wix с публикацией на хостинге Wix или подключением к вашему фронтенду."
    },
    {
        pattern: /^\s*set\s+up\s+products,\s*services,\s*CMS\s+collections,\s*pricing\s+plans\s+and\s+more\s+on\s+your\s+sites,\s*through\s+the\s+Wix\s+REST\s+APIs\.$/i,
        replace: () => " настраивайте товары, услуги, коллекции CMS, тарифные планы и многое другое на ваших сайтах через Wix REST API."
    },
    {
        pattern: /^\s*Wix\s+API\s+and\s+SDK\s+docs,\s*and\s+Wix\s+Design\s+System\s+components\s+and\s+props\.$/i,
        replace: () => " документация по API и SDK Wix, а также компоненты и свойства (props) Wix Design System."
    },
    {
        pattern: /^(?:Build|Сборка)\s+and\s+review\s+Wix\s+CLI\s+app\s+extensions\s*[—–-]\s*dashboard\s+pages,\s*modals,\s*plugins,\s*menu\s+plugins.*$/i,
        replace: () => "Создание и проверка расширений приложений Wix CLI: страницы и модальные окна дашборда, плагины, виджеты, React-компоненты редактора, встраиваемые скрипты, бэкенд-API, события, сервисные плагины, коллекции данных и подготовка к публикации в Wix App Market."
    },
    {
        pattern: /^Wix\s+Design\s+System\s+component\s+reference\.\s*Use\s+when\s+building\s+UI\s+with\s+@wix\/design-system.*$/i,
        replace: () => "Справочник компонентов Wix Design System (@wix/design-system): выбор компонентов, проверка свойств (props) и примеров, а также написание тестов с использованием драйверов и testkit."
    },
    {
        pattern: /^Look\s+up\s+the\s+Wix\s+API\/SDK\s+documentation\s+to\s+confirm\s+an\s+exact\s+endpoint,\s*HTTP\s+method,\s*request\/response\s+shape.*$/i,
        replace: () => "Поиск в документации API и SDK Wix для проверки точного эндпоинта, HTTP-метода, структуры запроса/ответа, полей, перечислений и ошибок перед написанием кода Wix."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+Wix\s+Headless\s+site\s+fast\s+by\s+wiring\s+SHIPPED,\s*verified\s+@wix\/sdk\s+code\s+instead\s+of\s+authoring.*$/i,
        replace: () => "Быстрое создание сайта Wix Headless на базе готового проверенного кода @wix/sdk (React + Astro SSR с настроенным SEO и скриптами начального заполнения для магазинов, бронирований, аренды, блога, CMS, форм, событий, ресторанов и др.)."
    },
    {
        pattern: /^REST\s+recipes\s+to\s+configure\s+and\s+manage\s+a\s+Wix\s+site['’]s\s+business\s+solutions\s*[—–-]\s*stores,\s*bookings,\s*donations.*$/i,
        replace: () => "Готовые REST-рецепты для настройки и управления бизнес-решениями сайта Wix: магазины, бронирования, пожертвования, платежи, CMS, контакты, формы, медиа, тарифные планы, рестораны, блог, календарь, домены, события, аналитика и SEO."
    },
    {
        pattern: /^What\s+the\s+Wix\s+plugin\s+holds\s+and\s+how\s+to\s+work\s+with\s+Wix\s+through\s+it:\s*the\s+flow\s+the\s+Wix\s+MCP\s+README\s+returns.*$/i,
        replace: () => "Обзор содержимого плагина Wix и правил работы с ним: рабочий процесс Wix MCP, указатель всех навыков плагина и инструментов Wix MCP с описанием назначения каждого из них."
    },

    // === WordPress Plugin ===
    {
        pattern: /^(?:Build|Сборка),\s*publish,\s*and\s+manage\s+WordPress\.com\s+and\s+Jetpack-connected\s+sites\.\s*Draft\s+posts,\s*edit\s+blocks,\s*check\s+traffic\s+stats,\s*moderate\s+comments,\s*and\s+manage\s+plugins\.?$/i,
        replace: () => "Создавайте, публикуйте и управляйте сайтами на WordPress.com и подключёнными через Jetpack сайтами. Пишите черновики постов, редактируйте блоки, проверяйте статистику трафика, модерируйте комментарии и управляйте плагинами."
    },
    {
        pattern: /^(?:Update|Обновление)\s+the\s+[“"']Learn\s+more[”"']\s+button\s+on\s+my\s+page\s+to\s+[“"']Book\s+a\s+consultation[”"']\s+and\s+link\s+it\s+to\s+my\s+Contact\s+page\.?$/i,
        replace: () => "Обнови кнопку «Learn more» на моей странице на «Book a consultation» и поставь ссылку на страницу контактов."
    },
    {
        pattern: /^Describe\s+what\s+you\s+need\s+and\s+WordPress\s+builds\s+it:\s*a\s+portfolio,\s*a\s+restaurant\s+menu,\s*a\s+blog,\s*or\s+an\s+online\s+store\.\s*Already\s+have\s+a\s+WordPress\.com\s+or\s+Jetpack\s+site\?\s*Connect\s+it\s+to\s+draft\s+and\s+schedule\s+posts,\s*edit\s+block\s+layouts\s+in\s+place,\s*review\s+traffic\s+statistics,\s*moderate\s+comments,\s*manage\s+plugins,\s*and\s+configure\s+domains[—–-]all\s+through\s+natural\s+conversation\.$/i,
        replace: () => "Опишите, что вам нужно, и WordPress создаст это: портфолио, меню ресторана, блог или интернет-магазин. Уже есть сайт на WordPress.com или с Jetpack? Подключите его, чтобы писать и планировать посты, редактировать блочную вёрстку на месте, анализировать статистику трафика, модерировать комментарии, управлять плагинами и настраивать домены — в формате обычного диалога."
    },
    {
        pattern: /^\s*[—–-]\s*Plan\s+and\s+provision\s+new\s+WordPress\.com\s+sites,\s*check\s+subdomain\s+availability,\s*and\s+configure\s+site\s+titles\s+and\s+taglines\.$/i,
        replace: () => " — планируйте и создавайте новые сайты на WordPress.com, проверяйте доступность поддоменов и настраивайте заголовки и описания сайтов."
    },
    {
        pattern: /^\s*[—–-]\s*Draft,\s*edit,\s*and\s+schedule\s+posts,\s*pages,\s*and\s+custom\s+post\s+types\s+\(including\s+WooCommerce\s+products\s+and\s+portfolio\s+projects\)\s+using\s+theme-aware\s+WordPress\s+blocks\.$/i,
        replace: () => " — создавайте черновики, редактируйте и планируйте публикацию записей, страниц и пользовательских типов записей (включая товары WooCommerce и проекты портфолио) с помощью блоков WordPress с учётом стилей темы."
    },
    {
        pattern: /^\s*[—–-]\s*Update\s+individual\s+top-level\s+block\s+sections\s+on\s+existing\s+pages\s+and\s+posts\s+without\s+rewriting\s+the\s+entire\s+document\.$/i,
        replace: () => " — обновляйте отдельные секции блоков верхнего уровня на существующих страницах и в записях без перезаписи всего документа целиком."
    },
    {
        pattern: /^\s*[—–-]\s*Inspect\s+active\s+theme\s+presets\s+\(color\s+palettes,\s*typography,\s*spacing\s+tokens\),\s*allowed\s+blocks,\s*templates,\s*template\s+parts,\s*and\s+navigation\s+menus\.$/i,
        replace: () => " — просматривайте пресеты активной темы (цветовые палитры, типографику, токены отступов), разрешённые блоки, шаблоны, части шаблонов и меню навигации."
    },
    {
        pattern: /^\s*[—–-]\s*Compare\s+monthly\s+views\s+and\s+visitors,\s*review\s+activity\s+logs,\s*update\s+site\s+settings,\s*manage\s+collaborator\s+roles\s+and\s+invitations,\s*and\s+install\s+or\s+update\s+plugins\.$/i,
        replace: () => " — сравнивайте ежемесячные просмотры и посетителей, просматривайте журнал активности, обновляйте настройки сайта, управляйте ролями участников и приглашениями, а также устанавливайте и обновляйте плагины."
    },
    {
        pattern: /^\s*[—–-]\s*Check\s+domain\s+availability,\s*configure\s+DNS\s+records\s+or\s+external\s+mail\s+providers\s+\(Google\s+Workspace,\s*iCloud\s+Mail,\s*Office\s+365,\s*Zoho\s+Mail\),\s*and\s+generate\s+WordPress\.com\s+checkout\s+links\.$/i,
        replace: () => " — проверяйте доступность доменов, настраивайте записи DNS или внешние почтовые сервисы (Google Workspace, iCloud Mail, Office 365, Zoho Mail) и генерируйте ссылки на оплату тарифов WordPress.com."
    },
    {
        pattern: /^(?:Create|Создать)\s+and\s+edit\s+serialized\s+WordPress\s+block\s+markup\s+using\s+theme\s+presets\s+and\s+registered\s+blocks\.$/i,
        replace: () => "Создание и редактирование сериализованной разметки блоков WordPress с использованием пресетов темы и зарегистрированных блоков."
    },
    {
        pattern: /^Draft,\s*update,\s*and\s+manage\s+posts,\s*pages,\s*media,\s*comments,\s*taxonomies,\s*templates,\s*and\s+navigation\s+menus\.$/i,
        replace: () => "Создание черновиков, обновление и управление записями, страницами, медиафайлами, комментариями, таксономиями, шаблонами и меню навигации."
    },
    {
        pattern: /^Discover\s+sites,\s*provision\s+new\s+sites,\s*analyze\s+traffic\s+stats,\s*and\s+manage\s+plugins,\s*users,\s*domains,\s*and\s+settings\.$/i,
        replace: () => "Обзор существующих сайтов, развёртывание новых сайтов, анализ статистики трафика и управление плагинами, пользователями, доменами и настройками."
    },
    {
        pattern: /^(?:Create|Создать)\s+and\s+edit\s+serialized\s+WordPress\s+block\s+content\s+for\s+posts,\s*pages,\s*patterns,\s*templates,\s*and\s+template\s+parts.*$/i,
        replace: () => "Создание и редактирование сериализованного блочного контента WordPress для записей, страниц, паттернов, шаблонов и частей шаблонов."
    },
    {
        pattern: /^Discover,\s*provision,\s*and\s+administer\s+WordPress\.com\s+and\s+Jetpack-connected\s+sites.*$/i,
        replace: () => "Обнаружение, создание и администрирование сайтов на WordPress.com и подключённых через Jetpack сайтов (список сайтов, трафик, настройки, плагины, пользователи, домены и DNS)."
    },
    {
        pattern: /^Draft,\s*edit,\s*schedule,\s*and\s+manage\s+posts,\s*pages,\s*custom\s+post\s+types,\s*media,\s*comments,\s*taxonomies,\s*templates,\s*and\s+navigation\s+on\s+WordPress\.com\s+sites.*$/i,
        replace: () => "Создание черновиков, редактирование, планирование и управление записями, страницами, пользовательскими типами записей, медиафайлами, комментариями, таксономиями, шаблонами и навигацией на сайтах WordPress.com."
    },

    // === Auth0 Plugin ===
    {
        pattern: /^(?:Add|Добавить)\s+Auth0\s+authentication\s+to\s+any\s+app:\s*login,\s*MFA,\s*SSO,\s*Organizations,\s*RBAC,\s*custom\s+domains,\s*and\s+branding\.\s*Debug\s+auth\s+errors\s+and\s+migrate\s+from\s+other\s+providers\.?$/i,
        replace: () => "Добавьте аутентификацию Auth0 в любое приложение: вход, MFA, SSO, организации (Organizations), RBAC, кастомные домены и брендинг. Отлаживайте ошибки авторизации и мигрируйте с других провайдеров."
    },
    {
        pattern: /^Use\s+when\s+adding,\s*fixing,\s*or\s+improving\s+how\s+an\s+app\s+authenticates\s+users\s+or\s+protects\s+an\s+API,\s*or\s+when\s+using\s+or\s+configuring\s+any\s+Auth0\s+feature.*$/i,
        replace: () => "Используйте при добавлении, исправлении или улучшении аутентификации пользователей и защиты API, а также при настройке любых возможностей Auth0 (вход/выход, сессии и токены, защита маршрутов, MFA, Passkeys/WebAuthn, SSO, Organizations, RBAC, кастомные домены, аудит безопасности тенанта и миграция)."
    },

    // === Base44 Plugin ===
    {
        pattern: /^(?:Build|Сборка)\s+and\s+deploy\s+Base44\s+full-stack\s+apps:\s*CLI\s+project\s+management,\s*JavaScript\/TypeScript\s+SDK\s+development,\s*and\s+production\s+troubleshooting\s+skills\.?$/i,
        replace: () => "Создавайте и развёртывайте full-stack приложения Base44: управление проектами через CLI, разработка с помощью JavaScript/TypeScript SDK и навыки диагностики проблем в продакшене."
    },
    {
        pattern: /^The\s+base44\s+CLI\s+is\s+used\s+for\s+EVERYTHING\s+related\s+to\s+base44\s+projects:\s*resource\s+configuration.*$/i,
        replace: () => "CLI base44 используется для ВСЕХ задач в проектах Base44: настройка ресурсов (сущности, бэкенд-функции, realtime-акторы, ИИ-агенты), инициализация, создание ресурсов, деплой и управление приложением через публичный API Base44."
    },
    {
        pattern: /^The\s+base44\s+SDK\s+is\s+the\s+library\s+to\s+communicate\s+with\s+base44\s+services\.\s*In\s+projects,\s*you\s+use\s+it\s+to\s+communicate\s+with\s+remote\s+resources.*$/i,
        replace: () => "SDK base44 — библиотека для взаимодействия с сервисами Base44: работа с удалёнными ресурсами (сущности, бэкенд-функции, realtime-акторы, ИИ-агенты и AI Gateway), а также написание собственных бэкенд-функций и акторов."
    },
    {
        pattern: /^Troubleshoot\s+production\s+issues\s+using\s+backend\s+function\s+logs\s+and\s+workflow\s+run\s+history.*$/i,
        replace: () => "Диагностика и устранение проблем в продакшене с помощью логов бэкенд-функций и истории запусков рабочих процессов в приложениях Base44."
    },

    // === VirusTotal Plugin ===
    {
        pattern: /^Investigate\s+files,\s*URLs,\s*domains\s+and\s+IP\s+addresses\s+with\s+VirusTotal\s+threat\s+intelligence,\s*analysis\s+and\s+submission\s+recovery\.?$/i,
        replace: () => "Исследуйте файлы, URL-адреса, домены и IP-адреса с помощью аналитики угроз (Threat Intelligence) VirusTotal, анализа и восстановления отправленных проверок."
    },
    {
        pattern: /^Investigates\s+file\s+hashes,\s*URLs,\s*domains\s+and\s+IP\s+addresses\s+with\s+VirusTotal\s+reports.*$/i,
        replace: () => "Исследует хеши файлов, URL-адреса, домены и IP-адреса с помощью отчётов VirusTotal. Помогает выполнять авторизованные запросы на анализ, принимать решения об отправке данных и восстанавливать результаты проверок."
    },

    // === Other Partner Plugins (Atlassian TWG, Canva, Context7, Dropbox, Linear, Mobbin, Monday, Notion, PandaDoc, Trello) ===
    {
        pattern: /^Help\s+me\s+implement\s+\[JIRA-123\]\.\s*Retrieve\s+the\s+requirements,\s*acceptance\s+criteria,\s*and\s+linked\s+design\s+decisions\.\s*Inspect\s+this\s+repository\s+and\s+propose\s+an\s+implementation\s+plan\s+before\s+changing\s+code\.$/i,
        replace: () => "Помоги мне реализовать [JIRA-123]. Получи требования, критерии приёмки и связанные проектные решения. Изучи этот репозиторий и предложи план реализации перед изменением кода."
    },
    {
        pattern: /^Investigate\s+\[JIRA-123\]\s+in\s+this\s+repository\.\s*Find\s+related\s+bugs,\s*previous\s+fixes,\s*and\s+relevant\s+technical\s+decisions\.\s*Recommend\s+a\s+fix\s+and\s+the\s+tests\s+needed\s+to\s+verify\s+it\.$/i,
        replace: () => "Исследуй [JIRA-123] в этом репозитории. Найди связанные баги, предыдущие исправления и релевантные технические решения. Порекомендуй исправление и тесты для его проверки."
    },
    {
        pattern: /^(?:Review|Проверить)\s+my\s+current\s+changes\s+against\s+\[JIRA-123\]\s+and\s+its\s+linked\s+specification\.\s*Flag\s+missed\s+requirements,\s*conflicting\s+decisions,\s*and\s+missing\s+tests\.$/i,
        replace: () => "Проверь мои текущие изменения на соответствие задаче [JIRA-123] и связанной с ней спецификации. Отметь пропущенные требования, противоречивые решения и недостающие тесты."
    },
    {
        pattern: /^Install,\s*upgrade,\s*authenticate,\s*or\s+repair\s+`?twg`?\s+for\s+your\s+coding\s+agent.*$/i,
        replace: () => "Установка, обновление, аутентификация и восстановление CLI twg (Atlassian Teamwork Graph) для вашего кодинг-агента: доступ к контексту задач Jira, страниц Confluence, PR в Bitbucket и связанных источников данных."
    },
    {
        pattern: /^(?:Check|Проверка)\s+a\s+Canva\s+design\s+against\s+a\s+brand\s+kit\s+and\s+report\s+where\s+it\s+diverges.*$/i,
        replace: () => "Проверка дизайна Canva на соответствие бренд-киту (цвета вне палитры, нефирменные шрифты, некорректное использование логотипа и стиля текста) в режиме только для чтения."
    },
    {
        pattern: /^Bulk-create\s+Canva\s+designs\s+from\s+tabular\s+data\s+using\s+a\s+brand\s+template\s+with\s+autofill\s+fields.*$/i,
        replace: () => "Массовое создание дизайнов Canva из табличных данных (CSV, таблицы, JSON) на основе брендового шаблона с полями автозаполнения (по одному дизайну на каждую строку)."
    },
    {
        pattern: /^Make\s+edits\s+to\s+an\s+existing\s+Canva\s+design\s*[—–-]\s*change\s+or\s+fix\s+text,\s*replace\/insert\/delete\s+images\s+and\s+videos.*$/i,
        replace: () => "Внесение правок в существующий дизайн Canva: изменение и исправление текста, замена/вставка/удаление изображений и видео, форматирование текста, перемещение элементов и обновление заголовка."
    },
    {
        pattern: /^(?:Read|Чтение)\s+a\s+Canva\s+design\s+and\s+return\s+structured,\s*actionable\s+design\s+feedback.*$/i,
        replace: () => "Анализ дизайна Canva и предоставление структурированной обратной связи: визуальная иерархия, текст и посыл, вёрстка и отступы, консистентность, читаемость и доступность."
    },
    {
        pattern: /^Implement\s+reviewer\s+feedback\s+on\s+a\s+Canva\s+design\.\s*Reads\s+all\s+comment\s+threads.*$/i,
        replace: () => "Внедрение правок ревьюеров в дизайн Canva: чтение всех веток комментариев, обобщение пожеланий, автоматическое внесение однозначных правок и выделение вопросов, требующих решения человека."
    },
    {
        pattern: /^Resize\s+a\s+Canva\s+design\s+into\s+multiple\s+social\s+media\s+formats.*$/i,
        replace: () => "Изменение размера дизайна Canva сразу под несколько форматов социальных сетей (пост и сторис Facebook, пост и сторис Instagram, пост LinkedIn) за одну операцию."
    },
    {
        pattern: /^This\s+skill\s+should\s+be\s+used\s+when\s+the\s+user\s+asks\s+about\s+libraries,\s*frameworks,\s*API\s+references,\s*or\s+needs\s+code\s+examples.*$/i,
        replace: () => "Используется, когда пользователь спрашивает о библиотеках, фреймворках, справочниках API или нуждается в актуальных примерах кода (React, Vue, Next.js, Prisma, Supabase и др.)."
    },
    {
        pattern: /^Clean\s+up\s+Dropbox\s+content\s+by\s+identifying\s+obsolete,\s*duplicate,\s*temporary,\s*or\s+unwanted\s+files.*$/i,
        replace: () => "Очистка содержимого Dropbox путём выявления устаревших, дублирующихся, временных или ненужных файлов с удалением только после явного подтверждения."
    },
    {
        pattern: /^(?:Create|Создать),\s*inspect,\s*and\s+manage\s+Dropbox\s+file\s+requests\s+for\s+collecting\s+uploads\s+from\s+other\s+people.*$/i,
        replace: () => "Создание, проверка и управление запросами файлов (file requests) в Dropbox для сбора загружаемых файлов от других пользователей."
    },
    {
        pattern: /^Find\s+Dropbox\s+files\s+and\s+folders\s+relevant\s+to\s+a\s+user\s+request.*$/i,
        replace: () => "Поиск файлов и папок в Dropbox по запросу пользователя: поиск документов, недавних файлов и навигация по структуре папок перед чтением, отправкой или организацией."
    },
    {
        pattern: /^(?:Inspect|Инспекция)\s+a\s+Dropbox\s+file\s+or\s+folder\s+by\s+checking\s+metadata,\s*shared\s+links,\s*and\s+file\s+content.*$/i,
        replace: () => "Инспекция файла или папки в Dropbox: проверка метаданных, общих ссылок и содержимого файла при необходимости."
    },
    {
        pattern: /^Organize\s+Dropbox\s+files\s+and\s+folders\s+by\s+creating\s+folders,\s*copying\s+content,\s*or\s+moving\s+content.*$/i,
        replace: () => "Организация файлов и папок в Dropbox: создание папок, копирование и перемещение содержимого в более чистую и упорядоченную структуру."
    },
    {
        pattern: /^Share\s+Dropbox\s+files\s+or\s+folders\s+by\s+creating\s+shared\s+links,\s*inspecting\s+existing\s+shared\s+links.*$/i,
        replace: () => "Предоставление доступа к файлам и папкам в Dropbox: создание новых общих ссылок, проверка существующих ссылок и параметров доступа."
    },
    {
        pattern: /^Tells\s+your\s+agent\s+what\s+Mobbin\s+can\s+and\s+can['’]t\s+do\s+and\s+how\s+the\s+Mobbin\s+skills\s+work\s+together.*$/i,
        replace: () => "Объясняет агенту возможности и ограничения Mobbin, а также то, как навыки Mobbin работают вместе, чтобы выбрать подходящий инструмент для дизайн-задачи."
    },
    {
        pattern: /^Makes\s+every\s+report\s+a\s+Mobbin\s+skill\s+writes\s+read\s+like\s+a\s+person\s+wrote\s+it,\s*in\s+plain\s+interface\s+terms.*$/i,
        replace: () => "Делает каждый отчёт навыков Mobbin живым и естественным, используя понятную интерфейсную терминологию без шаблонных ИИ-оборотов и лишней воды."
    },
    {
        pattern: /^Redesign\s+any\s+screen\s+from\s+patterns\s+real\s+apps\s+ship\.\s*Share\s+a\s+screenshot,\s*your\s+code\s+or\s+a\s+design\s+file.*$/i,
        replace: () => "Редизайн любого экрана на основе паттернов из реальных приложений на Mobbin с сохранением вашей собственной дизайн-системы, сравнением «до/после» и ссылками на референсы."
    },
    {
        pattern: /^Gets\s+better\s+results\s+from\s+every\s+Mobbin\s+search,\s*so\s+the\s+references\s+match\s+what\s+you['’]re\s+working\s+on.*$/i,
        replace: () => "Повышает точность каждого поискового запроса в Mobbin (search_screens, search_flows, search_sections), чтобы найденные референсы идеально подходили под вашу задачу."
    },
    {
        pattern: /^Creates,\s*reads,\s*edits,\s*and\s+comments\s+on\s+monday\.com\s+docs\s*[—–-]\s*the\s+rich-content\s+surface\s+inside\s+monday.*$/i,
        replace: () => "Создаёт, читает, редактирует и комментирует документы monday.com (заметки встреч, RFC, ранбуки, еженедельные отчёты) со встраиванием живых данных из колонок досок и упоминаниями."
    },
    {
        pattern: /^Creates\s+and\s+edits\s+monday\.com\s+WorkForms\s*[—–-]\s*public\s+intake\s+forms\s+that\s+capture\s+responses\s+as\s+new\s+items.*$/i,
        replace: () => "Создаёт и редактирует формы monday.com WorkForms — публичные формы сбора заявок, баг-репортов и анкет, автоматически превращающие ответы в элементы на доске."
    },
    {
        pattern: /^First-run\s+onboarding\s+for\s+people\s+who\s+just\s+connected\s+monday\.com\s+and\s+have\s+not\s+set\s+anything\s+up\s+yet.*$/i,
        replace: () => "Быстрый стартовый онбординг для пользователей, которые только что подключили monday.com: за пару минут создаёт готовую к работе доску, адаптированную под ваши задачи."
    },
    {
        pattern: /^Creates,\s*updates,\s*assigns,\s*and\s+manages\s+items\s+across\s+monday\.com\s+boards.*$/i,
        replace: () => "Создаёт, обновляет, назначает и управляет задачами (элементами) на досках monday.com с корректным форматированием значений для всех типов колонок."
    },
    {
        pattern: /^Turns\s+scattered\s+notes\s+and\s+recurring\s+work\s+into\s+useful\s+Notion\s+trackers\s+for\s+requests,\s*content\s+plans,\s*or\s+team\s+work.*$/i,
        replace: () => "Превращает разрозненные заметки и регулярные задачи в удобные трекеры и базы данных Notion для заявок, контент-планов и командной работы."
    },
    {
        pattern: /^Captures\s+conversations\s+and\s+supplied\s+notes\s+as\s+Notion\s+wiki\s+pages,\s*how-to\s+guides,\s*FAQs,\s*decision\s+records,\s*or\s+retrospectives.*$/i,
        replace: () => "Сохраняет обсуждения и заметки в виде вики-страниц Notion, практических руководств (how-to), FAQ, записей о принятых решениях (ADR) или ретроспектив."
    },
    {
        pattern: /^Prepares\s+meeting\s+agendas,\s*internal\s+pre-reads,\s*and\s+decision\s+briefs\s+using\s+Notion\s+context\s+and\s+relevant\s+research.*$/i,
        replace: () => "Готовит повестки встреч, предварительные материалы (pre-reads) и резюме решений с использованием контекста вашего рабочего пространства Notion."
    },
    {
        pattern: /^Researches\s+questions\s+across\s+Notion\s+sources\s+and\s+synthesizes\s+cited\s+briefs,\s*comparisons,\s*or\s+reports.*$/i,
        replace: () => "Исследует вопросы по источникам в Notion и формирует сводки, сравнения или отчёты со ссылками на первоисточники."
    },
    {
        pattern: /^A\s+guided\s+setup\s+flow\s+to\s+get\s+the\s+most\s+out\s+of\s+Notion\s+that\s+is\s+recommended\s+for\s+all\s+users\s+who\s+install\s+the\s+Notion\s+MCP\.?$/i,
        replace: () => "Пошаговый мастер первоначальной настройки для максимально эффективной работы с Notion (рекомендуется всем пользователям после установки Notion MCP)."
    },
    {
        pattern: /^Converts\s+Notion\s+product\s+or\s+technical\s+specs\s+into\s+implementation\s+plans,\s*linked\s+tasks,\s*and\s+evidence-based\s+progress\s+updates.*$/i,
        replace: () => "Преобразует продуктовые и технические спецификации из Notion в планы реализации, связанные задачи и отчёты о прогрессе."
    },
    {
        pattern: /^Produces\s+evidence-based\s+weekly\s+project\s+or\s+team\s+updates\s+by\s+comparing\s+reporting\s+periods,\s*tasks,\s*decisions,\s*and\s+blockers\s+in\s+Notion.*$/i,
        replace: () => "Формирует аргументированные еженедельные дайджесты по проекту или команде путём сравнения отчётных периодов, задач, решений и блокеров в Notion."
    },
    {
        pattern: /^(?:Create|Создать)\s+a\s+document\s+from\s+a\s+template\s+and\s+route\s+it\s+through\s+its\s+internal\s+approval\s+chain.*$/i,
        replace: () => "Создание документа PandaDoc из шаблона и проведение его по внутренней цепочке согласования перед отправкой контрагенту."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+register\s+of\s+signed\s+contracts\s+with\s+their\s+key\s+terms\s*[—–-]\s*counterparty,\s*dates,\s*value\s+and\s+negotiated\s+provisions.*$/i,
        replace: () => "Формирование реестра подписанных договоров с их ключевыми условиями (контрагент, даты, сумма и согласованные положения) на основе метаданных PandaDoc."
    },
    {
        pattern: /^Track\s+per-recipient\s+signing\s+progress\s+across\s+documents\s+that\s+are\s+out\s*[—–-]\s*who\s+has\s+signed,\s*who\s+has\s+not.*$/i,
        replace: () => "Отслеживание прогресса подписания по каждому получателю для отправленных документов PandaDoc: кто уже подписал, кто ещё нет, в каком порядке и какие документы застряли."
    },
    {
        pattern: /^Sweep\s+documents\s+that\s+are\s+still\s+out\s+for\s+signature,\s*rank\s+them\s+by\s+how\s+long\s+they\s+have\s+been\s+waiting.*$/i,
        replace: () => "Анализ документов PandaDoc, ожидающих подписи, их ранжирование по времени ожидания и сумме сделки, а также подготовка черновиков писем-напоминаний."
    },
    {
        pattern: /^Turn\s+a\s+signed\s+quote\s+or\s+proposal\s+into\s+an\s+invoice\s*[—–-]\s*find\s+quotes\s+that\s+completed\s+and\s+have\s+not\s+been\s+invoiced\s+yet.*$/i,
        replace: () => "Превращение подписанного коммерческого предложения в счёт на оплату (инвойс) на основе шаблона PandaDoc с сохранением всех позиций и цен."
    },
    {
        pattern: /^Send\s+a\s+standard\s+NDA\s+to\s+a\s+counterparty\s+in\s+one\s+motion\s*[—–-]\s*find\s+the\s+right\s+NDA\s+template.*$/i,
        replace: () => "Быстрая отправка стандартного соглашения о неразглашении (NDA) контрагенту в один шаг: подбор шаблона, предзаполнение реквизитов, проверка полей подписи и отправка."
    },
    {
        pattern: /^Generate\s+an\s+onboarding\s+or\s+employment\s+document\s+from\s+a\s+template\s+with\s+the\s+new\s+joiner['’]s\s+details\s+prefilled.*$/i,
        replace: () => "Генерация кадрового или онбординг-документа PandaDoc из шаблона с предзаполнением данных нового сотрудника и отправкой на подпись."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+priced\s+PandaDoc\s+quote\s+or\s+proposal\s+from\s+a\s+template\s*[—–-]\s*fill\s+the\s+pricing\s+table\s+and\s+variables.*$/i,
        replace: () => "Создание коммерческого предложения (квоты) в PandaDoc из шаблона: заполнение таблицы цен и переменных, проверка итоговой суммы и скидок, подтверждение и отправка на подпись."
    },
    {
        pattern: /^Digest\s+of\s+signed\s+contracts\s+approaching\s+renewal\s+or\s+expiry,\s*with\s+counterparty,\s*value\s+and\s+days\s+remaining.*$/i,
        replace: () => "Дайджест подписанных договоров PandaDoc, срок продления или окончания которых приближается (контрагент, сумма, оставшиеся дни и крайний срок уведомления)."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+signing\s+pipeline\s+report\s*[—–-]\s*status\s+counts,\s*average\s+time\s+to\s+sign,\s*value\s+in\s+flight,\s*and\s+documents\s+that\s+are\s+stuck.*$/i,
        replace: () => "Формирование отчёта по воронке подписания PandaDoc: количество документов по статусам, среднее время подписания, общая сумма сделок в работе и застрявшие документы."
    },
    {
        pattern: /^\*\*MANDATORY\s+prerequisite\*\*\s*[—–-]\s*load\s+this\s+BEFORE\s+calling\s+any\s+Trello\s+MCP\s+tool.*$/i,
        replace: () => "**ОБЯЗАТЕЛЬНОЕ требование** — загружайте этот навык ПЕРЕД вызовом любого инструмента Trello MCP (формат идентификаторов ARI, работа с датами UTC, Inbox, доски, пагинация и полные записи)."
    },
    {
        // === Exact Figma 2.2.163 & Netlify 1.7.0 Skill Descriptions ===
        pattern: /^Creates\s+and\s+maintains\s+Figma\s+Code\s+Connect\s+template\s+files\s+that\s+map\s+Figma\s+components\s+to\s+code\s+snippets.*$/i,
        replace: () => "Создаёт и поддерживает файлы шаблонов Figma Code Connect (.figma.ts / .figma.js), связывающие компоненты Figma с фрагментами кода."
    },
    {
        pattern: /^(?:Import|Импорт)\s+or\s+upload\s+local\s+HTML\s+or\s+project\s+files\s+into\s+Figma,\s*choose\s+editable\s+Design\s+frames,\s*runnable.*$/i,
        replace: () => "Импорт или загрузка локальных HTML-файлов и файлов проекта в Figma с выбором редактируемых дизайн-фреймов, исполняемых слоёв кода (Code Layers) или файлов Make."
    },
    {
        pattern: /^Always\s+use\s+this\s+skill\s+when\s+the\s+user\s+wants\s+to\s+create\s+a\s+new\s+Figma\s+Design,\s*FigJam,\s*or\s+Slides\s+file.*$/i,
        replace: () => "Всегда используйте этот навык, когда пользователь хочет создать новый файл Figma Design, FigJam или Slides (вызывается перед каждым вызовом create_new_file)."
    },
    {
        pattern: /^\*\*MANDATORY\s+prerequisite\*\*\s*[—–-]\s*you\s+MUST\s+invoke\s+this\s+skill\s+BEFORE\s+calling\s+the\s+`?get_design_context`?.*$/i,
        replace: () => "**ОБЯЗАТЕЛЬНОЕ требование** — вызывайте этот навык ПЕРЕД вызовом инструмента get_design_context Figma MCP при любой реализации или вёрстке дизайна Figma в код."
    },
    {
        pattern: /^Use\s+this\s+skill\s+alongside\s+figma-use\s+when\s+the\s+task\s+involves\s+translating\s+an\s+application\s+page,\s*view,\s*or.*$/i,
        replace: () => "Используйте этот навык вместе с figma-use при переносе страницы приложения, экрана или многосекционного макета в Figma с использованием компонентов и токенов дизайн-системы."
    },
    {
        pattern: /^\*?\*?MANDATORY\s+prerequisite\*?\*?\s*[—–-]\s*load\s+this\s+skill\s+BEFORE\s+every\s+`?generate_diagram`?\s+tool\s+call.*$/i,
        replace: () => "ОБЯЗАТЕЛЬНОЕ требование — загружайте этот навык ПЕРЕД каждым вызовом generate_diagram при создании блок-схем, архитектурных диаграмм, ERD, диаграмм состояний и Ганта в FigJam."
    },
    {
        pattern: /^(?:Build|Сборка)\s+or\s+update\s+a\s+professional-grade\s+design\s+system\s+in\s+Figma\s+from\s+a\s+codebase.*$/i,
        replace: () => "Создание или обновление профессиональной дизайн-системы в Figma на основе кодовой базы: переменные и токены, библиотеки компонентов с вариантами и темы (светлая/тёмная)."
    },
    {
        pattern: /^\*\*MANDATORY\s+prerequisite\*\*\s*[—–-]\s*load\s+this\s+skill\s+before\s+calling\s+`?create_generative_plugin`?\s+or\s+`?update_generative_plugin`?.*$/i,
        replace: () => "**ОБЯЗАТЕЛЬНОЕ требование** — загружайте этот навык перед вызовом create_generative_plugin или update_generative_plugin при создании или изменении генеративных плагинов Figma."
    },
    {
        pattern: /^Translates\s+Figma\s+motion\s+and\s+animations\s+into\s+production-ready\s+application\s+code.*$/i,
        replace: () => "Переводит движение и анимации из дизайна Figma в готовый к продакшену код приложения (при наличии анимаций на узлах или вызове get_motion_context)."
    },
    {
        pattern: /^\*\*MANDATORY\s+prerequisite\*\*\s*[—–-]\s*load\s+this\s+skill\s+before\s+calling\s+`?create_shader`?\s+or\s+`?update_shader`?.*$/i,
        replace: () => "**ОБЯЗАТЕЛЬНОЕ требование** — загружайте этот навык перед вызовом create_shader или update_shader при создании или редактировании шейдерных эффектов и заливок в Figma."
    },
    {
        pattern: /^This\s+skill\s+is\s+required\s+to\s+create,\s*read,\s*edit,\s*review,\s*or\s+comment\s+on\s+Figma\s+specs.*$/i,
        replace: () => "Этот навык необходим для создания, чтения, редактирования, проверки и комментирования спецификаций Figma (PRD, брифов, RFC в отдельных файлах или внутри Figma Design/FigJam)."
    },
    {
        pattern: /^SwiftUI\s*↔\s*Figma\s+translation\.\s*Use\s+whenever\s+the\s+user\s+mentions\s+Swift,\s*SwiftUI,\s*iOS,\s*iPhone,\s*or\s+iPad.*$/i,
        replace: () => "Двусторонний перевод SwiftUI ↔ Figma: перевод дизайнов Figma в код SwiftUI (дизайн → код) или выгрузка экранов и токенов SwiftUI обратно в файл Figma (код → дизайн)."
    },
    {
        pattern: /^\*\*MANDATORY\s+prerequisite\*\*\s*[—–-]\s*you\s+MUST\s+invoke\s+this\s+skill\s+BEFORE\s+every\s+`?use_figma`?\s+tool\s+call.*$/i,
        replace: () => "**ОБЯЗАТЕЛЬНОЕ требование** — вызывайте этот навык ПЕРЕД каждым вызовом инструмента use_figma для создания/редактирования узлов, переменных, компонентов и авто-лейаута."
    },
    {
        pattern: /^This\s+skill\s+helps\s+agents\s+use\s+Figma['’]s\s+use_figma\s+MCP\s+tool\s+in\s+the\s+FigJam\s+context.*$/i,
        replace: () => "Помогает агентам использовать инструмент use_figma MCP в контексте досок FigJam (используется совместно с базовым навыком figma-use)."
    },
    {
        pattern: /^Motion\s*\/\s*animation\s+context\s+for\s+the\s+`?use_figma`?\s+MCP\s+tool\s*[—–-]\s*animating\s+Figma\s+nodes\s+via\s+manual\s+keyframes.*$/i,
        replace: () => "Контекст анимации и движения для инструмента use_figma MCP: анимация узлов Figma через ключевые кадры, стили анимации, кривые сглаживания (easing) и таймлайн."
    },
    {
        pattern: /^This\s+skill\s+helps\s+agents\s+use\s+Figma['’]s\s+use_figma\s+MCP\s+tool\s+in\s+the\s+Slides\s+context.*$/i,
        replace: () => "Помогает агентам использовать инструмент use_figma MCP в контексте презентаций Figma Slides (используется совместно с базовым навыком figma-use)."
    },
    {
        pattern: /^Picks\s+the\s+right\s+Netlify\s+site-protection\s+layer\s+and\s+disambiguates\s+the\s+three\s+unrelated\s+"auth"\s+concepts.*$/i,
        replace: () => "Подбирает правильный уровень защиты сайта на Netlify и разграничивает три разных понятия аутентификации: вход пользователей приложения (Netlify Identity), закрытие доступа к сайту (пароль / приватность проекта) и SAML SSO."
    },
    {
        pattern: /^(?:Run|Запуск)\s+AI\s+agent\s+tasks\s+remotely\s+on\s+Netlify\s+using\s+Claude,\s*Codex,\s*or\s+Gemini.*$/i,
        replace: () => "Удалённый запуск задач ИИ-агентов на Netlify с использованием Claude, Codex или Gemini для выполнения задач разработки в облаке против вашего репозитория."
    },
    {
        pattern: /^Use\s+Netlify\s+AI\s+Gateway\s+to\s+call\s+OpenAI,\s*Anthropic\s+Claude,\s*Google\s+Gemini,\s*TypeSafe\s+\(Jev\),\s*or\s+OpenRouter.*$/i,
        replace: () => "Использование Netlify AI Gateway для вызова моделей OpenAI, Anthropic Claude, Google Gemini, TypeSafe или OpenRouter из Netlify Functions и Edge Functions без ручного управления API-ключами."
    },
    {
        pattern: /^Store\s+and\s+retrieve\s+unstructured\s+objects,\s*files,\s*and\s+cache-like\s+state\s+on\s+Netlify\s+with\s+the\s+@netlify\/blobs\s+module.*$/i,
        replace: () => "Хранение и получение неструктурированных объектов, файлов и кэшируемого состояния на Netlify с помощью модуля @netlify/blobs (загрузки пользователей, JSON-данные, артефакты)."
    },
    {
        pattern: /^Cache\s+dynamic\s+and\s+static\s+responses\s+on\s+Netlify['’]s\s+CDN\s+from\s+Functions,\s*Edge\s+Functions,\s*and\s+proxies.*$/i,
        replace: () => "Кэширование динамических и статических ответов в CDN Netlify из Functions, Edge Functions и прокси (заголовки кэша, TTL, stale-while-revalidate, инвалидация по тегам и Cache API)."
    },
    {
        pattern: /^Configure\s+Netlify\s+builds\s+and\s+routing\s+via\s+netlify\.toml,\s*_redirects,\s*and\s+_headers.*$/i,
        replace: () => "Настройка сборки и маршрутизации Netlify через файлы netlify.toml, _redirects и _headers (команды сборки, редиректы, прокси, SPA-маршруты, заголовки, переменные окружения и секреты)."
    },
    {
        pattern: /^Zero-config\s+Postgres\s+for\s+Netlify\s+apps\s+via\s+@netlify\/database\s*[—–-]\s*querying\s+data\s+from\s+Functions\/Edge\s+Functions.*$/i,
        replace: () => "База данных Postgres без предварительной настройки для приложений Netlify через @netlify/database: запросы из Functions/Edge Functions, миграции схемы, Drizzle ORM и локальная разработка."
    },
    {
        pattern: /^(?:Create|Создать),\s*configure,\s*and\s+manage\s+Netlify\s+deploys\s+from\s+code\s*[—–-]\s*reach\s+for\s+this\s+when\s+setting\s+up\s+Git\s+continuous.*$/i,
        replace: () => "Создание, настройка и управление деплоями Netlify из кода: непрерывное развёртывание из Git, команды netlify deploy, контексты деплоя в netlify.toml, Deploy Previews и вебхуки сборки."
    },
    {
        pattern: /^Write,\s*route,\s*cache,\s*and\s+debug\s+Netlify\s+Edge\s+Functions,\s*the\s+Deno-based\s+TypeScript\s+or\s+JavaScript\s+handlers.*$/i,
        replace: () => "Написание, маршрутизация, кэширование и отладка Netlify Edge Functions — обработчиков на базе Deno (TypeScript/JavaScript), выполняющихся на границе сети перед статикой и функциями."
    },
    {
        pattern: /^Serverless\s+form\s+handling\s+on\s+Netlify-hosted\s+sites\s*[—–-]\s*detects\s+HTML\s+forms\s+at\s+deploy\s+time,\s*stores\s+submissions.*$/i,
        replace: () => "Бессерверная обработка форм на сайтах Netlify: автоматическое обнаружение HTML-форм при деплое, хранение ответов, фильтрация спама (honeypot, reCAPTCHA), AJAX-отправка и уведомления."
    },
    {
        pattern: /^Deploy\s+and\s+configure\s+web\s+frameworks\s+on\s+Netlify\s*[—–-]\s*build\s+settings\s+and\s+SSR\/edge\s+adapters\s+plus\s+local.*$/i,
        replace: () => "Развёртывание и настройка веб-фреймворков на Netlify (Next.js, Astro, Nuxt, SvelteKit, Remix, React Router, TanStack Start, SolidStart, Gatsby, Angular, Vite): параметры сборки, адаптеры SSR/Edge и локальная эмуляция."
    },
    {
        pattern: /^Write,\s*configure,\s*and\s+deploy\s+Netlify\s+serverless\s+functions\s+in\s+TypeScript,\s*JavaScript,\s*or\s+Go.*$/i,
        replace: () => "Написание, настройка и деплой бессерверных функций Netlify на TypeScript, JavaScript или Go (API-эндпоинты, вебхуки, стриминг, фоновые задачи и cron-расписания)."
    },
    {
        pattern: /^(?:Add|Добавить)\s+user\s+authentication\s+to\s+a\s+Netlify\s+site\s+with\s+@netlify\/identity\s*[—–-]\s*signup\/login\/logout.*$/i,
        replace: () => "Добавление аутентификации пользователей на сайт Netlify с помощью @netlify/identity: регистрация, вход и выход, OAuth (Google/GitHub/GitLab/Bitbucket), проверка getUser() и управление ролями."
    },
    {
        pattern: /^Transforms\s+images\s+on\s+demand\s+via\s+Netlify\s+Image\s+CDN['’]s\s+\/\.netlify\/images\s+endpoint\s+with\s+query\s+parameters.*$/i,
        replace: () => "Трансформация изображений по требованию через эндпоинт /.netlify/images Netlify Image CDN (изменение размера, кадрирование, конвертация в WebP/AVIF/PNG и настройка качества)."
    },
    {
        pattern: /^(?:Build|Сборка),\s*deploy,\s*and\s+secure\s+Model\s+Context\s+Protocol\s+\(MCP\)\s+servers\s+on\s+Netlify.*$/i,
        replace: () => "Создание, развёртывание и защита серверов Model Context Protocol (MCP) на Netlify на базе Netlify Functions и транспорта Streamable HTTP."
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
        // "<action> · Exited with code 1 >" or standalone "· Exited with code 1 >" / "Exited with code 1 >" (must precede generic Ran/Running rules)
        pattern: /^(?:(?:([^·•・].*?)\s*)?([·•・])\s*)?(?:Exited\s+with\s+code|Завершено\s+с\s+кодом)\s+(-?\d+)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const code = match[3];
            const arrow = match[4] ? (' ' + match[4].trim()) : '';
            if (match[1]) {
                let rawCmd = match[1].trim();
                const bullet = match[2] || '·';
                const ranPrefix = rawCmd.match(/^(?:Ran|Запущено:?|Выполнено:?)\s+(.+)$/i);
                if (ranPrefix) {
                    const inner = ranPrefix[1].trim();
                    const locInner = translationDictionary[inner.toLowerCase()] || localizeActionTarget(inner, true) || inner;
                    return `Выполнено: ${lowercaseFirstCyrillic(locInner)} ${bullet} Завершено с кодом ${code}${arrow}`;
                }
                const runPrefix = rawCmd.match(/^(?:Running|Выполняется:?)\s+(.+)$/i);
                if (runPrefix) {
                    const inner = runPrefix[1].trim();
                    const locInner = translationDictionary[inner.toLowerCase()] || localizeActionTarget(inner, true) || inner;
                    return `Выполняется: ${lowercaseFirstCyrillic(locInner)} ${bullet} Завершено с кодом ${code}${arrow}`;
                }
                const lowerCmd = rawCmd.toLowerCase();
                const locCmd = translationDictionary[lowerCmd] || localizeActionTarget(rawCmd, true) || rawCmd;
                return `${locCmd} ${bullet} Завершено с кодом ${code}${arrow}`;
            }
            const leadingBullet = match[2] ? (match[2] + ' ') : '';
            return `${leadingBullet}Завершено с кодом ${code}${arrow}`;
        }
    },
    {
        // "Ran commands >" / "Ran commands ˅"
        pattern: /^Ran\s+commands(\s*[^a-zA-Z0-9\s]+)?$/i,
        replace: (match) => "Выполнены команды" + (match[1] ? (" " + match[1].trim()) : "")
    },
    {
        // "Ran <command>" / "Запущено <command>" / "Выполнено: <command>"
        pattern: /^(?:Ran|Запущено:?|Выполнено:?)\s+(.+?)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
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
            const locCmd = localizeActionTarget(cmd, true);
            if (!/^Ran\b/i.test(match[0]) && locCmd === cmd) {
                return match[0];
            }
            return `Выполнено: ${lowercaseFirstCyrillic(locCmd)}${arrow}`;
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
        // "Search tabs, files, extensions, subagents, artifacts, commands..." / "... tasks..."
        pattern: /^(?:Search|Поиск)\s+tabs,\s*files,\s*extensions,\s*(?:subagents,\s*)?artifacts,\s*(tasks|commands)(\s*(?:\.{3}|…))?$/i,
        replace: (match) => {
            const hasSubagents = /subagents/i.test(match[0]);
            const lastWord = /^commands$/i.test(match[1]) ? "команд" : "задач";
            const dots = match[2] || "";
            return `Поиск вкладок, файлов, расширений, ${hasSubagents ? "субагентов, " : ""}артефактов, ${lastWord}${dots}`;
        }
    },
    {
        // "Full View"
        pattern: /^Full\s+View$/i,
        replace: () => "Полный вид"
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
        // "Running <target>" / "Выполняется: <target>" / "Run <target>"
        pattern: /^(?:Running|Выполняется:?|Run)\s+(.+?)(\s+(?:[—–-]\s+.*|(?:finished|завершено).*)|\s+([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const isProgressive = /^(?:Running|Выполняется)/i.test(match[0]);
            const isAlreadyRuPrefix = /^Выполняется/i.test(match[0]);
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
            if (isProgressive) {
                if (/^[а-яё]/i.test(cmd) && !/[a-zA-Z]/.test(cmd)) {
                    return `Выполняется: ${lowercaseFirstCyrillic(cmd)}${trailing}`;
                }
                const locCmd = localizeActionTarget(cmd, true);
                if (locCmd !== cmd) {
                    return `Выполняется: ${lowercaseFirstCyrillic(locCmd)}${trailing}`;
                }
                if (isAlreadyRuPrefix) return match[0];
                if (/[.,;!?]$/.test(cmd) && cmd.split(/\s+/).length > 5) {
                    return match[0];
                }
                return `Выполняется: ${cmd}${trailing}`;
            }
            if (/^(?:Check|Checking|Проверка)\s+(.+)$/i.test(cmd)) {
                const sub = cmd.match(/^(?:Check|Checking|Проверка)\s+(.+)$/i)[1];
                return `Проверка ${localizeActionTarget(sub, false)}${trailing}`;
            }
            const locCmd = localizeActionTarget(cmd, false);
            if (locCmd !== cmd && /^[а-яё]/i.test(locCmd)) {
                if (/^(?:Запуск|Выполнение|Повторный запуск)\b/i.test(locCmd)) {
                    return `${uppercaseFirstCyrillic(locCmd)}${trailing}`;
                }
                return `Запуск ${lowercaseFirstCyrillic(locCmd)}${trailing}`;
            }
            if (locCmd === cmd && (isLikelyEnglishProseTarget(cmd) || cmd.split(/\s+/).length >= 3 || /\b(?:a|an|the|my|your|our|their|its|this|that)\b/i.test(cmd)) && !trailing) {
                return match[0];
            }
            return `Запуск ${locCmd}${trailing}`;
        }
    },
    {
        pattern: /^Start\s+Best-of-(\d+)$/i,
        replace: (match) => `Запустить Best-of-${match[1]}`
    },
    {
        pattern: /^Workspace:\s+(.+)$/i,
        replace: (match) => `Рабочая область: ${match[1].trim()}`
    },
    {
        pattern: /^Couldn't\s+connect\s+to\s+the\s+SSH\s+host\.\s*Check\s+its\s+name,\s*your\s+network\s+and\s+ssh\s+config\s*\(e\.g\.\s*a\s+ProxyCommand\),\s*and\s+that\s+ssh\s+to\s+it\s+works\s+in\s+a\s+terminal(\s+without\s+a\s+prompt)?\.?$/i,
        replace: (match) => `Не удалось подключиться к SSH-хосту. Проверьте его адрес, подключение к сети и конфигурацию ssh (например, ProxyCommand), а также убедитесь, что подключение через ssh работает в терминале${match[1] ? ' без интерактивного ввода' : ''}.`
    },
    {
        pattern: /^The\s+Antigravity\s+server\s+failed\s+to\s+start\s+on\s+the\s+SSH\s+host\.\s*See\s+its\s+log\s+in\s+(.+?)\s+on\s+that\s+host\.?$/i,
        replace: (match) => `Не удалось запустить сервер Antigravity на SSH-хосте. Проверьте журнал в каталоге ${match[1].trim()} на удалённом хосте.`
    },
    {
        pattern: /^Couldn't\s+connect\s+to\s+the\s+SSH\s+host\s+\((.+?)\)\.?$/i,
        replace: (match) => `Не удалось подключиться к SSH-хосту (${match[1].trim()}).`
    },
    {
        pattern: /^Introducing\s+(Gemini\s+[A-Za-z0-9.\s-]+)$/i,
        replace: (match) => `Знакомьтесь: ${match[1].trim()}`
    },
    {
        pattern: /^([A-Za-z0-9.+-]+)\s+that\s+may\s+offload\s+routine\s+steps\s+to\s+([A-Za-z0-9.+-]+)\.\s*Same\s+([A-Za-z0-9.+-]+)-level\s+quality,\s*fewer\s+tokens\s+used\.?$/i,
        replace: (match) => `${match[1]} с автоматической передачей рутинных шагов модели ${match[2]}. Качество уровня ${match[3]} при меньшем расходе токенов.`
    },
    {
        pattern: /^([A-Za-z0-9._\-\s]+?)\s+will\s+be\s+removed\s+from\s+Antigravity\s+on\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\.?$/i,
        replace: (match) => {
            const months = {
                january: 'января', february: 'февраля', march: 'марта', april: 'апреля',
                may: 'мая', june: 'июня', july: 'июля', august: 'августа',
                september: 'сентября', october: 'октября', november: 'ноября', december: 'декабря'
            };
            const mRu = months[match[2].toLowerCase()] || match[2];
            return `Модель ${match[1].trim()} будет удалена из Antigravity ${match[3]} ${mRu} ${match[4]} года.`;
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
        pattern: /^View\s+Diff\s+for\s+(.+)$/i,
        replace: (m) => `Показать различия для ${m[1]}`
    },
    {
        // "View / Viewing <target> >" / "View / Viewing <target>"
        pattern: /^(?:View|Viewing)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const suffix = match[2] ? match[2] : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !suffix && !hasChevron) return match[0];
            return `Просмотр ${localized}${suffix}${arrow}`;
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
        pattern: /^Ask\s+a\s+quick\s+question\s+(?:on\s+the\s+side\s+)?without\s+interrupting\s+the\s+main\s+conversation\.?$/i,
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
        pattern: /^(?:Test|Тест:)\s+(.+?)(\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]))?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            let target = match[1].trim();
            if (/^Thinking\s+for\s+(\d+)\s*([smhd])$/i.test(target)) {
                target = target.replace(/^Thinking\s+for\s+(\d+)\s*([smhd])$/i, (m, c, u) => {
                    const units = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                    return `размышления на ${c} ${units[u.toLowerCase()] || u}`;
                });
                return `Тест ${target}${arrow}`;
            }
            const cmdSum = translateEnglishCommandSummary('Test ' + target, hasChevron || /^Тест:/i.test(match[0]));
            if (cmdSum) return `${cmdSum}${arrow}`;
            if (isLikelyEnglishProseTarget(target) && !hasChevron) return match[0];
            return `Тест: ${target}${arrow}`;
        }
    },
    {
        // "Verify <target> >"
        pattern: /^(?:Verify|Verifying)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Проверка ${localized}${arrow}`;
        }
    },
    {
        // "Approve <target> >" / "Approve <target>"
        pattern: /^(?:Approve|Approving)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Утверждение ${localized}${arrow}`;
        }
    },
    {
        // "Approved <target> >" / "Approved <target>"
        pattern: /^Approved\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Утверждено ${localized}${arrow}`;
        }
    },
    {
        // "Execute <target> >" / "Execute <target>"
        pattern: /^(?:Execute|Executing)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Выполнение ${localized}${arrow}`;
        }
    },
    {
        // "Executed <target> >" / "Executed <target>"
        pattern: /^Executed\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Выполнено ${localized}${arrow}`;
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
        // "Checked task <task>", "Killed task <task>", "Stopped task <task>", or half-translated "Задача остановлена <task>"
        pattern: /^(?:(Checked|Checking|Killed|Killing|Stopped|Stopping)\s+task|(Задача\s+остановлена|Завершена\s+задача|Остановка\s+задачи|Задача\s+проверена|Проверена\s+задача|Проверка\s+задачи):?)(?:\s+(.+?))?(\s*[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?$/i,
        replace: (match) => {
            const arrow = match[4] ? (' ' + match[4].trim()) : '';
            let action = 'Задача остановлена';
            if (match[1]) {
                const v = match[1].toLowerCase();
                if (v === 'checked') action = 'Задача проверена';
                else if (v === 'checking') action = 'Проверка задачи';
                else if (v === 'killing' || v === 'stopping') action = 'Остановка задачи';
                else action = 'Задача остановлена';
            } else if (match[2]) {
                action = match[2].replace(/:$/, '').trim();
            }
            if (match[3]) {
                const rawTask = match[3].trim();
                const locTask = localizeActionTarget(rawTask, true);
                if (match[2] && locTask === rawTask) return match[0];
                return `${action}: ${lowercaseFirstCyrillic(locTask)}${arrow}`;
            }
            return action + arrow;
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Проверка ${localized}${arrow}`;
        }
    },
    {
        // "Extract / Extracting <target> >"
        pattern: /^(?:Extract|Extracting)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Извлечение ${localized}${arrow}`;
        }
    },
    {
        // "Read / Reading <target> >"
        pattern: /^(?:Read|Reading)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Чтение ${localized}${arrow}`;
        }
    },
    {
        // "List / Listing <target> >"
        pattern: /^(?:List|Listing)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Список ${localized}${arrow}`;
        }
    },
    {
        // "Test / Testing <target> >"
        pattern: /^(?:Test|Testing)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            let target = match[1].trim();
            if (/^Thinking\s+for\s+(\d+)\s*([smhd])$/i.test(target)) {
                target = target.replace(/^Thinking\s+for\s+(\d+)\s*([smhd])$/i, (m, c, u) => {
                    const units = { s: 'сек', m: 'мин', h: 'ч', d: 'дн' };
                    return `размышления на ${c} ${units[u.toLowerCase()] || u}`;
                });
                return `Тест ${target}${arrow}`;
            }
            const localized = localizeActionTarget(target);
            if (localized === target && isLikelyEnglishProseTarget(target) && !hasChevron) return match[0];
            return `Тестирование ${localized}${arrow}`;
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) {
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !suffix && !hasChevron) {
                return match[0];
            }
            return `Обновление ${localized}${suffix}${arrow}`;
        }
    },
    {
        // "Updated <target> >"
        pattern: /^Updated(?:\s+(.+?))?(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const suffix = match[2] ? match[2] : '';
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            if (match[1]) {
                const loc = localizeActionTarget(match[1]);
                if (loc === match[1] && isLikelyEnglishProseTarget(match[1]) && !suffix && !hasChevron) return match[0];
                return `Обновлено ${loc}${suffix}${arrow}`;
            }
            return `Обновлено${suffix}${arrow}`;
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Откат ${localized}${arrow}`;
        }
    },
    {
        // "Download / Downloading <target> >"
        pattern: /^(?:Download|Downloading)\s+(.+?)(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[2] ? (' ' + match[2].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
            return `Загрузка ${localized}${arrow}`;
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            if (isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !hasChevron) return match[0];
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
            const suffix = match[5] ? match[5] : '';
            const arrow = match[6] ? (' ' + match[6].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const t1 = localizeActionTarget(match[2]);
            const t2 = localizeActionTarget(match[4]);
            if (!suffix && !hasChevron && ((t1 === match[2] && isLikelyEnglishProseTarget(match[2])) || (t2 === match[4] && isLikelyEnglishProseTarget(match[4])))) {
                return match[0];
            }
            const v1 = verb1Map[match[1].toLowerCase()] || match[1];
            const v2 = verb2Map[match[3].toLowerCase()] || match[3];
            return `${v1} ${t1} и ${v2} ${t2}${suffix}${arrow}`;
        }
    },
    {
        // "Build / Building <target> >"
        pattern: /^(?:Build|Building)\s+(.+?)(\s*(?:—|–|-)\s*завершено|\s+finished)?(\s*([↺↻⟳⟲]|\.\.\.|\u2026)?\s*([>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»])?)?$/i,
        replace: (match) => {
            const arrow = match[3] ? (' ' + match[3].trim()) : '';
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const suffix = match[2] ? match[2] : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !suffix && !hasChevron) {
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
            const hasChevron = /[>˅^v\u02c5\u2304\u25bc\u25be\u2228\ufe40›»]/.test(arrow);
            const suffix = match[2] ? match[2] : '';
            const localized = localizeActionTarget(match[1]);
            if (localized === match[1] && isLikelyEnglishProseTarget(match[1]) && !suffix && !hasChevron) {
                return match[0];
            }
            return `Очистка ${localized}${suffix}${arrow}`;
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
    },

    // === v2.1.33: UI Plugin Swarm (app.js, hive.js, narrator_bootstrap.js), Antigravity 2.31.0 Hub & New Marketplace Plugins ===
    {
        pattern: /^From\s+(@?\S+)$/,
        replace: (m) => `От ${m[1]}`
    },
    {
        pattern: /^To\s+(@?\S+|#[a-z0-9_\-]+)$/i,
        replace: (m) => `Кому: ${m[1]}`
    },
    {
        pattern: /^(#[a-z0-9_\-]+)\s+\(archived\)$/i,
        replace: (m) => `${m[1]} (в архиве)`
    },
    {
        pattern: /^(#[a-z0-9_\-]+)\s+is\s+archived:\s*this\s+addresses\s+nobody\.?$/i,
        replace: (m) => `Канал ${m[1]} в архиве: сообщение никому не адресовано`
    },
    {
        pattern: /^Everyone\s+in\s+(#[a-z0-9_\-]+)$/i,
        replace: (m) => `Все в ${m[1]}`
    },
    {
        pattern: /^Posted\s+in\s+(#[a-z0-9_\-]+);\s*click\s+to\s+show\s+only\s+\1\.?$/i,
        replace: (m) => `Опубликовано в ${m[1]}; нажмите, чтобы показать только ${m[1]}`
    },
    {
        pattern: /^Go\s+to\s+(#\d+)$/i,
        replace: (m) => `Перейти к ${m[1]}`
    },
    {
        pattern: /^Open\s+(@[a-z0-9_\-]+)$/i,
        replace: (m) => `Открыть ${m[1]}`
    },
    {
        pattern: /^(@\S+)\s+ran\s+out\s+of\s+quota\.?$/i,
        replace: (m) => `У ${m[1]} исчерпана квота`
    },
    {
        pattern: /^(@\S+)\s+looks\s+stuck\.?$/i,
        replace: (m) => `${m[1]} похоже завис`
    },
    {
        pattern: /^(@\S+)\s+hit\s+an\s+error\.?$/i,
        replace: (m) => `У ${m[1]} произошла ошибка`
    },
    {
        pattern: /^(\d+)\s+of\s+(\d+)\s+tasks\s+done$/i,
        replace: (m) => `Выполнено задач: ${m[1]} из ${m[2]}`
    },
    {
        pattern: /^(\d+\s*(?:\/\s*\d+|%))\s+done$/i,
        replace: (m) => `${m[1]} готово`
    },
    {
        pattern: /^(\d+)\s+needs?\s+you$/i,
        replace: (m) => `${m[1]} ${pluralizeRuCount(parseInt(m[1], 10), 'ждёт вас', 'ждут вас', 'ждут вас')}`
    },
    {
        pattern: /^(\d+)\s+threads?\s+open$/i,
        replace: (m) => `${m[1]} ${pluralizeRuCount(parseInt(m[1], 10), 'активный тред', 'активных треда', 'активных тредов')}`
    },
    {
        pattern: /^(\d+)\s+active$/i,
        replace: (m) => `${m[1]} ${pluralizeRuCount(parseInt(m[1], 10), 'активен', 'активны', 'активно')}`
    },
    {
        pattern: /^Up\s+next\s*([·•])\s*(\d+)$/i,
        replace: (m) => `Далее ${m[1]} ${m[2]}`
    },
    {
        pattern: /^\+(\d+)\s+more$/i,
        replace: (m) => `ещё +${m[1]}`
    },
    {
        pattern: /^last\s+seen\s+(\d+)\s*(s|m|h|d)\s+ago$/i,
        replace: (m) => {
            const u = { s: 'сек', m: 'мин', h: 'ч', d: 'дн.' }[m[2].toLowerCase()] || m[2];
            return `был(а) в сети ${m[1]} ${u} назад`;
        }
    },
    {
        pattern: /^Runs\s+on\s+(.+)$/i,
        replace: (m) => `Выполняется на ${m[1]}`
    },
    {
        pattern: /^(.+?)\s+runs\s+on\s+(.+?);\s*open\s+it\s+there\.?$/i,
        replace: (m) => `${m[1]} выполняется на ${m[2]} — откройте его там.`
    },
    {
        pattern: /^Remote\s*([·•])\s*(.+)$/i,
        replace: (m) => {
            let tail = m[2].trim()
                .replace(/^(\d+)\s+machines?$/i, (_, c) => `${c} ${pluralizeRuCount(parseInt(c, 10), 'машина', 'машины', 'машин')}`)
                .replace(/\breconnecting\b/gi, 'переподключение')
                .replace(/\bconnecting\b/gi, 'подключение')
                .replace(/\bunavailable\b/gi, 'недоступно');
            return `Удалённо ${m[1]} ${tail}`;
        }
    },
    {
        pattern: /^read\s+#(\d+)\s*([·•])\s*updated\s+(.+?)\s+ago$/i,
        replace: (m) => {
            const dur = m[3].replace(/(\d+)\s*(s|m|h|d)\b/gi, (_, c, u) => `${c} ${{ s: 'сек', m: 'мин', h: 'ч', d: 'дн.' }[u.toLowerCase()] || u}`);
            return `прочитано #${m[1]} ${m[2]} обновлено ${dur} назад`;
        }
    },
    {
        pattern: /^The\s+narrator['’]s\s+last\s+step\s+failed:\s*(.+)$/i,
        replace: (m) => `Последний шаг рассказчика завершился ошибкой: ${m[1]}`
    },
    {
        pattern: /^the\s+narrator['’]s\s+view\s+failed\s*\((.+)\)$/i,
        replace: (m) => `сбой обзора рассказчика (${m[1]})`
    },
    {
        pattern: /^Last\s+change:\s*[“"](.+)[”"]$/i,
        replace: (m) => `Последнее изменение: «${m[1]}»`
    },
    {
        pattern: /^Copied\s+[“"](.+?)[”"]\.\s*Paste\s+it\s+into\s+the\s+chat\s+to\s+send\.?$/i,
        replace: (m) => `Скопировано «${m[1]}». Вставьте в чат для отправки.`
    },
    {
        pattern: /^Type\s+[“"](.+?)[”"]\s+in\s+the\s+chat\.?$/i,
        replace: (m) => `Введите «${m[1]}» в чате.`
    },
    {
        pattern: /^Tell\s+the\s+coordinator:\s*[“"](.+?)[”"]$/i,
        replace: (m) => `Сообщите координатору: «${m[1]}»`
    },
    {
        pattern: /^(\d+)\s+posts?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'сообщение', 'сообщения', 'сообщений')}`;
        }
    },

    // --- Hub 2.31.0 Dynamic Strings ---
    {
        pattern: /^No\s+MCP\s+servers\s+found\s+for\s+["“](.+?)["”]\.?$/i,
        replace: (m) => `MCP-серверы по запросу «${m[1]}» не найдены.`
    },
    {
        pattern: /^There\s+are\s+currently\s+no\s+(.+?)\s+plugins\s+available\.?$/i,
        replace: (m) => `Сейчас нет доступных плагинов в категории «${m[1]}».`
    },
    {
        pattern: /^Show\s+(\d+)\s+earlier\s+steps?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `Показать ${c} ${pluralizeRuCount(c, 'предыдущий шаг', 'предыдущих шага', 'предыдущих шагов')}`;
        }
    },
    {
        pattern: /^(\d+)\s+comments?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'комментарий', 'комментария', 'комментариев')}`;
        }
    },
    {
        pattern: /^Couldn['’]t\s+start\s+the\s+coordinator:\s*(.+)$/i,
        replace: (m) => `Не удалось запустить координатора: ${m[1]}`
    },
    {
        pattern: /^Could\s+not\s+load\s+the\s+app\s+view:\s*(.+)$/i,
        replace: (m) => `Не удалось загрузить представление приложения: ${m[1]}`
    },

    // --- Builtin Swarm Skills (Full & Truncated) ---
    {
        pattern: /^\(Preview\s*&\s*Quota\s+Heavy\)\s*(?:Run|Запуск)\s+a\s+swarm:.*$/i,
        replace: () => "(Превью · высокий расход квоты) Запуск роя: несколько агентов работают параллельно над одной задачей, каждый в своём диалоге, взаимодействуя через общую доску сообщений. Используйте, когда задачу можно разделить на параллельные части или требуется взаимная проверка."
    },
    {
        pattern: /^ONLY\s+for\s+the\s+native-swarm\s+worker\s+whose\s+brief\s+says\s+it\s+is\s+the\s+monitor\..*$/i,
        replace: () => "ТОЛЬКО для участника роя с ролью монитора (monitor). По таймеру проверяет, не завис ли рой, и будит участника, способного разблокировать работу. Координаторам и обычным исполнителям не загружать."
    },
    {
        pattern: /^ONLY\s+for\s+the\s+native-swarm\s+worker\s+whose\s+brief\s+says\s+it\s+is\s+the\s+narrator\..*$/i,
        replace: () => "ТОЛЬКО для участника роя с ролью рассказчика (narrator). Следит за доской сообщений и поддерживает актуальность данных обзора пользователя (view.json). Координаторам и обычным исполнителям не загружать."
    },

    // --- Spacefast Plugin, Prompts (with Franken-Rulish healing) & 11 Commands ---
    {
        pattern: /^Turn\s+an\s+idea\s+into\s+a\s+website,\s*dashboard,\s*report,\s*or\s+small\s+web\s+tool\s+you\s+can\s+share\..*Spacefast\.?$/i,
        replace: () => "Превратите идею в веб-сайт, дашборд, отчёт или удобный веб-инструмент, которым можно поделиться. Создайте его прямо в диалоге или загрузите готовый проект и опубликуйте через Spacefast."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+website\s+for\s+my\s+project\s+(?:and\s+publish|и\s+публикация)\s+it\s+on\s+Spacefast\.?$/i,
        replace: () => "Создай веб-сайт для моего проекта и опубликуй его на Spacefast."
    },
    {
        pattern: /^Publish\s+this\s+dashboard\s+and\s+give\s+me\s+a\s+link\s+to\s+share\.?$/i,
        replace: () => "Опубликуй этот дашборд и дай мне ссылку для отправки."
    },
    {
        pattern: /^(?:Update|Обновление)\s+the\s+content\s+and\s+design\s+of\s+my\s+existing\s+Spacefast\s+site\.?$/i,
        replace: () => "Обнови контент и дизайн моего существующего сайта на Spacefast."
    },
    {
        pattern: /^Apply\s+a\s+Spacefast\s+team['’]s\s+saved\s+design\s+system\s+to\s+a\s+new\s+build.*$/i,
        replace: () => "Применение сохранённой дизайн-системы команды Spacefast к новой сборке или явно запрошенной правке исходного кода."
    },
    {
        pattern: /^(?:Create|Создать|Создано)\s+and\s+publish\s+a\s+new\s+Spacefast\s+website\s+from\s+a\s+brief.*$/i,
        replace: () => "Создание и публикация нового сайта на Spacefast по описанию задачи: лендинга, портфолио, отчёта или дашборда."
    },
    {
        pattern: /^Find,\s*check,\s*and\s+register\s+domains\s+through\s+Spacefast\s+forms.*$/i,
        replace: () => "Поиск, проверка и регистрация доменов через формы Spacefast, а также подключение собственного домена пользователя к Space."
    },
    {
        pattern: /^Change\s+the\s+content,\s*design,\s*or\s+source\s+files\s+of\s+an\s+existing\s+Spacefast\s+Space.*$/i,
        replace: () => "Изменение контента, дизайна или исходных файлов существующего пространства Spacefast и применение замечаний визуального ревью."
    },
    {
        pattern: /^Diagnose\s+a\s+failed\s+Spacefast\s+build,\s*publish,\s*or\s+live\s+page.*$/i,
        replace: () => "Диагностика сбоя сборки, публикации или рабочей страницы Spacefast, исправление по логам или откат к рабочей версии."
    },
    {
        pattern: /^Save\s+branding,\s*design\s+tokens,\s*component\s+standards,\s*writing\s+guidelines,\s*and\s+asset\s+references.*$/i,
        replace: () => "Сохранение брендинга, дизайн-токенов, стандартов компонентов, редполитики и ссылок на ресурсы в дизайн-систему команды Spacefast."
    },
    {
        pattern: /^(?:Check|Проверка)\s+the\s+Spacefast\s+connection\s+and\s+continue\s+the\s+user['’]s\s+task.*$/i,
        replace: () => "Проверка подключения к Spacefast и продолжение задачи пользователя."
    },
    {
        pattern: /^Change\s+who\s+can\s+access\s+a\s+Spacefast\s+Space\s+or\s+path.*$/i,
        replace: () => "Настройка прав доступа к пространству или пути Spacefast: публичный доступ, приватный режим или приглашение отдельных пользователей."
    },
    {
        pattern: /^Publish\s+an\s+existing\s+website,\s*app,\s*report,\s*or\s+other\s+artifact\s+to\s+Spacefast.*$/i,
        replace: () => "Публикация готового веб-сайта, приложения, отчёта или другого артефакта в Spacefast с проверкой рабочей ссылки и управлением пространством."
    },
    {
        pattern: /^Bring\s+a\s+named\s+existing\s+Spacefast\s+Space\s+or\s+linked\s+project\s+into\s+alignment.*$/i,
        replace: () => "Приведение существующего пространства Spacefast или связанного проекта в соответствие с актуальной сохранённой дизайн-системой команды."
    },
    {
        pattern: /^(?:Verify|Проверка)\s+a\s+Spacefast\s+source\s+build\s+or\s+preview\s+against\s+its\s+saved\s+team\s+design\s+system.*$/i,
        replace: () => "Проверка исходной сборки или превью Spacefast на соответствие сохранённой дизайн-системе команды, включая визуальный и структурный контроль."
    },

    // --- Elephant-Goldfish Model (EGM) & 7 Skills ---
    {
        pattern: /^Develop\s+an\s+idea,\s*improve\s+a\s+plan,\s*or\s+review\s+a\s+document\s+with\s+independent\s+AI\s+reviewers\..*$/i,
        replace: () => "Развивайте идеи, улучшайте планы и проверяйте документы с помощью независимых ИИ-рецензентов. Рецензенты начинают без истории предыдущего диалога, чтобы выявлять пропущенный контекст, неясную аргументацию и скрытые допущения. Используйте плагин для проверки предложений, проектных планов, дизайн-документов и соответствия кода архитектуре."
    },
    {
        pattern: /^Bootstrap\s+directory\s+README\.md\s+files\s+across\s+a\s+repository\s+subtree.*$/i,
        replace: () => "Автоматическое создание файлов README.md по поддереву каталогов репозитория."
    },
    {
        pattern: /^Interactive\s+ideation\s+and\s+brainstorming\s+skill\s+for\s+the\s+Elephant\s*&\s*Goldfish\s+Model.*$/i,
        replace: () => "Интерактивный мозговой штурм и проработка идей по модели Elephant & Goldfish (EGM): превращает сырые концепции в структурированные гипотезы и итоговый RFC для ревью или подготовки дизайн-документа с egm-draft."
    },
    {
        pattern: /^Drafts\s+a\s+design\s+document\s+section-by-section\s+using\s+the\s+concepts\s+brief\s+from\s+egm-brainstorm.*$/i,
        replace: () => "Поэтапное написание дизайн-документа по разделам на основе концепции из egm-brainstorm или заметок пользователя (второй шаг процесса EGM)."
    },
    {
        pattern: /^Runs\s+drift\s+detection\s+on\s+all\s+design\s+documents\s+to\s+check\s+for\s+document\s+and\s+code\s+consistency.*$/i,
        replace: () => "Проверка расхождений (drift detection) между всеми дизайн-документами/README и реальным кодом с формированием подробного отчёта о различиях."
    },
    {
        pattern: /^The\s+Elephant\s+resolution\s+skill\.\s*Ingests\s+flat\s+deficiency\s+reports\s+from\s+concurrent\s+Goldfish\s+reviewers.*$/i,
        replace: () => "Навык разрешения замечаний Elephant: собирает отчёты независимых рецензентов Goldfish, применяет одобренные исправления через интерактивный выбор и проводит контрольные точки синхронизации."
    },
    {
        pattern: /^Orchestrates\s+the\s+EGM\s+Goldfish\s+Review\s+Protocol\..*$/i,
        replace: () => "Оркестрация протокола ревью EGM Goldfish по пяти фазам: первичный обзор, проверка понимания, критика архитектуры, промежуточный обзор и готовность к реализации."
    },
    {
        pattern: /^Executes\s+the\s+Antagonistic-Review\s+process\s+from\s+the\s+Elephant-Goldfish\s+Model.*$/i,
        replace: () => "Запуск многоагентного цикла критического ревью (Antagonistic-Review) по модели EGM для аудита дизайн-документов, README, спецификаций и планов реализации с автоматическим внесением одобренных правок."
    },

    // --- Arize AX & 18 Skills ---
    {
        pattern: /^Query\s+Arize\s+AX\s+projects,\s*traces,\s*datasets,\s*and\s+experiments\s+from\s+Antigravity.*$/i,
        replace: () => "Запрашивайте проекты, трейсы, датасеты и эксперименты Arize AX из Antigravity с навыками для трассировки, оценок (evals) и оптимизации промптов."
    },
    {
        pattern: /^(?:List|Список)\s+my\s+Arize\s+projects\s+and\s+show\s+recent\s+traces\s+with\s+errors\.?$/i,
        replace: () => "Выведи список моих проектов Arize и покажи последние трейсы с ошибками"
    },
    {
        pattern: /^Manages\s+Arize\s+users,\s*organizations,\s*spaces,\s*projects,\s*roles,\s*role\s+bindings.*$/i,
        replace: () => "Управление пользователями, организациями, пространствами, проектами, ролями, привязками ролей, ограничениями доступа и API-ключами Arize через CLI `ax`."
    },
    {
        pattern: /^Creates,\s*reads,\s*updates,\s*and\s+deletes\s+Arize\s+AI\s+integrations\s+that\s+store\s+LLM\s+provider\s+credentials.*$/i,
        replace: () => "Создание, чтение, обновление и удаление ИИ-интеграций Arize для хранения ключей LLM-провайдеров (OpenAI, Anthropic, Gemini, Vertex AI, Bedrock и др.)."
    },
    {
        pattern: /^Creates\s+and\s+manages\s+annotation\s+configs\s*\(categorical,\s*continuous,\s*freeform\s+label\s+schemas\).*$/i,
        replace: () => "Создание и управление конфигурациями разметки и очередями ручной проверки (human review) в Arize, а также разметка спанов через Python SDK."
    },
    {
        pattern: /^INVOKE\s+THIS\s+SKILL\s+when\s+auditing\s+an\s+AI\s+agent\s+or\s+LLM\s+app\s+for\s+regulatory\s+compliance.*$/i,
        replace: () => "Аудит ИИ-агента или LLM-приложения на соответствие регуляторным стандартам (EU AI Act, GDPR, NIST AI RMF, HIPAA, ISO 42001) с проверкой полноты аудиторского следа в Arize."
    },
    {
        pattern: /^Creates,\s*manages,\s*and\s+queries\s+Arize\s+datasets\s+and\s+examples.*$/i,
        replace: () => "Создание, управление, экспорт и пополнение датасетов и тестовых примеров в Arize через CLI `ax`."
    },
    {
        pattern: /^Handles\s+LLM-as-judge\s+and\s+code\s+evaluator\s+workflows\s+on\s+Arize.*$/i,
        replace: () => "Управление оценщиками (LLM-as-judge и кодовыми эвалюаторами) в Arize: создание, запуск оценок по спанам и экспериментам, маппинг колонок и непрерывный мониторинг."
    },
    {
        pattern: /^Creates,\s*runs,\s*and\s+analyzes\s+Arize\s+experiments\s+for\s+evaluating\s+and\s+comparing\s+model\s+performance.*$/i,
        replace: () => "Создание, запуск и сравнение экспериментов в Arize для оценки качества и сопоставления моделей с помощью CLI `ax`."
    },
    {
        pattern: /^Adds\s+Arize\s+AX\s+tracing\s+to\s+an\s+LLM\s+application\s+for\s+the\s+first\s+time.*$/i,
        replace: () => "Первичное подключение трассировки Arize AX (OpenTelemetry / OpenInference) к LLM-приложению с автоопределением стека и проверкой поступления трейсов."
    },
    {
        pattern: /^Audits\s+instrumentation\s+health\s+of\s+existing\s+Arize\s+traces.*$/i,
        replace: () => "Аудит корректности инструментации существующих трейсов Arize: поиск потерянных или дублирующихся спанов, пустого ввода-вывода и отсутствующих счётчиков токенов."
    },
    {
        pattern: /^Generates\s+deep\s+links\s+to\s+the\s+Arize\s+UI\s+for\s+projects,\s*traces,\s*spans.*$/i,
        replace: () => "Генерация прямых ссылок в интерфейс Arize UI на проекты, трейсы, спаны, сессии, датасеты, эксперименты и оценщики."
    },
    {
        pattern: /^Migrates\s+LLM\s+observability\s+from\s+Braintrust\s+into\s+Arize\s+AX.*$/i,
        replace: () => "Миграция данных наблюдаемости LLM из Braintrust в Arize AX: импорт истории трейсов по OTLP, датасетов и промптов."
    },
    {
        pattern: /^Migrates\s+LLM\s+observability\s+from\s+Langfuse\s+into\s+Arize\s+AX.*$/i,
        replace: () => "Миграция данных наблюдаемости LLM из Langfuse в Arize AX: импорт истории трейсов по OTLP, датасетов и промптов с метками."
    },
    {
        pattern: /^Migrates\s+LLM\s+observability\s+from\s+LangSmith\s+into\s+Arize\s+AX.*$/i,
        replace: () => "Миграция данных наблюдаемости LLM из LangSmith в Arize AX: импорт истории запусков по OTLP, датасетов и промптов в Prompt Hub."
    },
    {
        pattern: /^Migrate\s+existing\s+Phoenix\s+\(PX\)\s+traces,\s*datasets,\s*experiments.*$/i,
        replace: () => "Миграция существующих трейсов, датасетов, экспериментов и результатов оценок из Phoenix (PX) в Arize AX с проверкой импортированных записей."
    },
    {
        pattern: /^Optimizes,\s*improves,\s*and\s+debugs\s+LLM\s+prompts\s+using\s+production\s+trace\s+data.*$/i,
        replace: () => "Оптимизация, улучшение и отладка LLM-промптов на основе продакшен-трейсов, оценок и разметки через итеративный цикл CLI `ax`."
    },
    {
        pattern: /^INVOKE\s+THIS\s+SKILL\s+for\s+Arize\s+Prompt\s+Hub\s+and\s+`?ax\s+prompts`?\s+workflows.*$/i,
        replace: () => "Работа с Arize Prompt Hub и `ax prompts`: создание и импорт шаблонов промптов, управление метками (production/staging), версиями и переменными."
    },
    {
        pattern: /^Use\s+when\s+one\s+Python\s+service\s+must\s+send\s+each\s+agent['’]s,\s*tenant['’]s,\s*team['’]s,\s*or\s+request['’]s\s+spans.*$/i,
        replace: () => "Динамическая маршрутизация спанов OpenTelemetry в Python-сервисах по нужным пространствам и проектам Arize для мультитенантных систем."
    },
    {
        pattern: /^Downloads,\s*exports,\s*and\s+inspects\s+existing\s+Arize\s+traces\s+and\s+spans.*$/i,
        replace: () => "Выгрузка, экспорт и инспекция трейсов, спанов и сессий Arize по ID для анализа работы LLM-приложения и поиска причин сбоев."
    },

    // --- CodeRabbit & 5 Skills ---
    {
        pattern: /^AI-powered\s+code\s+review,\s*review-comment\s+autofix,\s*and\s+repository\s+configuration,\s+powered\s+by\s+CodeRabbit\.?$/i,
        replace: () => "ИИ-ревью кода, автоисправление замечаний и настройка репозитория на базе CodeRabbit."
    },
    {
        pattern: /^Use\s+when\s+the\s+user\s+asks\s+for\s+code\s+review,\s*PR\s+feedback,\s*or\s+an\s+authorized\s+fix\s+and\s+review\s+cycle\s+with\s+CodeRabbit.*$/i,
        replace: () => "Проведение ревью кода, разбор замечаний в PR и цикл исправлений с проверкой через подключённый MCP и CLI CodeRabbit."
    },
    {
        pattern: /^Use\s+when\s+setting\s+up\s+CodeRabbit,\s*connecting\s+the\s+plugin,\s*tailoring\s+repository\s+review\s+settings.*$/i,
        replace: () => "Настройка плагина CodeRabbit, подключение через браузерный вход MCP, конфигурация правил ревью репозитория и восстановление сессии."
    },
    {
        pattern: /^Safely\s+review\s+and\s+apply\s+CodeRabbit\s+PR\s+review-thread\s+feedback\s+from\s+GitHub.*$/i,
        replace: () => "Безопасный разбор и применение замечаний CodeRabbit из веток ревью PR на GitHub с подтверждением каждого изменения."
    },
    {
        pattern: /^(?:Run|Запуск)\s+CodeRabbit\s+CLI\s+reviews,\s*retrieve\s+saved\s+local\s+or\s+GitHub\s+PR\s+fix\s+prompts.*$/i,
        replace: () => "Запуск ревью через CodeRabbit CLI, получение промптов для исправления локальных изменений или PR на GitHub и интерпретация результатов проверки."
    },
    {
        pattern: /^(?:Create|Создать|Создано),\s*update,\s*or\s+validate\s+CodeRabbit\s+repository\s+configuration\s+through\s+the\s+official\s+CLI.*$/i,
        replace: () => "Создание, обновление и валидация конфигурации репозитория CodeRabbit (`.coderabbit.yaml`) через официальный CLI."
    },

    // --- Modern Web Guidance & VirusTotal ---
    {
        pattern: /^Keep\s+your\s+coding\s+agent\s+up\s+to\s+date\s+with\s+the\s+latest\s+web\s+best\s+practices\.?$/i,
        replace: () => "Держите вашего кодинг-агента в курсе актуальных практик современной веб-разработки."
    },
    {
        pattern: /^(?:Build|Сборка)\s+a\s+Chrome\s+Extension\s+with\s+a\s+side\s+panel\s+using\s+Manifest\s+V3\s+best\s+practices\.?$/i,
        replace: () => "Создай расширение Chrome с боковой панелью по лучшим практикам Manifest V3"
    },
    {
        pattern: /^Investigate\s+files,\s*URLs,\s*domains\s+and\s+IP\s+addresses\s+with\s+VirusTotal.*$/i,
        replace: () => "Исследуйте файлы, URL-адреса, домены и IP-адреса с помощью аналитики угроз и отчётов VirusTotal."
    },
    {
        pattern: /^(?:Check|Проверка)\s+a\s+file\s+I\s+downloaded\s+before\s+I\s+run\s+it\..*VirusTotal.*$/i,
        replace: () => "Проверь скачанный мной файл перед запуском: спроси локальный путь, вычисли SHA-256 без запуска файла и найди существующий отчёт VirusTotal. Не загружай сам файл."
    },
    {
        pattern: /^Help\s+me\s+assess\s+a\s+suspicious\s+link\..*VirusTotal.*$/i,
        replace: () => "Помоги оценить подозрительную ссылку: сначала объясни, какие данные передаются при проверке URL, затем получи существующий отчёт VirusTotal. Не открывай ссылку и не отправляй её на новый анализ."
    },
    {
        pattern: /^Investigate\s+an\s+IP\s+address\s+from\s+my\s+logs\..*VirusTotal.*$/i,
        replace: () => "Исследуй IP-адрес из моих логов: запроси IP и краткое описание активности, получи существующий отчёт VirusTotal и объясни найденные данные и их ограничения. Не запрашивай новый анализ."
    },
    {
        pattern: /^of\s+(\d+)\s*([·•])\s*#(\d+)\s+at\s+(.+)$/i,
        replace: (m) => `из ${m[1]} ${m[2]} #${m[3]} в ${m[4]}`
    },

    // --- Antigravity 2.31.1 Dynamic Template Literals (Quota, Composer, Trajectory, Modals, Tools & Settings) ---
    {
        pattern: /^Select\s+model\s+with\s+(.+)$/i,
        replace: (m) => `Выбрать модель с помощью ${m[1]}`
    },
    {
        pattern: /^Your\s+plan['’]s\s+baseline\s+quota\s+will\s+refresh\s+on\s+(.+?)\.?$/i,
        replace: (m) => `Базовая квота вашего тарифа обновится ${m[1]}.`
    },
    {
        pattern: /^Your\s+quota\s+for\s+(.+?)\s+has\s+been\s+reached\.\s*Switch\s+to\s+another\s+available\s+model\s+to\s+continue\.?$/i,
        replace: (m) => `Квота для модели ${m[1]} исчерпана. Переключитесь на другую доступную модель для продолжения.`
    },
    {
        pattern: /^Your\s+quota\s+for\s+(.+?)\s+will\s+reset\s+on\s+(.+?)\.\s*Switch\s+to\s+another\s+available\s+model\s+to\s+continue\.?$/i,
        replace: (m) => `Квота для модели ${m[1]} обновится ${m[2]}. Переключитесь на другую доступную модель для продолжения.`
    },
    {
        pattern: /^You\s+need\s+(.+?)\s+AI\s+Credits\s+to\s+send\s+messages\.\s*To\s+continue\s+using\s+(.+?)\s+now,\s*purchase\s+more\s+AI\s+Credits\.?$/i,
        replace: (m) => `Для отправки сообщений требуется ${m[1]} AI-кредитов. Чтобы продолжить использовать ${m[2]} сейчас, приобретите дополнительные AI-кредиты.`
    },
    {
        pattern: /^When\s+toggled\s+on,\s*(.+?)\s+will\s+use\s+your\s+AI\s+credits\s+to\s+fulfill\s+model\s+requests\s+once\s+you['’]re\s+out\s+of\s+model\s+quota\.\s*(.+?)\s+will\s+always\s+use\s+your\s+model\s+quota\s+first\s+before\s+using\s+AI\s+credits\.?$/i,
        replace: (m) => `Когда включено, ${m[1]} будет использовать ваши AI-кредиты для выполнения запросов после исчерпания квоты модели. Сначала всегда расходуется базовая квота модели.`
    },
    {
        pattern: /^When\s+toggled\s+on,\s*(.+?)\s+collects\s+usage\s+data\s+to\s+help\s+Google\s+enhance\s+performance\s+and\s+features\.?$/i,
        replace: (m) => `Когда включено, ${m[1]} собирает данные об использовании, чтобы помочь Google улучшать производительность и функции.`
    },
    {
        pattern: /^(.+?)\s+On\s+empty\s+prompt,\s*sends\s+next\s+in\s+queue$/i,
        replace: (m) => `${m[1]} При пустом поле отправляет следующее сообщение из очереди`
    },
    {
        pattern: /^(.+?)\s+Queues\s+after\s+the\s+turn$/i,
        replace: (m) => `${m[1]} Добавляет в очередь после текущего ответа`
    },
    {
        pattern: /^(.+?)\s+Sends\s+immediately$/i,
        replace: (m) => `${m[1]} Отправляет немедленно`
    },
    {
        pattern: /^Message\s+queued\.\s*(\d+)\s+messages?\s+in\s+queue\.?$/i,
        replace: (m) => `Сообщение в очереди. Сообщений в очереди: ${m[1]}.`
    },
    {
        pattern: /^Send\s+all\s*\((\d+)\)$/i,
        replace: (m) => `Отправить все (${m[1]})`
    },
    {
        pattern: /^Send\s+now:\s*(.+)$/i,
        replace: (m) => `Отправить сейчас: ${m[1]}`
    },
    {
        pattern: /^Cancel\s+Questionnaire\s+and\s+Stop\s+the\s+Agent\s*\((.+)\)$/i,
        replace: (m) => `Отменить опрос и остановить агента (${m[1]})`
    },
    {
        pattern: /^Recording\s+shortcut\s+for\s+(.+?)\.\s*Press\s+keys\s+to\s+bind,\s*Enter\s+to\s+save,\s*Escape\s+to\s+cancel\.?$/i,
        replace: (m) => `Запись сочетания клавиш для «${m[1]}». Нажмите клавиши для назначения, Enter — сохранить, Escape — отмена.`
    },
    {
        pattern: /^Conflicts\s+with\s+"(.+?)"\s*\(press\s+Enter\s+to\s+replace\)$/i,
        replace: (m) => `Конфликтует с «${m[1]}» (нажмите Enter для замены)`
    },
    {
        pattern: /^Conflict:\s*also\s+assigned\s+to\s+(.+)$/i,
        replace: (m) => `Конфликт: также назначено для «${m[1]}»`
    },
    {
        pattern: /^Remove\s+shortcut\s+(.+?)\s+for\s+(.+)$/i,
        replace: (m) => `Удалить сочетание ${m[1]} для «${m[2]}»`
    },
    {
        pattern: /^Shortcut\s+(.+?)\s+for\s+(.+)$/i,
        replace: (m) => `Сочетание ${m[1]} для «${m[2]}»`
    },
    {
        pattern: /^\(Steps\s+(\d+)\s*[\u2013\-]\s*(\d+)\)$/i,
        replace: (m) => `(Шаги ${m[1]}–${m[2]})`
    },
    {
        pattern: /^\(attempt\s+(\d+)\/(\d+)\)$/i,
        replace: (m) => `(попытка ${m[1]}/${m[2]})`
    },
    {
        pattern: /^\(line\s+(\d+)\)$/i,
        replace: (m) => `(строка ${m[1]})`
    },
    {
        pattern: /^Step\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (m) => `Шаг ${m[1]} из ${m[2]}`
    },
    {
        pattern: /^Turns\s+(\d+)\s*[\u2013\-]\s*(\d+)$/i,
        replace: (m) => `Ходы ${m[1]}–${m[2]}`
    },
    {
        pattern: /^Turn:\s*(\d+)\/(\d+)$/i,
        replace: (m) => `Ход: ${m[1]}/${m[2]}`
    },
    {
        pattern: /^(\d+)\s+Files?\s+With\s+Changes$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'файл', 'файла', 'файлов')} с изменениями`;
        }
    },
    {
        pattern: /^(\d+)\s+lines?\s+added,\s*(\d+)\s+lines?\s+removed$/i,
        replace: (m) => `Добавлено строк: ${m[1]}, удалено строк: ${m[2]}`
    },
    {
        pattern: /^(\d+)\s+Help\s*[·•]\s*(\d+)\s+Side\s+Questions?$/i,
        replace: (m) => `Справка: ${m[1]} · Быстрые вопросы: ${m[2]}`
    },
    {
        pattern: /^Side\s+Question:\s*(.+)$/i,
        replace: (m) => `Быстрый вопрос: ${m[1]}`
    },
    {
        pattern: /^Delete\s+side\s+question:\s*(.+)$/i,
        replace: (m) => `Удалить быстрый вопрос: ${m[1]}`
    },
    {
        pattern: /^Edit\s+side\s+question\s+title:\s*(.+)$/i,
        replace: (m) => `Изменить заголовок быстрого вопроса: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+MCP\s+servers?\s+failed\s+to\s+start$/i,
        replace: (m) => `Не удалось запустить MCP-серверов: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+customizations?\s+failed\s+to\s+load$/i,
        replace: (m) => `Не удалось загрузить персонализаций: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+browser\s+steps?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'шаг', 'шага', 'шагов')} в браузере`;
        }
    },
    {
        pattern: /^(\d+)\s+chunks?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'фрагмент', 'фрагмента', 'фрагментов')}`;
        }
    },
    {
        pattern: /^(\d+)\s+models?\s+selected$/i,
        replace: (m) => `Выбрано моделей: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+tools?\s+enabled$/i,
        replace: (m) => `Включено инструментов: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+tools?\s+disabled$/i,
        replace: (m) => `Отключено инструментов: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+tools?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'инструмент', 'инструмента', 'инструментов')}`;
        }
    },
    {
        pattern: /^([·•]\s*)?Thinking\s*\((\d+(?:\.\d+)?)s\)([\u2026.]*)$/i,
        replace: (m) => `${m[1] ? m[1].trim() + ' ' : ''}Размышляет (${m[2]} сек)${m[3] || '…'}`
    },
    {
        pattern: /^([·•]\s*)?Thinking([\u2026.]+)$/i,
        replace: (m) => `${m[1] ? m[1].trim() + ' ' : ''}Размышляет${m[2]}`
    },
    {
        pattern: /^Working\s*[·•]\s*(\d+(?:\.\d+)?)s$/i,
        replace: (m) => `Работает · ${m[1]} сек`
    },
    {
        pattern: /^Using\s+browser\s*\((\d+(?:\.\d+)?)s\)$/i,
        replace: (m) => `Работа в браузере (${m[1]} сек)`
    },
    {
        pattern: /^(?:Using\s+browser|Работа\s+в\s+браузере)\s*[·•]\s*Thinking(?:\s*\((\d+(?:\.\d+)?)s\))?([\u2026.]*)$/i,
        replace: (m) => `Работа в браузере · Размышляет${m[1] ? ` (${m[1]} сек)` : ''}${m[2] || ''}`
    },
    {
        pattern: /^(?:Using\s+browser|Работа\s+в\s+браузере)\s*[·•]\s*(.+?)\s*\((\d+(?:\.\d+)?)s\)([\u2026.]*)$/i,
        replace: (m) => `Работа в браузере · ${translateBrowserStepIntent(m[1])} (${m[2]} сек)${m[3] || ''}`
    },
    {
        pattern: /^(?:Using\s+browser|Работа\s+в\s+браузере)\s*[·•]\s*(.+)$/i,
        replace: (m) => `Работа в браузере · ${translateBrowserStepIntent(m[1])}`
    },
    {
        pattern: /^([·•])\s+([A-Za-z#].+?)(?:\s*\((\d+(?:\.\d+)?)s\))?([\u2026.]*)$/,
        replace: (m) => {
            const rawBody = m[2].trim();
            const tr = translateBrowserStepIntent(rawBody + (m[4] || ''));
            if (tr === rawBody + (m[4] || '')) return m[0];
            if (m[3]) {
                const trNoEll = translateBrowserStepIntent(rawBody);
                return `${m[1]} ${trNoEll} (${m[3]} сек)${m[4] || ''}`;
            }
            return `${m[1]} ${tr}`;
        }
    },
    {
        pattern: /^Show\s+(\d+)\s+earlier\s+steps?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `Показать ${c} ${pluralizeRuCount(c, 'предыдущий шаг', 'предыдущих шага', 'предыдущих шагов')}`;
        }
    },
    {
        pattern: /^Error\s+while\s+running:\s*(.+)$/i,
        replace: (m) => `Ошибка при выполнении: ${lowercaseFirstCyrillic(translateBrowserStepIntent(m[1]))}`
    },
    {
        pattern: /^(Messaging|Messaged)\s+(.+)$/i,
        replace: (m) => `${m[1].toLowerCase() === 'messaging' ? 'Отправка сообщения:' : 'Отправлено сообщение:'} ${m[2].trim()}`
    },
    {
        pattern: /^Typed\s+['"](.*)['"]\s+in\s+Browser$/i,
        replace: (m) => `Введено «${m[1]}» в браузере`
    },
    {
        pattern: /^Typing\s+['"](.*)['"]\s+in\s+Browser$/i,
        replace: (m) => `Ввод «${m[1]}» в браузере`
    },
    {
        pattern: /^Pressing\s+(.+)$/i,
        replace: (m) => `Нажатие ${m[1]}`
    },
    {
        pattern: /^Scrolling\s+(.+)$/i,
        replace: (m) => `Прокрутка ${m[1]}`
    },
    {
        pattern: /^Opened\s+browser:\s*(.+)$/i,
        replace: (m) => `Открыт браузер: ${m[1]}`
    },
    {
        pattern: /^Browser\s+task:\s*"(.+)"$/i,
        replace: (m) => `Задача в браузере: «${m[1]}»`
    },
    {
        pattern: /^Searched\s+for\s+"(.+)"$/i,
        replace: (m) => `Поиск «${m[1]}»`
    },
    {
        pattern: /^Searched\s+for\s+files:\s*(.+)$/i,
        replace: (m) => `Поиск файлов: ${m[1]}`
    },
    {
        pattern: /^Searched\s+web:\s*"(.+)"$/i,
        replace: (m) => `Веб-поиск: «${m[1]}»`
    },
    {
        pattern: /^Code\s+search:\s*"(.+)"$/i,
        replace: (m) => `Поиск по коду: «${m[1]}»`
    },
    {
        pattern: /^Internal\s+search:\s*"(.+)"$/i,
        replace: (m) => `Внутренний поиск: «${m[1]}»`
    },
    {
        pattern: /^Viewed\s+(.+?):(\d+)-(\d+)$/i,
        replace: (m) => `Просмотрено ${m[1]}:${m[2]}-${m[3]}`
    },
    {
        pattern: /^Viewed\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            if (isLikelyEnglishProseTarget(sub)) return m[0];
            return `Просмотрено ${sub}`;
        }
    },
    {
        pattern: /^Listed\s+directory\s+(.+)$/i,
        replace: (m) => `Просмотрен каталог ${m[1]}`
    },
    {
        pattern: /^Invoked\s+subagent:\s*(.+)$/i,
        replace: (m) => `Вызван субагент: ${m[1]}`
    },
    {
        pattern: /^Open\s+Subagent:\s*(.+)$/i,
        replace: (m) => `Открыть субагента: ${m[1]}`
    },
    {
        pattern: /^Agent\s+finished:\s*(.+)$/i,
        replace: (m) => `Агент завершил работу: ${m[1]}`
    },
    {
        pattern: /^Used\s+MCP\s+tool:\s*(.+)$/i,
        replace: (m) => `Использован MCP-инструмент: ${m[1]}`
    },
    {
        pattern: /^Used\s+tool:\s*(.+)$/i,
        replace: (m) => `Использован инструмент: ${m[1]}`
    },
    {
        pattern: /^Wants\s+to\s+run:\s*(.+)$/i,
        replace: (m) => `Запрашивает запуск: ${m[1]}`
    },
    {
        pattern: /^Generate\s+with\s+(.+?)\s*🍌$/i,
        replace: (m) => `Сгенерировать с ${m[1]} 🍌`
    },
    {
        pattern: /^Generated\s+with\s+(.+?)\s*🍌$/i,
        replace: (m) => `Сгенерировано с ${m[1]} 🍌`
    },
    {
        pattern: /^Generating\s+with\s+(.+?)\s*🍌$/i,
        replace: (m) => `Генерация с ${m[1]} 🍌`
    },
    {
        pattern: /^Generated\s+image:\s*"(.+)"$/i,
        replace: (m) => `Сгенерировано изображение: «${m[1]}»`
    },
    {
        pattern: /^Pushed\s+(\d+)\s+commits?\s+to\s+(.+?)\.?$/i,
        replace: (m) => `Отправлено коммитов (${m[1]}) в ${m[2]}.`
    },
    {
        pattern: /^Pushed\s+to\s+(.+?)\.?$/i,
        replace: (m) => `Отправлено в ${m[1]}.`
    },
    {
        pattern: /^Committed\s+to\s+(.+?)\.?$/i,
        replace: (m) => `Закоммичено в ${m[1]}.`
    },
    {
        pattern: /^Amended\s+commit\s+on\s+(.+?)\.?$/i,
        replace: (m) => `Изменён последний коммит в ${m[1]}.`
    },
    {
        pattern: /^Publish\s+(.+?)\s+to\s+origin$/i,
        replace: (m) => `Опубликовать ${m[1]} в origin`
    },
    {
        pattern: /^Published\s+(.+?)\s+to\s+origin\.?$/i,
        replace: (m) => `Опубликовано ${m[1]} в origin.`
    },
    {
        pattern: /^Checked\s+out\s+in\s+(.+)$/i,
        replace: (m) => `Переключено в ${m[1]}`
    },
    {
        pattern: /^Detached\s+at\s+(.+)$/i,
        replace: (m) => `Отсоединённый HEAD на ${m[1]}`
    },
    {
        pattern: /^Worktree\s+from\s+(.+)$/i,
        replace: (m) => `Рабочее дерево от ${m[1]}`
    },
    {
        pattern: /^Forked\s+from\s+(.+)$/i,
        replace: (m) => `Ответвлено от ${m[1]}`
    },
    {
        pattern: /^(?:Process\s+exited|Exited)\s+with\s+code\s+(.+?)\.?$/i,
        replace: (m) => `Процесс завершился с кодом ${m[1]}.`
    },
    {
        pattern: /^Yes,\s+allow\s+downloads\s+from\s+(.+?)\s+for\s+this\s+run$/i,
        replace: (m) => `Да, разрешить загрузки с ${m[1]} для этого запуска`
    },
    {
        pattern: /^Yes,\s+always\s+allow\s+downloads\s+from\s+(.+)$/i,
        replace: (m) => `Да, всегда разрешать загрузки с ${m[1]}`
    },
    {
        pattern: /^Yes,\s+always\s+allow\s+(.+)$/i,
        replace: (m) => `Да, всегда разрешать ${m[1]}`
    },
    {
        pattern: /^Yes,\s+save\s+rule\s+for\s+'(.+?)'\s+globally$/i,
        replace: (m) => `Да, сохранить правило для «${m[1]}» глобально`
    },
    {
        pattern: /^Save\s+rule\s+to\s+always\s+allow\s+(.+)\?$/i,
        replace: (m) => `Сохранить правило для постоянного разрешения ${m[1]}?`
    },
    {
        pattern: /^Requires\s+manual\s+confirmation:\s*(.+)$/i,
        replace: (m) => `Требуется ручное подтверждение: ${m[1]}`
    },
    {
        pattern: /^Agent\s+needs\s+permission\s+to\s+act\s+on\s+(.+)$/i,
        replace: (m) => `Агенту требуется разрешение для действия с ${m[1]}`
    },
    {
        pattern: /^Review\s+permissions\s+for\s+(.+)$/i,
        replace: (m) => `Проверить разрешения для ${m[1]}`
    },
    {
        pattern: /^Are\s+you\s+sure\s+you\s+want\s+to\s+delete\s+the\s+hook\s+"(.+?)"\?$/i,
        replace: (m) => `Вы уверены, что хотите удалить хук «${m[1]}»?`
    },
    {
        pattern: /^The\s+folder\s+[“"](.+?)[”"]\s+does\s+not\s+exist\.\s*Would\s+you\s+like\s+to\s+create\s+it\?$/i,
        replace: (m) => `Папка «${m[1]}» не существует. Хотите создать её?`
    },
    {
        pattern: /^[“"](.+?)[”"]\s+isn['’]t\s+a\s+valid\s+folder\s+name\.?$/i,
        replace: (m) => `«${m[1]}» не является допустимым именем папки.`
    },
    {
        pattern: /^Can['’]t\s+create\s+this\s+path\s*[\u2014\-]\s*[“"](.+?)[”"]\s+is\s+a\s+file,\s*not\s+a\s+folder\.?$/i,
        replace: (m) => `Невозможно создать этот путь — «${m[1]}» является файлом, а не папкой.`
    },
    {
        pattern: /^You\s+have\s+(\d+)\s+conversations\s+in\s+progress\.\s*Updating\s+will\s+cancel\s+them\s+and\s+you['’]ll\s+need\s+to\s+manually\s+restart\s+them\.?$/i,
        replace: (m) => `У вас активных диалогов: ${m[1]}. Обновление отменит их, и вам потребуется перезапустить их вручную.`
    },
    {
        pattern: /^You\s+have\s+(\d+)\s+conversations\s+in\s+progress\.\s*Updating\s+will\s+interrupt\s+them,\s*and\s+they\s+will\s+automatically\s+resume\s+once\s+the\s+update\s+completes\.?$/i,
        replace: (m) => `У вас активных диалогов: ${m[1]}. Обновление временно прервёт их, и они автоматически продолжатся после завершения.`
    },
    {
        pattern: /^Marked\s+(\d+)\s+conversations?\s+as\s+read$/i,
        replace: (m) => `Отмечено прочитанными диалогов: ${m[1]}`
    },
    {
        pattern: /^No\s+apps\s+found\s+for\s+"(.+?)"\.?$/i,
        replace: (m) => `Приложения по запросу «${m[1]}» не найдены.`
    },
    {
        pattern: /^No\s+plugins\s+found\s+for\s+"(.+?)"\.?$/i,
        replace: (m) => `Плагины по запросу «${m[1]}» не найдены.`
    },
    {
        pattern: /^No\s+MCP\s+servers\s+found\s+for\s+"(.+?)"\.?$/i,
        replace: (m) => `MCP-серверы по запросу «${m[1]}» не найдены.`
    },
    {
        pattern: /^No\s+connectors\s+match\s+[“"](.+?)[”"]$/i,
        replace: (m) => `Нет коннекторов по запросу «${m[1]}»`
    },
    {
        pattern: /^Search\s+for\s+"(.+?)"\s+in\s+the\s+Marketplace$/i,
        replace: (m) => `Искать «${m[1]}» в Marketplace`
    },
    {
        pattern: /^Downloads,\s*(\d+)%\s+complete$/i,
        replace: (m) => `Загрузки, выполнено ${m[1]}%`
    },
    {
        pattern: /^Zoom\s+(\d+)%,\s*reset\s+to\s+fit$/i,
        replace: (m) => `Масштаб ${m[1]}%, сбросить по размеру окна`
    },
    {
        pattern: /^Playback\s+speed\s+(\d+(?:\.\d+)?)x$/i,
        replace: (m) => `Скорость воспроизведения ${m[1]}x`
    },
    {
        pattern: /^Fold\s+lines\s+(\d+)-(\d+)$/i,
        replace: (m) => `Свернуть строки ${m[1]}–${m[2]}`
    },
    {
        pattern: /^Unfold\s+lines\s+(\d+)-(\d+)$/i,
        replace: (m) => `Развернуть строки ${m[1]}–${m[2]}`
    },
    {
        pattern: /^Go\s+to\s+page\s+(\d+)$/i,
        replace: (m) => `Перейти к странице ${m[1]}`
    },
    {
        pattern: /^Go\s+to\s+slide\s+(\d+)$/i,
        replace: (m) => `Перейти к слайду ${m[1]}`
    },
    {
        pattern: /^Today\s+(.+)$/i,
        replace: (m) => `Сегодня, ${m[1]}`
    },
    {
        pattern: /^Yesterday\s+(.+)$/i,
        replace: (m) => `Вчера, ${m[1]}`
    },
    {
        pattern: /^Tomorrow\s+(.+)$/i,
        replace: (m) => `Завтра, ${m[1]}`
    },
    {
        pattern: /^Every\s+(\d+)\s+hours?(?:\s+on\s+(.+))?$/i,
        replace: (m) => `Каждые ${m[1]} ч${m[2] ? ' ' + translateScheduleDays(m[2], false) : ''}`
    },
    {
        pattern: /^Every\s+(\d+)\s+minutes?(?:\s+on\s+(.+))?$/i,
        replace: (m) => `Каждые ${m[1]} мин${m[2] ? ' ' + translateScheduleDays(m[2], false) : ''}`
    },
    {
        pattern: /^Every\s+hour,\s*(.+?)\s+to\s+(.+?)(?:,\s*on\s+(.+))?$/i,
        replace: (m) => `Каждый час с ${m[1].trim()} до ${m[2].trim()}${m[3] ? ' ' + translateScheduleDays(m[3], false) : ''}`
    },
    {
        pattern: /^Every\s+hour(?:\s+at\s+:(\d{1,2}))?(?:\s+on\s+(.+))?$/i,
        replace: (m) => `Каждый час${m[1] ? ' в :' + m[1] : ''}${m[2] ? ' ' + translateScheduleDays(m[2], false) : ''}`
    },
    {
        pattern: /^Daily\s+at\s+(.+)$/i,
        replace: (m) => `Ежедневно в ${translateScheduleTimes(m[1])}`
    },
    {
        pattern: /^(Weekdays|Weekends|Sundays|Mondays|Tuesdays|Wednesdays|Thursdays|Fridays|Saturdays|(?:(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:,\s*|\s+and\s+))*(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat))\s+at\s+(.+)$/i,
        replace: (m) => `${translateScheduleDays(m[1], true)} в ${translateScheduleTimes(m[2])}`
    },
    {
        pattern: /^Monthly\s+on\s+the\s+(.+?)\s+at\s+(.+)$/i,
        replace: (m) => {
            const daysClean = m[1].trim()
                .replace(/\b(\d+)(?:st|nd|rd|th)?\b/gi, '$1-го')
                .replace(/\s+and\s+/gi, ' и ');
            return `Ежемесячно ${daysClean} числа в ${translateScheduleTimes(m[2])}`;
        }
    },
    {
        pattern: /^Next\s+run\s+(today|tomorrow|on\s+(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|[A-Za-z]+\s+\d{1,2}))\s+around\s+(.+)$/i,
        replace: (m) => `Следующий запуск ${translateNextRunDate(m[1])} около ${m[2].trim()}`
    },
    {
        pattern: /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)$/i,
        replace: (m) => {
            const dMap = { sun: 'Вс', mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб' };
            return `${dMap[m[1].toLowerCase()] || m[1]}, ${m[2].trim()}`;
        }
    },
    {
        pattern: /^Managed\s+by\s+the\s+(.+?)\s+plugin$/i,
        replace: (m) => `Управляется плагином ${m[1]}`
    },
    {
        pattern: /^Managed\s+by\s+the\s+(.+?)\s+automation$/i,
        replace: (m) => `Управляется автоматизацией ${m[1]}`
    },
    {
        pattern: /^Account\s+this\s+MCP\s+server\s+uses:\s*(.+)$/i,
        replace: (m) => `Аккаунт этого MCP-сервера: ${m[1]}`
    },
    {
        pattern: /^(.+?)\s+needs\s+you\s+to\s+sign\s+in\s+before\s+it\s+can\s+be\s+used\.?$/i,
        replace: (m) => `Для использования ${m[1]} необходимо войти в аккаунт.`
    },
    {
        pattern: /^MCP\s+server\s+(.+?)\s+requires\s+authentication$/i,
        replace: (m) => `MCP-сервер ${m[1]} требует аутентификации`
    },
    {
        pattern: /^Sign\s+in\s+to\s+use\s+(.+?)!$/i,
        replace: (m) => `Войдите, чтобы использовать ${m[1]}!`
    },
    {
        pattern: /^Sign\s+in\s+to\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            if (isLikelyEnglishProseTarget(sub)) return m[0];
            return `Войти в ${sub}`;
        }
    },
    {
        pattern: /^Signed\s+in:\s*(.+)$/i,
        replace: (m) => `Выполнен вход: ${m[1]}`
    },
    {
        pattern: /^Started\s+voice\s+chat\s*[·•]\s*(.+)$/i,
        replace: (m) => `Голосовой чат начат · ${m[1]}`
    },
    {
        pattern: /^Stopped\s+voice\s+chat\s*[·•]\s*(.+)$/i,
        replace: (m) => `Голосовой чат завершён · ${m[1]}`
    },
    {
        pattern: /^Choose\s+(.+?)['’]s\s+Voice$/i,
        replace: (m) => `Выбрать голос ${m[1]}`
    },
    {
        pattern: /^Microphone\s+blocked\.\s*Allow\s+in\s+(.+?)\.?$/i,
        replace: (m) => `Микрофон заблокирован. Разрешите доступ в ${m[1]}.`
    },
    {
        pattern: /^Model\s+unavailable,\s*retrying\s+in\s+(\d+)s(.*)$/i,
        replace: (m) => `Модель недоступна, повтор через ${m[1]} сек${m[2] || ''}`
    },
    {
        pattern: /^Model\s+unavailable,\s*retrying(.*)$/i,
        replace: (m) => `Модель недоступна, повторная попытка${m[1] || ''}`
    },
    {
        pattern: /^\+(\d+)\s+attachments?$/i,
        replace: (m) => `+${m[1]} влож.`
    },
    {
        pattern: /^\+(\d+)\s+more\s*\(Show\s+all\)$/i,
        replace: (m) => `+${m[1]} ещё (Показать все)`
    },
    {
        pattern: /^\.\.\.\s*\(\+(\d+)\s+more\)$/i,
        replace: (m) => `... (+${m[1]} ещё)`
    },
    {
        pattern: /^Generation\s+Steps\s*\((\d+)\)$/i,
        replace: (m) => `Шаги генерации (${m[1]})`
    },
    {
        pattern: /^Show\s+more\s*\((\d+)\)$/i,
        replace: (m) => `Показать ещё (${m[1]})`
    },
    {
        pattern: /^Show\s+submitted\s*\((\d+)\)$/i,
        replace: (m) => `Показать отправленные (${m[1]})`
    },
    {
        pattern: /^Show\s+(\d+)\s+more\s+subagents?$/i,
        replace: (m) => `Показать ещё субагентов (${m[1]})`
    },
    {
        pattern: /^Showing\s+first\s+(\d+)\s+references$/i,
        replace: (m) => `Показаны первые ссылки (${m[1]})`
    },
    {
        pattern: /^No\s+more\s+older\s+messages,\s*showing\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (m) => `Старых сообщений больше нет (показано ${m[1]} из ${m[2]})`
    },
    {
        pattern: /^(?:Hi|Hey)\s+([^,]+),\s*what\s+can\s+we\s+get\s+done\s+today\?$/i,
        replace: (m) => `Привет, ${m[1].trim()}! Чем займёмся сегодня?`
    },
    {
        // Orchestrator model tooltip: "Carbon that may offload routine steps to Hydrogen. Same Carbon-level quality, fewer tokens used."
        pattern: /^(.+?)\s+that\s+may\s+offload\s+routine\s+steps\s+to\s+(.+?)\.\s*Same\s+(.+?)-level\s+quality,\s*fewer\s+tokens\s+used\.?$/i,
        replace: (m) => `Модель ${m[1].trim()}, которая может передавать рутинные шаги модели ${m[2].trim()}. Качество уровня ${m[3].trim()} при меньшем расходе токенов.`
    },
    {
        // Deprecation notice: "GPT-OSS will be removed from Antigravity on November 18, 2026."
        pattern: /^([A-Za-z0-9.\-_() ]+?)\s+will\s+be\s+removed\s+from\s+Antigravity\s+on\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\.?$/i,
        replace: (m) => {
            const months = {
                january: 'января', february: 'февраля', march: 'марта', april: 'апреля',
                may: 'мая', june: 'июня', july: 'июля', august: 'августа',
                september: 'сентября', october: 'октября', november: 'ноября', december: 'декабря'
            };
            const monthRu = months[m[2].toLowerCase()] || m[2];
            return `Модель ${m[1].trim()} будет удалена из Antigravity ${m[3]} ${monthRu} ${m[4]} г.`;
        }
    },
    {
        // Model name + trailing thinking effort in combined trigger/button labels
        pattern: /^((?:Gemini|Claude)\s+[^\n()]+?)\s+(Low|Medium|High|Extra|Max|Minimal)$/i,
        replace: (m) => {
            const effMap = { low: 'Низкий', medium: 'Средний', high: 'Высокий', extra: 'Экстра', max: 'Макс.', minimal: 'Минимальный' };
            return `${m[1].trim()} ${effMap[m[2].toLowerCase()] || m[2]}`;
        }
    },
    {
        // Context token breakdown: "Response (incl. tool calls): 1,234 tokens"
        pattern: /^(?:(.+?):\s*)?([\d,\s\u00a0]+)\s+tokens$/i,
        replace: (m) => {
            const cnt = m[2].trim();
            if (!m[1]) return `${cnt} токенов`;
            const rawLabel = m[1].trim();
            const labelMap = {
                'context': 'Контекст',
                'prompt': 'Запрос',
                'input': 'Ввод',
                'output': 'Вывод',
                'response': 'Ответ',
                'response (incl. tool calls)': 'Ответ (вкл. вызовы инструментов)',
                'cache': 'Кэш',
                'thinking': 'Размышление',
                'total': 'Всего'
            };
            const ruLabel = labelMap[rawLabel.toLowerCase()] || translationDictionary[rawLabel.toLowerCase()] || rawLabel;
            return `${ruLabel}: ${cnt} токенов`;
        }
    },
    {
        pattern: /^Cost\s+summary:\s*(.+)$/i,
        replace: (m) => `Сводка стоимости: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+demoted$/i,
        replace: (m) => `${m[1]} понижено`
    },
    {
        pattern: /^(\d+)\s+excluded$/i,
        replace: (m) => `${m[1]} исключено`
    },
    {
        pattern: /^(\d+)\s+rules?\s+exceeded\s+the\s+rules\s+budget\s+and\s+(?:was|were)\s+demoted\s+from\s+full\s+inline\s+content\s+to\s+a\s+file-path\s+pointer\.?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            const noun = pluralizeRuCount(c, 'правило', 'правила', 'правил');
            const exceeded = (c % 10 === 1 && c % 100 !== 11) ? 'превысило' : 'превысили';
            const demoted = (c % 10 === 1 && c % 100 !== 11) ? 'было понижено' : 'были понижены';
            return `${c} ${noun} ${exceeded} лимит правил и ${demoted} со встраивания содержимого до ссылки на путь к файлу.`;
        }
    },
    {
        pattern: /^(\d+)\s+items?\s+in\s+(.+?)\s+exceeded\s+the\s+customization\s+budget\s+and\s+(?:was|were)\s+excluded\s+from\s+context\.?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            const rawCat = m[2].trim();
            const catMap = { workflows: 'Рабочие процессы', skills: 'Навыки', rules: 'Правила', 'mcp servers': 'MCP-серверы', 'mcp tools': 'Инструменты MCP', mcp: 'MCP', subagents: 'Субагенты', plugins: 'Плагины', hooks: 'Хуки', commands: 'Команды' };
            const cat = catMap[rawCat.toLowerCase()] || translationDictionary[rawCat.toLowerCase()] || rawCat;
            const noun = pluralizeRuCount(c, 'элемент', 'элемента', 'элементов');
            const exceeded = (c % 10 === 1 && c % 100 !== 11) ? 'превысил' : 'превысили';
            const excluded = (c % 10 === 1 && c % 100 !== 11) ? 'был исключён' : 'были исключены';
            return `${c} ${noun} в разделе «${cat}» ${exceeded} лимит персонализации и ${excluded} из контекста.`;
        }
    },
    {
        pattern: /^Give\s+each\s+Best\s+of\s+N\s+fork\s+a\s+full\s+clone\s+of\s+your\s+workspace,\s*including\s+its\s+local\s+commit\s+history\.\s*Choosing\s+a\s+winner\s+then\s+gives\s+your\s+workspace\s+that\s+fork['’]s\s+state,\s*so\s+the\s+commits\s+it\s+made\s+are\s+kept\.\s*Forks\s+take\s+longer\s+to\s+create\s+than\s+the\s+default\s+CitC\s+clone\.?(.*)$/i,
        replace: (m) => `Создавать для каждой ветки режима «Лучший из N» полную копию рабочей области, включая локальную историю коммитов. При выборе победителя его состояние и созданные коммиты переносятся в вашу рабочую область. Создание веток занимает больше времени, чем стандартное клонирование CitC.${m[1] ? ' ' + m[1].trim() : ''}`
    },
    {
        pattern: /^Give\s+each\s+Best\s+of\s+N\s+fork\s+its\s+own\s+clone\s+of\s+your\s+Git\s+repository\s+instead\s+of\s+a\s+copy-on-write\s+overlay\.\s*Each\s+fork\s+is\s+then\s+a\s+real\s+repository,\s*so\s+commits\s+it\s+makes\s+are\s+kept\s+when\s+you\s+choose\s+it\s+as\s+the\s+winner\.\s*Forks\s+take\s+longer\s+to\s+create,\s*and\s+the\s+wait\s+grows\s+with\s+the\s+size\s+of\s+your\s+repository\.?(.*)$/i,
        replace: (m) => `Создавать для каждой ветки режима «Лучший из N» отдельный клон Git-репозитория вместо наложения copy-on-write. Каждая ветка является полноценным репозиторием, поэтому её коммиты сохраняются при выборе победителя. Время создания растёт пропорционально размеру репозитория.${m[1] ? ' ' + m[1].trim() : ''}`
    },
    {
        pattern: /^Manage\s+(.+?)\s+app\s+settings\.?$/i,
        replace: (m) => `Управление настройками приложения ${m[1].trim()}.`
    },
    {
        pattern: /^Reset\s+(\d+)\s+overrides?$/i,
        replace: (m) => `Сбросить переопределения (${m[1]})`
    },
    {
        pattern: /^Version\s+([0-9][A-Za-z0-9._\-+]*)$/i,
        replace: (m) => `Версия ${m[1]}`
    },
    {
        pattern: /^Branch,\s*current:\s*(.+)$/i,
        replace: (m) => `Ветка, текущая: ${m[1]}`
    },
    {
        pattern: /^Receive\s+product\s+updates,\s*tips,\s*and\s+promotions\s+from\s+Google\s+(.+?)\s+via\s+email\.?$/i,
        replace: (m) => `Получать новости о продукте, советы и акции Google ${m[1].trim()} по электронной почте.`
    },
    {
        pattern: /^When\s+toggled\s+on,\s*(.+?)\s+collects\s+usage\s+data\s+to\s+help\s+Google\s+enhance\s+performance\s+and\s+features\.?$/i,
        replace: (m) => `Когда включено, ${m[1].trim()} собирает данные об использовании, чтобы помочь Google улучшать производительность и функции.`
    },
    {
        pattern: /^When\s+toggled\s+on,\s*(.+?)\s+will\s+use\s+your\s+AI\s+credits\s+to\s+fulfill\s+model\s+requests\s+once\s+you['’]re\s+out\s+of\s+model\s+quota\.\s*.+?\s+will\s+always\s+use\s+your\s+model\s+quota\s+first\s+before\s+using\s+AI\s+credits\.?$/i,
        replace: (m) => `Когда включено, ${m[1].trim()} будет использовать ваши ИИ-кредиты для запросов к моделям после исчерпания квоты. ${m[1].trim()} всегда сначала расходует основную квоту моделей.`
    },
    {
        pattern: /^Your\s+Plan:\s*(.+)$/i,
        replace: (m) => `Ваш тариф: ${m[1]}`
    },
    {
        pattern: /^Available\s+AI\s+Credits:\s*(.+)$/i,
        replace: (m) => `Доступно ИИ-кредитов: ${m[1]}`
    },
    {
        pattern: /^Build\s+with\s+(.+?)\s+Plugins$/i,
        replace: (m) => `Плагины для разработки с ${m[1].trim()}`
    },
    {
        pattern: /^(\d+)\s+CEL\s+values$/i,
        replace: (m) => `Значения CEL: ${m[1]}`
    },
    {
        pattern: /^(.+?)\s*[—–-]\s*Inserts:\s*(.+)$/i,
        replace: (m) => `${m[1]} — Вставляет: ${m[2]}`
    },
    {
        pattern: /^Configure\s+(.+?),\s*values\s+missing$/i,
        replace: (m) => `Настроить ${m[1].trim()} (не заполнены параметры)`
    },
    {
        pattern: /^Configure\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            if (isLikelyEnglishProseTarget(sub) && !isTitleCaseName(sub)) return m[0];
            return `Настроить ${sub}`;
        }
    },
    {
        pattern: /^The\s+(.+?)\s+MCP\s+server\s+requires\s+configuration\s+parameters\s+before\s+it\s+can\s+be\s+started\.?$/i,
        replace: (m) => `Для запуска MCP-сервера ${m[1].trim()} требуется указать параметры конфигурации.`
    },
    {
        pattern: /^(\d+)\s+tools?\s+(enabled|disabled)$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            const toolWord = pluralizeRuCount(c, 'инструмент', 'инструмента', 'инструментов');
            const isEn = m[2].toLowerCase() === 'enabled';
            const stateWord = (c % 10 === 1 && c % 100 !== 11)
                ? (isEn ? 'включён' : 'отключён')
                : (isEn ? 'включены' : 'отключены');
            return `${c} ${toolWord} ${stateWord}`;
        }
    },
    {
        pattern: /^(Disable|Enable)\s+(.+?)\s+tool\s+for\s+(.+)$/i,
        replace: (m) => `${m[1].toLowerCase() === 'disable' ? 'Отключить' : 'Включить'} инструмент ${m[2]} для ${m[3]}`
    },
    {
        pattern: /^Auth(?:orization)?\s+code\s+for\s+(.+)$/i,
        replace: (m) => `Код авторизации для ${m[1]}`
    },
    {
        pattern: /^(Reconnect|Disconnect|Connect)\s+(.+)$/i,
        replace: (m) => {
            const sub = m[2].trim();
            if (isLikelyEnglishProseTarget(sub) && !isTitleCaseName(sub)) return m[0];
            const verbMap = { reconnect: 'Переподключить', disconnect: 'Отключить', connect: 'Подключить' };
            return `${verbMap[m[1].toLowerCase()] || m[1]} ${sub}`;
        }
    },
    {
        pattern: /^More\s+for\s+(.+)$/i,
        replace: (m) => `Ещё для ${m[1]}`
    },
    {
        pattern: /^MCP\s+error(?:\s+(\d+))?:\s*(.+)$/i,
        replace: (m) => `Ошибка MCP${m[1] ? ' ' + m[1] : ''}: ${m[2]}`
    },
    {
        pattern: /^(Sent|Sending)\s+(.+?)\s+to\s+command$/i,
        replace: (m) => `${m[1].toLowerCase() === 'sent' ? 'Отправлено' : 'Отправка'} «${m[2]}» команде`
    },
    {
        pattern: /^Error\s+while\s+(?:running:\s*)?(.+)$/i,
        replace: (m) => `Ошибка при выполнении: ${m[1]}`
    },
    {
        pattern: /^Stopping\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            if (isLikelyEnglishProseTarget(sub) && !isTitleCaseName(sub)) return m[0];
            return `Остановка ${sub}`;
        }
    },
    {
        pattern: /^Stop\s+(\d+)\s+selected$/i,
        replace: (m) => `Остановить выбранные (${m[1]})`
    },
    {
        pattern: /^(\d+)\s+selected$/i,
        replace: (m) => `Выбрано: ${m[1]}`
    },
    {
        pattern: /^Unnamed\s+Agent\s+(\d+)$/i,
        replace: (m) => `Безымянный агент ${m[1]}`
    },
    {
        pattern: /^Rule\s+(\d+)$/i,
        replace: (m) => `Правило ${m[1]}`
    },
    {
        pattern: /^See\s+(\d+)\s+more(?:\s+(.+))?$/i,
        replace: (m) => m[2] ? `Показать ещё ${m[1]} (${translationDictionary[m[2].trim().toLowerCase()] || m[2].trim()})` : `Показать ещё ${m[1]}`
    },
    {
        pattern: /^See\s+all\s*\((\d+)\)$/i,
        replace: (m) => `Показать все (${m[1]})`
    },
    {
        pattern: /^Adding\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            if (isLikelyEnglishProseTarget(sub) && !isTitleCaseName(sub)) return m[0];
            return `Добавление ${sub}`;
        }
    },
    {
        pattern: /^(.+?),\s*voice\s+(\d+)\s+of\s+(\d+)$/i,
        replace: (m) => `${m[1]}, голос ${m[2]} из ${m[3]}`
    },
    {
        pattern: /^The\s+narrator\s*\(\s*(.+?)\s*\)\s*was\s+stopped\.\s*Ask\s+the\s+coordinator\s+to\s+add\s+a\s+new\s+one$/i,
        replace: (m) => `Рассказчик (${m[1].trim()}) был остановлен. Попросите координатора добавить нового`
    },
    {
        pattern: /^Opening\s+(.+?)['’]s\s+conversation\s+needs\s+the\s+app\.?$/i,
        replace: (m) => `Для открытия диалога агента ${m[1].trim()} требуется настольное приложение.`
    },
    {
        pattern: /^Everyone\s+in\s+#(.+)$/i,
        replace: (m) => `Все в #${m[1]}`
    },
    {
        pattern: /^Go\s+to\s+#(\d+)(?:\s+\((.+?)\))?$/i,
        replace: (m) => `Перейти к #${m[1]}${m[2] ? ' (' + m[2] + ')' : ''}`
    },
    {
        pattern: /^Posted\s+in\s+#(.+?);\s*click\s+to\s+show\s+only\s+#(.+)$/i,
        replace: (m) => `Опубликовано в #${m[1]}; нажмите, чтобы показать только #${m[2]}`
    },
    {
        pattern: /^Copied\s+["“](.+?)["”]\.\s*Paste\s+it\s+to\s+the\s+coordinator\s+and\s+say\s+what\s+you\s+want\s+changed\.?$/i,
        replace: (m) => `Скопировано: «${m[1]}». Вставьте это сообщение координатору и укажите, что нужно изменить.`
    },
    {
        pattern: /^Copied\s+["“](.+?)["”]\.\s*Paste\s+it\s+in\s+the\s+chat\.?$/i,
        replace: (m) => `Скопировано: «${m[1]}». Вставьте в чат.`
    },
    {
        pattern: /^Type\s+["“](.+?)["”]\s+in\s+the\s+chat\.?$/i,
        replace: (m) => `Введите «${m[1]}» в чате.`
    },
    {
        pattern: /^Tell\s+the\s+coordinator:\s*["“](.+?)["”]$/i,
        replace: (m) => `Скажите координатору: «${m[1]}»`
    },
    {
        pattern: /^Tell\s+it\s+["“](.+?)["”]$/i,
        replace: (m) => `Напишите ему: «${m[1]}»`
    },
    {
        pattern: /^Failed\s+to\s+save\s+(.+?):\s*(.+)$/i,
        replace: (m) => `Не удалось сохранить ${m[1]}: ${m[2]}`
    },
    {
        pattern: /^Failed\s+to\s+delete\s+(.+?):\s*(.+)$/i,
        replace: (m) => `Не удалось удалить ${m[1]}: ${m[2]}`
    },
    {
        pattern: /^Failed\s+to\s+update\s+(.+?)(?::\s*(.+))?$/i,
        replace: (m) => `Не удалось обновить ${m[1]}${m[2] ? ': ' + m[2] : ''}`
    },
    {
        pattern: /^(Started|Starting)\s+(.+)$/i,
        replace: (m) => {
            const sub = m[2].trim();
            if (/^["“]/.test(sub)) {
                return `Запущено: «${sub.replace(/^["“]|["”]\.?$/g, '')}»`;
            }
            const verb = m[1].toLowerCase() === 'starting' ? 'Запуск:' : 'Запущено:';
            const trSub = (typeof translateEnglishCommandSummary === 'function' ? translateEnglishCommandSummary(sub) : null) || translationDictionary[sub.toLowerCase()] || sub;
            return `${verb} ${trSub}`;
        }
    },
    {
        pattern: /^Wants\s+to\s+run:\s*(.+)$/i,
        replace: (m) => `Хочет выполнить: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+hidden\s+hosts?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            const isSing = (c % 10 === 1 && c % 100 !== 11);
            return `${c} ${isSing ? 'скрытый' : 'скрытых'} ${pluralizeRuCount(c, 'хост', 'хоста', 'хостов')}`;
        }
    },
    {
        pattern: /^Remove\s+(.+?)\s+from\s+Recent$/i,
        replace: (m) => `Удалить ${m[1]} из недавних`
    },
    {
        pattern: /^Couldn['’]t\s+connect\s+to\s+(.+)$/i,
        replace: (m) => `Не удалось подключиться к ${m[1]}`
    },
    {
        pattern: /^Connected\s+to\s+(.+)$/i,
        replace: (m) => `Подключено к ${m[1]}`
    },
    {
        pattern: /^No\s+hosts\s+in\s*(.*?)\s*yet\.\s*Type\s+one\s+above\.?$/i,
        replace: (m) => m[1] ? `В ${m[1].trim()} пока нет хостов. Введите адрес выше.` : `Хостов пока нет. Введите адрес выше.`
    },
    {
        pattern: /^(\d+)\s+Drafts?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `${c} ${pluralizeRuCount(c, 'черновик', 'черновика', 'черновиков')}`;
        }
    },
    {
        pattern: /^Resume\s+(\d+)\s+comment\s+drafts?$/i,
        replace: (m) => {
            const c = parseInt(m[1], 10);
            return `Продолжить ${c} ${pluralizeRuCount(c, 'черновик', 'черновика', 'черновиков')} комментариев`;
        }
    },
    {
        pattern: /^Open\s+([a-z0-9+.-]+)\s+link\?$/i,
        replace: (m) => `Открыть ссылку ${m[1]}?`
    },
    {
        pattern: /^Open\s+(.+?)\s+skill$/i,
        replace: (m) => `Открыть навык ${m[1]}`
    },
    {
        pattern: /^Open\s+the\s+(.+?)\s+plugin$/i,
        replace: (m) => `Открыть плагин ${m[1]}`
    },
    {
        pattern: /^Cannot\s+add\s+folder:\s*"(.+?)"\s+is\s+not\s+a\s+valid\s+folder\s+location\.?$/i,
        replace: (m) => `Невозможно добавить папку: «${m[1]}» не является допустимым путём к папке.`
    },
    {
        pattern: /^Failed\s+to\s+resolve\s+folder:\s*(.+)$/i,
        replace: (m) => `Не удалось определить папку: ${m[1]}`
    },
    {
        pattern: /^(?:Couldn['’]t|Failed\s+to)\s+(pin|unpin|archive|unarchive|rename|delete)\s+conversation$/i,
        replace: (m) => {
            const map = { pin: 'закрепить', unpin: 'открепить', archive: 'архивировать', unarchive: 'разархивировать', rename: 'переименовать', delete: 'удалить' };
            return `Не удалось ${map[m[1].toLowerCase()] || m[1]} диалог`;
        }
    },
    {
        pattern: /^Failed\s+to\s+(unarchive\s+project|select\s+workspace):\s*(.+)$/i,
        replace: (m) => `Не удалось ${m[1].toLowerCase().includes('unarchive') ? 'разархивировать проект' : 'выбрать рабочую область'}: ${m[2]}`
    },
    {
        pattern: /^Message\s+from\s+(.+)$/i,
        replace: (m) => `Сообщение от ${m[1]}`
    },
    {
        pattern: /^App\s+view\s+for\s+(.+)$/i,
        replace: (m) => `Окно приложения для ${m[1]}`
    },
    {
        pattern: /^(Enabled|Restarted|Deleted)\s+"(.+?)"\.?$/i,
        replace: (m) => {
            const map = { enabled: 'Включено:', restarted: 'Перезапущено:', deleted: 'Удалено:' };
            return `${map[m[1].toLowerCase()] || m[1]} «${m[2]}»`;
        }
    },
    {
        pattern: /^Failed\s+to\s+(start|save|delete|create)\s+"?(.+?)"?\.?$/i,
        replace: (m) => {
            const map = { start: 'запустить', save: 'сохранить', delete: 'удалить', create: 'создать' };
            return `Не удалось ${map[m[1].toLowerCase()] || m[1]} «${m[2]}»`;
        }
    },
    {
        pattern: /^Install\s+folder\s+"(.+?)"\s+is\s+already\s+in\s+use$/i,
        replace: (m) => `Папка установки «${m[1]}» уже используется`
    },
    {
        pattern: /^Move\s+to\s+Group:\s*(.+)$/i,
        replace: (m) => `Переместить в группу: ${m[1]}`
    },
    {
        pattern: /^Detached\s+at\s+([0-9a-f]{6,40})$/i,
        replace: (m) => `Отсоединён на ${m[1]}`
    },
    {
        pattern: /^System\s+default\s*\((.+)\)$/i,
        replace: (m) => `Системный по умолчанию (${m[1]})`
    },
    {
        pattern: /^Search\s+Google\s+for\s+"(.+)"$/i,
        replace: (m) => `Найти в Google «${m[1]}»`
    },
    {
        pattern: /^Created\s+automation\s+"(.+?)"\.?$/i,
        replace: (m) => `Создана автоматизация «${m[1]}»`
    },
    {
        pattern: /^Unfold\s+lines\s+(\d+-\d+)$/i,
        replace: (m) => `Развернуть строки ${m[1]}`
    },
    {
        pattern: /^\+(\d+)\s+more\s+\(Show\s+all\)$/i,
        replace: (m) => `Ещё +${m[1]} (Показать все)`
    },
    {
        pattern: /^There\s+was\s+an\s+error\s+determining\s+the\s+code\s+changes\s+(?:that\s+this\s+undo\s+action\s+will\s+make|that\s+would\s+be\s+reverted):\s*(.+)$/i,
        replace: (m) => `Произошла ошибка при определении изменений кода для этой отмены: ${m[1]}`
    },
    {
        pattern: /^Are\s+you\s+sure\s+you\s+want\s+to\s+delete\s+the\s+hook\s+"(.+?)"\??$/i,
        replace: (m) => `Вы уверены, что хотите удалить хук «${m[1]}»?`
    },
    {
        pattern: /^Stop\s+(\d+)\s+items?\?$/i,
        replace: (m) => `Остановить выбранные (${m[1]})?`
    },
    {
        pattern: /^Stopping\s+(\d+)\s+tasks?(?:\.\s*Closed\s+(\d+)\s+terminals?)?\.?$/i,
        replace: (m) => m[2] ? `Остановка задач: ${m[1]}. Закрыто терминалов: ${m[2]}` : `Остановка задач: ${m[1]}`
    },
    {
        pattern: /^Closed\s+(\d+)\s+terminals?\.?$/i,
        replace: (m) => `Закрыто терминалов: ${m[1]}`
    },
    {
        pattern: /^(\d+)\s+items?\s+could\s+not\s+be\s+stopped:\s*(.+)$/i,
        replace: (m) => `Не удалось остановить (${m[1]}): ${m[2]}`
    },
    {
        pattern: /^Select\s+all\s+in\s+(.+)$/i,
        replace: (m) => {
            const sub = m[1].trim();
            const tr = translationDictionary[sub.toLowerCase()] || sub;
            return `Выбрать всё в «${tr}»`;
        }
    },
    {
        pattern: /^and\s+(\d+)\s+more$/i,
        replace: (m) => `и ещё ${m[1]}`
    },
    {
        pattern: /^(Close|Unpin|Pin)\s+(.+)$/i,
        replace: (m) => {
            const verb = m[1].toLowerCase();
            const rawTarget = m[2].trim();
            const vRu = verb === 'close' ? 'Закрыть' : (verb === 'unpin' ? 'Открепить' : 'Закрепить');
            const dictHit = translationDictionary[rawTarget.toLowerCase()];
            if (dictHit) return `${vRu}: ${dictHit}`;
            const cmdSum = translateEnglishCommandSummary(rawTarget, false);
            if (cmdSum) return `${vRu}: ${uppercaseFirstCyrillic(cmdSum)}`;
            if (/^(?:Terminal|bash|pwsh|powershell|zsh|cmd|sh|node|python)\b/i.test(rawTarget)) {
                return `${vRu}: ${rawTarget.replace(/^Terminal\b/i, 'Терминал')}`;
            }
            return m[0];
        }
    },
    {
        pattern: /^([^\n]+?)\s*→\s*([^\n]+?):\s*(\d+)\s+direct$/i,
        replace: (m) => `${m[1].trim()} → ${m[2].trim()}: ${m[3]} прямых`
    },
    {
        pattern: /^([^\n]+?)\s*·\s*(Active|Waiting|Working|Stopped|Killed)$/i,
        replace: (m) => {
            const namePart = m[1].trim().replace(/\s*\(you\)\s*$/i, ' (вы)');
            const stMap = { active: 'Активен', waiting: 'Ожидает', working: 'В работе', stopped: 'Приостановлен', killed: 'Остановлен' };
            return `${namePart} · ${stMap[m[2].toLowerCase()] || m[2]}`;
        }
    },
    {
        pattern: /^([\s\S]+?)\.\s*(Click to (?:hide from the board|show on the board|open conversation))\.?$/i,
        replace: (m) => {
            const body = m[1]
                .replace(/\s*\(you\)/gi, ' (вы)')
                .replace(/·\s*(Active|Waiting|Working|Stopped|Killed)\b/gi, (_, st) => {
                    const stMap = { active: 'Активен', waiting: 'Ожидает', working: 'В работе', stopped: 'Приостановлен', killed: 'Остановлен' };
                    return `· ${stMap[st.toLowerCase()] || st}`;
                })
                .replace(/\b(\d+)\s+steps?\b/gi, (_, c) => `${c} ${pluralizeRuCount(parseInt(c, 10), 'шаг', 'шага', 'шагов')}`)
                .replace(/\b(\d+)\s+posts?\b/gi, '$1 сообщ.')
                .replace(/\b(\d+)\s+unread\b/gi, '$1 непрочит.');
            const actLow = m[2].toLowerCase();
            const actRu = actLow.includes('hide from the board')
                ? 'Нажмите, чтобы скрыть с доски'
                : actLow.includes('show on the board')
                    ? 'Нажмите, чтобы показать на доске'
                    : 'Нажмите, чтобы открыть диалог';
            return `${body.replace(/\.+$/, '')}. ${actRu}`;
        }
    },
    {
        pattern: /^Reconnect\s+(.+)$/i,
        replace: (m) => `Переподключить ${m[1].trim()}`
    },
    {
        pattern: /^Disconnect\s+(.+)$/i,
        replace: (m) => `Отключить ${m[1].trim()}`
    },
    {
        pattern: /^Answered:\s*(.+)$/i,
        replace: (m) => `Ответ: ${m[1].trim()}`
    },
    {
        pattern: /^Delete\s+cookies\s+for\s+(.+)$/i,
        replace: (m) => `Удалить файлы cookie для ${m[1].trim()}`
    },
    {
        pattern: /^Deleted\s+cookies\s+for\s+(.+)$/i,
        replace: (m) => `Удалены файлы cookie для ${m[1].trim()}`
    },
    {
        pattern: /^Error\s+restarting\s+(.+?):\s*(.+)$/i,
        replace: (m) => `Ошибка при перезапуске ${m[1].trim()}: ${m[2].trim()}`
    },
    {
        pattern: /^Exceeded\s+the\s+customization\s+token\s+budget\s+\((.+?)\s+tokens\)\s+and\s+was\s+excluded\s+from\s+context\.?$/i,
        replace: (m) => `Превышен лимит токенов персонализации (${m[1].trim()} токенов) — исключено из контекста.`
    }
];
