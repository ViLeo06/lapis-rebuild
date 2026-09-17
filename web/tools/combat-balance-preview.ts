import {DEFAULT_RECONSTRUCTION_COMBAT_BALANCE as balance} from '../src/combat/reconstruction-combat-balance.ts';
import {simulateCombatBatch} from '../src/combat/combat-balance-simulator.ts';

const scenarios=[
  {label:'swordsman-1v1',scenario:{playerClassId:100 as const,enemyCount:1}},
  {label:'swordsman-2v1',scenario:{playerClassId:100 as const,enemyCount:2}},
  {label:'swordsman-2v1-geared',scenario:{playerClassId:100 as const,enemyCount:2,playerEquipment:{attack:7,defense:2}}},
  {label:'wizard-1v1',scenario:{playerClassId:109 as const,enemyCount:1}},
  {label:'wizard-2v1',scenario:{playerClassId:109 as const,enemyCount:2}},
  {label:'wizard-2v1-geared',scenario:{playerClassId:109 as const,enemyCount:2,playerEquipment:{magicAttack:7,defense:2}}},
];

const rows=scenarios.map(({label,scenario},index)=>{
  const result=simulateCombatBatch(scenario,1000,10000+index*2000);
  return{
    scenario:label,
    winRate:Number(result.winRate.toFixed(3)),
    deathRate:Number(result.deathRate.toFixed(3)),
    meanSeconds:Number(result.meanDurationSeconds.toFixed(2)),
    p90Seconds:Number(result.p90DurationSeconds.toFixed(2)),
    meanHpOnWin:Number(result.meanRemainingHpOnWin.toFixed(1)),
    meanMpSpent:Number(result.meanMpSpent.toFixed(1)),
    meanPlayerActions:Number(result.meanPlayerActions.toFixed(1)),
    meanEnemyActions:Number(result.meanEnemyActions.toFixed(1)),
  };
});

const rewardRows=[1,3,5,10].map(level=>({
  level,
  normal:balance.rewardForEnemy({level,rank:'normal'}),
  elite:balance.rewardForEnemy({level,rank:'elite'}),
  boss:balance.rewardForEnemy({level,rank:'boss'}),
}));

if(process.argv.includes('--json')){
  console.log(JSON.stringify({policyId:balance.id,provenance:balance.provenance,scenarios:rows,rewards:rewardRows},null,2));
}else{
  console.log(`# ${balance.id}`);
  console.log('');
  console.log('All values below are RECONSTRUCTION_POLICY, not recovered retail server formulas.');
  console.log('');
  console.table(rows);
  console.table(rewardRows.map(row=>({
    level:row.level,
    normal:`${row.normal.gold}g/${row.normal.exp}xp`,
    elite:`${row.elite.gold}g/${row.elite.exp}xp`,
    boss:`${row.boss.gold}g/${row.boss.exp}xp`,
  })));
}
