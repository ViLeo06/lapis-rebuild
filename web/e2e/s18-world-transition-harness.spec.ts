import {expect,test} from '@playwright/test';
import {createTrainingHousePolicy} from '../src/world/s18-world-policy.ts';
import {SceneTransitionController} from '../src/world/scene-transition.ts';

const guide={
  entity:{id:'guide',kind:'npc' as const,mapId:1,x:4,y:4,displayName:'训练引导员',interactionRadius:1,provenance:'RECONSTRUCTION_POLICY' as const},
  shortDialogue:{none:['训练入口在前方。']},provenance:'RECONSTRUCTION_POLICY' as const,
};
const policy=createTrainingHousePolicy({
  id:'s18-preview',
  field:{mapId:1,name:'外城 / field harness',entranceZone:{shape:'rect',min:[8,8],max:[9,9]},returnSpawn:[7,8],returnDirection:6},
  interior:{mapId:2,name:'训练屋 / synthetic interior harness',exitZone:{shape:'cells',cells:[[2,2],[2,3]]},entrySpawn:[2,2],entryDirection:2},
  npcs:[guide],
});

type Cell=readonly [number,number];
function cellKey(cell:Cell){return `${cell[0]},${cell[1]}`;}
function renderHarness(input:{title:string;mapName:string;actor:Cell;doorCells:readonly Cell[];npc?:Cell;status:string;provenance:string}){
  const door=new Set(input.doorCells.map(cellKey));
  const cells=[] as string[];
  for(let y=0;y<12;y++)for(let x=0;x<12;x++){
    const key=`${x},${y}`;
    const classes=['cell'];
    if(door.has(key))classes.push('door');
    if(input.npc&&cellKey(input.npc)===key)classes.push('npc');
    if(cellKey(input.actor)===key)classes.push('actor');
    cells.push(`<div class="${classes.join(' ')}" data-cell="${key}">${x},${y}</div>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#161b22;color:#e6edf3;padding:24px}.shell{max-width:980px;margin:auto}.eyebrow{font-size:12px;letter-spacing:.14em;opacity:.7}.panel{border:1px solid #49515c;border-radius:12px;padding:18px;background:#20262e}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;margin-top:16px}.cell{aspect-ratio:1;border:1px solid #343b45;display:grid;place-items:center;font-size:9px;opacity:.55}.door{outline:2px solid #d29922;opacity:1}.npc{box-shadow:inset 0 0 0 3px #8b5cf6;opacity:1}.actor{background:#238636;outline:3px solid #7ee787;opacity:1;font-weight:700}.legend{display:flex;gap:18px;margin:14px 0;font-size:13px}.status{font-size:18px;margin-top:8px}.policy{margin-top:10px;font-family:ui-monospace,monospace;font-size:12px;opacity:.75}</style></head><body><div class="shell"><div class="eyebrow">S18 WORLD SCENE TRANSITION HARNESS</div><h1>${input.title}</h1><div class="panel"><b>${input.mapName}</b><div class="status">${input.status}</div><div class="legend"><span>绿色：玩家</span><span>金框：门/出口触发区</span>${input.npc?'<span>紫框：NPC 交互区中心</span>':''}</div><div class="grid">${cells.join('')}</div><div class="policy">${input.provenance}</div></div></div></body></html>`;
}

test('S18 browser harness visualizes automatic field -> interior -> return transition',async({page})=>{
  const controller=new SceneTransitionController(policy.graph,policy.triggers);
  controller.start({mapId:1,cell:[7,7]});
  const entered=controller.update({mapId:1,cell:[8,8]});
  expect(entered.transition?.edgeId).toBe('s18-preview:enter');
  await page.setContent(renderHarness({title:'进入训练屋入口',mapName:'map 1',actor:[8,8],doorCells:[[8,8],[8,9],[9,8],[9,9]],status:'进入门区后产生显式 SceneTransitionRequest',provenance:entered.transition!.provenance}));
  await page.screenshot({path:'test-results/s18-01-field-door.png',fullPage:true});

  const arrival=controller.commit(entered.transition!);
  expect(arrival.mapId).toBe(2);
  expect(arrival.cell).toEqual([2,2]);
  const idle=controller.update({mapId:2,cell:[2,2]});
  expect(idle.transition).toBeNull();
  await page.setContent(renderHarness({title:'训练屋到达点',mapName:'map 2 (synthetic harness only)',actor:[2,2],doorCells:[[2,2],[2,3]],status:'出生点位于出口区，但 prime/debounce 阻止立即弹回',provenance:arrival.provenance}));
  await page.screenshot({path:'test-results/s18-02-interior-arrival.png',fullPage:true});

  expect(controller.update({mapId:2,cell:[4,4]}).transition).toBeNull();
  const exit=controller.update({mapId:2,cell:[2,3]});
  expect(exit.transition?.edgeId).toBe('s18-preview:exit');
  await page.setContent(renderHarness({title:'离开训练屋',mapName:'map 2 (synthetic harness only)',actor:[2,3],doorCells:[[2,2],[2,3]],status:'离开出口区再重新进入后，反向边正常触发',provenance:exit.transition!.provenance}));
  await page.screenshot({path:'test-results/s18-03-interior-exit.png',fullPage:true});
});

test('S18 browser harness keeps NPC interaction separate from automatic scene transition',async({page})=>{
  const controller=new SceneTransitionController(policy.graph,policy.triggers);
  controller.start({mapId:1,cell:[2,2]});
  const sample=controller.update({mapId:1,cell:[4,5]});
  expect(sample.transition).toBeNull();
  expect(sample.interactions.map(item=>item.entityId)).toEqual(['guide']);
  await page.setContent(renderHarness({title:'NPC 空间交互区',mapName:'map 1',actor:[4,5],doorCells:[[8,8],[8,9],[9,8],[9,9]],npc:[4,4],status:'NPC 只产生 InteractionOffer，不自动切场景',provenance:sample.interactions[0].provenance}));
  await page.screenshot({path:'test-results/s18-04-npc-zone.png',fullPage:true});
});
