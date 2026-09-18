export type MonsterVisualProvenance='VERIFIED_STATIC_ORIGINAL'|'RECOVERED_SECONDARY'|'UNVERIFIED'|'RECONSTRUCTION_POLICY';
export type MonsterVisualAction='idle'|'move'|'attack'|'hit'|'death';
export type MonsterDirectionSemantics='RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED'|'RECOVERED_SECONDARY_BODY_ROW_ORDER';

export interface MonsterVisualActionBinding{
  readonly action:MonsterVisualAction;
  readonly slot:string|null;
  readonly provenance:MonsterVisualProvenance;
  readonly note:string;
}

export interface MonsterVisualArchetype{
  readonly visualId:string;
  readonly sourceFamily:`B${number}`;
  readonly sourceNumericId:number;
  readonly identityLabel:string;
  readonly identityProvenance:'VERIFIED_MANUAL_VISUAL'|'UNVERIFIED';
  readonly availableSlots:readonly string[];
  readonly directionRows:8;
  readonly directionSemantics:MonsterDirectionSemantics;
  readonly actions:Readonly<Record<MonsterVisualAction,MonsterVisualActionBinding>>;
  readonly provenance:readonly string[];
}

export interface BattleUnitVisualBinding{
  readonly battleUnitKey:string;
  readonly visualId:string;
  readonly provenance:MonsterVisualProvenance;
  readonly basis:string;
}

const baseActions=(slots:readonly string[]):Readonly<Record<MonsterVisualAction,MonsterVisualActionBinding>>=>Object.freeze({
  idle:Object.freeze({action:'idle',slot:slots.includes('00')?'00':null,provenance:'RECOVERED_SECONDARY',note:'Compatibility/runtime label for state 0; S17 manual gallery confirms an idle-like sequence for the reviewed families.'}),
  move:Object.freeze({action:'move',slot:slots.includes('01')?'01':null,provenance:'RECOVERED_SECONDARY',note:'Compatibility/runtime label for state 1; S17 manual gallery confirms a movement-like sequence for the reviewed families.'}),
  attack:Object.freeze({action:'attack',slot:slots.includes('02')?'02':null,provenance:'RECOVERED_SECONDARY',note:'Compatibility/runtime label for state 2; S17 manual gallery confirms an attack-like sequence. Exact impact frame remains unresolved.'}),
  hit:Object.freeze({action:'hit',slot:slots.includes('03')?'03':null,provenance:'VERIFIED_STATIC_ORIGINAL',note:'Authoritative HP-loss path sets character action state 3, which loads _03.'}),
  death:Object.freeze({action:'death',slot:null,provenance:'UNVERIFIED',note:'No universal retail death action state is recovered; _05 must not be promoted to death.'}),
});

export function createMonsterVisualArchetype(input:{
  visualId:string;
  sourceNumericId:number;
  identityLabel?:string;
  identityProvenance?:'VERIFIED_MANUAL_VISUAL'|'UNVERIFIED';
  availableSlots:readonly string[];
  directionSemantics?:MonsterDirectionSemantics;
  provenance?:readonly string[];
}):MonsterVisualArchetype{
  if(!/^monster-visual-\d{3}$/.test(input.visualId))throw new Error('Invalid monster visual id');
  if(!Number.isInteger(input.sourceNumericId)||input.sourceNumericId<0)throw new Error('Invalid source numeric id');
  const slots=[...new Set(input.availableSlots)].sort();
  if(!slots.every(slot=>/^\d{2}$/.test(slot)))throw new Error('Invalid action slot');
  return Object.freeze({
    visualId:input.visualId,
    sourceFamily:`B${input.sourceNumericId}` as const,
    sourceNumericId:input.sourceNumericId,
    identityLabel:input.identityLabel??input.visualId,
    identityProvenance:input.identityProvenance??'UNVERIFIED',
    availableSlots:Object.freeze(slots),
    directionRows:8 as const,
    directionSemantics:input.directionSemantics??'RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED',
    actions:baseActions(slots),
    provenance:Object.freeze([...(input.provenance??[])]),
  });
}

export class MonsterVisualCatalog{
  private readonly byId:ReadonlyMap<string,MonsterVisualArchetype>;
  constructor(archetypes:readonly MonsterVisualArchetype[]){
    const rows=new Map<string,MonsterVisualArchetype>();
    for(const row of archetypes){if(rows.has(row.visualId))throw new Error(`Duplicate monster visual ${row.visualId}`);rows.set(row.visualId,row);}
    this.byId=rows;
  }
  get(visualId:string):MonsterVisualArchetype|undefined{return this.byId.get(visualId)}
  require(visualId:string):MonsterVisualArchetype{const row=this.get(visualId);if(!row)throw new Error(`Unknown monster visual ${visualId}`);return row}
  resolve(binding:BattleUnitVisualBinding):MonsterVisualArchetype{return this.require(binding.visualId)}
}

// These four entries were manually reviewed from the private fixed-hash S17
// contact sheets. Labels describe visible morphology only; they are not
// canonical retail monster/species names.
export const S17_MONSTER_VISUALS:readonly MonsterVisualArchetype[]=Object.freeze([
  createMonsterVisualArchetype({
    visualId:'monster-visual-001',sourceNumericId:4524,
    identityLabel:'green-skinned sword humanoid-like visual',identityProvenance:'VERIFIED_MANUAL_VISUAL',
    availableSlots:['00','01','02','03'],directionSemantics:'RECOVERED_SECONDARY_BODY_ROW_ORDER',
    provenance:['fixed-hash 2.2 Char/B4524_*','S17 private contact-sheet review','story CHARPOS token 4524 is correlation only'],
  }),
  createMonsterVisualArchetype({
    visualId:'monster-visual-002',sourceNumericId:4525,
    identityLabel:'blue-skinned polearm humanoid-like visual',identityProvenance:'VERIFIED_MANUAL_VISUAL',
    availableSlots:['00','01','02','03'],directionSemantics:'RECOVERED_SECONDARY_BODY_ROW_ORDER',
    provenance:['fixed-hash 2.2 Char/B4525_*','S17 private contact-sheet review','story CHARPOS token 4525 is correlation only'],
  }),
  createMonsterVisualArchetype({
    visualId:'monster-visual-003',sourceNumericId:4526,
    identityLabel:'green armored humanoid-like visual',identityProvenance:'VERIFIED_MANUAL_VISUAL',
    availableSlots:['00','01','02','03'],directionSemantics:'RECOVERED_SECONDARY_BODY_ROW_ORDER',
    provenance:['fixed-hash 2.2 Char/B4526_*','S17 private contact-sheet review','story CHARPOS token 4526 is correlation only'],
  }),
  createMonsterVisualArchetype({
    visualId:'monster-visual-004',sourceNumericId:4544,
    identityLabel:'cyan spectral humanoid-like visual',identityProvenance:'VERIFIED_MANUAL_VISUAL',
    availableSlots:['00','01','02','03'],directionSemantics:'RECOVERED_SECONDARY_BODY_ROW_ORDER',
    provenance:['fixed-hash 2.2 Char/B4544_*','S17 private contact-sheet review','story CHARPOS token 4544 is correlation only'],
  }),
]);

export const S17_MONSTER_VISUAL_CATALOG=new MonsterVisualCatalog(S17_MONSTER_VISUALS);

// The retired live roster/session that selected concrete historical enemies is
// unavailable. These bindings are therefore explicit M5 reconstruction policy,
// not recovered retail facts. Coordinator can wire them without touching the
// recovered roster +0x08 visual-model contract.
export const S17_RECONSTRUCTION_TRAINING_BINDINGS:readonly BattleUnitVisualBinding[]=Object.freeze([
  Object.freeze({
    battleUnitKey:'dummy-melee',visualId:'monster-visual-001',provenance:'RECONSTRUCTION_POLICY',
    basis:'Use manually reviewed original-client B4524 art for the current training melee enemy; historical live roster payload is unavailable.',
  }),
  Object.freeze({
    battleUnitKey:'dummy-ranged',visualId:'monster-visual-004',provenance:'RECONSTRUCTION_POLICY',
    basis:'Use manually reviewed original-client B4544 spectral/projectile-like art for the current training ranged enemy; historical live roster payload is unavailable.',
  }),
]);
