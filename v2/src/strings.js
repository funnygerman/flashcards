/**
 * The app's own words — the guide, the two grade labels, and the toggle's
 * dictionary label — translated. Card content (`frontText`, `backText`, ...) is never touched
 * here: that is whatever a deck author wrote, in whatever language the deck
 * teaches, and i18n has no opinion on it.
 *
 * A plain lookup table rather than a library dependency (V2-9.1's no-runtime-
 * dependency rule): three short languages is not enough surface to justify
 * one, and deck.js already has everywhere it would plug in.
 *
 * `grades` names the two grades on the band the mark grows into, once a
 * gesture has passed the threshold (V2-5.7a). They report an event rather than
 * judging the material: the reader is being asked whether they recalled the
 * word just now, not whether the word is difficult (V2-5.1). "Easy"/"Hard" was
 * the obvious pair and is the wrong one — a reader who blanks on a word they
 * consider easy would have to reach for the label marked "Hard", and one who
 * recalled a hard word perfectly might reach for it anyway, which is the same
 * grade inflation a red mark invites, arriving by a different door.
 *
 * Short by necessity, like the refusal below was: the band across a phone-sized
 * card holds about four words.
 *
 * There is no refusal message here any more. There was one — "Already rated
 * today", said on the card when a grading gesture was dropped — and it went
 * when the gesture stopped being droppable: a grade takes the card away
 * (V2-8.4) and `previous` brings it back to be changed (V2-5.13), so there is
 * no longer a swipe that does nothing and nothing left for the card to
 * apologise for. `say()` remains as the seam it always was; nothing in this
 * repository currently has a sentence for it.
 *
 * `allLabel` is what the toggle calls the dictionary side of itself — the
 * title `empty-deck.html` used to carry when it was still the page a deck's
 * corner linked to (V2-13.1).
 */

const STRINGS = {
  en: {
    grades: { easier: "Knew it", harder: "Didn't know it" },
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
        frontDetails: "or press ↑",
        backText: "The card leaves with your mark",
        backDetails: "Swipe left",
      },
      {
        category: "guide",
        frontText: "Swipe down if you didn't",
        frontDetails: "or press ↓",
        backText: "Swipe right takes it back",
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
    grades: { easier: "Gewusst", harder: "Nicht gewusst" },
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
        frontDetails: "oder drücke ↑",
        backText: "Die Karte geht mit deiner Bewertung",
        backDetails: "Wische nach links",
      },
      {
        category: "Anleitung",
        frontText: "Wische nach unten, wenn nicht",
        frontDetails: "oder drücke ↓",
        backText: "Wische nach rechts, um sie zurückzuholen",
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
    grades: { easier: "Знал", harder: "Не знал" },
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
        frontDetails: "или нажми ↑",
        backText: "Карточка уходит с твоей оценкой",
        backDetails: "Смахни влево",
      },
      {
        category: "инструкция",
        frontText: "Смахни вниз, если не знал",
        frontDetails: "или нажми ↓",
        backText: "Смахни вправо, чтобы вернуть её",
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
