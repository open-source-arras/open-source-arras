// Builds the project-internal require graph for js-src/server and reports cycles.
// Verification tool: the port's package layering assumes an acyclic dependency graph.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'js-src', 'server');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

// Resolve a require target the way Node would, but only for project-relative paths.
function resolve(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // built-in or node_modules
  let p = path.resolve(path.dirname(fromFile), spec);
  const tries = [p, p + '.js', path.join(p, 'index.js')];
  for (const t of tries) {
    try {
      if (fs.statSync(t).isFile()) return t;
    } catch (_) {}
  }
  return null;
}

const files = walk(ROOT);
const graph = new Map();
let unresolved = 0;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const deps = new Set();
  const re = /require\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const target = resolve(f, spec);
    if (target) deps.add(target);
    else unresolved++;
  }
  graph.set(f, [...deps]);
}

// Iterative DFS with an explicit stack; records every cycle it closes.
const WHITE = 0, GREY = 1, BLACK = 2;
const color = new Map(files.map(f => [f, WHITE]));
const cycles = [];

function dfs(start) {
  const stack = [[start, 0]];
  const pathStack = [start];
  color.set(start, GREY);

  while (stack.length) {
    const frame = stack[stack.length - 1];
    const [node, i] = frame;
    const deps = graph.get(node) || [];
    if (i >= deps.length) {
      color.set(node, BLACK);
      stack.pop();
      pathStack.pop();
      continue;
    }
    frame[1]++;
    const dep = deps[i];
    if (!graph.has(dep)) continue;
    const c = color.get(dep);
    if (c === GREY) {
      const at = pathStack.indexOf(dep);
      cycles.push([...pathStack.slice(at), dep]);
    } else if (c === WHITE) {
      color.set(dep, GREY);
      stack.push([dep, 0]);
      pathStack.push(dep);
    }
  }
}

for (const f of files) if (color.get(f) === WHITE) dfs(f);

const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');

const inDefs = f => rel(f).startsWith('lib/definitions/');
const scoped = files.filter(f => !inDefs(f));

console.log('files scanned:            ' + files.length);
console.log('  under lib/definitions:  ' + files.filter(inDefs).length);
console.log('  everything else:        ' + scoped.length);
console.log('unresolved rel requires:  ' + unresolved);

const edges = [...graph.values()].reduce((a, d) => a + d.length, 0);
console.log('internal require edges:   ' + edges);

const leaves = files.filter(f => (graph.get(f) || []).length === 0);
console.log('leaf modules (0 internal deps): ' + leaves.length);

console.log('\ncycles found: ' + cycles.length);
const seen = new Set();
for (const c of cycles) {
  const key = [...c].sort().join('|');
  if (seen.has(key)) continue;
  seen.add(key);
  console.log('  ' + c.map(rel).join('\n    -> '));
}
if (cycles.length === 0) console.log('  (none)');

console.log('\nleaf modules outside lib/definitions:');
for (const f of leaves.filter(x => !inDefs(x)).sort()) {
  console.log('  ' + rel(f));
}
