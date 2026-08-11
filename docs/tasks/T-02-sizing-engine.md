# T-02 — Sizing engine

**Milestone:** M1 · **Depends on:** T-01 · **Blocks:** T-04
**Requirements covered:** `LIB-4.3`–`LIB-4.10`, `LIB-4.13`

## Goal

Compute card dimensions from the viewport, and keep them current as the viewport changes. The arithmetic is a
pure function so it can be tested exhaustively without a browser.

## Public contract

```ts
export function computeCardSize(
  viewport: { width: number; height: number },
  options: Pick<ResolvedOptions,
    "aspectRatio" | "widthRatio" | "portraitHeightRatio" | "landscapeHeightRatio" | "maxWidthPx">
): { width: number; height: number };
```

Internal: `_sizeCard()` applies the result to the DOM and publishes `--fc-card-w`.

## Acceptance criteria

1. **Given** any viewport, **when** the size is computed, **then** it equals

   ```
   isLandscape = vw >= vh
   maxH        = vh * (isLandscape ? landscapeHeightRatio : portraitHeightRatio)
   width       = floor(min(vw * widthRatio, maxWidthPx, maxH * ar.w / ar.h))
   height      = round(width * ar.h / ar.w)
   ```
2. **Given** a wide desktop viewport, **then** width is capped at `maxWidthPx` (`LIB-4.7`).
3. **Given** a short landscape phone viewport, **then** height drives the result and the card still fits
   (`LIB-4.9`).
4. **Given** `vw === vh`, **then** landscape ratios apply — the boundary is `>=` (`LIB-4.8`).
5. **Given** a resize storm of 100 events in one frame, **when** handled, **then** the size is recomputed at
   most once per animation frame (`LIB-4.10`).
6. **Given** a browser exposing `window.visualViewport`, **then** its dimensions are used in preference to
   `window.innerWidth/innerHeight` (`LIB-4.10`).
7. **Given** any computed size, **then** `--fc-card-w` is set in pixels on the container and no font size in
   the stylesheet uses `vw` (`LIB-4.13`).
8. **Given** a degenerate viewport (0×0), **then** the function returns non-negative finite numbers and does
   not divide by zero.

## Test plan

Vitest table test across a matrix of viewports (phone portrait/landscape, tablet, desktop, square, degenerate)
crossed with aspect ratios `[4,3]`, `[1,1]`, `[3,4]`. A jsdom test with a stubbed `requestAnimationFrame`
asserts the throttle. A grep-style test asserts the stylesheet contains no `vw` unit in font declarations.

## Out of scope

Font scale factors applied to the CSS variable (T-04). Orientation-dependent layout beyond size.
