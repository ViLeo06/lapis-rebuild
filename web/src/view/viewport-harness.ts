import type {CameraState,Point,Rect,Size} from './viewport-state.ts';
import {worldToScreen} from './coordinate-transform.ts';

export type HarnessModel=Readonly<{
  title:string;
  viewport:Size;
  world:Rect;
  camera:CameraState;
  player:Point;
  fullscreen?:boolean;
}>;

function esc(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}

export function renderViewportHarness(model:HarnessModel){
  const p=worldToScreen(model.player,model.camera);
  const viewW=model.viewport.width/model.camera.zoom,viewH=model.viewport.height/model.camera.zoom;
  return`<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#101715;color:#ddd8c5;font:14px system-ui,sans-serif}.shell{min-height:100vh;padding:22px}.meta{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px}.badge{border:1px solid #756a4d;padding:5px 8px}.stage{position:relative;width:min(1100px,100%);aspect-ratio:16/9;overflow:hidden;border:1px solid #786b4c;background:linear-gradient(135deg,#1c2b24,#0d1512)}.world{position:absolute;left:4%;top:7%;right:4%;bottom:7%;border:1px dashed #526d5a;background:repeating-linear-gradient(0deg,#18241f 0 31px,#223229 32px),repeating-linear-gradient(90deg,transparent 0 31px,#33463a 32px)}.viewport{position:absolute;left:10%;top:12%;width:80%;height:76%;border:3px solid #d0b373;box-shadow:0 0 0 9999px #0007}.player{position:absolute;width:18px;height:18px;border-radius:50%;background:#e1c17c;border:2px solid #1b201c;transform:translate(-50%,-50%)}.label{position:absolute;left:8px;bottom:8px;background:#0b100ee6;border:1px solid #5a614f;padding:7px 9px;font:12px ui-monospace,monospace}.fullscreen{outline:4px solid #8aa27a;outline-offset:-4px}.note{margin-top:12px;color:#a6aa98;font:12px ui-monospace,monospace}</style></head><body><div class="shell ${model.fullscreen?'fullscreen':''}"><h1>${esc(model.title)}</h1><div class="meta"><span class="badge">zoom ${model.camera.zoom.toFixed(2)}</span><span class="badge">scroll ${model.camera.scrollX.toFixed(1)}, ${model.camera.scrollY.toFixed(1)}</span><span class="badge">visible ${viewW.toFixed(0)} × ${viewH.toFixed(0)}</span><span class="badge">viewport ${model.viewport.width} × ${model.viewport.height}</span></div><div class="stage"><div class="world"></div><div class="viewport"></div><div class="player" style="left:${Math.max(0,Math.min(100,p.x/model.viewport.width*100))}%;top:${Math.max(0,Math.min(100,p.y/model.viewport.height*100))}%"></div><div class="label">player world ${model.player.x.toFixed(0)},${model.player.y.toFixed(0)} → screen ${p.x.toFixed(1)},${p.y.toFixed(1)}</div></div><p class="note">S15 independent viewport harness. Final Phaser wiring is intentionally deferred to the coordinator integration pass.</p></div></body></html>`;
}
