import type {LabScene} from './scene.ts';
import type {Skill} from './battle.ts';
import {actionReady,consumeAction,reconcileBattlePhase,updateBattle} from './battle.ts';
import {battleProfileForClass,magicReadinessCost} from './battle-profile.ts';
import {nearestAnchor,referenceCellToScreen} from './coordinates.ts';
import {playableClassById,isEquipmentCompatibleWithClass} from './content/classes/class-catalog.ts';
import rawSkills from '../../data/skills/mvp.json' with {type:'json'};
import {BattlePresentation} from './presentation/battle-presentation.ts';
import type {BattlePresentationBatch} from './presentation/battle-presentation.ts';
import {createInventory,knownItemIds} from './progression/inventory.ts';
import type {InventoryState} from './progression/inventory.ts';
import {equipItem as equipProgression,reconcileEquipmentForCharacter} from './progression/equipment.ts';
import type {EquipmentCompatibilityResolver} from './progression/equipment.ts';
import {initialM71Progression,RECONSTRUCTION_PROGRESSION_POLICY,totalExpForLevel} from './progression/progression.ts';
import {M71_EXPERIENCE_POLICY,m71AuthoredExperienceValue} from './progression/m7-1-experience-policy.ts';
import {applyBattleReward,applyQuestReward} from './progression/rewards.ts';
import type {RewardState} from './progression/rewards.ts';
import {CURRENT_SAVE_VERSION,SAVE_KIND} from './progression/save-schema.ts';
import type {JsonValue,SaveV2,SaveValidationContext} from './progression/save-schema.ts';
import {applyM6Promotion} from './progression/m6-stage-promotion.ts';
import type {M6StageProgressionState} from './progression/m6-stage-promotion.ts';
import {createM6SaveExtension} from './progression/m6-save-extension.ts';
import {equipM6Item,evaluateM6EquipmentEligibility} from './progression/m6-equipment.ts';
import {migrateSaveToM7,serializeM7SaveV2} from './progression/m7-save-migration.ts';
import type {M7SaveV2} from './progression/m7-save-migration.ts';
import {createM7SaveExtension} from './progression/m7-save-extension.ts';
import {
  M6_CHARACTER_IDS,M6_RUNTIME_EQUIPMENT_RULES,M6_SAVE_CONTENT,createM6StageState,m6QuestChainForLegacyStage,
  m6SkillAvailableForCharacter,m6SkillIdsForCharacter,m6StageTrackForCharacter,
} from './m6-runtime-content.ts';
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
import type {BattleHudState,BattleStatusView,DiagnosticsState,FieldHudState,PlayerHudState} from './ui/types.ts';
import {readM4Save,writeM4Save} from './m4-save-store.ts';
import {equipmentBonus as legacyEquipmentBonus} from './inventory.ts';
import {createM5PlayableWorld} from './world/m5-playable-world.ts';
import type {M5PlayableWorld} from './world/m5-playable-world.ts';
import {SceneTransitionController} from './world/scene-transition.ts';
import {DEFAULT_RECONSTRUCTION_COMBAT_BALANCE} from './combat/reconstruction-combat-balance.ts';
import {applyInfiniteTrainingRecovery,InfiniteTrainingRecoveryPolicy} from './training/m7-recovery.ts';
import {M7_TRAINING_BATTLES,reconstructionSetupForTrainingBattle,trainingBattleById} from './training/m7-training-camp.ts';
import {integratedTrainingBattleById,reconstructionEnemiesForTrainingBattle} from './training/m7-integrated-training-catalog.ts';
import {buildM7DeveloperCharacterPreset} from './training/m7-developer-preset.ts';
import {createM7IntegratedSkillState,m7RuntimeSkillCommands,reconcileM7IntegratedSkillState} from './training/m7-skill-progression.ts';
import type {M7IntegratedSkillState,M7RuntimeSkillCommand} from './training/m7-skill-progression.ts';
import {useM7Skill,useM7SkillTargeted} from './combat/m7-battle-skills.ts';
import {beginM7SkillTargeting,cancelM7SkillTargeting,confirmM7SkillTargeting,createM7SkillTargetingState,enumerateM7DiamondArea,hoverM7SkillTargeting,m7PixelToGridCell,m7PoisonGeometry,tapM7SkillTargeting,validateM7CastCell} from './combat/m7-grid-targeting.ts';
import type {M7GridCell,M7SkillTargetingState} from './combat/m7-grid-targeting.ts';
import {m7WizardOrdinaryAttackTargetable} from './content/skills/wizard-seven-stage-runtime.ts';
import type {M7Profession} from './training/m7-level-axis.ts';
import {resolveM7TrainingManagerInteraction} from './world/m7-training-manager.ts';
import {m7EffectiveDefense,m7EffectivePhysicalAttack} from './combat/m7-status-effects.ts';
import {integratedPromotionRuleForCharacter} from './training/m7-promotion-policy.ts';
import {renderM7DeveloperPreset,renderM7TrainingManagerDialog} from './ui/m7-training-camp.ts';
import {battleSkillHotkeyLabel,resolveBattleHotkey} from './input/battle-hotkeys.ts';
import type {BattleHotkeyCommand} from './input/battle-hotkeys.ts';

type Snapshot=ReturnType<LabScene['snapshot']>;
type BattleInputSceneContract=LabScene&{
  setBattleRangeOverlayVisible?:(visible:boolean)=>void;
  cancelBattleTargeting?:()=>boolean;
};
const QUEST_STAGES:readonly QuestStage[]=['not_started','accepted','objective','ready_to_turn_in','complete'];
const CLASS_RESOLVER:EquipmentCompatibilityResolver=(characterId,item)=>{
  try{return isEquipmentCompatibleWithClass(characterId,item.itemId,item.slot);}catch{return false;}
};

function starterInventory():InventoryState{
  return createInventory(knownItemIds().map(itemId=>({itemId,source:{kind:'starter' as const,ref:'m4-starter'}})));
}

export function createM4RewardState(gold=0):RewardState{
  return {gold,inventory:starterInventory(),progression:initialM71Progression(),questFlags:{},rewardReceipts:[]};
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

function visualSkillForCommand(command:M7RuntimeSkillCommand):Skill|null{
  if(command.authoredSkillId===null)return null;
  const row=rawSkills.find(entry=>entry.skill_id===command.authoredSkillId);
  return row?row as Skill:null;
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
  m6Stage:M6StageProgressionState;
  m7Skills:M7IntegratedSkillState;
  pendingEncounter:EncounterRequest|null=null;
  menuOpen=false;
  developerMode=false;
  inventoryOpen=false;
  private activeDialogue:NpcDialogueSession|null=null;
  private trainingManagerOpen=false;
  private battleExitConfirm=false;
  private battleRangeOverlayVisible=false;
  private battleTargetingState:M7SkillTargetingState=createM7SkillTargetingState();
  private battleTargetingCommandId:string|null=null;
  private suppressEncounterUntilLeave=false;
  private selectedTrainingBattleId=1;
  private activeTrainingBattleId:number|null=null;
  private trainingLaunchPending=false;
  private developerPresetActive=false;
  private developerUnlockAllSkills=false;
  private developerSkillPoints=0;
  private hudHtml='';
  private menuHtml='';
  private debugHtml='';
  private dialogueHtml='';
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
    this.m6Stage=createM6StageState(scene.character);
    this.m7Skills=createM7IntegratedSkillState(scene.character,1);
  }

  install():void{
    if(this.installed)return;
    this.installed=true;
    document.body.classList.add('m4-active');
    this.mountRoots();
    this.installSceneAdapters();
    this.installInput();
    this.installBattleTargetingAdapter();
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
      m6:{stageId:this.m6Stage.stageId,family:this.m6Stage.family,promotionReceipts:[...this.m6Stage.promotionReceipts],nextStageId:integratedPromotionRuleForCharacter(this.scene.character)?.toStageId??null,canPromote:(integratedPromotionRuleForCharacter(this.scene.character)?.minimumLevel??Infinity)<=this.rewards.progression.level},
      m7Training:{battleCount:M7_TRAINING_BATTLES.length,selectedBattleId:this.selectedTrainingBattleId,activeBattleId:this.activeTrainingBattleId,recoveryPolicyId:InfiniteTrainingRecoveryPolicy.id,developerPresetActive:this.developerPresetActive,unlockAllImplementedSkills:this.developerMode&&this.developerUnlockAllSkills,developerSkillPoints:this.developerSkillPoints,skillLevelOverride:this.developerMode&&this.developerUnlockAllSkills?6:null},
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
      if(!M6_CHARACTER_IDS.includes(this.scene.character))return;
      if(String(this.m6Stage.stageId)!==this.scene.character)this.m6Stage=createM6StageState(this.scene.character);
      const reconciled=reconcileEquipmentForCharacter(this.rewards.inventory,this.scene.character,CLASS_RESOLVER);
      this.rewards={...this.rewards,inventory:reconciled.inventory};
      this.syncSceneInventory();
      this.applyClassProfile(false);
      if(reconciled.unequipped.length)this.setNotice(`职业切换：自动卸下 ${reconciled.unequipped.length} 件不兼容装备。`);
    };

    this.scene.equipItem=(id:number|null,slot:'weapon'|'armor')=>{
      try{
        if(this.scene.inBattleView)throw new Error('战斗中不能更换装备');
        const definition=playableClassById(this.scene.character);
        equipM6Item(
          {weapon:this.rewards.inventory.equipped.weapon,armor:this.rewards.inventory.equipped.armor,accessory:null},
          this.rewards.inventory,
          M6_RUNTIME_EQUIPMENT_RULES,
          {characterId:this.scene.character,family:definition.family,stageId:Number(this.scene.character),level:this.rewards.progression.level},
          slot,
          id,
        );
        const inventory=equipProgression(this.rewards.inventory,this.scene.character,slot,id,CLASS_RESOLVER);
        this.rewards={...this.rewards,inventory};
        this.syncSceneInventory();
        this.applyClassProfile(false);
        this.setNotice('装备已更新 / RECONSTRUCTION_POLICY');
      }catch(error){this.setNotice(String(error));}
    };

    const originalEnter=this.scene.enterBattle.bind(this.scene);
    this.scene.enterBattle=(entryOverride)=>{
      this.clearBattleTargeting(false);
      this.activeDialogue=null;
      this.battleExitConfirm=false;
      const trainingBattleId=this.trainingLaunchPending?this.selectedTrainingBattleId:null;
      this.prepareReconstructionBattle(trainingBattleId);
      const requestedTrainingZone=trainingBattleId===null?null:trainingBattleById(trainingBattleId).battleZoneId;
      const trainingEntry=requestedTrainingZone!==null&&this.scene.pack.maps[String(requestedTrainingZone)]?Object.freeze({
        battleZoneId:requestedTrainingZone,
        provenance:'RECONSTRUCTION_POLICY' as const,
        authority:'offline-reconstruction' as const,
      }):undefined;
      originalEnter(entryOverride??trainingEntry);
      this.trainingLaunchPending=false;
      if(!this.scene.inBattleView){
        if(trainingBattleId!==null)this.activeTrainingBattleId=null;
        return;
      }
      this.activeTrainingBattleId=trainingBattleId;
      this.applyClassProfile(true);
      this.lastSnapshot=null;
      const batch=this.presentation.battleStart({zoneId:this.scene.state.battleZoneId??this.worldAuthority.content.battleZoneId});
      this.present(batch);
    };

    const originalAttack=this.scene.attack.bind(this.scene);
    this.scene.attack=(skill:Skill|null)=>{
      if(skill&&!this.skillAllowedForRuntime(this.scene.character,skill.skill_id)){
        this.setNotice('当前职业不能使用该技能');return;
      }
      if(!skill){
        const target=this.scene.state.enemies.find(enemy=>enemy.id===this.scene.selectedEnemy&&enemy.hp>0);
        if(target&&!m7WizardOrdinaryAttackTargetable(target.m7Status.wizard)){
          this.setNotice('石化目标不能被普通攻击');
          return;
        }
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
      if(action==='menu'||action==='battle-menu'){this.activeDialogue=null;this.menuOpen=true;this.render(this.scene.snapshot());}
      else if(action==='menu-close'){this.menuOpen=false;this.render(this.scene.snapshot());}
      else if(action==='save')void this.save();
      else if(action==='load')void this.load();
      else if(action==='inventory'){this.inventoryOpen=!this.inventoryOpen;document.body.classList.toggle('m4-inventory-open',this.inventoryOpen);}
      else if(action==='fullscreen')void this.scene.toggleFullscreen().then(ok=>this.setNotice(ok?'全屏状态已切换':'当前浏览器未允许全屏切换'));
      else if(action==='zoom-in'){this.scene.zoomIn();this.setNotice('视角已放大');}
      else if(action==='zoom-out'){this.scene.zoomOut();this.setNotice('视角已缩小');}
      else if(action==='zoom-reset'){this.scene.resetZoom();this.scene.focusPlayer();this.setNotice('视角已恢复 1:1 并居中角色');}
      else if(action==='interact')this.beginNpcInteraction(undefined,'pointer');
      else if(action==='attack')this.scene.attack(null);
      else if(action==='skill')this.useSkill(target.dataset.skillId??'');
      else if(action==='recovery-hp')this.trainingRecovery('hp');
      else if(action==='recovery-mp')this.trainingRecovery('mp');
      else if(action==='rest')this.rest();
      else if(action==='training-manager-close'){this.trainingManagerOpen=false;this.render(this.scene.snapshot());}
      else if(action==='battle-exit-request')this.requestBattleExit();
      else if(action==='battle-exit-cancel')this.cancelBattleExit();
      else if(action==='battle-exit-confirm')this.confirmBattleExit();
      else if(action==='return')this.returnFromBattle();
      else if(action==='class-swordsman')this.changeClass('100');
      else if(action==='class-wizard')this.changeClass('109');
      else if(action==='training-start')this.startTrainingBattle(Number(target.dataset.trainingBattleId));
      else if(action==='dev-preset-apply')this.applyDeveloperPreset();
      else if(action==='dev-preset-quick')this.applyDeveloperPreset(Number(target.dataset.devLevel));
      else if(action==='m6-promote')this.promoteM6Stage();
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
      const battleCommand=resolveBattleHotkey(event.key,this.scene.inBattleView);
      if(battleCommand){
        event.preventDefault();
        this.executeBattleHotkey(battleCommand);
        return;
      }
      if(event.key==='Escape'){this.handleEscape();return;}
      if(event.key==='f'||event.key==='F'){event.preventDefault();void this.scene.toggleFullscreen();return;}
      if(event.key==='+'||event.key==='='){event.preventDefault();this.scene.zoomIn();return;}
      if(event.key==='-'){event.preventDefault();this.scene.zoomOut();return;}
      if(event.key==='0'){event.preventDefault();this.scene.resetZoom();this.scene.focusPlayer();return;}
      if(!this.scene.inBattleView&&(event.key==='e'||event.key==='E')){event.preventDefault();this.beginNpcInteraction(undefined,'keyboard');return;}
      // Hidden compatibility aliases only. H/M are intentionally absent from the battle HUD.
      if(this.scene.inBattleView&&(event.key==='h'||event.key==='H')){event.preventDefault();this.trainingRecovery('hp');return;}
      if(this.scene.inBattleView&&(event.key==='m'||event.key==='M')){event.preventDefault();this.trainingRecovery('mp');return;}
    });
  }

  private executeBattleHotkey(command:BattleHotkeyCommand):void{
    if(!this.scene.inBattleView)return;
    if(command.kind==='attack'){this.scene.attack(null);return;}
    if(command.kind==='recovery'){this.trainingRecovery(command.resource);return;}
    if(command.kind==='rest'){this.rest();return;}
    if(command.kind==='skill'){
      const skill=this.runtimeSkillCommands()[command.slot];
      if(skill)this.useSkill(skill.id);
      else this.setNotice(`技能槽 ${command.slot+1} 当前未配置`);
      return;
    }
    this.handleEscape();
  }

  private battleInputScene():BattleInputSceneContract{return this.scene as BattleInputSceneContract;}

  private handleEscape():void{
    if(this.scene.inBattleView&&this.battleInputScene().cancelBattleTargeting?.()){
      this.setNotice('已取消当前技能瞄准 / 命令');
      this.render(this.scene.snapshot());
      return;
    }
    if(this.battleExitConfirm){this.cancelBattleExit();return;}
    if(this.activeDialogue){this.activeDialogue=null;this.render(this.scene.snapshot());return;}
    this.menuOpen=!this.menuOpen;
    this.render(this.scene.snapshot());
  }

  private publishBattleRangeOverlay(visible:boolean,announce:boolean):void{
    this.battleRangeOverlayVisible=visible;
    this.battleInputScene().setBattleRangeOverlayVisible?.(visible);
    window.dispatchEvent(new CustomEvent('lapis-battle-range-overlay',{detail:{visible}}));
    if(announce){
      this.setNotice(`战斗移动 / 攻击 / 施法范围：${visible?'显示':'隐藏'}`);
      this.render(this.scene.snapshot());
    }
  }

  private toggleBattleRangeOverlay():void{
    if(!this.scene.inBattleView)return;
    this.publishBattleRangeOverlay(!this.battleRangeOverlayVisible,true);
  }


  private installBattleTargetingAdapter():void{
    this.scene.setBattleSkillTargetingAdapter({
      isTargetingSkill:()=>this.battleTargetingState.phase==='aiming',
      onWorldHover:(x,y,coarse)=>this.hoverBattleTargeting(x,y,coarse),
      onWorldPointer:(x,y,coarse)=>this.handleBattleTargetPointer(x,y,coarse),
      onEnemyPointer:enemyId=>{this.scene.selectedEnemy=enemyId;},
      onCancel:()=>this.cancelBattleTargeting(),
    });
  }

  private activeBattleTargetingCommand():M7RuntimeSkillCommand|null{
    if(this.battleTargetingState.phase!=='aiming'||!this.battleTargetingCommandId)return null;
    return this.runtimeSkillCommands().find(command=>command.id===this.battleTargetingCommandId)??null;
  }

  private targetCellOnCurrentBattleMap(cell:M7GridCell):boolean{
    const collision=this.scene.currentMap().collision;
    return Number.isInteger(cell[0])&&Number.isInteger(cell[1])&&cell[0]>=0&&cell[1]>=0&&cell[0]<collision.width&&cell[1]<collision.height;
  }

  private poisonCastCells(command:M7RuntimeSkillCommand):readonly M7GridCell[]{
    const geometry=m7PoisonGeometry(command.skillLevel);
    const caster=m7PixelToGridCell(this.scene.anchor.x,this.scene.anchor.y);
    const collision=this.scene.currentMap().collision;
    const cells:M7GridCell[]=[];
    for(let x=0;x<collision.width;x++)for(let y=0;y<collision.height;y++){
      const cell=Object.freeze([x,y]) as M7GridCell;
      if(validateM7CastCell(caster,cell,geometry.castDistance).ok)cells.push(cell);
    }
    return Object.freeze(cells);
  }

  private syncBattleTargetingVisual():void{
    const command=this.activeBattleTargetingCommand();
    if(!command){
      this.scene.setBattleTargetingVisualization(undefined);
      return;
    }
    const geometry=m7PoisonGeometry(command.skillLevel);
    const preview=this.battleTargetingState.previewCell;
    const previewCells=preview
      ?enumerateM7DiamondArea(preview,geometry.areaCode).filter(cell=>this.targetCellOnCurrentBattleMap(cell))
      :Object.freeze([] as M7GridCell[]);
    this.scene.setBattleTargetingVisualization({
      castCells:this.poisonCastCells(command),
      previewCenter:preview,
      previewCells,
    });
  }

  private beginBattleTargeting(command:M7RuntimeSkillCommand):void{
    if(!this.scene.inBattleView||this.scene.state.phase!=='active'){this.setNotice('请先进入战斗画面');return;}
    if(!this.scene.canAct()){this.setNotice('行动未就绪，暂时不能进入技能瞄准');return;}
    if(this.scene.state.mp<command.mpCost){this.setNotice('MP 不足');return;}
    this.battleTargetingCommandId=command.id;
    this.battleTargetingState=beginM7SkillTargeting(command.id);
    this.syncBattleTargetingVisual();
    this.setNotice(`${command.displayName} Lv.${command.skillLevel}：选择施法中心格；Esc/右键取消`);
    this.render(this.scene.snapshot());
  }

  private hoverBattleTargeting(worldX:number,worldY:number,coarse:boolean):void{
    if(coarse||this.battleTargetingState.phase!=='aiming')return;
    const command=this.activeBattleTargetingCommand();if(!command)return;
    const cell=m7PixelToGridCell(worldX,worldY);
    const caster=m7PixelToGridCell(this.scene.anchor.x,this.scene.anchor.y);
    if(!this.targetCellOnCurrentBattleMap(cell)||!validateM7CastCell(caster,cell,m7PoisonGeometry(command.skillLevel).castDistance).ok){
      if(this.battleTargetingState.previewCell){
        this.battleTargetingState=beginM7SkillTargeting(command.id);
        this.syncBattleTargetingVisual();
      }
      return;
    }
    this.battleTargetingState=hoverM7SkillTargeting(this.battleTargetingState,cell);
    this.syncBattleTargetingVisual();
  }

  private handleBattleTargetPointer(worldX:number,worldY:number,coarse:boolean):boolean{
    if(this.battleTargetingState.phase!=='aiming')return false;
    const command=this.activeBattleTargetingCommand();if(!command){this.clearBattleTargeting(false);return true;}
    const cell=m7PixelToGridCell(worldX,worldY);
    const caster=m7PixelToGridCell(this.scene.anchor.x,this.scene.anchor.y);
    const geometry=m7PoisonGeometry(command.skillLevel);
    if(!this.targetCellOnCurrentBattleMap(cell)||!validateM7CastCell(caster,cell,geometry.castDistance).ok){
      this.setNotice(`目标格超出技能射程（${geometry.castDistance}格）`);
      this.render(this.scene.snapshot());
      return true;
    }
    this.battleTargetingState=coarse
      ?tapM7SkillTargeting(this.battleTargetingState,cell)
      :confirmM7SkillTargeting(this.battleTargetingState,cell);
    this.syncBattleTargetingVisual();
    if(this.battleTargetingState.phase==='confirmed'&&this.battleTargetingState.confirmedCell){
      const confirmed=this.battleTargetingState.confirmedCell;
      this.clearBattleTargeting(false);
      try{this.executeSkillCommand(command,confirmed);}catch(error){this.setNotice(String(error));this.render(this.scene.snapshot());}
    }else{
      this.setNotice(`${command.displayName}：再次点击当前格确认施法`);
      this.render(this.scene.snapshot());
    }
    return true;
  }

  private cancelBattleTargeting():boolean{
    if(this.battleTargetingState.phase!=='aiming')return false;
    this.battleTargetingState=cancelM7SkillTargeting(this.battleTargetingState);
    this.battleTargetingCommandId=null;
    this.scene.setBattleTargetingVisualization(undefined);
    this.battleTargetingState=createM7SkillTargetingState();
    return true;
  }

  private clearBattleTargeting(_announce=false):void{
    this.battleTargetingState=createM7SkillTargetingState();
    this.battleTargetingCommandId=null;
    this.scene.setBattleTargetingVisualization(undefined);
  }

  private changeClass(id:'100'|'109'):void{
    if(this.scene.inBattleView){this.setNotice('请先结束战斗再开始新职业档');return;}
    this.activeDialogue=null;
    this.pendingEncounter=null;
    this.activeTrainingBattleId=null;
    this.trainingLaunchPending=false;
    this.developerPresetActive=false;
    this.developerUnlockAllSkills=false;
    this.developerSkillPoints=0;
    this.rewards=createM4RewardState(0);
    this.world=this.worldAuthority.initial(this.m5World?.content.start??START_STATE);
    this.m6Stage=createM6StageState(id);
    this.m7Skills=createM7IntegratedSkillState(id,1);
    this.scene.setCharacter(id);
    this.m6Stage=createM6StageState(id);
    this.syncSceneInventory();
    this.applyWorldState(this.m5World?.content.start??START_STATE);
    this.menuOpen=false;
    this.setNotice(id==='100'?'已开始新的剑士职业档':'已开始新的巫师职业档');
    this.render(this.scene.snapshot());
  }

  acceptanceSetEnemyHp(targetId:string,hp:number):void{
    if(!navigator.webdriver)throw new Error('M7 acceptance enemy fixture is automation-only');
    if(!this.scene.inBattleView)throw new Error('M7 acceptance enemy fixture requires active battle');
    const enemy=this.scene.state.enemies.find(row=>row.id===targetId&&row.hp>0);
    if(!enemy)throw new Error('Unknown live acceptance enemy '+targetId);
    if(!Number.isFinite(hp)||hp<=0||hp>=enemy.maxHp)throw new Error('Invalid acceptance enemy HP');
    enemy.hp=hp;
    this.render(this.scene.snapshot());
  }

  acceptanceSetPlayerMp(mp:number):void{
    if(!navigator.webdriver)throw new Error('M7 acceptance player MP fixture is automation-only');
    if(!this.scene.inBattleView)throw new Error('M7 acceptance player MP fixture requires active battle');
    if(!Number.isFinite(mp)||mp<0)throw new Error('Invalid acceptance player MP');
    this.scene.state.mp=Math.min(this.scene.state.maxMp,Math.floor(mp));
    this.render(this.scene.snapshot());
  }

  acceptancePrimeEnemyAction(targetId:string):void{
    if(!navigator.webdriver)throw new Error('M7 acceptance enemy action fixture is automation-only');
    if(!this.scene.inBattleView)throw new Error('M7 acceptance enemy action fixture requires active battle');
    const enemy=this.scene.state.enemies.find(row=>row.id===targetId&&row.hp>0);
    if(!enemy)throw new Error('Unknown live acceptance enemy '+targetId);
    enemy.action=this.scene.state.actionMax;
  }

  acceptanceRunEnemyAbility(targetId:string,abilityKind:string):void{
    if(!navigator.webdriver)throw new Error('S34 acceptance enemy ability fixture is automation-only');
    if(!this.scene.inBattleView||this.scene.state.phase!=='active')throw new Error('S34 acceptance enemy ability fixture requires active battle');
    const enemy=this.scene.state.enemies.find(row=>row.id===targetId&&row.hp>0);
    if(!enemy)throw new Error('Unknown live acceptance enemy '+targetId);
    const ability=enemy.abilities.find(row=>row.kind===abilityKind);
    if(!ability)throw new Error('Enemy '+targetId+' lacks acceptance ability '+abilityKind);
    enemy.abilityCooldownMs[ability.abilityId]=0;
    enemy.action=this.scene.state.actionMax;
    const defense=legacyEquipmentBonus(this.scene.inventory,this.scene.character).defense;
    updateBattle(
      this.scene.state,
      1,
      enemy.x,
      enemy.y,
      defense,
      {collision:this.scene.currentMap().collision,playerBusy:false,reserved:[]},
    );
    reconcileBattlePhase(this.scene.state);
    this.render(this.scene.snapshot());
  }

  acceptanceSelectEnemy(targetId:string):void{
    if(!navigator.webdriver)throw new Error('S34 acceptance target fixture is automation-only');
    if(!this.scene.inBattleView)throw new Error('S34 acceptance target fixture requires active battle');
    const enemy=this.scene.state.enemies.find(row=>row.id===targetId&&row.hp>0);
    if(!enemy)throw new Error('Unknown live acceptance enemy '+targetId);
    this.scene.selectedEnemy=enemy.id;
    this.render(this.scene.snapshot());
  }

  acceptanceAdvanceBattleTimeMs(deltaMs:number):void{
    if(!navigator.webdriver)throw new Error('S34 acceptance time fixture is automation-only');
    if(!this.scene.inBattleView||this.scene.state.phase!=='active')throw new Error('S34 acceptance time fixture requires active battle');
    if(!Number.isFinite(deltaMs)||deltaMs<0||deltaMs>120000)throw new Error('Invalid S34 acceptance delta');
    let remaining=deltaMs;
    const defense=legacyEquipmentBonus(this.scene.inventory,this.scene.character).defense;
    // Advance the production battle/status authority while deliberately keeping
    // the acceptance-only virtual actor outside every encounter trigger radius.
    // This avoids adding synthetic enemy attacks merely because test time is accelerated.
    const quietX=this.scene.anchor.x+1_000_000,quietY=this.scene.anchor.y+1_000_000;
    while(remaining>0){
      const step=Math.min(250,remaining);
      updateBattle(this.scene.state,step,quietX,quietY,defense,{collision:this.scene.currentMap().collision,playerBusy:false,reserved:[]});
      remaining-=step;
    }
    reconcileBattlePhase(this.scene.state);
    this.render(this.scene.snapshot());
  }

  acceptanceSetPlayerVitals(hp:number,mp:number):void{
    if(!navigator.webdriver)throw new Error('S34 acceptance vitals fixture is automation-only');
    if(!this.scene.inBattleView)throw new Error('S34 acceptance vitals fixture requires active battle');
    if(!Number.isFinite(hp)||!Number.isFinite(mp)||hp<=0||mp<0)throw new Error('Invalid S34 acceptance vitals');
    this.scene.state.hp=Math.min(this.scene.state.maxHp,Math.floor(hp));
    this.scene.state.mp=Math.min(this.scene.state.maxMp,Math.floor(mp));
    this.render(this.scene.snapshot());
  }

  acceptanceGrantLevel(targetLevel:number):void{
    if(!navigator.webdriver)throw new Error('M6 acceptance reward fixture is automation-only');
    if(!Number.isInteger(targetLevel)||targetLevel<1||targetLevel>99)throw new Error('Invalid M6 acceptance target level');
    const targetExp=totalExpForLevel(targetLevel);
    const amount=Math.max(0,targetExp-this.rewards.progression.exp);
    if(amount===0)return;
    const receipt=`s29-acceptance:stage-${this.scene.character}:level-${targetLevel}`;
    const oldLevel=this.rewards.progression.level;
    const applied=applyBattleReward(this.rewards,'s29-acceptance-fixture',receipt,{gold:0,exp:amount});
    this.rewards=applied.state;
    this.reconcileM7Skills(oldLevel);
    this.scene.gold=this.rewards.gold;
    this.applyClassProfile(false);
    this.setNotice(`M6 acceptance fixture：通过生产 reward/progression authority 到达 Lv.${this.rewards.progression.level}`);
    this.render(this.scene.snapshot());
  }

  private promoteM6Stage():void{
    if(this.scene.inBattleView){this.setNotice('请先结束战斗再晋阶');return;}
    const rule=integratedPromotionRuleForCharacter(this.scene.character);
    if(!rule){this.setNotice('当前已经是本职业第十阶段');return;}
    const result=applyM6Promotion(
      m6StageTrackForCharacter(this.scene.character),
      this.m6Stage,
      rule,
      {
        level:this.rewards.progression.level,
        questFlags:this.rewards.questFlags,
        questChain:m6QuestChainForLegacyStage(this.world.quest.stage,this.rewards.questFlags),
        inventory:this.rewards.inventory,
      },
    );
    if(!result.applied){
      this.setNotice(result.duplicate?'该晋阶已经完成':`暂不能晋阶：${result.reasons.join('、')}`);
      return;
    }
    this.scene.setCharacter(String(result.state.stageId));
    this.m6Stage=result.state;
    this.applyClassProfile(true);
    this.menuOpen=false;
    this.setNotice(`晋阶完成：${playableClassById(result.state.stageId).displayName} / RECONSTRUCTION_POLICY`);
    this.render(this.scene.snapshot());
  }

  private applyDeveloperPreset(levelOverride?:number):void{
    if(!this.developerMode){this.setNotice('Developer Preset 仅在 Developer / Diagnostics 模式可用');return;}
    if(this.scene.inBattleView){this.setNotice('请先结束战斗再应用 Developer Preset');return;}
    const currentProfession=playableClassById(this.scene.character).family as M7Profession;
    const selectedProfession=this.menuRoot.querySelector<HTMLSelectElement>('[data-dev-profession]')?.value;
    const profession:M7Profession=selectedProfession==='swordsman'||selectedProfession==='wizard'?selectedProfession:currentProfession;
    const inputLevel=Number(this.menuRoot.querySelector<HTMLInputElement>('[data-dev-level-input]')?.value);
    const level=levelOverride??inputLevel;
    const unlockAll=this.menuRoot.querySelector<HTMLInputElement>('[data-dev-unlock-all]')?.checked??false;
    try{
      const preset=buildM7DeveloperCharacterPreset(profession,level,unlockAll);
      this.rewards={...this.rewards,progression:{...this.rewards.progression,level:preset.level,exp:totalExpForLevel(preset.level)}};
      this.m7Skills=createM7IntegratedSkillState(String(preset.stageId),Math.min(65,preset.level));
      this.developerPresetActive=true;
      this.developerUnlockAllSkills=preset.unlockAllImplementedSkills;
      this.developerSkillPoints=preset.skillPoints;
      this.scene.setCharacter(String(preset.stageId));
      this.m6Stage=createM6StageState(preset.stageId);
      this.equipDeveloperPreset();
      this.applyClassProfile(true);
      this.menuOpen=false;
      this.setNotice('Developer Preset：'+profession+' Lv.'+preset.level+' / Stage '+preset.stage+' / B'+preset.stageId+(preset.unlockAllImplementedSkills?' / all implemented skills Lv6 override':'')+' / RECONSTRUCTION_POLICY');
      this.render(this.scene.snapshot());
    }catch(error){this.setNotice('Developer Preset 失败：'+String(error));}
  }

  private equipDeveloperPreset():void{
    const definition=playableClassById(this.scene.character);
    const context={characterId:this.scene.character,family:definition.family,stageId:Number(this.scene.character),level:this.rewards.progression.level};
    let inventory=this.rewards.inventory;
    for(const slot of ['weapon','armor'] as const){
      const rule=M6_RUNTIME_EQUIPMENT_RULES.find(candidate=>
        candidate.slot===slot&&
        inventory.items.some(item=>item.itemId===candidate.itemId&&item.quantity>0)&&
        evaluateM6EquipmentEligibility(candidate,context).allowed
      );
      if(rule)inventory=equipProgression(inventory,this.scene.character,slot,rule.itemId,CLASS_RESOLVER);
    }
    this.rewards={...this.rewards,inventory};
    this.syncSceneInventory();
  }

  private m7Level():number{return Math.min(65,Math.max(1,this.rewards.progression.level));}

  private reconcileM7Skills(oldLevel:number):void{
    const previous=Math.min(65,Math.max(1,oldLevel));
    const next=this.m7Level();
    const family=playableClassById(this.scene.character).family;
    if(this.m7Skills.family!==family||next<previous){
      this.m7Skills=createM7IntegratedSkillState(this.scene.character,next);
      return;
    }
    if(next>previous)this.m7Skills=reconcileM7IntegratedSkillState(this.m7Skills,this.scene.character,previous,next);
  }

  private runtimeSkillCommands():readonly M7RuntimeSkillCommand[]{
    return m7RuntimeSkillCommands(
      this.m7Skills,
      this.scene.character,
      this.m7Level(),
      this.developerMode&&this.developerUnlockAllSkills,
    );
  }

  private skillAllowedForRuntime(_characterId:string|number,skillId:number):boolean{
    return this.runtimeSkillCommands().some(command=>command.authoredSkillId===skillId);
  }

  private executeSkillCommand(command:M7RuntimeSkillCommand,targetCell:M7GridCell|null=null):void{
    const result=targetCell
      ?useM7SkillTargeted(this.scene.state,{targetId:this.scene.selectedEnemy,targetCell},this.scene.anchor.x,this.scene.anchor.y,command)
      :useM7Skill(this.scene.state,this.scene.selectedEnemy,this.scene.anchor.x,this.scene.anchor.y,command);
    reconcileBattlePhase(this.scene.state);
    this.setNotice(result.message);
    if(!result.ok){this.render(this.scene.snapshot());return;}
    const visual=visualSkillForCommand(command);
    const magicResourceId=visual?.magic_pattern?.magic_resources?.[0]?.magic_resource_id;
    const explicitOrigin=targetCell?(()=>{const [x,y]=referenceCellToScreen(targetCell);return{x,y};})():undefined;
    this.scene.presentM7SkillAction(result.affectedEnemyIds,magicResourceId,command.target==='self',explicitOrigin);
    const animation=this.scene.animation();
    this.present(this.presentation.attack({rawTiming:animation.raw_timing,frameCount:animation.frames_per_direction}));
    if(visual){
      const target=this.scene.state.enemies.find(enemy=>enemy.id===this.scene.selectedEnemy&&enemy.hp>0);
      const effectTarget=explicitOrigin??(target?{x:target.x,y:target.y}:null);
      const resources=(visual.magic_pattern?.magic_resources??[]).flatMap(resource=>{
        const effect=this.scene.pack.effects[String(resource.magic_resource_id)];
        return effect?[{resourceId:resource.magic_resource_id,rawTiming:effect.raw_timing,frameCount:effect.frame_count,role:resource.role,rawStartTick:resource.start_tick}]:[];
      });
      if(resources.length)this.present(this.presentation.magicEffect({resources,context:{caster:{...this.scene.anchor},target:effectTarget}}));
    }
    this.render(this.scene.snapshot());
  }

  private useSkill(commandId:string|number):void{
    try{
      const command=this.runtimeSkillCommands().find(row=>row.id===String(commandId)||row.authoredSkillId===Number(commandId));
      if(!command)throw new Error('当前职业/阶段不能使用该技能');
      if(command.family==='wizard'&&command.skillKey==='poison-mist'){
        this.beginBattleTargeting(command);
        return;
      }
      this.clearBattleTargeting(false);
      this.executeSkillCommand(command);
    }catch(error){this.setNotice(String(error));this.render(this.scene.snapshot());}
  }

  private rest():void{
    if(!this.scene.inBattleView||!actionReady(this.scene.state)){this.setNotice('当前不能休息：请等待行动槽就绪');return;}
    if(!consumeAction(this.scene.state,this.scene.state.restReadinessCost)){this.setNotice('休息指令未执行');return;}
    this.setNotice('休息：已按恢复出的 REST readiness cost 消耗行动槽；额外效果尚无原版证据。');
  }

  private trainingRecovery(kind:'hp'|'mp'):void{
    if(!this.scene.canAct()){this.setNotice('当前不能恢复：请等待行动槽就绪并结束当前动作');return;}
    const result=applyInfiniteTrainingRecovery(this.scene.state,kind);
    if(!result.ok){
      const label=kind==='hp'?'HP':'MP';
      this.setNotice(result.reason==='already-full'?label+' 已满，未消耗 readiness':'当前不能执行 '+label+' Recovery');
      this.render(this.scene.snapshot());
      return;
    }
    this.setNotice((kind==='hp'?'HP':'MP')+' Recovery +'+result.restored+'；readiness -'+result.readinessSpent+' / '+result.provenance);
    this.render(this.scene.snapshot());
  }

  private startTrainingBattle(id:number):void{
    if(this.scene.inBattleView){this.setNotice('当前已在战斗中');return;}
    if(this.scene.route.length){this.setNotice('请等待移动结束后再开始训练战');return;}
    try{
      const preset=trainingBattleById(id);
      this.selectedTrainingBattleId=preset.id;
      this.activeDialogue=null;
      this.pendingEncounter=null;
      this.menuOpen=false;
      this.trainingLaunchPending=true;
      this.scene.enterBattle();
      if(!this.scene.inBattleView){
        this.trainingLaunchPending=false;
        this.activeTrainingBattleId=null;
        this.setNotice('Training Battle #'+preset.id+' 未能启动');
        this.render(this.scene.snapshot());
        return;
      }
      const integrated=integratedTrainingBattleById(preset.id);
      const actualZone=this.scene.state.battleZoneId;
      const sceneNote=actualZone===preset.battleZoneId?'场景绑定已匹配':(!this.scene.pack.maps[String(preset.battleZoneId)]?'synthetic 缺 Zone '+preset.battleZoneId+'，已显式 fallback 至 '+String(actualZone):'场景绑定失败：expected '+preset.battleZoneId+', got '+String(actualZone));
      const levels=integrated.enemies.map(enemy=>enemy.fixedLevel).join('/');
      this.setNotice('Training Battle #'+preset.id+'：Fixed Enemy Lv.'+levels+' / '+sceneNote);
      this.render(this.scene.snapshot());
    }catch(error){this.trainingLaunchPending=false;this.setNotice(String(error));}
  }

  private requestBattleExit():void{
    if(!this.scene.inBattleView||this.scene.state.phase!=='active'){this.setNotice('当前没有可退出的进行中战斗');return;}
    this.menuOpen=false;
    this.battleExitConfirm=true;
    this.scene.battlePaused=true;
    this.render(this.scene.snapshot());
  }

  private cancelBattleExit():void{
    if(!this.battleExitConfirm)return;
    this.battleExitConfirm=false;
    if(this.scene.inBattleView&&this.scene.state.phase==='active')this.scene.battlePaused=false;
    this.render(this.scene.snapshot());
  }

  private confirmBattleExit():void{
    if(!this.battleExitConfirm)return;
    if(!this.scene.inBattleView||this.scene.state.phase!=='active'){
      this.battleExitConfirm=false;
      this.render(this.scene.snapshot());
      return;
    }
    this.battleExitConfirm=false;
    this.retreatFromBattle();
  }

  private retreatFromBattle():void{
    this.clearBattleTargeting(false);
    this.scene.leaveBattle();
    this.scene.gold=this.rewards.gold;
    this.world={...this.world,world:this.currentWorldState()};
    this.pendingEncounter=null;
    this.activeTrainingBattleId=null;
    this.trainingLaunchPending=false;
    this.lastSnapshot=null;
    this.suppressEncounterUntilLeave=true;
    if(this.spatial){
      const actor=this.currentWorldState();
      this.spatial.start({mapId:actor.mapId,cell:[actor.x,actor.y]});
    }
    this.setNotice('已退出战斗：未结算奖励，任务目标保持未完成。离开怪物触发范围后可再次进入战斗。');
    this.render(this.scene.snapshot());
  }

  private beginNpcInteraction(entityId:string|undefined,inputSource:NpcInteractionInputSource):void{
    if(this.scene.inBattleView)return;
    const actor=this.currentWorldState();
    this.world={...this.world,world:actor};
    const entities=this.m5World
      ?[this.m5World.trainingManager.entity,this.m5World.content.guide.entity]
      :WORLD_ENTITIES.filter(entity=>entity.kind==='npc');
    const entity=entityId?entities.find(candidate=>candidate.id===entityId):entities.find(candidate=>canInteract(candidate,actor));
    if(!entity){
      if(!this.m5World&&!entityId){
        const objective=WORLD_ENTITIES.find(candidate=>candidate.kind!=='npc'&&canInteract(candidate,actor));
        if(objective){this.interactWorld(objective.id);return;}
      }
      this.activeDialogue=null;
      this.trainingManagerOpen=false;
      this.setNotice(entityId?'当前 NPC 不能交互':'附近没有可交互 NPC');
      this.render(this.scene.snapshot());
      return;
    }
    if(this.m5World&&entity.id===this.m5World.trainingManager.entity.id){
      const manager=resolveM7TrainingManagerInteraction(this.m5World.trainingManager,actor,{
        entityId:entity.id,mapId:actor.mapId,actorX:actor.x,actorY:actor.y,inputSource,provenance:'RECONSTRUCTION_POLICY',
      });
      this.activeDialogue=null;
      if(!manager.accepted){
        this.trainingManagerOpen=false;
        this.setNotice(manager.message);
        this.render(this.scene.snapshot());
        return;
      }
      this.trainingManagerOpen=true;
      this.menuOpen=false;
      this.setNotice('训练管理员：请选择训练关卡。');
      this.render(this.scene.snapshot());
      return;
    }
    this.trainingManagerOpen=false;
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
      if(!this.m5World&&this.worldAuthority.content.warpOnAccept){
        this.applyWorldState({...this.worldAuthority.content.objectiveEntry});
        this.setNotice('已接受训练委托：已前往外城训练点 / RECONSTRUCTION_POLICY');
      }else this.setNotice('已接受训练委托 / RECONSTRUCTION_POLICY');
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
    const entities=this.m5World?[this.m5World.trainingManager.entity,this.m5World.content.guide.entity,this.m5World.content.objective]:WORLD_ENTITIES;
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
    this.battleExitConfirm=false;
    if(phase==='lost')this.suppressEncounterUntilLeave=true;
    let returnState:WorldState|null=null;
    if(this.pendingEncounter){
      const outcome=phase==='won'?'won':'lost';
      const resolution=this.worldAuthority.resolveBattle(this.world,{battleZoneId:this.scene.state.battleZoneId??-1,outcome});
      this.world=resolution.state;
      returnState=resolution.returnTo??null;
      if(phase==='won')this.applyBattleSettlement();
    }else if(phase==='won'&&this.activeTrainingBattleId!==null){
      this.applyBattleSettlement();
    }
    this.clearBattleTargeting(false);
    this.scene.leaveBattle();
    this.scene.gold=this.rewards.gold;
    if(returnState)this.applyWorldState(returnState);else this.world={...this.world,world:this.currentWorldState()};
    this.pendingEncounter=null;
    this.activeTrainingBattleId=null;
    this.trainingLaunchPending=false;
    this.lastSnapshot=null;
    this.render(this.scene.snapshot());
  }

  private applyBattleSettlement():void{
    if(this.activeTrainingBattleId!==null){
      const preset=trainingBattleById(this.activeTrainingBattleId);
      const enemies=reconstructionEnemiesForTrainingBattle(preset.id);
      const reward=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.rewardForEncounter(
        enemies.map(enemy=>({level:enemy.level,rank:enemy.rank})),
      );
      const oldLevel=this.rewards.progression.level;
      const applied=applyBattleReward(this.rewards,'m7-training-battle-'+preset.id,'battle:m7-training:'+preset.id+':win',{gold:reward.gold,exp:reward.exp});
      this.rewards=applied.state;this.reconcileM7Skills(oldLevel);this.scene.gold=this.rewards.gold;
      this.setNotice('Training Battle #'+preset.id+' 胜利：Fixed Enemy Lv.'+enemies.map(enemy=>enemy.level).join('/')+' / 金币 +'+reward.gold+' / EXP +'+reward.exp+' / RECONSTRUCTION_POLICY');
      return;
    }
    if(this.m5World){
      const level=Math.max(1,this.rewards.progression.level);
      const reward=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.rewardForEncounter([{level,rank:'normal'},{level,rank:'normal'}]);
      const oldLevel=this.rewards.progression.level;
      const applied=applyBattleReward(this.rewards,'m5-training-house','battle:m5-training-house:win',{gold:reward.gold,exp:reward.exp});
      this.rewards=applied.state;this.reconcileM7Skills(oldLevel);this.scene.gold=this.rewards.gold;
      this.setNotice(`战斗胜利：金币 +${reward.gold}，EXP +${reward.exp}，当前 Lv.${this.rewards.progression.level} / RECONSTRUCTION_POLICY`);
      return;
    }
    const oldLevel=this.rewards.progression.level;
    const applied=applyBattleReward(this.rewards,'s9-training-battle','battle:s9-training-run:win',{gold:10,exp:100});
    this.rewards=applied.state;
    this.reconcileM7Skills(oldLevel);
    this.scene.gold=this.rewards.gold;
    if(applied.events.some(event=>event.type==='level_up'))this.setNotice(`战斗胜利：金币 +10，EXP +100，当前 Lv.${this.rewards.progression.level}`);
  }

  private applyQuestSettlement():void{
    const questId=this.worldAuthority.content.questId;
    const reward=this.m5World?{gold:7,exp:230,questFlags:['m5.training.complete']}:{gold:5,exp:200,questFlags:['m4.training.complete']};
    const oldLevel=this.rewards.progression.level;
    const applied=applyQuestReward(this.rewards,questId,`quest:${questId}:turn-in`,reward);
    this.rewards=applied.state;
    this.reconcileM7Skills(oldLevel);
    this.scene.gold=this.rewards.gold;
    this.setNotice(`任务完成：金币 +${reward.gold}，EXP +${reward.exp}，当前 Lv.${this.rewards.progression.level} / RECONSTRUCTION_POLICY`);
  }

  private combatEquipment(){
    const bonus=legacyEquipmentBonus(this.scene.inventory,this.scene.character);
    return playableClassById(this.scene.character).family==='wizard'?{defense:bonus.defense,magicAttack:bonus.attack}:{attack:bonus.attack,defense:bonus.defense};
  }

  private playerCombatStats(){
    return DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.playerStats(this.scene.character,Math.max(1,this.rewards.progression.level),this.combatEquipment());
  }

  private prepareReconstructionBattle(trainingBattleId:number|null=null):void{
    const level=Math.max(1,this.rewards.progression.level);
    if(trainingBattleId!==null){
      const preset=trainingBattleById(trainingBattleId);
      this.scene.setReconstructionBattleSetup({
        ...reconstructionSetupForTrainingBattle(preset,this.scene.character,level,this.combatEquipment()),
        enemies:reconstructionEnemiesForTrainingBattle(trainingBattleId),
      });
      return;
    }
    if(!this.m5World){this.scene.setReconstructionBattleSetup(undefined);return;}
    this.scene.setReconstructionBattleSetup({
      playerClassId:this.scene.character,level,equipment:this.combatEquipment(),
      enemyLevel:level,enemyRank:'normal'
    });
  }

  private applyClassProfile(resetVitals:boolean):void{
    if(!M6_CHARACTER_IDS.includes(this.scene.character))return;
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
    return{pack:this.scene.pack.digest,characters:M6_CHARACTER_IDS,mapBounds};
  }

  makeSave():M7SaveV2{
    if(this.scene.inBattleView)throw new Error('战斗中不能存档');
    if(this.scene.route.length)throw new Error('请等待移动结束后再存档');
    if(this.developerPresetActive||this.developerUnlockAllSkills)throw new Error('Developer Preset / Debug Skill Override 不写入普通 SaveV2；请新建职业档或重新读取普通存档后再保存');
    const m6=createM6SaveExtension(this.scene.character,{
      stage:this.m6Stage,
      questChain:m6QuestChainForLegacyStage(this.world.quest.stage,this.rewards.questFlags),
      equipment:{weapon:this.rewards.inventory.equipped.weapon,armor:this.rewards.inventory.equipped.armor,accessory:null},
    });
    return{
      kind:SAVE_KIND,version:CURRENT_SAVE_VERSION,pack:this.scene.pack.digest,character:this.scene.character,mapId:this.scene.mapId,
      x:this.scene.anchor.x,y:this.scene.anchor.y,gold:this.rewards.gold,inventory:this.rewards.inventory,
      quest:{questId:this.world.quest.questId,stage:this.world.quest.stage} as JsonValue,
      questFlags:{...this.rewards.questFlags},progression:{...this.rewards.progression},rewardReceipts:[...this.rewards.rewardReceipts],m6,
      m7:createM7SaveExtension(this.scene.character,this.m7Level(),this.m7Skills,{hp:this.scene.state.hp,mp:this.scene.state.mp}),savedAt:new Date().toISOString(),
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

  exportJson():string{return serializeM7SaveV2(this.makeSave(),this.saveContext(),M6_SAVE_CONTENT);}

  restore(raw:unknown):void{
    if(this.scene.inBattleView)throw new Error('请先结束战斗再读档');
    this.activeDialogue=null;
    this.activeTrainingBattleId=null;
    this.trainingLaunchPending=false;
    this.developerPresetActive=false;
    this.developerUnlockAllSkills=false;
    this.developerSkillPoints=0;
    const save=migrateSaveToM7(raw,this.saveContext(),M6_SAVE_CONTENT);
    const quest=parseM4Quest(save.quest,this.worldAuthority.content.questId);
    this.rewards={gold:save.gold,inventory:save.inventory,progression:save.progression,questFlags:save.questFlags,rewardReceipts:save.rewardReceipts};
    this.world={world:{mapId:save.mapId,...(()=>{const cell=nearestAnchor(save.x,save.y);return{x:cell[0],y:cell[1]};})()},quest};
    this.scene.setCharacter(save.character);
    this.m6Stage=save.m6.stage;
    this.m7Skills=save.m7.skills;
    this.scene.setMap(save.mapId);
    this.scene.anchor={x:save.x,y:save.y};
    this.scene.route=[];
    this.applyClassProfile(false);
    if(save.m7.vitals){
      this.scene.state.hp=Math.min(this.scene.state.maxHp,save.m7.vitals.hp);
      this.scene.state.mp=Math.min(this.scene.state.maxMp,save.m7.vitals.mp);
    }
    this.syncSceneInventory();
    if(this.m5World){this.scene.setPlayerCameraFollow(true);this.scene.focusPlayer();const cell=nearestAnchor(save.x,save.y);this.spatial?.start({mapId:save.mapId,cell});}
    else this.scene.fit();
    this.setNotice(`存档恢复成功 / schema v${CURRENT_SAVE_VERSION}`);
    this.render(this.scene.snapshot());
  }

  private onSnapshot(snapshot:Snapshot):void{
    if(!snapshot.inBattleView&&this.battleTargetingState.phase==='aiming')this.clearBattleTargeting(false);
    if(!snapshot.inBattleView&&this.battleRangeOverlayVisible)this.publishBattleRangeOverlay(false,false);
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
    const nearObjective=actor.mapId===this.m5World.content.objectiveMapId&&canInteract(this.m5World.content.objective,actor);
    if(this.suppressEncounterUntilLeave){
      if(!nearObjective)this.suppressEncounterUntilLeave=false;
      else return false;
    }
    if(this.world.quest.stage==='objective'&&nearObjective&&!this.pendingEncounter&&!this.scene.route.length){
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
    const entities=this.m5World?[this.m5World.trainingManager.entity,this.m5World.content.guide.entity,this.m5World.content.objective]:WORLD_ENTITIES;
    const entity=entities.find(candidate=>canInteract(candidate,actor));
    if(!entity)return undefined;
    if(entity.kind==='npc')return `与${entity.displayName}交谈`;
    return `调查${entity.displayName}`;
  }

  private render(snapshot:Snapshot):void{
    if(!M6_CHARACTER_IDS.includes(snapshot.character))return;
    const definition=playableClassById(snapshot.character);
    const fieldStats=this.m5World?this.playerCombatStats():null;
    const player:PlayerHudState={
      name:'佣兵',className:definition.displayName,portraitLabel:definition.family==='swordsman'?'剑':'巫',level:this.rewards.progression.level,
      hp:snapshot.inBattleView?snapshot.hp:fieldStats?.maxHp??definition.baseAuthoredStats.hp,hpMax:snapshot.inBattleView?this.scene.state.maxHp:fieldStats?.maxHp??definition.baseAuthoredStats.hp,
      mp:snapshot.inBattleView?snapshot.mp:fieldStats?.maxMp??definition.baseAuthoredStats.mp,mpMax:snapshot.inBattleView?this.scene.state.maxMp:fieldStats?.maxMp??definition.baseAuthoredStats.mp,gold:this.rewards.gold,
    };
    const quest=questHud(this.world.quest.stage);
    const field:FieldHudState={mapId:snapshot.mapId,mapName:snapshot.mapName,...quest,interactionPrompt:this.nearestInteraction(snapshot)};
    let hudHtml:string;
    if(snapshot.inBattleView){
      const target=snapshot.enemies.find(enemy=>enemy.id===snapshot.target&&enemy.hp>0);
      const battle:BattleHudState={
        phase:snapshot.phase,readiness:snapshot.action,readinessMax:snapshot.actionMax,ready:snapshot.actionReady,busy:snapshot.busy,paused:snapshot.battlePaused,
        targetName:target?.id,targetHp:target?.hp,targetHpMax:target?this.scene.state.enemies.find(enemy=>enemy.id===target.id)?.maxHp:undefined,
        statusText:snapshot.phase==='active'?(snapshot.actionReady?'可以行动':'等待行动槽'):snapshot.phase==='won'?'战斗已胜利':'战斗已结束',
        canAttack:snapshot.phase==='active',canRest:snapshot.phase==='active',canReturn:snapshot.phase==='won'||snapshot.phase==='lost',
        skills:this.runtimeSkillCommands().map((command,index)=>({id:command.authoredSkillId??command.id,name:`${command.displayName} Lv.${command.skillLevel}`,mpCost:command.mpCost,hotkey:battleSkillHotkeyLabel(index),disabled:snapshot.mp<command.mpCost})),
      };
      hudHtml=renderBattleHud(player,battle);
    }else hudHtml=renderFieldHud(player,field);
    if(hudHtml!==this.hudHtml){
      const commandScrollLeft=this.hudRoot.querySelector<HTMLElement>('.command-deck')?.scrollLeft??0;
      const skillScrollLeft=this.hudRoot.querySelector<HTMLElement>('.skill-deck')?.scrollLeft??0;
      const utilityScrollLeft=this.hudRoot.querySelector<HTMLElement>('.battle-utility-deck')?.scrollLeft??0;
      this.hudRoot.innerHTML=hudHtml;
      const commandDeck=this.hudRoot.querySelector<HTMLElement>('.command-deck');
      const skillDeck=this.hudRoot.querySelector<HTMLElement>('.skill-deck');
      const utilityDeck=this.hudRoot.querySelector<HTMLElement>('.battle-utility-deck');
      if(commandDeck)commandDeck.scrollLeft=commandScrollLeft;
      if(skillDeck)skillDeck.scrollLeft=skillScrollLeft;
      if(utilityDeck)utilityDeck.scrollLeft=utilityScrollLeft;
      this.hudHtml=hudHtml;
    }

    const menuHtml=renderGameMenu({
      open:this.menuOpen,
      canSave:!snapshot.inBattleView&&!this.developerPresetActive&&!this.developerUnlockAllSkills,
      canLoad:!snapshot.inBattleView,
      devEnabled:this.developerMode,
    });
    const menuSignature=menuHtml+'|m7:'+this.selectedTrainingBattleId+':'+this.rewards.progression.level+':'+this.developerMode+':'+this.developerUnlockAllSkills+':'+snapshot.character;
    if(menuSignature!==this.menuHtml){
      this.menuRoot.innerHTML=menuHtml;
      const grid=this.menuRoot.querySelector('.menu-grid');
      if(grid){
        const promotion=integratedPromotionRuleForCharacter(snapshot.character);
        const promotionLabel=promotion?`晋阶至 ${playableClassById(promotion.toStageId).displayName}（Lv.${promotion.minimumLevel}）`:'已达第十阶段';
        const disabled=promotion&&this.rewards.progression.level>=(promotion.minimumLevel??1)?'':' disabled';
        grid.insertAdjacentHTML('beforeend',`<button type="button" data-action="m6-promote"${promotion?disabled:' disabled'}>${promotionLabel}</button><button type="button" data-action="class-swordsman">新建剑士档</button><button type="button" data-action="class-wizard">新建巫师档</button>`);
      }
      const panel=this.menuRoot.querySelector<HTMLElement>('.menu-panel');
      if(panel&&!snapshot.inBattleView){
        panel.classList.add('m7-menu-panel');
        panel.insertAdjacentHTML('beforeend',renderM7TrainingCamp(this.rewards.progression.level,this.selectedTrainingBattleId));
        if(this.developerMode)panel.insertAdjacentHTML('beforeend',renderM7DeveloperPreset(definition.family as M7Profession,this.rewards.progression.level,this.developerUnlockAllSkills));
      }
      this.menuHtml=menuSignature;
    }
    const diagnostics:DiagnosticsState={
      open:this.developerMode,mapSelector:String(snapshot.mapId).padStart(4,'0'),rawTiming:`${snapshot.timing} → ${snapshot.duration.toFixed(2)}ms`,
      actionSlot:snapshot.slot,direction:String(snapshot.direction),bounds:snapshot.debugBounds?'visible':'hidden',magicRes:snapshot.effect?`#${snapshot.effect.id} ${snapshot.effect.cursor+1}/${snapshot.effect.length}`:'idle',
      provenance:`battle=${snapshot.battleEntryProvenance}; damage=${snapshot.damagePolicy.provenance}; quest=${this.worldAuthority.provenance}; progression=RECONSTRUCTION_POLICY${this.lastAudio?`; audio=${this.lastAudio}`:''}`,
    };
    const debugHtml=this.developerMode?renderDebugPanel(diagnostics):'';
    if(debugHtml!==this.debugHtml){
      this.debugRoot.innerHTML=debugHtml;
      this.debugHtml=debugHtml;
    }
    const dialogueHtml=this.renderDialogue();
    if(dialogueHtml!==this.dialogueHtml){
      this.dialogueRoot.innerHTML=dialogueHtml;
      this.dialogueHtml=dialogueHtml;
    }
    document.body.classList.toggle('m4-dev-enabled',this.developerMode);
    document.body.classList.toggle('m4-inventory-open',this.inventoryOpen);
    const status=document.getElementById('m4-runtime-notice');
    if(status)status.textContent=this.noticeText;
  }

  private renderDialogue():string{
    if(this.battleExitConfirm&&this.scene.inBattleView&&this.scene.state.phase==='active'){
      return `<section class="npc-dialogue battle-exit-dialogue" data-ui="battle-exit-confirm" aria-label="退出战斗确认">
        <div class="npc-dialogue-portrait" aria-hidden="true"><b>撤</b><span>RETREAT</span><small>战斗不会结算奖励</small></div>
        <div class="npc-dialogue-body">
          <div class="npc-dialogue-speaker">确认退出战斗？</div>
          <div class="npc-dialogue-copy"><p>退出后返回进入战斗前的场景，本次战斗不计胜利，也不会获得奖励。</p></div>
          <div class="npc-dialogue-actions"><button type="button" data-action="battle-exit-cancel">取消</button><button type="button" data-action="battle-exit-confirm">确认退出</button></div>
          <small class="npc-dialogue-provenance">RECONSTRUCTION_POLICY</small>
        </div>
      </section>`;
    }
    const session=this.activeDialogue;
    if(!session)return '';
    const view=session.view;
    const lines=view.lines.map(line=>`<p>${escapeHtml(line)}</p>`).join('');
    const choices=view.choices.map(choice=>`<button type="button" data-dialogue-choice="${choice.id}">${escapeHtml(choice.label)}</button>`).join('');
    return `<section class="npc-dialogue" data-ui="npc-dialogue" data-input-source="${session.inputSource}" aria-label="NPC 对话">
      <div class="npc-dialogue-portrait" aria-label="NPC 头像占位"><b>NPC</b><span>PORTRAIT</span><small>头像绑定未恢复</small></div>
      <div class="npc-dialogue-body">
        <div class="npc-dialogue-speaker">${escapeHtml(view.speaker)}</div>
        <div class="npc-dialogue-copy">${lines}</div>
        <div class="npc-dialogue-actions">${choices}</div>
        <small class="npc-dialogue-provenance">RECONSTRUCTION_POLICY</small>
      </div>
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