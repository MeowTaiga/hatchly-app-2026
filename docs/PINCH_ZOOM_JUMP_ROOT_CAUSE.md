# Pinch Zoom Jump — Root Cause Analysis

## Symptom

When zooming in/out in the admin scene editor, the camera jumps (typically up and to the right) instead of zooming smoothly around the point between the user's fingers.

## Root Cause

**On Android (and sometimes iOS), `focalX` and `focalY` from the Pinch gesture are 0 or unreliable during `onStart` (State.BEGAN).** They only become valid when the gesture enters `onUpdate` (State.ACTIVE).

### Evidence

From [RNGH Issue #546](https://github.com/software-mansion/react-native-gesture-handler/issues/546):

> **@archcorsair** (Apr 1, 2022): "On android both focal values are **0** during `State.BEGAN` but continuously update in `State.ACTIVE`. I needed to set my focal values once during `State.BEGAN` and not update them repeatedly during `State.ACTIVE`"
>
> **Solution**: "kept a local sharedValue that I would only update **once when the gesture lifecycle entered `State.ACTIVE`**"

From the same issue:

> **@Ashoat**: "Android's ScaleGestureDetector says the focal point is between each of the pointers. However, at the end of the gesture, when the first finger is removed from the screen, the focal point will suddenly be redefined as the location of the second finger."
>
> **@wcandillon**: "focal values are only valid when the state is `ACTIVE`"

### Current Code (Broken)

```ts
.onStart((e) => {
  focalX.value = e.focalX;  // ← 0 or wrong on Android!
  focalY.value = e.focalY;
  ...
})
.onUpdate((e) => {
  const ratio = ns / startScale.value;
  translateX.value = focalX.value - ratio * (focalX.value - startTX.value);
  translateY.value = focalY.value - ratio * (focalY.value - startTY.value);
  ...
})
```

When `focalX` and `focalY` are 0, the zoom center becomes (0, 0) — the top-left of the screen. The formula `translateX = 0 - ratio * (0 - startTX)` = `ratio * startTX` shifts the view right when zooming in (ratio > 1), and the Y equivalent shifts it down. Combined with the wrong focal, this produces the observed jump.

## Fix

Capture the focal point **only on the first `onUpdate`** call (when the gesture is ACTIVE and focal values are valid), not in `onStart`:

1. Add `focalCaptured = useSharedValue(false)`
2. In `onStart`: set `focalCaptured.value = false`
3. In `onUpdate`: if `!focalCaptured.value`, set `focalX.value = e.focalX`, `focalY.value = e.focalY`, `focalCaptured.value = true`
4. Use the stored `focalX`/`focalY` for the zoom math (unchanged)

This matches the workaround from the RNGH issue and ensures we zoom around the correct point.
