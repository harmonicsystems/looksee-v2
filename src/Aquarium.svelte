<script>
  // The aquarium: two-minute sea loops to talk and ask about, in three places
  // (the reef, whose five loops take turns; the cove; the shipwreck).
  // It is made and proved in David's picture library and copied here by
  // `npm run aquarium` (src/aquarium/, public/aquarium/); this file is only its
  // place on Looksee's stage. It is loaded the first time it is opened.
  //
  // A click on the sea freezes it, for counting. Each moment has a card with
  // two faces: something to say (the word, a sentence, a starter for the
  // children) and the question, whose answer shows only when asked for. The bar
  // has Freeze, Next, Show answer and the card's other face. The card shows in
  // the languages the slides use, and a click on it says it. Its choices are
  // kept apart from the settings, like the timer's (looksee-aquarium-v1).
  import * as S from './aquarium/scene.js'
  import { Stage, loadPictures } from './aquarium/stage.js'
  import { speak } from './speak.js'

  let { s, reduced = false, key = $bindable(null) } = $props()

  const KEY = 'looksee-aquarium-v1'
  const NAMES = { clownfish: 'Clownfish', sub: 'Submarine', speed: 'Speed', water: 'Water', card: 'Cards open on', place: 'Place', loops: 'Loop' }
  const LABEL = { 0.5: 'Slow', 1: 'Normal', light: 'Light', deep: 'Deep', each: 'New each loop', say: 'Something to say', ask: 'The question', turn: 'All in turn', ...Object.fromEntries([...S.PLACES, ...S.LOOPS].map((l) => [l.id, l.en])) }
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {}
  let set = $state({ ...S.DEFAULTS, ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => S.CHOICES[k]?.includes(v))) })
  // A loop held on the screen says which place it is.
  if (set.loops !== 'turn') set.place = S.placeOf(set.loops)
  function choose(k, v) {
    if (k === 'speed') rebase()
    // Another place: its loops in turn, from the start. The floor changes, so the sea fades in.
    if (k === 'place' && v !== set.place) {
      set.loops = 'turn'
      clock.base = 0
      clock.at = performance.now()
      shown = null
      if (!reduced) canvas.animate({ opacity: [0, 1] }, 500)
    }
    // Another loop: it starts where this one is in its two minutes, as loop 0.
    if (k === 'loops') {
      clock.base = at().t
      clock.at = performance.now()
      shown = null
    }
    set[k] = v
    dirty = true
    try {
      localStorage.setItem(KEY, JSON.stringify(set))
    } catch {}
  }

  // Scene time in seconds, frozen or running at the chosen speed.
  const clock = { base: 0, at: performance.now() }
  let frozen = $state(reduced)
  const now = () => (frozen ? clock.base : clock.base + ((performance.now() - clock.at) / 1000) * set.speed)
  function rebase() {
    clock.base = now()
    clock.at = performance.now()
  }
  function freeze() {
    rebase()
    frozen = !frozen
    dirty = true
  }
  const at = () => {
    const T = now()
    const loop = Math.floor(T / S.LOOP)
    return { loop, t: T - loop * S.LOOP }
  }

  // The card for the moment showing. Its answer shows only when asked for,
  // since the class sees the screen too.
  let shown = $state.raw(null)
  let L = $state(0)
  let open = $state(false)
  let more = $state(false)
  let dirty = true
  const c = $derived(shown && S.tell(shown, set, L))
  const asking = $derived(!!c?.ask && set.card === 'ask')
  const langs = $derived(s.words === 'both' ? ['en', 'es'] : [s.words])
  const lines = (x) => langs.map((lang) => ({ lang, text: x[lang] }))
  function show(m, loop) {
    shown = m
    L = loop
    open = false
  }
  // Next: the next moment, or the next one with a question while the question
  // face shows; it may be in the loop that follows.
  function next() {
    const { loop, t } = at()
    const wanted = (n) => S.momentsOf(set, n).filter((x) => set.card !== 'ask' || x.ask)
    let n = loop
    let m = wanted(n).find((x) => x.from > t + 0.25)
    for (let k = 0; !m && k <= S.LOOPS.length; k++) m = wanted(++n)[0]
    if (!m) return
    clock.base = n * S.LOOP + m.from
    clock.at = performance.now()
    dirty = true
    show(m, n)
  }
  key = (k) => (k === ' ' ? freeze() : k === 'arrowright' && next())

  let canvas = $state()
  let failed = $state(false)
  $effect(() => {
    let raf = 0
    let stage
    let gone = false
    // The canvas runs on under the dock (--under), so the dock's glass has the
    // real sea behind it. The scene itself is fitted to the part in view: what
    // lies under the dock is the sea beyond the scene's left edge.
    const fit = () => {
      if (!stage) return
      stage.resize(canvas.clientWidth, canvas.clientHeight)
      const u = (parseFloat(getComputedStyle(canvas).getPropertyValue('--under')) || 0) * (canvas.width / canvas.clientWidth)
      const W = canvas.width - u
      stage.sw = Math.min(W, canvas.height * S.A)
      stage.sh = stage.sw / S.A
      stage.ox = u + (W - stage.sw) / 2
      stage.oy = (canvas.height - stage.sh) / 2
      dirty = true
    }
    const ro = new ResizeObserver(fit)
    const frame = () => {
      if (!frozen || dirty) {
        const { loop, t } = at()
        stage.draw(t, set, loop)
        const m = S.momentAt(t, set, loop)
        if (m !== shown) show(m, loop)
        dirty = false
      }
      raf = requestAnimationFrame(frame)
    }
    loadPictures(new URL('aquarium/', document.baseURI).href).then(
      (pics) => {
        if (gone) return
        stage = new Stage(canvas, pics)
        ro.observe(canvas)
        fit()
        raf = requestAnimationFrame(frame)
      },
      () => (failed = true)
    )
    // Leaving the aquarium stops it: no frames are drawn behind the slides.
    return () => {
      gone = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      stage = null
      key = null
    }
  })
</script>

<!-- Both languages on one line, to keep the card short. -->
{#snippet pair(x)}{#each lines(x) as l, i (l.lang)}{i ? ' · ' : ''}<span lang={l.lang}>{l.text}</span>{/each}{/snippet}

<!-- Esc closes the Sea panel first, before the app's own Esc leaves the aquarium. -->
<svelte:window
  onkeydowncapture={(e) => {
    if (more && e.key === 'Escape') {
      more = false
      e.stopImmediatePropagation()
    }
  }}
/>

<section class="sea" aria-label="Aquarium">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <canvas bind:this={canvas} onclick={() => (more ? (more = false) : freeze())} title={more ? 'Click to close' : 'Click to freeze'}></canvas>
  {#if failed}<p class="card" role="status">The aquarium's pictures could not be loaded.</p>{/if}
  {#if c}
    <button class="card" onclick={() => speak(lines(asking ? (open ? c.answer : c.ask) : c.say))} title="Click to hear it">
      {#if asking}
        {#each lines(c.ask) as l (l.lang)}<span lang={l.lang}>{l.text}</span>{/each}
        {#if open}<b>{@render pair(c.answer)}</b>{/if}
      {:else}
        <b>{@render pair(c.word)}</b>
        {#each lines(c.say) as l (l.lang)}<span lang={l.lang}>{l.text}</span>{/each}
        <i>{@render pair(c.start)}</i>
      {/if}
    </button>
  {/if}
  {#if more}
    <!-- The sea's choices: a panel beside the dock, the same glass, so nothing on the sea moves. -->
    <div class="opts" role="group" aria-label="Sea">
      <div class="row head"><b>Sea</b><button class="btn" onclick={() => (more = false)}>Close</button></div>
      {#each Object.entries(S.CHOICES) as [k, all] (k)}
        <!-- Only the loops of the place showing; no row where the place has one loop. -->
        {@const vs = k === 'loops' ? ['turn', ...S.loopsAt(set.place).map((l) => l.id)] : all}
        <div class="row" role="group" aria-label={NAMES[k]} hidden={k === 'loops' && vs.length < 3}>
          <span>{NAMES[k]}</span>
          {#each vs as v (v)}
            {@const c = k === 'sub' && v !== 'each' && S.colourOf(v)}
            <button class="btn" class:sw={c} style={c ? `background:${c.hex}` : ''} aria-label={c ? c.en : undefined} aria-pressed={set[k] === v} onclick={() => choose(k, v)}>{c ? '' : ((k !== 'clownfish' && LABEL[v]) || v)}</button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
  <nav class="bar" aria-label="Aquarium controls">
    <button class="btn primary" onclick={freeze}>{frozen ? 'Play' : 'Freeze'}</button>
    <button class="btn" onclick={next}>Next</button>
    {#if asking && !open}<button class="btn" onclick={() => (open = true)}>Show answer</button>{/if}
    {#if c?.ask}<button class="btn" onclick={() => choose('card', asking ? 'say' : 'ask')}>{asking ? 'Something to say' : 'Question'}</button>{/if}
    <button class="btn" onclick={() => (more = !more)} aria-expanded={more}>Sea</button>
  </nav>
</section>

<style>
  .sea { position: absolute; z-index: 2; inset: var(--bar-h) var(--inset-r) var(--inset-b) calc(var(--inset-l) - var(--under)); background: var(--stage-bg); }
  canvas { display: block; width: 100%; height: 100%; cursor: pointer; }
  .card { position: absolute; top: 12px; left: calc(50% + var(--under) / 2); translate: -50%; max-width: calc(92% - var(--under)); padding: 6px 18px; display: grid; background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 14px; font-family: var(--font); font-size: clamp(15px, 1.8vw, 26px); line-height: 1.25; font-weight: 700; text-align: center; cursor: pointer; }
  .card b { color: var(--brand); }
  .card b span, .card i span { display: inline; }
  .card i { font-style: normal; font-weight: 400; font-size: 0.8em; }
  .opts { position: absolute; z-index: 1; top: 0; bottom: 0; left: var(--under); width: min(276px, 100%); padding: 12px; overflow: auto; display: grid; align-content: start; gap: 14px; background: color-mix(in srgb, var(--bg) 85%, transparent); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); color: var(--ink); border-right: 1px solid var(--line); font-family: var(--font); }
  .row[hidden] { display: none; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; }
  .row > span { flex-basis: 100%; font-size: 13px; }
  .head { justify-content: space-between; align-items: center; }
  .row .btn { min-height: 44px; min-width: 44px; }
  .row [aria-pressed='true'] { background: var(--pick); border-color: var(--brand); box-shadow: inset 0 0 0 1px var(--brand); }
  .row .sw[aria-pressed='true'] { outline: 3px solid var(--brand); outline-offset: 2px; }
  .bar { position: absolute; left: var(--under); right: 0; bottom: 18px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .bar .btn { min-height: 52px; padding-inline: 20px; font-size: 17px; }
  :global(.look.quiet) .bar:not(:has(:focus-visible)) { opacity: 0; pointer-events: none; }
</style>
