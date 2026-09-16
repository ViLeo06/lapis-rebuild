export type AniTimingPolicy='RETAIL_COMMON'|'RETAIL_MINUS_ONE';
export function frameIntervalMs(rawTiming:number,policy:AniTimingPolicy='RETAIL_COMMON'):number{
  if(!Number.isFinite(rawTiming)||rawTiming<=0)throw new Error('Invalid ANI timing');
  const divisor=policy==='RETAIL_MINUS_ONE'?rawTiming-1:rawTiming;
  if(!Number.isFinite(divisor)||divisor<=0)throw new Error('Invalid ANI timing divisor');
  return 1000/divisor;
}
export function sequenceDurationMs(rawTiming:number,frames:number,policy:AniTimingPolicy='RETAIL_COMMON'):number{
  if(!Number.isInteger(frames)||frames<1)throw new Error('Invalid ANI frame count');
  return frameIntervalMs(rawTiming,policy)*frames;
}
