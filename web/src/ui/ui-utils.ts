export function escapeHtml(value:unknown):string{
  return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
export function percent(value:number,max:number):number{ if(!Number.isFinite(value)||!Number.isFinite(max)||max<=0)return 0; return Math.max(0,Math.min(100,(value/max)*100)); }
export function meter(label:string,value:number,max:number,kind:'hp'|'mp'|'exp'|'ready'):string{
  const safeValue=Math.max(0,Math.round(value)); const safeMax=Math.max(0,Math.round(max)); const width=percent(value,max).toFixed(1);
  return `<div class="hud-meter hud-meter-${kind}"><div class="hud-meter-line"><span>${escapeHtml(label)}</span><b>${safeValue} / ${safeMax}</b></div><div class="hud-meter-track" aria-label="${escapeHtml(label)} ${safeValue} / ${safeMax}" role="meter" aria-valuemin="0" aria-valuemax="${safeMax}" aria-valuenow="${safeValue}"><span style="width:${width}%"></span></div></div>`;
}
export function attrDisabled(disabled:boolean|undefined):string{return disabled?' disabled':'';}
