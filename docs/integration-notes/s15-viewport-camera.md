# S15 Viewport / Camera / Fullscreen integration note

Baseline: `047c52af340076a00a6e0d347806708ad92844d1`  
Branch: `codex/m5-viewport-camera`

## Scope and boundary

S15 deliberately does **not** rewrite `web/src/scene.ts`, `web/src/main.ts`, or `web/src/battle.ts` while S15-S19 run in parallel. The branch adds a standalone viewport subsystem with a narrow port that the coordinator can wire into the shared Phaser runtime after the parallel PRs return.

No original-server rule is asserted by this work. Camera/zoom/fullscreen behavior is a modern usability implementation, not retail gameplay evidence.

## Modules

- `web/src/view/viewport-state.ts`: shared geometry, zoom policy, validation, snapshots.
- `web/src/view/coordinate-transform.ts`: world/screen/client coordinate conversions that explicitly account for camera zoom and CSS-to-logical canvas scaling.
- `web/src/view/camera-follow.ts`: `CameraFollowPolicy`, dead-zone follow, time-normalized smoothing, map-edge clamp, undersized-map centering.
- `web/src/view/viewport-controller.ts`: `ViewportController`, zoom in/out/reset, wheel policy, responsive resize, fit/framing, field follow, fullscreen abstraction, browser Fullscreen API adapter.
- `web/src/view/viewport-harness.ts`: independent visual harness used by Playwright screenshot acceptance.

## Recommended Phaser integration API

Use one adapter instance around `scene.cameras.main` and `scene.scale`; keep Phaser-specific code in the coordinator wiring layer rather than moving it into the generic controller.

```ts
const port:ViewportPort={
  viewportSize:()=>({width:scene.scale.width,height:scene.scale.height}),
  worldBounds:()=>({x:0,y:0,width:map.render.width,height:map.render.height}),
  cameraState:()=>({scrollX:camera.scrollX,scrollY:camera.scrollY,zoom:camera.zoom}),
  resize:(w,h)=>scene.scale.resize(w,h),
  setZoom:z=>void camera.setZoom(z),
  setScroll:(x,y)=>void camera.setScroll(x,y),
};
const fullscreen=new BrowserFullscreenPort(document,document.getElementById('canvas-host')!);
const viewport=new ViewportController(port,fullscreen);
```

### Shared-runtime replacements

1. Replace direct `scene.zoom(.8/1.25)` calls with `viewport.zoomOut()/zoomIn()` and add `viewport.resetZoom()`.
2. Replace direct `fit()` implementation with `viewport.fitWorld()` in field mode. Battle mode should call `viewport.frameRect(battleFocus)` rather than reuse field follow.
3. Replace `scale.on('resize',()=>fit())` with the existing host `ResizeObserver` calling `viewport.resize(host.clientWidth,host.clientHeight)`. Do **not** automatically refit on every resize because that destroys player-selected zoom; resize should retain zoom and reclamp.
4. In field `update`, after movement updates the player anchor, call `viewport.follow(anchor,dt)`. Do not enable field follow in battle mode.
5. Replace pointer conversion with `clientToWorld` (raw DOM events) or keep Phaser `camera.getWorldPoint` only if Phaser pointer coordinates are guaranteed to be logical canvas coordinates. The new helpers are the authoritative path for E2E/client-coordinate conversion.
6. Add three UI actions: `Zoom In`, `Zoom Out`, `Reset Zoom`; add `Enter Fullscreen` / `Exit Fullscreen`. `Escape` is browser-native; listen for `fullscreenchange` only to refresh labels/state.
7. Optional wheel zoom should call `viewport.handleWheel(deltaY)` and `preventDefault()` only while the canvas is the active interaction target.

## Fullscreen behavior

`BrowserFullscreenPort` uses the standard `requestFullscreen()` / `document.exitFullscreen()` API, reports support, catches rejected promises, and returns `false` instead of throwing when unsupported. Browser Escape behavior is preserved. A `fullscreenchange` listener can drive button text and trigger the normal `ResizeObserver` path.

## Zoom policy

Default policy is deliberately bounded and centralized:

- min: `0.5`
- max: `2.5`
- step: `0.25`
- reset/default: `1.0`
- wheel: enabled by default but reversible through policy

The coordinator can tune these values after real-asset playtesting without touching coordinate or follow math.

## Camera follow and clamp

`CameraFollowPolicy` keeps the player within a small central dead zone, then smoothly follows using time-normalized lerp. Scroll is clamped to world bounds. If a map is smaller than the visible world rectangle, it is centered instead of pinned to the top-left.

Battle mode should not use field follow. `ViewportController.frameRect()` is provided for a battle arena / active-unit group framing policy. If later battle movement can leave the framed rectangle, the coordinator should recompute a padded union rect of living units and call `frameRect()` at action boundaries, not every animation frame.

## Coordinate correctness

The transform chain is explicit:

`client pixel -> logical viewport pixel -> camera world coordinate`

and its inverse:

`world coordinate -> logical viewport pixel -> client pixel`

This avoids the common failure where CSS resize or fullscreen changes the canvas bounding box and clicks drift away from world targets. The tests cover round-trips after zoom and non-1:1 CSS scaling, including a battle-target point.

## Acceptance / screenshots

`web/e2e/s15-viewport-camera.spec.ts` produces:

- `test-results/s15-normal.png`
- `test-results/s15-zoom-in.png`
- `test-results/s15-zoom-out.png`
- `test-results/s15-camera-moved.png`
- `test-results/s15-fullscreen-viewport.png`

The harness also asserts no page errors. Unit coverage includes resize, min/max zoom, reset zoom, map-edge clamp, smooth follow, fullscreen graceful fallback/toggle, and coordinate round-trips.

Final real-game acceptance (NPC interaction and scene-entrance clicks after zoom/fullscreen) belongs to the coordinator pass because S16/S18 own the corresponding runtime entities/triggers and shared-file wiring is intentionally frozen during parallel work.
