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
    
    res = res.replace(/^(\d+)\s*(?:s|sec|secs)\s*(?:ago)?$/i, '$1 сек назад');
    res = res.replace(/^(\d+)\s*(?:m|min|mins)\s*(?:ago)?$/i, '$1 мин назад');
    res = res.replace(/^(\d+)\s*(?:h|hr|hrs)\s*(?:ago)?$/i, '$1 ч назад');
    res = res.replace(/^(\d+)\s*d\s*(?:ago)?$/i, '$1 дн назад');
    res = res.replace(/^(\d+)\s*(?:w|wk|wks)\s*(?:ago)?$/i, '$1 нед назад');
    res = res.replace(/^(\d+)\s*(?:mo|mos)\s*(?:ago)?$/i, '$1 мес назад');
    res = res.replace(/^(\d+)\s*(?:y|yr|yrs)\s*(?:ago)?$/i, '$1 г. назад');
    
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
                const res = rule.replace(match);
                if (res && res !== normalized) {
                    translated = res;
                    break;
                }
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
