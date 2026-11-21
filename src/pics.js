// Looksee's own pictures (public/pic/, copied from David's picture library by
// `npm run icons`). They stand in for emoji where the library has a picture:
// a word's own picture is named in its line (routine.js, LETTERS, videos.js,
// weather.js); here are the ones for icons, by the emoji they replace, on the
// school-day bar and the dock. An emoji with no picture stays an emoji.

export const PIC_DIR = 'pic'
export const picSrc = (name) => `${PIC_DIR}/${name}.avif`

const BY_EMOJI = {
  '✏': 'pencil', '📚': 'book', '📖': 'book', '🍎': 'apple', '🥪': 'sandwich', '🎨': 'paints', '🚌': 'bus', '🚗': 'car',
  '🐠': 'clownfish', '👋': 'wave', '☀': 'sun', '🚶': 'walk', '🍽': 'plate', '🧩': 'puzzle', '🏫': 'school', '🧸': 'teddy',
  '🌍': 'earth', '⏱': 'clock', '🌙': 'moon'
}
export const ICON_PICS = Object.values(BY_EMOJI)

// A string of emoji, one entry each: [the emoji, its picture's name or undefined].
export function icons(text) {
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(text)].map((x) => x.segment) : [...text]
  return seg.map((g) => [g, BY_EMOJI[g.replace(/️/g, '')]])
}
