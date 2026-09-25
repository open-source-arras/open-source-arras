// Dumps js-src's 40 gamemode config files to gen/gamemodes.json.
//
// js-src/server/game/gamemodes/config/*.js are `module.exports = {...}` object
// literals, merged onto Config key-by-key at gamemode selection (game.js:282-298).
// Most of them are pure data (ffa.js is `module.exports = {}`), so this loads each
// one the way the server does -- after requiring loaders/global.js, which is what
// defines the TEAM_BLUE..TEAM_CYAN globals and global.Config that a few configs
// reference (e.g. assault_acropolis.js's `team_weights: { [TEAM_BLUE]: 1.1 }`,
// mothership.js's `Config.teams ?? ...`).
//
// A handful of files compute a field instead of stating it: growth.js's
// defineLevelSkillPoints is a function, and four files (mothership, tag, tdm,
// open_tdm) write `teams: Config.teams ?? <a Math.random() formula>`, which -- since
// require() evaluates the object literal once, at first require -- means a single
// frozen field, but that field is only good for one process's lifetime, not a
// static constant to bake into JSON. tile_testing.js similarly rolls a random
// spawn_message once at module-eval time.
//
// Rather than hardcode "these are the special ones", this requires every file
// repeatedly under identical conditions (Config.teams deleted, so nothing
// overrides the formula) with the module cache busted in between, and diffs the
// results field by field. A field that ever differs is proven non-deterministic --
// if it were static data, requiring the same file repeatedly would produce the
// same value every time -- and is replaced with a `__nonDeterministic` sentinel
// instead of one arbitrary draw. Everything else is trusted as data.
//
// Sample count matters here: two of these fields are a coin flip between exactly
// two outcomes (tdm.js, open_tdm.js: `Math.floor(Math.random()*2+1)*2` is 2 or 4),
// so two samples miss the non-determinism on a fair-coin tie half the time. 16
// samples brings that miss chance to 2^-15 per field, and requiring a plain object
// literal is cheap enough that 16x is not worth trading away for a smaller number.
//
// js-src is READ-ONLY: this script only requires/reads files under it, never
// writes there. Its only write is gen/gamemodes.json.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(REPO_ROOT, 'js-src', 'server');
const CONFIG_DIR = path.join(SERVER_DIR, 'game', 'gamemodes', 'config');

// Loads global.js the way loader.js:2-3,30-33 does: it has no module.exports, it
// works by assigning to Node's `global` object. Needed before any gamemode config
// file so that TEAM_BLUE etc. and Config exist.
require(path.join(SERVER_DIR, 'loaders', 'global.js'));

// Same function-to-sentinel convention as tools/dump-config.js, so a Go loader
// that has seen one has seen the other.
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

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

const configFiles = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.js')).sort();
const SAMPLES = 16;

const gamemodes = {};
const warnings = [];

function freshRequire(absPath) {
    delete Config.teams;
    delete require.cache[require.resolve(absPath)];
    return require(absPath);
}

for (const filename of configFiles) {
    const name = filename.slice(0, -3); // strip ".js"
    const absPath = path.join(CONFIG_DIR, filename);

    let firstRaw;
    try {
        firstRaw = freshRequire(absPath);
    } catch (e) {
        throw new Error(`dump-gamemodes: requiring ${filename} threw: ${e.stack}`);
    }
    const samples = [serializable(firstRaw)];
    for (let i = 1; i < SAMPLES; i++) samples.push(serializable(freshRequire(absPath)));

    const merged = {};
    const fieldNames = new Set(samples.flatMap(s => Object.keys(s)));
    for (const key of fieldNames) {
        const values = samples.map(s => s[key]);
        const allSame = values.every(v => deepEqual(v, values[0]));
        if (allSame) {
            merged[key] = values[0];
        } else {
            warnings.push(`${name}.${key}: differed across ${SAMPLES} identical-condition requires (samples: ${JSON.stringify(values)})`);
            merged[key] = {
                __nonDeterministic: true,
                note: 'This field is computed from Config.<x> ?? Math.random() (or similar) at ' +
                    'gamemode-select time, so it draws once per process and is not a static ' +
                    'constant. Do not trust any sample value -- port the formula by hand into ' +
                    'Go instead, executed with the room\'s injected *jsutil.Rand. See ' +
                    'docs/architecture.md, "Randomness must be injectable".',
                samples: values,
            };
        }
    }
    gamemodes[name] = merged;

    // Clean up so the next file's probe starts from the same baseline.
    delete Config.teams;
    delete require.cache[require.resolve(absPath)];
}

const dump = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'tools/dump-gamemodes.js',
    sourceDir: 'js-src/server/game/gamemodes/config/',
    note: 'Each top-level key is one gamemode config file (module.exports object), ' +
        'keyed by filename without ".js". A field wrapped in {"__nonDeterministic": ' +
        'true, ...} was proven to draw randomness at require time -- see this ' +
        'script\'s header comment.',
    gamemodes,
    count: configFiles.length,
};

const outDir = path.join(REPO_ROOT, 'gen');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'gamemodes.json');
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2) + '\n');

console.log('Wrote ' + path.relative(REPO_ROOT, outPath).replace(/\\/g, '/'));
console.log('gamemode config files: ' + configFiles.length);
if (warnings.length) {
    console.log('non-deterministic fields found (' + warnings.length + '):');
    for (const w of warnings) console.log('  ' + w);
} else {
    console.log('no non-deterministic fields found');
}
