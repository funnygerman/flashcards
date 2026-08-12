# T-01 — Types and configuration

**Milestone:** M1 · **Depends on:** T-00 · **Blocks:** T-02 … T-10, T-20, T-21
**Requirements covered:** `LIB-1.1`–`LIB-1.5`, `LIB-2.1`–`LIB-2.9`, `LIB-6.14`, `LIB-6.15`, `LIB-7.11`,
`LIB-7.12`, `LIB-9.5`

## Goal

Define the library's data and configuration types, and the pure function that resolves user options against
defaults. No DOM, no rendering.

## Public contract

```ts
export interface Flashcard {
  front: { text: string; details?: string };
  back:  { text: string; details?: string };
  category?: string;
}

export interface DeckOptions {
  accentColor?: string;
  aspectRatio?: [number, number];
  widthRatio?: number;            // 0.75
  portraitHeightRatio?: number;   // 0.75
  landscapeHeightRatio?: number;  // 0.88
  maxWidthPx?: number;            // 900
  textScale?: number;             // 0.085
  detailsScale?: number;          // 0.05
  dotLimit?: number;              // 12
  showCategory?: boolean;         // false
  friction?: number;              // 0.35
  swipeThreshold?: number;        // 0.18
  gradeThreshold?: number;        // 0.15
  injectStyles?: boolean;         // true
  title?: TitleConfig;
  info?: InfoConfig;
  onCardShown?: (index: number) => void;
  onFlip?: (index: number, side: Side) => void;
  onGrade?: (index: number, grade: Grade) => void;
}

export type Side = "front" | "back";
export type Grade = "easy" | "hard";

export function resolveOptions(input?: DeckOptions): ResolvedOptions;
```

## Acceptance criteria

1. **Given** no options, **when** `resolveOptions()` runs, **then** every documented default from `LIB-4.7`,
   `LIB-4.12`, `LIB-4.16`, `LIB-5.5`, `LIB-5.6`, `LIB-5.11` is present.
2. **Given** an invalid value (`aspectRatio: [0, 0]`, `dotLimit: -1`, `friction: "x"`), **when** resolving,
   **then** the default is used, `console.warn` is called once, and no exception is thrown (`LIB-6.15`).
3. **Given** a card object carrying extra properties, **when** it passes through the library's types, **then**
   the extra properties are neither required nor rejected (`LIB-2.5`).
4. **Given** a card object, **when** any library code handles it, **then** the object is not mutated —
   enforced by `readonly` types and asserted in tests with a deep-frozen input (`LIB-2.6`).
5. **Given** the `Flashcard` type, **then** it has no `key`, no `id`, and no `lastUpdate` (`LIB-2.4`,
   `LIB-2.8`).
6. **Given** the package, **then** it declares no runtime dependencies (`LIB-9.5`).

## Test plan

Vitest, pure unit tests: defaults table, one case per invalid-input fallback, a frozen-card mutation test, and
a type-level test (`tsd` or `expectTypeError`) asserting that a card with extra properties still satisfies
`Flashcard`.

## Out of scope

Anything that touches the DOM. Sizing arithmetic is T-02.
