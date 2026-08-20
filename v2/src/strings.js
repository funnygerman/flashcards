/**
 * The app's own words — the guide, the toggle's dictionary label, and the
 * "already rated" refusal message — translated. Card content (`frontText`,
 * `backText`, ...) is never touched here: that is whatever a deck author
 * wrote, in whatever language the deck teaches, and i18n has no opinion on
 * it.
 *
 * A plain lookup table rather than a library dependency (V2-9.1's no-runtime-
 * dependency rule): three short languages is not enough surface to justify
 * one, and deck.js already has everywhere it would plug in.
 *
 * `settled` is short on purpose, not just by habit: it grows into the band
 * across the card's own grade mark (V2-5.15's `onRefuse`), and a band on a
 * phone-sized card holds about this much. The rule behind it — one rating a
 * day — is the help view's to explain; what the reader needs at the moment
 * their swipe does nothing is why it did nothing, not the rule itself.
 *
 * `allLabel` is what the toggle calls the dictionary side of itself — the
 * title `empty-deck.html` used to carry when it was still the page a deck's
 * corner linked to (V2-13.1).
 */

const STRINGS = {
  en: {
    settled: "Already rated today",
    allLabel: "Everything you have seen",
    guide: [
      {
        category: "guide",
        frontText: "Tap this card",
        frontDetails: "or press Space",
        backText: "You see the answer",
        backDetails: "Swipe left for the next one — or press →",
      },
      {
        category: "guide",
        frontText: "Swipe up if you knew it",
        frontDetails: "Tap this card",
        backText: "Swipe down if you didn't know it",
        backDetails: "Swipe left",
      },
      {
        category: "guide",
        frontText: "Stars are days you got it right",
        frontDetails: "Tap this card",
        backText: "Wrong answer clears them all",
        backDetails: "Swipe left",
      },
      {
        category: "guide",
        frontText: "That is all of it",
        frontDetails: "Tap this card",
        backText: "These cards are not part of your deck",
        backDetails: "Swipe left to start learning",
      },
    ],
  },

  de: {
    settled: "Heute schon bewertet",
    allLabel: "Alles, was du gesehen hast",
    guide: [
      {
        category: "Anleitung",
        frontText: "Tippe auf diese Karte",
        frontDetails: "oder drücke Leertaste",
        backText: "Du siehst die Antwort",
        backDetails: "Wische nach links für die nächste — oder drücke →",
      },
      {
        category: "Anleitung",
        frontText: "Wische nach oben, wenn du es wusstest",
        frontDetails: "Tippe auf diese Karte",
        backText: "Wische nach unten, wenn du es nicht wusstest",
        backDetails: "Wische nach links",
      },
      {
        category: "Anleitung",
        frontText: "Sterne sind Tage, an denen du es richtig hattest",
        frontDetails: "Tippe auf diese Karte",
        backText: "Eine falsche Antwort löscht sie alle",
        backDetails: "Wische nach links",
      },
      {
        category: "Anleitung",
        frontText: "Das ist alles",
        frontDetails: "Tippe auf diese Karte",
        backText: "Diese Karten gehören nicht zu deinem Stapel",
        backDetails: "Wische nach links, um zu lernen",
      },
    ],
  },

  ru: {
    settled: "Уже оценено сегодня",
    allLabel: "Всё, что ты видел",
    guide: [
      {
        category: "инструкция",
        frontText: "Нажми на эту карточку",
        frontDetails: "или нажми пробел",
        backText: "Ты видишь ответ",
        backDetails: "Смахни влево для следующей — или нажми →",
      },
      {
        category: "инструкция",
        frontText: "Смахни вверх, если знал",
        frontDetails: "Нажми на эту карточку",
        backText: "Смахни вниз, если не знал",
        backDetails: "Смахни влево",
      },
      {
        category: "инструкция",
        frontText: "Звёзды — это дни, когда ты ответил правильно",
        frontDetails: "Нажми на эту карточку",
        backText: "Неправильный ответ обнуляет их все",
        backDetails: "Смахни влево",
      },
      {
        category: "инструкция",
        frontText: "Это всё",
        frontDetails: "Нажми на эту карточку",
        backText: "Эти карточки не часть твоей колоды",
        backDetails: "Смахни влево, чтобы начать учиться",
      },
    ],
  },
};

export const DEFAULT_LANG = "en";

/** The app's own strings for `lang`, or English where `lang` is unset or unknown. */
export function stringsFor(lang) {
  return STRINGS[lang] ?? STRINGS[DEFAULT_LANG];
}
