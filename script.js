// BiRAGAS Investor Presentation
// 3D slide deck with per-slide synchronized audio narration

const state = {
  current: -1,
  slides: [],
  audio: null,    // narration (per-slide)
  music: null,    // ambient pad (looping background)
  autoplay: true,
  started: false,
  unlocked: false,
  advanceTimer: null,
  musicOn: true,
};

// Music volume levels — narration ducks the pad
const MUSIC_BASE   = 0.42;   // when no narration
const MUSIC_DUCKED = 0.16;   // while narration is speaking

function toast(msg, isErr) {
  const t = document.querySelector("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle("err", !!isErr);
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 3500);
}

// ────────────────────────────────────────────────────────────
// SLIDE TEMPLATING
// ────────────────────────────────────────────────────────────

function renderSlide(slide, idx, total) {
  const hasScreen = !!slide.screen;
  const slideEl = document.createElement("div");
  slideEl.className = "slide" + (hasScreen ? " has-screen" : "");
  slideEl.dataset.accent = slide.accent || "paper";
  slideEl.dataset.id = slide.id;
  slideEl.dataset.idx = idx;

  let mainHTML = "";

  // Title slide (01)
  if (slide.id === "01") {
    mainHTML = `
      <div class="copy" style="text-align:center; align-items:center;">
        <div class="kicker">${slide.kicker}</div>
        <div class="title">
          BiRAGAS<br><em>Demo.</em>
        </div>
        <div class="headline" style="max-width: 1100px; text-align:center;">
          ${slide.headline}
        </div>
        <div class="subhead" style="text-align:center; max-width: 880px;">
          ${slide.subhead}
        </div>
      </div>
    `;
  }
  // Problem slide (02) — stats
  else if (slide.id === "02") {
    mainHTML = `
      <div class="copy">
        <div class="kicker">${slide.kicker}</div>
        <div class="headline">${slide.headline}</div>
        <div class="subhead">${slide.subhead}</div>
        <div class="stats">
          <div class="stat">
            <div class="n">95<small style="font-size:0.4em;">%</small></div>
            <div class="l">Late-stage trial failures</div>
          </div>
          <div class="stat">
            <div class="n">$2.6<small style="font-size:0.4em;">B</small></div>
            <div class="l">Avg. cost per approved drug</div>
          </div>
          <div class="stat">
            <div class="n">10+<small style="font-size:0.5em;"></small></div>
            <div class="l">Years from target to market</div>
          </div>
        </div>
      </div>
    `;
  }
  // Thesis slide (03) — pillars
  else if (slide.id === "03") {
    mainHTML = `
      <div class="copy">
        <div class="kicker">${slide.kicker}</div>
        <div class="title">${slide.title}</div>
        <div class="headline">${slide.headline}</div>
        <div class="subhead">${slide.subhead}</div>
        <div class="pillars">
          <div class="pillar">
            <div class="n">01 · Retrieve</div>
            <div class="t">Source-linked evidence from every layer of biology.</div>
          </div>
          <div class="pillar">
            <div class="n">02 · Reason</div>
            <div class="t">Pearl's causal calculus on a unified DAG.</div>
          </div>
          <div class="pillar">
            <div class="n">03 · Validate</div>
            <div class="t">MR, perturbation, and pathway causality, before output.</div>
          </div>
        </div>
      </div>
    `;
  }
  // Final / Ask slide (15)
  else if (slide.id === "15") {
    mainHTML = `
      <div class="copy" style="text-align:center; align-items:center;">
        <div class="kicker">${slide.kicker}</div>
        <div class="title">The <em>Ask.</em></div>
        <div class="headline" style="max-width: 1200px; text-align:center;">
          ${slide.headline}
        </div>
        <div class="subhead" style="text-align:center; max-width: 1100px;">
          ${slide.subhead}
        </div>
        <div class="ask-grid">
          <div class="ask-cell">
            <div class="k">Round</div>
            <div class="v">SAFE · <span class="red">$40M cap</span></div>
          </div>
          <div class="ask-cell">
            <div class="k">Use of proceeds</div>
            <div class="v">FDA · CLIA · CDx</div>
          </div>
          <div class="ask-cell">
            <div class="k">Vision</div>
            <div class="v">Causal becomes the <span class="red">default</span></div>
          </div>
        </div>
      </div>
    `;
  }
  // Standard content slides (with or without screenshot)
  else {
    const copyBlock = `
      <div class="copy">
        <div class="kicker">${slide.kicker}</div>
        <div class="title">${slide.title}</div>
        <div class="headline">${slide.headline}</div>
        <div class="subhead">${slide.subhead}</div>
      </div>
    `;
    const screenBlock = hasScreen ? `
      <div class="screen-wrap">
        <div class="screen-card" data-tag="LIVE · BiRAGAS APPLICATION">
          <img src="screens/${slide.screen}" alt="${slide.title}" loading="eager" />
        </div>
      </div>
    ` : "";
    mainHTML = copyBlock + screenBlock;
  }

  slideEl.innerHTML = `
    <div class="stage-bg"></div>
    <div class="frame">
      <div class="folio">
        <div class="brand">BiRAGAS · ${slide.id}/${total.toString().padStart(2,"0")}</div>
        <div class="right">${slide.kicker}</div>
      </div>
      <div class="content">${mainHTML}</div>
      <div class="foot">
        <div class="step-pill">
          <span class="dot"></span>
          <span>Slide ${idx + 1} of ${total}</span>
        </div>
        <div class="progress"><div class="fill" style="--p: ${((idx + 1) / total) * 100}%"></div></div>
        <div>Ayass Bioscience · MMXXVI</div>
      </div>
    </div>
  `;
  return slideEl;
}

// ────────────────────────────────────────────────────────────
// NAVIGATION
// ────────────────────────────────────────────────────────────

function showSlide(newIdx, dir = "forward") {
  const total = state.slides.length;
  newIdx = Math.max(0, Math.min(total - 1, newIdx));
  if (newIdx === state.current) return;
  const deck = document.querySelector(".deck");
  const prevIdx = state.current;
  [...deck.children].forEach((el, i) => {
    el.classList.remove("active", "exiting", "entering");
    if (i === newIdx) {
      el.classList.add("active");
    } else if (i === prevIdx && prevIdx !== newIdx && prevIdx >= 0) {
      // show the slide we're leaving for the duration of the transition
      el.classList.add(dir === "back" ? "entering" : "exiting");
      setTimeout(() => el.classList.remove("exiting", "entering"), 1000);
    }
  });
  state.current = newIdx;
  playAudio(newIdx);
  updateChrome();
}

function next() { showSlide(state.current + 1, "forward"); }
function prev() { showSlide(state.current - 1, "back"); }

function clearAdvance() {
  if (state.advanceTimer) {
    clearTimeout(state.advanceTimer);
    state.advanceTimer = null;
  }
}

function playAudio(idx) {
  clearAdvance();
  const slide = state.slides[idx];
  if (!slide) return;
  const a = state.audio;
  a.pause();
  a.src = `audio/slide-${slide.id}.mp3`;
  a.currentTime = 0;
  if (!state.autoplay) return;
  const p = a.play();
  if (p && typeof p.catch === "function") {
    p.catch((e) => {
      console.warn("audio play blocked", e);
      // Fallback: schedule auto-advance after estimated narration length
      const dur = a.duration || estimateDuration(slide.narration);
      toast("Audio blocked — click any slide to unlock");
      state.advanceTimer = setTimeout(() => {
        if (state.autoplay && state.current === idx) next();
      }, dur * 1000 + 1500);
    });
  }
}

function estimateDuration(text) {
  // ~2.5 words/sec
  const words = (text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(6, words / 2.5);
}

function updateChrome() {
  const ctrl = document.querySelector("#autoplay-btn");
  if (ctrl) {
    ctrl.classList.toggle("off", !state.autoplay);
    ctrl.innerHTML = state.autoplay ? "▶ Auto · ON" : "❚❚ Auto · OFF";
  }
  const counter = document.querySelector("#counter");
  if (counter && state.slides.length) {
    counter.textContent = `${(state.current + 1).toString().padStart(2,"0")} / ${state.slides.length.toString().padStart(2,"0")}`;
  }
}

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────

async function loadSlides() {
  // Try embedded data first (works from file:// without a server)
  if (typeof window.__SLIDES__ !== "undefined") return window.__SLIDES__;
  try {
    const res = await fetch("slides.json");
    return await res.json();
  } catch (e) {
    console.error("Could not load slides.json — embed it inline as window.__SLIDES__", e);
    return [];
  }
}

function makeAudio() {
  const a = new Audio();
  a.preload = "auto";
  a.crossOrigin = "anonymous";
  a.addEventListener("play",  () => duckMusic(true));
  a.addEventListener("ended", () => {
    duckMusic(false);
    if (state.autoplay && state.current < state.slides.length - 1) {
      state.advanceTimer = setTimeout(() => next(), 600);
    }
  });
  a.addEventListener("pause", () => duckMusic(false));
  a.addEventListener("error", (e) => {
    console.warn("audio error", e, a.src);
    toast("Audio file failed to load", true);
  });
  return a;
}

function makeMusic() {
  const m = new Audio("audio/ambient.mp3");
  m.preload = "auto";
  m.loop = true;
  m.volume = MUSIC_BASE;
  m.addEventListener("error", (e) => {
    console.warn("music error", e);
  });
  return m;
}

function duckMusic(speaking) {
  const m = state.music;
  if (!m || !state.musicOn) return;
  const target = speaking ? MUSIC_DUCKED : MUSIC_BASE;
  // simple fade
  const start = m.volume;
  const startT = performance.now();
  const dur = 600;
  function step(t) {
    const e = Math.min(1, (t - startT) / dur);
    const eased = 1 - Math.pow(1 - e, 3);
    m.volume = start + (target - start) * eased;
    if (e < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function toggleMusic() {
  state.musicOn = !state.musicOn;
  const m = state.music;
  if (!m) return;
  if (state.musicOn) {
    m.volume = state.audio && !state.audio.paused ? MUSIC_DUCKED : MUSIC_BASE;
    m.play().catch(() => {});
  } else {
    m.pause();
  }
  const btn = document.querySelector("#music-btn");
  if (btn) {
    btn.classList.toggle("off", !state.musicOn);
    btn.innerHTML = state.musicOn ? "♪ Music · ON" : "♪ Music · OFF";
  }
}

// Unlock audio playback on the first user gesture (browser policy).
function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  // start the ambient music
  if (state.music && state.musicOn) {
    state.music.play().catch(err => console.warn("music play blocked", err));
  }
}

function toggleAutoplay() {
  state.autoplay = !state.autoplay;
  if (state.autoplay) {
    const p = state.audio.play();
    if (p && p.catch) p.catch(()=>{});
  } else {
    state.audio.pause();
    clearAdvance();
  }
  updateChrome();
}

async function init() {
  state.slides = await loadSlides();
  state.audio = makeAudio();
  state.music = makeMusic();
  const deck = document.querySelector(".deck");
  state.slides.forEach((s, i) => deck.appendChild(renderSlide(s, i, state.slides.length)));

  // start gate
  const gate = document.querySelector(".gate");
  const startBtn = document.querySelector("#start-btn");
  startBtn.addEventListener("click", () => { unlockAudio(); start(0); });
  gate.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") return;
    unlockAudio(); start(0);
  });

  // navbar controls
  document.querySelector("#prev-btn").addEventListener("click", () => { unlockAudio(); prev(); });
  document.querySelector("#next-btn").addEventListener("click", () => { unlockAudio(); next(); });
  document.querySelector("#restart-btn").addEventListener("click", () => {
    unlockAudio();
    state.audio.currentTime = 0;
    if (state.autoplay) state.audio.play().catch(()=>{});
  });
  document.querySelector("#autoplay-btn").addEventListener("click", () => {
    unlockAudio(); toggleAutoplay();
  });
  document.querySelector("#music-btn").addEventListener("click", () => {
    unlockAudio(); toggleMusic();
  });

  // click-to-advance zones
  document.querySelector("#zone-prev").addEventListener("click", () => { unlockAudio(); prev(); });
  document.querySelector("#zone-next").addEventListener("click", () => { unlockAudio(); next(); });

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (!state.started) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
      e.preventDefault(); unlockAudio(); next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); unlockAudio(); prev();
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      unlockAudio(); toggleAutoplay();
    } else if (e.key === "Home") { unlockAudio(); state.current = -1; showSlide(0); }
      else if (e.key === "End") { unlockAudio(); state.current = -1; showSlide(state.slides.length - 1); }
  });

  // navbar stays visible; subtle dim only after long idle
  let dimTimer;
  const navbar = document.querySelector("#navbar");
  function bump() {
    navbar.classList.remove("dim");
    clearTimeout(dimTimer);
    dimTimer = setTimeout(() => navbar.classList.add("dim"), 8000);
  }
  document.addEventListener("mousemove", bump);
  document.addEventListener("keydown", bump);
  document.addEventListener("click", bump);
  bump();

  updateChrome();
}

function start(startIdx = 0) {
  if (state.started) return;
  state.started = true;
  document.querySelector(".gate").classList.add("hidden");
  state.current = -1;  // force showSlide to run for index 0
  showSlide(startIdx);
}

window.addEventListener("DOMContentLoaded", async () => {
  await init();
  // Honor ?slide=N&autostart=1 (1-indexed) for headless capture / direct links
  const params = new URLSearchParams(location.search);
  const slideParam = parseInt(params.get("slide") || "0", 10);
  if (params.get("autostart") === "1" || slideParam > 0) {
    state.autoplay = params.get("autoplay") !== "0";
    start(Math.max(0, slideParam - 1));
  }
});
