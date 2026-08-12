/**
 * Title screen and information panel (T-09).
 *
 * See docs/library/requirements.md §4.5 (LIB-4.19–LIB-4.24, the title
 * overlay) and §4.6 (LIB-4.25–LIB-4.28, the info panel). Pure DOM-building
 * and formatting helpers only — no event wiring, no focus movement, no
 * open/closed state; those stay in `index.ts`, exactly the split
 * `rendering.ts` and `indicators.ts` already use. `index.ts` decides *when*
 * a title screen is dismissed or the panel opens/closes; this module only
 * knows how to build what they look like.
 */

import { CLOSE_PANEL_LABEL } from "./a11y.js";
import { setPlainText } from "./rendering.js";
import type { InfoConfig, TitleConfig } from "./types.js";

/** LIB-4.19, LIB-4.22, LIB-3.7: builds the title screen overlay from
 * application-supplied text — through `setPlainText`, the same plain-text
 * path card content uses, so title/subtitle can never be parsed as markup.
 * Contains no gesture explanations; `index.ts` mounts this as a sibling of
 * `.fc-track`, never a slide inside it, so it never consumes a card index. */
export function createTitleScreen(config: TitleConfig): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "fc-title";
  el.setAttribute("role", "button");
  el.tabIndex = 0;

  const text = document.createElement("p");
  text.className = "fc-title-text";
  setPlainText(text, config.text);
  el.append(text);

  if (config.subtitle !== undefined) {
    const subtitle = document.createElement("p");
    subtitle.className = "fc-title-subtitle";
    setPlainText(subtitle, config.subtitle);
    el.append(subtitle);
  }

  return el;
}

/** LIB-4.28: feature-detects a touch-capable device rather than sniffing a
 * user agent string. `navigator.maxTouchPoints > 0` alone — not `"ontouchstart"
 * in window`, which many engines (including jsdom) define unconditionally as
 * part of the `GlobalEventHandlers` IDL regardless of actual touch support,
 * making it a reliable false positive rather than a real signal. Reads the
 * live global on every call (no caching), so a test that stubs
 * `navigator.maxTouchPoints` before construction is picked up without any
 * library-side flag. */
export function detectTouchCapability(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

/** What the info panel's library-generated interaction section is built
 * from — deliberately narrow (not the full `ResolvedOptions`) so
 * `describeInteractions` stays a pure, table-testable function of exactly
 * the facts that change its output. */
export interface InteractionCapabilities {
  readonly touch: boolean;
  readonly cardCount: number;
}

/** LIB-4.27, LIB-4.28: describes only the interactions actually reachable on
 * this device/configuration, so the application never authors its own copy
 * of the gesture set. An empty deck has nothing to flip, navigate, or grade. */
export function describeInteractions(caps: InteractionCapabilities): string[] {
  if (caps.cardCount === 0) return [];

  const items: string[] = [
    caps.touch ? "Tap a card to flip it." : "Click a card, or press Enter or Space, to flip it.",
  ];

  if (caps.cardCount > 1) {
    items.push(
      caps.touch
        ? "Swipe a card left or right, or use the arrow buttons, to move between cards."
        : "Use the arrow buttons, the dots, or the ← / → keys, to move between cards.",
    );
  }

  items.push(
    caps.touch ? "Swipe a card up or down to grade it." : "Focus a card and press ↑ / ↓ to grade it.",
  );

  return items;
}

export interface InfoPanelElements {
  readonly backdrop: HTMLDivElement;
  readonly panel: HTMLDivElement;
  readonly closeButton: HTMLButtonElement;
}

/** LIB-4.25–LIB-4.28, LIB-3.7: builds the (initially hidden) backdrop and
 * dialog for the info panel — application-supplied `heading`/`body` through
 * `setPlainText`, plus the library-generated interaction list `caps`
 * describes. `index.ts` owns showing/hiding it, the focus trap, and
 * returning focus to the `ⓘ` control on close (LIB-8.8). */
export function createInfoPanel(info: InfoConfig, caps: InteractionCapabilities): InfoPanelElements {
  const backdrop = document.createElement("div");
  backdrop.className = "fc-panel-backdrop";
  backdrop.hidden = true;

  const panel = document.createElement("div");
  panel.className = "fc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Deck information");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "fc-panel-close";
  closeButton.setAttribute("aria-label", CLOSE_PANEL_LABEL);
  closeButton.textContent = "×";
  panel.append(closeButton);

  if (info.heading !== undefined) {
    const heading = document.createElement("h2");
    heading.className = "fc-panel-heading";
    setPlainText(heading, info.heading);
    panel.append(heading);
  }

  if (info.body !== undefined) {
    const body = document.createElement("p");
    body.className = "fc-panel-body";
    setPlainText(body, info.body);
    panel.append(body);
  }

  const interactions = describeInteractions(caps);
  if (interactions.length > 0) {
    const section = document.createElement("section");
    section.className = "fc-panel-interactions";

    const heading = document.createElement("h3");
    heading.textContent = "Interactions";
    section.append(heading);

    const list = document.createElement("ul");
    interactions.forEach((description) => {
      const item = document.createElement("li");
      item.textContent = description;
      list.append(item);
    });
    section.append(list);

    panel.append(section);
  }

  backdrop.append(panel);
  return { backdrop, panel, closeButton };
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** LIB-8.8: the panel's own tab order for the focus trap, recomputed on
 * every `Tab` press rather than cached, so it stays correct if the panel's
 * content ever changes while open. */
export function focusableElements(panel: Element): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}
