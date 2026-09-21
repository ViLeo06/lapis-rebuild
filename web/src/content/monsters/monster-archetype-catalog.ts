import {S17_MONSTER_VISUAL_CATALOG} from './monster-visual-catalog.ts';

export type M7EvidenceStatus='VERIFIED'|'VERIFIED-STATIC-ORIGINAL'|'VERIFIED-HISTORICAL'|'RECOVERED_SECONDARY'|'INFERRED'|'SERVER-BOUNDARY'|'RECONSTRUCTION_POLICY'|'UNVERIFIED';
export type MonsterTrainingBand='T1'|'T2'|'T3'|'T4'|'T5'|'T6'|'T7';
export type MonsterDifficultyTier='normal'|'hard'|'elite'|'boss';
export type DynamicDifficultyHint='Easy'|'Normal'|'Hard'|'Very Hard';
export type MonsterCombatTrait='melee'|'high-attack-low-defense'|'high-defense-low-attack'|'fast'|'ranged'|'tank'|'dot'|'control'|'magic'|'healer'|'elite'|'boss';
export type MonsterAbilityKind='physical-strike'|'rapid-strike'|'ranged-strike'|'magic-bolt'|'poison-dot'|'stun'|'slow'|'guard'|'self-heal'|'enrage'|'command-burst';

export interface MonsterAbilityDefinition{
  readonly abilityId:string;readonly kind:MonsterAbilityKind;readonly powerMultiplier?:number;readonly chance?:number;readonly durationSeconds?:number;
  readonly tickIntervalSeconds?:number;readonly ticks?:number;readonly healHp?:number;readonly cooldownSeconds?:number;readonly mpCost?:number;
  readonly note:string;readonly evidenceStatus:'RECONSTRUCTION_POLICY';
}
export interface MonsterRecoveryCapability{readonly kind:'self-heal';readonly amount:number;readonly cooldownSeconds:number;readonly blockedByStatus:'healingBlocked';readonly evidenceStatus:'RECONSTRUCTION_POLICY';}
export interface MonsterEvidenceBoundary{
  readonly visualResource:'VERIFIED-STATIC-ORIGINAL';readonly visualBinding:'RECONSTRUCTION_POLICY';readonly descriptiveIdentity:'RECONSTRUCTION_POLICY';
  readonly combatNumbers:'RECONSTRUCTION_POLICY';readonly aiBehavior:'RECONSTRUCTION_POLICY';readonly abilities:'RECONSTRUCTION_POLICY';
  readonly retailEnemyStats:'SERVER-BOUNDARY';readonly retailEnemyAi:'SERVER-BOUNDARY';readonly fieldEncounterBinding:'SERVER-BOUNDARY';
}
export interface MonsterArchetype{
  readonly monsterId:string;readonly displayName:string;readonly descriptiveName:string;readonly visualId:string;readonly visualFamily:`B${number}`;
  readonly level:number;readonly fixedLevel:true;readonly maxHp:number;readonly maxMp:number;readonly attack:number;readonly defense:number;
  readonly magicAttack:number;readonly magicDefense:number;readonly movementRange:number;readonly attackRange:number;readonly aiArchetype:string;
  readonly abilities:readonly MonsterAbilityDefinition[];readonly recoveryCapability:MonsterRecoveryCapability|null;readonly difficultyTier:MonsterDifficultyTier;
  readonly trainingBand:MonsterTrainingBand;readonly traits:readonly MonsterCombatTrait[];readonly evidenceStatus:'RECONSTRUCTION_POLICY';readonly evidence:MonsterEvidenceBoundary;
}
export interface MonsterLevelBand{readonly band:MonsterTrainingBand;readonly minLevel:number;readonly maxLevel:number;readonly purpose:string;}
export interface MonsterDifficultyMatrixRow extends MonsterLevelBand{readonly normalMonsterIds:readonly string[];readonly hardMonsterIds:readonly string[];readonly eliteBossMonsterIds:readonly string[];}
export interface S33TrainingMilestoneCandidate{
  readonly battle:number;readonly recommendedLevel:number;readonly trainingBand:MonsterTrainingBand;readonly candidateMonsterIds:readonly string[];
  readonly recommendedDifficulty:'Normal'|'Hard'|'Elite/Boss';readonly trainingPurpose:string;readonly evidenceStatus:'RECONSTRUCTION_POLICY';
}

export const M7_MONSTER_BALANCE_POLICY={
  "id": "M7MonsterBalancePolicy",
  "provenance": "RECONSTRUCTION_POLICY",
  "fixedMonsterStats": true,
  "playerLevelScaling": false,
  "levelAxis": [
    1,
    6,
    16,
    26,
    36,
    46,
    56
  ],
  "dynamicDifficultyHint": {
    "easyAtOrAboveDelta": 7,
    "normalMinimumDelta": -2,
    "hardMinimumDelta": -7,
    "note": "The hint compares player level with the encounter recommendation only. It never mutates monster level or stats."
  },
  "boundaries": [
    "Exact retail enemy stat growth is SERVER-BOUNDARY.",
    "Exact retired-server enemy AI programs are SERVER-BOUNDARY.",
    "Exact retail physical/magic damage arithmetic is SERVER-BOUNDARY.",
    "Field-to-encounter bindings are SERVER-BOUNDARY.",
    "All M7 offline monster numbers, ability tuning and training bindings are RECONSTRUCTION_POLICY."
  ]
} as const;
export const M7_MONSTER_LEVEL_BANDS:readonly MonsterLevelBand[]=[
  {
    "band": "T1",
    "minLevel": 1,
    "maxLevel": 5,
    "purpose": "Stage 1 fundamentals"
  },
  {
    "band": "T2",
    "minLevel": 6,
    "maxLevel": 15,
    "purpose": "Stage 2 role differentiation"
  },
  {
    "band": "T3",
    "minLevel": 16,
    "maxLevel": 25,
    "purpose": "Stage 3 control and burst checks"
  },
  {
    "band": "T4",
    "minLevel": 26,
    "maxLevel": 35,
    "purpose": "Stage 4 heal-block and control checks"
  },
  {
    "band": "T5",
    "minLevel": 36,
    "maxLevel": 45,
    "purpose": "Stage 5 sustained buff/DOT checks"
  },
  {
    "band": "T6",
    "minLevel": 46,
    "maxLevel": 55,
    "purpose": "Stage 6 command/support and elite checks"
  },
  {
    "band": "T7",
    "minLevel": 56,
    "maxLevel": 65,
    "purpose": "Stage 7 control, elite and boss checks"
  }
];
const EVIDENCE:MonsterEvidenceBoundary={
  "visualResource": "VERIFIED-STATIC-ORIGINAL",
  "visualBinding": "RECONSTRUCTION_POLICY",
  "descriptiveIdentity": "RECONSTRUCTION_POLICY",
  "combatNumbers": "RECONSTRUCTION_POLICY",
  "aiBehavior": "RECONSTRUCTION_POLICY",
  "abilities": "RECONSTRUCTION_POLICY",
  "retailEnemyStats": "SERVER-BOUNDARY",
  "retailEnemyAi": "SERVER-BOUNDARY",
  "fieldEncounterBinding": "SERVER-BOUNDARY"
};
type MonsterRowInput=Omit<MonsterArchetype,'fixedLevel'|'evidenceStatus'|'evidence'>;
const RAW_MONSTERS:readonly MonsterRowInput[]=[
  {
    "monsterId": "m7-green-sword-trainee-l2",
    "displayName": "Green Sword Humanoid",
    "descriptiveName": "green-sword-humanoid",
    "visualId": "monster-visual-001",
    "visualFamily": "B4524",
    "level": 2,
    "maxHp": 90,
    "maxMp": 0,
    "attack": 22,
    "defense": 12,
    "magicAttack": 10,
    "magicDefense": 10,
    "movementRange": 4,
    "attackRange": 1,
    "aiArchetype": "melee-pressure",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T1",
    "traits": [
      "melee"
    ]
  },
  {
    "monsterId": "m7-blue-polearm-skirmisher-l5",
    "displayName": "Blue Polearm Skirmisher",
    "descriptiveName": "blue-polearm-skirmisher",
    "visualId": "monster-visual-002",
    "visualFamily": "B4525",
    "level": 5,
    "maxHp": 95,
    "maxMp": 0,
    "attack": 30,
    "defense": 8,
    "magicAttack": 10,
    "magicDefense": 9,
    "movementRange": 6,
    "attackRange": 1,
    "aiArchetype": "fast-flanker",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "quick-double",
        "kind": "rapid-strike",
        "powerMultiplier": 0.68,
        "cooldownSeconds": 8,
        "note": "Two quick low-power strikes; total pressure is above one basic attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T1",
    "traits": [
      "melee",
      "fast",
      "high-attack-low-defense"
    ]
  },
  {
    "monsterId": "m7-green-armored-guard-l6",
    "displayName": "Green Armored Guard",
    "descriptiveName": "green-armored-guard",
    "visualId": "monster-visual-003",
    "visualFamily": "B4526",
    "level": 6,
    "maxHp": 155,
    "maxMp": 0,
    "attack": 20,
    "defense": 24,
    "magicAttack": 10,
    "magicDefense": 18,
    "movementRange": 3,
    "attackRange": 1,
    "aiArchetype": "defensive-guard",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "brace",
        "kind": "guard",
        "durationSeconds": 8,
        "cooldownSeconds": 16,
        "note": "Temporary defense-oriented training stance.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T2",
    "traits": [
      "melee",
      "high-defense-low-attack",
      "tank"
    ]
  },
  {
    "monsterId": "m7-cyan-spectral-ranged-l10",
    "displayName": "Cyan Spectral Ranged",
    "descriptiveName": "cyan-spectral-ranged",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 10,
    "maxHp": 135,
    "maxMp": 60,
    "attack": 24,
    "defense": 13,
    "magicAttack": 30,
    "magicDefense": 18,
    "movementRange": 4,
    "attackRange": 5,
    "aiArchetype": "ranged-kite",
    "abilities": [
      {
        "abilityId": "ranged-strike",
        "kind": "ranged-strike",
        "powerMultiplier": 1,
        "note": "Fixed-range physical training attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T2",
    "traits": [
      "ranged"
    ]
  },
  {
    "monsterId": "m7-blue-polearm-venom-l15",
    "displayName": "Blue Polearm Venom Striker",
    "descriptiveName": "blue-polearm-venom-striker",
    "visualId": "monster-visual-002",
    "visualFamily": "B4525",
    "level": 15,
    "maxHp": 185,
    "maxMp": 80,
    "attack": 32,
    "defense": 15,
    "magicAttack": 36,
    "magicDefense": 20,
    "movementRange": 5,
    "attackRange": 2,
    "aiArchetype": "dot-harasser",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "venom-mark",
        "kind": "poison-dot",
        "powerMultiplier": 0.16,
        "durationSeconds": 20,
        "tickIntervalSeconds": 5,
        "ticks": 4,
        "mpCost": 16,
        "cooldownSeconds": 12,
        "note": "Periodic poison pressure used to test sustained combat and recovery timing.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T2",
    "traits": [
      "melee",
      "dot"
    ]
  },
  {
    "monsterId": "m7-cyan-spectral-hexer-l16",
    "displayName": "Cyan Spectral Hexer",
    "descriptiveName": "cyan-spectral-hexer",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 16,
    "maxHp": 175,
    "maxMp": 120,
    "attack": 20,
    "defense": 14,
    "magicAttack": 48,
    "magicDefense": 28,
    "movementRange": 4,
    "attackRange": 4,
    "aiArchetype": "magic-artillery",
    "abilities": [
      {
        "abilityId": "magic-bolt",
        "kind": "magic-bolt",
        "powerMultiplier": 1.05,
        "mpCost": 12,
        "note": "Fixed-range magic training attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T3",
    "traits": [
      "ranged",
      "magic"
    ]
  },
  {
    "monsterId": "m7-green-sword-duelist-l22",
    "displayName": "Green Sword Duelist",
    "descriptiveName": "green-sword-duelist",
    "visualId": "monster-visual-001",
    "visualFamily": "B4524",
    "level": 22,
    "maxHp": 210,
    "maxMp": 0,
    "attack": 58,
    "defense": 15,
    "magicAttack": 12,
    "magicDefense": 18,
    "movementRange": 5,
    "attackRange": 1,
    "aiArchetype": "glass-cannon-chaser",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "heavy-lunge",
        "kind": "physical-strike",
        "powerMultiplier": 1.32,
        "cooldownSeconds": 10,
        "note": "High physical burst with intentionally weak defenses.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T3",
    "traits": [
      "melee",
      "high-attack-low-defense"
    ]
  },
  {
    "monsterId": "m7-green-armored-controller-l25",
    "displayName": "Green Armored Controller",
    "descriptiveName": "green-armored-controller",
    "visualId": "monster-visual-003",
    "visualFamily": "B4526",
    "level": 25,
    "maxHp": 285,
    "maxMp": 60,
    "attack": 38,
    "defense": 30,
    "magicAttack": 24,
    "magicDefense": 28,
    "movementRange": 3,
    "attackRange": 1,
    "aiArchetype": "control-bruiser",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "shield-stun",
        "kind": "stun",
        "powerMultiplier": 0.55,
        "chance": 0.35,
        "durationSeconds": 2,
        "cooldownSeconds": 12,
        "note": "Moderate chance short stun; intentionally not a permanent control loop.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T3",
    "traits": [
      "melee",
      "control",
      "tank"
    ]
  },
  {
    "monsterId": "m7-green-armored-renewer-l26",
    "displayName": "Green Armored Renewer",
    "descriptiveName": "green-armored-self-healer",
    "visualId": "monster-visual-003",
    "visualFamily": "B4526",
    "level": 26,
    "maxHp": 320,
    "maxMp": 100,
    "attack": 34,
    "defense": 32,
    "magicAttack": 30,
    "magicDefense": 36,
    "movementRange": 3,
    "attackRange": 1,
    "aiArchetype": "healing-warden",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "renew-self",
        "kind": "self-heal",
        "healHp": 70,
        "mpCost": 20,
        "cooldownSeconds": 12,
        "note": "Self-heal exists specifically as an M7 gameplay target for healingBlocked/Ash acceptance.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": {
      "kind": "self-heal",
      "amount": 70,
      "cooldownSeconds": 12,
      "blockedByStatus": "healingBlocked",
      "evidenceStatus": "RECONSTRUCTION_POLICY"
    },
    "difficultyTier": "normal",
    "trainingBand": "T4",
    "traits": [
      "melee",
      "healer",
      "tank"
    ]
  },
  {
    "monsterId": "m7-cyan-spectral-binder-l32",
    "displayName": "Cyan Spectral Binder",
    "descriptiveName": "cyan-spectral-ranged-controller",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 32,
    "maxHp": 310,
    "maxMp": 150,
    "attack": 24,
    "defense": 25,
    "magicAttack": 62,
    "magicDefense": 38,
    "movementRange": 4,
    "attackRange": 4,
    "aiArchetype": "ranged-controller",
    "abilities": [
      {
        "abilityId": "magic-bolt",
        "kind": "magic-bolt",
        "powerMultiplier": 1.05,
        "mpCost": 12,
        "note": "Fixed-range magic training attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "binding-chill",
        "kind": "slow",
        "chance": 0.7,
        "durationSeconds": 5,
        "mpCost": 18,
        "cooldownSeconds": 10,
        "note": "Temporary movement/action pressure for control counterplay.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T4",
    "traits": [
      "ranged",
      "magic",
      "control"
    ]
  },
  {
    "monsterId": "m7-blue-polearm-raider-l35",
    "displayName": "Blue Polearm Raider",
    "descriptiveName": "blue-polearm-fast-raider",
    "visualId": "monster-visual-002",
    "visualFamily": "B4525",
    "level": 35,
    "maxHp": 330,
    "maxMp": 0,
    "attack": 68,
    "defense": 23,
    "magicAttack": 16,
    "magicDefense": 26,
    "movementRange": 6,
    "attackRange": 2,
    "aiArchetype": "fast-raider",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "raider-double",
        "kind": "rapid-strike",
        "powerMultiplier": 0.72,
        "cooldownSeconds": 7,
        "note": "Fast double-hit pressure with limited durability.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T4",
    "traits": [
      "melee",
      "fast",
      "high-attack-low-defense"
    ]
  },
  {
    "monsterId": "m7-green-armored-bulwark-l36",
    "displayName": "Green Armored Bulwark",
    "descriptiveName": "green-armored-high-defense-tank",
    "visualId": "monster-visual-003",
    "visualFamily": "B4526",
    "level": 36,
    "maxHp": 520,
    "maxMp": 40,
    "attack": 40,
    "defense": 58,
    "magicAttack": 18,
    "magicDefense": 48,
    "movementRange": 2,
    "attackRange": 1,
    "aiArchetype": "fortress-tank",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "fortress-guard",
        "kind": "guard",
        "durationSeconds": 10,
        "cooldownSeconds": 20,
        "note": "High-defense stance that rewards use of magic/debuff options rather than pure physical spam.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T5",
    "traits": [
      "melee",
      "tank",
      "high-defense-low-attack"
    ]
  },
  {
    "monsterId": "m7-cyan-spectral-venom-caster-l42",
    "displayName": "Cyan Spectral Venom Caster",
    "descriptiveName": "cyan-spectral-dot-caster",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 42,
    "maxHp": 420,
    "maxMp": 190,
    "attack": 25,
    "defense": 31,
    "magicAttack": 82,
    "magicDefense": 50,
    "movementRange": 4,
    "attackRange": 4,
    "aiArchetype": "dot-caster",
    "abilities": [
      {
        "abilityId": "magic-bolt",
        "kind": "magic-bolt",
        "powerMultiplier": 1.05,
        "mpCost": 12,
        "note": "Fixed-range magic training attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "spectral-venom",
        "kind": "poison-dot",
        "powerMultiplier": 0.2,
        "durationSeconds": 25,
        "tickIntervalSeconds": 5,
        "ticks": 5,
        "mpCost": 24,
        "cooldownSeconds": 12,
        "note": "Higher-tier periodic magic pressure.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T5",
    "traits": [
      "ranged",
      "magic",
      "dot"
    ]
  },
  {
    "monsterId": "m7-green-sword-berserker-l45",
    "displayName": "Green Sword Berserker",
    "descriptiveName": "green-sword-high-attack-brute",
    "visualId": "monster-visual-001",
    "visualFamily": "B4524",
    "level": 45,
    "maxHp": 435,
    "maxMp": 30,
    "attack": 96,
    "defense": 27,
    "magicAttack": 18,
    "magicDefense": 30,
    "movementRange": 5,
    "attackRange": 1,
    "aiArchetype": "berserk-pressure",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "berserk-surge",
        "kind": "enrage",
        "durationSeconds": 8,
        "cooldownSeconds": 18,
        "note": "Short offensive surge with no corresponding retail claim.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "hard",
    "trainingBand": "T5",
    "traits": [
      "melee",
      "high-attack-low-defense"
    ]
  },
  {
    "monsterId": "m7-cyan-spectral-support-l46",
    "displayName": "Cyan Spectral Support",
    "descriptiveName": "cyan-spectral-magic-support",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 46,
    "maxHp": 455,
    "maxMp": 210,
    "attack": 28,
    "defense": 35,
    "magicAttack": 86,
    "magicDefense": 56,
    "movementRange": 4,
    "attackRange": 4,
    "aiArchetype": "magic-support-control",
    "abilities": [
      {
        "abilityId": "magic-bolt",
        "kind": "magic-bolt",
        "powerMultiplier": 1.05,
        "mpCost": 12,
        "note": "Fixed-range magic training attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "spectral-slow",
        "kind": "slow",
        "chance": 0.75,
        "durationSeconds": 6,
        "mpCost": 20,
        "cooldownSeconds": 11,
        "note": "Support/control pressure for Stage 6 training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T6",
    "traits": [
      "ranged",
      "magic",
      "control"
    ]
  },
  {
    "monsterId": "m7-green-armored-elite-l55",
    "displayName": "Green Armored Elite",
    "descriptiveName": "green-armored-elite-bruiser",
    "visualId": "monster-visual-003",
    "visualFamily": "B4526",
    "level": 55,
    "maxHp": 900,
    "maxMp": 80,
    "attack": 88,
    "defense": 75,
    "magicAttack": 35,
    "magicDefense": 62,
    "movementRange": 3,
    "attackRange": 1,
    "aiArchetype": "elite-bruiser",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "elite-stun",
        "kind": "stun",
        "powerMultiplier": 0.7,
        "chance": 0.3,
        "durationSeconds": 2,
        "cooldownSeconds": 11,
        "note": "Elite short control window; bounded to avoid lock chains.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "elite-brace",
        "kind": "guard",
        "durationSeconds": 8,
        "cooldownSeconds": 18,
        "note": "Elite defense cycle.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "elite",
    "trainingBand": "T6",
    "traits": [
      "melee",
      "tank",
      "control",
      "elite"
    ]
  },
  {
    "monsterId": "m7-blue-polearm-vanguard-l56",
    "displayName": "Blue Polearm Vanguard",
    "descriptiveName": "blue-polearm-stage7-vanguard",
    "visualId": "monster-visual-002",
    "visualFamily": "B4525",
    "level": 56,
    "maxHp": 540,
    "maxMp": 0,
    "attack": 98,
    "defense": 42,
    "magicAttack": 20,
    "magicDefense": 44,
    "movementRange": 5,
    "attackRange": 2,
    "aiArchetype": "stage7-vanguard",
    "abilities": [
      {
        "abilityId": "basic-strike",
        "kind": "physical-strike",
        "powerMultiplier": 1,
        "note": "Baseline physical action for offline training.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "vanguard-double",
        "kind": "rapid-strike",
        "powerMultiplier": 0.74,
        "cooldownSeconds": 8,
        "note": "Stage 7 standard pressure without elite multipliers.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "normal",
    "trainingBand": "T7",
    "traits": [
      "melee",
      "fast"
    ]
  },
  {
    "monsterId": "m7-cyan-spectral-elite-l60",
    "displayName": "Cyan Spectral Elite",
    "descriptiveName": "cyan-spectral-elite-caster",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 60,
    "maxHp": 840,
    "maxMp": 260,
    "attack": 34,
    "defense": 48,
    "magicAttack": 125,
    "magicDefense": 82,
    "movementRange": 4,
    "attackRange": 5,
    "aiArchetype": "elite-magic-artillery",
    "abilities": [
      {
        "abilityId": "magic-bolt",
        "kind": "magic-bolt",
        "powerMultiplier": 1.05,
        "mpCost": 12,
        "note": "Fixed-range magic training attack.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "elite-venom",
        "kind": "poison-dot",
        "powerMultiplier": 0.18,
        "durationSeconds": 20,
        "tickIntervalSeconds": 5,
        "ticks": 4,
        "mpCost": 26,
        "cooldownSeconds": 13,
        "note": "Elite magic DOT used with ranged pressure.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "elite-bind",
        "kind": "slow",
        "chance": 0.65,
        "durationSeconds": 5,
        "mpCost": 18,
        "cooldownSeconds": 12,
        "note": "Creates spacing pressure without hard-locking the player.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "elite",
    "trainingBand": "T7",
    "traits": [
      "ranged",
      "magic",
      "dot",
      "control",
      "elite"
    ]
  },
  {
    "monsterId": "m7-spectral-overseer-boss-l65",
    "displayName": "Spectral Overseer Boss",
    "descriptiveName": "cyan-spectral-boss-controller",
    "visualId": "monster-visual-004",
    "visualFamily": "B4544",
    "level": 65,
    "maxHp": 1580,
    "maxMp": 420,
    "attack": 118,
    "defense": 82,
    "magicAttack": 135,
    "magicDefense": 92,
    "movementRange": 4,
    "attackRange": 4,
    "aiArchetype": "boss-command-controller",
    "abilities": [
      {
        "abilityId": "boss-command-burst",
        "kind": "command-burst",
        "powerMultiplier": 1.18,
        "mpCost": 28,
        "cooldownSeconds": 12,
        "note": "Alternating boss pressure action; intended to combine physical and magic responses.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "boss-stun",
        "kind": "stun",
        "powerMultiplier": 0.55,
        "chance": 0.2,
        "durationSeconds": 2,
        "mpCost": 20,
        "cooldownSeconds": 15,
        "note": "Low-frequency hard control; chance is intentionally bounded.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      },
      {
        "abilityId": "boss-venom",
        "kind": "poison-dot",
        "powerMultiplier": 0.15,
        "durationSeconds": 20,
        "tickIntervalSeconds": 5,
        "ticks": 4,
        "mpCost": 24,
        "cooldownSeconds": 16,
        "note": "Boss DOT creates recovery/readiness decisions without relying only on HP volume.",
        "evidenceStatus": "RECONSTRUCTION_POLICY"
      }
    ],
    "recoveryCapability": null,
    "difficultyTier": "boss",
    "trainingBand": "T7",
    "traits": [
      "ranged",
      "magic",
      "control",
      "dot",
      "boss"
    ]
  }
];

function monster(input:MonsterRowInput):MonsterArchetype{
  if(!/^m7-[a-z0-9-]+$/.test(input.monsterId))throw new Error(`Invalid monster id ${input.monsterId}`);
  if(!Number.isInteger(input.level)||input.level<1||input.level>75)throw new Error(`Invalid monster level ${input.monsterId}`);
  for(const [label,value] of Object.entries({maxHp:input.maxHp,maxMp:input.maxMp,attack:input.attack,defense:input.defense,magicAttack:input.magicAttack,magicDefense:input.magicDefense,movementRange:input.movementRange,attackRange:input.attackRange})){
    if(!Number.isInteger(value)||value<0)throw new Error(`Invalid ${label} for ${input.monsterId}`);
  }
  const visual=S17_MONSTER_VISUAL_CATALOG.require(input.visualId);
  if(visual.sourceFamily!==input.visualFamily)throw new Error(`Visual family mismatch for ${input.monsterId}`);
  if(input.recoveryCapability&&(input.recoveryCapability.amount<=0||input.recoveryCapability.cooldownSeconds<=0))throw new Error(`Invalid recovery for ${input.monsterId}`);
  return Object.freeze({...input,abilities:Object.freeze([...input.abilities]),traits:Object.freeze([...input.traits]),recoveryCapability:input.recoveryCapability?Object.freeze({...input.recoveryCapability}):null,fixedLevel:true as const,evidenceStatus:'RECONSTRUCTION_POLICY' as const,evidence:EVIDENCE});
}
export const M7_MONSTER_ARCHETYPES:readonly MonsterArchetype[]=Object.freeze(RAW_MONSTERS.map(monster));

export class MonsterArchetypeCatalog{
  private readonly byId:ReadonlyMap<string,MonsterArchetype>;
  constructor(rows:readonly MonsterArchetype[]){const map=new Map<string,MonsterArchetype>();for(const row of rows){if(map.has(row.monsterId))throw new Error(`Duplicate monster ${row.monsterId}`);map.set(row.monsterId,row);}this.byId=map;}
  list():readonly MonsterArchetype[]{return Object.freeze([...this.byId.values()]);}
  get(monsterId:string):MonsterArchetype|undefined{return this.byId.get(monsterId);}
  require(monsterId:string):MonsterArchetype{const row=this.get(monsterId);if(!row)throw new Error(`Unknown monster ${monsterId}`);return row;}
  forBand(band:MonsterTrainingBand):readonly MonsterArchetype[]{return Object.freeze(this.list().filter(row=>row.trainingBand===band));}
  withTrait(trait:MonsterCombatTrait):readonly MonsterArchetype[]{return Object.freeze(this.list().filter(row=>row.traits.includes(trait)));}
}
export const M7_MONSTER_ARCHETYPE_CATALOG=new MonsterArchetypeCatalog(M7_MONSTER_ARCHETYPES);
export const M7_MONSTER_DIFFICULTY_MATRIX:readonly MonsterDifficultyMatrixRow[]=[
  {
    "band": "T1",
    "minLevel": 1,
    "maxLevel": 5,
    "purpose": "Stage 1 fundamentals",
    "normalMonsterIds": [
      "m7-green-sword-trainee-l2"
    ],
    "hardMonsterIds": [
      "m7-blue-polearm-skirmisher-l5"
    ],
    "eliteBossMonsterIds": []
  },
  {
    "band": "T2",
    "minLevel": 6,
    "maxLevel": 15,
    "purpose": "Stage 2 role differentiation",
    "normalMonsterIds": [
      "m7-green-armored-guard-l6",
      "m7-cyan-spectral-ranged-l10"
    ],
    "hardMonsterIds": [
      "m7-blue-polearm-venom-l15"
    ],
    "eliteBossMonsterIds": []
  },
  {
    "band": "T3",
    "minLevel": 16,
    "maxLevel": 25,
    "purpose": "Stage 3 control and burst checks",
    "normalMonsterIds": [
      "m7-cyan-spectral-hexer-l16"
    ],
    "hardMonsterIds": [
      "m7-green-sword-duelist-l22",
      "m7-green-armored-controller-l25"
    ],
    "eliteBossMonsterIds": []
  },
  {
    "band": "T4",
    "minLevel": 26,
    "maxLevel": 35,
    "purpose": "Stage 4 heal-block and control checks",
    "normalMonsterIds": [
      "m7-green-armored-renewer-l26"
    ],
    "hardMonsterIds": [
      "m7-cyan-spectral-binder-l32",
      "m7-blue-polearm-raider-l35"
    ],
    "eliteBossMonsterIds": []
  },
  {
    "band": "T5",
    "minLevel": 36,
    "maxLevel": 45,
    "purpose": "Stage 5 sustained buff/DOT checks",
    "normalMonsterIds": [
      "m7-green-armored-bulwark-l36"
    ],
    "hardMonsterIds": [
      "m7-cyan-spectral-venom-caster-l42",
      "m7-green-sword-berserker-l45"
    ],
    "eliteBossMonsterIds": []
  },
  {
    "band": "T6",
    "minLevel": 46,
    "maxLevel": 55,
    "purpose": "Stage 6 command/support and elite checks",
    "normalMonsterIds": [
      "m7-cyan-spectral-support-l46"
    ],
    "hardMonsterIds": [],
    "eliteBossMonsterIds": [
      "m7-green-armored-elite-l55"
    ]
  },
  {
    "band": "T7",
    "minLevel": 56,
    "maxLevel": 65,
    "purpose": "Stage 7 control, elite and boss checks",
    "normalMonsterIds": [
      "m7-blue-polearm-vanguard-l56"
    ],
    "hardMonsterIds": [],
    "eliteBossMonsterIds": [
      "m7-cyan-spectral-elite-l60",
      "m7-spectral-overseer-boss-l65"
    ]
  }
];
export const S33_TRAINING_MILESTONE_CANDIDATES:readonly S33TrainingMilestoneCandidate[]=[
  {
    "battle": 1,
    "recommendedLevel": 2,
    "trainingBand": "T1",
    "candidateMonsterIds": [
      "m7-green-sword-trainee-l2"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Basic melee/readiness tutorial",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 2,
    "recommendedLevel": 5,
    "trainingBand": "T1",
    "candidateMonsterIds": [
      "m7-blue-polearm-skirmisher-l5"
    ],
    "recommendedDifficulty": "Hard",
    "trainingPurpose": "Stage 1 graduation: fast glass-cannon pressure",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 3,
    "recommendedLevel": 6,
    "trainingBand": "T2",
    "candidateMonsterIds": [
      "m7-green-armored-guard-l6"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Stage 2 entry: high defense target",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 4,
    "recommendedLevel": 10,
    "trainingBand": "T2",
    "candidateMonsterIds": [
      "m7-cyan-spectral-ranged-l10",
      "m7-green-armored-guard-l6"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Mixed melee/ranged target priority",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 5,
    "recommendedLevel": 15,
    "trainingBand": "T2",
    "candidateMonsterIds": [
      "m7-blue-polearm-venom-l15",
      "m7-cyan-spectral-ranged-l10"
    ],
    "recommendedDifficulty": "Hard",
    "trainingPurpose": "Stage 2 graduation: DOT plus ranged pressure",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 6,
    "recommendedLevel": 16,
    "trainingBand": "T3",
    "candidateMonsterIds": [
      "m7-cyan-spectral-hexer-l16"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Stage 3 entry: magic defense check",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 7,
    "recommendedLevel": 25,
    "trainingBand": "T3",
    "candidateMonsterIds": [
      "m7-green-sword-duelist-l22",
      "m7-green-armored-controller-l25"
    ],
    "recommendedDifficulty": "Hard",
    "trainingPurpose": "Stage 3 graduation: burst versus control",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 8,
    "recommendedLevel": 26,
    "trainingBand": "T4",
    "candidateMonsterIds": [
      "m7-green-armored-renewer-l26"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Stage 4 entry and Ash/healingBlocked acceptance target",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 9,
    "recommendedLevel": 35,
    "trainingBand": "T4",
    "candidateMonsterIds": [
      "m7-cyan-spectral-binder-l32",
      "m7-blue-polearm-raider-l35"
    ],
    "recommendedDifficulty": "Hard",
    "trainingPurpose": "Stage 4 graduation: ranged control plus fast pressure",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 10,
    "recommendedLevel": 36,
    "trainingBand": "T5",
    "candidateMonsterIds": [
      "m7-green-armored-bulwark-l36"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Stage 5 entry: high-defense sustained target",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 11,
    "recommendedLevel": 45,
    "trainingBand": "T5",
    "candidateMonsterIds": [
      "m7-cyan-spectral-venom-caster-l42",
      "m7-green-sword-berserker-l45"
    ],
    "recommendedDifficulty": "Hard",
    "trainingPurpose": "Stage 5 graduation: DOT plus burst management",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 12,
    "recommendedLevel": 46,
    "trainingBand": "T6",
    "candidateMonsterIds": [
      "m7-cyan-spectral-support-l46"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Stage 6 entry: magic/control support target",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 13,
    "recommendedLevel": 55,
    "trainingBand": "T6",
    "candidateMonsterIds": [
      "m7-green-armored-elite-l55",
      "m7-cyan-spectral-support-l46"
    ],
    "recommendedDifficulty": "Elite/Boss",
    "trainingPurpose": "Stage 6 graduation: elite tank plus support",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 14,
    "recommendedLevel": 56,
    "trainingBand": "T7",
    "candidateMonsterIds": [
      "m7-blue-polearm-vanguard-l56"
    ],
    "recommendedDifficulty": "Normal",
    "trainingPurpose": "Stage 7 standard fight: fast melee pressure",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  },
  {
    "battle": 15,
    "recommendedLevel": 65,
    "trainingBand": "T7",
    "candidateMonsterIds": [
      "m7-spectral-overseer-boss-l65",
      "m7-cyan-spectral-elite-l60"
    ],
    "recommendedDifficulty": "Elite/Boss",
    "trainingPurpose": "Stage 7 boss/composite systems test",
    "evidenceStatus": "RECONSTRUCTION_POLICY"
  }
];

export function dynamicDifficultyHint(playerLevel:number,recommendedLevel:number):DynamicDifficultyHint{
  if(!Number.isInteger(playerLevel)||playerLevel<1)throw new Error('Invalid player level');
  if(!Number.isInteger(recommendedLevel)||recommendedLevel<1)throw new Error('Invalid recommended level');
  const delta=playerLevel-recommendedLevel;
  if(delta>=M7_MONSTER_BALANCE_POLICY.dynamicDifficultyHint.easyAtOrAboveDelta)return 'Easy';
  if(delta>=M7_MONSTER_BALANCE_POLICY.dynamicDifficultyHint.normalMinimumDelta)return 'Normal';
  if(delta>=M7_MONSTER_BALANCE_POLICY.dynamicDifficultyHint.hardMinimumDelta)return 'Hard';
  return 'Very Hard';
}
export function validateM7MonsterCatalog():void{
  if(M7_MONSTER_ARCHETYPES.length<14||M7_MONSTER_ARCHETYPES.length>20)throw new Error('M7 monster catalog must contain 14-20 archetypes');
  for(const band of M7_MONSTER_LEVEL_BANDS)if(M7_MONSTER_ARCHETYPE_CATALOG.forBand(band.band).length<1)throw new Error(`Missing monster coverage for ${band.band}`);
  const requiredTraits:readonly MonsterCombatTrait[]=['melee','high-attack-low-defense','high-defense-low-attack','fast','ranged','tank','dot','control','magic','healer','elite','boss'];
  for(const trait of requiredTraits)if(M7_MONSTER_ARCHETYPE_CATALOG.withTrait(trait).length<1)throw new Error(`Missing monster trait ${trait}`);
  const healer=M7_MONSTER_ARCHETYPE_CATALOG.withTrait('healer').find(row=>row.recoveryCapability?.blockedByStatus==='healingBlocked');
  if(!healer)throw new Error('M7 requires a healingBlocked-compatible self-healing monster');
  for(const row of M7_MONSTER_ARCHETYPES){
    if(!row.fixedLevel)throw new Error(`Monster level must be fixed: ${row.monsterId}`);
    if(row.evidenceStatus!=='RECONSTRUCTION_POLICY'||row.evidence.combatNumbers!=='RECONSTRUCTION_POLICY')throw new Error(`Combat provenance violation: ${row.monsterId}`);
    const visual=S17_MONSTER_VISUAL_CATALOG.require(row.visualId);if(visual.sourceFamily!==row.visualFamily)throw new Error(`Missing original visual mapping: ${row.monsterId}`);
  }
  const expected=[2,5,6,10,15,16,25,26,35,36,45,46,55,56,65];
  if(S33_TRAINING_MILESTONE_CANDIDATES.length!==expected.length)throw new Error('Invalid S33 milestone count');
  expected.forEach((level,index)=>{const row=S33_TRAINING_MILESTONE_CANDIDATES[index];if(row.recommendedLevel!==level)throw new Error(`Invalid milestone ${index+1}`);row.candidateMonsterIds.forEach(id=>M7_MONSTER_ARCHETYPE_CATALOG.require(id));});
}
validateM7MonsterCatalog();
