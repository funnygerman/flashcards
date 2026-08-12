/**
 * @flashcards/library demo (T-10).
 *
 * A library-only showcase: a real `FlashcardDeck`, mounted straight from
 * `../dist/index.js`, with a small sample deck defined inline right here —
 * no router, no content pipeline, no application code. That's the
 * application's own demo deck's job (T-20's `everyday-german`, mounted by
 * T-31); this page exists purely to prove the library works and looks right
 * on a real device, from this task onward.
 */
import { FlashcardDeck } from "@flashcards/library";

const cards = [
  { front: { text: "What is the capital of Japan?" }, back: { text: "Tokyo" }, category: "Geography" },
  {
    front: { text: "H₂O is the chemical formula for…" },
    back: { text: "Water", details: "Two hydrogen atoms, one oxygen atom." },
    category: "Science",
  },
  { front: { text: "2 + 2 × 2 = ?" }, back: { text: "6", details: "Multiplication before addition." }, category: "Math" },
  {
    front: { text: "Who painted the Mona Lisa?" },
    back: { text: "Leonardo da Vinci" },
    category: "Art",
  },
  { front: { text: "What is the largest planet in the solar system?" }, back: { text: "Jupiter" }, category: "Science" },
  {
    front: { text: "In how many days does the Moon orbit the Earth?" },
    back: { text: "About 27.3 days", details: "The sidereal month." },
    category: "Science",
  },
  { front: { text: "What is the smallest prime number?" }, back: { text: "2" }, category: "Math" },
  { front: { text: "Which ocean is the largest?" }, back: { text: "The Pacific Ocean" }, category: "Geography" },
];

const shownCounter = document.querySelector("#shown-count");
const shownIndices = new Set();

new FlashcardDeck("#deck", cards, {
  showCategory: true,
  title: {
    text: "@flashcards/library",
    subtitle: "A small sample deck, mounted straight from source.",
  },
  info: {
    heading: "About this demo",
    body: "This page showcases the FlashcardDeck component on its own, with no application or content pipeline involved.",
  },
  onCardShown(index) {
    shownIndices.add(index);
    shownCounter.textContent = `Cards shown: ${shownIndices.size} / ${cards.length}`;
  },
  onFlip(index, side) {
    console.log(`[flashcards] card ${index} flipped to ${side}`);
  },
  onGrade(index, grade) {
    console.log(`[flashcards] card ${index} graded "${grade}"`);
  },
});
