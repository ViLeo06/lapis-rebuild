export type MobileOrientation='portrait'|'landscape';
export type MobileLayoutClass='narrow'|'compact'|'wide';

export interface MobileLayoutMetricsInput{
  layoutWidth:number;
  layoutHeight:number;
  visualWidth?:number;
  visualHeight?:number;
  offsetLeft?:number;
  offsetTop?:number;
  devicePixelRatio?:number;
}

export interface MobileLayoutSnapshot{
  width:number;
  height:number;
  layoutWidth:number;
  layoutHeight:number;
  offsetLeft:number;
  offsetTop:number;
  devicePixelRatio:number;
  orientation:MobileOrientation;
  layout:MobileLayoutClass;
}

export interface MobileLayoutController{
  snapshot:()=>MobileLayoutSnapshot;
  refresh:()=>MobileLayoutSnapshot;
  destroy:()=>void;
}

export interface MobileLayoutRoot{
  style:{setProperty:(name:string,value:string)=>void};
  dataset:Record<string,string|undefined>;
}

const px=(value:number)=>`${Math.max(0,Math.round(value*100)/100)}px`;
const positive=(value:number|undefined,fallback:number)=>Number.isFinite(value)&&Number(value)>0?Number(value):fallback;
const offset=(value:number|undefined)=>Number.isFinite(value)?Math.max(0,Number(value)):0;

export function computeMobileLayoutSnapshot(input:MobileLayoutMetricsInput):MobileLayoutSnapshot{
  const layoutWidth=positive(input.layoutWidth,1);
  const layoutHeight=positive(input.layoutHeight,1);
  const width=positive(input.visualWidth,layoutWidth);
  const height=positive(input.visualHeight,layoutHeight);
  const orientation:MobileOrientation=width>=height?'landscape':'portrait';
  const layout:MobileLayoutClass=width<360?'narrow':width<900?'compact':'wide';
  return{
    width,
    height,
    layoutWidth,
    layoutHeight,
    offsetLeft:offset(input.offsetLeft),
    offsetTop:offset(input.offsetTop),
    devicePixelRatio:positive(input.devicePixelRatio,1),
    orientation,
    layout,
  };
}

export function applyMobileLayoutSnapshot(root:MobileLayoutRoot,snapshot:MobileLayoutSnapshot):void{
  root.style.setProperty('--lapis-viewport-width',px(snapshot.width));
  root.style.setProperty('--lapis-viewport-height',px(snapshot.height));
  root.style.setProperty('--lapis-viewport-offset-left',px(snapshot.offsetLeft));
  root.style.setProperty('--lapis-viewport-offset-top',px(snapshot.offsetTop));
  root.style.setProperty('--lapis-layout-width',px(snapshot.layoutWidth));
  root.style.setProperty('--lapis-layout-height',px(snapshot.layoutHeight));
  root.dataset.lapisOrientation=snapshot.orientation;
  root.dataset.lapisLayout=snapshot.layout;
}

export function installMobileLayout(
  win:Window=window,
  root:HTMLElement=document.documentElement,
):MobileLayoutController{
  let current=computeMobileLayoutSnapshot({layoutWidth:win.innerWidth,layoutHeight:win.innerHeight,devicePixelRatio:win.devicePixelRatio});
  const measure=()=>{
    const visual=win.visualViewport;
    current=computeMobileLayoutSnapshot({
      layoutWidth:win.innerWidth,
      layoutHeight:win.innerHeight,
      visualWidth:visual?.width,
      visualHeight:visual?.height,
      offsetLeft:visual?.offsetLeft,
      offsetTop:visual?.offsetTop,
      devicePixelRatio:win.devicePixelRatio,
    });
    applyMobileLayoutSnapshot(root,current);
    return current;
  };
  const refresh=()=>measure();
  const visual=win.visualViewport;
  win.addEventListener('resize',refresh,{passive:true});
  win.addEventListener('orientationchange',refresh,{passive:true});
  visual?.addEventListener('resize',refresh,{passive:true});
  visual?.addEventListener('scroll',refresh,{passive:true});
  measure();
  return{
    snapshot:()=>({...current}),
    refresh,
    destroy:()=>{
      win.removeEventListener('resize',refresh);
      win.removeEventListener('orientationchange',refresh);
      visual?.removeEventListener('resize',refresh);
      visual?.removeEventListener('scroll',refresh);
    },
  };
}
