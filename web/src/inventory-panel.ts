import './inventory.css';
import {CATALOG,roleFor} from './inventory.ts';
import type {LabScene} from './scene.ts';
export function installInventoryPanel(scene:LabScene):void {
 const panel=document.createElement('section');panel.className='inventory-panel';
 const title=document.createElement('h3');title.textContent='背包 / 装备训练';
 const hint=document.createElement('p');hint.className='hint';hint.textContent='物品名称来自原表；免费配发、装备限制与加成为 UNVERIFIED。';
 const list=document.createElement('div');list.className='inventory-list';
 const stats=document.createElement('p');stats.id='equipment-stats';
 panel.append(title,hint,list,stats);document.querySelector('.journal')!.before(panel);
 let signature='';
 function render(){const s=scene.snapshot();const key=JSON.stringify([s.character,s.inventory,s.phase]);if(key===signature)return;signature=key;list.replaceChildren();
 for(const slot of ['weapon','armor'] as const){const label=document.createElement('label');label.textContent=slot==='weapon'?'武器':'防具';const select=document.createElement('select');select.id=`equip-${slot}`;select.add(new Option('未装备',''));
 for(const item of CATALOG)if(item.training.slot===slot&&item.training.role===roleFor(s.character)&&s.inventory.owned.includes(item.item_id))select.add(new Option(`${item.name} / #${item.item_id}`,String(item.item_id)));
 select.value=s.inventory[slot]===null?'':String(s.inventory[slot]);select.disabled=s.phase==='active';select.onchange=()=>scene.equipItem(select.value?Number(select.value):null,slot);label.append(select);list.append(label);}
 stats.textContent=`攻击 +${s.equipment.attack} / 防御 +${s.equipment.defense} / UNVERIFIED`;
 }
 window.addEventListener('lapis-state',render);render();
}
