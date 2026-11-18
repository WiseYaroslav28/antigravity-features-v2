#!/usr/bin/env node
'use strict';

/**
 * Zero-dependency modular builder for localization_injected.js.
 * Assembles src/*.js into the single backwards-compatible localization_injected.js
 * bundle and validates syntax via V8 vm.Script before writing.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'src');
const OUT_FILE = path.join(ROOT, 'localization_injected.js');

const MODULES = [
    'helpers.js',
    'dict-ui.js',
    'dict-plugins.js',
    'step-engine.js',
    'regex-rules.js',
    'dom-engine.js',
    'topbar-ui.js',
    'terminal-boot.js'
];

const parts = [];
parts.push('// AntiGravity 2.0 Russian Localization (auto-assembled by build.cjs from src/*.js)');
parts.push('// Do not edit this bundle directly — edit files in src/ and run: node build.cjs');
parts.push('');
parts.push('(() => {');

for (const mod of MODULES) {
    const modPath = path.join(SRC_DIR, mod);
    if (!fs.existsSync(modPath)) {
        throw new Error(`Missing source module: src/${mod}`);
    }
    const content = fs.readFileSync(modPath, 'utf8').replace(/\r\n/g, '\n').trim();
    parts.push(`\n// ===== [MODULE: src/${mod}] =====`);
    parts.push(content);
    if (mod === 'dict-plugins.js') {
        parts.push('\nconst translationDictionary = Object.assign({}, dictUi, dictPlugins);');
    }
}

parts.push('\n})();\n');

const eol = process.platform === 'win32' ? '\r\n' : '\n';
const bundle = parts.join('\n').replace(/\n/g, eol);

// Validate syntax in memory before touching localization_injected.js
new vm.Script(bundle, { filename: 'localization_injected.js' });

fs.writeFileSync(OUT_FILE, bundle, 'utf8');

const sizeKb = (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1);
const lineCount = bundle.split(/\r?\n/).length;
console.log(`[build.cjs] Assembled ${MODULES.length} modules -> localization_injected.js (${lineCount} lines, ${sizeKb} KB) [syntax OK]`);
