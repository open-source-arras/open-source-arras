// Builds tools/harness/js/ — a patched copy of js-src that can be booted headlessly
// and deterministically. js-src itself is never written to.
//
// The copy is disposable: delete it and re-run this script. Never hand-edit it, or the
// next refresh silently drops your change. Everything the harness needs is either a
// patch listed below or a runtime install in determinism.js.
//
//   node tools/harness/setup.js

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(repoRoot, 'js-src');
const dstRoot = path.join(__dirname, 'js');
const gitignore = path.join(repoRoot, '.gitignore');

// Each patch is an exact string swap. `find` must appear exactly `count` times or the
// script aborts — a silently-skipped patch would give a harness that runs but lies.
const PATCHES = [
  {
    file: 'server/game.js',
    why: "the 'ws' package is not installed and the harness never opens a socket; a bare " +
         "require would throw at module load. Guarded so startWebServer() still fails loudly " +
         "if anything ever calls it.",
    count: 1,
    find: 'const ws = require("ws");',
    replace: 'const ws = (() => { try { return require("ws"); } catch (e) { return null; } })(); // harness: optional',
  },
  {
    file: 'server/game/index.js',
    why: 'gives the harness a handle on the setInterval-driven game loop so it can be cancelled. ' +
         'The harness calls the tick body itself, in a for loop, so the tick count is exact.',
    count: 1,
    find: '        let gameLoop = setInterval(() => {',
    replace: '        let gameLoop = this.harnessGameLoopTimer = setInterval(() => {',
  },
];

// The harness re-implements the body of gameHandler.run()'s game loop (game/index.js:515)
// by hand. If that body changes upstream, the harness is quietly simulating something
// else, so record its shape and check it at run time.
const RUN_BODY_MARKERS = [
  'this.gameloop();',
  'syncedDelaysLoop();',
  'if (Config.enable_food) this.foodloop();',
  'global.gameManager.roomLoop();',
  'global.gameManager.gamemodeManager.request("quickloop");',
];

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error(`js-src not found at ${srcRoot}`);
    process.exit(1);
  }

  console.log(`copying ${path.relative(repoRoot, srcRoot)} -> ${path.relative(repoRoot, dstRoot)}`);
  rmrf(dstRoot);
  fs.cpSync(srcRoot, dstRoot, { recursive: true });

  let files = 0;
  (function count(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) count(path.join(dir, e.name));
      else files++;
    }
  })(dstRoot);
  console.log(`  ${files} files copied`);

  for (const p of PATCHES) {
    const target = path.join(dstRoot, p.file);
    const before = fs.readFileSync(target, 'utf8');
    const hits = before.split(p.find).length - 1;
    if (hits !== p.count) {
      console.error(`\nPATCH FAILED in ${p.file}`);
      console.error(`  expected ${p.count} occurrence(s) of:\n    ${p.find}`);
      console.error(`  found ${hits}. js-src has changed; update PATCHES in tools/harness/setup.js.`);
      process.exit(1);
    }
    fs.writeFileSync(target, before.split(p.find).join(p.replace));
    console.log(`patched ${p.file}: ${p.find.trim()}`);
  }

  // Sanity-check the loop body the runner mirrors.
  const runSrc = fs.readFileSync(path.join(dstRoot, 'server/game/index.js'), 'utf8');
  const missing = RUN_BODY_MARKERS.filter(m => !runSrc.includes(m));
  if (missing.length) {
    console.error('\nWARNING: gameHandler.run() no longer contains:');
    for (const m of missing) console.error(`  ${m}`);
    console.error('run.js mirrors that body by hand — reconcile it before trusting the output.');
    process.exit(1);
  }

  // The copy must stay out of git, but this script does not write .gitignore — other
  // agents work in this tree and a shared file is not ours to append to. Check and say
  // so instead. Match both "tools/harness/js/" and the anchored "/tools/harness/js/";
  // an earlier version compared only the unanchored form and would have appended a
  // duplicate line on every run.
  const ig = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf8') : '';
  const ignored = ig.split(/\r?\n/)
    .some(l => l.trim().replace(/^\//, '') === 'tools/harness/js/');
  if (ignored) {
    console.log('.gitignore already ignores tools/harness/js/');
  } else {
    console.warn('\nWARNING: .gitignore does not ignore tools/harness/js/.');
    console.warn('  Add "/tools/harness/js/" to it by hand — this script will not edit it.');
  }

  console.log('\nharness tree ready. run:  node tools/harness/run.js --seed 1 --ticks 100 --out out.jsonl');
}

main();
