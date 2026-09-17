export type MonsterVisualProvenance='VERIFIED_STATIC_ORIGINAL'|'RECOVERED_SECONDARY'|'UNVERIFIED'|'RECONSTRUCTION_POLICY';
export type MonsterVisualAction='idle'|'move'|'attack'|'hit'|'death';

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
  readonly directionSemantics:'RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED';
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
  idle:Object.freeze({action:'idle',slot:slots.includes('00')?'00':null,provenance:'RECOVERED_SECONDARY',note:'Compatibility/runtime label for state 0; not independently recovered as universal monster idle semantics.'}),
  move:Object.freeze({action:'move',slot:slots.includes('01')?'01':null,provenance:'RECOVERED_SECONDARY',note:'Compatibility/runtime label for state 1.'}),
  attack:Object.freeze({action:'attack',slot:slots.includes('02')?'02':null,provenance:'RECOVERED_SECONDARY',note:'Compatibility/runtime label for state 2; exact impact frame remains unresolved.'}),
  hit:Object.freeze({action:'hit',slot:slots.includes('03')?'03':null,provenance:'VERIFIED_STATIC_ORIGINAL',note:'Authoritative HP-loss path sets character action state 3, which loads _03.'}),
  death:Object.freeze({action:'death',slot:null,provenance:'UNVERIFIED',note:'No universal retail death action state is recovered; _05 must not be promoted to death.'}),
});

export function createMonsterVisualArchetype(input:{
  visualId:string;
  sourceNumericId:number;
  identityLabel?:string;
  identityProvenance?:'VERIFIED_MANUAL_VISUAL'|'UNVERIFIED';
  availableSlots:readonly string[];
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
    directionSemantics:'RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED' as const,
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

// Populated only from S17 human-reviewed private contact sheets. Coordinator
// wiring must still supply an explicit battle-unit -> visual binding; matching
// numeric IDs alone is forbidden.
export const S17_MONSTER_VISUALS:readonly MonsterVisualArchetype[]=Object.freeze([]);
export const S17_MONSTER_VISUAL_CATALOG=new MonsterVisualCatalog(S17_MONSTER_VISUALS);
