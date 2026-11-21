// Looksee's own pictures (public/pic/, copied from David's picture library by
// `npm run icons`). They stand in for emoji where the library has a picture:
// a word's own picture is named in its line (routine.js, LETTERS, videos.js,
// weather.js); here are the ones for icons, by the emoji they replace, where a
// picture is wanted (the choosers). An emoji with no picture stays an emoji.

export const PIC_DIR = 'pic'
export const picSrc = (name) => `${PIC_DIR}/${name}.avif`

const BY_EMOJI = {
  '✏': 'pencil', '📚': 'book', '📖': 'book', '🍎': 'apple', '🥪': 'sandwich', '🎨': 'paints', '🚌': 'bus', '🚗': 'car',
  '🐠': 'clownfish', '👋': 'wave', '☀': 'sun', '🚶': 'walk', '🍽': 'plate', '🧩': 'puzzle', '🏫': 'school', '🧸': 'teddy',
  '🌍': 'earth', '⏱': 'clock', '🌙': 'moon', '📺': 'television', '🌡': 'thermometer', '🎶': 'music-box', '🎵': 'xylophone',
  '➕': 'abacus', '😊': 'proud', '🐾': 'dog', '🚪': 'door', '🛝': 'slide'
}
export const ICON_PICS = Object.values(BY_EMOJI)

// The line icons (public/ui.svg), by the emoji they stand for: what the dock,
// the bars and Settings draw, in one colour. Slides keep the pictures.
const L = {}
'✏pencil 📚book 📖book 🍎apple 🥪sandwich 🎨palette 🚌bus 🚗car 🐠fish 👋hand ☀sun 🚶walk 🍽fork 🧩puzzle 🏫school 🧸bear 🌍globe ⏱timer 🌙moon 📺tv 🌡thermo 🎶music 🎵music ➕plus 😊smile 🐾paw 🚪door 🛝slide 🔤abc 🔢123 💯100 ↔arrows 🎬pip ⛶full ⏭skip'
  .split(' ')
  .forEach((x) => {
    const [g] = x
    L[g] = x.slice(g.length)
  })
export const LINES = Object.values(L)

// A string of emoji, one entry each: [the emoji, its picture's name, its line icon's name]
// (either may be undefined).
export function icons(text) {
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(text)].map((x) => x.segment) : [...text]
  return seg.map((g) => [g, BY_EMOJI[(g = g.replace(/️/g, ''))], L[g]])
}
