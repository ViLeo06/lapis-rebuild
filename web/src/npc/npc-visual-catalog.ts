/**
 * S16 presentation-only NPC visual contracts.
 *
 * This module intentionally has no NPCScript numeric lookup. A visual binding
 * must be supplied explicitly by a later world-runtime integration layer.
 */
export type NpcVisualEvidence =
  | 'VERIFIED_STATIC_ORIGINAL'
  | 'VERIFIED_BODY_DIRECTION_MAPPING'
  | 'RECOVERED_SECONDARY'
  | 'INFERRED_VISUAL_ONLY'
  | 'RECONSTRUCTION_POLICY'
  | 'UNVERIFIED';

export type NpcVisualDirection = 'S'|'SW'|'W'|'NW'|'N'|'NE'|'E'|'SE';

export interface NpcVisualProvenance {
  source: string;
  evidence: NpcVisualEvidence;
  note?: string;
}

export interface NpcVisualSequence {
  actionId: number;
  semantic: string;
  semanticEvidence: NpcVisualEvidence;
  directions: readonly NpcVisualDirection[];
  framesPerDirection: number;
  rawTiming: number;
  aniSource: string;
  sprSource: string;
}

export interface NpcVisualArchetype {
  /** Stable presentation-layer key. It is not an NPCScript block id. */
  visualId: string;
  /** Original Char/Bxxxx resource number when this is a world-body visual. */
  characterResourceId?: number;
  /** Original portrait key when this is a portrait visual. */
  portraitKey?: number;
  sourceFamily: 'CHAR_BODY_ANI_SPR'|'NPC350_PORTRAIT';
  displayName?: string;
  idle?: NpcVisualSequence;
  walk?: NpcVisualSequence;
  interaction?: NpcVisualSequence;
  actions: readonly NpcVisualSequence[];
  anchor: {readonly x:number; readonly y:number; readonly evidence:NpcVisualEvidence};
  provenance: NpcVisualProvenance;
}

export interface NpcVisualBinding {
  /** Coordinator-owned world runtime identity, deliberately opaque to S16. */
  worldEntityKey: string;
  visualId: string;
  provenance: NpcVisualProvenance;
}

export class NpcVisualCatalog {
  readonly #byId: ReadonlyMap<string,NpcVisualArchetype>;

  constructor(archetypes: readonly NpcVisualArchetype[]) {
    const byId=new Map<string,NpcVisualArchetype>();
    for(const archetype of archetypes){
      if(!archetype.visualId)throw new Error('NpcVisualArchetype.visualId is required');
      if(byId.has(archetype.visualId))throw new Error('duplicate NPC visual id: '+archetype.visualId);
      byId.set(archetype.visualId,Object.freeze({...archetype}));
    }
    this.#byId=byId;
  }

  get(visualId:string):NpcVisualArchetype|undefined{return this.#byId.get(visualId)}
  require(visualId:string):NpcVisualArchetype{
    const value=this.get(visualId);
    if(!value)throw new Error('unknown NPC visual id: '+visualId);
    return value;
  }
  values():readonly NpcVisualArchetype[]{return Object.freeze([...this.#byId.values()])}
}

export function resolveNpcVisualBinding(catalog:NpcVisualCatalog,binding:NpcVisualBinding):NpcVisualArchetype{
  if(!binding.worldEntityKey)throw new Error('worldEntityKey is required');
  // No fallback to a numeric NPCScript/block/entity id is allowed here.
  return catalog.require(binding.visualId);
}

export const NPC350_PORTRAIT_MAPPING=Object.freeze({
  evidence:'VERIFIED_STATIC_ORIGINAL' as const,
  source:'NeoDark fixed-hash portrait loader at 0x00412760 / 0x00412834',
  npcPortraitIdMin:100,
  npcPortraitIdMax:149,
  resource:'NRes/NPC350.Tip',
  frameIndexRule:'portraitId % 100',
});
