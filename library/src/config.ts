/**
 * Resolves user-supplied `DeckOptions` against documented defaults (T-01).
 *
 * Every field is validated independently: an invalid value falls back to
 * its default, `console.warn` fires once for that field, and resolution
 * never throws (LIB-6.15). Callers may be plain JS, so validation does not
 * assume the input actually matches the TypeScript types.
 */

import type { DeckOptions, ResolvedOptions } from "./types.js";

interface NumberDefaults {
  widthRatio: number;
  portraitHeightRatio: number;
  landscapeHeightRatio: number;
  maxWidthPx: number;
  textScale: number;
  detailsScale: number;
  friction: number;
  swipeThreshold: number;
  gradeThreshold: number;
}

// LIB-4.3
const DEFAULT_ASPECT_RATIO: [number, number] = [4, 3];
// LIB-4.16
const DEFAULT_DOT_LIMIT = 12;
// LIB-4.31
const DEFAULT_SHOW_CATEGORY = false;
// LIB-7.6
const DEFAULT_INJECT_STYLES = true;

// LIB-4.7, LIB-4.12, LIB-5.5, LIB-5.6, LIB-5.11
const NUMBER_DEFAULTS: NumberDefaults = {
  widthRatio: 0.75,
  portraitHeightRatio: 0.75,
  landscapeHeightRatio: 0.88,
  maxWidthPx: 900,
  textScale: 0.085,
  detailsScale: 0.05,
  friction: 0.35,
  swipeThreshold: 0.18,
  gradeThreshold: 0.15,
};

function warnInvalid(key: string, value: unknown, fallback: unknown): void {
  const fallbackDescription = fallback === undefined ? "no override" : JSON.stringify(fallback);
  console.warn(
    `@flashcards/library: invalid value for "${key}" (${JSON.stringify(value)}); falling back to ${fallbackDescription}.`,
  );
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function resolvePositiveNumber(key: keyof NumberDefaults, input: DeckOptions): number {
  const value = input[key];
  const fallback = NUMBER_DEFAULTS[key];
  if (value === undefined) return fallback;
  if (isPositiveFiniteNumber(value)) return value;
  warnInvalid(key, value, fallback);
  return fallback;
}

function resolveDotLimit(input: DeckOptions): number {
  const value = input.dotLimit;
  if (value === undefined) return DEFAULT_DOT_LIMIT;
  if (isPositiveFiniteNumber(value) && Number.isInteger(value)) return value;
  warnInvalid("dotLimit", value, DEFAULT_DOT_LIMIT);
  return DEFAULT_DOT_LIMIT;
}

function resolveBoolean(key: "showCategory" | "injectStyles", input: DeckOptions, fallback: boolean): boolean {
  const value = input[key];
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  warnInvalid(key, value, fallback);
  return fallback;
}

function resolveAspectRatio(input: DeckOptions): [number, number] {
  const value = input.aspectRatio;
  if (value === undefined) return DEFAULT_ASPECT_RATIO;
  if (Array.isArray(value) && value.length === 2 && isPositiveFiniteNumber(value[0]) && isPositiveFiniteNumber(value[1])) {
    return [value[0], value[1]];
  }
  warnInvalid("aspectRatio", value, DEFAULT_ASPECT_RATIO);
  return DEFAULT_ASPECT_RATIO;
}

function resolveAccentColor(input: DeckOptions): string | undefined {
  const value = input.accentColor;
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length > 0) return value;
  warnInvalid("accentColor", value, undefined);
  return undefined;
}

/** LIB-6.14, LIB-6.15: resolve `DeckOptions` against defaults. Pure — no DOM,
 * no side effects beyond `console.warn` on invalid input. */
export function resolveOptions(input: DeckOptions = {}): ResolvedOptions {
  const accentColor = resolveAccentColor(input);

  return {
    aspectRatio: resolveAspectRatio(input),
    widthRatio: resolvePositiveNumber("widthRatio", input),
    portraitHeightRatio: resolvePositiveNumber("portraitHeightRatio", input),
    landscapeHeightRatio: resolvePositiveNumber("landscapeHeightRatio", input),
    maxWidthPx: resolvePositiveNumber("maxWidthPx", input),
    textScale: resolvePositiveNumber("textScale", input),
    detailsScale: resolvePositiveNumber("detailsScale", input),
    dotLimit: resolveDotLimit(input),
    showCategory: resolveBoolean("showCategory", input, DEFAULT_SHOW_CATEGORY),
    friction: resolvePositiveNumber("friction", input),
    swipeThreshold: resolvePositiveNumber("swipeThreshold", input),
    gradeThreshold: resolvePositiveNumber("gradeThreshold", input),
    injectStyles: resolveBoolean("injectStyles", input, DEFAULT_INJECT_STYLES),
    ...(accentColor !== undefined ? { accentColor } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.info !== undefined ? { info: input.info } : {}),
    ...(input.onCardShown !== undefined ? { onCardShown: input.onCardShown } : {}),
    ...(input.onFlip !== undefined ? { onFlip: input.onFlip } : {}),
    ...(input.onGrade !== undefined ? { onGrade: input.onGrade } : {}),
  };
}
