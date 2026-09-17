# S11 — Swordsman / Wizard gameplay content

Branch: `codex/swordsman-wizard-content`  
Base: `6452effb0d6a9d26b3b285fc5fe4ead3e8b68ce7`

## Scope

S11 turns the two user-priority characters into explicit, data-driven playable class definitions without changing battle damage, AI, scene lifecycle, or shared UI entrypoints. Runtime wiring is intentionally deferred to the later integration session.

Delivered modules:

- `web/src/content/content-types.ts` — serializable `PlayableClassDefinition` / `PlayableSkillDefinition` contracts and provenance types.
- `web/src/content/classes/swordsman.ts` — B100 / class 100 definition.
- `web/src/content/classes/wizard.ts` — B109 / class 109 definition.
- `web/src/content/classes/class-catalog.ts` — class lookup, skill availability and class-switch equipment reconciliation.
- `web/src/content/classes/equipment-compatibility.ts` — explicit class/equipment compatibility policy.
- `web/src/content/skills/skill-catalog.ts` — six representative sword/wizard skills sourced from generated Set.lib tables.
- `web/tests/s11-content.test.ts` — S11 content contract tests.

The existing `main.ts`, `scene.ts`, `battle.ts`, `Plan.md`, `Backlog.md`, `AGENTS.md` and evidence ledger are not modified by this branch.

## Playable definitions

### Swordsman / B100

- authored base row: class `100`, `HP 125`, `MP 100`, move `5`, hit `160`, magic-hit `160`, authored range `1`;
- normal attack identity: melee, current Web cell range `1`;
- showcase skills: `1101`, `1201`, `1301`;
- training equipment policy: sword-family weapon/armor entries already present in `training-catalog.json`;
- `_03` is retained as the verified hit-reaction action.

### Wizard / B109

- authored base row: class `109`, `HP 100`, `MP 130`, move `4`, hit `160`, magic-hit `160`, authored range `1`;
- normal attack identity: staff-melee, current Web cell range `1`;
- showcase skills: `19101`, `19201`, `19301`;
- training equipment policy: wizard-family weapon/armor entries already present in `training-catalog.json`;
- `_03` is retained as the verified hit-reaction action.

The three showcase skills per family are an S11 playable roster. They are **not** a claim that the base retail stage learned all three skills simultaneously; the source class rows retain their actual stage-entry skill IDs separately.

## Provenance boundary

| Content | S11 status | Notes |
| --- | --- | --- |
| B100/B109 exported `ability.atr` fields | `VERIFIED` | Exact authored values from existing generated class JSON. No conversion to percentages or damage arithmetic. |
| `Magictbl.atr` MP / Dist / Area / Att / EA/EB/EC / MagicPtn fields | `VERIFIED` | Exact authored values. EA/EB/EC remain typed raw effect parameters, not a universal formula. |
| `Magicptn.atr` pattern/resource/sound references | `VERIFIED` | Presentation references only. |
| numeric action-state → `B%03d_%02d.ani` slot | `VERIFIED` | Recovered by S5. |
| `_03` hit-reaction semantic | `VERIFIED` | Recovered from the authoritative HP-decrease path. |
| `_00/_01/_02` semantic labels | `RECOVERED_SECONDARY` | Retained compatibility/runtime naming. |
| `_05` universal semantic | `UNVERIFIED` | Resource exists; S11 does not invent a universal meaning. |
| authored range used as current Web cell reach | `RECOVERED_SECONDARY` | Exact source value is preserved separately. |
| three showcase skills exposed per family | `RECONSTRUCTION_POLICY` | Offline playable slice, not retail progression truth. |
| target category (`enemy`, `enemy-area`, `self`) | `RECONSTRUCTION_POLICY` | Explicit policy layered over source Att/Team/Unit/description fields. |
| class/equipment compatibility | `RECONSTRUCTION_POLICY` | Item rows/names are retail data; current training role assignment remains reconstruction. |
| skill/buff/status numeric gameplay behavior | `RECONSTRUCTION_POLICY` | Current offline semantics only. |
| exact retail damage / hit / crit / defence formula | **not supplied** | S3 established the retired server authority boundary; S11 leaves `damageFormula: null`. |

## Integration handoff

S13 can replace existing scattered runtime branching with these catalog APIs:

1. use `playableClassById()` instead of `% 10 === 9` to resolve the active class;
2. use `availableSkillIds` / `skillAvailableForClass()` instead of family-wide numeric filtering in the UI;
3. use `skillById()` for MP, authored distance/area and Magic pattern references instead of a parallel skill whitelist;
4. use `isEquipmentCompatibleWithClass()` when presenting equipment choices;
5. on class switch, use `reconcileEquipmentForClass()` so incompatible slots are cleared while inventory ownership remains untouched;
6. keep final damage behind the existing reconstruction damage authority. Do not derive a formula from `effectA/B/C` or item min/max fields here.

S13 should preserve the provenance fields when adapting these definitions into the live battle/UI model rather than flattening them into undocumented constants.

## Validation

Pre-commit isolated validation against copies of the repository's current authored JSON inputs:

- TypeScript strict typecheck for the new `web/src/content/**` modules: pass.
- `node --experimental-strip-types --test tests/s11-content.test.ts`: **8/8 pass**.

The branch PR should additionally run repository CI (`typecheck`, complete unit suite, production build and applicable E2E). Because S11 deliberately does not wire shared runtime entrypoints, no new screenshot semantics are asserted by this branch.
