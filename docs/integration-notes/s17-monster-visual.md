# S17 Monster Visual Recovery integration note

> Branch: `codex/m5-monster-visual-recovery`  
> Baseline: `047c52af340076a00a6e0d347806708ad92844d1`  
> PR: #24  
> Private asset destination: `lapis-rebuild-assets/40_research/S17-Monster-Visual-Recovery-20260918/`

## Result

S17 now provides a replaceable monster-visual layer without modifying the shared M5 runtime files.

The main result is stronger than a filename correlation: fixed-hash static analysis recovers the retail battle visual-model dataflow:

```text
battle roster record +0x08
  -> visual cache/model object +0x234
  -> live battle unit +0x0C visual object
  -> character action loader
  -> B%03d_%02d.ani
```

The existing S2 unit/program key at roster `+0x00` is a **different field**. Therefore S17 does not bind a visual by assuming the unit/program key and visual model ID are equal.

Evidence status for this chain: **VERIFIED_STATIC_ORIGINAL**.

## Full client inventory

`tools/probe_monster_visuals.py` scans the entire fixed-hash 2.2 `Char/B<id>_<state>.ani/.spr` resource family plus every `.Tip` library.

Current fixed-client inventory:

- 1,638 distinct `Char/B<id>` visual families;
- 6,809 `Char/B<id>_<state>` ANI resources with paired SPR frame tables;
- 27 TIP sprite libraries;
- 1,355 families expose `00,01,02,03`;
- 247 families expose `00,01,02,03,05`;
- smaller families expose `06/07/08` variants or only partial state sets;
- 38 numeric `CHARPOS` model tokens occur in the authored story battle catalog;
- 26 of those tokens have a same-number `Char/B` family.

The last item remains **UNVERIFIED_NUMERIC_CORRELATION**. Story script model tokens, retired live roster rows, NPCScript IDs and world entity IDs are separate namespaces until an independent runtime/dataflow join proves otherwise.

TIP files are inventoried as sprite libraries only. S17 found no evidence that a TIP frame index is the retail battle visual-model binding.

## Action semantics

Safe runtime semantics:

| State / suffix | S17 status | Integration meaning |
| --- | --- | --- |
| `_00` | RECOVERED_SECONDARY | idle-like compatibility state; private gallery visually agrees for reviewed families |
| `_01` | RECOVERED_SECONDARY | movement-like compatibility state; private gallery visually agrees |
| `_02` | RECOVERED_SECONDARY | attack-like compatibility state; exact impact frame is still unresolved |
| `_03` | VERIFIED_STATIC_ORIGINAL | authoritative HP-loss path sets action state 3, which loads `_03` |
| death | UNVERIFIED | no universal retail death state is recovered |

Do **not** promote `_05` to death. The existing S10 fade/remove death presentation remains the correct temporary **RECONSTRUCTION_POLICY** until independent retail evidence appears.

## Human-reviewed monster-like visual archetypes

Private fixed-hash contact sheets were manually reviewed. The following labels describe visible morphology only; they are **not canonical retail monster/species names**.

| Visual ID | Source | Description | Slots | Direction-row structure | Story correlation |
| --- | --- | --- | --- | --- | --- |
| `monster-visual-001` | `B4524` | green-skinned sword humanoid-like visual | 00/01/02/03 | each reviewed slot has 4 unique row sequences shared as 0=1, 2=3, 4=5, 6=7 | zone 81 DEO token 4524, correlation only |
| `monster-visual-002` | `B4525` | blue-skinned polearm humanoid-like visual | 00/01/02/03 | 00/01/03 use four paired row sequences; 02 contains eight distinct row sequences | zone 81 DEO token 4525, correlation only |
| `monster-visual-003` | `B4526` | green armored humanoid-like visual | 00/01/02/03 | 00/01/03 use four paired row sequences; 02 contains eight distinct row sequences | zone 81 DEO token 4526, correlation only |
| `monster-visual-004` | `B4544` | cyan spectral humanoid-like visual | 00/01/02/03 | 00/01/03 use four paired row sequences; 02 contains eight distinct row sequences | zone 91 DEO token 4544, correlation only |

For runtime movement, `RECOVERED_SECONDARY_BODY_ROW_ORDER` may reuse the already-observed Body_ row ordering as a replaceable policy. The selected families expose eight raw ANI rows, but idle/move/hit often intentionally share artwork between adjacent rows. This must not be rewritten as “eight unique sprites are required.”

Sanitized hashes and row-equivalence metadata are pinned in `manifests/s17-monster-visual-catalog.json`.

## Runtime contract

`web/src/content/monsters/monster-visual-catalog.ts` provides:

- `MonsterVisualArchetype`;
- `MonsterVisualCatalog`;
- explicit action-slot provenance;
- reviewed S17 archetypes;
- `S17_RECONSTRUCTION_TRAINING_BINDINGS`.

The catalog never resolves by numeric equality. A battle unit must carry an explicit visual ID.

Current recommended M5 training bindings are deliberately reconstruction policy:

```text
dummy-melee  -> monster-visual-001 -> B4524
dummy-ranged -> monster-visual-004 -> B4544
```

Rationale: B4524 is a coherent melee visual; B4544 has a visually obvious projectile-like `_02` sequence. This gives the current training battle readable original-client monster art while the historical live roster payload remains unavailable.

## Private generated runtime pack

`tools/export_s17_monster_assets.py`:

1. reads the sanitized S17 manifest;
2. re-hashes every selected ANI/SPR source;
3. parses and validates ANI indices against SPR;
4. exports PNG frames and `animation.json` per action;
5. emits `monster-visuals.json` with archetypes and explicit battle-unit bindings.

Expected generated layout:

```text
runtime-pack/
  monster-visuals.json
  monsters/
    monster-visual-001/
      00/animation.json
      00/frames/...
      01/...
      02/...
      03/...
    ...
```

These generated original pixels stay in private CI/Drive artifacts and are not committed to Git.

## Private gallery / screenshots

The independent gallery supports:

- visual-family selection;
- action selection;
- raw direction-row selection;
- play/pause;
- frame stepping;
- adjustable playback interval;
- per-action contact sheets;
- evidence/provenance display.

Relevant private artifact paths include:

- `gallery/B4524/{00,01,02,03}/contact-8rows.png`
- `gallery/B4525/{00,01,02,03}/contact-8rows.png`
- `gallery/B4526/{00,01,02,03}/contact-8rows.png`
- `gallery/B4544/{00,01,02,03}/contact-8rows.png`

First complete evidence run: GitHub Actions `35287680748`, artifact `10524981851`. The corresponding full Web/parser validation run `35287680822` also succeeded.

## Coordinator integration API

S17 intentionally does **not** edit `scene.ts`, `main.ts` or `battle.ts`.

Coordinator should:

1. run or fold `export_s17_monster_assets.py` into the private Web pack generation;
2. load `monster-visuals.json`;
3. bind `dummy-melee` and `dummy-ranged` through `S17_RECONSTRUCTION_TRAINING_BINDINGS`;
4. render enemy `00` when idle, `01` while moving, `02` while attacking and `03` on authoritative HP loss;
5. use the existing reconstruction death fade/remove until a retail death state is independently recovered;
6. retain explicit visual binding when future real roster/session evidence becomes available, replacing only the reconstruction mapping.

No shared-core files were modified by S17.

## Validation

Dedicated S17 CI verifies:

- unit tests for namespace/evidence boundaries;
- exact-byte fixed-hash visual binding signatures;
- full client visual inventory;
- private review gallery generation;
- source-hash-pinned reviewed runtime pack generation.

Normal PR CI separately runs the repository parser suite, TypeScript typecheck, Web unit tests, production build, Chromium integration and offline tests.

S17 completion is therefore based on both static retail evidence and human review of actual decoded pixels, not merely “a module exists.”
