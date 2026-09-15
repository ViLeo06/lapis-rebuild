# Evidence ledger

## 2026-09-15 / Web checkpoint

| ID | Level | Claim | Reproduction / scope |
| --- | --- | --- | --- |
| WEB-001 | VERIFIED | Installer matches `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` | 470,688,152 bytes; hash-pinned static CI download and local 18-part reconstruction |
| WEB-002 | VERIFIED | Static extraction: 22,885 regular files / 2,699,237,296 bytes | No original executable run |
| WEB-003 | VERIFIED | Reference coordinates roundtrip on even-parity anchors | Exhaustive 47x47 test + all 607 walkable map0 cells; **not** a global inverse claim |
| WEB-004 | INFERRED | Compatibility coordinate helpers reflect old conventions | 2026 compatibility reference source; not a 2003 runtime capture |
| WEB-005 | UNVERIFIED | Training combat, route tie-break, movement speed and animation millisecond policies | `web/src/config.ts`, `battle.ts`, `coordinates.ts`; functional scaffolding only |
| WEB-006 | VERIFIED | Web checkpoint passes Python parser tests, TypeScript/unit/build, Chromium and offline single-HTML integration | Current regression also covered by run `34960418543` |
| WEB-007 | VERIFIED | Browser diagnostic loads real maps/B100/B109, inspects animation/bounds/collision, moves, executes training actions and persists browser state | Private decoded asset pack; no original executable run |
| WEB-008 | VERIFIED | 100 target ANI/SPR pairs and 92 SGR parse with 0 errors | Repeated static validators |
| WEB-009 | VERIFIED | Original Web character/map0 inputs are hash pinned before generation | `manifests/web-source-baseline.json` |
| WEB-010 | VERIFIED | MVP MagicRes resources `1,2,3,35,36,37,38` are `FOCUS`; for every pair `frames_per_direction == SPR frame_count`, raw timing is `30.0`, and only ANI row 0 is wholly inside the paired SPR frame range | Static artifact from hash-pinned 2.2 client; `tools/inspect_magicres.py` |
| WEB-011 | VERIFIED | For the seven MVP FOCUS resources, ANI row 0 is exactly the sequential SPR index range `0..N-1` | Static structural evidence only; supports sequential diagnostic playback, **not** direction/timing/blend/placement semantics |
| WEB-012 | VERIFIED | Seven MVP MagicRes ANI/SPR inputs are individually SHA-256 pinned | `manifests/web-effects-baseline.json` |
| WEB-013 | VERIFIED | Static probe successfully renders maps 0, 1, 3, 7, 9 and 11 from project-owned parsers | `tools/probe_maps.py`; maps missing from the numeric range are reported as absent rather than guessed |
| WEB-014 | VERIFIED | Map 1 static probe: 2240x1280 render, IMF 69x79, 2292 raw walkable-value-1 cells, 70 object images drawn, 4 optional object images missing | Hash-pinned installer static extraction; first probe PNG SHA-256 `bd7416f0c22128bbcb30bc8725ce13a8ff6c1dc86a88a8dde451933c7e4bc187` |
| WEB-015 | VERIFIED | Map candidates include names visible in `zone_name.txt`: 对练场, 布日古斯_外城, 布日古斯_城_地下_监狱, 布日古斯_本城_大厅, 西奥_洞穴, 扎魔拉_要塞_入口 | Corrected parser locates localized name relative to the `sz-NNNN` resource token |
| WEB-016 | VERIFIED | Two-map Web pack + real MagicRes diagnostic player + map/effect save/browser regression pass on synthetic and private-original resources | GitHub Actions run `34960418543`; private-original and synthetic jobs both success |
| WEB-017 | VERIFIED-ENGINEERING | Data-driven M3 guide loop `0000 → 0001 → 0000 → complete` persists through IndexedDB save/reload on the real 2.2-derived Web pack | Run `34960418543`: Playwright `27 expected / 0 unexpected`; `quest-loop.png` visually checked. This verifies the Web state machine, **not** original NPC/quest semantics |
| WEB-018 | VERIFIED | Map 0001 MMF/SMF/IMF and its additional SGR dependencies are individually SHA-256 pinned | `manifests/web-source-baseline.json`; generator refuses changed inputs |
| WEB-019 | UNVERIFIED | `data/npcs/m3-guide.json` content represents an original quest/NPC | It is deliberately a functional placeholder labelled `UNVERIFIED`; static original-data discovery is the next evidence task |

## Interpretation boundaries

- `Body_` character ANI rules must not be mechanically applied to `FOCUS` MagicRes.
- Sequential FOCUS SPR playback is a **diagnostic representation of verified file order**. Original playback timing, compositing, location and direction semantics remain `UNVERIFIED`.
- Rendered maps are flat diagnostic images. Missing optional object layers, foreground occlusion and original runtime z-order remain separate fidelity work.
- M3 guide completion only proves NPC/dialogue/map/task/save engineering continuity. It does not identify an original NPC, quest, trigger, reward or dialogue.
- Private asset evidence does not grant redistribution rights.
- Original client binaries are not executed by CI or normal development environments.

Format evidence: `docs/ani-format.md` and `docs/client-analysis.md`.
