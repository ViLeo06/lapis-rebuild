# S16 NPC Visual Recovery — integration note

> Branch: codex/m5-npc-visual-recovery  
> Baseline: 047c52af340076a00a6e0d347806708ad92844d1  
> Scope: presentation/resource recovery only. S16 does not own quest logic, world placement, spatial triggers, or shared scene.ts wiring.

## Coordinator summary

S16 establishes this presentation boundary:

    world entity (S18/coordinator owned)
        -> explicit visualId binding
    NpcVisualCatalog
        -> Char/Bxxxx_NN ANI+SPR or NPC350 portrait source
    animation / portrait presentation

There is deliberately no NPCScript blockId == sprite ID fallback. NPCScript block, world entity, and visual archetype are separate layers.

## 1. NPC350.Tip is a portrait library, not a field sprite sheet

The fixed-hash client contains NRes/NPC350.Tip with:

- canvas 3000 x 1125;
- 50 frames;
- every frame 300 x 225 in the recovered frame table;
- source SHA-256 captured by the S16 private inventory on every fixed-hash run.

A diagnostic renderer using the verified TIP run framing plus an INFERRED RGB565/5-bit-alpha interpretation for run kinds 3/4 produces coherent character portraits: many visibly distinct humanoid NPC-like faces plus creature/special portraits. This rendering is useful for archaeology, but the run-3/run-4 alpha/blend semantics remain INFERRED_STATIC_RENDERING, not VERIFIED.

### Retail portrait source/frame selector — VERIFIED

The fixed UPX-decompressed NeoDark.exe SHA-256 is:

432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7

The portrait loader around 0x00412700 provides a stronger binding than filename guessing:

- the observed range gate accepts 0..150; out-of-range input is replaced by 100;
- at 0x00412760, IDs below 100 select NRes/Char350.TIP and IDs at least 100 select NRes/Npc350.TIP;
- at 0x00412834, the loader divides the portrait ID by 100 and uses the remainder as the frame-table index.

Safe mapping:

| Portrait ID | Resource | Frame |
| --- | --- | --- |
| 0..99 | Char350.Tip | id % 100 |
| 100..149 | NPC350.Tip | id % 100 = 0..49 |

ID 150 is not promoted to a valid mapping: it passes the observed range check but would yield frame 50 while NPC350.Tip has only frames 0..49.

This proves the client has 50 addressable NPC portrait visual entries. It still does not prove that a given NPCScript block or field entity uses a given portrait ID.

## 2. World character ANI/SPR inventory

tools/probe_npc_visuals.py scans the complete Char/Bxxxx_NN.ani + .spr family from the fixed client and records for every family/action:

- source paths and SHA-256;
- resource number Bxxxx;
- action suffix;
- ANI layer name;
- frames_per_direction and raw timing;
- paired SPR frame count;
- transparent/anchor bounds union and max dimensions;
- direction candidates;
- action semantic evidence level;
- a content fingerprint used only to find byte-identical visual families.

The private fixed-hash run determines authoritative counts. The pre-S16 parsed asset index already showed 6,809 Char/B*.ani files across 1,638 numeric Bxxxx families; S16 re-derives this directly from the extracted client rather than trusting the older CSV snapshot.

Important: 1,638 is a world-character visual-resource count, not an NPC count. The range contains player classes, monsters and special visuals. S16 leaves role classification WORLD_CHARACTER_VISUAL_UNCLASSIFIED until independent evidence exists.

## 3. Action and direction semantics

For Body_ character ANI rows, S16 exposes the current human-validated direction order:

S, SW, W, NW, N, NE, E, SE

Action slots retain prior evidence levels:

| slot | presentation label | evidence |
| --- | --- | --- |
| _00 | idle | RECOVERED_SECONDARY |
| _01 | walk | RECOVERED_SECONDARY |
| _02 | attack-or-cast | RECOVERED_SECONDARY |
| _03 | hit reaction | VERIFIED_STATIC_ORIGINAL from the authoritative HP-loss consumer |
| _05 | special | UNVERIFIED; never universally call it death/talk |

S16 does not infer talk merely because a special animation exists. A later binding can expose a recovered interaction sequence when evidence exists; otherwise interaction animation remains absent.

## 4. NpcVisualCatalog integration API

web/src/npc/npc-visual-catalog.ts provides:

- NpcVisualArchetype;
- NpcVisualSequence;
- NpcVisualCatalog;
- NpcVisualBinding;
- resolveNpcVisualBinding();
- the verified NPC350_PORTRAIT_MAPPING constant.

The catalog is intentionally presentation-only. S18/coordinator must provide worldEntityKey -> visualId explicitly. If that binding is reconstructed rather than recovered, mark its provenance RECONSTRUCTION_POLICY.

Recommended coordinator flow:

    S18 world entity
      -> explicit NpcVisualBinding { worldEntityKey, visualId, provenance }
      -> NpcVisualCatalog.require(visualId)
      -> choose idle/walk/action by runtime presentation state

Do not add a fallback such as visualId = npcScriptBlockId or visualId = mapObjectId.

## 5. Private gallery and screenshots

.github/workflows/s16-npc-visual.yml is static-only and hash-pinned. It:

1. downloads and verifies the fixed 2.2 installer;
2. statically extracts it without executing the client;
3. downloads/verifies the same UPX decompressor used by S5 and produces the fixed unpacked image;
4. runs the full S16 inventory and exact portrait-loader signature probe;
5. builds a private gallery for a broad deterministic sample of unclassified world-character families;
6. renders all discovered action atlases with all eight direction rows;
7. exposes action/direction/frame-speed controls in index.html;
8. captures gallery overview/detail screenshots after Chromium is installed;
9. uploads original-derived gallery PNGs only as a short-lived private Actions artifact.

The HTML calls sampled Bxxxx entries NPC_CANDIDATE_VISUAL_ONLY. That means “inspect for NPC suitability”; it does not assert original retail role.

## 6. Evidence and reconstruction boundary

### VERIFIED_STATIC_ORIGINAL

- fixed portrait loader source switch at ID 100;
- modulo-100 portrait frame selection;
- 100..149 -> NPC350 frame 0..49;
- _03 hit-reaction binding inherited from S5;
- parsed ANI/SPR/TIP structure and source hashes from the fixed client.

### INFERRED / UNVERIFIED

- TIP run-kind 3/4 alpha/blend visual semantics;
- whether any unbound Bxxxx family is an NPC, monster, or special object based on pixels alone;
- any individual NPC name/role inferred only from appearance;
- _05 as talk/death/interaction.

### RECONSTRUCTION_POLICY

Use this label for any coordinator-created world placement or world-entity -> visual mapping that cannot be recovered from independent retail evidence.

## 7. Files delivered by S16

- tools/npc_visual_core.py
- tools/probe_npc_visuals.py
- tools/build_npc_visual_gallery.py
- tests/parsers/test_npc_visuals.py
- web/src/npc/npc-visual-catalog.ts
- web/tests/s16-npc-visual.test.ts
- data/manifests/npc-visual-recovery.json
- .github/workflows/s16-npc-visual.yml
- private CI artifact: s16-npc-visual-gallery

No changes are required in scene.ts, main.ts, battle.ts, Plan.md, Backlog.md, or docs/evidence-ledger.md for this PR.
