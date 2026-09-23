# S34 — M7 Integration / Balance / Acceptance

Date: 2026-09-22  
Branch: `codex/s34-m7-integration-acceptance`  
Baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`  
Executable runtime source: `62566a549a2d1f6f2c15b1a4370329e4382ae94a`

## Status

**S30–S33 integrated. Shared core integrated. Automated engineering gate passed. Final user playtest is still pending.**

S34 must remain unmerged until the user plays the exact final private standalone HTML.

## Upstream intake

| Worker | PR | Source SHA |
| --- | ---: | --- |
| S30 | #43 | `e26e68c9b28d98f4311490741a136723a2b064f2` |
| S31 | #45 | `911872bbc3b035090890c104c1e8884789b8e728` |
| S32 | #46 | `aec7d519c56443aca71e67440d7ed1971e07c906` |
| S33 | #44 | `26ffefbcb8a764a062994293034dd2fb7752216b` |

## Integrated runtime

S34 consumed upstream modules rather than reimplementing their domains.

- S30: 19 fixed-level monster archetypes and seven-band difficulty data.
- S31: seven swordsman skills, six levels each, common status primitives and save adapter.
- S32: seven wizard skills, six levels each, wizard status/runtime/save adapters.
- S33: 15 training presets, Recovery actions, Developer presets and mobile controls.

Shared integration covers:

- fixed concrete S30 enemy rosters in `battle.ts`;
- original battle-zone routing in `scene.ts`;
- first-seven promotion cadence `6/16/26/36/46/56`;
- M7 skill legality/levels and combat status resolution;
- healer regeneration + Ashes heal block;
- DOT, stun, petrify, Sacrifice periodic self-damage and curse windows;
- HP/MP Recovery through readiness authority;
- M7 SaveV2 extension/migration and normal/debug separation;
- Training Camp + mobile touch + confirmed retreat regression.

## Training acceptance

15 recommended levels:

`2 / 5 / 6 / 10 / 15 / 16 / 25 / 26 / 35 / 36 / 45 / 46 / 55 / 56 / 65`.

15 original-client battle-zone resources:

`1 / 3 / 9 / 11 / 13 / 15 / 21 / 23 / 31 / 41 / 51 / 61 / 71 / 81 / 91`.

Player level only changes the display difficulty hint. It does not mutate fixed monster level/stats/AI/abilities.

## Validation

Executable head `62566a5...`:

- Web/parser run `35690650510`: success.
- parser: 84/84 passed.
- unit: 269/269 passed.
- Playwright: 72 passed / 4 skipped / 0 failed.
- S17 evidence workflow `35690650505`: success.
- final private pack embedded-entry integrity: 3,772/3,772 verified.

Full report: `docs/validation/m7-final-20260922.md`.

## Private standalone

Historical engineering artifact:

- exact runtime source: `62566a549a2d1f6f2c15b1a4370329e4382ae94a`
- size: 122,196,302 bytes
- recorded SHA-256: `6ba496998b507c7ab863cc219acbcf2e9e2508abca5cb98ebaaac97032cc782b`
- the exact historical byte snapshot was not retained for current download.

Current user handoff:

- file: `lapis-m7-private-62566a5-handoff.html`
- size: 122,196,302 bytes
- SHA-256: `4c337dd2cb34f838d961207eeb2a126a4c146089dae07cdcdda069f54eec156f`
- embedded integrity: 3,772 / 3,772 entries, 0 failures
- fixed installer SHA: `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`
- private pack hash: `b310803ff4897f23f96cda34cc1989254261f8703d7457c3cf85691812e67287`
- visibility: private-only.

The handoff is a byte-distinct regeneration from the same executable source and exact fixed-hash private assets; it is not mislabeled as the historical artifact. The original Windows client was never executed.

## Remaining evidence boundary

The integration does not claim recovery of retired-server formulas or live payloads. Exact retail damage/status formulas, historical per-encounter AI, original enemy stat growth and authoritative field/event→encounter mapping remain server-boundary gaps. M7 tuning/bindings are reconstruction policy where not directly evidenced.

## Merge gate

PR #42 remains draft and **must not merge to main before the user plays and accepts the current handoff SHA `4c337dd2...`**.
