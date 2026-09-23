# S36 — M7.1 Swordsman Skill Fidelity

Date: 2026-09-23  
Branch: `codex/s36-m7-1-swordsman-skill-fidelity`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`

## Scope

S36 changes only the swordsman skill/status domain, focused tests, and handoff documentation. It does not modify `scene.ts`, `battle.ts`, `m4-runtime-integration.ts`, Battle HUD, Plan, Backlog, or the evidence ledger.

## Evidence boundary

S35 output was checked before finalizing this worker and was not present.

- first-five skill identity, Lv1 MP, and high-level descriptions: `VERIFIED-STATIC-ORIGINAL`;
- 重击/连砍 Lv2-Lv6 MP sequences from the approved M7.1 contract: `RECOVERED_SECONDARY` until S35 cross-checks the raw workbook rows;
- 战斗命令 / 打晕 high-level identity: `VERIFIED-HISTORICAL`;
- exact damage, stun, duration, readiness, and retired-server formulas: `RECONSTRUCTION_POLICY / SERVER-BOUNDARY`;
- 舍身 periodic behavior: `PLAYER_MEMORY + RECONSTRUCTION_POLICY`.

S36 does not promote missing S35 interpretations into original-server facts.

## Implemented behavior

### 重击

- MP: `25 / 32 / 38 / 44 / 50 / 60`.
- High-damage single hit.
- Actual stun status and `STUN_APPLIED` event.

### 连砍

- MP: `23 / 29 / 35 / 40 / 46 / 55`.
- Exactly two hit multipliers at every skill level.
- `independentHitRolls=true`.
- `m7SwordsmanDamageEvents(...)` emits one `DAMAGE` event per resolved hit.

### 强防

Replaces the S31 percentage model with flat DEF:

`+20 / +25 / +30 / +35 / +40 / +50`

The generic legacy percentage modifier remains supported for compatibility, but Strong Defence itself no longer writes it.

### 爆发

Flat composite status:

- ATK up;
- MaxHP up;
- DEF down.

Confirmed endpoints follow M7.1: Lv1 `+10 / +10 / -5`, Lv6 `+35 / +35 / -17`. Middle rows/durations remain explicit reconstruction policy pending S35.

Runtime behavior:

- cast adds the temporary MaxHP delta to current HP;
- expiration removes temporary stat modifiers;
- HP above restored base MaxHP is clamped;
- transient Burst status is excluded from the skill-save payload, so it cannot permanently inflate base stats after reload.

### 舍身

Preserved as approved:

- 60s duration;
- 10s periodic HP tick;
- HP cost `4 / 4 / 5 / 5 / 6 / 6`;
- minimum `1 HP`;
- flat ATK `+15 / +18 / +22 / +26 / +30 / +35`;
- no one-shot self-damage conversion.

### 战斗命令

Provides actual domain effects:

- command-range bonus by level;
- readiness/action efficiency bonus;
- `COMMAND_BUFF` event.

### 打晕

- lower damage than 重击;
- higher stun chance;
- lower boss stun chance;
- successful application actually creates a stun status and blocks an action.

## Event contract

S36 exports:

- `DAMAGE`
- `STUN_APPLIED`
- `DEF_BUFF`
- `BURST_BUFF`
- `SACRIFICE_BUFF`
- `SACRIFICE_TICK`
- `COMMAND_BUFF`
- `STATUS_ENDED`

Events carry skill key, skill level, target, and relevant damage/tick/status metadata for S40/S41.

## S41 integration handoff

S36 intentionally leaves these shared-core hooks to S41:

1. **Flat DEF consumption** — when `battle.ts` builds player defender stats, consume `m7EffectiveDefense(baseDefense,statuses)` or `m7SwordsmanEffectiveStats(state, baseDefense).defense`. Until this bridge is wired, Strong Defence/Burst DEF changes are domain-correct but not yet part of the shared damage calculation.
2. **Double Slash independent resolution** — baseline shared battle code aggregates hits. S41 must resolve the two rolls independently and forward one `DAMAGE` event per hit.
3. **Presentation** — forward S36 typed events to S40's target-anchor/status feedback layer.
4. **SaveV2** — persist skill progression normally but never fold temporary Burst/Sacrifice modifiers into permanent character base stats.
5. **Battle Command** — apply `readinessEfficiencyMultiplier` at the existing readiness authority instead of inventing a second readiness formula.

## Validation

Focused tests cover:

- all 42 skill-level rows;
- unlock/stage boundaries;
- Heavy/Double MP curves;
- Heavy vs Stun Strike distinction and boss resistance;
- two-hit event contract;
- all six Strong Defence flat DEF states;
- Burst cast/expiry/current-HP clamp;
- six Sacrifice ticks and non-lethal floor;
- Battle Command effects;
- resource consumption;
- flat-status composition;
- save round-trip without transient-buff contamination;
- strict status validation.

## Known risks

- S35 may replace provisional middle rows/durations with stronger raw-field evidence.
- Exact retired-server damage/stun/readiness/DEF formulas remain unavailable.
- Stage 6/7 numeric retail skill IDs remain `UNVERIFIED`.
