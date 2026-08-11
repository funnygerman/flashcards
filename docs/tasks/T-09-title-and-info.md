# T-09 — Title screen and information panel

**Milestone:** M1 · **Depends on:** T-03 · **Blocks:** T-10
**Requirements covered:** `LIB-4.19`–`LIB-4.28`

## Goal

The optional introduction shown before the deck, and the always-available information panel — both driven by
configuration, neither holding any persistence.

## Public contract

```ts
interface TitleConfig { text: string; subtitle?: string }
interface InfoConfig  { heading?: string; body?: string }
```

## Acceptance criteria

1. **Given** `title` configuration, **then** a title screen appears before the first card (`LIB-4.19`).
2. **Given** the title screen, **then** it is an overlay: card indices, indicator counts, and `goTo` arguments
   are identical whether or not it is configured (`LIB-4.20`).
3. **Given** the title screen, **when** the user taps it or presses `Enter`, `Space`, or `→`, **then** it is
   dismissed and cannot reappear for the life of the instance (`LIB-4.21`).
4. **Given** the title screen, **then** it shows the configured text and contains no gesture explanations
   (`LIB-4.22`).
5. **Given** no `title` configuration, **then** no title screen appears — the library holds no flag and reads
   no storage to decide this (`LIB-4.24`).
6. **Given** any deck, **then** an `ⓘ` control is available near the card's top-right, outside the card, and
   does not overlay it (`LIB-4.25`).
7. **Given** the panel is open, **then** `Esc`, the close control, and a click outside all close it, and focus
   is trapped while it is open (`LIB-4.26`).
8. **Given** the panel, **then** it shows the application's text **and** a library-generated section listing
   the interactions actually enabled on this device and configuration (`LIB-4.27`).
9. **Given** a touch device versus a desktop, **then** the generated interaction list differs accordingly, and
   the application never has to describe gestures (`LIB-4.28`).
10. **Given** application-supplied title or info text, **then** it is treated as plain text (`LIB-3.7`).

## Test plan

**Automated (Vitest + jsdom).** Index-invariance with and without a title screen; dismissal by each input;
the absence of any storage access, asserted with throwing storage stubs; the panel's focus trap by tabbing to
its boundaries; and `Esc`, close-control, and click-outside handling.

**Manual.** Open the panel on a phone and on a desktop browser and confirm the generated interaction list
describes the interactions actually available there (`LIB-4.28`).

## Out of scope

Deciding *when* a title screen should be shown across visits — that is the application's call (`APP-5.6`).
