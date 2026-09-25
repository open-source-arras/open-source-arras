# arras.io binary wire protocol — byte-level specification

Contract document for the Node → Go server port. The browser client is unchanged, so the Go
server must produce byte-identical frames.

## File key for citations

| Short name | Path |
|---|---|
| `fasttalk.js` | `js-src/server/lib/fasttalk.js` |
| `protocol.js` | `js-src/public/client/protocol.js` |
| `sockets.js` | `js-src/server/game/network/sockets.js` |
| `socketinit.js` | `js-src/public/client/socketinit.js` |
| `canvas.js` | `js-src/public/client/canvas.js` |
| `entity.js` | `js-src/server/game/entities/entity.js` |
| `bulletEntity.js` | `js-src/server/game/entities/bulletEntity.js` |
| `turretEntity.js` | `js-src/server/game/entities/turretEntity.js` |
| `propEntity.js` | `js-src/server/game/entities/propEntity.js` |
| `gun.js` | `js-src/server/game/entities/gun.js` |
| `color.js` | `js-src/server/miscFiles/color.js` |
| `mockups.js` | `js-src/server/miscFiles/mockups.js` |
| `util.js` (server) | `js-src/server/lib/util.js` |
| `keyCommands.js` | `js-src/server/game/addons/keyCommands.js` |
| `chatCommands.js` | `js-src/server/game/addons/chatCommands.js` |
| `speedLoop.js` | `js-src/server/game/debug/speedLoop.js` |

All byte sequences below were confirmed by executing the unmodified `fasttalk.js` encoder and
decoder under Node 24 against the listed inputs; they are not inferred.

---

# 1. ENCODING

## 1.1 What the codec is

`encode` takes a **flat JavaScript array** and returns a `Uint8Array`
(`fasttalk.js:43`, `fasttalk.js:220`). There is no notion of a struct, a map, or a nested array
on the wire. Every message is a flat list of *blocks*, each block being a number, a boolean, or
a string. `decode` returns a flat array or `null` (`fasttalk.js:223`, `fasttalk.js:352`).

Booleans are folded into the numeric literals 0 and 1 during encoding and come back as
**numbers, not booleans** (`fasttalk.js:51-54`, `fasttalk.js:281`, `fasttalk.js:284`).

## 1.2 Frame anatomy

```
+---------------------------------------+-------------------------+
| header nibble stream (2 nibbles/byte)  | data section            |
+---------------------------------------+-------------------------+
```

* Header nibbles are packed **high nibble first**: `output[i>>1] = (upper << 4) | lower` where
  `upper = headerCodes[i]` (even index) and `lower = headerCodes[i+1]` (`fasttalk.js:163-167`).
* The nibble count is forced even by appending a `0b1111` pad (`fasttalk.js:159-160`), so the
  header stream always occupies exactly `headerCodes.length >> 1` bytes and the data section
  starts at that byte offset (`fasttalk.js:162`, `fasttalk.js:168`).
* Nibble 0 is always `0b1111`. It is emitted by the first loop iteration, because
  `lastTypeCode` is initialised to `0b1111` and no data type code ever equals it
  (`fasttalk.js:47`, `fasttalk.js:118`). For an empty message it comes from `fasttalk.js:140`.
* The header stream ends with `0b1111` (`fasttalk.js:158`), plus a second `0b1111` if padding
  was needed.
* Total frame length is `(headerCodes.length >> 1) + contentSize` (`fasttalk.js:162`).

Because nibble 0 is `0b1111` and nibble 1 is the type code of `message[0]` (the opcode, always
a string), **byte 0 of every server frame is `0xF9` (1-character opcode) or `0xFA`
(multi-character opcode)**. Confirmed: `encode(['u',1,2,3])` → `f9 12 2f 75 02 03`;
`encode(['RM'])` → `fa ff 52 4d 00`.

`decode` validates only the top nibble of byte 0: `if (data[0] >> 4 !== 0b1111) return null`
(`fasttalk.js:225-226`, `protocol.js:184`). An empty buffer yields `data[0] === undefined`,
`undefined >> 4 === 0`, so it returns `null`.

## 1.3 Type nibble table

| Nibble | Meaning | Data bytes | Encode site | Decode site |
|---|---|---|---|---|
| `0b0000` | literal `0` (also `false`, also `-0`) | 0 | `fasttalk.js:51-52` | `fasttalk.js:280-282` |
| `0b0001` | literal `1` (also `true`) | 0 | `fasttalk.js:53-54` | `fasttalk.js:283-285` |
| `0b0010` | uint8 | 1 | `fasttalk.js:60-62`, `:177` | `fasttalk.js:286-288` |
| `0b0011` | int8 stored as uint8; value = `byte - 0x100` | 1 | `fasttalk.js:71-73`, `:177` | `fasttalk.js:289-291` |
| `0b0100` | uint16 LE | 2 | `fasttalk.js:63-65`, `:181-183` | `fasttalk.js:292-296` |
| `0b0101` | int16 stored as uint16 LE; value = `u16 - 0x10000` | 2 | `fasttalk.js:74-76`, `:181-183` | `fasttalk.js:297-301` |
| `0b0110` | uint32 LE | 4 | `fasttalk.js:66-68`, `:187-189` | `fasttalk.js:302-308` |
| `0b0111` | int32-ish stored as uint32 LE; value = `u32 - 0x100000000` | 4 | `fasttalk.js:77-79`, `:187-189` | `fasttalk.js:309-315` |
| `0b1000` | IEEE-754 binary32 LE | 4 | `fasttalk.js:56-58`, `:191-194` | `fasttalk.js:316-322` |
| `0b1001` | one byte: `0` ⇒ `""`, else a single Latin-1 char | 1 | `fasttalk.js:92-94`, `:196-201` | `fasttalk.js:323-328` |
| `0b1010` | Latin-1 bytes, `0x00`-terminated | len+1 | `fasttalk.js:99-100`, `:202-207` | `fasttalk.js:329-338` |
| `0b1011` | UTF-16 code units LE, `0x0000`-terminated | 2·len+2 | `fasttalk.js:95-97`, `:208-216` | `fasttalk.js:339-348` |
| `0b1100` | repeat previous type **2** more times | 0 | `fasttalk.js:128` | `fasttalk.js:252` |
| `0b1101` | repeat previous type **3** more times | 0 | `fasttalk.js:130` | `fasttalk.js:252` |
| `0b1110` | next nibble `n` ⇒ repeat previous type **4+n** more times | 0 | `fasttalk.js:132-133` | `fasttalk.js:253-267` |
| `0b1111` | frame start marker / frame end marker / pad | 0 | `fasttalk.js:47`, `:158`, `:160` | `fasttalk.js:246-250` |

The doc comment at `fasttalk.js:10-28` describes this table; note its "1001 - single optional
non null byte string" line means "zero-or-one Latin-1 characters".

## 1.4 Type selection (exact decision tree)

Executed per block at `fasttalk.js:49-113`. Order matters; the first matching branch wins.

```
block === 0     || block === false  -> 0b0000            (fasttalk.js:51)
block === 1     || block === true   -> 0b0001            (fasttalk.js:53)
typeof block === 'number':                                (fasttalk.js:55)
    !Number.isInteger(block)
      || block <  -0x100000000
      || block >=  0x100000000      -> 0b1000 float32     (fasttalk.js:56-58)
    block >= 0:
        block < 0x100              -> 0b0010             (fasttalk.js:60)
        block < 0x10000            -> 0b0100             (fasttalk.js:63)
        block < 0x100000000        -> 0b0110             (fasttalk.js:66)
    block < 0:
        block >= -0x100            -> 0b0011             (fasttalk.js:71)
        block >= -0x10000          -> 0b0101             (fasttalk.js:74)
        block >= -0x100000000      -> 0b0111             (fasttalk.js:77)
typeof block === 'string':                                (fasttalk.js:82)
    scan every UTF-16 code unit:                          (fasttalk.js:84-91)
        charAt(i) > '\xff'         -> hasUnicode = true
        charAt(i) === '\x00'       -> throw new Error('Null containing string')
    !hasUnicode && length <= 1     -> 0b1001             (fasttalk.js:92)
    hasUnicode                     -> 0b1011             (fasttalk.js:95)
    else                           -> 0b1010             (fasttalk.js:98)
anything else                      -> throw "Unencodable data type"  (fasttalk.js:102-112)
```

Key consequences for a Go port:

* **The tag is chosen from the runtime value, not from a declared field type.** The same logical
  field is 0 data bytes on one frame, 1 byte on the next and 4 bytes on the one after. A Go port
  must run this identical decision tree on a `float64` for every block. In particular
  `Number.isInteger` is true for any `float64` with no fractional part, including `1e21`, and
  false for `NaN` and `±Inf`.
* Integer boundaries are inclusive/exclusive exactly as written. `4294967295` ⇒
  `0b0110` (`f6 ff ff ff ff ff`); `4294967296` ⇒ float32 (`f8 ff 00 00 80 4f`). `-4294967296` ⇒
  `0b0111` (`f7 ff 00 00 00 00`); `-4294967297` ⇒ float32, and decodes back as `-4294967296`
  (precision lost).
* The negative encodes write the raw value into a `Uint8Array` / `Uint16Array` / `Uint32Array`
  slot (`fasttalk.js:177`, `:181`, `:187`), which applies JS `ToUint8`/`ToUint16`/`ToUint32`
  (two's-complement wraparound). The decoder subtracts the modulus back
  (`fasttalk.js:290`, `:300`, `:314`). Verified: `-1` → `f3 ff ff`; `-256` → `f3 ff 00`;
  `-257` → `f5 ff ff fe`.

## 1.5 Number compression and the exact precision loss

There is **no fixed-point quantisation inside the codec**. All lossy packing happens in two
places:

**(a) binary32 truncation.** Any number that is not an exact integer, or that lies outside
`[-2^32, 2^32)`, is stored as a single-precision float (`fasttalk.js:56-58`, `:191-194`).
This is `Float32Array` assignment, i.e. IEEE-754 round-to-nearest-even from binary64 to
binary32: 24-bit significand, 8-bit exponent. Measured:

| Input | Bytes | Decodes to |
|---|---|---|
| `0.5` | `00 00 00 3f` | `0.5` (exact) |
| `0.1` | `cd cc cc 3d` | `0.10000000149011612` |
| `1e21` | `27 d7 58 62` | `1.0000000200408773e+21` |
| `Date.now()` ≈ `1.788e12` | `2b 3f d0 53` | off by up to **131072 ms** (ulp = 2^17 at that magnitude) |
| `Infinity` | `00 00 80 7f` | `Infinity` |
| `-Infinity` | `00 00 80 ff` | `-Infinity` |
| `NaN` (literal) | `00 00 c0 7f` | `NaN` |
| `Math.sqrt(-1)` | `00 00 c0 ff` | `NaN` (sign bit set — see OPEN QUESTION 1) |

Every entity `x`, `y`, `vx`, `vy`, `facing`, `vfacing`, `size`, `alpha` (pre-quantisation),
camera `x`/`y`/`vx`/`vy`/`fov`, and every gun `power`/`length`/`width`/`aspect`/`angle`/
`direction`/`offset` goes through this path whenever it is fractional. Positions in a room of
±22500 units keep ~2 mm of resolution; that is the physics precision budget for the port.

**(b) Message-layer quantisation, applied before `encode` sees the value.** These are the
"aggressive packs" and they are *asymmetric between fields*:

| Quantity | Server transform | Client inverse | Site |
|---|---|---|---|
| `health` | `Math.ceil(65535 * health)` | `/ 65535` | `sockets.js:1318`, `:1339`; `socketinit.js:520`, `:525` |
| `shield` | `Math.round(65535 * shield)` | `/ 65535` | `sockets.js:1319`, `:1340`; `socketinit.js:521`, `:526` |
| `alpha` | `Math.round(255 * alpha)` | `/ 255` | `sockets.js:1320`, `:1341`; `socketinit.js:535` |
| minimap x | `util.clamp(Math.floor(256 * x / room.width), -128, 127)` | `* gameWidth / 255` | `sockets.js:1812`, `:1829`, `:1844`; `socketinit.js:773`, `:786` |
| minimap y | `util.clamp(Math.floor(256 * y / room.height), -128, 127)` | `* gameHeight / 255` | `sockets.js:1813`, `:1830`, `:1845`; `socketinit.js:774`, `:787` |
| minimap size | `Math.round(my.SIZE)` | none | `sockets.js:1815` |
| leaderboard score | `Math.round(entry.skill.score)` | none | `sockets.js:1749` |
| lifetime (death) | `Math.floor((util.time() - begin) / 1000)` | none | `sockets.js:1254` |
| skill amounts | 20-char hex string, 2 hex digits per stat | `parseInt(slice, 16)` | `sockets.js:890-904`; `socketinit.js:722-733` |
| ping pong | `ping.toFixed(1)` — **a string** | implicit numeric coercion | `sockets.js:337`; `socketinit.js:1047` |
| command target | `Math.round(global.target.x / ratio)` | — | `socketinit.js:1305` |

`ceil` for health vs `round` for shield is not a typo you may normalise: a health of 1e-9 must
transmit as `1`, a shield of 1e-9 must transmit as `0`.

The minimap scale is **encoded with 256 and decoded with 255** (`sockets.js:1812` vs
`socketinit.js:773`). This is a permanent 0.39 % positional bias, and it must be reproduced.

## 1.6 Strings

Three encodings, chosen by content, never by declaration.

* **`0b1001`** — length 0 or 1 and all code units ≤ 0xFF. One byte. Byte `0` means the empty
  string; any other byte is one Latin-1 character (`fasttalk.js:196-201`, `:323-328`).
  `encode([""])` → `f9 ff 00`; `encode(["u"])` → `f9 ff 75`.
* **`0b1010`** — length ≥ 2 and all code units ≤ 0xFF. The low byte of each code unit, then one
  `0x00` (`fasttalk.js:202-207`). This is **Latin-1, not UTF-8**: `"\xe9\xe9"` → `e9 e9 00`.
  A Go port holding UTF-8 strings must convert, and must classify by UTF-16 code unit value,
  not by byte value.
* **`0b1011`** — any code unit > 0xFF anywhere in the string. Every UTF-16 code unit as a
  little-endian pair, then `00 00` (`fasttalk.js:208-216`). Surrogate pairs are emitted as two
  units: `"\u{1F600}"` → `3d d8 00 de 00 00`. Lone surrogates round-trip unchanged.

Length is **not** prefixed; strings are NUL-terminated. `0b1010` is terminated by one zero byte,
`0b1011` by two.

A string containing `U+0000` **throws** `new Error('Null containing string')` before any bytes
are produced (`fasttalk.js:87-90`). This aborts the whole frame, not just the block.

The scan uses `block.charAt(i) > '\xff'` (`fasttalk.js:85`), a single-character string
comparison, which is equivalent to `charCodeAt(i) > 0xff`.

## 1.7 Run-length compression of the header stream

`repeatTypeCount` counts **extra** repeats beyond the first element of a run
(`fasttalk.js:115-138`, flushed again at `fasttalk.js:140-157`). For each run the encoder emits
the literal type nibble, then:

| `repeatTypeCount` | Nibbles emitted after the literal |
|---|---|
| 0 | (nothing) |
| 1 | the literal type nibble again (`fasttalk.js:125-126`) |
| 2 | `0b1100` (`fasttalk.js:127-128`) |
| 3 | `0b1101` (`fasttalk.js:129-130`) |
| 4 … 19 | `0b1110`, then `repeatTypeCount - 4` (`fasttalk.js:131-134`) |
| > 19 | while `>19`: emit `0b1110`, `15` and subtract 19; then apply the rows above (`fasttalk.js:120-124`) |

Note the `repeatTypeCount === 1` case emits the literal nibble a second time rather than a
repeat marker — the two are the same size and a port must pick the same one to stay
byte-identical. Note also that the `> 19` loop always leaves a remainder in `[1,19]`, never 0,
so the trailing `if/else if` chain is exhaustive.

Verified emissions (`0b0010` = uint8 run):

| Run length | Header bytes |
|---|---|
| 2 | `f2 2f` |
| 3 | `f2 cf` |
| 4 | `f2 df` |
| 5 | `f2 e0 ff` |
| 23 | `f2 ef df` |
| 24 | `f2 ef e0 ff` |
| 40 | `f2 ef ef 2f` |

## 1.8 Decoder algorithm

`fasttalk.js:223-353`, identical in `protocol.js:182-295`.

Header walk (`fasttalk.js:232-275`):

```
lastTypeCode = 0b1111 ; index = 0 ; consumedHalf = true
loop:
    if index >= data.length: return null                 (fasttalk.js:233)
    if consumedHalf:  code = data[index] & 0x0f ; index++
    else:             code = data[index] >> 4
    consumedHalf = !consumedHalf
    if (code & 0b1100) == 0b1100:
        if code == 0b1111: { if consumedHalf: index++ ; break }
        repeat = code - 10
        if code == 0b1110: read one more nibble (same rule), repeat += it
        push lastTypeCode `repeat` times
    else:
        push code ; lastTypeCode = code
```

`consumedHalf` starts `true`, so the loop begins by reading the **low** nibble of byte 0 —
the high nibble was already consumed as the version check at `fasttalk.js:225`.

**Indentation trap.** `fasttalk.js:246-250` reads:

```js
if (typeCode === 0b1111) {
    if (consumedHalf)
        index++
        break
}
```

JS ignores the indentation: `break` is **unconditional**. The client writes the same thing on
one line (`protocol.js:201-202`), so both sides agree. A Go port must not treat `break` as
conditional.

Data walk (`fasttalk.js:277-350`): a plain switch over the recorded headers, advancing `index`
per the table in §1.3. **There is no bounds checking whatsoever in the data walk** — see §4.

## 1.9 Endianness

The codec has no explicit byte-order logic. It aliases one `ArrayBuffer` through
`Uint32Array`/`Float32Array`/`Uint8Array` views (`fasttalk.js:3-8`, `protocol.js:2-6`) and
copies bytes with `output.set(c32, index)` (`fasttalk.js:188`, `:193`). The wire order is
therefore **whatever the host is** — little-endian on every current deployment target, and
little-endian in every measured frame above. See OPEN QUESTION 2.

## 1.10 Nesting: there is none

Structure is carried three ways, all at the message layer:

1. **Explicit count prefixes** — `visible.length` (`sockets.js:1656`), `data.guns.length`
   (`sockets.js:1351`), `data.turrets.length` (`sockets.js:1357`), `o.upgrades.length`
   (`sockets.js:995`), delta `deletesLength`/`updatesLength` (`sockets.js:1724`),
   `killCount.killers.length` (`sockets.js:1260`).
2. **A bitmask** — the GUI block (`sockets.js:974-1030`, `socketinit.js:674-690`).
3. **JSON strings** — room setup, mockups, scores, chat, ads, screen shake, daily tank. These
   are `JSON.stringify`ed into a single string block and reparsed client-side.

Turret recursion is by pre-order flattening: `output.push(...this.flatten(data.turrets[i]))`
(`sockets.js:1358`), consumed by a recursive `process()` (`socketinit.js:614-627`).

---

# 2. ASYMMETRY

## 2.1 The two codecs are algorithmically identical

Normalising whitespace, comments and semicolons, `fasttalk.js:43-221` and `protocol.js:8-181`
differ **only** in that the server wraps the `case 0b1001` body in a block (`fasttalk.js:197`,
`:200`) and the client does not (`protocol.js:158-161`). `fasttalk.js:223-353` and
`protocol.js:182-295` are character-for-character identical after normalisation. There is no
codec-level divergence. Every asymmetry below is either a round-trip property of the codec or a
message-layer disagreement.

## 2.2 Values that do not survive a round trip

| Input | Comes back as | Why | Cite |
|---|---|---|---|
| `true` / `false` | `1` / `0` (numbers) | folded into the literal tags | `fasttalk.js:51-54` vs `:281`, `:284` |
| `-0` | `+0` | `-0 === 0` is true, so it takes the `0b0000` branch before the float branch | `fasttalk.js:51` |
| non-integer number | nearest binary32 | `Float32Array` store | `fasttalk.js:191-194` |
| integer with \|v\| ≥ 2^32 | nearest binary32 | range guard | `fasttalk.js:56` |
| `NaN` | `NaN`, but bit pattern depends on the producing operation | see OPEN QUESTION 1 | `fasttalk.js:192` |
| `-4294967297` | `-4294967296` | float32 rounding at the boundary | measured |

Anything else — `undefined`, `null`, arrays, objects, `BigInt`, `Symbol` — **throws**
(`fasttalk.js:102-112`). Note the throw value is the bare string `"Unencodable data type"`
(`fasttalk.js:112`), not an `Error`, while the NUL-string case throws a real `Error`
(`fasttalk.js:89`). Neither call site wraps `talk()` in a try/catch (`sockets.js:2063-2067`),
so an unencodable field takes down the tick.

## 2.3 The decoder accepts frames the encoder can never produce

These matter because the Go **server** decodes attacker-controlled client frames.

1. **A repeat marker before any literal type.** `lastTypeCode` is seeded to `0b1111`
   (`fasttalk.js:229`); a leading `0b1100`/`0b1101`/`0b1110` pushes `0b1111` into `headers`.
   The data-walk switch (`fasttalk.js:279-349`) has no `0b1111` case, so those blocks are
   **silently dropped and consume no data bytes**. Measured: `decode([0xfc, 0xff])` → `[]`,
   `decode([0xfe, 0x3f, 0xff])` → `[]`. The array length the dispatcher checks
   (`sockets.js:203`, `:249`, `:322`, `:331`, `:342`, `:360`, `:409`, `:443`, `:467`, `:503`)
   is therefore attacker-controllable independently of the header count.
2. **Truncated data section.** No bounds check exists after the header walk. Results measured:

   | Frame | Result |
   |---|---|
   | `f2 ff` (uint8, no data) | `[undefined]` — not a number |
   | `f9 ff` (1-char string, no data) | `["\u0000"]` — **a NUL-containing string** |
   | `fa ff 41 42` (unterminated Latin-1) | `["AB"]` — terminated by running off the buffer |
   | `fb ff 41 00` (unterminated UTF-16) | `["A"]` |
   | `f4 ff 01` (uint16, 1 byte) | `[1]` — missing byte reads as 0 |
   | `f8 ff 01 02` (float, 2 bytes) | `[7.188661121986312e-43]` |

   The `undefined` case is live: `sockets.js:207` calls `m[0].toString()` on the `k` packet
   with no try/catch, so `encode(['k'])`-shaped frames with a stripped data byte throw a
   `TypeError` out of the message handler. The `"\u0000"` case is worse — that string, if it
   ever reaches `encode` again (e.g. echoed into a chat message), throws at `fasttalk.js:89`.
3. **Unterminated header stream.** `decode([0xf2, 0x22])` → `null` (`fasttalk.js:233`), and
   `sockets.js:193-196` kicks. This path is correct.

## 2.4 Message-layer disagreements

These are the ones that produce "physics bugs".

| # | Disagreement | Server | Client |
|---|---|---|---|
| 1 | **Leaderboard delta compares 7 fields but transmits 8.** `new Delta(7, …)` sets `dataLength = 7` (`sockets.js:1852`, `:1907`, `:1922`, `:1934`) and the change detector loops `i < this.dataLength` (`sockets.js:1694`), but every entry's `data` array has 8 elements (`sockets.js:1748-1757`, `:1780-1789`, `:1859-1868`, `:1880-1889`) and all 8 are pushed (`sockets.js:1700`, `:1710`, `:1720`, `:1725`). The client reads 8 (`Integrate(8)`, `socketinit.js:286`, `:137`). Net effect: element 7 (`renderOnLeaderboard`) **is on the wire but is invisible to change detection**, so a frame where only that field changes emits nothing. A Go port that compares all 8 will emit extra frames. | `sockets.js:1694` | `socketinit.js:286` |
| 2 | **`u` camera-only discriminator is `== true`, not `=== true`.** Server sends the boolean `true` as `m[0]` for the camera-only form (`sockets.js:1638`) — which arrives as the **number 1**. Client tests `if (m[0] == true)` (`socketinit.js:961`). The full form puts `lastCycle` in the same slot (`sockets.js:1648`), and `lastCycle = util.time()` = ms since server start (`js-src/server/game/index.js:278`, `util.js:136-138`). If a full `u` frame is built during millisecond 1 of server uptime, the client parses it as camera-only and discards the rest of the packet. | `sockets.js:1638`, `:1648` | `socketinit.js:961` |
| 3 | **Nameplate fields are written only in the full-entity branch but read for any non-turret.** `flatten` appends `name`,`score` inside the `else` branch (`sockets.js:1343-1348`), i.e. only when `type & 0x01` and `type & 0x10` are both clear. `process` reads them for **any** record that is not a turret whenever `type & 0x04` (`socketinit.js:538-541`). Safe today only because `bulletEntity.camera()` hardcodes `type: 0x10` with no 0x04 (`bulletEntity.js:363`) and `Entity.camera()` only ever ORs 0x02 and 0x04 (`entity.js:725-726`). See OPEN QUESTION 3. | `sockets.js:1343` | `socketinit.js:538` |
| 4 | **`M` sends the mockup index as a number on one path and a string on the other.** `sockets.js:1444` sends `parseInt(splittedIndex)` (a number, tag `0b0010`/`0b0100`); `sockets.js:2222` sends `mockupData[i].index`, which is a **string** (`mockups.js:7` copies `e.index`, which `entity.js:194` forces with `.toString()`; `sockets.js:684` and `:1470` compare it with `===` against a template string). Different bytes for the same field. The client is indifferent (`global.mockups[m[0]]` coerces, `socketinit.js:957`). A Go port must reproduce both. | `sockets.js:1444` vs `:2222` | `socketinit.js:957` |
| 5 | **`p` pong payload is a string.** `socket.talk('p', ping.toFixed(1))` (`sockets.js:337`) — `toFixed` returns a `String`, so the wire tag is `0b1010`, not a number. The client subtracts it (`socketinit.js:1047`), relying on JS coercion. | `sockets.js:337` | `socketinit.js:1047` |
| 6 | **`svInfo` mspt is a string.** `(sum).toFixed(1)` (`speedLoop.js:24`). | `speedLoop.js:24` | `socketinit.js:880` |
| 7 | **`R` and `r` carry different tile shapes.** `R` tiles are `{color, visibleOnBlackout, image}` (`sockets.js:287-293`); `r` tiles are `{color, image}` (`sockets.js:37-42`). Both land in `global.roomSetup` (`socketinit.js:853`, `:869`), so after an `r` the `visibleOnBlackout` field is gone. | `sockets.js:37`, `:287` | `socketinit.js:853`, `:869` |
| 8 | **`statsdata` is written forward and read backward.** Server pushes stat titles/caps in `["atk","hlt","spd","str","pen","dam","rld","mob","rgn","shi"]` order (`sockets.js:836`, `:864-869`); client assigns them to `gui.skills[9]` down to `gui.skills[0]` (`socketinit.js:716-720`). The paired `skills` hex string is built in the reverse order (`sockets.js:892-902`, comment: "these have to be in reverse order") and read forward (`socketinit.js:724-733`), so the two agree — but only because of the double reversal. | `sockets.js:864` | `socketinit.js:716` |
| 9 | **The client's malformed-packet guard is dead code.** `decode` returns `null` on failure (`fasttalk.js:226`, `:234`, `:255`), but the client tests `if (m === -1)` (`socketinit.js:823`). A malformed frame therefore reaches `m.shift()` on `null` and throws a `TypeError` inside an async handler. The server's equivalent check is correct (`sockets.js:193`). | `sockets.js:193` | `socketinit.js:823` |
| 10 | **`perspective` mutates the shared cached array before its first `slice`.** `sockets.js:1388` writes `data[18]` directly into `entity.flattenedPhoto` (cached at `sockets.js:1611-1613`); only the later branches copy first (`sockets.js:1391`, `:1400`, `:1410`). One viewer's invisibility alpha therefore leaks into every other viewer's frame for the rest of that tick. | `sockets.js:1387-1389` | — |
| 11 | **Autospin twiggle override is layout-blind.** `sockets.js:1396` sets `data[10] = 1`, which is `twiggle` in the full layout but `layer` in the limited layout (`sockets.js:1305-1321`). The guard at `sockets.js:1390` checks `player.body.id === e.master.id` without an `e.limited` test, unlike `sockets.js:1402` and `:1411`. | `sockets.js:1396` | `socketinit.js:510` |
| 12 | **`DTAST` falls through into `NWB`.** The `case "DTAST"` block at `sockets.js:718-727` has no `break`, so handling a `DTAST` also sets `socket.status.forceNewBroadcast = true` (`sockets.js:729`), forcing a full `RM`/`RL`/reset broadcast on the next 250 ms tick. | `sockets.js:727` | — |
| 13 | **`resolveResponse` is a live intercept for a mechanism nothing uses.** Every inbound frame is first offered to `socket.resolveResponse(m[0], m)` (`sockets.js:198`, `:2111-2118`), but `socket.awaitResponse` (`sockets.js:2102`) is never called anywhere in the tree. The intercept can never fire. | `sockets.js:198` | — |
| 14 | **`socket.anon` is never assigned.** `sockets.js:1985` and `:1993` branch on it; nothing in `js-src` writes it, so the `[0, 0]` leaderboard-suppression form is unreachable. | `sockets.js:1985` | — |
| 15 | **The `flatten` comment lies about the opcode.** `sockets.js:1290` says the first entry "will be removed in the perspective method"; `perspective` (`sockets.js:1385-1416`) removes nothing. `data.type` **is** on the wire and the client reads it first (`socketinit.js:450`). | `sockets.js:1290` | `socketinit.js:450` |
| 16b | **`forceNewBroadcast` is never cleared.** `sockets.js:729` sets it and `:1996` reads it, sending an `RM` and an `RL` and arming `needsNewBroadcast` again. No line in `js-src` sets it back to false, so one `NWB` (or one `DTAST`, via the fall-through in row 12) puts that socket into a full minimap-and-leaderboard resend four times a second for the rest of its connection. Measured: 812 wire values instead of 79. | `sockets.js:729`, `:1996` | — |
| 16c | **The leaderboard finder is handed the viewer's body id and never reads it.** `sockets.js:1966` computes it, guarded by exactly the modes where every row shares one flat colour, and `makeLeaderboardList(list, args)` never mentions `args`. Two sockets on one board get byte-identical rows. | `sockets.js:1966`, `:1729` | — |
| 16 | **`vfacing` is read twice.** `socketinit.js:495` computes `vfacing` from the facing delta, then `socketinit.js:496` immediately overwrites it with the next stream value (same again at `:508-509`). Only one `vfacing` is on the wire (`sockets.js:1315`, `:1332`); the dead computation does not shift the stream. | `sockets.js:1315` | `socketinit.js:495-496` |

## 2.5 Opcodes handled by exactly one side

| Opcode | Direction | Status |
|---|---|---|
| `gSvInfo` | S→C | Client parses it (`socketinit.js:883-885`); **no server code sends it**. |
| `I` | S→C | Client parses it (`socketinit.js:1087-1093`); **no server code sends it**. |
| `AS` | S→C | Client parses it (`socketinit.js:1237-1240`); **no server code sends it**. |
| `DS` | S→C | Client parses it (`socketinit.js:1241-1244`); **no server code sends it**. |

Verified by grepping `talk(` across `js-src/server` and `js-src/index.js`. Every other opcode
the server emits has a client handler, and every opcode the client emits has a server handler.

## 2.6 Opcode letters are reused across directions

`p`, `S`, `M`, `T`, `t`, `DTA`, `DTAD`, `DTAST` all exist in both directions with different
payloads. `M` is a mockup push server→client (`sockets.js:1444`) and a chat message
client→server (`sockets.js:638`); `t` is a server transfer instruction (`sockets.js:2041`) and a
client toggle request (`sockets.js:407`). Dispatch must be direction-scoped.

---

# 3. MESSAGES

Positions below are **after** the opcode has been shifted off (`sockets.js:201`,
`socketinit.js:827`). "Wire tag" is the nibble the value will take given its runtime type;
where the value is variable, the possibilities are listed.

## 3.1 Server → client

25 opcodes are constructed in `sockets.js`; 5 more (`Em`, `RE`, `CC`, `SH`, `svInfo`) are
constructed elsewhere in the server. **30 total.**

### `W` — connection accepted (`sockets.js:2235`)

| # | Field | Value | Wire tag | Client |
|---|---|---|---|---|
| 0 | ok | literal `true` | `0b0001` | `socketinit.js:828-839` |

### `w` — key accepted, ask for room (`sockets.js:205`)

| # | Field | Value | Wire tag | Client |
|---|---|---|---|---|
| 0 | ok | literal `true` | `0b0001` | `socketinit.js:843-847` |

### `R` — full room setup (`sockets.js:283-301`)

| # | Field | Source | Wire tag | Client |
|---|---|---|---|---|
| 0 | width | `room.width` | int | `socketinit.js:849` |
| 1 | height | `room.height` | int | `socketinit.js:850` |
| 2 | tile grid JSON | `JSON.stringify(setup.map(… {color, visibleOnBlackout, image}))` | `0b1010`/`0b1011` | `socketinit.js:853` |
| 3 | server start JSON | `JSON.stringify(util.serverStartTime)` — epoch ms as a JSON number in a string | `0b1010` | `socketinit.js:854` |
| 4 | roomSpeed | `gameManager.roomSpeed` (`Config.game_speed`, default `1`) | `0b0001` when 1 | `socketinit.js:856` |
| 5 | blackout JSON | `JSON.stringify({active, color})` | `0b1010` | `socketinit.js:857-859` |
| 6 | roundArena | `Config.round_arena` (boolean) | `0b0000`/`0b0001` | `socketinit.js:860` |

Field 3 is a string precisely so the epoch value avoids the float32 path. Do not "optimise" it
into a number.

### `r` — room refresh (`sockets.js:33-43`)

| # | Field | Source | Client |
|---|---|---|---|
| 0 | width | `room.width` | `socketinit.js:865` |
| 1 | height | `room.height` | `socketinit.js:866` |
| 2 | tile grid JSON | `{color, image}` only — no `visibleOnBlackout` | `socketinit.js:869` |

### `c` — force camera (`sockets.js:1284`)

| # | Field | Source | Wire tag |
|---|---|---|---|
| 0 | x | `socket.camera.x` | float32 or int |
| 1 | y | `socket.camera.y` | float32 or int |
| 2 | fov | `socket.camera.fov` (2000 at this call site) | `0b0100` |

Client: `socketinit.js:886-892`.

### `u` — uplink, camera-only form (`sockets.js:1636-1641`)

| # | Field | Source | Wire tag |
|---|---|---|---|
| 0 | flag | literal `true` | `0b0001` |
| 1 | x | `camera.x` | float32/int |
| 2 | y | `camera.y` | float32/int |

Sent only from `gazeUpon(true)`, i.e. from `newPlayer` (`sockets.js:1123`).
Client: `socketinit.js:961-970`.

### `u` — uplink, full form (`sockets.js:1646-1658`)

| # | Field | Source | Wire tag | Client |
|---|---|---|---|---|
| 0 | lastCycle | `room.lastCycle` = `util.time()` ms since start | int | `socketinit.js:971` |
| 1 | camera x | `camera.x` | float32/int | `:972` |
| 2 | camera y | `camera.y` | float32/int | `:973` |
| 3 | fov | `fovNow` | float32/int | `:974` |
| 4 | camera vx | `camera.vx` | float32/int | `:975` |
| 5 | camera vy | `camera.vy` | float32/int | `:976` |
| 6 | scoping | boolean | `0b0000`/`0b0001` | `:977` |
| 7… | **GUI block** (§3.3.4), always ≥ 1 element | | | `socketinit.js:1000` |
| … | entity count | `visible.length` | int | `socketinit.js:639` |
| … | `count` × **entity record** (§3.3.1) | | | `socketinit.js:640` |

The client slices from index 7 (`socketinit.js:979`) and hands the remainder to
`convert.gui()` then `convert.data()` (`socketinit.js:999-1001`), so the GUI block must
immediately precede the entity count with nothing between them.

### `b` — minimap + leaderboard broadcast (`sockets.js:1981-1986` reset form, `:1989-1994` delta form)

Three concatenated delta blocks (§3.3.5), in this order and no separators:

| Block | `dataLength` on the wire | Server | Client |
|---|---|---|---|
| minimap, all non-team entities | 5 | `sockets.js:1797-1821` | `Integrate(5)`, `socketinit.js:284` |
| minimap, team or all-teams tanks | 3 | `sockets.js:1822-1851` | `Integrate(3)`, `socketinit.js:285` |
| leaderboard | **8** (see §2.4 #1) | `sockets.js:1852-1946` | `Integrate(8)`, `socketinit.js:286` |

If `team` is falsy the middle block is the literal `[0, 0]` (`sockets.js:1984`, `:1992`).

### `RM` / `RL` — reset minimap / leaderboard (`sockets.js:1980`, `:1997`, `:1998`)

No payload. Client: `socketinit.js:1227-1233`.

### `M` — mockup (`sockets.js:1444`, `:2222`)

| # | Field | Source | Wire tag |
|---|---|---|---|
| 0 | index | number at `:1444`, string at `:2222` | `0b0010`/`0b0100` or `0b1010` |
| 1 | mockup JSON | `JSON.stringify(mockup)` | `0b1010`/`0b1011` |

Client bails on a falsy field 1 (`socketinit.js:956`).

### `F` — death report (`sockets.js:1523`, payload built at `sockets.js:1252-1262`)

| # | Field | Source | Client |
|---|---|---|---|
| 0 | score | `body.skill.score` | `socketinit.js:1054` |
| 1 | lifetime seconds | `Math.floor((util.time() - begin) / 1000)` | `:1056` |
| 2 | respawn delay | `Config.respawn_delay` | `:1058` |
| 3 | solo kills | `killCount.solo` | `:1073` |
| 4 | assists | `killCount.assists` | `:1074` |
| 5 | boss kills | `killCount.bosses` | `:1075` |
| 6 | polygon kills | `killCount.polygons` | `:1076` |
| 7 | killer count | `killCount.killers.length` | `:1078` |
| 8… | killer indices (strings, `entity.js:1138`) | | `:1079` |

### `m` — popup message (`sockets.js:28`, `:264`; `entity.js:151`; many addon sites)

| # | Field | Wire tag |
|---|---|---|
| 0 | duration ms (`Config.popup_message_duration` = 10000) | `0b0100` |
| 1 | text | `0b1001`/`0b1010`/`0b1011` |

Client swaps the order: `global.createMessage(m[1], m[0])` (`socketinit.js:943`).

### `Em` — multi-line popup (`chatCommands.js:26`, `:39`, `:89`, `:207`; `keyCommands.js:86`, `:532`, `:646`, `:720`)

Same as `m` but field 1 is `JSON.stringify(lines)`. Client: `socketinit.js:945-947`.

### `message` — blocking screen message (`sockets.js:227`, `:231`, `:262`)

| # | Field |
|---|---|
| 0 | text |

Client: `socketinit.js:1234-1236`.

### `S` — clock sync bounce (`sockets.js:328`)

| # | Field | Source |
|---|---|---|
| 0 | the client's own timestamp, echoed | `m[0]` from the inbound `S` |
| 1 | server time | `util.time()` |

Client: `socketinit.js:893-941`.

### `p` — pong (`sockets.js:337`)

| # | Field | Wire tag |
|---|---|---|
| 0 | `ping.toFixed(1)` — **string** | `0b1010` |

### `T` — tank-tree ack (`sockets.js:694`)

No payload. Client: `socketinit.js:1216-1219`.

### `z` — name colour (`sockets.js:1170`)

| # | Field |
|---|---|
| 0 | `body.nameColor` (string, e.g. `"#ff0000"`) |

Client: `socketinit.js:1224-1226`.

### `t` — transfer to another server (`sockets.js:2041`)

| # | Field |
|---|---|
| 0 | host, scheme stripped |
| 1 | transfer id — 8 hex chars (`sockets.js:2025`) |

Client: `socketinit.js:1190-1215`.

### `K` — kick, sent via `lastWords` (`sockets.js:53`, `:79`, `:2005`)

No payload; the socket is terminated immediately after the send (`sockets.js:2070-2075`).
Client: `socketinit.js:1221-1223` (empty handler).

### `temporaryban` / `permanentban` (`sockets.js:236`, `:244`, `:2197`)

No payload. Client: `socketinit.js:871-876`.

### `CHAT_MESSAGE_ENTITY` (`sockets.js:123`, `:124`)

| # | Field |
|---|---|
| 0 | `JSON.stringify([{id, messages:[{text, id}]}, …])` |

When `socket.status.disablechat` is set the server still sends the entity ids but with empty
message arrays (`sockets.js:123`). Client: `socketinit.js:1245-1270`.

### `DTA` — daily-tank ad (`sockets.js:701`)

| # | Field |
|---|---|
| 0 | `JSON.stringify({src, normalAdSize, waitTime})`, `waitTime` is a number or the literal string `"isVideo"` |

Client: `socketinit.js:1094-1138`.

### `DTAD` — ad done (`sockets.js:715`), `DTAST` — ad start ack (`sockets.js:721`)

No payload. Client: `socketinit.js:1139-1152`.

### `RE` — reset mockups+entities (`chatCommands.js:301`), `CC` — clear cache (`chatCommands.js:307`)

No payload. Client: `socketinit.js:948-954`.

### `SH` — screen shake (`entity.js:524`, `:907`; `gun.js:403`)

| # | Field |
|---|---|
| 0 | `JSON.stringify({type:"camera"\|"gui", push, duration, amount, keepShake})` |

Client: `socketinit.js:1153-1189`.

### `svInfo` — debug stats (`speedLoop.js:24`)

| # | Field | Wire tag |
|---|---|---|
| 0 | gamemode name | string |
| 1 | mspt, `(sum).toFixed(1)` — **string** | `0b1010` |

Client: `socketinit.js:877-882`.

## 3.2 Client → server

**19 opcodes**, all dispatched from the switch at `sockets.js:201-735`. All 19 are actually
emitted by the client.

| Opcode | Fields (post-shift) | Server validation | Server site | Client site |
|---|---|---|---|---|
| `k` | 0 or 1: permission key string (≤ 64 chars, `app.js:1248`) | `m.length > 1` ⇒ kick; duplicate ⇒ kick; then `m[0].toString().trim()` | `sockets.js:202-223` | `socketinit.js:831` |
| `s` | 0 name (string), 1 needsRoom (number), 2 autoLVLup (number), 3 transferbodyID (string or `false`), 4 incognito (number) | `m.length < 4` ⇒ kick; per-field `typeof` checks; `encodeURI(name).split(/%..\|./).length > 48` ⇒ kick | `sockets.js:224-320` | `socketinit.js:845`, `:938`; `canvas.js:118`, `:1074` |
| `S` | 0 client timestamp | `m.length !== 1` or non-number ⇒ kick | `sockets.js:321-329` | `socketinit.js:862`, `:908`, `:1368` |
| `p` | 0 ping payload | `m.length !== 1` or non-number ⇒ kick | `sockets.js:330-339` | `socketinit.js:834`, `:1331` |
| `d` | 0 acknowledged uplink time | `m.length !== 1` or non-number ⇒ kick | `sockets.js:340-357` | `socketinit.js:1031` |
| `C` | 0 target x, 1 target y, 2 reverseTank (`1` or `-1`), 3 command bitfield | `m.length !== 4`; x/y/commands must be numbers; `commands > 255` ⇒ kick | `sockets.js:358-399` | `socketinit.js:1305` |
| `#` | 0…n key-name strings; a release is prefixed `-` (`canvas.js:414`, `:416`) | none (wrapped in try/catch, `sockets.js:401-405`); empty ⇒ `["default"]` (`keyCommands.js:986`) | `sockets.js:400-406` | `canvas.js:159`, `:255`, `:417`, `:837` |
| `t` | 0 toggle index 0–3, 1 sendMessage flag | `m.length !== 2`; index must map into `["autospin","autofire","override","autoalt"]` | `sockets.js:407-440` | `canvas.js:261-270`, `:814-828`, `:1052-1061` |
| `U` | 0 upgrade index, 1 branch id | `m.length !== 2`; `(0, -1)` is the daily-tank request; otherwise both must be numbers, `isFinite(branchId)`, both ≥ 0 | `sockets.js:441-464` | `canvas.js:326`, `:598`, `:600`, `:862` |
| `x` | 0 stat index 0–9, 1 max flag | `m.length !== 2`; `max` must be exactly 0 or 1; index must map into the stat list | `sockets.js:465-500` | `canvas.js:311`, `:468`, `:856` |
| `L` | none | `m.length !== 0` ⇒ kick | `sockets.js:501-514` | `canvas.js:240`, `:831` |
| `1` | none | none | `sockets.js:515-530` | `canvas.js:249`, `:821` |
| `H` | none | none | `sockets.js:531-637` | `canvas.js:243`, `:834`, `:1065` |
| `M` | 0 chat text | must be a string ⇒ else kick | `sockets.js:638-674` | `canvas.js:23` |
| `T` | none | none | `sockets.js:675-695` | `global.js:451` |
| `DTA` | none | requires `Config.daily_tank` | `sockets.js:696-710` | `canvas.js:602` |
| `DTAD` | none | requires `Config.daily_tank` | `sockets.js:711-717` | `canvas.js:604`; `socketinit.js:1146`, `:1148` |
| `DTAST` | 0 video duration (float) | `String(m[0]).split(".")[0]`; **falls through into `NWB`** | `sockets.js:718-727` | `socketinit.js:1109` |
| `NWB` | none | none | `sockets.js:728-730` | `socketinit.js:932` |

`C` bitfield layout, from `socketinit.js:1300-1303` and `sockets.js:391-397`:

| Bit | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Meaning | up | down | left | right | lmb | mmb | rmb | unused |

Any unrecognised opcode reaches `sockets.js:731-734`, which logs and does nothing — it does not
kick.

## 3.3 Sub-structures

### 3.3.1 Entity record

Emitted by `flatten` (`sockets.js:1289-1361`), consumed by `process` (`socketinit.js:447-629`).
Field 0 is always `type`; the remaining layout is selected by its bits.

`type` values are fully determined by four `camera()` implementations:

| Producer | `type` | Cite |
|---|---|---|
| `Entity` (tanks, walls, food, bosses, …) | `(drawHealth ? 0x02 : 0) + (isNamed ? 0x04 : 0)` ⇒ 0, 2, 4 or 6 | `entity.js:725-726` |
| `Bullet` | exactly `0x10` | `bulletEntity.js:363` |
| `Turret` | exactly `0x01` | `turretEntity.js:277` |
| `Prop` | exactly `0x01` | `propEntity.js:82` |

**Turret / prop layout (`type & 0x01`)** — `sockets.js:1291-1304`, `socketinit.js:452-463`:

| # | Field | Typical JS type |
|---|---|---|
| 0 | type (`1`) | number ⇒ `0b0001`, zero data bytes |
| 1 | facing | float |
| 2 | layer | number |
| 3 | index | **string** (`entity.js:194`) |
| 4 | color | **string**, `"base hue sat bright invert"` (`color.js:65`) |
| 5 | size | float |
| 6 | realSize | float |
| 7 | sizeFactor | float |
| 8 | angle | float |
| 9 | direction | float |
| 10 | offset | float |
| 11 | mirrorMasterAngle | boolean ⇒ 0/1 |

`propEntity.camera()` also returns `id`, `strokeWidth`, `borderless`, `drawFill`
(`propEntity.js:83`, `:95-97`) — `flatten` never reads them, so they are **not** transmitted.

**Bullet layout (`type & 0x10`)** — `sockets.js:1305-1321`, `socketinit.js:486-498`, `:516-535`:

| # | Field | Notes |
|---|---|---|
| 0 | type (`16`) | `0b0010`, 1 data byte |
| 1 | id | number |
| 2 | index | string |
| 3 | x | float |
| 4 | y | float |
| 5 | vx | float |
| 6 | vy | float |
| 7 | size | float |
| 8 | facing | float |
| 9 | vfacing | float |
| 10 | layer | number |
| 11 | color | string |
| 12 | health | `Math.ceil(65535 * h)` |
| 13 | shield | `Math.round(65535 * s)`; `bulletEntity.js:373` hardcodes `shield: 0` |
| 14 | alpha | `Math.round(255 * a)` |

No `twiggle`, no `borderless`, no `drawFill`, **no `invuln`** — the client skips the invuln read
for this layout (`socketinit.js:516`).

**Full layout (all other types)** — `sockets.js:1322-1349`, `socketinit.js:499-541`:

| # | Field | Notes |
|---|---|---|
| 0 | type | 0, 2, 4 or 6 |
| 1 | id | number |
| 2 | index | string |
| 3 | x | float |
| 4 | y | float |
| 5 | vx | float |
| 6 | vy | float |
| 7 | size | float |
| 8 | facing | float |
| 9 | vfacing | float |
| 10 | twiggle | boolean ⇒ 0/1; forced to `1` by autospin (`sockets.js:1396`) |
| 11 | layer | number |
| 12 | color | string; replaced by `player.teamColor` for own-team entities (`sockets.js:1412`) |
| 13 | borderless | boolean ⇒ 0/1 |
| 14 | drawFill | boolean ⇒ 0/1 |
| 15 | invuln | boolean ⇒ 0/1 |
| 16 | health | `Math.ceil(65535 * h)` |
| 17 | shield | `Math.round(65535 * s)` |
| 18 | alpha | `Math.round(255 * a)` |
| 19 | name | present only if `type & 0x04`; `(nameColor \|\| "#ffffff") + name` (`entity.js:765`) |
| 20 | score | present only if `type & 0x04`; `settings.scoreLabel \|\| score` (`entity.js:766`) — may be a string |

For the limited layout the equivalent overwrite indices are colour `data[11]` and alpha
`data[14]` (`sockets.js:1402`, `:1411`).

**Tail, both layouts** (`sockets.js:1350-1358`, `socketinit.js:587-627`):

```
gunCount              (number)
gunCount × gun record (15 fields each)
turretCount           (number)
turretCount × entity record   (recursive, pre-order)
```

### 3.3.2 Gun record

`flatten` emits guns with `for (let k in data.guns[i]) output.push(data.guns[i][k])`
(`sockets.js:1352-1355`) — i.e. **JavaScript object key insertion order**, not an explicit list.
The order comes from `gun.getPhotoInfo()` (`gun.js:606-623`), whose first entry spreads
`this.lastShot = { time, power }` (`gun.js:10`):

| # | Field | Source | Client |
|---|---|---|---|
| 0 | time | `gun.js:299` (`util.time()`) | `socketinit.js:595` |
| 1 | power | `gun.js:300` | `:596` |
| 2 | color | `gun.js:609` (string) | `:597` |
| 3 | alpha | `:610` | `:598` |
| 4 | strokeWidth | `:611` | `:599` |
| 5 | borderless | `:612` | `:600` |
| 6 | drawFill | `:613` | `:601` |
| 7 | drawAbove | `:614` | `:602` |
| 8 | length | `:615` | `:603` |
| 9 | width | `:616` | `:604` |
| 10 | aspect | `:617` | `:605` |
| 11 | angle | `:618` | `:606` |
| 12 | direction | `:619` | `:607` |
| 13 | offset | `:620` | `:608` |
| 14 | layer | `:621` | `:609` |

A Go port must hard-code these 15 fields in this order. Adding a key anywhere in
`getPhotoInfo` silently shifts the whole stream.

### 3.3.3 Colour values

`color.compiled` is a space-joined string:
`base + " " + hueShift + " " + saturationShift + " " + brightnessShift + " " + allowBrightnessInvert`
(`color.js:65`), e.g. `"16 0 1 0 false"`. Colour fields on the wire are therefore
`0b1010` strings, never numbers. Several call sites synthesise the same shape by hand:
`entry.leaderboardColor + " 0 1 0 false"` (`sockets.js:1743`), `'11 0 1 0 false'`
(`sockets.js:1744`), `'12 0 1 0 false'` (`sockets.js:1752`, `:1846`), `'10 0 1 0 false'`
(`sockets.js:1831`), `Config.blackout_minimap_color + " 0 1 0 false"` (`sockets.js:1814`).

### 3.3.4 GUI block

Built by `publish` (`sockets.js:956-1031`), read by `convert.gui` (`socketinit.js:673-757`).

Element 0 is a bitmask accumulated with `+=` (`sockets.js:974`), max `0x1FFF`. Payloads follow
in **ascending bit order**, and only for set bits.

| Bit | Name | Elements pushed | Server | Client |
|---|---|---|---|---|
| `0x0001` | fps | 1 — `o.fps \|\| 1` (**a genuine 0 is sent as 1**) | `sockets.js:975-978` | `socketinit.js:692-694` |
| `0x0002` | label | 3 — index string, team colour string, body id | `sockets.js:979-984` | `:695-699` |
| `0x0004` | score | 1 — `JSON.stringify([score, solo, assists, bosses])` | `sockets.js:985-988` | `:700-704` |
| `0x0008` | points | 1 | `sockets.js:989-992` | `:705-707` |
| `0x0010` | upgrades | 1 + n — count, then n strings `"branch_branchLabel_index"` (`sockets.js:925`) | `sockets.js:993-996` | `:708-714` |
| `0x0020` | statsdata | 30 — 10 × (title, cap, softcap) in atk…shi order | `sockets.js:997-1000`, `:864-869` | `:715-721` |
| `0x0040` | skills | 1 — 20-char hex string, reverse stat order | `sockets.js:1001-1004`, `:890-904` | `:722-733` |
| `0x0080` | accel | 1 | `sockets.js:1005-1008` | `:735-737` |
| `0x0100` | topspeed | 1 | `sockets.js:1009-1012` | `:738-740` |
| `0x0200` | root | 1 — `rerootUpgradeTree` | `sockets.js:1013-1016` | `:741-743` |
| `0x0400` | class | 1 — `b.label` | `sockets.js:1017-1020` | `:744-746` |
| `0x0800` | visibleName | 1 — 0 or 1 | `sockets.js:1021-1024` | `:747-749` |
| `0x1000` | dailyTank | 1 — `JSON.stringify([indexOrNull, adsPending])` | `sockets.js:1025-1028` | `:750-757` |

Fields are only present when their `floppy` reports a change (`sockets.js:780-830`); a `floppy`
publishes only when `flagged && value != null` (`sockets.js:824`), so a `null`/`undefined` value
is never transmitted and the flag stays raised. `floppy.update` throws
`"Unsupported type for a floppyvar!"` for anything that is not a number, string or array
(`sockets.js:811-813`) — including booleans, which is why `visibleName` is pre-converted to 0/1
at `sockets.js:953`.

### 3.3.5 Delta block

Produced by `Delta.update` (`sockets.js:1667-1727`), consumed by `Integrate.update`
(`socketinit.js:131-142`).

Incremental form (`sockets.js:1724`):

```
deletesLength                (number)
deletesLength × id           (numbers)
updatesLength                (number)
updatesLength × ( id, dataLength × field )
```

Reset form (`sockets.js:1723`, `:1725`):

```
0                            (no deletes)
now.length                   (as updatesLength)
now.length × ( id, dataLength × field )
```

The reset form is only sent when `socket.status.needsNewBroadcast` is set, and is always
preceded by a separate `RM` frame (`sockets.js:1979-1987`).

Delta computation assumes **both lists are sorted ascending by id**; the merge at
`sockets.js:1686-1714` compares `oldElement.id < nowElement.id` to decide delete vs create. The
leaderboard builders sort explicitly (`sockets.js:1762`, `:1794`); the minimap builders rely on
`entities.values()` iteration order.

Per-block field layouts:

| Block | Fields | Cite |
|---|---|---|
| minimapAll (5) | `type` (0/1/2), x, y, colour string, `Math.round(SIZE)` | `sockets.js:1810-1816`; `socketinit.js:770-777` |
| minimapTeams / minimapAllTeams (3) | x, y, colour string | `sockets.js:1828-1832`, `:1843-1847`; `socketinit.js:783-790` |
| leaderboard (8 on the wire, 7 compared) | score, index, name, colour, bar colour, nameColor, label, renderOnLeaderboard | `sockets.js:1748-1757`; `socketinit.js:798-808` |

`makeLeaderboardHPList` entries use `id + 100` to avoid colliding with the score leaderboard's
ids (`sockets.js:1779`).

---

# 4. EDGE CASES

| # | Case | Actual behaviour | Cite |
|---|---|---|---|
| 1 | `NaN` | Encoded as float32 (`Number.isInteger(NaN)` is false). Round-trips as `NaN`. The **bit pattern is not canonical**: literal `NaN` → `00 00 c0 7f`, `Math.sqrt(-1)` and `0*Infinity` → `00 00 c0 ff`. | `fasttalk.js:56`, measured |
| 2 | `±Infinity` | Float32 `00 00 80 7f` / `00 00 80 ff`; round-trips exactly. | measured |
| 3 | `-0` | `-0 === 0` is true, so it takes the literal-zero branch and comes back as `+0`. A Go port must special-case negative zero to `0b0000` and must **not** let it reach the float path. | `fasttalk.js:51` |
| 4 | Integer at `±2^32` | `4294967295` → uint32; `4294967296` → float32 (exact); `-4294967296` → int32 form; `-4294967297` → float32 and **decodes as `-4294967296`**. | `fasttalk.js:56`, `:66`, `:77`, measured |
| 5 | Negative integer wraparound | Encoder relies on typed-array `ToUintN` (`-1` → `0xff`); decoder subtracts the modulus. Go must use explicit modular arithmetic, not a signed cast, for values whose magnitude exceeds the slot. | `fasttalk.js:177`, `:181`, `:187` vs `:290`, `:300`, `:314` |
| 6 | Empty array | `encode([])` → the single byte `0xff`; `decode([0xff])` → `[]`. Valid, not an error. | measured |
| 7 | Empty string | Tag `0b1001` with data byte `0`. Distinct from a missing field. | `fasttalk.js:198`, `:326` |
| 8 | String containing `U+0000` | **Throws** `Error('Null containing string')` from the encoder, aborting the frame. The decoder can *produce* such a string from a truncated `0b1001` block, so a round-tripped value can be un-encodable. | `fasttalk.js:87-90`; measured |
| 9 | Non-ASCII ≤ U+00FF | Latin-1, one byte per char (`"é"` → `e9`). **Not UTF-8.** | `fasttalk.js:204`; measured |
| 10 | Non-BMP / astral | UTF-16 surrogate pairs, two LE units. `"😀"` → `3d d8 00 de 00 00`. | `fasttalk.js:209-213`; measured |
| 11 | Lone surrogate | Passes through unchanged in both directions. Go's UTF-8 strings cannot hold one; a port needs a UTF-16 code-unit representation for names. | measured |
| 12 | Mixed-width string | A single code unit > 0xFF promotes the **whole** string to `0b1011`. | `fasttalk.js:95` |
| 13 | Maximum run length | Unbounded — chunked in 19s (`0b1110`,`15`). No frame-length limit anywhere in the codec. | `fasttalk.js:120-124` |
| 14 | Maximum name length | Enforced at the message layer only: `encodeURI(name).split(/%..\|./).length > 48` ⇒ kick. `String.split` returns *tokens + 1* pieces and `encodeURI` percent-encodes each non-ASCII **UTF-8 byte** separately, so the real limit is **47 UTF-8 bytes** (one emoji costs 4). Measured: 47 ASCII → 48 (pass), 48 ASCII → 49 (kick). | `sockets.js:269` |
| 15 | Maximum key length | 64 chars, enforced client-side only (`app.js:1248`). The server accepts any length. | `sockets.js:207` |
| 16 | `undefined` / `null` fields | **Throw** `"Unencodable data type"` (a bare string, not an `Error`) and print a diagnostic naming the `u` packet as the usual culprit. Any `camera()` field that can be `undefined` — e.g. `twiggle` if `syncWithTank` is `undefined` (`entity.js:758-760`) — kills the tick. | `fasttalk.js:102-112` |
| 17 | Truncated data section | No bounds check. See the table in §2.3: results range from `undefined` elements to silently truncated strings to bogus floats. Only the header walk is bounds-checked. | `fasttalk.js:233`, `:254` |
| 18 | `undefined` element reaching a handler | `sockets.js:207` does `m[0].toString()` with no guard, so a `k` frame with a stripped data byte throws a `TypeError` out of the ws message handler. | `sockets.js:207` |
| 19 | Leading repeat marker | Decodes to `0b1111` headers, which the data switch ignores — the element vanishes and `m.length` shrinks. A hostile client controls the arity independently of the header count. | `fasttalk.js:229`, `:270` |
| 20 | Boolean fields | Never arrive as booleans. `camscoping`, `borderless`, `drawFill`, `twiggle`, `mirrorMasterAngle`, `renderOnLeaderboard`, `roundArena` are all 0/1 numbers client-side. | `fasttalk.js:281`, `:284` |
| 21 | GUI fps of exactly 0 | `oo.push(o.fps \|\| 1)` turns a legitimate 0 into 1. | `sockets.js:977` |
| 22 | `u` first-millisecond hazard | If `room.lastCycle === 1`, `m[0] == true` is true client-side and the full uplink is parsed as a camera-only frame. | `sockets.js:1648` vs `socketinit.js:961` |
| 23 | `resync()` timestamp | `resync` zeroes `serverStart` and `clockDiff` then sends `Date.now()` (`socketinit.js:1360-1368`), a value ≥ 2^32, so it is float32-quantised with an ulp of **131072 ms**. Latency estimates from that sample are meaningless. | `socketinit.js:1368` |
| 24 | Client `s` with 3 arguments | `canvas.js:1074` sends only `(name, 0, autoLevelUp)`; the server requires `m.length >= 4` and kicks with "Ill-sized spawn request." | `canvas.js:1074` vs `sockets.js:249` |
| 25 | `false` as `transferbodyID` | Encodes as `0b0000`, decodes as `0`. `if (transferbodyID && …)` treats it as absent, so this works — but a Go port must not reject a numeric 0 in a string-typed slot. | `socketinit.js:938`, `sockets.js:273` |
| 26 | `NaN` in a client `U` packet | `parseInt` of a malformed upgrade label yields `NaN`, which is a `number`, so the `typeof` check passes and only `!isFinite(branchId)` catches it. | `sockets.js:456` |
| 27 | `NaN` target in `C` | `Math.round(x / ratio)` with `ratio === 0` gives `NaN`, which passes `typeof … !== "number"` and is written straight into `player.target`. | `socketinit.js:1305`, `sockets.js:373` |
| 28 | Minimap 256 vs 255 | Encoded `Math.floor(256 * x / width)` clamped to `[-128, 127]`, decoded `data * gameWidth / 255`. Permanent scale mismatch that must be preserved. | `sockets.js:1812` vs `socketinit.js:773` |
| 29 | `health` vs `shield` rounding | `ceil` vs `round`. Not interchangeable. | `sockets.js:1318-1319` |
| 30 | Leaderboard `index` type | `makeLeaderboardList` pushes `entry.index` raw (a string, `entity.js:194`); `makeLeaderboardHPList` and the tag/mothership builders push `.toString()` of a class index (a number before conversion). Both end up strings, but only because `entity.index` is already stringified — the client calls `.split("-")` on it unconditionally (`socketinit.js:239`). | `sockets.js:1751`, `:1782`, `:1861`, `:1882` |
| 31 | JSON payloads and `JSON.stringify` | Any `undefined` inside an object is dropped and any `NaN`/`Infinity` becomes `null`. The Go port's JSON encoder must match key order and number formatting (`JSON.stringify(1.5)` → `"1.5"`, `JSON.stringify(1)` → `"1"`) or the byte stream differs even though the parse result does not. | `sockets.js:287`, `:916`, `:942`, `:1444` |
| 32 | `for…in` over gun photos | Key order is insertion order for these non-numeric keys, and `Object.prototype` contributes nothing enumerable — deterministic today, but the field list must be hard-coded in Go. | `sockets.js:1353`, `gun.js:607-622` |
| 33 | Frame with zero visible entities | `visible.length` is `0` ⇒ tag `0b0000`, zero data bytes. Not an error; the client's loop simply does not run. | `sockets.js:1656`, `socketinit.js:639` |
| 34 | GUI block with no changes | `publish()` returns `[0]`, one element, tag `0b0000`. The block is never absent. | `sockets.js:974`, `:1030` |
| 35 | `Number.isInteger` on a float-valued whole number | `3.0` takes the **uint8** path, so the tag for one field genuinely varies frame to frame. | `fasttalk.js:56` |

---

# 5. OPEN QUESTIONS

**OPEN QUESTION 1 — Which NaN bit pattern reaches the wire.**
`f32[0] = block` (`fasttalk.js:192`) performs a binary64→binary32 conversion whose NaN payload
and sign bit are implementation-defined by ECMA-262. Measured under Node 24 on x64, the sign
bit of the source double survives: literal `NaN` and `0/0` produce `00 00 c0 7f`, while
`Math.sqrt(-1)` and `0 * Infinity` produce `00 00 c0 ff`. I cannot determine by reading which
NaN any specific game field would carry, because it depends on the arithmetic that generated it
(e.g. `Math.ceil(65535 * health)` when `health` is NaN, or a division by zero in the physics
step). **Unresolved:** whether a Go port should emit `0x7FC00000` unconditionally, or whether
some field can legitimately reach the encoder holding a negative NaN and thereby produce a
different byte on the wire. This needs a runtime capture from the live server, not a code read.

**OPEN QUESTION 2 — Byte order is assumed, not specified.**
`fasttalk.js:3-8` aliases a single `ArrayBuffer` through `Uint32Array`, `Float32Array` and
`Uint8Array` views, and the encoder copies raw bytes with `output.set(c32, index)`
(`fasttalk.js:188`, `:193`). Nothing in the source selects an endianness. Every frame measured
here is little-endian, but that is a property of the machine the codec ran on. **Unresolved:**
whether the protocol is *defined* as little-endian or merely *observed* to be. If any deployment
target were big-endian, the current Node server and the current browser client would already
disagree with each other.

**OPEN QUESTION 3 — Can an entity `type` ever set `0x04` together with `0x10` or `0x01`?**
`flatten` writes the nameplate fields only in the full-entity branch (`sockets.js:1343-1348`),
but `process` reads them for any non-turret record whose type has `0x04`
(`socketinit.js:538-541`). The four `camera()` implementations I found
(`entity.js:719`, `bulletEntity.js:361`, `turretEntity.js:275`, `propEntity.js:80`) make the
combination impossible, and `photo` is assigned only from `camera()`
(`entity.js:964`, `bulletEntity.js:386`). **Unresolved:** whether any definition file, addon, or
gamemode script mutates `entity.photo.type` or supplies a custom `camera()` after the fact. I
did not audit the ~hundreds of files under `server/lib/definitions`. If it can happen, the
stream desynchronises by exactly two elements and every subsequent entity in the frame is
garbage — which is precisely the "looks like a physics bug" failure mode.

**OPEN QUESTION 4 (ANSWERED: no) — Is `socket.anon` reachable?**
`sockets.js:1985` and `:1993` suppress the leaderboard delta when `socket.anon` is truthy, but a
grep of the whole `js-src` tree finds no assignment to it. **Unresolved:** whether it is dead
code that the Go port can drop, or whether it is set by something outside this tree (a
deployment patch, a plugin loaded at runtime). Dropping it changes nothing today; keeping it
costs one branch.

**Answered while wiring the broadcast.** Dropped. `internal/net`'s `SvBroadcast` has no
`anon` branch, and `internal/wire/broadcast.go` never suppresses the leaderboard block.
Anything outside this tree that set it would be setting a property on a socket this port
does not have.

**OPEN QUESTION 5 (ANSWERED: replicated) — Is the leaderboard's `dataLength = 7` deliberate?**
The leaderboard `Delta` is constructed with 7 (`sockets.js:1852`, `:1907`, `:1922`, `:1934`)
while its rows carry 8 fields and the client reads 8 (`socketinit.js:286`). The 8th field,
`renderOnLeaderboard`, is therefore excluded from change detection. **Unresolved:** whether the
Go port should replicate the 7 (byte-identical output, stale 8th field) or fix it to 8
(divergent output). This is a behaviour decision I cannot make from the source; the current
behaviour is what the client is calibrated against, so I would replicate the 7 and flag it.

**Answered by measurement.** `tools/gen-message-vectors.js` drove the real `Delta` class
both ways: at 7, a change confined to field 7 emits `[0, 0]`; at 8, it emits the whole row.
The reset form carries all eight either way, so the effect is a stale row icon until the
next full send. Replicated as 7 (`net.Delta.DataLength`, `internal/wire/broadcast.go`'s
`newBroadcastState`) and written up as found-bugs #9.

**OPEN QUESTION 6 — What `data.score` holds when `settings.scoreLabel` is set.**
`entity.js:766` emits `this.settings.scoreLabel || score`. A string label and a numeric score
take different wire tags (`0b1010` vs an integer tag), so packet layout depends on the entity
definition. **Unresolved:** which definitions set `scoreLabel` and what types they use. The
client stores it untyped (`socketinit.js:540`), so both work — but a Go port needs to know
whether to model the field as a union.

**OPEN QUESTION 7 — What the `ws` layer hands to `decode`.**
`sockets.js:2055` sets `socket.binaryType = "arraybuffer"` on an already-constructed `ws`
socket, and `sockets.js:2089` passes the raw message straight to `protocol.decode`, which does
`new Uint8Array(packet)` (`fasttalk.js:224`). That constructor copies from a Node `Buffer` and
views an `ArrayBuffer`; both give correct bytes. **Unresolved:** whether `ws` honours a
post-construction `binaryType` assignment in the version pinned by `package.json`, and what
happens to a fragmented message — if `ws` ever delivered an array of `Buffer`s,
`new Uint8Array(array)` would produce garbage rather than an error. Worth confirming against the
installed `ws` version before the Go port picks a framing assumption.
