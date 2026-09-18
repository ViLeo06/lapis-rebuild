export type Point = Readonly<{x:number;y:number}>;
export type Size = Readonly<{width:number;height:number}>;
export type Rect = Readonly<{x:number;y:number;width:number;height:number}>;
export type CameraState = Readonly<{scrollX:number;scrollY:number;zoom:number}>;

export type ZoomPolicy = Readonly<{
  min:number;
  max:number;
  step:number;
  defaultZoom:number;
  wheelEnabled:boolean;
}>;

export const DEFAULT_ZOOM_POLICY:ZoomPolicy={
  min:0.5,
  max:2.5,
  step:0.25,
  defaultZoom:1,
  wheelEnabled:true,
};

export type ViewportSnapshot = Readonly<{
  viewport:Size;
  world:Rect;
  camera:CameraState;
  zoomPolicy:ZoomPolicy;
  fullscreenSupported:boolean;
  fullscreenActive:boolean;
}>;

export function finitePositive(value:number,label:string):number{
  if(!Number.isFinite(value)||value<=0)throw new RangeError(`${label} must be > 0`);
  return value;
}

export function normalizeSize(size:Size):Size{
  return{width:finitePositive(size.width,'width'),height:finitePositive(size.height,'height')};
}

export function normalizeRect(rect:Rect):Rect{
  return{
    x:Number.isFinite(rect.x)?rect.x:0,
    y:Number.isFinite(rect.y)?rect.y:0,
    width:finitePositive(rect.width,'world width'),
    height:finitePositive(rect.height,'world height'),
  };
}

export function clamp(value:number,min:number,max:number):number{
  if(min>max)[min,max]=[max,min];
  return Math.min(max,Math.max(min,value));
}

export function normalizeZoomPolicy(policy:Partial<ZoomPolicy>={}):ZoomPolicy{
  const min=finitePositive(policy.min??DEFAULT_ZOOM_POLICY.min,'min zoom');
  const max=finitePositive(policy.max??DEFAULT_ZOOM_POLICY.max,'max zoom');
  if(max<min)throw new RangeError('max zoom must be >= min zoom');
  const step=finitePositive(policy.step??DEFAULT_ZOOM_POLICY.step,'zoom step');
  return{
    min,
    max,
    step,
    defaultZoom:clamp(finitePositive(policy.defaultZoom??DEFAULT_ZOOM_POLICY.defaultZoom,'default zoom'),min,max),
    wheelEnabled:policy.wheelEnabled??DEFAULT_ZOOM_POLICY.wheelEnabled,
  };
}

export function clampZoom(zoom:number,policy:ZoomPolicy):number{
  if(!Number.isFinite(zoom))return policy.defaultZoom;
  return clamp(zoom,policy.min,policy.max);
}
