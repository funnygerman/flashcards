# T-04 — Card content rendering

**Milestone:** M1 · **Depends on:** T-02, T-03 · **Blocks:** T-05
**Requirements covered:** `LIB-3.1`–`LIB-3.7`, `LIB-4.11`, `LIB-4.12`, `LIB-4.14`, `LIB-4.29`–`LIB-4.31`

## Goal

Render card faces as plain text, sized relative to the card, with a defined behaviour for content that does
not fit.

## Public contract

Internal only: `_renderCard(card, element)`. No public API change.

## Acceptance criteria

1. **Given** a card, **then** the front shows `front.text` and, when present, `front.details`; the back shows
   the back equivalents (`LIB-4.29`, `LIB-4.30`).
2. **Given** a card whose text is `<img src=x onerror=alert(1)>`, **then** that string is displayed verbatim,
   no element is created from it, and no handler runs (`LIB-3.3`, `LIB-3.5`).
3. **Given** the rendering code path, **then** it contains no `innerHTML`, no `insertAdjacentHTML`, and no
   HTML template construction — asserted by a lint rule and a source scan (`LIB-3.4`).
4. **Given** text containing `\n`, **then** the line break is visible via `white-space: pre-wrap` and no other
   formatting is interpreted (`LIB-3.6`).
5. **Given** a card width of *W*, **then** primary text renders at `W × textScale` and details at
   `W × detailsScale`, both through `calc(var(--fc-card-w) * k)` (`LIB-4.11`, `LIB-4.12`).
6. **Given** content taller than the card, **then** the text shrinks in bounded steps to no less than 60 % of
   base size; if it still overflows, the content area scrolls, and content is never clipped unreachably
   (`LIB-4.14`).
7. **Given** `showCategory: false` (the default), **then** `category` is not rendered; **given** `true`,
   **then** it renders as a small label (`LIB-4.31`).
8. **Given** application-supplied title or info text, **then** it is rendered with the same plain-text
   guarantees (`LIB-3.7`).

## Test plan

jsdom: an injection corpus (`<`, `>`, `&`, quotes, an `<img onerror>` payload, a `<script>` payload) asserted
via `textContent` equality and `querySelector('img')` being null; newline preservation; font-size computation
against a stubbed `--fc-card-w`. A source-scan test enforcing `LIB-3.4`. The shrink loop is tested by stubbing
`scrollHeight` to exceed `clientHeight` and asserting the loop terminates at the 60 % floor rather than
looping unbounded.

## Out of scope

Flip animation and which face is visible (T-05). The information panel's own layout (T-09).
