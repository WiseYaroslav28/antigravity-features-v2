#!/usr/bin/env node
'use strict';

/**
 * GitHub Release & Traffic Analytics Dashboard for antigravity-features-v2
 * Uses official GitHub API via `gh api` (zero servers, zero telemetry).
 *
 * Usage:
 *   npm run stats
 *   node stats.cjs          (last 15 releases + 14-day traffic + saved history)
 *   node stats.cjs --all    (all releases)
 *   node stats.cjs --json   (machine-readable JSON)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = 'WiseYaroslav28/antigravity-features-v2';
const HISTORY_FILE = path.join(__dirname, 'backups', 'stats-history.json');
const args = new Set(process.argv.slice(2));
const SHOW_ALL = args.has('--all');
const JSON_MODE = args.has('--json');

function ghApi(endpoint) {
    try {
        const out = execFileSync('gh', ['api', endpoint], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        });
        return JSON.parse(out);
    } catch (err) {
        const stderr = err && err.stderr ? String(err.stderr).trim() : err.message;
        return { __error: stderr };
    }
}

function padRight(str, len) {
    const s = String(str);
    return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

function padLeft(str, len) {
    const s = String(str);
    return s.length >= len ? s : ' '.repeat(len - s.length) + s;
}

function makeBar(value, maxVal, width = 20) {
    if (!maxVal || value <= 0) return '';
    const filled = Math.max(1, Math.round((value / maxVal) * width));
    return '█'.repeat(Math.min(width, filled));
}

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            if (parsed && typeof parsed === 'object') {
                return {
                    clonesByDay: parsed.clonesByDay || {},
                    viewsByDay: parsed.viewsByDay || {},
                    updatedAt: parsed.updatedAt || null
                };
            }
        }
    } catch (e) {}
    return { clonesByDay: {}, viewsByDay: {}, updatedAt: null };
}

function saveHistory(history, clones, views) {
    try {
        if (clones && Array.isArray(clones.clones)) {
            for (const row of clones.clones) {
                const day = String(row.timestamp || '').slice(0, 10);
                if (day) {
                    history.clonesByDay[day] = {
                        count: Number(row.count) || 0,
                        uniques: Number(row.uniques) || 0
                    };
                }
            }
        }
        if (views && Array.isArray(views.views)) {
            for (const row of views.views) {
                const day = String(row.timestamp || '').slice(0, 10);
                if (day) {
                    history.viewsByDay[day] = {
                        count: Number(row.count) || 0,
                        uniques: Number(row.uniques) || 0
                    };
                }
            }
        }
        history.updatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8');
    } catch (e) {}
}

function main() {
    const repo = ghApi(`repos/${REPO}`);
    if (repo.__error) {
        console.error('❌ Не удалось обратиться к GitHub API через `gh api`.');
        console.error('   Убедитесь, что GitHub CLI установлен и выполнен вход (`gh auth status`).');
        console.error('   Детали:', repo.__error);
        process.exit(1);
    }

    const clones = ghApi(`repos/${REPO}/traffic/clones`);
    const views = ghApi(`repos/${REPO}/traffic/views`);
    const referrers = ghApi(`repos/${REPO}/traffic/popular/referrers`);
    const releasesPerPage = SHOW_ALL ? 100 : 15;
    const releases = ghApi(`repos/${REPO}/releases?per_page=${releasesPerPage}`);

    const history = loadHistory();
    saveHistory(history, clones, views);

    const releaseRows = Array.isArray(releases)
        ? releases.map((r) => {
              const assets = Array.isArray(r.assets) ? r.assets : [];
              const locAsset = assets.find((a) => a.name === 'localization_injected.js');
              const macAsset = assets.find((a) => a.name === 'mac_updater.cjs');
              const total = locAsset ? Number(locAsset.download_count) || 0 : 0;
              const hasMacAsset = !!macAsset;
              const mac = macAsset ? Number(macAsset.download_count) || 0 : 0;
              const win = hasMacAsset ? Math.max(0, total - mac) : null;
              return {
                  tag: r.tag_name,
                  date: String(r.published_at || r.created_at || '').slice(0, 10),
                  totalUpdates: total,
                  windowsUpdates: win,
                  macosUpdates: hasMacAsset ? mac : null,
                  hasReleaseAsset: !!locAsset,
                  hasMacAsset
              };
          })
        : [];

    const savedCloneDays = Object.keys(history.clonesByDay).sort();
    const totalArchivedClones = savedCloneDays.reduce((s, d) => s + (history.clonesByDay[d].count || 0), 0);
    const totalArchivedViews = Object.keys(history.viewsByDay).reduce((s, d) => s + (history.viewsByDay[d].count || 0), 0);

    if (JSON_MODE) {
        console.log(
            JSON.stringify(
                {
                    repo: {
                        fullName: repo.full_name,
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
                        openIssues: repo.open_issues_count,
                        createdAt: repo.created_at
                    },
                    releases: releaseRows,
                    traffic14d: {
                        clones: clones.__error ? null : clones,
                        views: views.__error ? null : views,
                        referrers: referrers.__error ? null : referrers
                    },
                    archivedDays: savedCloneDays.length,
                    historyFile: HISTORY_FILE
                },
                null,
                2
            )
        );
        return;
    }

    const latestTag = releaseRows[0] ? releaseRows[0].tag : '—';
    const createdDate = String(repo.created_at || '').slice(0, 10);

    console.log('');
    console.log('========================================================================');
    console.log(`  📊 Статистика ${REPO}`);
    console.log('========================================================================');
    console.log(
        `  ⭐ Звёзд: ${repo.stargazers_count}   🍴 Форков: ${repo.forks_count}   🏷️ Последний релиз: ${latestTag}   📅 Создан: ${createdDate}`
    );
    console.log('');

    console.log('--- 1. Регулярные обновления по версиям (GitHub Release Assets) --------');
    console.log(
        '  ' +
            padRight('Версия', 10) +
            ' | ' +
            padRight('Дата', 10) +
            ' | ' +
            padLeft('Обновлений', 10) +
            ' | ' +
            padLeft('Windows', 8) +
            ' | ' +
            padLeft('macOS', 6) +
            ' | Примечание'
    );
    console.log('  ' + '-'.repeat(68));

    for (const row of releaseRows) {
        const winStr = row.windowsUpdates === null ? '—' : String(row.windowsUpdates);
        const macStr = row.macosUpdates === null ? '—' : String(row.macosUpdates);
        let note = '';
        if (!row.hasReleaseAsset) note = 'нет ассета';
        else if (!row.hasMacAsset) note = 'до v2.2.7 (качалось с raw)';
        console.log(
            '  ' +
                padRight(row.tag, 10) +
                ' | ' +
                padRight(row.date, 10) +
                ' | ' +
                padLeft(row.totalUpdates, 10) +
                ' | ' +
                padLeft(winStr, 8) +
                ' | ' +
                padLeft(macStr, 6) +
                ' | ' +
                note
        );
    }
    console.log('');
    console.log('  ℹ️ Счётчик Release Assets фиксирует реальные автообновления начиная с v2.2.8');
    console.log('     (после того как пользователи обновят index.js на v2.2.7).');
    console.log('');

    console.log('--- 2. Трафик и клоны за последние 14 дней (GitHub Traffic API) --------');
    if (clones.__error || views.__error) {
        console.log('  ⚠️ Не удалось получить Traffic API (нужны права владельца/push):');
        if (clones.__error) console.log('     clones:', clones.__error);
        if (views.__error) console.log('     views:', views.__error);
    } else {
        console.log(
            `  📦 Клоны (14д): ${clones.count} всего / ${clones.uniques} уникальных клонеров`
        );
        console.log(
            `  👀 Просмотры (14д): ${views.count} всего / ${views.uniques} уникальных посетителей`
        );
        if (savedCloneDays.length > 14) {
            console.log(
                `  🗂️ Локальный архив (${savedCloneDays[0]} .. ${savedCloneDays[savedCloneDays.length - 1]}, ${savedCloneDays.length} дн.): ${totalArchivedClones} клонов, ${totalArchivedViews} просмотров`
            );
        }
        console.log('');

        const viewsMap = new Map();
        for (const v of views.views || []) {
            viewsMap.set(String(v.timestamp || '').slice(0, 10), v);
        }
        const cloneRows = clones.clones || [];
        const maxUniques = Math.max(1, ...cloneRows.map((c) => Number(c.uniques) || 0));

        console.log(
            '  ' +
                padRight('Дата', 10) +
                ' | ' +
                padLeft('Уник.клоны', 10) +
                ' | ' +
                padLeft('Клоны', 6) +
                ' | ' +
                padLeft('Уник.просм', 10) +
                ' | График уник. клонеров'
        );
        console.log('  ' + '-'.repeat(68));
        for (const c of cloneRows) {
            const day = String(c.timestamp || '').slice(0, 10);
            const v = viewsMap.get(day) || { uniques: 0 };
            console.log(
                '  ' +
                    padRight(day, 10) +
                    ' | ' +
                    padLeft(c.uniques, 10) +
                    ' | ' +
                    padLeft(c.count, 6) +
                    ' | ' +
                    padLeft(v.uniques, 10) +
                    ' | ' +
                    makeBar(c.uniques, maxUniques, 20)
            );
        }
    }

    if (Array.isArray(referrers) && referrers.length > 0) {
        console.log('');
        console.log('--- 3. Источники переходов (14 дней) -----------------------------------');
        for (const ref of referrers) {
            console.log(
                '  ' +
                    padRight(ref.referrer, 22) +
                    padLeft(ref.uniques, 5) +
                    ' уников  (' +
                    ref.count +
                    ' просмотров)'
            );
        }
    }

    console.log('');
    console.log(`  💾 Архив сохранён в: ${HISTORY_FILE}`);
    console.log('');
}

main();
