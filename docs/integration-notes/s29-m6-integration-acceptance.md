# S29 — M6 Integration / Acceptance

Date: 2026-09-20  
Branch: `codex/s29-m6-integration-acceptance`  
M6 baseline: `main@4aea5b81fa4cca00c9a80b3ff2389eb391c09b17`  
Plan: v3.4

## Current status

**CLOSED / AUTOMATED + USER ACCEPTANCE PASSED.**

S29 started as a preflight-only branch. After review, the actual upstream state was:

- S25 complete
- S26 complete
- S27 branch still identical to the M6 baseline: no implementation
- S28 complete
- S29 contained only preflight/acceptance material

S29 therefore took over the missing work instead of treating the five sessions as already complete.

## Integration order

The completed upstream PRs were retargeted to S29 rather than merged directly into `main`:

1. PR #40 / S25 — canonical dual-class evidence matrix
2. PR #39 / S26 — swordsman ten-stage domain
3. PR #41 / S28 — world/progression/quest/equipment/save authority
4. S27 — implemented directly on S29 because the original S27 branch had no delta

`main` remained unchanged until automated and user acceptance both passed.

## S27 recovery completed on S29

S29 added:

- `web/src/classes/wizard-ten-stage.ts`
- `web/src/classes/wizard-save.ts`
- `web/tests/s27-wizard-progression.test.ts`
- `docs/integration-notes/s27-m6-wizard-progression.md`

The wizard track is:

`109 -> 119 -> 129 -> 139 -> 149 -> 159 -> 169 -> 179 -> 189 -> 199`

Evidence boundaries remain explicit:

- authored class rows / HP / MP / hit / magic-hit / stage-entry Magic refs: **VERIFIED-STATIC-ORIGINAL**
- recovered action semantics: **RECOVERED_SECONDARY** where applicable
- promotion levels and staged playable unlocks: **RECONSTRUCTION_POLICY**
- retired server promotion predicates / derived MATK / full late-stage spell behavior: **SERVER-BOUNDARY / UNVERIFIED**

The authored references `19401` and `19501` are preserved as evidence but are not fabricated into playable effects.

## Production runtime integration

S29 removed the M5.1 assumption that the production player runtime only knows class IDs `100` and `109`.

The production class catalog now exposes all twenty canonical stage IDs:

Swordsman:

`100,110,120,130,140,150,160,170,180,190`

Wizard:

`109,119,129,139,149,159,169,179,189,199`

Runtime integration now includes:

- stage-aware playable class definitions
- stage-aware representative skill availability
- promotion through the production M6 promotion authority
- equipment validation through the S28 M6 equipment authority
- M6 SaveV2 extension and M5.1 SaveV2 migration
- twenty-stage character validation context
- stage state in runtime diagnostics/snapshot
- original-derived visual family switching after promotion

## Save model decision

M6 uses **one active profession track per save**.

Player-facing profession switching from M5.1 is now treated as:

> start a new swordsman save / start a new wizard save

It resets that active save's growth state rather than sharing one progression object across professions.

This avoids cross-profession stage/progression leakage and satisfies the S29 acceptance specification's explicit persistence boundary without introducing an unproven multi-character account model.

## Asset pipeline integration

The private and synthetic asset pack builders now include all twenty profession visual families.

Private-original generation still begins from the fixed-hash 2.2 installer:

`c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`

The pack includes the ten swordsman and ten wizard B-family resources needed for runtime promotion. Original bulk assets remain outside Git.

## Acceptance tests added

S29 adds:

- `web/tests/s29-m6-integration.test.ts`
- `web/e2e/s29-m6-integration.spec.ts`

They verify:

- exactly twenty production class definitions
- swordsman `100 -> 190`
- wizard `109 -> 199`
- no direct stage mutation as acceptance proof
- early promotion rejection
- promotion through production authority
- staged representative skills
- SaveV2 M6 stage round-trip
- profession isolation when starting a new profession save

A webdriver-only acceleration hook grants deterministic EXP **through the production reward/progression authority**. It is absent from normal player sessions and does not set stage IDs directly.

## M6 wall-clock soak

`web/soak.mjs` is upgraded from the old M5 field soak.

Each M6 cycle now:

1. starts a swordsman or wizard profession save;
2. routes deterministic test EXP through production reward/progression authority;
3. promotes through the production M6 promotion authority to 110 or 119;
4. equips legal profession gear;
5. Save/Load round-trips the M6 extension;
6. exercises camera follow and recovered guide visibility;
7. toggles diagnostics;
8. alternates profession family on the next cycle.

The required duration remains a real 30-minute wall-clock interval.

## M5.1 regression gates retained

Final browser acceptance continues to execute the inherited player gates, including:

- NPC pointer interaction
- keyboard E
- mobile touch
- delayed camera centering / world-edge clamp
- fullscreen / zoom
- field -> interior transition
- monster visibility
- battle
- confirmed retreat
- explicit quest turn-in
- diagnostics hidden by default
- standalone offline behavior

## Evidence boundary

A functioning M6 growth system is engineering evidence, not proof that the retired retail server formulas were recovered.

Still reconstruction/server-boundary unless separately proven:

- exact retail EXP curve
- promotion levels and promotion quest predicates
- full equipment eligibility enforcement
- exact damage / defence / critical formulas
- quest rewards and server eligibility
- late-stage Magic behavior not covered by a complete content contract
- exact MagicRes placement/blend semantics

## Final validation and human gate

Final automated validation completed successfully.

- fixed-hash private runtime head: `0a51f242a6357031f7f5b83c743fae7724c7e2f9`
- fixed-hash installer SHA-256: `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`
- private browser acceptance: `61 passed / 4 skipped / 0 failed`
- final M6 validation run: `35562393435` — success
- new M6 wall-clock soak: `1,800,634 ms`
- soak page errors: `0`
- soak external HTTP(S) requests: `0`
- final validation artifact: `10623039460`
- final private HTML bytes: `22,968,621`
- final private HTML SHA-256: `f509c71b69ae5b41419a1f9c397108200bad1a1ef449f386927378d7d0ae59b4`

The original public installer mirror later returned HTTP 404. Final validation retained the exact previously fixed-hash-verified private HTML only after a strict lineage check proved that later deltas were limited to CI/validation scripts and did not change runtime/content/resource-builder source.

S17's fixed-client workflow was likewise reconciled with a strict retained-evidence lineage gate; final S17 validation run `35564552171` passed.

### User acceptance

On 2026-09-21 the user personally played the exact M6 private HTML above and explicitly reported **no problem** and authorized merge.

This closes the M6 human gate. It does not upgrade reconstruction-only combat/progression/server rules to historical retail truth.
