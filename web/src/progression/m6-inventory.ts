import {grantItem,validateInventory} from './inventory.ts';
import type {AcquisitionSource,InventoryState} from './inventory.ts';

export type M6InventoryPolicy={
  id:string;
  maxItemTypes:number;
  maxTotalQuantity:number;
  provenance:'RECONSTRUCTION_POLICY';
  note:string;
};

export const M6_TECHNICAL_INVENTORY_POLICY:M6InventoryPolicy=Object.freeze({
  id:'m6-technical-inventory-guardrails-v1',
  maxItemTypes:256,
  maxTotalQuantity:256*9999,
  provenance:'RECONSTRUCTION_POLICY',
  note:'Technical offline guardrails only. Retail bag capacity has not been recovered from the current client evidence.',
});

export type M6InventoryLoad={itemTypes:number;totalQuantity:number};

const positiveInteger=(value:number)=>Number.isInteger(value)&&value>0;

export function validateM6InventoryPolicy(policy:M6InventoryPolicy):M6InventoryPolicy{
  if(!policy||typeof policy!=='object'||!policy.id||policy.id.length>128)throw new Error('Invalid M6 inventory policy');
  if(!positiveInteger(policy.maxItemTypes)||policy.maxItemTypes>256)throw new Error('Invalid M6 inventory item-type capacity');
  if(!positiveInteger(policy.maxTotalQuantity)||policy.maxTotalQuantity>256*9999)throw new Error('Invalid M6 inventory quantity capacity');
  if(policy.provenance!=='RECONSTRUCTION_POLICY'||!policy.note)throw new Error('Invalid M6 inventory policy provenance');
  return{...policy};
}

export function m6InventoryLoad(inventory:InventoryState):M6InventoryLoad{
  const valid=validateInventory(inventory);
  return{
    itemTypes:valid.items.length,
    totalQuantity:valid.items.reduce((sum,item)=>sum+item.quantity,0),
  };
}

export function validateM6InventoryCapacity(
  inventory:InventoryState,
  policy:M6InventoryPolicy=M6_TECHNICAL_INVENTORY_POLICY,
):InventoryState{
  const validPolicy=validateM6InventoryPolicy(policy);
  const valid=validateInventory(inventory);
  const load=m6InventoryLoad(valid);
  if(load.itemTypes>validPolicy.maxItemTypes)throw new Error('M6 inventory item-type capacity exceeded');
  if(load.totalQuantity>validPolicy.maxTotalQuantity)throw new Error('M6 inventory total quantity exceeded');
  return valid;
}

export function grantItemWithinM6Capacity(
  inventory:InventoryState,
  itemId:number,
  quantity:number,
  source:Omit<AcquisitionSource,'quantity'>,
  policy:M6InventoryPolicy=M6_TECHNICAL_INVENTORY_POLICY,
):InventoryState{
  const current=validateM6InventoryCapacity(inventory,policy);
  const next=grantItem(current,itemId,quantity,source);
  return validateM6InventoryCapacity(next,policy);
}
