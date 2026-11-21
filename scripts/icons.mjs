// Bring Looksee's own pictures in from David's picture library (npm run icons).
//
// These replace emoji where the library has a picture: the Our day words, the
// letter words, the words around videos, the weather's sky, and the icons on
// the school-day bar and the dock (src/pics.js says where each is used). The
// pictures are David's own, made for this, so they are published with the app
// and stored for offline use.
//
// Each line below is a picture's name here and where it is in the library.
// Every picture is fitted in 512 px and saved as AVIF in public/pic/. It
// contacts nobody and needs ImageMagick. A test checks the folder holds
// exactly the names in src/pics.js. Look at a picture at full size before
// adding it (the library's rule).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('..', import.meta.url))
const lib = process.env.PICTURE_LIBRARY || join(homedir(), 'Code/picture-library')
const max = 'cast/max/classroom/', jo = 'cast/jo/asking/', sam = 'cast/sam/senses/', math = 'cast/ana/math/', act = 'cast/ana/actions/'
const p = (dir, names) => names.split(' ').map((n) => [n, `${dir}${n}`])

const FROM = Object.fromEntries([
  // Our day
  ['wave', act + 'wave'], ['walk', act + 'walk'], ['eat', act + 'eat'], ['drink', act + 'drink'],
  ...p(max, 'goodbye hang-up sit look listen quiet wait line-up stop eyes-forward me'),
  ['wash-hands', 'cast/ana/school-day/wash-hands'], ['help', 'cast/ana/coping/asking-for-help'],
  ...p('projects/order/', 'follow first next last'),
  ...p(jo, 'want more like all-done please thank-you count'), ['no', jo + 'no-thanks'], ['open', jo + 'open-please'],
  ...p(sam, 'see hear smell taste touch sweet sour salty crunchy soft hot cold'),
  ...p(math, 'again how-many less add take-away'), ['more-than', math + 'more'],
  ['equal', 'props/toys/balance-scale'], ['jacket', 'props/winter/fleece-jacket'],
  ...p('props/clothes/', 'cap gloves'), ...p('props/school/', 'backpack folder lunchbox pencil book paints'),
  ...p('props/kitchen/', 'cup spoon'), ['water', 'props/food/water'], ['bus', 'props/vehicles/school-bus'], ['house', 'props/town/house'],
  // letter words
  ...p('props/vehicles/', 'airplane car helicopter'), ...p('props/food/', 'banana juice waffle apple sandwich'),
  ...p('props/wild/', 'dinosaur elephant koala lion monkey tiger unicorn'), ...p('props/nature/', 'flower island ocean sun volcano snowflake cloud raindrop storm moon'),
  ['guitar', 'props/music/guitar'], ['nose', 'cast/ana/body-parts/nose'], ['penguin', 'props/sea/penguin'],
  ...p('props/toys/', 'robot xylophone yo-yo'), ['quesadilla', 'projects/letter-words/cards/q-quesadilla'], ['zoo', 'projects/letter-words/cards/z-zoo'],
  // words around videos, the bar and the dock
  ['dog', 'props/animals/dog'], ['fire-engine', 'props/vehicles/fire-engine'], ['icicles', 'props/winter/icicles'], ['shiver', 'cast/ana/needs/cold'],
  ['clownfish', 'props/sea/clownfish'], ['plate', 'props/home/plate'], ['puzzle', 'props/toys/puzzle-piece'], ['school', 'props/town/school'],
  ['teddy', 'props/toys/teddy-bear'], ['earth', 'props/space/earth'], ['clock', 'props/home/clock'],
  // made for Looksee on 2026-11-20 (props/more/P7-looksee-icons), and more of what was there
  ['door', 'props/classroom/door'], ['slide', 'props/toys/playground-slide'], ['television', 'props/home/television'], ['thermometer', 'props/care/thermometer'],
  ['music-box', 'props/music/music-box'], ['abacus', 'props/toys/abacus'], ...p('props/nature/', 'sun-and-cloud fog drizzle'),
  ['go', 'projects/steps/line-up/go'], ['puppy', 'cast/puppy/poses/happy'], ['friends', 'projects/cast-pictures/cards/four-friends'], ['proud', 'cast/ana/poses/proud']
])

const out = join(here, 'public/pic')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const [name, from] of Object.entries(FROM)) {
  const src = join(lib, from + '.png')
  if (!existsSync(src)) {
    console.error(`No picture at ${src}`)
    process.exit(1)
  }
  execFileSync('magick', [src, '-resize', '512x512>', '-quality', '60', join(out, name + '.avif')])
}
writeFileSync(join(here, 'src/pics.names.js'), `// Written by scripts/icons.mjs: the pictures in public/pic/.\nexport const NAMES = ${JSON.stringify(Object.keys(FROM).sort())}\n`)
console.log(`${Object.keys(FROM).length} pictures, ${execFileSync('du', ['-sk', out], { encoding: 'utf8' }).split('\t')[0]} KB, in public/pic/.`)
