import type {CameraState,Point,Size} from './viewport-state.ts';
import {finitePositive} from './viewport-state.ts';

export type CanvasMetrics = Readonly<{
  left:number;
  top:number;
  cssWidth:number;
  cssHeight:number;
  viewportWidth:number;
  viewportHeight:number;
}>;

function checkedMetrics(m:CanvasMetrics):CanvasMetrics{
  finitePositive(m.cssWidth,'canvas cssWidth');
  finitePositive(m.cssHeight,'canvas cssHeight');
  finitePositive(m.viewportWidth,'viewportWidth');
  finitePositive(m.viewportHeight,'viewportHeight');
  return m;
}

export function screenToWorld(point:Point,camera:CameraState):Point{
  finitePositive(camera.zoom,'camera zoom');
  return{x:camera.scrollX+point.x/camera.zoom,y:camera.scrollY+point.y/camera.zoom};
}

export function worldToScreen(point:Point,camera:CameraState):Point{
  finitePositive(camera.zoom,'camera zoom');
  return{x:(point.x-camera.scrollX)*camera.zoom,y:(point.y-camera.scrollY)*camera.zoom};
}

export function clientToViewport(point:Point,metrics:CanvasMetrics):Point{
  const m=checkedMetrics(metrics);
  return{
    x:(point.x-m.left)*(m.viewportWidth/m.cssWidth),
    y:(point.y-m.top)*(m.viewportHeight/m.cssHeight),
  };
}

export function viewportToClient(point:Point,metrics:CanvasMetrics):Point{
  const m=checkedMetrics(metrics);
  return{
    x:m.left+point.x*(m.cssWidth/m.viewportWidth),
    y:m.top+point.y*(m.cssHeight/m.viewportHeight),
  };
}

export function clientToWorld(point:Point,metrics:CanvasMetrics,camera:CameraState):Point{
  return screenToWorld(clientToViewport(point,metrics),camera);
}

export function worldToClient(point:Point,metrics:CanvasMetrics,camera:CameraState):Point{
  return viewportToClient(worldToScreen(point,camera),metrics);
}

export function viewportCenter(size:Size):Point{
  return{x:size.width/2,y:size.height/2};
}
