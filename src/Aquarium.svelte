<script>
  // The aquarium: a two-minute sea loop to ask questions from. It is made and
  // proved in David's picture library and copied here by `npm run aquarium`
  // (src/aquarium/, public/aquarium/); this file is only its place on
  // Looksee's stage. It is loaded the first time it is opened.
  //
  // A click on the sea freezes it, for counting. The bar has Freeze, Next
  // question and Show answer; the question shows in the languages the slides
  // use, and a click on it says it. Its four choices are kept apart from the
  // settings, like the timer's (looksee-aquarium-v1).
  import * as S from './aquarium/scene.js'
  import { Stage, loadPictures } from './aquarium/stage.js'
  import { speak } from './speak.js'

  let { s, reduced = false, key = $bindable(null) } = $props()

  const KEY = 'looksee-aquarium-v1'
  const NAMES = { clownfish: 'Clownfish', sub: 'Submarine', speed: 'Speed', water: 'Water' }
  const LABEL = { 0.5: 'Slow', 1: 'Normal', light: 'Light', deep: 'Deep', each: 'New each loop' }
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {}
  let set = $state({ ...S.DEFAULTS, ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => S.CHOICES[k]?.includes(v))) })
  function choose(k, v) {
    if (k === 'speed') rebase()
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

  // The question for the moment showing; its answer only when asked for,
  // since the class sees the screen too.
  let shown = $state.raw(null)
  let answer = $state.raw(null)
  let more = $state(false)
  let dirty = true
  const langs = $derived(s.words === 'both' ? ['en', 'es'] : [s.words])
  const lines = (x) => langs.map((lang) => ({ lang, text: x[lang] }))
  function next() {
    const { loop, t } = at()
    let m = S.MOMENTS.find((x) => x.from > t + 0.25)
    let L = loop
    if (!m) {
      m = S.MOMENTS[0]
      L++
    }
    clock.base = L * S.LOOP + m.from
    clock.at = performance.now()
    dirty = true
    shown = m
    answer = null
  }
  const reveal = () => (answer = shown.answer(set, at().loop))
  key = (k) => (k === ' ' ? freeze() : k === 'arrowright' && next())

  let canvas = $state()
  let failed = $state(false)
  $effect(() => {
    let raf = 0
    let stage
    let gone = false
    const fit = () => {
      stage?.resize(canvas.clientWidth, canvas.clientHeight)
      dirty = true
    }
    const ro = new ResizeObserver(fit)
    const frame = () => {
      if (!frozen || dirty) {
        const { loop, t } = at()
        stage.draw(t, set, loop)
        const m = S.momentAt(t)
        if (m !== shown) {
          shown = m
          answer = null
        }
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

<section class="sea" aria-label="Aquarium">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <canvas bind:this={canvas} onclick={freeze} title="Click to freeze"></canvas>
  {#if failed}<p class="card" role="status">The aquarium's pictures could not be loaded.</p>{/if}
  {#if shown}
    <button class="card" onclick={() => speak(lines(answer ?? shown.ask))} title="Click to hear it">
      {#each lines(shown.ask) as l (l.lang)}<span lang={l.lang}>{l.text}</span>{/each}
      {#if answer}{#each lines(answer) as l (l.lang)}<b lang={l.lang}>{l.text}</b>{/each}{/if}
    </button>
  {/if}
  {#if more}
    <div class="opts">
      {#each Object.entries(S.CHOICES) as [k, vs] (k)}
        <div class="row" role="group" aria-label={NAMES[k]}>
          <span>{NAMES[k]}</span>
          {#each vs as v (v)}
            {@const c = k === 'sub' && v !== 'each' && S.colourOf(v)}
            <button class="btn" class:sw={c} style={c ? `background:${c.hex}` : ''} aria-label={c ? c.en : undefined} aria-pressed={set[k] === v} onclick={() => choose(k, v)}>{c ? '' : (LABEL[v] ?? v)}</button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
  <nav class="bar" aria-label="Aquarium controls">
    <button class="btn primary" onclick={freeze}>{frozen ? 'Play' : 'Freeze'}</button>
    <button class="btn" onclick={next}>Next question</button>
    {#if shown && !answer}<button class="btn" onclick={reveal}>Show answer</button>{/if}
    <button class="btn" onclick={() => (more = !more)} aria-expanded={more}>Sea</button>
  </nav>
</section>

<style>
  .sea { position: absolute; z-index: 2; inset: var(--bar-h) var(--inset-r) var(--inset-b) var(--inset-l); background: var(--stage-bg); }
  canvas { display: block; width: 100%; height: 100%; cursor: pointer; }
  .card, .opts { position: absolute; left: 50%; translate: -50%; max-width: 92%; background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 14px; font-family: var(--font); }
  .card { top: 16px; padding: 10px 22px; display: grid; gap: 2px; font-size: clamp(18px, 2.6vw, 34px); font-weight: 700; text-align: center; cursor: pointer; }
  .card b { color: var(--brand); }
  .opts { bottom: 84px; padding: 12px; display: grid; gap: 8px; }
  .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .row span { min-width: 6em; font-weight: 700; }
  .row .btn { min-height: 44px; min-width: 44px; }
  .row [aria-pressed='true'] { outline: 3px solid var(--brand); outline-offset: 2px; }
  .bar { position: absolute; left: 0; right: 0; bottom: 18px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .bar .btn { min-height: 52px; padding-inline: 20px; font-size: 17px; }
  :global(.look.quiet) .bar:not(:has(:focus-visible)) { opacity: 0; pointer-events: none; }
</style>
