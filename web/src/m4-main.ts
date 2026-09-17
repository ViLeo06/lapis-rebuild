import Phaser from 'phaser';
import './main.ts';
import './ui/game-shell.css';
import './m4-runtime.css';
import type {LabScene} from './scene.ts';
import {installM4Runtime} from './m4-runtime-integration.ts';

declare global{
  interface Window{
    lapisM4?:{
      snapshot:()=>ReturnType<ReturnType<typeof installM4Runtime>['snapshot']>;
      interact:()=>void;
      save:()=>Promise<void>;
      load:()=>Promise<void>;
      exportJson:()=>string;
      restore:(raw:unknown)=>void;
    };
  }
}

let installed=false;
window.addEventListener('lapis-ready',()=>{
  if(installed)return;
  installed=true;
  const game=Phaser.GAMES.find(candidate=>candidate?.scene?.getScene('lab'));
  const scene=game?.scene.getScene('lab') as LabScene|undefined;
  if(!scene)throw new Error('M4 runtime could not locate the lab scene');
  const runtime=installM4Runtime(scene);
  window.lapisM4={
    snapshot:()=>runtime.snapshot(),
    interact:()=>runtime.interactWorld(),
    save:()=>runtime.save(),
    load:()=>runtime.load(),
    exportJson:()=>runtime.exportJson(),
    restore:(raw:unknown)=>runtime.restore(raw),
  };
});
