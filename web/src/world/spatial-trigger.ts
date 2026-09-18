import type {RuntimeProvenance} from '../runtime-boundaries.ts';
import type {Cell} from '../coordinates.ts';

export type SpatialZone=
  |{shape:'rect';min:Cell;max:Cell}
  |{shape:'manhattan';center:Cell;radius:number}
  |{shape:'cells';cells:readonly Cell[]};

export type SceneTransitionTrigger={id:string;mapId:number;activation:'enter';purpose:'scene-transition';zone:SpatialZone;priority:number;provenance:RuntimeProvenance};
export type InteractionZoneTrigger={id:string;mapId:number;activation:'interact';purpose:'world-entity';entityId:string;zone:SpatialZone;priority:number;provenance:RuntimeProvenance};
export type SpatialTrigger=SceneTransitionTrigger|InteractionZoneTrigger;
export type SpatialPosition={mapId:number;cell:Cell};
export type InteractionOffer={triggerId:string;entityId:string;provenance:RuntimeProvenance};
export type SpatialSample={entered:string[];exited:string[];autoTriggerId:string|null;interactions:InteractionOffer[]};

const validCell=(cell:Cell)=>cell.length===2&&cell.every(value=>Number.isInteger(value)&&value>=0);

export function containsPosition(zone:SpatialZone,cell:Cell):boolean{
  if(!validCell(cell))return false;
  if(zone.shape==='rect')return cell[0]>=zone.min[0]&&cell[0]<=zone.max[0]&&cell[1]>=zone.min[1]&&cell[1]<=zone.max[1];
  if(zone.shape==='manhattan')return Math.abs(cell[0]-zone.center[0])+Math.abs(cell[1]-zone.center[1])<=zone.radius;
  return zone.cells.some(candidate=>candidate[0]===cell[0]&&candidate[1]===cell[1]);
}

export function validateSpatialTriggers(triggers:readonly SpatialTrigger[]):readonly SpatialTrigger[]{
  const ids=new Set<string>();
  for(const trigger of triggers){
    if(!trigger.id||ids.has(trigger.id)||!Number.isInteger(trigger.mapId)||trigger.mapId<0||!Number.isInteger(trigger.priority)||trigger.priority<0)throw new Error('Invalid spatial trigger');
    const zone=trigger.zone;
    if(zone.shape==='rect'&&(!validCell(zone.min)||!validCell(zone.max)||zone.min[0]>zone.max[0]||zone.min[1]>zone.max[1]))throw new Error('Invalid rect trigger zone');
    if(zone.shape==='manhattan'&&(!validCell(zone.center)||!Number.isInteger(zone.radius)||zone.radius<0||zone.radius>64))throw new Error('Invalid manhattan trigger zone');
    if(zone.shape==='cells'&&(!zone.cells.length||zone.cells.length>512||zone.cells.some(cell=>!validCell(cell))))throw new Error('Invalid cells trigger zone');
    if(trigger.purpose==='world-entity'&&(!trigger.entityId||trigger.entityId.length>128))throw new Error('Invalid interaction entity');
    ids.add(trigger.id);
  }
  return triggers;
}

export class SpatialTriggerRuntime{
  private readonly triggers:readonly SpatialTrigger[];
  private inside=new Set<string>();
  private suppressed=new Set<string>();
  private position:SpatialPosition|null=null;

  constructor(triggers:readonly SpatialTrigger[]){this.triggers=validateSpatialTriggers(triggers);}

  prime(position:SpatialPosition):void{
    this.assertPosition(position);
    this.position={mapId:position.mapId,cell:[...position.cell] as Cell};
    this.inside=this.idsAt(position);
    this.suppressed=new Set([...this.inside].filter(id=>this.trigger(id)?.activation==='enter'));
  }

  sample(position:SpatialPosition):SpatialSample{
    this.assertPosition(position);
    if(this.position===null||this.position.mapId!==position.mapId){this.prime(position);return{entered:[],exited:[],autoTriggerId:null,interactions:this.interactionsAt(position)};}
    const next=this.idsAt(position);
    const exited=[...this.inside].filter(id=>!next.has(id)).sort();
    for(const id of exited)this.suppressed.delete(id);
    const entered=[...next].filter(id=>!this.inside.has(id)).sort();
    const candidates=entered.map(id=>this.trigger(id)).filter((trigger):trigger is SceneTransitionTrigger=>!!trigger&&trigger.activation==='enter'&&!this.suppressed.has(trigger.id));
    candidates.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
    this.inside=next;
    this.position={mapId:position.mapId,cell:[...position.cell] as Cell};
    return{entered,exited,autoTriggerId:candidates[0]?.id??null,interactions:this.interactionsAt(position)};
  }

  suppressUntilExit(triggerId:string):void{
    if(this.inside.has(triggerId))this.suppressed.add(triggerId);
  }

  activeInteractionIds():readonly string[]{return [...this.inside].filter(id=>this.trigger(id)?.activation==='interact').sort();}

  private interactionsAt(position:SpatialPosition):InteractionOffer[]{
    return this.triggers.filter((trigger):trigger is InteractionZoneTrigger=>trigger.mapId===position.mapId&&trigger.activation==='interact'&&containsPosition(trigger.zone,position.cell))
      .sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))
      .map(trigger=>({triggerId:trigger.id,entityId:trigger.entityId,provenance:trigger.provenance}));
  }
  private idsAt(position:SpatialPosition):Set<string>{return new Set(this.triggers.filter(trigger=>trigger.mapId===position.mapId&&containsPosition(trigger.zone,position.cell)).map(trigger=>trigger.id));}
  private trigger(id:string):SpatialTrigger|undefined{return this.triggers.find(trigger=>trigger.id===id);}
  private assertPosition(position:SpatialPosition):void{if(!Number.isInteger(position.mapId)||position.mapId<0||!validCell(position.cell))throw new Error('Invalid spatial position');}
}
