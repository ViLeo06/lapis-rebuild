import{selectZoneBgm}from'../audio-runtime.ts';
import type{RuntimeProvenance}from'../runtime-boundaries.ts';

export type BattleAudioEvent=
  |{kind:'battle-bgm';zoneId:number;metadataTrackId?:number|null;liveModeTrack?:7|8}
  |{kind:'attack-sfx'}
  |{kind:'hit-sfx'}
  |{kind:'magic-sfx';magicSoundId?:number}
  |{kind:'death-sfx'}
  |{kind:'victory'};

export type BattleAudioRoute={
  event:BattleAudioEvent['kind'];
  channel:'bgm'|'sfx';
  action:'play'|'unresolved';
  path:string|null;
  resourceProvenance:RuntimeProvenance;
  bindingProvenance:RuntimeProvenance;
  reason:string;
};

export type BattleAudioRouterConfig={
  attackPath?:string|null;
  defaultHitPath?:string|null;
  deathPath?:string|null;
  victoryPath?:string|null;
};

const soundPath=(path:string|undefined|null):string|null=>{
  if(path===undefined||path===null||path==='')return null;
  if(!/^Sound\/[A-Za-z0-9._-]+$/i.test(path))throw new Error('Invalid battle audio path');
  return path;
};

export const magicSfxPath=(soundId:number):string=>{
  if(!Number.isInteger(soundId)||soundId<0||soundId>999)throw new Error('Invalid magic sound id');
  return `Sound/NDS-4${String(soundId).padStart(3,'0')}.wav`;
};

export class BattleAudioRouter{
  readonly config:Readonly<BattleAudioRouterConfig>;
  constructor(config:BattleAudioRouterConfig={}){
    this.config=Object.freeze({
      attackPath:soundPath(config.attackPath),
      // NDS-0030.wav is inside the VERIFIED HP-loss family, but selecting it as
      // the generic Web fallback remains reconstruction policy.
      defaultHitPath:soundPath(config.defaultHitPath??'Sound/NDS-0030.wav'),
      deathPath:soundPath(config.deathPath),
      victoryPath:soundPath(config.victoryPath),
    });
  }

  route(event:BattleAudioEvent):BattleAudioRoute{
    switch(event.kind){
      case'battle-bgm':{
        const selected=selectZoneBgm(event.zoneId,event.metadataTrackId,event.liveModeTrack);
        if(!selected.path)return{
          event:event.kind,channel:'bgm',action:'unresolved',path:null,
          resourceProvenance:selected.provenance,bindingProvenance:selected.provenance,
          reason:`BGM selector is ${selected.source}; do not guess a track without the required retail metadata/live mode.`,
        };
        return{
          event:event.kind,channel:'bgm',action:'play',path:selected.path,
          resourceProvenance:'VERIFIED',bindingProvenance:'VERIFIED',
          reason:`Recovered zone-driven BGM selector: ${selected.source}.`,
        };
      }
      case'hit-sfx':{
        const path=this.config.defaultHitPath??null;
        return path?{
          event:event.kind,channel:'sfx',action:'play',path,
          resourceProvenance:'VERIFIED',bindingProvenance:'RECONSTRUCTION_POLICY',
          reason:'HP-loss hit SFX family is VERIFIED; generic fallback member selection is reconstruction policy.',
        }:{
          event:event.kind,channel:'sfx',action:'unresolved',path:null,
          resourceProvenance:'VERIFIED',bindingProvenance:'UNVERIFIED',
          reason:'Recovered HP-loss family exists, but no concrete fallback member is configured.',
        };
      }
      case'magic-sfx':{
        if(event.magicSoundId===undefined)return{
          event:event.kind,channel:'sfx',action:'unresolved',path:null,
          resourceProvenance:'VERIFIED',bindingProvenance:'UNVERIFIED',
          reason:'NDS-4%03d.wav template is recovered near MagicRes, but exact effect/stage binding remains unresolved.',
        };
        return{
          event:event.kind,channel:'sfx',action:'play',path:magicSfxPath(event.magicSoundId),
          resourceProvenance:'VERIFIED',bindingProvenance:'RECONSTRUCTION_POLICY',
          reason:'Template is recovered; caller-supplied magic sound id is treated as a reconstruction binding.',
        };
      }
      case'attack-sfx':return this.configuredRoute(event.kind,this.config.attackPath??null,'No universal retail attack SFX trigger table has been recovered.');
      case'death-sfx':return this.configuredRoute(event.kind,this.config.deathPath??null,'No universal retail death SFX trigger table has been recovered.');
      case'victory':return this.configuredRoute(event.kind,this.config.victoryPath??null,'Victory SFX binding is not recovered in S5 evidence.');
    }
  }

  private configuredRoute(event:'attack-sfx'|'death-sfx'|'victory',path:string|null,reason:string):BattleAudioRoute{
    return path?{
      event,channel:'sfx',action:'play',path,
      resourceProvenance:'UNVERIFIED',bindingProvenance:'RECONSTRUCTION_POLICY',
      reason:`${reason} Configured path is an explicit reconstruction policy.`,
    }:{
      event,channel:'sfx',action:'unresolved',path:null,
      resourceProvenance:'UNVERIFIED',bindingProvenance:'UNVERIFIED',reason,
    };
  }
}
