// Forces Node onto V8's own pow, re-executing the process if necessary.
//
// Require this FIRST from anything that produces reference output for the Go port —
// before requiring any game code, and before computing anything.
//
//   require('../fdlibm-pow');   // adjust the path
//
// Why it is needed: `Math.pow` in Node is usually NOT V8's pow. v8/src/numbers/
// ieee754.cc forwards it to the platform's std::pow whenever the `use_std_math_pow`
// flag is set, and that flag defaults to true. So Math.pow is the Windows UCRT on this
// machine and glibc on a Linux box, and neither is correctly rounded — meaning the same
// Node version genuinely returns different numbers on different hosts.
//
// Measured on this tree: 218 of 3,208 sampled pow calls differ between the two, e.g.
//
//   Math.pow(21.722041396424174, 1.5)
//     101.23972469975526   default (host libm)
//     101.23972469975527   with --no-use-std-math-pow (V8's fdlibm)
//
// That is a real problem for this project, not a curiosity. The port is verified by
// diffing Go output against Node output, and internal/jsmath reproduces V8's fdlibm
// pow exactly. Capture reference values without this flag and the comparison is against
// whatever libm happened to be on the machine that ran it — so a trace generated on
// Windows would not match one generated on the CI box, and neither would match Go.
//
// Re-executing rather than just documenting the flag is deliberate: a flag you have to
// remember is a flag that gets forgotten, and the failure is silent — a one-ulp
// difference in a trace looks like a porting bug, not a missing command-line argument.

'use strict';

const FLAG = '--no-use-std-math-pow';

if (!process.execArgv.includes(FLAG)) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(
    process.execPath,
    [FLAG, ...process.execArgv, ...process.argv.slice(1)],
    { stdio: 'inherit' });

  if (r.error) {
    console.error(`could not re-exec node with ${FLAG}: ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status === null ? 1 : r.status);
}

module.exports = { FLAG };
