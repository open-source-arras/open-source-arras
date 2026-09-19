"""Rewrites the line counts in docs/manifest.md from the actual js-src tree.

The manifest was written by reading the source, and its numbers did not survive
contact with `wc -l`: 139 of 163 rows were wrong, several by a factor of seventy
(lib/definitions/groups/tanks.js was listed at 156 lines against an actual 11,086).
The file inventory itself was right -- every path listed exists -- so it was the
arithmetic that was invented, not the structure.

Run this after any change to js-src/:

    python tools/refresh-manifest-counts.py

It reports how many rows it had to correct, which is the number worth watching: a
non-zero count after an unrelated change means someone edited the table by hand.
"""

import io, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = root + '/js-src/server'
SEP = chr(92)  # backslash, kept out of a literal so no shell layer can eat it


def count_lines(p):
    with open(p, 'rb') as f:
        data = f.read()
    if not data:
        return 0
    n = data.count(b'\n')
    if not data.endswith(b'\n'):
        n += 1
    return n


real = {}
for dirpath, _, files in os.walk(src):
    for fn in files:
        if fn.endswith('.js'):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, src).replace(SEP, '/')
            real[rel] = count_lines(full)

total_files = len(real)
total_lines = sum(real.values())

p = root + '/docs/manifest.md'
s = io.open(p, encoding='utf-8').read()

row = re.compile(r'^[|] (?P<path>[^|]+?) [|] (?P<lines>[0-9,~ ]+) [|](?P<rest>.*)$', re.M)

wrong, missing = [], []
checked = [0]


def fix(m):
    path = m.group('path').strip().strip('`')
    if path in ('Path', '------'):
        return m.group(0)
    if path not in real:
        missing.append(path)
        return m.group(0)
    checked[0] += 1
    claimed = m.group('lines').strip().replace(',', '').replace('~', '')
    actual = real[path]
    if claimed.isdigit() and int(claimed) != actual:
        wrong.append((path, int(claimed), actual))
    return '| %s | %d |%s' % (m.group('path').strip(), actual, m.group('rest'))


s = row.sub(fix, s)
s = re.sub(r'[*][*]Total Files Analyzed[*][*]: \d+',
           '**Total Files Analyzed**: %d' % total_files, s)
s = re.sub(r'[*][*]Total Lines of Code[*][*]: ~?[\d,]+',
           '**Total Lines of Code**: %s' % format(total_lines, ','), s)

# This note is rewritten on every run, so anchor on whichever version is currently in
# the file rather than on the one that happened to be there when this was written.
start = s.index('> **')
end = s.index(chr(10) * 3, start)
drift = ('Every row already matched the tree.' if not wrong else
         '**%d of the %d rows had drifted** and were corrected on this run.'
         % (len(wrong), checked[0]))

new_note = """> **The line counts in this document are generated, not written.** Refresh them with
> `python tools/refresh-manifest-counts.py` after any change to `js-src/`. %s
>
> They need generating because the originals were written by reading the source and did
> not survive contact with `wc -l`: 139 of 163 rows were wrong, several by a factor of
> seventy — `lib/definitions/groups/tanks.js` was listed at 156 lines against an actual
> 11,086 — and the file count read 170 against an actual %d. A stale number here is
> worse than an absent one, because it reads as a fact.
>
> The structural claims were checked separately and hold: the require graph is acyclic
> (`tools/require-graph.js`, 0 cycles over 117 edges) and the leaf-module list is
> essentially right (126 actual against 125 listed). Structure survived, arithmetic did
> not — about what you would expect of a document written by reading rather than by
> measuring.""" % (drift, total_files)
s = s[:start] + new_note + s[end:]

io.open(p, 'w', encoding='utf-8').write(s)

print("files on disk: %d, total lines: %s" % (total_files, format(total_lines, ',')))
print("rows checked: %d, wrong: %d, listed-but-absent: %d"
      % (checked[0], len(wrong), len(missing)))
for path, claimed, actual in sorted(wrong, key=lambda x: -abs(x[1] - x[2]))[:12]:
    print("   %-50s claimed %6d  actual %6d" % (path, claimed, actual))
if missing:
    print("listed but not on disk:", missing[:6])
