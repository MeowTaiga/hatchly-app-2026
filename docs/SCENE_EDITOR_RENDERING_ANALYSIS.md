# Scene Editor Rendering Architecture — Deep Analysis

> **Note:** The optimizations described below (quantized viewport sync, SharedValue rects) were tried and reverted — they made the editor feel *more* sluggish. The analysis remains useful for understanding the architecture.

## Executive Summary

The admin scene editor is stuttery **even with 0 items** because of **UI→JS thread bridge saturation** during pan/pinch. The farm (MultiplayerScene) feels smooth because it has no pan/pinch gestures and uses a different sync strategy.

---

## Architecture Comparison

### Farm (MultiplayerScene) — Smooth
- **No GestureDetector** for pan/pinch — camera follows pet via `withTiming`
- **useAnimatedReaction** syncs camera to `cameraRef.current` only — **no setState**
- Camera updates are driven by `myPos` changes (discrete), not continuous user input
- Single baked image or solid bg — minimal per-frame work

### Admin Scene Editor — Stuttery
- **GestureDetector** with pan + pinch + area select + paint area + tap
- **useAnimatedReaction** runs every frame when `translateX`, `translateY`, `scale` change
- Calls `runOnJS(setVisibleRectThrottled)` → **60+ UI→JS bridge crossings per second**
- Throttle (60ms) only limits `setState` — the **bridge crossing still happens every frame**
- During area select/paint: `handleAreaSelectUpdate` / `handlePaintAreaUpdate` call `runOnJS` on **every pan frame** → setState every frame

---

## Root Causes of Stutter

### 1. **useAnimatedReaction + runOnJS (Primary)**
```
Every frame during pan/pinch/decay:
  UI thread: prepare() → { tx, ty, s }
  UI thread: react() → runOnJS(setVisibleRectThrottled)(rect)
  Bridge: UI → JS (expensive)
  JS thread: setVisibleRectThrottled runs, Date.now(), maybe setState
```
- **60+ bridge crossings/sec** during pan and during `withDecay` (which runs for seconds after finger lift)
- Each crossing blocks the JS thread briefly
- React re-renders every 60ms (throttled) → EditorGrid, overlays, etc. recompute

### 2. **Area Select / Paint Pan — runOnJS every frame**
```js
.onUpdate((e) => { runOnJS(handlePaintAreaUpdate)(e.absoluteX, e.absoluteY); })
```
- During area select or paint drag: **setState every frame** (setPaintSelectionRect, setSelectionRect)
- Full React re-render 60×/sec during drag

### 3. **visibleRect → React re-renders**
- `visibleRect` changes → `visiblePlacements`, `EditorGrid`, unwalkable/fishing overlays all depend on it
- `EditorGrid` useMemo recomputes `vLines`, `hLines` with new culling
- Even with 0 items, the whole tree re-renders

### 4. **Gesture composition**
- `Gesture.Race(pan|areaPan|paintAreaPan, tapGesture)` — multiple recognizers
- Pan + pinch are `Gesture.Simultaneous` — both active during two-finger zoom
- Gesture handler work is on UI thread (fine), but the runOnJS callbacks are the bottleneck

### 5. **AdminBottomBar**
- Keyboard-aware `useSharedValue` + `useAnimatedStyle` for bottom position
- Heavy content: search, palette, quick create, item tools
- Re-renders when parent re-renders (every 60ms during pan)

---

## What Runs Where

| Operation | Thread | Cost |
|-----------|--------|------|
| Pan/pinch gesture | UI | Low |
| useAnimatedStyle (cameraStyle) | UI | Low |
| withDecay after lift | UI | Low |
| useAnimatedReaction prepare | UI | Low |
| useAnimatedReaction react → runOnJS | UI→JS bridge | **High** |
| setVisibleRect (setState) | JS | Medium |
| React re-render | JS | Medium |
| EditorGrid useMemo | JS | Low (culled) |
| handlePaintAreaUpdate (every frame) | JS | **High** |

---

## Recommended Fixes

### Fix 1: Throttle runOnJS in the worklet (quantize prepare)
Only run the reaction when the viewport has moved meaningfully:
```js
prepare: () => ({
  qx: Math.floor(translateX.value / 40),
  qy: Math.floor(translateY.value / 40),
  qs: Math.round(scale.value * 100),
})
```
→ Sync ~5–15×/sec instead of 60×/sec during pan.

### Fix 2: Don’t sync during active gesture (like WorldRenderer)
Use `isPanning` shared value; skip runOnJS when true. Sync once in pan/pinch `onEnd`.

### Fix 3: Use SharedValue for paint/area rect (no setState during drag)
Store `paintSelectionRect` in a SharedValue; render via `useAnimatedStyle` or `Animated.View` that reads it. No runOnJS during `onUpdate`.

### Fix 4: Skip visibleRect sync when placements.length === 0
With 0 items, culling has no benefit. Pass `visibleRect={null}` always when empty; avoid the reaction entirely for that case.

---

## Files to Modify

- `app/admin-scene-editor.tsx`: useAnimatedReaction, area/paint pan handlers
- Consider extracting viewport sync into a hook with configurable throttle/strategy
