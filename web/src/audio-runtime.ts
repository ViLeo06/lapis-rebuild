import type{RuntimeProvenance}from'./runtime-boundaries.ts';

export type ZoneBgmSelection={
  zoneId:number;
  trackId:number|null;
  path:string|null;
  provenance:RuntimeProvenance;
  source:'metadata'|'fallback'|'special-live-mode'|'awaiting-live-mode';
  specialSidePath:boolean;
};

const LIVE_MODE_ZONES=new Set([1010,1020,1050,1300]);
const validTrack=(track:number)=>Number.isInteger(track)&&track>=0;
export const bgmPath=(trackId:number)=>{
  if(!validTrack(trackId))throw new Error('Invalid BGM track');
  return `Sound/NDS-8${String(trackId).padStart(3,'0')}.mid`;
};

// The fixed retail client reads a signed metadata track at record +8 and falls
// back to 5. Four zones require a separate live mode value to choose 7/8; when
// that value is unavailable we deliberately refuse to guess the active track.
export function selectZoneBgm(zoneId:number,metadataTrackId:number|null|undefined,liveModeTrack?:7|8):ZoneBgmSelection{
  if(!Number.isInteger(zoneId)||zoneId<0)throw new Error('Invalid zone id');
  const specialSidePath=zoneId===2600;
  if(LIVE_MODE_ZONES.has(zoneId)){
    if(liveModeTrack===undefined)return{zoneId,trackId:null,path:null,provenance:'VERIFIED',source:'awaiting-live-mode',specialSidePath};
    return{zoneId,trackId:liveModeTrack,path:bgmPath(liveModeTrack),provenance:'VERIFIED',source:'special-live-mode',specialSidePath};
  }
  const trackId=metadataTrackId!==null&&metadataTrackId!==undefined&&validTrack(metadataTrackId)?metadataTrackId:5;
  return{zoneId,trackId,path:bgmPath(trackId),provenance:'VERIFIED',source:trackId===5&&(!validTrack(metadataTrackId??-1))?'fallback':'metadata',specialSidePath};
}
