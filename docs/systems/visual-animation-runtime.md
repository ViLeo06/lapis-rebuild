# Visual animation runtime recovery

> Scope: fixed-hash 2.2 retail client static evidence. The original client executable and unknown DLLs are never executed.
>
> Unpacked `NeoDark.exe` SHA-256: `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7`.

## Result

S5 closes the main ambiguity around ANI cadence and recovers the character action end/reset policy plus the HP-loss → hit-reaction presentation path.

The important distinction is that the ANI `0x488` float is not a duration in milliseconds. In the normal character/effect consumers it behaves as an authored playback rate: the frame threshold is `1000.0 / raw_timing` milliseconds.

## ANI loader and runtime layout

The on-disk ANI layout already established in `docs/ani-format.md` is confirmed by the retail loader at `0x00478800`:

- read a `0x44`-byte file/global header;
- allocate/read one `0x490`-byte record per layer;
- therefore file offset `0x488` maps to runtime layer-record offset `+0x444`.

The character action loader formats the requested action index with:

`%sCHAR\B%03d_%02d.ani`

and then calls the same ANI loader. This connects numeric character action state directly to the `_NN` ANI suffix without guessing from filenames alone.

## Cadence and timer unit

Native `0x004BEDC0` builds a high-resolution clock with `QueryPerformanceFrequency` / `QueryPerformanceCounter`. The cached frequency is divided by `1000`, so the resulting elapsed value used by animation consumers is milliseconds.

Nine fixed-hash consumer sites independently load `1000.0f` and divide it by layer `+0x444` before deciding whether to advance the frame:

- `0x0045C852`
- `0x00465516`
- `0x0046FC7B`
- `0x00470F49`
- `0x004711D5`
- `0x004889FD`
- `0x004B21C1`
- `0x004B2309`
- `0x004B8A03`

Normal threshold:

`frame_interval_ms = 1000.0 / raw_timing`

Examples from authored values:

| raw timing | normal interval |
| ---: | ---: |
| 5 | 200 ms |
| 10 | 100 ms |
| 30 | ~33.33 ms |
| 200 | 5 ms |

### Important exception

This is not a universal replacement rule for every use of the field. A separate path at `0x004960B4..0x004960CC` reads the same layer `+0x444`, subtracts `1.0f`, then computes:

`1000.0 / (raw_timing - 1.0)`

That path is caller-specific. S6 should preserve a notion of timing policy/consumer instead of rewriting the raw field into one permanently converted duration at parse time.

## Character action state setup

`0x004B2000` is the character action setter. The fixed-hash path verifies that it:

1. stores the requested numeric state in character `+0x2EC`;
2. selects the ANI resource loaded for that state;
3. resets the current frame index at `+0x2F0` to zero;
4. reads the initial frame from the selected 8-row ANI table using the current direction-row index.

This is the runtime bridge from `state N` to `Bxxx_NN.ani`.

## End/reset policy

At the final frame, `0x004B2230` dispatches states `2..8` through a seven-entry jump table. The behavior is verified structurally:

| state | final-frame behavior |
| ---: | --- |
| 2 | reset to state 0; if movement condition is active, continue into state 1 |
| 3 | reset to state 0; if movement condition is active, continue into state 1 |
| 4 | continue through the normal advance/wrap path |
| 5 | reset to state 0; if movement condition is active, continue into state 1 |
| 6 | continue through the normal advance/wrap path |
| 7 | reset to state 0 |
| 8 | clear active flag and return terminal code `2` |

This proves action-end mechanics, but it does **not** assign gameplay names to every state. In particular, there is still no sufficient evidence to label state 7 or 8 as the universal death state. `_05` is also not death: existing visual evidence already shows class-specific long `_05` sequences, while runtime state 5 is a transient state that resets to 0/1.

## HP loss → hit reaction

The authoritative absolute-HP consumer documented in `battle-entry-and-damage-recovery.md` also contains the hit presentation trigger.

At `0x00405B5A` it computes:

`old_hp - incoming_signed_absolute_hp`

Only a positive result enters the hit-presentation branch. In that branch the retail client:

1. selects a hit presentation/audio family from a small type dispatch;
2. invokes the sound/presentation manager;
3. calls the character action setter with state `3`;
4. only then writes the incoming signed absolute HP at `0x00405C26`.

Because the character action loader maps state 3 to the `_03` ANI suffix, `_03` is now **runtime-verified hit reaction**, not merely a visual guess.

Verified hit-audio filename families on this path include:

- `NDS-000%d.wav`
- `NDS-001%d.wav`
- `NDS-0030.wav`
- `NDS-0040.wav`
- `NDS-0050.wav`

The exact gameplay meaning of the type field that selects those families remains unlabelled.

## Attack → hit timing boundary

Static evidence does **not** show the defender hit reaction as a fixed local frame callback from the attack ANI. Instead, state 3 is entered when the authoritative HP-effect consumer observes a positive HP loss.

For S6 this means the safe reconstruction contract is:

`attack presentation -> authoritative/effect HP event -> hit SFX + defender state 3`

Do not hard-code “hit on attack frame K” until a separate attack-impact callback or captured runtime trace proves it. This is also why a server/session event can determine the exact delay between attacker state 2 and defender state 3.

## Reproduction

`tools/probe_visual_semantics.py` pins the unpacked hash and verifies the loader, timer, cadence consumers, hit chain, action setter/end table and relevant resource strings by exact bytes/addresses. `tests/parsers/test_visual_semantics.py` covers the probe helpers independently.

The fixed-hash CI workflow emits `visual-semantics.json` beside the broader resource inventory and pixel preview pack.

## Remaining S5/S6 boundary

Still unverified:

- exact attack-impact frame inside state 2;
- universal death action/state binding;
- semantics of all state 4/5/6/7/8 call sites;
- caller-specific timing policies beyond the verified common formula and the one `raw-1` special path.

Those must remain explicit evidence gaps rather than guessed runtime constants.
