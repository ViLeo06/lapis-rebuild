export type S34EvidenceLevel=
  |'VERIFIED'
  |'VERIFIED-STATIC-ORIGINAL'
  |'VERIFIED-HISTORICAL'
  |'RECOVERED_SECONDARY'
  |'INFERRED'
  |'SERVER-BOUNDARY'
  |'RECONSTRUCTION_POLICY'
  |'UNVERIFIED';

export const S34_FIVE_FIX_INPUT=Object.freeze({
  basicAttack:'A',
  hpRecovery:'S',
  mpRecovery:'D',
  rest:'F',
  skillAlpha:Object.freeze(['Q','W','E','R'] as const),
  skillNumeric:Object.freeze(['1','2','3','4','5','6'] as const),
  cancel:'Escape',
  rangeOverlay:'Space',
  provenance:'RECONSTRUCTION_POLICY' as const,
});

export const S34_POISON_GEOMETRY=Object.freeze([
  Object.freeze({level:1,castDistanceCells:4,areaCells:5}),
  Object.freeze({level:2,castDistanceCells:4,areaCells:5}),
  Object.freeze({level:3,castDistanceCells:5,areaCells:13}),
  Object.freeze({level:4,castDistanceCells:5,areaCells:13}),
  Object.freeze({level:5,castDistanceCells:6,areaCells:13}),
  Object.freeze({level:6,castDistanceCells:6,areaCells:25}),
] as const);

export const S34_FIVE_FIX_EXPECTATIONS=Object.freeze({
  encounter:Object.freeze({
    allLivingEnemiesVisible:true,
    maximumInteractiveClusterSize:5,
    onlyNearbyActiveGroupActs:true,
    walkingCanActivateLaterGroup:true,
    laterGroupsRemainVisible:true,
  }),
  camera:Object.freeze({
    battlefieldMayExceedViewport:true,
    fitAllShrinkForbidden:true,
    desktopEdgePan:true,
    mobileFollowOrPan:true,
    worldClamp:true,
    delayedSmoothTracking:true,
  }),
  minimap:Object.freeze({
    playerMarker:true,
    allLivingEnemyMarkers:true,
    viewportRect:true,
    cameraOnlyNavigation:true,
  }),
  battleExit:Object.freeze({
    explicitRequest:true,
    confirmation:true,
    returnToScene:true,
    escapeTargetingCancelMustNotExit:true,
  }),
});

export const S34_FIVE_FIX_PROVENANCE=Object.freeze({
  poisonRawDistArea:'VERIFIED-STATIC-ORIGINAL' as const,
  originalSmallMapResource:'VERIFIED' as const,
  originalSmallMapRoleAndAnchor:'VERIFIED-HISTORICAL' as const,
  originalBattleMapAndGrid:'VERIFIED-STATIC-ORIGINAL' as const,
  originalMouseBattleCommandSemantics:'VERIFIED-HISTORICAL' as const,
  historicalHotkeys:'VERIFIED-HISTORICAL' as const,
  historicalLargePoisonRange:'VERIFIED-HISTORICAL' as const,
  modernCombatMapping:'RECONSTRUCTION_POLICY' as const,
  mobileDoubleTapTargeting:'RECONSTRUCTION_POLICY' as const,
  minimapClickToCamera:'RECONSTRUCTION_POLICY' as const,
  mobileCameraBehavior:'RECONSTRUCTION_POLICY' as const,
});

export type S34FiveFixObserved=Readonly<{
  input:Readonly<{
    basicAttack:string;
    hpRecovery:string;
    mpRecovery:string;
    rest:string;
    skillAlpha:readonly string[];
    skillNumeric:readonly string[];
    cancel:string;
    rangeOverlay:string;
  }>;
  poison:readonly Readonly<{
    level:number;
    castDistanceCells:number;
    areaCells:number;
    emptyCenterAllowed:boolean;
    multipleTargetsAllowed:boolean;
  }>[];
  encounter:Readonly<{
    livingEnemyCount:number;
    visibleLivingEnemyCount:number;
    largestInteractiveClusterSize:number;
    onlyNearbyActiveGroupActs:boolean;
    laterGroupActivatesAfterWalking:boolean;
    laterGroupStayedVisible:boolean;
  }>;
  camera:Readonly<{
    worldWidth:number;
    worldHeight:number;
    viewportWidth:number;
    viewportHeight:number;
    fitAllShrinkUsed:boolean;
    desktopEdgePan:boolean;
    mobileFollowOrPan:boolean;
    clampedToWorld:boolean;
    delayedSmoothTracking:boolean;
  }>;
  minimap:Readonly<{
    playerMarker:boolean;
    livingEnemyMarkerCount:number;
    viewportRect:boolean;
    navigationChangedCamera:boolean;
    navigationChangedPlayerPosition:boolean;
  }>;
  battleExit:Readonly<{
    requestAvailable:boolean;
    confirmationShown:boolean;
    returnedToScene:boolean;
    escapeCancelledTargetingWithoutExit:boolean;
  }>;
}>;

export type S34FiveFixAcceptanceResult=Readonly<{ok:boolean;errors:readonly string[]}>;

function sameSequence(actual:readonly string[],expected:readonly string[]):boolean{
  return actual.length===expected.length&&actual.every((value,index)=>value===expected[index]);
}

export function validateS34FiveFixObserved(input:S34FiveFixObserved):S34FiveFixAcceptanceResult{
  const errors:string[]=[];
  const keys=S34_FIVE_FIX_INPUT;
  if(input.input.basicAttack!==keys.basicAttack)errors.push('input-basic-attack: expected A');
  if(input.input.hpRecovery!==keys.hpRecovery)errors.push('input-hp-recovery: expected S');
  if(input.input.mpRecovery!==keys.mpRecovery)errors.push('input-mp-recovery: expected D');
  if(input.input.rest!==keys.rest)errors.push('input-rest: expected F');
  if(!sameSequence(input.input.skillAlpha,keys.skillAlpha))errors.push('input-skill-alpha: expected Q/W/E/R');
  if(!sameSequence(input.input.skillNumeric,keys.skillNumeric))errors.push('input-skill-numeric: expected 1/2/3/4/5/6');
  if(input.input.cancel!==keys.cancel)errors.push('input-cancel: expected Escape');
  if(input.input.rangeOverlay!==keys.rangeOverlay)errors.push('input-range-overlay: expected Space');

  if(input.poison.length!==S34_POISON_GEOMETRY.length)errors.push('poison-level-count: expected 6, got '+input.poison.length);
  for(const expected of S34_POISON_GEOMETRY){
    const actual=input.poison.find(row=>row.level===expected.level);
    if(!actual){errors.push('poison-level: missing Lv'+expected.level);continue;}
    if(actual.castDistanceCells!==expected.castDistanceCells)errors.push('poison-distance: Lv'+expected.level+' expected '+expected.castDistanceCells);
    if(actual.areaCells!==expected.areaCells)errors.push('poison-area: Lv'+expected.level+' expected '+expected.areaCells);
    if(!actual.emptyCenterAllowed)errors.push('poison-empty-center: Lv'+expected.level);
    if(!actual.multipleTargetsAllowed)errors.push('poison-multi-target: Lv'+expected.level);
  }

  if(input.encounter.livingEnemyCount<1)errors.push('encounter-living: expected at least one living enemy');
  if(input.encounter.visibleLivingEnemyCount!==input.encounter.livingEnemyCount)errors.push('encounter-visibility: all living enemies must stay visible');
  if(input.encounter.largestInteractiveClusterSize>S34_FIVE_FIX_EXPECTATIONS.encounter.maximumInteractiveClusterSize)errors.push('encounter-cluster-size: maximum interactive cluster must be <=5');
  if(!input.encounter.onlyNearbyActiveGroupActs)errors.push('encounter-active-group: only nearby group may act');
  if(!input.encounter.laterGroupActivatesAfterWalking)errors.push('encounter-activation: walking must activate a later group');
  if(!input.encounter.laterGroupStayedVisible)errors.push('encounter-later-visible: later group disappeared');

  const battlefieldIsLarger=input.camera.worldWidth>input.camera.viewportWidth||input.camera.worldHeight>input.camera.viewportHeight;
  if(!battlefieldIsLarger)errors.push('camera-world-size: acceptance fixture must exercise a battlefield larger than viewport');
  if(input.camera.fitAllShrinkUsed)errors.push('camera-fit-all: fit-all shrink is forbidden');
  if(!input.camera.desktopEdgePan)errors.push('camera-desktop-edge-pan: missing');
  if(!input.camera.mobileFollowOrPan)errors.push('camera-mobile-follow-pan: missing');
  if(!input.camera.clampedToWorld)errors.push('camera-world-clamp: missing');
  if(!input.camera.delayedSmoothTracking)errors.push('camera-smooth-tracking: missing');

  if(!input.minimap.playerMarker)errors.push('minimap-player-marker: missing');
  if(input.minimap.livingEnemyMarkerCount!==input.encounter.livingEnemyCount)errors.push('minimap-enemy-markers: expected one marker per living enemy');
  if(!input.minimap.viewportRect)errors.push('minimap-viewport: missing');
  if(!input.minimap.navigationChangedCamera)errors.push('minimap-navigation: camera did not change');
  if(input.minimap.navigationChangedPlayerPosition)errors.push('minimap-navigation: player position changed');

  if(!input.battleExit.requestAvailable)errors.push('battle-exit-request: missing');
  if(!input.battleExit.confirmationShown)errors.push('battle-exit-confirmation: missing');
  if(!input.battleExit.returnedToScene)errors.push('battle-exit-return: missing');
  if(!input.battleExit.escapeCancelledTargetingWithoutExit)errors.push('battle-exit-escape-regression: targeting cancel exited battle');

  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}
