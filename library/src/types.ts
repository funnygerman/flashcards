/**
 * Data and configuration types for the flashcard library (T-01).
 *
 * See docs/library/requirements.md §2 (input data) and §6.3 (configuration).
 */

/** LIB-2.1–LIB-2.9: a fully resolved flashcard. Positional identity only —
 * no `id`, `key`, or `lastUpdate` (LIB-2.4, LIB-2.8). Readonly so the type
 * system backs LIB-2.6 (the library must never mutate a card it is given);
 * callers may still pass objects that carry additional properties, which
 * this type neither requires nor rejects (LIB-2.5). */
export interface Flashcard {
  readonly front: {
    readonly text: string;
    readonly details?: string;
  };
  readonly back: {
    readonly text: string;
    readonly details?: string;
  };
  readonly category?: string;
}

export type Side = "front" | "back";
export type Grade = "easy" | "hard";

/** LIB-4.19–LIB-4.24: the optional overlay shown before the first card. */
export interface TitleConfig {
  readonly text: string;
  readonly subtitle?: string;
}

/** LIB-4.25–LIB-4.28: application-supplied content for the info panel. */
export interface InfoConfig {
  readonly heading?: string;
  readonly body?: string;
}

/** LIB-6.14: every option `resolveOptions` accepts. All fields are optional;
 * omitted fields resolve to the defaults documented alongside each one. */
export interface DeckOptions {
  accentColor?: string;
  aspectRatio?: [number, number]; // [4, 3]
  widthRatio?: number; // 0.90
  portraitHeightRatio?: number; // 0.75
  landscapeHeightRatio?: number; // 0.88
  maxWidthPx?: number; // 480
  textScale?: number; // 0.085
  detailsScale?: number; // 0.05
  dotLimit?: number; // 12
  showCategory?: boolean; // false
  friction?: number; // 0.35
  swipeThreshold?: number; // 0.18
  gradeThreshold?: number; // 0.15
  injectStyles?: boolean; // true
  title?: TitleConfig;
  info?: InfoConfig;
  onCardShown?: (index: number) => void;
  onFlip?: (index: number, side: Side) => void;
  onGrade?: (index: number, grade: Grade) => void;
}

/** The result of `resolveOptions`: every sizing, typography, and gesture
 * option is present with a concrete value. `accentColor`, `title`, `info`,
 * and the callbacks stay optional — their absence is meaningful (no accent
 * override, no title screen, no info body, no listener bound). */
export interface ResolvedOptions {
  accentColor?: string;
  aspectRatio: [number, number];
  widthRatio: number;
  portraitHeightRatio: number;
  landscapeHeightRatio: number;
  maxWidthPx: number;
  textScale: number;
  detailsScale: number;
  dotLimit: number;
  showCategory: boolean;
  friction: number;
  swipeThreshold: number;
  gradeThreshold: number;
  injectStyles: boolean;
  title?: TitleConfig;
  info?: InfoConfig;
  onCardShown?: (index: number) => void;
  onFlip?: (index: number, side: Side) => void;
  onGrade?: (index: number, grade: Grade) => void;
}
