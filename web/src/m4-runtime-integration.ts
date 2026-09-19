import type {LabScene} from './scene.ts';
import type {Skill} from './battle.ts';
import {actionReady,consumeAction} from './battle.ts';
import {battleProfileForClass,magicReadinessCost} from './battle-profile.ts';
import {nearestAnchor,referenceCellToScreen} from './coordinates.ts';
import {playableClassById,isEquipmentCompatibleWithClass,skillAvailableForClass} from './content/classes/class-catalog.ts';
import {skillById} from './content/skills/skill-catalog.ts';
import rawSkills from '../../data/skills/mvp.json' with {type:'json'};
import {BattlePresentation} from './presentation/battle-presentation.ts';
import type {BattlePresentationBatch} from './presentation/battle-presentation.ts';
import {createInventory,knownItemIds} from './progression/inventory.ts';
import type {InventoryState} from './progression/inventory.ts';
import {equipItem as equipProgression,reconcileEquipmentForCharacter} from './progression/equipment.ts';
import type {EquipmentCompatibilityResolver} from './progression/equipment.ts';
import {initialProgression} from './progression/progression.ts';
import {applyBattleReward,applyQuestReward} from './progression/rewards.ts';
import type {RewardState} from './progression/rewards.ts';
import {migrateSave} from './progression/save-migration.ts';
import {CURRENT_SAVE_VERSION,SAVE_KIND,serializeSaveV2} from './progression/save-schema.ts';
import type {JsonValue,SaveV2,SaveValidationContext} from './progression/save-schema.ts';
import {ReconstructionWorldAuthority} from './world/world-authority.ts';
import type {WorldRuntimeState} from './world/world-authority.ts';
import type {EncounterRequest,WorldState} from './world/world-model.ts';
import {canInteract} from './world/world-model.ts';
import {applyWarp} from './world/warp-policy.ts';
import {START_STATE,TRAINING_BATTLE_ZONE_ID,TRAINING_QUEST_ID,WORLD_ENTITIES} from './world/world-content.ts';
import {initialQuestRuntime} from './world/quest-runtime.ts';
import type {QuestRuntimeState,QuestStage} from './world/quest-runtime.ts';
import type {NpcDialogueChoiceId,NpcDialogueSession,NpcInteractionInputSource} from './world/npc-dialogue-runtime.ts';
import {renderFieldHud} from './ui/field-hud.ts';
import {renderBattleHud} from './ui/battle-hud.ts';
import {renderGameMenu} from './ui/game-menu.ts';
import {renderDebugPanel} from './ui/debug-panel.ts';
import {escapeHtml} from './ui/ui-utils.ts';
import type {BattleHudState,DiagnosticsState,FieldHudState,PlayerHudState} from './ui/types.ts';
import {readM4Save,writeM4Save} from './m4-save-store.ts';
import {equipmentBonus as legacyEquipmentBonus} from './inventory.ts';
import {createM5PlayableWorld} from './world/m5-playable-world.ts';
import type {M5PlayableWorld} from './world/m5-playable-world.ts';
import {SceneTransitionController} from './world/scene-transition.ts';
import {DEFAULT_RECONSTRUCTION_COMBAT_BALANCE} from './combat/reconstruction-combat-balance.ts';

type Snapshot=ReturnType<LabScene['snapshot']>;
const QUEST_STAGES:readonly QuestStage[]=['not_started','accepted','objective','ready_to_turn_in','complete'];
const CLASS_RESOLVER:EquipmentCompatibilityResolver=(characterId,item)=>{
  try{return isEquipmentCompatibleWithClass(characterId,item.itemId,item.slot);}catch{return false;}
};

function starterInventory():InventoryState{
  return createInventory(knownItemIds().map(itemId=>({itemId,source:{kind:'starter' as const,ref:'m4-starter'}})));
}

export function createM4RewardState(gold=0):RewardState{
  return {gold,inventory:starterInventory(),progression:initialProgression(),questFlags:{},rewardReceipts:[]};
}

export function parseM4Quest(raw:JsonValue,questId=TRAINING_QUEST_ID):QuestRuntimeState{
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    const record=raw as Record<string,JsonValue>;
    if(record.questId===questId&&typeof record.stage==='string'&&QUEST_STAGES.includes(record.stage as QuestStage))return{questId,stage:record.stage as QuestStage};
    // S7/M3 migration: only the completed legacy guide is promoted to a
    // completed reconstruction quest. Partial legacy stages restart safely.
    if(record.guide==='complete')return{questId,stage:'complete'};
  }
  return initialQuestRuntime(questId);
}

export function questHud(stage:QuestStage):Pick<FieldHudState,'questTitle'|'questDetail'>{
  const detail:Record<QuestStage,string>={
    not_started:'与训练引导员交谈，接受训练委托。',
    accepted:'前往外城训练点。',
    objective:'在外城训练点完成一场战斗。',
    ready_to_turn_in:'返回训练引导员交付任务。',
    complete:'训练委托已完成。',
  };
  return{questTitle:'训练委托',questDetail:detail[stage]};
}

function runtimeSkill(skillId:number):Skill{
  const row=rawSkills.find(entry=>entry.skill_id===skillId);
  if(!row)throw new Error(`Missing runtime skill ${skillId}`);
  return row as Skill;
}

function cloneRewardState(state:RewardState):RewardState{
  return{
    gold:state.gold,
    inventory:{items:state.inventory.items.map(item=>({...item,acquisitionSources:item.acquisitionSources.map(source=>({...source}))})),equipped:{...state.inventory.equipped}},
    progression:{...state.progression},
    questFlags:{...state.questFlags},
    rewardReceipts:[...state.rewardReceipts],
  };
}

export class M4RuntimeIntegration{
  readonly scene:LabScene;
  readonly m5World:M5PlayableWorld|null;
  readonly worldAuthority:ReconstructionWorldAuthority;
  readonly spatial:SceneTransitionController|null;
  readonly presentation=new BattlePresentation();
  world:WorldRuntimeState;
  rewards:RewardState;
  pendingEncounter:EncounterRequest|null=null;
  menuOpen=false;
  developerMode=false;
  inventoryOpen=false;
  private activeDialogue:NpcDialogueSession|null=null;
  private noticeText='M4 游戏化运行时已接入';
  private lastSnapshot:Snapshot|null=null;
  private lastAudio='';
  private installed=false;
  private hudRoot!:HTMLDivElement;
  private menuRoot!:HTMLDivElement;
  private debugRoot!:HTMLDivElement;
  private dialogueRoot!:HTMLDivElement;
  private feedbackRoot!:HTMLDivElement;

  constructor(scene:LabScene){
    this.scene=scene;
    let m5:M5PlayableWorld|null=null;
    try{
      if(scene.pack.maps['7']&&scene.pack.animations['1001']&&scene.pack.animations['4524']&&scene.pack.animations['4544'])m5=createM5PlayableWorld(scene.pack);
    }catch(error){console.warn('M5 playable world unavailable; using M4 compatibility world',error);}
    this.m5World=m5;
    this.worldAuthority=new ReconstructionWorldAuthority(m5?.content);
    this.spatial=m5?new SceneTransitionController(m5.house.graph,m5.house.triggers):null;
    this.world=this.worldAuthority.initial(m5?.content.start??START_STATE);
    this.rewards=createM4RewardState(scene.gold);
  }

  install():void{
    if(this.installed)return;
    this.installed=true;
    document.body.classList.add('m4-active');
    this.mountRoots();
    this.installSceneAdapters();
    this.installInput();
    this.scene.setWorldInteractionHandler(entityId=>this.beginNpcInteraction(entityId,'pointer'));
    this.syncSceneInventory();
    const initial=this.m5World?.content.start??START_STATE;
    this.applyWorldState(initial);
    if(this.m5World){
      this.scene.configureWorldVisuals(this.m5World.visuals);
      this.scene.configureWorldMarkers([
        {id:'training-house-door',mapId:this.m5World.content.trainingMapId,cell:this.m5World.doorCell,label:'训练屋入口'},
        {id:'training-house-exit',mapId:this.m5World.content.objectiveMapId,cell:this.m5World.interiorExit,label:'出口'},
      ]);
      this.scene.setPlayerCameraFollow(true);
      this.scene.focusPlayer();
      this.spatial?.start({mapId:initial.mapId,cell:[initial.x,initial.y]});
      this.setNotice('M5 可玩性恢复运行时：NPC / 怪物 / 空间切场景 / camera follow / reconstruction balance 已接入');
    }
    this.applyClassProfile(false);
    window.addEventListener('lapis-state',event=>this.onSnapshot((event as CustomEvent<Snapshot>).detail));
    this.render(this.scene.snapshot());
  }

  snapshot(){
    const cell=nearestAnchor(this.scene.anchor.x,this.scene.anchor.y);
    return{
      quest:{...this.world.quest},
      world:{mapId:this.scene.mapId,x:cell[0],y:cell[1]},
      progression:{...this.rewards.progression},
      inventory:{items:this.rewards.inventory.items.map(item=>({itemId:item.itemId,quantity:item.quantity})),equipped:{...this.rewards.inventory.equipped}},
      gold:this.rewards.gold,
      pendingEncounter:this.pendingEncounter?{...this.pendingEncounter}:null,
      dialogue:this.activeDialogue?{
        sessionId:this.activeDialogue.sessionId,
        inputSource:this.activeDialogue.inputSource,
        phase:this.activeDialogue.view.phase,
        choices:this.activeDialogue.view.choices.map(choice=>choice.id),
      }:null,
      developerMode:this.developerMode,
      lastAudio:this.lastAudio,
      playableRecovery:!!this.m5World,
      worldPlan:this.m5World?{doorCell:this.m5World.doorCell,interiorEntry:this.m5World.interiorEntry,interiorExit:this.m5World.interiorExit,encounterCell:this.m5World.encounterCell}:null,
    };
  }

  private mountRoots():void{
    const world=document.querySelector<HTMLElement>('.world');
    if(!world)throw new Error('Missing legacy world host');
    this.hudRoot=document.createElement('div');this.hudRoot.id='m4-hud-root';
    this.menuRoot=document.createElement('div');this.menuRoot.id='m4-menu-root';
    this.debugRoot=document.createElement('div');this.debugRoot.id='m4-debug-root';
    this.dialogueRoot=document.createElement('div');this.dialogueRoot.id='m4-dialogue-root';
    this.feedbackRoot=document.createElement('div');this.feedbackRoot.id='m4-feedback-root';
    world.append(this.hudRoot,this.menuRoot,this.debugRoot,this.dialogueRoot,this.feedbackRoot);
  }

  private installSceneAdapters():void{
    const originalCharacter=this.scene.setCharacter.bind(this.scene);
    this.scene.setCharacter=(id:string)=>{
      originalCharacter(id);
      if(!['100','109'].includes(this.scene.character))return;
      const reconciled=reconcileEquipmentForCharacter(this.rewards.inventory,this.scene.character,CLASS_RESOLVER);
      this.rewards={...this.rewards,inventory:reconciled.inventory};
      this.syncSceneInventory();
      this.applyClassProfile(false);
      if(reconciled.unequipped.length)this.setNotice(`职业切换：自动卸下 ${reconciled.unequipped.length} 件不兼容装备。`);
    };

    this.scene.equipItem=(id:number|null,slot:'weapon'|'armor')=>{
      try{
        if(this.scene.inBattleView)throw new Error('战斗中不能更换装备');
        const inventory=equipProgression(this.rewards.inventory,this.scene.character,slot,id,CLASS_RESOLVER);
        this.rewards={...this.rewards,inventory};
        this.syncSceneInventory();
        this.applyClassProfile(false);
        this.setNotice('装备已更新 / RECONSTRUCTION_POLICY');
      }catch(error){this.setNotice(String(error));}
    };

    const originalEnter=this.scene.enterBattle.bind(this.scene);
    this.scene.enterBattle=()=>{
      this.activeDialogue=null;
      this.prepareReconstructionBattle();
      originalEnter();
      if(!this.scene.inBattleView)return;
      this.applyClassProfile(true);
      this.lastSnapshot=null;
      const batch=this.presentation.battleStart({zoneId:this.scene.state.battleZoneId??this.worldAuthority.content.battleZoneId});
      this.present(batch);
    };

    const originalAttack=this.scene.attack.bind(this.scene);
    this.scene.attack=(skill:Skill|null)=>{
      if(skill&&!skillAvailableForClass(this.scene.character,skill.skill_id)){
        this.setNotice('当前职业不能使用该技能');return;
      }
      const before=this.scene.snapshot();
      originalAttack(skill);
      const after=this.scene.snapshot();
      if(after.action===before.action&&after.mp===before.mp&&after.slot===before.slot)return;
      const animation=this.scene.animation();
      this.present(this.presentation.attack({rawTiming:animation.raw_timing,frameCount:animation.frames_per_direction}));
      if(skill){
        const target=this.scene.state.enemies.find(enemy=>enemy.id===this.scene.selectedEnemy&&enemy.hp>0);
        const resources=(skill.magic_pattern?.magic_resources??[]).flatMap(resource=>{
          const effect=this.scene.pack.effects[String(resource.magic_resource_id)];
          return effect?[{resourceId:resource.magic_resource_id,rawTiming:effect.raw_timing,frameCount:effect.frame_count,role:resource.role,rawStartTick:resource.start_tick}]:[];
        });
        if(resources.length)this.present(this.presentation.magicEffect({resources,context:{caster:{...this.scene.anchor},target:target?{x:target.x,y:target.y}:null}}));
      }
    };
  }

  private installInput():void{
    document.addEventListener('click',event=>{
      const choice=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-dialogue-choice]');
      if(choice){
        const choiceId=choice.dataset.dialogueChoice as NpcDialogueChoiceId|undefined;
        if(choiceId)this.chooseNpcInteraction(choiceId);
        return;
      }
      const target=(event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if(!target)return;
      const action=target.dataset.action;
      if(action==='menu'||action==='battle-menu'){this.menuOpen=true;this.render(this.scene.snapshot());}
      else if(action==='menu-close'){this.menuOpen=false;this.render(this.scene.snapshot());}
      else if(action==='save')void this.save();
      else if(action==='load')void this.load();
      else if(action==='inventory'){this.inventoryOpen=!this.inventoryOpen;document.body.classList.toggle('m4-inventory-open',this.inventoryOpen);}
      else if(action==='fullscreen')void this.scene.toggleFullscreen().then(ok=>this.setNotice(ok?'全屏状态已切换':'当前浏览器未允许全屏切换'));
      else if(action==='zoom-in'){this.scene.zoomIn();this.setNotice('视角已放大');}
      else if(action==='zoom-out'){this.scene.zoomOut();this.setNotice('视角已缩小');}
      else if(action==='zoom-reset'){this.scene.resetZoom();this.scene.focusPlayer();this.setNotice('视角已恢复 1:1 并居中角色');}
      else if(action==='attack')this.scene.attack(null);
      else if(action==='skill')this.useSkill(Number(target.dataset.skillId));
      else if(action==='rest')this.rest();
      else if(action==='return')this.returnFromBattle();
      else if(action==='class-swordsman')this.changeClass('100');
      else if(action==='class-wizard')this.changeClass('109');
    });
    document.addEventListener('change',event=>{
      const target=(event.target as HTMLElement).closest<HTMLInputElement>('[data-action="dev-toggle"]');
      if(!target)return;
      this.developerMode=target.checked;
      document.body.classList.toggle('m4-dev-enabled',this.developerMode);
      this.render(this.scene.snapshot());
    });
    window.addEventListener('keydown',event=>{
      if((event.target as HTMLElement).closest('input,select,button,textarea'))return;
      if(event.key==='Escape'){
        if(this.activeDialogue){this.activeDialogue=null;this.render(this.scene.snapshot());return;}
        this.menuOpen=!this.menuOpen;this.render(this.scene.snapshot());return;
      }
      if(event.key==='f'||event.key==='F'){event.preventDefault();void this.scene.toggleFullscreen();return;}
      if(event.key==='+'||event.key==='='){event.preventDefault();this.scene.zoomIn();return;}
      if(event.key==='-'){event.preventDefault();this.scene.zoomOut();return;}
      if(event.key==='0'){event.preventDefault();this.scene.resetZoom();this.scene.focusPlayer();return;}
      if(!this.scene.inBattleView&&(event.key==='e'||event.key==='E')){event.preventDefault();this.beginNpcInteraction(undefined,'keyboard');return;}
      if(this.scene.inBattleView&&['1','2','3'].includes(event.key)){
        const skills=playableClassById(this.scene.character).availableSkillIds;
        const skillId=skills[Number(event.key)-1];if(skillId)this.useSkill(skillId);
      }
      if(this.scene.inBattleView&&(event.key==='r'||event.key==='R'))this.rest();
    });
  }

  private changeClass(id:'100'|'109'):void{
    if(this.scene.inBattleView){this.setNotice('请先结束战斗再切换职业');return;}
    this.scene.setCharacter(id);
    this.menuOpen=false;
    this.render(this.scene.snapshot());
  }

  private useSkill(skillId:number):void{
    try{
      const definition=skillById(skillId);
      if(!skillAvailableForClass(this.scene.character,skillId))throw new Error('当前职业不能使用该技能');
      if(this.scene.state.mp<definition.mpCost)throw new Error('MP 不足');
      const target=this.scene.state.enemies.find(enemy=>enemy.id===this.scene.selectedEnemy&&enemy.hp>0);
      if(definition.targetType!=='self'&&!target)throw new Error('请选择存活目标');
      if(target&&definition.targetType!=='self'){
        const player=nearestAnchor(this.scene.anchor.x,this.scene.anchor.y);
        const enemy=nearestAnchor(target.x,target.y);
        const range=Math.max(Math.abs(player[0]-enemy[0]),Math.abs(player[1]-enemy[1]));
        if(range>definition.range)throw new Error(`目标超出技能射程（${definition.range} 格）`);
      }
      this.scene.attack(runtimeSkill(skillId));
    }catch(error){this.setNotice(String(error));}
  }

  private rest():void{
    if(!this.scene.inBattleView||!actionReady(this.scene.state)){this.setNotice('当前不能休息：请等待行动槽就绪');return;}
    if(!consumeAction(this.scene.state,this.scene.state.restReadinessCost)){this.setNotice('休息指令未执行');return;}
    this.setNotice('休息：已按恢复出的 REST readiness cost 消耗行动槽；额外效果尚无原版证据。');
  }

  private beginNpcInteraction(entityId:string|undefined,inputSource:NpcInteractionInputSource):void{
    if(this.scene.inBattleView)return;
    const actor=this.currentWorldState();
    this.world={...this.world,world:actor};
    const entities=this.m5World?[this.m5World.content.guide.entity]:WORLD_ENTITIES.filter(entity=>entity.kind==='npc');
    const entity=entityId?entities.find(candidate=>candidate.id===entityId):entities.find(candidate=>canInteract(candidate,actor));
    if(!entity){
      this.activeDialogue=null;
      this.setNotice(entityId?'当前 NPC 不能交互':'附近没有可交互 NPC');
      this.render(this.scene.snapshot());
      return;
    }
    const resolved=this.worldAuthority.beginNpcInteraction(this.world,{
      entityId:entity.id,
      mapId:actor.mapId,
      actorX:actor.x,
      actorY:actor.y,
      inputSource,
      provenance:'RECONSTRUCTION_POLICY',
    });
    if(!resolved.dialogue.accepted){
      this.activeDialogue=null;
      this.setNotice(`NPC 对话未开启：${resolved.dialogue.reason}`);
      this.render(this.scene.snapshot());
      return;
    }
    this.activeDialogue=resolved.dialogue.session;
    this.setNotice(`${this.activeDialogue.view.speaker}：${this.activeDialogue.view.lines.join(' ')}`);
    this.render(this.scene.snapshot());
  }

  private chooseNpcInteraction(choiceId:NpcDialogueChoiceId):void{
    const session=this.activeDialogue;
    if(!session)return;
    const previousStage=this.world.quest.stage;
    const resolved=this.worldAuthority.chooseNpcInteraction(this.world,session,choiceId);
    if(!resolved.outcome.accepted){
      this.setNotice(`NPC 选择未执行：${resolved.outcome.reason}`);
      this.activeDialogue=null;
      this.render(this.scene.snapshot());
      return;
    }
    this.world=resolved.state;
    const action=resolved.outcome.action;
    this.activeDialogue=null;
    if(action==='quest-completed'&&previousStage!=='complete'&&this.world.quest.stage==='complete'){
      this.applyQuestSettlement();
    }else if(action==='quest-accepted'){
      this.setNotice('已接受训练委托 / RECONSTRUCTION_POLICY');
    }else if(action==='declined'){
      this.setNotice('暂未接受训练委托');
    }else{
      this.setNotice('对话已关闭');
    }
    this.render(this.scene.snapshot());
  }

  interactWorld(entityId?:string):void{
    if(this.scene.inBattleView)return;
    const actor=this.currentWorldState();
    this.world={...this.world,world:actor};
    const entities=this.m5World?[this.m5World.content.guide.entity,this.m5World.content.objective]:WORLD_ENTITIES;
    const entity=entityId?entities.find(candidate=>candidate.id===entityId):entities.find(candidate=>canInteract(candidate,actor));
    if(!entity){this.setNotice(entityId?'当前 NPC 不能交互':'附近没有可交互对象');return;}
    const previousStage=this.world.quest.stage;
    const resolved=this.worldAuthority.interact(this.world,{entityId:entity.id,mapId:actor.mapId,actorX:actor.x,actorY:actor.y,provenance:'RECONSTRUCTION_POLICY'});
    this.world=resolved.state;
    const result=resolved.result;
    if(result.dialogue)this.setNotice(`${result.dialogue.speaker}：${result.dialogue.lines.join(' ')}`);
    else if(result.reason)this.setNotice(result.reason);
    if(result.warp){
      const next=applyWarp(this.world.world,result.warp);
      this.world={...this.world,world:next};
      this.applyWorldState(next);
    }
    if(result.encounter){
      this.pendingEncounter=result.encounter;
      this.scene.enterBattle();
      if(this.scene.inBattleView&&this.scene.state.battleZoneId!==result.encounter.battleZoneId)this.setNotice(`Encounter zone mismatch: expected ${result.encounter.battleZoneId}, got ${this.scene.state.battleZoneId}`);
    }
    if(previousStage!=='complete'&&this.world.quest.stage==='complete')this.applyQuestSettlement();
    this.render(this.scene.snapshot());
  }

  returnFromBattle():void{
    if(!this.scene.inBattleView)return;
    const phase=this.scene.state.phase;
    if(phase==='active'){this.setNotice('战斗尚未结束');return;}
    let returnState:WorldState|null=null;
    if(this.pendingEncounter){
      const outcome=phase==='won'?'won':'lost';
      const resolution=this.worldAuthority.resolveBattle(this.world,{battleZoneId:this.scene.state.battleZoneId??-1,outcome});
      this.world=resolution.state;
      returnState=resolution.returnTo??null;
      if(phase==='won')this.applyBattleSettlement();
    }
    this.scene.leaveBattle();
    this.scene.gold=this.rewards.gold;
    if(returnState)this.applyWorldState(returnState);else this.world={...this.world,world:this.currentWorldState()};
    this.pendingEncounter=null;
    this.lastSnapshot=null;
    this.render(this.scene.snapshot());
  }

  private applyBattleSettlement():void{
    if(this.m5World){
      const level=Math.max(1,this.rewards.progression.level);
      const reward=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.rewardForEncounter([{level,rank:'normal'},{level,rank:'normal'}]);
      const applied=applyBattleReward(this.rewards,'m5-training-house','battle:m5-training-house:win',{gold:reward.gold,exp:reward.exp});
      this.rewards=applied.state;this.scene.gold=this.rewards.gold;
      this.setNotice(`战斗胜利：金币 +${reward.gold}，EXP +${reward.exp}，当前 Lv.${this.rewards.progression.level} / RECONSTRUCTION_POLICY`);
      return;
    }
    const applied=applyBattleReward(this.rewards,'s9-training-battle','battle:s9-training-run:win',{gold:10,exp:100});
    this.rewards=applied.state;
    this.scene.gold=this.rewards.gold;
    if(applied.events.some(event=>event.type==='level_up'))this.setNotice(`战斗胜利：金币 +10，EXP +100，当前 Lv.${this.rewards.progression.level}`);
  }

  private applyQuestSettlement():void{
    const questId=this.worldAuthority.content.questId;
    const reward=this.m5World?{gold:7,exp:230,questFlags:['m5.training.complete']}:{gold:5,exp:200,questFlags:['m4.training.complete']};
    const applied=applyQuestReward(this.rewards,questId,`quest:${questId}:turn-in`,reward);
    this.rewards=applied.state;
    this.scene.gold=this.rewards.gold;
    this.setNotice(`任务完成：金币 +${reward.gold}，EXP +${reward.exp}，当前 Lv.${this.rewards.progression.level} / RECONSTRUCTION_POLICY`);
  }

  private combatEquipment(){
    const bonus=legacyEquipmentBonus(this.scene.inventory,this.scene.character);
    return this.scene.character==='109'?{defense:bonus.defense,magicAttack:bonus.attack}:{attack:bonus.attack,defense:bonus.defense};
  }

  private playerCombatStats(){
    return DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.playerStats(this.scene.character,Math.max(1,this.rewards.progression.level),this.combatEquipment());
  }

  private prepareReconstructionBattle():void{
    if(!this.m5World){this.scene.setReconstructionBattleSetup(undefined);return;}
    this.scene.setReconstructionBattleSetup({
      playerClassId:this.scene.character,level:Math.max(1,this.rewards.progression.level),equipment:this.combatEquipment(),
      enemyLevel:Math.max(1,this.rewards.progression.level),enemyRank:'normal'
    });
  }

  private applyClassProfile(resetVitals:boolean):void{
    if(!['100','109'].includes(this.scene.character))return;
    const definition=playableClassById(this.scene.character);
    const profile=battleProfileForClass(this.scene.character);
    if(this.m5World){
      if(!this.scene.inBattleView){
        const stats=this.playerCombatStats();
        this.scene.state.maxHp=stats.maxHp;this.scene.state.maxMp=stats.maxMp;this.scene.state.hp=stats.maxHp;this.scene.state.mp=stats.maxMp;
      }
    }else{
      this.scene.state.maxHp=definition.baseAuthoredStats.hp;
      this.scene.state.maxMp=definition.baseAuthoredStats.mp;
      if(resetVitals||!this.scene.inBattleView){
        this.scene.state.hp=this.scene.state.maxHp;
        this.scene.state.mp=this.scene.state.maxMp;
      }else{
        this.scene.state.hp=Math.min(this.scene.state.hp,this.scene.state.maxHp);
        this.scene.state.mp=Math.min(this.scene.state.mp,this.scene.state.maxMp);
      }
    }
    this.scene.state.moveReadinessCost=profile.movementReadinessCost;
    this.scene.state.attackReadinessCost=profile.attackReadinessCost;
    this.scene.state.restReadinessCost=profile.restReadinessCost;
    this.scene.state.magicReadinessCost=magicReadinessCost(profile,this.scene.state.actionMax);
  }

  private syncSceneInventory():void{
    this.scene.inventory={
      owned:this.rewards.inventory.items.map(item=>item.itemId),
      weapon:this.rewards.inventory.equipped.weapon,
      armor:this.rewards.inventory.equipped.armor,
    };
    this.scene.gold=this.rewards.gold;
  }

  private currentWorldState():WorldState{
    const cell=nearestAnchor(this.scene.anchor.x,this.scene.anchor.y);
    return{mapId:this.scene.mapId,x:cell[0],y:cell[1]};
  }

  private applyWorldState(state:WorldState):void{
    if(this.scene.inBattleView)return;
    this.activeDialogue=null;
    this.scene.setMap(state.mapId);
    const [x,y]=referenceCellToScreen([state.x,state.y]);
    this.scene.anchor={x,y};
    this.scene.route=[];
    if(this.m5World)this.scene.focusPlayer();else this.scene.fit();
    this.world={...this.world,world:{...state}};
    this.spatial?.start({mapId:state.mapId,cell:[state.x,state.y]});
  }

  private saveContext():SaveValidationContext{
    const mapBounds:Record<number,{width:number;height:number}>={};
    for(const map of Object.values(this.scene.pack.maps))mapBounds[map.manifest.id]={width:map.manifest.render.width,height:map.manifest.render.height};
    return{pack:this.scene.pack.digest,characters:['100','109'],mapBounds};
  }

  makeSave():SaveV2{
    if(this.scene.inBattleView)throw new Error('战斗中不能存档');
    if(this.scene.route.length)throw new Error('请等待移动结束后再存档');
    return{
      kind:SAVE_KIND,version:CURRENT_SAVE_VERSION,pack:this.scene.pack.digest,character:this.scene.character,mapId:this.scene.mapId,
      x:this.scene.anchor.x,y:this.scene.anchor.y,gold:this.rewards.gold,inventory:this.rewards.inventory,
      quest:{questId:this.world.quest.questId,stage:this.world.quest.stage} as JsonValue,
      questFlags:{...this.rewards.questFlags},progression:{...this.rewards.progression},rewardReceipts:[...this.rewards.rewardReceipts],savedAt:new Date().toISOString(),
    };
  }

  async save():Promise<void>{
    try{const save=this.makeSave();await writeM4Save(save);this.setNotice('M4 v2 存档已写入浏览器 IndexedDB');}
    catch(error){this.setNotice(`存档失败：${String(error)}`);}
  }

  async load():Promise<void>{
    try{const raw=await readM4Save();if(raw===undefined)throw new Error('没有可读取的存档');this.restore(raw);}
    catch(error){this.setNotice(`读档失败：${String(error)}`);}
  }

  exportJson():string{return serializeSaveV2(this.makeSave(),this.saveContext());}

  restore(raw:unknown):void{
    if(this.scene.inBattleView)throw new Error('请先结束战斗再读档');
    const save=migrateSave(raw,this.saveContext());
    const quest=parseM4Quest(save.quest,this.worldAuthority.content.questId);
    this.rewards={gold:save.gold,inventory:save.inventory,progression:save.progression,questFlags:save.questFlags,rewardReceipts:save.rewardReceipts};
    this.world={world:{mapId:save.mapId,...(()=>{const cell=nearestAnchor(save.x,save.y);return{x:cell[0],y:cell[1]};})()},quest};
    this.scene.setCharacter(save.character);
    this.scene.setMap(save.mapId);
    this.scene.anchor={x:save.x,y:save.y};
    this.scene.route=[];
    this.applyClassProfile(false);
    this.syncSceneInventory();
    if(this.m5World){this.scene.setPlayerCameraFollow(true);this.scene.focusPlayer();const cell=nearestAnchor(save.x,save.y);this.spatial?.start({mapId:save.mapId,cell});}
    else this.scene.fit();
    this.setNotice(`存档恢复成功 / schema v${CURRENT_SAVE_VERSION}`);
    this.render(this.scene.snapshot());
  }

  private onSnapshot(snapshot:Snapshot):void{
    if(this.lastSnapshot&&snapshot.inBattleView){
      if(snapshot.hp<this.lastSnapshot.hp){
        this.present(this.presentation.hit({targetId:'player',amount:this.lastSnapshot.hp-snapshot.hp,resultingHp:snapshot.hp,maxHp:this.scene.state.maxHp}));
      }
      for(const enemy of snapshot.enemies){
        const previous=this.lastSnapshot.enemies.find(entry=>entry.id===enemy.id);
        if(previous&&enemy.hp<previous.hp){
          this.present(this.presentation.hit({targetId:enemy.id,amount:previous.hp-enemy.hp,resultingHp:enemy.hp,maxHp:this.scene.state.enemies.find(entry=>entry.id===enemy.id)?.maxHp??previous.hp}));
          if(enemy.hp<=0&&previous.hp>0)this.present(this.presentation.deathOf('enemy',enemy.id));
        }
      }
      if(this.lastSnapshot.phase!==snapshot.phase&&(snapshot.phase==='won'||snapshot.phase==='lost')){
        this.present(this.presentation.terminal(snapshot.phase));
        if(snapshot.phase==='lost')this.present(this.presentation.deathOf('player','player'));
      }
    }
    if(!snapshot.inBattleView){
      this.world={...this.world,world:this.currentWorldState()};
      if(this.handleM5Spatial())return;
    }
    this.lastSnapshot=snapshot;
    this.render(snapshot);
  }

  private handleM5Spatial():boolean{
    if(!this.m5World||!this.spatial||this.scene.inBattleView)return false;
    const actor=this.currentWorldState();
    let update;
    try{update=this.spatial.update({mapId:actor.mapId,cell:[actor.x,actor.y]});}
    catch{return false;}
    if(update.transition){
      if(this.world.quest.stage==='not_started'){
        this.spatial.rejectPending();this.setNotice('先与训练引导员交谈并接取任务，再进入训练屋。');return false;
      }
      const committed=this.spatial.commit(update.transition);
      const next={mapId:committed.mapId,x:committed.cell[0],y:committed.cell[1]};
      this.world={...this.world,world:next};
      if(committed.mapId===this.m5World.content.objectiveMapId)this.world=this.worldAuthority.arriveObjectiveMap(this.world,committed.mapId);
      this.applyWorldState(next);
      this.setNotice(committed.mapId===this.m5World.content.objectiveMapId?'已自动进入训练屋 / RECONSTRUCTION_POLICY':'已离开训练屋，返回外城 / RECONSTRUCTION_POLICY');
      this.lastSnapshot=null;this.render(this.scene.snapshot());return true;
    }
    if(this.world.quest.stage==='objective'&&actor.mapId===this.m5World.content.objectiveMapId&&!this.pendingEncounter&&!this.scene.route.length&&canInteract(this.m5World.content.objective,actor)){
      const resolved=this.worldAuthority.interact(this.world,{entityId:this.m5World.content.objective.id,mapId:actor.mapId,actorX:actor.x,actorY:actor.y,provenance:'RECONSTRUCTION_POLICY'});
      this.world=resolved.state;
      if(resolved.result.encounter){
        this.pendingEncounter=resolved.result.encounter;this.scene.enterBattle();
        this.setNotice('接近训练怪物：进入战斗 / RECONSTRUCTION_POLICY');
        return true;
      }
    }
    return false;
  }

  private present(batch:BattlePresentationBatch):void{
    const audio=batch.audio.filter(route=>route.action==='play').map(route=>route.path).filter((path):path is string=>!!path);
    if(audio.length)this.lastAudio=audio.join(', ');
    for(const cue of batch.visual){
      if(cue.kind==='damage-number'&&cue.amount){
        const node=document.createElement('div');node.className='m4-damage-number';node.textContent=`-${Math.ceil(cue.amount)}`;this.feedbackRoot.append(node);setTimeout(()=>node.remove(),cue.durationMs??520);
      }
      if(cue.kind==='camera-nudge'){
        const host=document.getElementById('canvas-host');host?.classList.add('m4-camera-nudge');setTimeout(()=>host?.classList.remove('m4-camera-nudge'),cue.durationMs??70);
      }
      if(cue.kind==='victory-banner'||cue.kind==='defeat-banner'){
        const node=document.createElement('div');node.className='m4-terminal-banner';node.textContent=cue.kind==='victory-banner'?'战斗胜利':'战斗失败';this.feedbackRoot.append(node);setTimeout(()=>node.remove(),cue.durationMs??1200);
      }
    }
  }

  private nearestInteraction(snapshot:Snapshot):string|undefined{
    if(snapshot.inBattleView)return undefined;
    const actor=this.currentWorldState();
    const entities=this.m5World?[this.m5World.content.guide.entity,this.m5World.content.objective]:WORLD_ENTITIES;
    const entity=entities.find(candidate=>canInteract(candidate,actor));
    if(!entity)return undefined;
    if(entity.kind==='npc')return `与${entity.displayName}交谈`;
    return `调查${entity.displayName}`;
  }

  private render(snapshot:Snapshot):void{
    if(!['100','109'].includes(snapshot.character))return;
    const definition=playableClassById(snapshot.character);
    const fieldStats=this.m5World?this.playerCombatStats():null;
    const player:PlayerHudState={
      name:'佣兵',className:definition.displayName,portraitLabel:definition.family==='swordsman'?'剑':'巫',level:this.rewards.progression.level,
      hp:snapshot.inBattleView?snapshot.hp:fieldStats?.maxHp??definition.baseAuthoredStats.hp,hpMax:snapshot.inBattleView?this.scene.state.maxHp:fieldStats?.maxHp??definition.baseAuthoredStats.hp,
      mp:snapshot.inBattleView?snapshot.mp:fieldStats?.maxMp??definition.baseAuthoredStats.mp,mpMax:snapshot.inBattleView?this.scene.state.maxMp:fieldStats?.maxMp??definition.baseAuthoredStats.mp,gold:this.rewards.gold,
    };
    const quest=questHud(this.world.quest.stage);
    const field:FieldHudState={mapId:snapshot.mapId,mapName:snapshot.mapName,...quest,interactionPrompt:this.nearestInteraction(snapshot)};
    if(snapshot.inBattleView){
      const target=snapshot.enemies.find(enemy=>enemy.id===snapshot.target&&enemy.hp>0);
      const battle:BattleHudState={
        phase:snapshot.phase,readiness:snapshot.action,readinessMax:snapshot.actionMax,ready:snapshot.actionReady,busy:snapshot.busy,paused:snapshot.battlePaused,
        targetName:target?.id,targetHp:target?.hp,targetHpMax:target?this.scene.state.enemies.find(enemy=>enemy.id===target.id)?.maxHp:undefined,
        statusText:snapshot.phase==='active'?(snapshot.actionReady?'可以行动':'等待行动槽'):snapshot.phase==='won'?'战斗已胜利':'战斗已结束',
        canAttack:snapshot.phase==='active',canRest:snapshot.phase==='active',canReturn:snapshot.phase==='won'||snapshot.phase==='lost',
        skills:definition.availableSkillIds.map((id,index)=>{const skill=skillById(id);return{id,name:skill.displayName,mpCost:skill.mpCost,hotkey:String(index+1),disabled:snapshot.mp<skill.mpCost};}),
      };
      this.hudRoot.innerHTML=renderBattleHud(player,battle);
    }else this.hudRoot.innerHTML=renderFieldHud(player,field);

    this.menuRoot.innerHTML=renderGameMenu({open:this.menuOpen,canSave:!snapshot.inBattleView,canLoad:!snapshot.inBattleView,devEnabled:this.developerMode});
    const grid=this.menuRoot.querySelector('.menu-grid');
    if(grid)grid.insertAdjacentHTML('beforeend','<button type="button" data-action="class-swordsman">切换剑士</button><button type="button" data-action="class-wizard">切换巫师</button>');
    const diagnostics:DiagnosticsState={
      open:this.developerMode,mapSelector:String(snapshot.mapId).padStart(4,'0'),rawTiming:`${snapshot.timing} → ${snapshot.duration.toFixed(2)}ms`,
      actionSlot:snapshot.slot,direction:String(snapshot.direction),bounds:snapshot.debugBounds?'visible':'hidden',magicRes:snapshot.effect?`#${snapshot.effect.id} ${snapshot.effect.cursor+1}/${snapshot.effect.length}`:'idle',
      provenance:`battle=${snapshot.battleEntryProvenance}; damage=${snapshot.damagePolicy.provenance}; quest=${this.worldAuthority.provenance}; progression=RECONSTRUCTION_POLICY${this.lastAudio?`; audio=${this.lastAudio}`:''}`,
    };
    this.debugRoot.innerHTML=this.developerMode?renderDebugPanel(diagnostics):'';
    this.dialogueRoot.innerHTML=this.renderDialogue();
    document.body.classList.toggle('m4-dev-enabled',this.developerMode);
    document.body.classList.toggle('m4-inventory-open',this.inventoryOpen);
    const status=document.getElementById('m4-runtime-notice');
    if(status)status.textContent=this.noticeText;
  }

  private renderDialogue():string{
    const session=this.activeDialogue;
    if(!session)return '';
    const view=session.view;
    const lines=view.lines.map(line=>`<p>${escapeHtml(line)}</p>`).join('');
    const choices=view.choices.map(choice=>`<button type="button" data-dialogue-choice="${choice.id}">${escapeHtml(choice.label)}</button>`).join('');
    return `<section class="npc-dialogue" data-ui="npc-dialogue" data-input-source="${session.inputSource}" aria-label="NPC 对话">
      <div class="npc-dialogue-speaker">${escapeHtml(view.speaker)}</div>
      <div class="npc-dialogue-copy">${lines}</div>
      <div class="npc-dialogue-actions">${choices}</div>
      <small>RECONSTRUCTION_POLICY</small>
    </section>`;
  }

  private setNotice(message:string):void{
    this.noticeText=message;
    let node=document.getElementById('m4-runtime-notice');
    if(!node){node=document.createElement('div');node.id='m4-runtime-notice';node.className='game-notice';document.querySelector('.world')?.append(node);}
    node.textContent=message;
  }
}

export function installM4Runtime(scene:LabScene):M4RuntimeIntegration{
  const runtime=new M4RuntimeIntegration(scene);
  runtime.install();
  return runtime;
}
