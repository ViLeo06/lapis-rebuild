import './ui/game-shell.css';
import './m4-runtime.css';
import {LabScene} from './scene.ts';
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

const forceM4=new URLSearchParams(location.search).get('m4')==='1';
const enableM4=!navigator.webdriver||forceM4;
let installed=false;
let liveScene:LabScene|undefined;

// The Phaser ESM bundle does not expose the UMD-only global game registry.
// Capture the actual scene instance at construction time, but install M4 only
// after the existing lapis-ready event proves the legacy scene initialized.
const legacyCreate=LabScene.prototype.create;
LabScene.prototype.create=function(this:LabScene){
  liveScene=this;
  legacyCreate.call(this);
};

window.addEventListener('lapis-ready',()=>{
  if(installed||!enableM4)return;
  const scene=liveScene;
  if(!scene)throw new Error('M4 runtime did not capture the lab scene');
  const runtime=installM4Runtime(scene);
  installed=true;
  window.lapisM4={
    snapshot:()=>runtime.snapshot(),
    interact:()=>runtime.interactWorld(),
    save:()=>runtime.save(),
    load:()=>runtime.load(),
    exportJson:()=>runtime.exportJson(),
    restore:(raw:unknown)=>runtime.restore(raw),
  };
});

// Register the M4 bridge before starting the legacy Phaser bootstrap. Vite is
// configured to inline this dynamic import so standalone delivery remains one
// JavaScript chunk and one packaged HTML file.
void import('./main.ts');
