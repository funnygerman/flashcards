/**
 * The app's own words — the guide, the two grade labels, the menu and the card
 * that says there is nothing left today — translated. Card content
 * (`frontText`, `backText`, ...) is never touched
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
 * `settled` is what the card says when the reader grades a card they have
 * already answered today (V2-5.16). It is short for the same reason the grade
 * labels are — it goes on the same band, which across a phone-sized card holds
 * about four words — and it names the day rather than the card: what has run
 * out is today's answer to this card, not the card itself, and tomorrow it is
 * ordinary material again. It is met only through the reader's own "every
 * card" filter, a due session having nothing to gain by offering a card
 * nothing can be done with (V2-13.14).
 *
 * `menu` is the words the menu is made of (§16). `open` names the button that
 * opens it. The three groups inside — `side`, `pool`, `scope` — each name a
 * state the reader can be in rather than the move to it: a menu row is a place
 * to stand, and the mark beside it says which one they are standing on. That
 * is the one thing the two corners it replaced could not do, and why their own
 * labels ("Show every card", meaning press-this-to-get-there) are gone rather
 * than moved: a control that draws the far side of itself has to, because
 * there is nowhere on it to show both.
 *
 * `pool.deck` is only a fallback. A deck page has a title, and its own name is
 * a better word for itself than "this deck" is; this stands in where a page
 * has none (V2-16.9).
 *
 * `done` is the one card a page has when its own schedule says there is
 * nothing to repeat today (V2-13.12). It is written as a card, in the guide's
 * own register — short lines, no full stops, the gesture named where there is
 * one to name — because that is the only register this app has for saying
 * something to a reader, and an empty screen or a banner would be a second
 * one. Its back names the menu, which always carries the way past the schedule
 * when this card is on screen (V2-13.13, V2-16.3): the reader who wants to
 * study anyway is told where to, rather than being left at a dead end.
 */

const STRINGS = {
  en: {
    grades: { easier: "Knew it", harder: "Didn't know it" },
    settled: "Already graded today",
    menu: {
      open: "Menu",
      side: { front: "Front first", back: "Back first", random: "Random side" },
      pool: { deck: "This deck", all: "Everything you have seen" },
      scope: { due: "Due today", every: "Every card" },
    },
    done: {
      category: "done",
      frontText: "Nothing to repeat today",
      frontDetails: "Tap this card",
      backText: "Come back tomorrow",
      backDetails: "or open the menu to study anyway",
    },
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
        backText: "It comes back tomorrow",
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
    settled: "Heute schon bewertet",
    menu: {
      open: "Menü",
      side: { front: "Vorderseite zuerst", back: "Rückseite zuerst", random: "Zufällige Seite" },
      pool: { deck: "Dieser Stapel", all: "Alles, was du gesehen hast" },
      scope: { due: "Heute dran", every: "Alle Karten" },
    },
    done: {
      category: "geschafft",
      frontText: "Heute nichts zu wiederholen",
      frontDetails: "Tippe auf diese Karte",
      backText: "Komm morgen wieder",
      backDetails: "oder öffne das Menü, um trotzdem zu lernen",
    },
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
        backText: "Sie kommt morgen wieder",
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
    settled: "Сегодня уже оценено",
    menu: {
      open: "Меню",
      side: { front: "Сначала лицевая", back: "Сначала обратная", random: "Случайная сторона" },
      pool: { deck: "Эта колода", all: "Всё, что ты видел" },
      scope: { due: "На сегодня", every: "Все карточки" },
    },
    done: {
      category: "готово",
      frontText: "Сегодня повторять нечего",
      frontDetails: "Нажми на эту карточку",
      backText: "Возвращайся завтра",
      backDetails: "или открой меню, чтобы учить дальше",
    },
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
        backText: "Она вернётся завтра",
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
