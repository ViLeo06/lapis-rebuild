# Authored story battle-scene catalog

> Scope: fixed-hash 2.2 client resources. `.lib` files are decoded statically with the project-owned encrypted-directory + PKWARE DCL parser. Dialogue bodies are not committed. Reproduction: `tools/probe_story_battles.py`.

## Resource model

A set of `client/SGRes/sz-NNNN.lib` files are not ordinary map bundles. They are authored battle/story containers. The checked files each contain three small members:

- `.SRF`: scene/title/objective metadata;
- `.DEO`: opening/initial battle presentation and formation script;
- `.DEE`: ending/post-battle presentation and reward/recruit script.

The scripts contain structural commands such as `SETPOSITION`, `CHARPOS`, `CHARMOVE`, `ATTACK`, `KILLCHAR*`, `CHECKGENERAL`, `GETGENERAL`, `MESSAGE` and `END`. The static catalog records hashes, command histograms, formation bounds and IDs while omitting story dialogue text.

## First recovered authored battle zones

| Battle zone | SRF title | Static structural evidence |
| ---: | --- | --- |
| 1 | `<剧情1> 布日古斯城` | opening script includes `LOADSCENE 01` and a large authored `CHARPOS` formation |
| 3 | `布日古斯城内部` | authored second-stage formation; ending script can recruit general 108 |
| 7 | `布日古斯城` | authored rescue finale with king/army actors and a large formation |
| 9 | `废矿` | compact duel scene using model 109; ending script can recruit general 109 |
| 11 | `<剧情2> 扎魔拉要塞路口` | authored story-2 opening formation |
| 13 | `扎魔拉溪谷` | authored story battle opening/ending scripts |
| 15 | `扎魔拉要塞` | authored story finale scripts |

These facts materially improve reconstruction of **which battle scenes exist and what units/positions they contain**. They do not, by themselves, prove which normal field-map interaction selected each battle zone on the retired retail server.

## Field-map → battle-zone boundary

The retail client battle-entry path consumes a battle zone supplied in session/downlink state and loads `sz-%04d.mmf`. The client archive also contains these authored `sz-NNNN.lib` battle scripts, but no independently verified generic retail field-spawn table has been recovered.

A bundled 2026 compatibility/reverse-engineering implementation proposes story mappings such as old field 1030 → battle zone 1, old 1070 → zone 3 and old 1090 → zone 7, and explicitly labels generic field encounter placement as replacement/offline policy. Those mappings are therefore **RECOVERED_SECONDARY** until an original resource, original machine-code predicate or historical server artifact independently binds them.

The practical project split is now:

`VERIFIED_STATIC_RESOURCE`: battle zone identity, scene files, authored formations, script command structure.

`VERIFIED_STATIC_ORIGINAL`: the client receives a battle zone/session and loads that zone.

`SERVER_BOUNDARY / UNRESOLVED`: the complete retail predicate that turns a particular field interaction/quest state into a particular battle zone.

## Next static targets

The next useful searches are server/session artifacts, quest dispatcher tokens, field object IDs and gate/event predicates that can bind normal maps to the authored battle-zone IDs. A compatibility-only mapping may be used for an offline reconstruction policy, but it must remain labelled separately from recovered retail fact.
