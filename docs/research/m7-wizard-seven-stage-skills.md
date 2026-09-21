# S32 — M7 Wizard Seven-stage Skill Evidence Note

Branch: \`codex/s32-m7-wizard-skills\`  
Baseline: \`main@1d592d0e2194567c5d7d863e6a48250407dabeb3\`

## 1. Scope

S32 covers the first seven wizard stages only:

| Stage | Class | Level |
| --- | ---: | --- |
| 1 | B109 | Lv1–5 |
| 2 | B119 | Lv6–15 |
| 3 | B129 | Lv16–25 |
| 4 | B139 | Lv26–35 |
| 5 | B149 | Lv36–45 |
| 6 | B159 | Lv46–55 |
| 7 | B169 | Lv56–65 |

The level axis and numeric balance are M7 reconstruction policy. M6's ten-stage authored class rows remain intact and are not reinterpreted as retail promotion proof.

## 2. Fixed-hash 2.2 evidence

Pinned installer:

- \`YBCS-Online-Setup-2.2.exe\`
- SHA-256 \`c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88\`

S25 already preserved exact \`levelabl.atr -> Magictbl.atr\` joins for these wizard rows:

| Stage | Skill | Authored MP | Dist | Area | High-level client text |
| --- | --- | ---: | ---: | ---: | --- |
| B109 | 19101 黑暗之帐 | 20 | 2 | 0 | 降低命中率 |
| B119 | 19201 毒雾 | 20 | 4 | 1 | 用毒使其中毒 |
| B129 | 19301 自然力量 | 20 | 0 | 0 | 杖击时吸收魔法力 |
| B139 | 19401 灰烬 | 27 | 3 | 2 | 阻止体力恢复 |
| B149 | 19501 诅咒之眼 | 18 | 4 | 2 | 石化并防止行动 |

Evidence level: \`VERIFIED-STATIC-ORIGINAL\` for the exact rows, names, IDs and authored fields above. It does **not** prove the old retail server formula, final status success rate, exact duration, stacking or immunity rules.

Drive cross-check: \`lapis-rebuild-assets / 30_parsed / tables / m6-s25-dual-class\`, document “S25 M6 Dual-class Matrix - fixed-hash metadata report”.

## 3. 2003 mainland historical evidence

### Poison / INT

Contemporary mainland player material reports that poison strength scales with INT and gives a historical formula involving target REG. It also records six poison levels and a stronger level coefficient. This supports the **direction** of INT scaling, not direct reuse of the exact formula in the offline reconstruction.

Sources:

- Sina, 2003-09-22, “巫师职业的要点”: https://games.sina.com.cn/z/yb/2003-09-22/48022.shtml
- Sina, 2003-11-07, “再论巫师这职业”: https://games.sina.com.cn/z/yb/2003-11-06/64802.shtml
- Sina, 2003-11-17, “佣兵游戏说明书（２）”: https://games.sina.com.cn/z/yb/2003-11-16/69016.shtml

S32 therefore implements poison as \`base + INT scaling\`, with the exact coefficient, six-tick duration and current area curve marked \`RECONSTRUCTION_POLICY\`.

### Nature Force / Ashes / Curse Eye

A 2003 player report describes:

- 自然力量: self/staff enchant; successful staff physical hits drain roughly 1–3 MP.
- 灰烬: prevents enemy HP recovery.
- 诅咒之眼: target cannot act and is not attacked while petrified.

Source:

- Sina, 2003-11-20, “新魔法系列运用”: https://games.sina.com.cn/z/yb/2003-11-20/71549.shtml

The exact durations and numeric curves remain reconstruction policy.

### Black Veil evidence conflict

The fixed 2.2 client row for \`19101\` says “降低命中率”. A 2003 mainland player article describes 黑暗之帐 as lowering the target's attack power.

This is a real source conflict. M7 follows the task-approved **client-priority rule**:

- runtime semantics: accuracy denial;
- do not silently reinterpret the client row as attack reduction;
- preserve the historical disagreement in documentation.

### Blindness / Cursed Sword

The approved M7 evidence packet identifies Stage 6 “失明” and Stage 7 “诅咒之剑” as historical mainland skills. S32 does **not** claim fixed-hash 2.2 authored IDs for them because no exact client ID join has been recovered in the current canonical matrix.

Therefore:

- identity/high-level role: \`VERIFIED-HISTORICAL\` per approved M7 packet;
- exact 2.2 skill ID: \`UNVERIFIED\`;
- MP, duration, accuracy penalties, range penalty and one-hit ×2 window: \`RECONSTRUCTION_POLICY\`.

No synthetic retail-looking numeric ID is invented. Runtime uses stable internal keys \`blindness\` and \`cursed-sword\`.

## 4. Reconstruction policy implemented

Canonical machine-readable authority:

\`manifests/m7-wizard-seven-stage-skills.json\`

It contains 7 skills × 6 levels = **42 skill-level states**.

Implemented behavior:

1. 黑暗之帐 — long, moderate physical accuracy denial; no magic-hit penalty.
2. 毒雾 — INT-scaled DOT; 30 seconds; 5-second tick; six ticks; range/area grow with skill level.
3. 自然力量 — timed self staff enchant; successful staff hit drains 1–3 MP by skill level.
4. 灰烬 — unified \`healingBlocked\` semantics; HP recovery only, not MP recovery.
5. 诅咒之眼 — petrify; cannot act; ordinary attacks cannot target; S32 policy lets already-applied DOT continue.
6. 失明 — shorter, stronger accuracy denial than 黑暗之帐; affects physical and magic hit and reduces effective range.
7. 诅咒之剑 — short curse window; the next qualifying physical hit is ×2 and consumes the curse.

All exact percentages, seconds, costs for historical-only skills and runtime status arithmetic are \`RECONSTRUCTION_POLICY\`.

## 5. Skill point and debug policy

Normal:

- level determines which skill can be learned;
- one reconstruction skill point is granted at Lv1 and one per player level;
- each skill max Lv6;
- no investment before its stage unlock.

Developer:

- \`Unlock all implemented skills\` yields all seven skills at Lv6;
- developer state is non-persistent;
- normal SaveV2 adapter rejects developer skill books.

## 6. SaveV2

S32 avoids changing the shared SaveV2 schema during parallel work. A namespaced adapter persists the normal wizard skill book under:

\`SaveV2.quest.m7WizardSkills\`

The adapter:

- preserves existing quest keys;
- validates skill point budget and stage legality on write/read;
- restores an empty legal skill book for older SaveV2 without the S32 payload;
- rejects developer override persistence.

S34 may replace this namespaced adapter with a generic M7 skill extension when integrating S31 and S32, but must supply migration/read compatibility if it does.

## 7. Server / evidence boundaries still unresolved

- exact retail poison / hit / status formulas;
- exact server-side abnormal-status hit/resist checks;
- exact higher-rank \`Magictbl\` rows not joined by S25;
- exact Stage 6/7 fixed-client IDs;
- exact boss/PvP petrify and curse resistance;
- exact stacking/refresh priority among simultaneous curses;
- exact field/battle behavior controlled by the retired server.

These remain \`SERVER-BOUNDARY\` or \`UNVERIFIED\`, never “recovered retail behavior”.
