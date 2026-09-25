// Dumps js-src's server configuration and tuning-constant tables to gen/config.json.
//
// This loads config.js the same way the server does at boot: parse server/.env with
// the server's own dotenv.js, copy the result onto process.env, then require config.js
// (see js-src/server/server.js:16-24 and js-src/server/loaders/global.js:5). It also
// requires the three small tuning-constant tables named alongside config.js in the
// extraction task: constants.js, gunvals.js, presets.js.
//
// It deliberately stops there. It does not require loaders/global.js, loaders/loader.js
// or game.js, so it never opens a port, spawns a worker_thread, or loads the ~32,000-line
// entity/tank/turret definition tree under lib/definitions/groups and entityAddons. That
// tree is a separate concern from "config" (see docs/architecture.md's internal/defs
// package and its planned tools/dump-definitions.js) and is out of scope here.
//
// js-src is READ-ONLY: this script only requires/reads files under it, never writes
// there. Its only write is gen/config.json.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const JS_SRC = path.join(REPO_ROOT, 'js-src');
const SERVER_DIR = path.join(JS_SRC, 'server');
const DEFS_DIR = path.join(SERVER_DIR, 'lib', 'definitions');

// --- 1. Replicate server.js's env-loading step (js-src/server/server.js:16-24). ---
// The server reads server/.env with its own hand-rolled parser (lib/dotenv.js) and
// copies every key it finds onto process.env. These are permission tokens and an API
// key, not config.js overrides -- see docs/config.md's "Environment variables" section.
const dotenv = require(path.join(SERVER_DIR, 'lib', 'dotenv.js'));
const envPath = path.join(SERVER_DIR, '.env');
const envContent = fs.readFileSync(envPath).toString();
const environment = dotenv(envContent);
for (const key in environment) {
    process.env[key] = environment[key];
}

// --- 2. Load config.js the way loaders/global.js does (global.js:5). ---
const config = require(path.join(SERVER_DIR, 'config.js'));

// --- 3. Load the three tuning-constant tables named in the extraction task. ---
const constants = require(path.join(DEFS_DIR, 'constants.js'));
const gunvals = require(path.join(DEFS_DIR, 'gunvals.js'));
const presets = require(path.join(DEFS_DIR, 'presets.js'));

// config.js has one function-valued key (defineLevelSkillPoints) and presets.js has one
// (on.retrograde_self_destruct.handler). JSON can't hold a function, and silently
// dropping it would hide a real piece of tuning logic from the Go port. Replace each
// function with its own source text instead, so the logic is still visible in the dump.
function serializable(value) {
    if (typeof value === 'function') {
        return { __jsFunction: true, name: value.name || null, source: value.toString() };
    }
    if (Array.isArray(value)) {
        return value.map(serializable);
    }
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value)) out[key] = serializable(value[key]);
        return out;
    }
    return value;
}

const dump = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'tools/dump-config.js',
    sourceFiles: {
        config: 'js-src/server/config.js',
        constants: 'js-src/server/lib/definitions/constants.js',
        gunvals: 'js-src/server/lib/definitions/gunvals.js',
        presets: 'js-src/server/lib/definitions/presets.js',
        dotenv: 'js-src/server/lib/dotenv.js',
        envFile: 'js-src/server/.env',
    },
    env: {
        // Only the key NAMES are captured, never the values: they are shared-secret
        // permission tokens and an API key (see docs/config.md), not tuning values, and
        // a config dump is the wrong place to echo secrets even placeholder ones.
        keysDefinedInEnvFile: Object.keys(environment),
        note: 'Values are intentionally omitted. These are permission tokens / an API key ' +
            '(js-src/server/game/permissions.js, js-src/server/game/network/sockets.js), ' +
            'not config.js overrides -- config.js has no environment-variable overrides at all.',
    },
    config: serializable(config),
    constants: serializable(constants),
    gunvals: serializable(gunvals),
    presets: serializable(presets),
    counts: {
        configTopLevelKeys: Object.keys(config).length,
        constantsTopLevelKeys: Object.keys(constants).length,
        gunvalsPresetCount: Object.keys(gunvals).length,
        presetsTopLevelKeys: Object.keys(presets).length,
        envKeysDefined: Object.keys(environment).length,
    },
};

const outDir = path.join(REPO_ROOT, 'gen');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'config.json');
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2) + '\n');

console.log('Wrote ' + path.relative(REPO_ROOT, outPath).replace(/\\/g, '/'));
console.log('config top-level keys:    ' + dump.counts.configTopLevelKeys);
console.log('constants top-level keys: ' + dump.counts.constantsTopLevelKeys);
console.log('gunvals presets:          ' + dump.counts.gunvalsPresetCount);
console.log('presets top-level keys:   ' + dump.counts.presetsTopLevelKeys);
console.log('env keys defined in .env: ' + dump.env.keysDefinedInEnvFile.join(', '));
