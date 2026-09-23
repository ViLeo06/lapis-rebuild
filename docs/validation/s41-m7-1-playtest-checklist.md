# M7.1 Human Playtest Checklist

Owner: S41  
Status: **PENDING — do not mark passed before final private standalone SHA exists.**

This checklist is for the exact S41 final private standalone HTML only.

## World loop

- [ ] Start game into normal field state.
- [ ] World minimap is visible at the upper-left and follows player movement.
- [ ] F8 hides/shows the world minimap without breaking movement/input.
- [ ] Fullscreen button is directly visible at the upper-right.
- [ ] Find the Training Manager NPC without opening Settings.
- [ ] Mouse click opens the same training interaction as keyboard E.
- [ ] Mobile tap opens the same training interaction.
- [ ] Out-of-range interaction gives clear feedback.
- [ ] In-range interaction opens exactly 15 training battles.
- [ ] Selecting a stage enters its expected battle zone/roster/recommended level/difficulty.

## Battle presentation

- [ ] Movement range appears automatically when the player can act.
- [ ] There is no required manual Range toggle step.
- [ ] Selecting a skill replaces movement range with cast distance + AoE.
- [ ] Cancelling skill targeting restores movement range.
- [ ] Battle minimap is bottom-right, semi-transparent, and does not block core play.
- [ ] Minimap click/tap pans camera only; it does not move/attack/cast.
- [ ] Camera starts in FOLLOW_PLAYER.
- [ ] Player movement is followed smoothly and clamps at map edges.
- [ ] Manual/minimap pan stays in MANUAL_VIEW.
- [ ] Attack/skill alone does not snap camera back.
- [ ] Next real player movement command restores FOLLOW_PLAYER.
- [ ] Monsters walk continuously with movement animation; no visible teleport.
- [ ] Monster attack starts after movement arrival.

## HUD / feedback

- [ ] Battle HUD clearly shows HP.
- [ ] Battle HUD clearly shows MP.
- [ ] Battle HUD clearly shows EXP and EXP progress.
- [ ] Battle HUD clearly shows ATK.
- [ ] Battle HUD clearly shows DEF.
- [ ] Damage numbers appear above the actor that actually took damage.
- [ ] Poison initial damage appears immediately.
- [ ] Later poison ticks remain 50% of the initial poison hit and do not keep halving.
- [ ] Multiple poisoned enemies show independent floating numbers.
- [ ] Status feedback is understandable without opening Debug Panel.

## Skill fidelity spot-check

Swordsman:
- [ ] 重击: damage + actual Stun.
- [ ] 连砍: two separate hit events.
- [ ] 强防: DEF visibly/effectively increases.
- [ ] 爆发: ATK up + MaxHP up + DEF down; expiry restores state correctly.
- [ ] 舍身: sustained ATK buff + periodic small HP cost, never below 1 HP.
- [ ] 战斗命令: readiness/range effect and visible status.
- [ ] 打晕: damage + high-control Stun behavior.

Wizard:
- [ ] 黑暗之帐: actual accuracy debuff; higher level range/AoE behavior is visible.
- [ ] 毒雾: empty-center AoE, immediate damage, multi-target DOT.
- [ ] 自然力量: self buff then staff-hit MP drain.
- [ ] 灰烬: Healing Block, not Cannot Act.
- [ ] 诅咒之眼: Petrify prevents acting.
- [ ] 失明: physical hit + magic hit + effective range reduction.
- [ ] 诅咒之剑: visible waiting window; next legal physical attack consumes the buff.

## Progression loop

- [ ] Win a training battle and receive visible EXP +N feedback.
- [ ] Retreat from a battle and receive 0 EXP.
- [ ] Failure receives 0 EXP.
- [ ] Level-up increases level.
- [ ] Each level gained grants Skill Point +1.
- [ ] A large reward can grant multiple levels correctly.
- [ ] Spend a skill point and observe the skill upgrade.
- [ ] Save, reload, and confirm EXP/level/skill points/skill levels are identical.
- [ ] Developer preset does not pollute the normal save.

## Regression

- [ ] Direct enemy click still performs ordinary attack.
- [ ] All living enemies are visible from battle start.
- [ ] Only the nearby <=5 interaction cluster actively engages at once.
- [ ] Poison can target an empty center cell.
- [ ] Confirmed retreat returns to the correct field state.
- [ ] Recovery actions still work.
- [ ] Mobile battle interaction works.
- [ ] Original battle-zone routing remains intact.
- [ ] All 15 fixed training rosters remain intact.

## Gate

Only after the user tests the exact final HTML SHA and explicitly says **“试玩通过，可以合并。”** may the final integration be merged to `main`.
