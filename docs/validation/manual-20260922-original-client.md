# Original Client Manual Probe — 2026-09-22

## Scope

Read-only/low-risk observation in the already logged-in `NeoDark.exe` client. No
account, payment, trade, delete, logout, or system-setting action was used.

## Observed runtime facts

- The character was in a non-battle field scene at the 城墙/布日古斯城 entrance,
  with a minimap, party portraits, field movement UI, and no battle command panel.
- Clicking the second party portrait changed the active character context: the
  item panel subsequently showed a blue-haired `Lv. 1 见习僧侣` and its portrait.
  The status panel exposed HP/MP, base attributes, derived attack, defence,
  magic attack/defence, hit/evasion, critical, magic hit/evasion, command range
  and movement range. This confirms party-member context is surfaced through the
  same non-battle UI, but does not establish the formulas.
- Clicking the field NPC labelled `兵士` once selected it and displayed its name;
  clicking it again opened a scenario panel titled `〈剧情1〉布日古斯城`.
- The scenario panel displayed `可以参加的指挥官数：02`, a prose scenario
  description, `胜利条件：消灭敌人`, and the choices `参加` / `不需要`.
  The bottom status line stated that there was no battle in progress and that it
  could be entered directly.
- Clicking `参加` closed the panel but did not visibly transition to a battle
  scene in the observed interval. Reopening the NPC returned the same scenario
  panel. Therefore “scenario selected” and “battle scene entered” are separate
  states; the latter remains unverified in this probe.

## Evidence boundary

`UNVERIFIED` archival manual note for the UI strings, party-context behavior,
scenario panel, participant count, victory condition, and the observed
post-`参加` non-transition. This probe did not retain a screenshot, capture hash,
or independently established client version; its observed waiting interval was
not measured. Treat it as a lead for a repeatable probe, not as independently
reviewable client evidence. It does not prove the retired-server condition,
reward, roster, battle-zone, or exact battle-entry rule.

## Follow-up

- Reproduce with a known eligible roster and capture the action that changes the
  selected scenario into an actual battle scene.
- Keep the original-client observation separate from Web reconstruction policy;
  do not copy the observed participant count or scenario text into gameplay
  balance without a stable source mapping.
