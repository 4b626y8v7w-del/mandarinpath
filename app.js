/* MandarinPath app engine.
 *
 * Everything runs offline: no network calls, no account, all progress in
 * localStorage under one versioned key.
 */
(function () {
  "use strict";

  const M = window.MP;
  const SRS = window.MP_SRS;
  const STORE_KEY = "mandarinpath.v1";
  const CJK = /[\u3400-\u9FFF\uF900-\uFAFF]/;
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── State ─────────────────────────────────────────────────────────── */
  function defaultState() {
    return {
      version: 1,
      xp: 0,
      hearts: 5,
      maxHearts: 5,
      streak: 0,
      lastActiveDay: null,
      completed: {},          // lessonId -> timestamp
      cards: {},              // cardKey -> SRS record
      introduced: {},         // cardKey -> timestamp (seen at least once)
      settings: {
        sound: true,
        haptics: true,
        speechRate: 0.7,   // beginner default; iOS TTS range is ~0.5-1.6
        showEnglish: true, // reveal the English meaning before answering
        showPinyin: true,  // show pinyin on English->Chinese prompts
        theme: "jade",
        tracePractice: true,
        dailyGoal: 20
      },
      session: { lessonId: null, index: 0 },
      onboarded: false,
      xpToday: 0,
      xpDay: null,
      goalMetEver: false,
      achievements: {},
      toneScores: [],
      traceAttempts: 0,
      builtSentences: 0
    };
  }

  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return Object.assign(base, parsed, {
        settings: Object.assign(base.settings, parsed.settings || {}),
        session: Object.assign(base.session, parsed.session || {})
      });
    } catch (e) {
      console.warn("[MandarinPath] corrupt save discarded", e);
      return defaultState();
    }
  }

  let saveTimer = null;
  let saveFailed = false;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(S));
        if (saveFailed) {
          saveFailed = false;
          const bar = $("#errorBar");
          if (bar) bar.hidden = true;
        }
      } catch (e) {
        // Progress lives only in this phone's storage, and iOS evicts unused
        // web-app data. Failing silently would mean losing a streak with no
        // warning, so say so loudly and point at the export button.
        if (!saveFailed) {
          saveFailed = true;
          toast("Could not save — export your progress in Settings");
          const bar = $("#errorBar");
          if (bar) {
            bar.hidden = false;
            bar.textContent =
              "Progress could not be saved (storage unavailable). " +
              "Use Settings → Export progress to save a copy.";
          }
        }
      }
    }, 150);
  }

  /* ── Day streak ────────────────────────────────────────────────────── */
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function touchStreak() {
    const today = dayKey();
    if (S.lastActiveDay === today) return;
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    S.streak = S.lastActiveDay === yesterday ? S.streak + 1 : 1;
    S.lastActiveDay = today;
  }

  /* ── Audio + haptics ───────────────────────────────────────────────── */
  let actx = null;
  function ac() {
    if (!actx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) actx = new Ctor();
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }

  function tone(freq, dur, type, gain) {
    if (!S.settings.sound || reduceMotion) return;
    const a = ac();
    if (!a) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.value = gain || 0.07;
    osc.connect(g);
    g.connect(a.destination);
    const t = a.currentTime;
    g.gain.setValueAtTime(gain || 0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const sfx = {
    correct() {
      tone(523, 0.08, "sine", 0.07);
      setTimeout(() => tone(659, 0.1, "sine", 0.07), 70);
      setTimeout(() => tone(784, 0.14, "triangle", 0.06), 140);
    },
    wrong() {
      tone(180, 0.18, "triangle", 0.06);
      buzz(30);
    },
    finish() {
      if (reduceMotion) return;
      [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.2, "sine", 0.07), 90 * i));
    },
    reward() {
      tone(880, 0.08, "sine", 0.06);
      setTimeout(() => tone(1175, 0.16, "triangle", 0.07), 60);
    }
  };

  function buzz(ms) {
    if (S.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(ms || 18); } catch (e) { /* unsupported */ }
    }
  }

  /* ── Mandarin TTS ──────────────────────────────────────────────────── */
  /* iOS only exposes speech voices after a user gesture, and voices load
   * asynchronously — so we re-resolve on every call rather than caching a
   * stale SpeechSynthesisVoice. */
  let zhVoice = null;
  let voicesResolvedAt = 0;

  function resolveVoice() {
    if (!window.speechSynthesis) return null;
    const voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    // Mandarin-specific first, then anything that says it speaks Chinese.
    const zh = voices.filter((v) => /zh[-_]?(CN|Hans|SG)/i.test(v.lang));
    const wide = voices.filter((v) => /zh|Chinese|中文|普通话/i.test(v.lang + " " + v.name));
    const pool = zh.length ? zh : wide;
    if (!pool.length) return null;
    // Prefer a local voice: remote ones can drop out on a flaky phone network.
    return pool.find((v) => v.localService) || pool[0];
  }

  const SPEECH_STEPS = [0.5, 0.6, 0.7, 0.85, 1.0, 1.25];

    function rateLabel(rate) {
      if (rate <= 0.5) return "0.5× very slow";
      if (rate <= 0.6) return "0.6× slow";
      if (rate <= 0.7) return "0.7× beginner";
      if (rate <= 0.85) return "0.85× natural";
      if (rate < 1) return "1×";
      return "1.25× fast";
    }

    function speak(text, opts) {
      if (!window.speechSynthesis || !text) return;
      opts = opts || {};
      const now = Date.now();
      if (!zhVoice || now - voicesResolvedAt > 5000) {
        zhVoice = resolveVoice();
        voicesResolvedAt = now;
      }
      if (!zhVoice) {
        if (!speak._warned) {
          speak._warned = true;
          console.info("[MandarinPath] No Mandarin voice installed. On iOS: Settings > Accessibility > Spoken Content > Voices > Chinese.");
          toast("No Mandarin voice — see Settings › Accessibility");
        }
        return;
      }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = zhVoice.lang || "zh-CN";
        u.voice = zhVoice;
        // Slow by default: a beginner cannot parse tone contours above ~0.85,
        // and above 1.0 the tones flatten into each other entirely.
        u.rate = opts.rate || S.settings.speechRate || 0.7;
        u.pitch = opts.pitch || 1;
        u.onend = function () {
          document.querySelectorAll(".speaking").forEach((n) => n.classList.remove("speaking"));
        };
        speechSynthesis.speak(u);
      } catch (e) {
        /* some browsers throw if speak() is called too soon after cancel() */
      }
    }

    /* Replays the current audio slowly. Every speaker button gets one of these,
     * because "I heard it but did not catch it" is the normal beginner state. */
    function speakSlow(text) {
      speak(text, { rate: Math.max(0.45, (S.settings.speechRate || 0.7) * 0.65) });
    }

  if (window.speechSynthesis) {
    speechSynthesis.addEventListener("voiceschanged", function () {
      zhVoice = resolveVoice();
      voicesResolvedAt = Date.now();
    });
    resolveVoice();
  }

  /* ── DOM helpers ───────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* The speaker control pair. Two buttons, because "play it again slower" is
   * the single most-used action for a beginner who did not catch the tone. */
  function audioControls(text, id) {
    if (!text) return "";
    return (
      '<div class="audio-pair">' +
        '<button type="button" class="speaker-btn" id="' + (id || "btnSpeak") +
          '" data-say="' + esc(text) + '" aria-label="Play">🔊</button>' +
        '<button type="button" class="speaker-btn slow" data-say-slow="' + esc(text) +
          '" aria-label="Play slowly">🐢</button>' +
      "</div>"
    );
  }

  /* Delegated handlers: works for buttons injected at any point, so every
   * render gets slow-replay without rewiring each screen.
   *
   * Deliberately does NOT stopPropagation. Answer options and tiles carry
   * data-say so tapping them plays the sound, and they also have their own
   * click handlers to record the answer. Stopping propagation here made every
   * Chinese-text option unclickable -- the capture-phase listener ran first
   * and swallowed the event before the option's own handler was reached. */
  document.addEventListener("click", function (e) {
    const fast = e.target.closest && e.target.closest("[data-say]");
    if (fast) { speak(fast.getAttribute("data-say")); return; }
    const slow = e.target.closest && e.target.closest("[data-say-slow]");
    if (slow) { speakSlow(slow.getAttribute("data-say-slow")); }
  }, true);

  /* Rate readout for the settings screen. */
  function applySpeechSettings() {
    S.settings.speechRate = Number(S.settings.speechRate) || 0.7;
    const el = document.getElementById("btnSpeechRate");
    if (el) el.textContent = "🐢 Listening speed: " + rateLabel(S.settings.speechRate);
  }

  /* ── Themes ─────────────────────────────────────────────────────────
   * Three palettes tuned to the dragon mark: jade green (default, echoes the
   * icon field), imperial burgundy, and an ink-on-paper light theme for
   * daytime reading. Values override the demo stylesheet's :root tokens so
   * every component re-colours without touching component CSS. */
  const THEMES = {
    jade: {
      label: "Jade",
      bg: "#0a1510", bg2: "#101d16", screen: "#121C17", card: "#1E2A1F", cardElev: "#243028",
      text: "#F0F7F2", muted: "#9BB0A3", primary: "#22C55E", accent: "#80182E", line: "rgba(155,176,163,.35)"
    },
    imperial: {
      label: "Imperial",
      bg: "#150a0d", bg2: "#1c0e12", screen: "#1E1014", card: "#2A181C", cardElev: "#331D22",
      text: "#F7EDEC", muted: "#C4A8A4", primary: "#C9A227", accent: "#8E1B32", line: "rgba(196,168,164,.32)"
    },
    paper: {
      label: "Paper",
      bg: "#f4efe4", bg2: "#ece4d5", screen: "#fbf7ee", card: "#ffffff", cardElev: "#f7f1e6",
      text: "#20201c", muted: "#6d6a5f", primary: "#12833f", accent: "#8E1B32", line: "rgba(32,32,28,.18)"
    }
  };
  const THEME_ORDER = ["jade", "imperial", "paper"];

  function nextTheme(current) {
    const i = THEME_ORDER.indexOf(current);
    return THEME_ORDER[(i + 1) % THEME_ORDER.length];
  }

  function applyTheme() {
    const key = THEMES[S.settings.theme] ? S.settings.theme : "jade";
    const t = THEMES[key];
    const r = document.documentElement.style;
    r.setProperty("--bg", t.bg);
    r.setProperty("--screen", t.screen);
    r.setProperty("--card", t.card);
    r.setProperty("--card-elev", t.cardElev);
    r.setProperty("--text", t.text);
    r.setProperty("--muted", t.muted);
    r.setProperty("--primary", t.primary);
    r.setProperty("--accent", t.accent);
    r.setProperty("--path-line", t.line);
    document.body.setAttribute("data-theme", key);
    // Keep the browser chrome (status bar area) matching the chosen background.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.bg);
    const btn = document.getElementById("btnTheme");
    if (btn) btn.textContent = "🎨 Theme: " + t.label;
    updateStats();
  }

  function showScreen(id) {
    ["screenSplash", "screenOnboard", "screenMain", "screenLesson", "screenReview", "screenFlip",
     "screenCards", "screenTones", "screenTrace", "screenType", "screenComplete"].forEach((s) => {
      const n = document.getElementById(s);
      if (n) n.hidden = s !== id;
    });
    window.scrollTo(0, 0);
    // Move focus to the new screen so keyboard and screen-reader users are not
    // left behind on the previous one.
    const panel = document.getElementById(id);
    if (panel) {
      panel.setAttribute("tabindex", "-1");
      setTimeout(function () {
        try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
      }, 40);
    }
    announce(SCREEN_NAMES[id] || "");
  }

  const SCREEN_NAMES = {
    screenSplash: "MandarinPath home",
    screenOnboard: "Welcome tour",
    screenMain: "Main menu",
    screenLesson: "Lesson",
    screenReview: "Review session",
    screenFlip: "Flip Match game",
    screenCards: "Flashcards",
    screenTones: "Tone Trainer",
    screenTrace: "Writing practice",
    screenType: "Typing practice",
    screenComplete: "Lesson complete"
  };

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2200);
    announce(msg);
  }

  /* Screen-reader announcements. Quiz feedback and state changes are otherwise
   * silent to VoiceOver, so a blind learner gets no signal that an answer was
   * right. Cleared and rewritten so repeat messages are re-announced. */
  function announce(msg) {
    const live = $("#srLive");
    if (!live) return;
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  function floatXP(n) {
    const f = $("#xpFloat");
    if (!f) return;
    f.textContent = "+" + n + " XP";
    f.hidden = false;
    f.style.animation = "none";
    void f.offsetWidth;
    f.style.animation = "";
    clearTimeout(floatXP._t);
    floatXP._t = setTimeout(() => { f.hidden = true; }, 900);
  }

  function sparkles() {
    const box = $("#sparkles");
    if (!box || reduceMotion) return;
    box.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.textContent = "✨";
      s.style.left = 8 + 84 * Math.random() + "%";
      s.style.bottom = 25 * Math.random() + "%";
      s.style.animationDelay = 0.3 * Math.random() + "s";
      box.appendChild(s);
    }
  }

  /* The review key for a word.
   *
   * All pinyin whitespace is stripped first: the bundles write 你好 as both
   * "nǐhǎo" and "nǐ hǎo", and because the key is zh|pinyin that split one
   * word's review history into two independent cards. Word spacing in pinyin
   * is a readability convention, not part of the pronunciation, so removing it
   * cannot merge two genuinely different words -- only two spellings of the
   * same syllables.
   *
   * Different pinyin for the same characters is NOT normalised: 得 de (the
   * particle) and 得 dé (to obtain) are genuinely different words and deserve
   * separate cards. */
  function cardKey(zh, pinyin) {
    const norm = String(pinyin || "").replace(/\s+/g, "");
    return zh + "|" + norm;
  }

  /* ── Curriculum helpers ────────────────────────────────────────────── */
  const ALL_LESSONS = M.UNITS.reduce((acc, u) => acc.concat(u.lessons), []);

  function lessonState(id) {
    if (S.completed[id]) return "completed";
    if (id === ALL_LESSONS[0].id) return "unlocked";
    const i = ALL_LESSONS.findIndex((l) => l.id === id);
    if (i <= 0) return "locked";
    return S.completed[ALL_LESSONS[i - 1].id] ? "unlocked" : "locked";
  }

  function nextUnfinished() {
    for (const l of ALL_LESSONS) if (!S.completed[l.id]) return l.id;
    return null;
  }

  function introducedWordsIn(lesson) {
    const out = [];
    (lesson.exercises || []).forEach((ex) => {
      if ((ex.type === "teach" || ex.type === "mc" || ex.type === "listen" || ex.type === "speakBack") && ex.prompt !== undefined) {
        const zh = ex.type === "en_to_zh" ? ex.answer : ex.prompt;
        const py = ex.pinyin || "";
        if (CJK.test(String(zh))) out.push({ zh: zh, pinyin: py });
      }
      if (ex.type === "teach" && ex.zh) out.push({ zh: ex.zh, pinyin: ex.pinyin });
    });
    return out;
  }

  function ensureCard(c) {
    const k = cardKey(c.zh, c.pinyin);
    if (!S.cards[k]) S.cards[k] = SRS.newCard(k);
    if (!S.introduced[k]) S.introduced[k] = Date.now();
    return S.cards[k];
  }

  function dueCount(now) {
    now = now || Date.now();
    return Object.keys(S.cards).filter((k) => SRS.isDue(S.cards[k], now)).length;
  }

  /* ── Learn tab ─────────────────────────────────────────────────────── */
  function renderLearn() {
    const box = $("#learnPath");
    if (!box) return;
    const nextId = nextUnfinished();
    let html = "";
    M.UNITS.forEach((u, ui) => {
      const done = u.lessons.filter((l) => S.completed[l.id]).length;
      html +=
        '<div class="chapter-card">' +
          '<div class="chapter-icon" style="background:linear-gradient(135deg,' + u.color + "," + u.color + "cc)\">" + u.icon + "</div>" +
          '<div class="chapter-meta">' +
            '<div class="chapter-label" style="color:' + u.color + '">UNIT ' + (ui + 1) + "</div>" +
            '<div class="chapter-title">' + esc(u.title) + "</div>" +
            '<div class="chapter-sub">' + esc(u.titleZh) + " · " + esc(u.titlePinyin) + "</div>" +
            '<div class="chapter-blurb">' + esc(u.blurb || "") + "</div>" +
          "</div>" +
          '<div class="chapter-prog">' + done + "/" + u.lessons.length + "</div>" +
        "</div>";
      u.lessons.forEach((l, li) => {
        const st = lessonState(l.id);
        const mark = st === "completed" ? "✓" : st === "locked" ? "🔒" : "★";
        html +=
          '<div class="node-row" style="transform:translateX(' + (li % 2 === 0 ? -36 : 36) + 'px)">' +
            '<button type="button" class="node-btn ' + st + (l.id === nextId ? " current" : "") +
              '" data-lesson="' + l.id + '" data-state="' + st + '" aria-label="' + esc(l.title) + '">' +
              mark + (l.id === nextId ? '<span class="node-sparkle">✨</span>' : "") +
            "</button>" +
            '<div class="node-label">' + esc(l.title) + '<span class="zh">' + esc(l.titleZh) + "</span></div>" +
            (li < u.lessons.length - 1 ? '<div class="path-connector"></div>' : "") +
          "</div>";
      });
      if (done === u.lessons.length) {
        html +=
          '<div class="chapter-clear">' +
            "<div><strong>Unit clear</strong><span>Nice work — next unit unlocked.</span></div>" +
          "</div>";
      }
    });
    box.innerHTML = html;

    $$(".node-btn", box).forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = btn.dataset.lesson;
        if (btn.dataset.state === "locked") {
          toast("Clear the previous lesson first");
          return;
        }
        startLesson(id);
      });
    });

    const total = ALL_LESSONS.length;
    const done = ALL_LESSONS.filter((l) => S.completed[l.id]).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const bar = $("#learnBar");
    if (bar) bar.style.width = pct + "%";
    const pctEl = $("#learnPct");
    if (pctEl) pctEl.textContent = pct + "% (" + done + "/" + total + ")";

    const coach = $("#learnCoach");
    if (coach) {
      if (done === 0) {
        coach.hidden = false;
        coach.innerHTML = "🐉 Start with <strong>Tones First</strong> — Mandarin is a tonal language, and tones come before characters.";
      } else if (nextId) {
        coach.hidden = false;
        const l = ALL_LESSONS.find((x) => x.id === nextId);
        coach.innerHTML = "🐉 Next up: <strong>" + esc(l ? l.title : "") + "</strong>. Keep the streak alive.";
      } else {
        coach.hidden = false;
        coach.innerHTML = "🎉 Every lesson cleared. Move to <strong>Practice</strong> to keep the words in long-term memory.";
      }
    }
  }

  /* ── Lesson runner ─────────────────────────────────────────────────── */
  let lesson = null;
  let lessonIdx = 0;
  let locked = false;
  let lessonResults = { correct: 0, total: 0, wrongItems: [], retry: [], retryRounds: 0 };

  function startLesson(id) {
    const l = ALL_LESSONS.find((x) => x.id === id);
    if (!l) return;
    lesson = l;
    lessonIdx = 0;
    locked = false;
    lessonResults = { correct: 0, total: 0, wrongItems: [], retry: [], retryRounds: 0 };
    S.session = { lessonId: id, index: 0 };
    showScreen("screenLesson");
    renderExercise();
  }

  function renderExercise() {
    const ex = lesson.exercises[lessonIdx];
    const total = lesson.exercises.length;
    const fill = $("#lessonProgressFill");
    if (fill) fill.style.width = (lessonIdx / total) * 100 + "%";
    const hb = $("#lessonHearts b");
    if (hb) hb.textContent = S.hearts;
    const fb = $("#feedbackBanner");
    // Clear, not just hide: a stale Continue button left in the DOM is
    // invisible to a tapper but still activatable by keyboard and announced
    // by a screen reader, and it fires against the NEXT exercise.
    if (fb) { fb.hidden = true; fb.innerHTML = ""; }
    const tb = $("#traceFeedback");
    if (tb) { tb.hidden = true; tb.innerHTML = ""; }
    locked = false;

    const body = $("#lessonBody");
    if (!ex) return;
    lessonResults.total++;

    if (ex.type === "teach") {
      body.innerHTML =
        '<div class="dir-label">New word · tap to hear</div>' +
        '<div class="teach-card">' +
          '<div class="teach-zh-row">' +
            '<button type="button" class="teach-zh speakable" id="speakZh" data-say="' + esc(ex.zh) + '">' + esc(ex.zh) + "</button>" +
            '<button type="button" class="speaker-btn info" data-detail="' + esc(ex.zh) +
              '" aria-label="Look up ' + esc(ex.zh) + '">\u2139\ufe0f</button>' +
          "</div>" +
          '<button type="button" class="teach-py speakable" data-say="' + esc(ex.zh) + '">' + esc(ex.pinyin) + "</button>" +
          '<div class="teach-en">' + esc(ex.en) + "</div>" +
          '<p class="teach-hint">Tap the characters to hear · 点击听发音</p>' +
          audioControls(ex.zh) +
        "</div>" +
        (S.settings.tracePractice && CJK.test(ex.zh)
          ? '<button type="button" class="btn btn-ghost trace-open" data-trace="' +
            esc(ex.zh) + '" data-py="' + esc(ex.pinyin) + '">✍️ Write it</button>' : "") +
        '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Got it — continue</button>';
      $("#btnTeachNext").addEventListener("click", nextExercise);
      $$(".trace-open", body).forEach((b) =>
        b.addEventListener("click", () => openTrace(b.getAttribute("data-trace"), b.getAttribute("data-py"))));
      return;
    }

    if (ex.type === "toneSet") {
      body.innerHTML = renderToneTeach(ex.set);
      $("#btnTeachNext").addEventListener("click", nextExercise);
      $$("[data-tone-play]", body).forEach((b) => {
        b.addEventListener("click", () => speak(b.dataset.tonePlay));
      });
      return;
    }

    if (ex.type === "tricky" || ex.type === "phrase" || ex.type === "sentence") {
      const note = ex.type === "tricky" ? ex.note : ex.en;
      const label = ex.type === "tricky" ? "Common mistake · listen closely"
        : ex.type === "sentence" ? "Real sentence · read it aloud"
        : "Say it out loud";
      body.innerHTML =
        '<div class="dir-label">' + label + "</div>" +
        '<div class="teach-card' + (ex.type === "sentence" ? " sentence-card" : "") + '">' +
          '<button type="button" class="teach-zh speakable" data-say="' + esc(ex.zh) + '">' +
            '<span class="sent-zh">' + esc(ex.zh) + "</span>" +
          "</button>" +
          '<div class="teach-py">' + esc(ex.pinyin) + "</div>" +
          '<div class="teach-en">' + esc(note) + "</div>" +
          audioControls(ex.zh) +
        "</div>" +
        (ex.type === "sentence" && S.settings.showPinyin
          ? '<p class="teach-hint">Read it once, then hide it and read from the meaning.</p>' : "") +
        '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Got it — continue</button>';
      $("#btnTeachNext").addEventListener("click", nextExercise);
      return;
    }

    if (ex.type === "num" || ex.type === "measure") {
      // Numbers and measure words. A measure word only makes sense beside the
      // noun it counts, so its example is the point of the card.
      const isMeasure = ex.type === "measure";
      body.innerHTML =
        '<div class="dir-label">' + (isMeasure ? "Measure word · 量词" : "Number · 数字") + "</div>" +
        '<div class="teach-card num-card">' +
          '<div class="num-zh">' + esc(ex.zh) + "</div>" +
          '<div class="teach-py">' + esc(ex.pinyin) + "</div>" +
          '<div class="teach-en">' + esc(ex.en) + "</div>" +
          (ex.exampleZh
            ? '<button type="button" class="g-example" data-say="' + esc(ex.exampleZh) + '">' +
                '<span class="g-zh">' + esc(ex.exampleZh) + "</span>" +
                (ex.exampleEn ? '<span class="g-en">' + esc(ex.exampleEn) + "</span>" : "") +
                '<span class="g-hear">🔊</span>' +
              "</button>"
            : "") +
          (ex.note ? '<p class="g-warn">💡 ' + esc(ex.note) + "</p>" : "") +
          audioControls(ex.zh) +
        "</div>" +
        '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Got it — continue</button>';
      $("#btnTeachNext").addEventListener("click", nextExercise);
      return;
    }

    if (ex.type === "grammar") {
      // A short explainer card. Tappable to hear the example, then continue.
      const n = ex.note;
      body.innerHTML =
        '<div class="dir-label">Grammar tip · 语法</div>' +
        '<div class="grammar-card">' +
          '<div class="g-title">' + esc(n.title) + "</div>" +
          '<p class="g-body">' + esc(n.body) + "</p>" +
          '<button type="button" class="g-example" data-say="' + esc(n.zh) + '">' +
            '<span class="g-zh">' + esc(n.zh) + "</span>" +
            '<span class="g-py">' + esc(n.pinyin) + "</span>" +
            '<span class="g-en">' + esc(n.en) + "</span>" +
            '<span class="g-hear">🔊</span>' +
          "</button>" +
          (n.warn ? '<p class="g-warn">⚠️ ' + esc(n.warn) + "</p>" : "") +
        "</div>" +
        '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Got it</button>';
      $("#btnTeachNext").addEventListener("click", nextExercise);
      return;
    }

    if (ex.type === "trace") {
      // Inline writing: one tap opens the full trace screen, then returns here.
      const has = !!(window.MP_STROKES || {})[String(ex.zh).slice(0, 1)];
      body.innerHTML =
        '<div class="dir-label">Write it · 写字</div>' +
        '<div class="teach-card trace-prompt">' +
          '<div class="teach-zh">' + esc(ex.zh) + "</div>" +
          '<div class="teach-py">' + esc(ex.pinyin) + "</div>" +
          '<div class="teach-en">' + esc(ex.en) + "</div>" +
          audioControls(ex.zh) +
        "</div>" +
        (has
          ? '<button type="button" class="btn btn-primary btn-xl" id="btnInlineTrace">✍️ Trace this character</button>'
          : '<p class="teach-hint">Stroke guide not available for this character — practise it in Write mode.</p>') +
        '<button type="button" class="btn btn-ghost" id="btnTeachNext">Continue</button>';
      $("#btnTeachNext").addEventListener("click", nextExercise);
      const it = $("#btnInlineTrace");
      if (it) {
        it.addEventListener("click", function () {
          pendingExerciseReturn = true;
          openTrace(ex.zh, ex.pinyin);
        });
      }
      return;
    }

    if (ex.type === "build") {
      // Sentence builder: tap chunks into the answer rail until it reads right.
      const order = M.shuffle(ex.chunks.map((c, i) => ({ text: c, id: i })));
      const placed = [];
      body.innerHTML =
        '<div class="dir-label">Put it in order · 组句</div>' +
        '<div class="build-prompt">' +
          '<div class="build-en">' + esc(ex.en) + "</div>" +
          '<div class="build-py">' + esc(ex.pinyin) + "</div>" +
          audioControls(ex.zh) +
        "</div>" +
        '<div class="build-answer" id="buildAnswer">' +
          '<span class="build-hint">Tap the pieces below</span></div>' +
        '<div class="build-bank" id="buildBank">' +
          order.map((o, i) => '<button type="button" class="build-tile" data-i="' + i + '">' + esc(o.text) + "</button>").join("") +
        "</div>" +
        '<div class="build-actions">' +
          '<button type="button" class="btn btn-ghost" id="buildUndo">↩ Undo</button>' +
          '<button type="button" class="btn btn-primary" id="buildCheck" disabled>Check</button>' +
        "</div>";

      const answerEl = $("#buildAnswer");
      const checkBtn = $("#buildCheck");
      function renderRail() {
        answerEl.innerHTML = placed.length
          ? placed.map((p) => '<button type="button" class="build-tile placed" data-placed="' + p.id + '">' + esc(p.text) + "</button>").join("")
          : '<span class="build-hint">Tap the pieces below</span>';
        checkBtn.disabled = placed.length !== order.length;
      }
      $$(".build-tile", $("#buildBank")).forEach((b) => {
        b.addEventListener("click", function () {
          if (locked || b.disabled) return;
          const o = order[+b.dataset.i];
          b.disabled = true;
          placed.push(o);
          renderRail();
        });
      });
      answerEl.addEventListener("click", function (e) {
        const b = e.target.closest(".build-tile.placed");
        if (!b || locked) return;
        const id = +b.dataset.placed;
        const idx = placed.findIndex((p) => p.id === id);
        if (idx < 0) return;
        placed.splice(idx, 1);
        $$(".build-tile", $("#buildBank"))[id].disabled = false;
        renderRail();
      });
      $("#buildUndo").addEventListener("click", function () {
        if (!placed.length) return;
        const last = placed.pop();
        $$(".build-tile", $("#buildBank"))[last.id].disabled = false;
        renderRail();
      });
      checkBtn.addEventListener("click", function () {
        if (locked) return;
        locked = true;
        const built = placed.map((p) => p.text).join("");
        const ok = built === ex.answer;
        if (ok) { S.builtSentences = (S.builtSentences || 0) + 1; }
        gradeExercise(ok, {
          chosen: built, correct: ex.answer, pinyin: ex.pinyin, en: ex.en, zh: ex.zh
        });
        // Reveal the correct order so a wrong build is repairable.
        if (!ok) {
          answerEl.innerHTML = ex.chunks.map((c) =>
            '<span class="build-tile placed' + (c === built ? " bad" : "") + '">' + esc(c) + "</span>").join("");
        }
      });
      renderRail();
      return;
    }

    if (ex.type === "mc" || ex.type === "listen") {
      const isListen = ex.type === "listen";
      const zhToEn = ex.direction === "zh_to_en" || isListen;
      const dirLabel = isListen ? "Listen — what does this mean?"
        : zhToEn ? "What does this mean?" : "How do you say this in Chinese?";

      // English-first: always show the meaning up front for a beginner, and
      // show pinyin above the characters when reading English -> Chinese.
      // Neither replaces the character prompt; they sit alongside it.
      const gloss = S.settings.showEnglish && ex.answer
        ? '<div class="gloss">' +
            (zhToEn && ex.pinyin ? '<span class="gloss-py">' + esc(ex.pinyin) + "</span>" : "") +
            '<span class="gloss-en">' + esc(zhToEn ? ex.answer : ex.prompt) + "</span>" +
            '<span class="gloss-tag">meaning</span>' +
          "</div>"
        : "";
      const hint = (!zhToEn && S.settings.showPinyin && ex.pinyin)
        ? '<p class="prompt-hint">Sounds like: <b>' + esc(ex.pinyin) + "</b></p>" : "";

      const promptHtml = zhToEn
        ? '<button type="button" class="prompt-zh speakable" id="promptTap" data-say="' + esc(ex.prompt) + '">' + esc(ex.prompt) + "</button>" +
          (ex.pinyin ? '<div class="prompt-py">' + esc(ex.pinyin) + "</div>" : "")
        : '<div class="prompt-en">' + esc(ex.prompt) + "</div>";
      const opts = ex.options.map((o, i) => {
        // aria-label on every option: an English gloss read aloud is clearer
        // than "button, button, button" to a screen-reader user, and Chinese
        // text can be mangled by speech synthesis.
        if (CJK.test(o)) {
          return '<div class="opt-row"><button type="button" class="opt-btn has-zh" data-i="' + i +
            '" data-say="' + esc(o) + '" aria-label="' + esc(ex.en || ex.prompt || o) + '">' + esc(o) + "</button></div>";
        }
        return '<button type="button" class="opt-btn" data-i="' + i + '" aria-label="' + esc(o) + '">' + esc(o) + "</button>";
      }).join("");

      body.innerHTML =
        '<div class="dir-label">' + dirLabel + "</div>" +
        '<div class="prompt-row">' + promptHtml +
          '<div class="prompt-actions">' +
            audioControls(ex.prompt) +
            '<button type="button" class="speaker-btn info" data-detail="' + esc(ex.prompt) +
              '" aria-label="Look up ' + esc(ex.prompt) + '">ℹ️</button>' +
          "</div>" +
        "</div>" +
        gloss + hint +
        '<div class="opt-list">' + opts + "</div>";

      if (isListen) setTimeout(() => speak(ex.prompt), 300);

      $$(".opt-btn", body).forEach((btn) => {
        btn.addEventListener("click", function () {
          if (locked) return;
          locked = true;
          const chosen = ex.options[+btn.dataset.i];
          const ok = chosen === ex.answer;
          // Teach-before-test: every taught word joins the review queue, whether
          // the question showed the characters or only the English.
          if (CJK.test(String(ex.type === "en_to_zh" ? ex.answer : ex.prompt))) {
            ensureCard({ zh: ex.type === "en_to_zh" ? ex.answer : ex.prompt, pinyin: ex.pinyin || "" });
          }
          $$(".opt-btn", body).forEach((b) => {
            b.disabled = true;
            if (ex.options[+b.dataset.i] === ex.answer) b.classList.add("correct");
          });
          if (!ok) btn.classList.add("wrong");
          if (CJK.test(chosen)) speak(chosen);
          gradeExercise(ok, { chosen: chosen, correct: ex.answer, zh: ex.prompt, pinyin: ex.pinyin });
        });
      });
      return;
    }

    if (ex.type === "tiles") {
      const bank = M.shuffle(ex.tiles.concat(ex.distractors || []));
      const picked = [];
      body.innerHTML =
        '<div class="dir-label">' + esc(ex.promptEn) + "</div>" +
        '<div class="tile-answer" id="tileAnswer"><span class="muted-sm">Tap tiles…</span></div>' +
        '<div class="tile-bank">' +
          bank.map((t, i) => '<button type="button" class="tile speakable" data-i="' + i + '" data-t="' + esc(t) + '">' + esc(t) + "</button>").join("") +
        "</div>" +
        '<button type="button" class="btn btn-primary tile-check" id="btnCheck" disabled>Check</button>';
      const answerBox = $("#tileAnswer");
      const checkBtn = $("#btnCheck");
      function refresh() {
        answerBox.innerHTML = picked.length
          ? picked.map((p) => '<span class="tile">' + esc(p.t) + "</span>").join("")
          : '<span class="muted-sm">Tap tiles…</span>';
        checkBtn.disabled = picked.length === 0;
      }
      $$(".tile", body).forEach((tile) => {
        tile.addEventListener("click", function () {
          if (locked || tile.classList.contains("used")) return;
          tile.classList.add("used");
          speak(tile.dataset.t);
          picked.push({ t: tile.dataset.t, btn: tile });
          refresh();
        });
      });
      answerBox.addEventListener("click", function () {
        if (locked || !picked.length) return;
        picked.pop().btn.classList.remove("used");
        refresh();
      });
      checkBtn.addEventListener("click", function () {
        if (locked) return;
        locked = true;
        const built = picked.map((p) => p.t).join("");
        const ok = built === ex.answer;
        if (ok && CJK.test(built)) speak(built);
        gradeExercise(ok, { chosen: built, correct: ex.answer, pinyin: ex.answerPinyin, en: ex.answerEn });
      });
      return;
    }

    if (ex.type === "speakBack") {
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      body.innerHTML =
        '<div class="dir-label">Say it back · 用声音说一遍</div>' +
        '<div class="teach-card">' +
          '<div class="teach-zh">' + esc(ex.promptZh) + "</div>" +
          '<div class="teach-py">' + esc(ex.promptPinyin) + "</div>" +
          '<div class="teach-en">' + esc(ex.promptEn) + "</div>" +
          '<button type="button" class="speaker-btn" id="btnSpeak" aria-label="Play">🔊</button>' +
        "</div>" +
        (Rec
          ? '<button type="button" class="btn btn-primary btn-xl" id="btnRecord">🎙 Record yourself</button>' +
            '<button type="button" class="btn btn-ghost" id="btnTeachNext">Skip — I said it out loud</button>' +
            '<p class="teach-hint" id="recHint">Comparing tone contour is hard on a phone mic — listen back and match the shape.</p>'
          : '<p class="teach-hint">Your browser has no speech recognition. Play it twice, say it out loud, then continue.</p>' +
            '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Done</button>');
      $("#btnSpeak").addEventListener("click", () => speak(ex.promptZh));
      const tn = $("#btnTeachNext");
      if (tn) {
        tn.addEventListener("click", function () {
          // Self-check: speaking out loud is the point, so it counts as a rep
          // and the word joins the review queue for real feedback later.
          ensureCard({ zh: ex.promptZh, pinyin: ex.promptPinyin || "" });
          sfx.reward();
          save();
          showFeedback(true, "Said it out loud", { zh: ex.promptZh, pinyin: ex.promptPinyin, en: ex.promptEn });
        });
      }
      const rec = $("#btnRecord");
      if (rec) {
        rec.addEventListener("click", function () {
          let r;
          try { r = new Rec(); } catch (e) { toast("Mic unavailable"); return; }
          r.lang = "zh-CN";
          r.interimResults = false;
          const hint = $("#recHint");
          hint.textContent = "Listening… speak now";
          r.onresult = function (ev) {
            const said = ev.results[0][0].transcript;
            hint.textContent = 'Heard: "' + said + '"';
            // Chinese ASR rarely normalises tone, so treat any hit as a win and
            // let the ear-judgement in Tone Trainer do the real grading.
            sfx.reward();
            gradeExercise(true, { chosen: said, correct: ex.promptZh, pinyin: ex.promptPinyin, en: ex.promptEn, selfCheck: true });
          };
          r.onerror = function () {
            hint.textContent = "Mic blocked or unavailable — no problem, say it out loud instead.";
            sfx.correct();
            gradeExercise(true, { selfCheck: true, zh: ex.promptZh, pinyin: ex.promptPinyin, en: ex.promptEn });
          };
          r.onend = function () { rec.disabled = false; };
          rec.disabled = true;
          try { r.start(); } catch (e) { hint.textContent = "Could not start recording."; rec.disabled = false; }
        });
      }
      const tn2 = $("#btnTeachNext");
      if (tn2) tn2.addEventListener("click", nextExercise);
    }
  }

  function renderToneTeach(set) {
    let html =
      '<div class="dir-label">Hear all four tones · 四个声调</div>' +
      '<div class="teach-card tone-teach">' +
      set.items.map((it) =>
        '<button type="button" class="tone-row speakable" data-tone-play="' + esc(it.single) + '">' +
          '<span class="tone-num">' + it.tone + "</span>" +
          '<span class="tone-zh">' + esc(it.zh) + "</span>" +
          '<span class="tone-py">' + esc(it.single) + "</span>" +
          '<span class="tone-en">' + esc(it.en) + "</span>" +
        "</button>").join("") +
      "</div>" +
      '<p class="teach-hint">Same syllable, four meanings. Tap each to hear the shape · 点一下听发音</p>' +
      '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Got it — continue</button>';
    return html;
  }

  function gradeExercise(ok, detail) {
    if (ok) {
      lessonResults.correct++;
      sfx.correct();
      const word = { zh: detail.zh || detail.correct, pinyin: detail.pinyin || "" };
      if (word.zh && CJK.test(String(word.zh))) {
        ensureCard(word);
        save();
      }
      // Getting it right the second time removes it from the retry pile.
      if (detail.zh) {
        lessonResults.retry = lessonResults.retry.filter((r) => r.prompt !== detail.prompt);
      }
      showFeedback(true, "Nice!", detail);
    } else {
      lessonResults.wrongItems.push(detail);
      // Queue the actual exercise for a re-run at the end of this lesson.
      // Only quiz types: re-showing a "teach" card would just re-teach it.
      const cur = lesson.exercises[lessonIdx];
      if (cur && cur.type !== "teach" && !lessonResults.retry.some((r) => r === cur)) {
        lessonResults.retry.push(cur);
      }
      S.hearts = Math.max(0, S.hearts - 1);
      const hb = $("#lessonHearts b");
      if (hb) hb.textContent = S.hearts;
      sfx.wrong();
      // Beginner-friendly framing: never scold. "Not quite" + showing the
      // answer is enough; the item is also re-queued at the end of the lesson,
      // so the message can honestly promise another chance.
      showFeedback(false, "Not quite — here's the answer", detail);
      if (S.hearts <= 0) {
        S.hearts = S.maxHearts;
        toast("Hearts refilled — no penalty, keep going");
        save();
      }
    }
    save();
  }

  function pair(zh, py, en) {
    zh = zh || "—";
    py = py ? " (" + py + ")" : "";
    en = en || "";
    if (en && en !== "not a match") return zh + py + " — " + en;
    return zh + py;
  }

  function showFeedback(ok, title, d) {
    d = d || {};
    let rich = "";
    if (!ok) {
      rich = '<div class="fb-coach">' +
        '<div class="fb-row chosen"><span class="fb-lab">You said</span>' +
          '<span class="fb-val">' + esc(pair(d.chosen, d.chosenPinyin, d.chosenEn)) + "</span></div>" +
        '<div class="fb-row correct"><span class="fb-lab">Correct</span>' +
          '<span class="fb-val">' + esc(pair(d.correct, d.pinyin, d.en)) + "</span></div>" +
        "</div>";
      if (d.zh) {
        rich += '<p class="teach-hint">Play it, then say it aloud — tones carry the meaning.</p>';
      }
    }
    const fb = $("#feedbackBanner");
    fb.hidden = false;
    fb.className = "feedback-banner " + (ok ? "ok" : "bad") + (rich ? " rich" : "");
    fb.innerHTML =
      '<div class="fb-main"><div class="fb-title">' + (ok ? "✓ " : "✗ ") + title + "</div>" + rich + "</div>" +
      '<button type="button" id="btnContinue">Continue</button>';
    const playBtn = fb.querySelector(".fb-val");
    if (playBtn) playBtn.classList.add("speakable");
    $("#btnContinue").addEventListener("click", nextExercise);
  }

  function nextExercise() {
    lessonIdx++;
    // Beginner re-queue: an item missed earlier in THIS lesson comes back
    // before the lesson ends. Previously wrongItems was only counted for the
    // end-of-lesson summary, so a word you got wrong on item 3 never reappeared
    // until the next spaced-rep session days later. Failing then immediately
    // re-presenting is the cheapest possible moment to repair the gap.
    //
    // Capped at two rounds. Without the cap a learner who cannot answer
    // correctly never reaches the end of the lesson -- the wrong items are
    // spliced back in forever. Two rounds is enough to drill without
    // trapping anyone; anything still wrong is already queued for spaced review.
    if (lessonIdx >= lesson.exercises.length && lessonResults.retry.length && lessonResults.retryRounds < 2) {
      const retry = lessonResults.retry.splice(0, 3);
      if (retry.length) {
        lessonResults.retryRounds++;
        lesson.exercises = lesson.exercises.concat(retry);
        lessonIdx = lesson.exercises.length - retry.length;
        const fb = $("#feedbackBanner");
        if (fb) { fb.hidden = true; fb.innerHTML = ""; }
        toast("Let's practice those again · round " + lessonResults.retryRounds + " of 2");
        S.session.index = lessonIdx;
        save();
        renderExercise();
        return;
      }
    }
    if (lessonIdx >= lesson.exercises.length) {
      finishLesson();
    } else {
      S.session.index = lessonIdx;
      save();
      renderExercise();
    }
  }

  function finishLesson() {
    touchStreak();
    const xp = lesson.xp || 25;
    addXP(xp);
    S.completed[lesson.id] = Date.now();
    S.session = { lessonId: null, index: 0 };
    save();
    checkAchievements();

    const pct = Math.round((lessonResults.correct / Math.max(1, lessonResults.total)) * 100);
    $("#completeXP").textContent = "+" + xp + " XP";
    $("#completeStreak").innerHTML = "🔥 " + S.streak + "-day streak";
    $("#completeDetail").textContent =
      pct + "% correct · " + lessonResults.correct + "/" + lessonResults.total +
      (lessonResults.wrongItems.length ? " · " + lessonResults.wrongItems.length + " queued for review" : "");
    showScreen("screenComplete");
    sfx.finish();
    sparkles();
  }

  function claimXP() {
    sfx.reward();
    floatXP(lesson ? lesson.xp || 25 : 25);
    showScreen("screenMain");
    setTab("practice");
    toast("XP claimed — " + dueCount() + " cards due");
  }

  /* ── XP ──────────────────────────────────────────────────────────────
   * Every point of XP goes through here. Awarding XP in half a dozen places
   * separately is how "today's XP" drifts out of sync with the total and the
   * daily goal silently breaks. */
  function addXP(n) {
    n = Number(n) || 0;
    if (!n) return;
    S.xp = (S.xp || 0) + n;
    // A new calendar day resets the daily counter, without touching the streak
    // (the streak has its own logic in touchStreak).
    const today = dayKey();
    if (S.xpDay !== today) { S.xpDay = today; S.xpToday = 0; }
    S.xpToday = (S.xpToday || 0) + n;
    const g = goalProgress();
    if (g.met && !S.goalMetEver) { S.goalMetEver = true; }
    updateStats();
  }

  /* ── Word detail sheet ───────────────────────────────────────────────
   * A peek, not a destination. It answers "what does this actually mean in a
   * sentence" without losing the learner's place, and it is reachable from any
   * Chinese text they tap. */
  let detailReturnFocus = null;

  function openDetail(zh) {
    const entry = M.lookupWord ? M.lookupWord(zh) : null;
    if (!entry) {
      toast("No entry for " + zh);
      return;
    }
    detailReturnFocus = document.activeElement;

    const stroke = (window.MP_STROKES || {})[String(entry.zh).slice(0, 1)];
    const single = Array.from(entry.zh).length === 1;
    const rec = S.cards[cardKey(entry.zh, entry.pinyin)];
    const learn = S.introduced[cardKey(entry.zh, entry.pinyin)];

    $("#detailBody").innerHTML =
      '<div class="d-zh-row">' +
        '<button type="button" class="d-zh" data-say="' + esc(entry.zh) + '"' +
          (single ? ' id="detailTraceJump"' : "") + ">" + esc(entry.zh) + "</button>" +
        audioControls(entry.zh, "detailSpeak") +
      "</div>" +
      '<div class="d-py">' + esc(entry.pinyin) + "</div>" +
      '<div class="d-en">' + esc(entry.en) + "</div>" +
      '<div class="d-tags">' +
        (entry.hsk ? '<span class="d-tag hsk">' + esc(entry.hsk) + "</span>" : "") +
        (entry.theme ? '<span class="d-tag theme">' + esc(entry.theme) + "</span>" : "") +
        (stroke ? '<span class="d-tag ok">' + stroke.count + " strokes</span>" : "") +
        (learn ? '<span class="d-tag ok">seen</span>' : '<span class="d-tag">new</span>') +
        (rec && rec.interval >= 21 ? '<span class="d-tag ok">learned</span>'
          : rec ? '<span class="d-tag">learning</span>' : "") +
      "</div>" +
      (entry.exampleZh
        ? '<button type="button" class="d-example" data-say="' + esc(entry.exampleZh) + '">' +
            '<span class="d-ex-zh">' + esc(entry.exampleZh) + "</span>" +
            (entry.examplePinyin ? '<span class="d-ex-py">' + esc(entry.examplePinyin) + "</span>" : "") +
            (entry.exampleEn ? '<span class="d-ex-en">' + esc(entry.exampleEn) + "</span>" : "") +
          "</button>"
        : '<p class="d-noexample">No example sentence for this one yet.</p>') +
      (entry.note ? '<p class="d-note">💡 ' + esc(entry.note) + "</p>" : "") +
      (single && stroke
        ? '<button type="button" class="btn btn-ghost d-trace" id="detailTrace">✍️ Practise writing this</button>'
        : "");

    $("#detailSheet").hidden = false;
    $("#detailScrim").hidden = false;
    document.body.classList.add("sheet-open");
    // Focus the sheet so a screen reader lands on it and Esc works.
    const sheet = $("#detailSheet");
    sheet.setAttribute("tabindex", "-1");
    setTimeout(function () {
      try { sheet.focus({ preventScroll: true }); } catch (e) { sheet.focus(); }
    }, 40);
    announce(entry.zh + ". " + entry.pinyin + ". " + entry.en);

    const tr = $("#detailTrace");
    if (tr) tr.addEventListener("click", function () { closeDetail(); openTrace(entry.zh, entry.pinyin); });
  }

  function closeDetail() {
    $("#detailSheet").hidden = true;
    $("#detailScrim").hidden = true;
    document.body.classList.remove("sheet-open");
    if (detailReturnFocus && detailReturnFocus.focus) {
      try { detailReturnFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    detailReturnFocus = null;
  }

  /* ── Daily goal & achievements ───────────────────────────────────────
   * Lingodeer-style meta layer. Both are pure functions of state so they can
   * be recomputed on every render and never drift from the truth.
   *
   * The daily goal is a soft target: missing it never breaks a streak and
   * never resets anything. A learner who opens the app after a bad day is
   * exactly the one who should find it easy to come back. */

  const GOAL_OPTIONS = [10, 20, 40, 60, 100];

  function xpToday() {
    // XP is a running total, so today's contribution is tracked explicitly at
    // the moment it is awarded rather than inferred from a difference.
    return S.xpToday || 0;
  }

  function goalProgress() {
    const goal = S.settings.dailyGoal || 20;
    const done = xpToday();
    return {
      goal: goal,
      done: done,
      pct: Math.max(0, Math.min(1, goal ? done / goal : 0)),
      met: done >= goal
    };
  }

  const ACHIEVEMENTS = [
    { id: "first-lesson", name: "First steps", icon: "🌱", desc: "Clear your first lesson", test: (s) => Object.keys(s.completed).length >= 1 },
    { id: "five-lessons", name: "Getting going", icon: "🌿", desc: "Clear 5 lessons", test: (s) => Object.keys(s.completed).length >= 5 },
    { id: "all-lessons", name: "Path complete", icon: "🏔", desc: "Clear every lesson in the path", test: (s) => Object.keys(s.completed).length >= ALL_LESSONS.length },
    { id: "streak-3", name: "Three in a row", icon: "🔥", desc: "Reach a 3-day streak", test: (s) => (s.streak || 0) >= 3 },
    { id: "streak-7", name: "Week strong", icon: "⚡", desc: "Reach a 7-day streak", test: (s) => (s.streak || 0) >= 7 },
    { id: "streak-30", name: "Month of habit", icon: "💎", desc: "Reach a 30-day streak", test: (s) => (s.streak || 0) >= 30 },
    { id: "xp-500", name: "500 XP", icon: "⭐", desc: "Earn 500 XP", test: (s) => (s.xp || 0) >= 500 },
    { id: "xp-2000", name: "2000 XP", icon: "🌟", desc: "Earn 2000 XP", test: (s) => (s.xp || 0) >= 2000 },
    { id: "words-50", name: "Word collector", icon: "📚", desc: "Meet 50 different words", test: (s) => Object.keys(s.introduced).length >= 50 },
    { id: "words-150", name: "Word hoarder", icon: "🗂", desc: "Meet 150 different words", test: (s) => Object.keys(s.introduced).length >= 150 },
    { id: "mature-25", name: "Stuck in memory", icon: "🧠", desc: "Get 25 cards past 3 weeks", test: (s) => Object.keys(s.cards).filter((k) => (s.cards[k].interval || 0) >= 21).length >= 25 },
    { id: "tones-50", name: "Tone deaf no more", icon: "🎵", desc: "Score 50%+ on Tone Trainer twice", test: (s) => (s.toneScores || []).filter((v) => v >= 0.5).length >= 2 },
    { id: "writer-10", name: "Pen to paper", icon: "✍️", desc: "Write 10 characters", test: (s) => (s.traceAttempts || 0) >= 10 },
    { id: "goal-met", name: "Daily learner", icon: "🎯", desc: "Hit your daily goal once", test: (s) => !!s.goalMetEver },
    { id: "builder", name: "Word order", icon: "🧩", desc: "Build 25 sentences", test: (s) => (s.builtSentences || 0) >= 25 }
  ];

  function achievementState() {
    const earned = S.achievements || {};
    return ACHIEVEMENTS.map((a) => ({
      id: a.id, name: a.name, icon: a.icon, desc: a.desc,
      earned: !!earned[a.id],
      // Progress toward the nearest milestone, so locked ones still show motion.
      progress: a.test(S) ? 1 : undefined
    }));
  }

  /* Check every achievement and toast only newly earned ones. */
  function checkAchievements() {
    const earned = S.achievements || (S.achievements = {});
    const fresh = [];
    ACHIEVEMENTS.forEach((a) => {
      if (earned[a.id]) return;
      let ok = false;
      try { ok = a.test(S); } catch (e) { ok = false; }
      if (ok) { earned[a.id] = Date.now(); fresh.push(a); }
    });
    if (fresh.length) {
      save();
      const a = fresh[0];
      toast(a.icon + " Achievement: " + a.name + (fresh.length > 1 ? " (+" + (fresh.length - 1) + " more)" : ""));
      announce("Achievement unlocked: " + a.name);
      sfx.reward();
    }
    return fresh;
  }

  /* ── Error resilience ────────────────────────────────────────────────
   * A language app that white-screens on a bad click is worse than useless,
   * and the learner has no console to look at. Every uncaught error surfaces
   * as a visible, recoverable notice, and progress-saving failures stop
   * silently swallowing data. */
  let errorCount = 0;

  function showError(message) {
    errorCount++;
    console.error("[MandarinPath]", message);
    const el = $("#errorBar");
    if (!el) return;
    el.hidden = false;
    el.textContent = "Something went wrong (" + errorCount + "): " + message +
      " — your progress is safe.";
    el.hidden = false;
    // Auto-dismiss so a transient hiccup does not leave a permanent banner.
    clearTimeout(showError._t);
    showError._t = setTimeout(function () { el.hidden = true; }, 6000);
  }

  window.addEventListener("error", function (e) {
    showError(e.message || "unexpected error");
  });
  window.addEventListener("unhandledrejection", function (e) {
    const r = e.reason;
    showError((r && r.message) || "background task failed");
  });

  /* ── Onboarding ─────────────────────────────────────────────────────
   * Four cards, shown once. The two that matter most for a total beginner:
   * tones change meaning, and the turtle button replays audio slowly. */
  const ONBOARD_STEPS = [
    {
      art: "🐉",
      title: "Welcome to MandarinPath",
      body: "Learn Mandarin the way it actually works: listening first, characters second. Everything here runs offline on this phone."
    },
    {
      art: "🎵",
      title: "Tones change the meaning",
      body: "The same syllable with a different tone is a different word. mā = mom, má = hemp, mǎ = horse, mà = to scold. We drill these before anything else, because getting them wrong makes everything else harder.",
      demo: "tones"
    },
    {
      art: "🐢",
      title: "Slow it down",
      body: "Every sound has two buttons: 🔊 to play it, 🐢 to play it slower. Use the turtle as much as you like — the speed setting in Settings goes all the way down to half speed. Nothing is timed.",
      demo: "audio"
    },
    {
      art: "✍️",
      title: "See it, hear it, write it",
      body: "Every word shows characters, pinyin, and English before you answer. Then you can trace the character with your finger and the app checks the shape. Nothing is timed and nothing is graded harshly."
    }
  ];

  let onboardIdx = 0;

  function renderOnboard() {
    const step = ONBOARD_STEPS[onboardIdx];
    $("#onboardDots").innerHTML = ONBOARD_STEPS.map((_, i) =>
      '<span class="ob-dot' + (i === onboardIdx ? " on" : "") + '"></span>').join("");
    $("#btnOnboardBack").hidden = onboardIdx === 0;
    $("#btnOnboardNext").textContent = onboardIdx === ONBOARD_STEPS.length - 1 ? "Start" : "Next";

    let demo = "";
    if (step.demo === "tones") {
      demo = '<div class="ob-demo tone-demo">' +
        ["mā", "má", "mǎ", "mà"].map((s, i) =>
          '<button type="button" class="ob-tone" data-say="' + ["妈", "麻", "马", "骂"][i] + '">' +
          '<b>' + s + "</b><span>" + ["mom", "hemp", "horse", "scold"][i] + "</span></button>").join("") +
        "</div>";
    } else if (step.demo === "audio") {
      demo = '<div class="ob-demo">' +
        '<button type="button" class="speaker-btn" data-say="你好" aria-label="Play">🔊</button>' +
        '<button type="button" class="speaker-btn slow" data-say-slow="你好" aria-label="Play slowly">🐢</button>' +
        '<span class="ob-demo-note">same word, two speeds</span>' +
        "</div>";
    }

    $("#onboardWrap").innerHTML =
      '<div class="ob-art" aria-hidden="true">' + step.art + "</div>" +
      '<h2 class="ob-title">' + esc(step.title) + "</h2>" +
      '<p class="ob-body">' + esc(step.body) + "</p>" + demo;

    announce(step.title + ". " + step.body);
  }

  function finishOnboarding() {
    S.onboarded = true;
    save();
    toMain("learn");
  }

  /* ── Data export / import ───────────────────────────────────────────
   * iOS evicts web-app storage after ~7 days of disuse, and clearing Safari
   * data wipes it too. Without an escape hatch a learner can lose everything
   * with no way back. Export writes a file the user owns; import restores it. */
  function exportData() {
    const payload = JSON.stringify({ app: "mandarinpath", version: 1, exported: new Date().toISOString(), state: S }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mandarinpath-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Progress exported");
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const parsed = JSON.parse(reader.result);
          const incoming = parsed && parsed.state ? parsed.state : parsed;
          if (!incoming || typeof incoming !== "object" || !incoming.cards) {
            toast("That file is not MandarinPath data");
            return;
          }
          const done = Object.keys(incoming.completed || {}).length;
          if (!window.confirm("Replace your current progress?\n\nImported: " + done +
            " lessons, " + Object.keys(incoming.cards).length + " review cards.")) return;
          const base = defaultState();
          S = Object.assign(base, incoming, {
            settings: Object.assign(base.settings, incoming.settings || {}),
            session: { lessonId: null, index: 0 }
          });
          applyTheme();
          applySpeechSettings();
          save();
          toMain("learn");
          toast("Progress restored");
        } catch (e) {
          toast("Could not read that file");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /* ── Writing practice (trace + self-check) ─────────────────────────
   * A tracing grid with a faint guide glyph. There is no stroke-order data
   * in the bundle, so this cannot grade correctness or teach proper stroke
   * order -- it builds the motor path and forces a deliberate pause on the
   * shape. The guide glyph is rendered by the browser, so the grid is only
   * offered for single characters, where it actually makes sense. */
  let traceCtx = null;
  let traceDrawn = false;
  let traceStrokes = [];
  let traceResult = null;
  let traceAttempts = 0;
  let tracePasses = 0;
  /* Set when the trace screen is opened from inside a lesson, so Done returns
   * to the lesson rather than jumping to the path map. */
  let pendingExerciseReturn = false;
  // Module-level so paintGuide() can reach the current glyph: it is only ever
  // a local inside openTrace(), which left the guide glyph unreferenced.
  let traceGlyph = "";

  /* Write mode launched from Practice: cycle the single-character words the
   * learner has actually met, so the drill reinforces known material. */
  let writeQueue = [];
  let writeIdx = 0;

  function openWritePicker() {
    const learned = M.ALL_CARDS.filter((w) =>
      CJK.test(w.zh) && Array.from(w.zh).length === 1 &&
      S.introduced[cardKey(w.zh, w.pinyin)]
    );
    const pool = (learned.length >= 3 ? learned : M.ALL_CARDS.filter((w) =>
      CJK.test(w.zh) && Array.from(w.zh).length === 1)).slice(0, 40);
    if (!pool.length) { toast("No characters to trace yet"); return; }
    writeQueue = M.shuffle(pool).slice(0, 12);
    writeIdx = 0;
    toast(writeQueue.length + " characters to trace");
    openTrace(writeQueue[0].zh, writeQueue[0].pinyin);
  }

  function openTrace(zh, pinyin) {
    const glyph = String(zh || "");
    traceGlyph = glyph;
    $("#traceGlyph").textContent = glyph;
    $("#tracePinyin").textContent = pinyin || "";
    // The section id is "screenTrace", not "traceScreen".
    $("#screenTrace").dataset.zh = glyph;
    showScreen("screenTrace");
    const cv = $("#traceCanvas");
    traceDrawn = false;
    paintGuide();
    speak(glyph);
  }

  function paintGuide() {
    const cv = $("#traceCanvas");
    if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    // The grid must be square: the 田字格 guide and the guide glyph are both
    // drawn against cssW/cssH, so a non-square box yields a distorted grid.
    // Settle the width first (letting CSS max-width/aspect-ratio apply), read
    // the real rendered width back, then pin height to it. Forcing an inline
    // square fights the stylesheet's `height:auto` + flex stretch, which is
    // what left the canvas 340x360 with off-centre guides.
    const stage = cv.parentElement;
    cv.style.height = "auto";
    cv.style.width = "100%";
    const avail = Math.round(cv.getBoundingClientRect().width) ||
      Math.round((stage && stage.clientWidth) || 320);
    const side = Math.max(180, Math.min(360, avail));
    cv.style.width = side + "px";
    cv.style.height = side + "px";
    const cssW = side;
    const cssH = side;
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    traceCtx = c;

    c.clearRect(0, 0, cssW, cssH);
    c.fillStyle = "#f6faf6";
    c.fillRect(0, 0, cssW, cssH);

    // 田字格-style guide: box plus centre cross and diagonals
    c.strokeStyle = "#c3d4c8";
    c.lineWidth = 1;
    c.strokeRect(6, 6, cssW - 12, cssH - 12);
    c.beginPath();
    c.moveTo(cssW / 2, 6); c.lineTo(cssW / 2, cssH - 6);
    c.moveTo(6, cssH / 2); c.lineTo(cssW - 6, cssH / 2);
    c.stroke();
    c.strokeStyle = "rgba(195,212,200,.55)";
    c.setLineDash([4, 5]);
    c.beginPath();
    c.moveTo(6, 6); c.lineTo(cssW - 6, cssH - 6);
    c.moveTo(cssW - 6, 6); c.lineTo(6, cssH - 6);
    c.stroke();
    c.setLineDash([]);

    // faint guide glyph
    const size = Math.min(cssW, cssH) * 0.66;
    c.fillStyle = "rgba(34,197,94,.20)";
    c.font = size + 'px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(traceGlyph).slice(0, 1), cssW / 2, cssH / 2 + size * 0.04);
  }

  function wireTrace() {
    const cv = $("#traceCanvas");
    if (!cv) return;
    let active = false;
    let currentStroke = null;
    traceStrokes = [];

    function pos(ev) {
      const r = cv.getBoundingClientRect();
      const src = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    }

    function down(ev) {
      ev.preventDefault();
      active = true;
      const p = pos(ev);
      currentStroke = { pts: [[p.x, p.y]] };
      traceStrokes.push(currentStroke);
      const c = cv.getContext("2d");
      c.beginPath();
      c.moveTo(p.x, p.y);
    }
    function move(ev) {
      if (!active) return;
      ev.preventDefault();
      const p = pos(ev);
      const c = cv.getContext("2d");
      c.lineTo(p.x, p.y);
      c.strokeStyle = "#12833f";
      c.lineWidth = 12;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke();
      if (currentStroke) {
        const last = currentStroke.pts[currentStroke.pts.length - 1];
        // Drop near-duplicate points: a slow finger fires dozens of mousemove
        // events per millimetre and they slow the grader without adding shape.
        if (!last || Math.hypot(p.x - last[0], p.y - last[1]) > 3) {
          currentStroke.pts.push([p.x, p.y]);
        }
      }
      traceDrawn = true;
    }
    function up() { active = false; currentStroke = null; }

    cv.addEventListener("mousedown", down);
    cv.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    cv.addEventListener("touchstart", down, { passive: false });
    cv.addEventListener("touchmove", move, { passive: false });
    cv.addEventListener("touchend", up);
    cv.addEventListener("touchcancel", up);

    $("#btnTraceClear").addEventListener("click", function () {
      traceDrawn = false;
      traceStrokes = [];
      traceResult = null;
      const fb = $("#traceFeedback");
      if (fb) fb.hidden = true;
      paintGuide();
    });
    $("#btnTraceHear").addEventListener("click", function () {
      speak($("#screenTrace").dataset.zh || "");
    });
    $("#btnTraceHearSlow").addEventListener("click", function () {
      speakSlow($("#screenTrace").dataset.zh || "");
    });
    $("#btnTraceCheck").addEventListener("click", checkTrace);
    $("#btnTraceDone").addEventListener("click", function () {
      if (!traceDrawn) { toast("Trace the character first"); return; }
      // Score before awarding: an unscored attempt still counts, but the
      // learner is told what they actually wrote.
      const res = checkTrace(true);
      const ok = !res || res.verdict === "great" || res.verdict === "good";
      sfx[ok ? "reward" : "correct"]();
      addXP(ok ? 3 : 1);
      S.traceAttempts = (S.traceAttempts || 0) + 1;
      checkAchievements();
      touchStreak();
      save();
      updateStats();

      if (writeQueue.length && writeIdx < writeQueue.length - 1) {
        writeIdx++;
        setTimeout(function () {
          openTrace(writeQueue[writeIdx].zh, writeQueue[writeIdx].pinyin);
        }, 700);
        return;
      }
      if (writeQueue.length) {
        toast("Write session done · " + writeQueue.length + " characters");
        writeQueue = [];
        setTimeout(function () { toMain("practice"); }, 700);
        return;
      }
      if (pendingExerciseReturn) {
        pendingExerciseReturn = false;
        setTimeout(function () { showScreen("screenLesson"); renderExercise(); }, 700);
        return;
      }
      toast(ok ? "Nice writing · +3 XP" : "Keep practising · +1 XP");
      setTimeout(function () { toMain("learn"); }, 700);
    });
    $("#btnCloseType").addEventListener("click", () => toMain("practice"));
    $("#btnCloseTrace").addEventListener("click", function () {
      if (pendingExerciseReturn) { pendingExerciseReturn = false; showScreen("screenLesson"); renderExercise(); return; }
      toMain("learn");
    });
    window.addEventListener("resize", () => {
      if (!$("#screenTrace").hidden) paintGuide();
    });
  }

  /* Score the ink against the reference, when we have reference data for the
   * character. Without stroke data (most characters) we fall back to an
   * honest "ink present" pass rather than pretending to grade. */
  function checkTrace(quiet) {
    const glyph = ($("#screenTrace").dataset.zh || "").slice(0, 1);
    const fb = $("#traceFeedback");
    const ref = (window.MP_STROKES || {})[glyph];

    if (!traceDrawn) {
      if (!quiet) toast("Trace the character first");
      return null;
    }
    if (!ref || !ref.strokes || !ref.strokes.length || !window.MP_TRACE) {
      if (fb) {
        fb.hidden = false;
        fb.className = "feedback-banner ok rich";
        fb.innerHTML = "<span>✓ Ink drawn — stroke detail unavailable for this character</span>";
      }
      return { score: 0.5, verdict: "good", noReference: true };
    }

    const cv = $("#traceCanvas");
    const side = Math.min(cv.clientWidth, cv.clientHeight);
    // The captured points are canvas-relative (wireTrace subtracts the canvas
    // rect when recording), so the grading box must be in canvas-local
    // coordinates too. Passing viewport coords here clamped every point to
    // (0,0) and scored a perfect trace 0%.
    const box = { x: 0, y: 0, w: side, h: side };

    const strokes = traceStrokes.map(function (s) {
      return { pts: s.pts.map(function (p) { return [p[0], p[1]]; }) };
    });

    const res = window.MP_TRACE.grade(strokes, ref, box);
    traceResult = res;
    const msg = (window.MP_TRACE.MESSAGES || {})[res.verdict] || { text: "Done", tone: "ok" };
    if (fb) {
      fb.hidden = false;
      fb.className = "feedback-banner " + (msg.tone === "ok" ? "ok" : "bad") + " rich";
      fb.innerHTML =
        "<div class=\"fb-main\"><div class=\"fb-title\">" + esc(msg.text) + "</div>" +
        '<div class="fb-pair">shape match ' + Math.round(res.score * 100) + "%" +
        " · " + res.strokesDrawn + " stroke" + (res.strokesDrawn === 1 ? "" : "s") +
        " drawn, " + res.strokesExpected + " expected</div></div>";
    }
    announce(msg.text + " " + Math.round(res.score * 100) + " percent shape match.");
    return res;
  }

  /* ── Dictation / typing ──────────────────────────────────────────────
   * Productive recall. Every other exercise is recognition: pick the right
   * option among plausible ones. Typing the word is the only format that
   * cannot be passed by elimination, and retrieval practice is the
   * highest-ranked technique in the research this app is built on
   * (Donoghue & Hattie: d = 1.29 in the languages domain specifically).
   *
   * Grading is generous by design and honest about it:
   *  - the Pinyin field accepts the word with or without tone marks, spaces,
   *    or capital letters, because typing tone marks on a phone keyboard is
   *    a typing test, not a Mandarin test;
   *  - the Chinese field requires the characters, since that IS the answer.
   * A wrong-but-close attempt is reported as a miss, never as a pass. */
  let typeQueue = [];
  let typeIdx = 0;
  let typeResults = { right: 0, near: 0, wrong: 0 };

  function openTyping(mode) {
    const learned = Object.keys(S.introduced);
    let pool = M.ALL_CARDS.filter((w) => learned.indexOf(cardKey(w.zh, w.pinyin)) >= 0);
    if (pool.length < 4) pool = M.ALL_CARDS.filter((w) => w.zh && w.en);
    if (!pool.length) { toast("No words to practise yet"); return; }
    typeQueue = M.shuffle(pool).slice(0, 12);
    typeIdx = 0;
    typeResults = { right: 0, near: 0, wrong: 0 };
    showScreen("screenType");
    renderTypeItem();
  }

  /* Compare a typed pinyin against the reference.
   *
   * Tone marks are stripped before comparing, so `nihao`, `nǐ hǎo` and
   * `NI HAO` all match `nǐ hǎo`. This is deliberate: tones are drilled by the
   * Tone Trainer and the listening exercises, and on a phone keyboard the tone
   * marks are genuinely hard to enter. Making the keyboard the bottleneck
   * would measure typing, not Mandarin.
   *
   * An earlier version also had a "matched" return for tone-marked-but-
   * otherwise-identical input. It was unreachable -- stripping tones always
   * matched first -- so it is gone rather than left as misleading dead code.
   *
   * Returns true when the syllables agree. */
  function comparePinyin(typed, ref) {
    const strip = (x) => String(x || "")
      .toLowerCase()
      .replace(/[\u0101\u00e1\u01ce\u00e0]/g, "a")
      .replace(/[\u0113\u00e9\u011b\u00e8]/g, "e")
      .replace(/[\u012b\u00ed\u01d0\u00ec]/g, "i")
      .replace(/[\u014d\u00f3\u01d2\u00f2]/g, "o")
      .replace(/[\u016b\u00fa\u01d4\u00f9]/g, "u")
      .replace(/[\u00fc\u01d6\u01da\u01d8\u01dc]/g, "v")  // ü family -> v
      .replace(/[\u0148\u01f4\u01f5]/g, "n")                // ń / ǹ
      .replace(/\s+/g, "");
    const t = strip(typed);
    return !!t && t === strip(ref);
  }

  function renderTypeItem() {
    const it = typeQueue[typeIdx];
    if (!it) return;
    $("#typeScore").textContent = typeIdx + 1 + "/" + typeQueue.length;
    $("#typeWrap").innerHTML =
      '<div class="dir-label">Listen, then type what you hear</div>' +
      '<div class="type-audio">' +
        audioControls(it.zh, "typeSpeak") +
        '<p class="type-hint">Not sure? Tap 🔊 as many times as you like.</p>' +
      "</div>" +
      '<label class="type-field">' +
        '<span>Pinyin</span>' +
        '<input type="text" id="typePinyin" inputmode="latin" autocomplete="off"' +
          ' autocapitalize="off" autocorrect="off" spellcheck="false"' +
          ' placeholder="e.g. nihao" aria-label="Type the pinyin you hear" />' +
      "</label>" +
      '<label class="type-field">' +
        '<span>Characters</span>' +
        '<input type="text" id="typeZh" autocomplete="off"' +
          ' placeholder="你好" aria-label="Type the characters you hear" />' +
      "</label>" +
      '<button type="button" class="btn btn-primary btn-xl" id="typeCheck">Check</button>' +
      '<p class="type-hint">Typing tones on a phone keyboard is fiddly — pinyin without tone marks is fine.</p>';

    const py = $("#typePinyin");
    const zh = $("#typeZh");
    $("#typeCheck").addEventListener("click", function () { checkTyped(it, py.value, zh.value); });
    zh.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#typeCheck").click(); });
    py.addEventListener("keydown", (e) => { if (e.key === "Enter") zh.focus(); });
    setTimeout(() => py.focus(), 60);
    setTimeout(() => speak(it.zh), 220);
  }

  function checkTyped(it, pyRaw, zhRaw) {
    const pyTyped = String(pyRaw || "").trim();
    const zhTyped = String(zhRaw || "").replace(/\s+/g, "");
    const zhRef = String(it.zh).replace(/\s+/g, "");
    const pyRight = comparePinyin(pyTyped, it.pinyin);
    const zhRight = zhTyped === zhRef;

    // Either field correct counts as success. Requiring both would make a
    // phone keyboard the bottleneck rather than the language.
    const ok = zhRight || pyRight;
    if (ok) typeResults.right++;
    else typeResults.wrong++;

    const reveal =
      '<div class="fb-coach">' +
        '<div class="fb-row ' + (zhRight ? "correct" : "chosen") + '"><span class="fb-lab">You typed</span>' +
          '<span class="fb-val">' + esc(zhTyped || pyTyped || "—") + "</span></div>" +
        '<div class="fb-row correct"><span class="fb-lab">Answer</span>' +
          '<span class="fb-val speakable" data-say="' + esc(it.zh) + '">' +
            esc(it.zh) + " (" + esc(it.pinyin) + ") — " + esc(it.en) + "</span></div>" +
      "</div>";

    const fb = $("#typeFeedback");
    $("#typeWrap").insertAdjacentHTML("beforeend",
      '<div class="feedback-banner ' + (ok ? "ok" : "bad") + ' rich" id="typeFeedback">' +
        "<div class=\"fb-main\"><div class=\"fb-title\">" + (ok ? "✓ Correct" : "✗ Not yet") + "</div>" +
        reveal + "</div>" +
        '<button type="button" id="typeNext">' +
          (typeIdx === typeQueue.length - 1 ? "See results" : "Next") + "</button>" +
      "</div>");

    $$("#typeWrap input").forEach((i) => { i.disabled = true; });
    $("#typeCheck").disabled = true;
    if (ok) { sfx.correct(); } else { sfx.wrong(); }
    announce((ok ? "Correct. " : "Not correct. ") + it.zh + " " + it.pinyin + " means " + it.en);

    $("#typeNext").addEventListener("click", function () {
      typeIdx++;
      if (typeIdx >= typeQueue.length) finishTyping();
      else renderTypeItem();
    });
  }

  function finishTyping() {
    const n = typeQueue.length;
    const pct = Math.round((typeResults.right / n) * 100);
    addXP(typeResults.right * 4);
    save();
    checkAchievements();
    $("#typeWrap").innerHTML =
      '<div class="type-result">' +
        "<strong>" + pct + "%</strong>" +
        "<p>" + typeResults.right + " of " + n + " correct</p>" +
        (pct >= 80 ? "Production is solid. Move on to harder material."
          : pct >= 50 ? "Getting there. The same words come back when they are due."
          : "This is the hardest format in the app — that is expected. Keep going.") +
        '<button type="button" class="btn btn-primary btn-xl" id="typeAgain" style="margin-top:14px">Go again</button>' +
      "</div>";
    $("#typeAgain").addEventListener("click", () => openTyping());
    announce("Typing practice complete. " + pct + " percent correct.");
    sfx.finish();
  }

  /* ── SRS review ────────────────────────────────────────────────────── */
  let reviewCards = [];
  let reviewIdx = 0;
  let reviewResults = { again: 0, good: 0 };

  function startReview() {
    const now = Date.now();
    reviewCards = Object.keys(S.cards)
      .filter((k) => SRS.isDue(S.cards[k], now))
      .map((k) => S.cards[k])
      .sort((a, b) => a.due - b.due)
      .slice(0, 20)
      .map((c) => {
        const meta = M.ALL_CARDS.find((w) => cardKey(w.zh, w.pinyin) === c.id);
        return { rec: c, zh: meta ? meta.zh : c.id.split("|")[0], pinyin: meta ? meta.pinyin : "", en: meta ? meta.en : "" };
      });
    if (!reviewCards.length) {
      toast("Nothing due right now");
      return false;
    }
    reviewIdx = 0;
    reviewResults = { again: 0, good: 0 };
    showScreen("screenReview");
    renderReview();
    return true;
  }

  function renderReview() {
    const item = reviewCards[reviewIdx];
    if (!item) return;
    const fill = $("#reviewProgressFill");
    if (fill) fill.style.width = (reviewIdx / reviewCards.length) * 100 + "%";
    const fb = $("#reviewFeedback");
    // Same reason as the lesson banner: a hidden stale button still responds
    // to keyboard activation and to a screen reader.
    if (fb) { fb.hidden = true; fb.innerHTML = ""; }
    $("#reviewHearts b").textContent = S.hearts;

    const distractors = M.shuffle(M.ALL_CARDS.filter((w) => w.zh !== item.zh)).slice(0, 3)
      .map((w) => w.en);
    const options = M.shuffle(distractors.concat([item.en]));

    $("#reviewBody").innerHTML =
      '<div class="dir-label">What does this mean?</div>' +
      '<div class="prompt-row">' +
        '<div><div class="prompt-zh">' + esc(item.zh) + "</div>" +
        '<div class="prompt-py">' + esc(item.pinyin) + "</div></div>" +
        '<button type="button" class="speaker-btn" id="btnSpeakR" aria-label="Play">🔊</button>' +
      "</div>" +
      '<div class="opt-list">' +
        options.map((o, i) => '<button type="button" class="opt-btn" data-i="' + i + '" aria-label="' + esc(o) + '">' + esc(o) + "</button>").join("") +
      "</div>";
    $("#btnSpeakR").addEventListener("click", () => speak(item.zh));

    let locked = false;
    $$("#reviewBody .opt-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        if (locked) return;
        locked = true;
        const ok = options[+btn.dataset.i] === item.en;
        $$("#reviewBody .opt-btn").forEach((b) => {
          b.disabled = true;
          if (options[+b.dataset.i] === item.en) b.classList.add("correct");
        });
        if (ok) { sfx.correct(); reviewResults.good++; }
        else { btn.classList.add("wrong"); sfx.wrong(); reviewResults.again++; }
        const fbEl = $("#reviewFeedback");
        fbEl.hidden = false;
        fbEl.className = "feedback-banner " + (ok ? "ok" : "bad");
        fbEl.innerHTML =
          "<span>" + (ok ? "✓ Good" : "✗ Again") + "</span>" +
          '<button type="button" id="btnRevNext">Continue</button>';
        $("#btnRevNext").addEventListener("click", nextReview);
      });
    });
  }

  function nextReview() {
    reviewIdx++;
    if (reviewIdx >= reviewCards.length) {
      const bonus = 15;
      addXP(bonus);
      touchStreak();
      save();
      sfx.reward();
      floatXP(bonus);
      toast("Review clear · " + reviewCards.length + " cards");
      showScreen("screenMain");
      renderPractice();
      updateStats();
    } else {
      renderReview();
    }
  }

  /* ── Flashcards (explicit SRS grading) ─────────────────────────────── */
  let cardQueue = [];
  let cardIdx = 0;

  function openDeck(deckId) {
    const deck = M.DECKS.find((d) => d.id === deckId);
    if (!deck || !deck.words.length) { toast("Deck empty"); return; }
    cardQueue = deck.words.map((w) => ({ rec: ensureCard({ zh: w.zh, pinyin: w.pinyin }), w: w }));
    cardIdx = 0;
    $("#cardsTitle").textContent = deck.label;
    $("#cardGrades").hidden = true;
    showScreen("screenCards");
    renderCard();
  }

  function renderCard() {
    const it = cardQueue[cardIdx];
    if (!it) return;
    $("#cardsCount").textContent = cardIdx + 1 + "/" + cardQueue.length;
    $("#cardStage").innerHTML =
      '<button type="button" class="flashcard" id="flashcard">' +
        '<span class="fc-front">' +
          '<span class="fc-zh">' + esc(it.w.zh) + "</span>" +
          '<span class="fc-py">' + esc(it.w.pinyin) + "</span>" +
          '<span class="fc-hint">Tap to reveal</span>' +
        "</span>" +
        '<span class="fc-back">' +
          '<span class="fc-en">' + esc(it.w.en) + "</span>" +
          '<span class="fc-speaker">🔊</span>' +
        "</span>" +
      "</button>";
    $("#flashcard").addEventListener("click", function (ev) {
      if (ev.target.closest("[data-detail]")) return;
      if (!this.classList.contains("flipped")) {
        this.classList.add("flipped");
        speak(it.w.zh);
      }
    });
    const details = $("#cardDetails");
    if (details) {
      details.hidden = true;
      details.onclick = function () { openDetail(it.w.zh); };
    }

    const grades = $("#cardGrades");
    grades.hidden = false;
    if (details) details.hidden = false;
    // Rebind every render: the queue advances after each grade, and a stale
    // listener list would keep firing against a closed-over old item.
    $$(".grade-btn", grades).forEach((b) => {
      b.onclick = function () { gradeCard(b.dataset.grade); };
    });
  }

  function gradeCard(grade) {
    const it = cardQueue[cardIdx];
    if (!it) return;
    S.cards[it.rec.id] = SRS.schedule(it.rec, grade, Date.now());
    save();
    if (grade === "again") {
      it.rec = S.cards[it.rec.id];
      // Cap re-queues: without this a card graded "Again" forever keeps the
      // session alive indefinitely and the user never sees the deck finish.
      const already = cardQueue.filter((x) => x === it).length;
      if (already < 3) cardQueue.push(it);
    }
    cardIdx++;
    if (cardIdx >= cardQueue.length) {
      toast("Deck done");
      showScreen("screenMain");
      renderPractice();
      updateStats();
      return;
    }
    renderCard();
  }

  /* ── Tone Trainer ──────────────────────────────────────────────────── */
  let toneRound = [];
  let toneIdx = 0;
  let toneCorrect = 0;

  function openTones() {
    toneRound = [];
    M.TONE_SETS.forEach((set) => {
      const items = M.shuffle(set.items);
      // Build real minimal pairs: same syllable, two different tones.
      for (let i = 0; i < items.length - 1; i += 2) {
        toneRound.push({ answer: items[i], option: items[i + 1], setName: set.setName });
      }
    });
    toneRound = M.shuffle(toneRound);
    toneIdx = 0;
    toneCorrect = 0;
    $("#toneHint").textContent = "Which tone did you hear?";
    $("#toneFeedback").hidden = true;
    showScreen("screenTones");
    renderToneRound();
  }

  function renderToneRound() {
      if (toneIdx >= toneRound.length) {
        // Record the score for the Tone Trainer achievement. Bounded history so
        // the save file cannot grow without limit.
        const ratio = toneRound.length ? toneCorrect / toneRound.length : 0;
        S.toneScores = (S.toneScores || []).concat([ratio]).slice(-20);
        addXP(toneCorrect * 2);
        save();
        checkAchievements();
        $("#toneStage").innerHTML =
        '<div class="tone-result"><strong>' + toneCorrect + " / " + toneRound.length + "</strong>" +
        "<p>" + (toneCorrect >= toneRound.length * 0.8 ? "Tones are landing. Move on to words." : "Listen again — the shape matters more than the words.") + "</p></div>";
      $("#toneButtons").innerHTML = '<button type="button" class="btn btn-primary" id="btnToneAgain">Run it again</button>';
      $("#btnToneAgain").addEventListener("click", openTones);
      return;
    }
    const r = toneRound[toneIdx];
    $("#toneScore").textContent = toneCorrect + "/" + toneRound.length;
    $("#toneStage").innerHTML =
      '<button type="button" class="tone-play speaker-btn" id="tonePlay" aria-label="Play">🔊</button>' +
      '<p class="tone-sub">Tap to (re)play</p>';
    $("#toneButtons").innerHTML = M.TONE_MARKS.slice(0, 4).map((t) =>
      '<button type="button" class="tone-btn t' + t.tone + '" data-tone="' + t.tone + '">' +
        t.tone + '<span>' + esc(t.name) + "</span></button>").join("");

    const play = () => speak(r.answer.single);
    $("#tonePlay").addEventListener("click", play);
    setTimeout(play, 350);

    $$("#toneButtons .tone-btn").forEach((b) => {
      b.addEventListener("click", function () {
        const picked = +b.dataset.tone;
        const ok = picked === r.answer.tone;
        $$("#toneButtons .tone-btn").forEach((x) => {
          x.disabled = true;
          // classList.add("") throws InvalidCharacterError and would abort the
          // rest of this handler, so only add a class when there is one.
          const n = Number(x.dataset.tone);
          if (n === r.answer.tone) x.classList.add("correct");
          else if (n === picked) x.classList.add("wrong");
        });
        if (ok) { toneCorrect++; sfx.correct(); } else { sfx.wrong(); }
        const fb = $("#toneFeedback");
        fb.hidden = false;
        fb.className = "feedback-banner " + (ok ? "ok" : "bad") + " rich";
        fb.innerHTML =
          '<div class="fb-main"><div class="fb-title">' +
            (ok ? "✓ Correct" : "✗ It was tone " + r.answer.tone) + "</div>" +
            '<div class="fb-pair">' + esc(r.answer.zh) + " (" + esc(r.answer.single) + ") — " + esc(r.answer.en) +
            " · " + esc(r.answer.pitch) + "</div></div>" +
          '<button type="button" id="toneNext">Next</button>';
        $("#toneNext").addEventListener("click", function () {
          toneIdx++;
          fb.hidden = true;
          fb.innerHTML = "";
          renderToneRound();
        });
      });
    });
  }

  /* ── Flip Match ────────────────────────────────────────────────────── */
  function openFlip() {
    const pool = M.ALL_CARDS.filter((w) => w.zh && w.en && w.zh.length <= 4);
    const chosen = M.shuffle(pool).slice(0, 6);
    const tiles = M.shuffle(chosen.flatMap((w, i) => ([
      { pair: i, face: "zh", label: w.zh },
      { pair: i, face: "en", label: w.en }
    ])));
    let matched = 0;
    let first = null;
    let busy = false;
    $("#flipScore").textContent = "0/" + chosen.length;
    $("#flipCoach").hidden = true;
    $("#flipGrid").innerHTML = tiles.map((t, i) =>
      '<button type="button" class="flip-tile" data-i="' + i + '" data-pair="' + t.pair + '" aria-label="Card"><span class="back">◇</span></button>').join("");

    $$("#flipGrid .flip-tile").forEach((btn) => {
      btn.addEventListener("click", function () {
        if (busy || btn.classList.contains("matched") || btn.classList.contains("face-up")) return;
        const t = tiles[+btn.dataset.i];
        btn.classList.add("face-up");
        if (t.face === "zh") {
          btn.innerHTML = '<span class="zh speakable">' + esc(t.label) + "</span>";
          speak(t.label);
        } else {
          btn.innerHTML = esc(t.label);
        }
        if (!first) { first = { btn: btn, t: t }; return; }
        busy = true;
        const a = first;
        first = null;
        if (a.t.pair === btn.dataset.pair && a.t.face !== t.face) {
          setTimeout(function () {
            a.btn.classList.add("matched");
            btn.classList.add("matched");
            matched++;
            $("#flipScore").textContent = matched + "/" + chosen.length;
            busy = false;
            if (matched === chosen.length) {
              addXP(20);
              save();
              sfx.finish();
              sparkles();
              floatXP(20);
              $("#flipCoach").hidden = false;
              $("#flipCoach").className = "feedback-banner ok rich";
              $("#flipCoach").innerHTML = "<span>Board clear · +20 XP</span>";
              updateStats();
            }
          }, 280);
        } else {
          sfx.wrong();
          [a.btn, btn].forEach((n) => n.classList.add("mismatch"));
          const coach = $("#flipCoach");
          coach.hidden = false;
          coach.className = "feedback-banner bad rich";
          coach.innerHTML =
            '<div class="fb-coach">' +
              '<div class="fb-row chosen"><span class="fb-lab">You matched</span><span class="fb-val">' +
                esc(a.t.label + " ↔ " + t.label) + "</span></div>" +
            "</div>";
          setTimeout(function () {
            [a.btn, btn].forEach((n) => {
              n.classList.remove("face-up", "mismatch");
              n.innerHTML = '<span class="back">◇</span>';
            });
            busy = false;
          }, 1300);
        }
      });
    });
    showScreen("screenFlip");
  }

  /* ── Practice tab ──────────────────────────────────────────────────── */
  function renderPractice() {
    const box = $("#modeCards");
    if (!box) return;
    const due = dueCount();
    const hasWords = Object.keys(S.cards).length > 0;

    box.innerHTML =
      '<button type="button" class="mode-card primary-mode" id="modeReview"' + (due > 0 ? "" : " disabled") + ">" +
        '<div class="mode-ico green">🔄</div><div class="mode-text"><strong>Review</strong>' +
        "<span>" + (due > 0 ? due + " due · ~2 min" : "Nothing due 🎉") + "</span></div>" +
        (due > 0 ? '<span class="mode-start">Start</span>' : "") +
      "</button>" +
      '<button type="button" class="mode-card teal-mode" id="modeTones">' +
        '<div class="mode-ico teal">🎵</div><div class="mode-text"><strong>Tone Trainer</strong>' +
        "<span>Hear it · pick the tone</span></div><span class=\"mode-start teal\">Start</span></button>" +
      '<button type="button" class="mode-card teal-mode" id="modeWrite">' +
        '<div class="mode-ico teal">✍️</div><div class="mode-text"><strong>Write</strong>' +
        "<span>Trace characters with your finger</span></div><span class=\"mode-start teal\">Start</span></button>" +
      '<button type="button" class="mode-card purple-mode" id="modeType">' +
        '<div class="mode-ico purple">⌨️</div><div class="mode-text"><strong>Type it</strong>' +
        "<span>Hear it · type what you hear</span></div><span class=\"mode-start purple\">Start</span></button>" +
      '<button type="button" class="mode-card gold-mode" id="modeFlip">' +
        '<div class="mode-ico gold">🃏</div><div class="mode-text"><strong>Flip Match</strong>' +
        "<span>Match words to meanings</span></div><span class=\"mode-start gold\">Start</span></button>";

    $("#modeReview").addEventListener("click", startReview);
    $("#modeTones").addEventListener("click", openTones);
    $("#modeWrite").addEventListener("click", openWritePicker);
    $("#modeType").addEventListener("click", () => openTyping());
    $("#modeFlip").addEventListener("click", openFlip);

    const grid = $("#deckGrid");
    grid.innerHTML = M.DECKS.map((d) => {
      const learned = d.words.filter((w) => S.introduced[cardKey(w.zh, w.pinyin)]).length;
      const pct = d.words.length ? Math.round((learned / d.words.length) * 100) : 0;
      return '<button type="button" class="deck-card" data-deck="' + d.id + '">' +
        '<div class="deck-top"><strong>' + esc(d.label) + "</strong>" +
        '<span class="deck-count">' + learned + "/" + d.words.length + "</span></div>" +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<span class="deck-cta">Study cards →</span></button>';
    }).join("");
    $$(".deck-card", grid).forEach((b) =>
      b.addEventListener("click", () => openDeck(b.dataset.deck)));

    if (!hasWords) {
      const coach = $("#practiceCoach");
      coach.hidden = false;
      coach.innerHTML = "🐉 Clear a lesson first — every word you meet joins the spaced-repetition queue.";
    } else {
      $("#practiceCoach").hidden = true;
    }
  }

  /* ── Progress tab ──────────────────────────────────────────────────── */
  function renderProgress() {
    const stats = $("#profileStats");
    if (!stats) return;
    const total = ALL_LESSONS.length;
    const done = ALL_LESSONS.filter((l) => S.completed[l.id]).length;
    const learned = Object.keys(S.introduced).length;
    const mature = Object.keys(S.cards).filter((k) => (S.cards[k].interval || 0) >= 21).length;

    stats.innerHTML =
      '<div class="stat-row"><span style="color:#FF5722">🔥</span> Day streak <span class="val">' + S.streak + "</span></div>" +
      '<div class="stat-row"><span style="color:#FBBF24">⭐</span> Total XP <span class="val">' + S.xp + "</span></div>" +
      '<div class="stat-row"><span style="color:#22C55E">✓</span> Lessons cleared <span class="val">' + done + "/" + total + "</span></div>" +
      '<div class="stat-row"><span style="color:#26B8B3">📖</span> Words introduced <span class="val">' + learned + "</span></div>" +
      '<div class="stat-row"><span style="color:#22C55E">🧠</span> Cards matured (3wk+) <span class="val">' + mature + "</span></div>" +
      '<div class="stat-row"><span style="color:#F24D59">♥</span> Hearts <span class="val">' + S.hearts + "/" + S.maxHearts + "</span></div>";

    const units = $("#profileUnits");
    units.innerHTML = M.UNITS.map((u) => {
      const d = u.lessons.filter((l) => S.completed[l.id]).length;
      const pct = u.lessons.length ? (d / u.lessons.length) * 100 : 0;
      return '<div class="unit-row"><span>' + u.icon + "</span>" +
        '<div><strong>' + esc(u.title) + "</strong><br/><span>" + d + "/" + u.lessons.length + " lessons</span></div>" +
        '<div class="bar"><i style="width:' + pct + "%;background:" + u.color + '"></i></div></div>';
    }).join("");

    const fc = $("#forecast");
    const buckets = SRS.forecast(Object.keys(S.cards).map((k) => S.cards[k]), Date.now(), 7);
    fc.innerHTML = buckets.map((n, i) =>
      '<div class="fc-col"><i style="height:' + Math.max(4, Math.min(60, n * 6)) + 'px"></i><span>' + n + "</span>" +
      "<small>" + (i === 0 ? "now" : "+" + i + "d") + "</small></div>").join("");
  }

  /* ── Chrome: tabs, stats ───────────────────────────────────────────── */
  function updateStats() {
      const bar = $("#statsBar");
      if (!bar) return;
      bar.innerHTML =
        '<div class="stat-chip"><span class="ico" style="color:#FF5722">🔥</span>' + S.streak + ' <span class="lab">Streak</span></div>' +
        '<div class="stat-chip"><span class="ico" style="color:#FBBF24">⭐</span>' + S.xp + ' <span class="lab">XP</span></div>' +
        '<div class="stat-chip"><span class="ico" style="color:#F24D59">♥</span>' + S.hearts + ' <span class="lab">Hearts</span></div>';

      // Daily goal ring: a small progress arc, always visible, never naggy.
      const ring = $("#goalRing");
      if (ring) {
        const g = goalProgress();
        const R = 15;
        const C = 2 * Math.PI * R;
        const dash = C * g.pct;
        ring.innerHTML =
          '<svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">' +
            '<circle cx="18" cy="18" r="' + R + '" fill="none" stroke="rgba(155,176,163,.28)" stroke-width="4"/>' +
            '<circle cx="18" cy="18" r="' + R + '" fill="none" stroke="' + (g.met ? "#FBBF24" : "#22C55E") +
              '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + dash + " " + C +
              '" transform="rotate(-90 18 18)"/>' +
          "</svg>" +
          '<span class="goal-num">' + g.done + "</span>";
        ring.title = "Daily goal: " + g.done + " / " + g.goal + " XP";
        ring.setAttribute("aria-label", "Daily goal " + g.done + " of " + g.goal + " XP");
      }

      const badge = $("#dueBadge");
      const due = dueCount();
      if (due > 0) { badge.hidden = false; badge.textContent = String(due); }
      else badge.hidden = true;
    }

    /* Goal picker + achievements grid on the Progress tab. */
    function renderGoalRow() {
      const row = $("#goalRow");
      if (!row) return;
      const g = goalProgress();
      row.innerHTML =
        '<div class="goal-info">' +
          "<strong>" + g.done + " / " + g.goal + " XP</strong> today" +
          (g.met ? '<span class="goal-met">✓ goal met</span>' : '<span class="goal-hint">' + (g.goal - g.done) + " to go</span>") +
        "</div>" +
        '<div class="goal-opts">' +
          GOAL_OPTIONS.map((v) =>
            '<button type="button" class="goal-opt' + (v === g.goal ? " on" : "") + '" data-goal="' + v + '">' +
            v + " XP</button>").join("") +
        "</div>";
      $$(".goal-opt", row).forEach((b) => {
        b.addEventListener("click", function () {
          S.settings.dailyGoal = +b.dataset.goal;
          save();
          renderGoalRow();
          updateStats();
          toast("Daily goal set to " + b.dataset.goal + " XP");
        });
      });
    }

    function renderAchievements() {
      const box = $("#achievements");
      if (!box) return;
      const list = achievementState();
      const earned = list.filter((a) => a.earned).length;
      box.innerHTML =
        '<div class="ach-summary">' + earned + " / " + list.length + " earned</div>" +
        '<div class="ach-grid">' +
          list.map((a) =>
            '<div class="ach' + (a.earned ? " earned" : "") + '" title="' + esc(a.desc) + '">' +
              '<span class="ach-icon">' + a.icon + "</span>" +
              '<span class="ach-name">' + esc(a.name) + "</span>" +
            "</div>").join("") +
        "</div>";
    }

  function setTab(name) {
    $$(".tab").forEach((t) => {
      const on = t.dataset.goto === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-current", on ? "page" : "false");
    });
    $$(".tab-panel").forEach((p) => { p.hidden = p.dataset.tab !== name; });
    if (name === "learn") renderLearn();
    if (name === "practice") renderPractice();
    if (name === "progress") { renderProgress(); renderGoalRow(); renderAchievements(); }
    updateStats();
  }

  function toMain(tab) {
    showScreen("screenMain");
    setTab(tab || "learn");
  }

  /* Tap-to-lookup. Any run of Chinese characters that has an indexed entry
   * becomes tappable. Delegated once, so content rendered later is covered
   * without rewiring each screen. Tapping inside an existing control (a speak
   * button, an option) is left alone -- those already do something. */
  document.addEventListener("click", function (e) {
    if (!$("#detailSheet").hidden) return;
    // The explicit info button wins before the "is it a control" guard below.
    const info = e.target.closest && e.target.closest("[data-detail]");
    if (info) {
      e.preventDefault();
      openDetail(info.getAttribute("data-detail"));
      return;
    }
    // Chinese runs that are NOT already controls: grammar examples, detail
    // examples, sentence rows. Anything that is already a button keeps its
    // own meaning -- a lesson prompt taps to speak, so overloading it with
    // "open the entry" would be two meanings on one target.
    const inControl = e.target.closest("button, a, input, .opt-btn, .build-tile, .node-btn, canvas, .speaker-btn, .grade-btn, .tone-btn");
    if (inControl) return;
    const node = e.target.closest("[data-zh-lookup], .prompt-zh, .teach-zh, .teach-card .teach-zh");
    if (!node) return;
    const zh = (node.getAttribute && node.getAttribute("data-zh-lookup")) || node.textContent || "";
    const trimmed = String(zh).trim();
    if (!trimmed || !M.lookupWord) return;
    // Only open when the whole string is something we know; a sentence's
    // characters are indexed individually, not as a phrase.
    if (M.lookupWord(trimmed)) { e.preventDefault(); openDetail(trimmed); }
  });

  /* ── Boot ──────────────────────────────────────────────────────────── */
  function boot() {
    showScreen("screenSplash");
    applyTheme();
    applySpeechSettings();
    wireTrace();
    renderGoalRow();
    renderAchievements();

    // Restore the last XP so the header is right on the splash→main transition.
    updateStats();

    $("#detailClose").addEventListener("click", closeDetail);
    $("#detailScrim").addEventListener("click", closeDetail);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#detailSheet").hidden) { closeDetail(); return; }
    });

    $("#btnStart").addEventListener("click", function () {
      // Any audio or speech call before this gesture is blocked on iOS.
      ac();
      speak("nǐ hǎo");
      if (S.onboarded) toMain("learn");
      else { onboardIdx = 0; showScreen("screenOnboard"); renderOnboard(); }
    });

    // ── Onboarding controls ──
    $("#btnOnboardNext").addEventListener("click", function () {
      if (onboardIdx >= ONBOARD_STEPS.length - 1) { finishOnboarding(); return; }
      onboardIdx++;
      renderOnboard();
    });
    $("#btnOnboardBack").addEventListener("click", function () {
      if (onboardIdx > 0) { onboardIdx--; renderOnboard(); }
    });
    $("#btnSkipOnboard").addEventListener("click", finishOnboarding);

    $("#btnCloseLesson").addEventListener("click", () => toMain("learn"));
    $("#btnCloseReview").addEventListener("click", () => toMain("practice"));
    $("#btnCloseFlip").addEventListener("click", () => toMain("practice"));
    $("#btnCloseCards").addEventListener("click", () => toMain("practice"));
    $("#btnCloseTones").addEventListener("click", () => toMain("practice"));
    $("#btnToPractice").addEventListener("click", claimXP);
    $$(".tab").forEach((t) => t.addEventListener("click", () => setTab(t.dataset.goto)));

    $("#btnSound").addEventListener("click", function () {
      S.settings.sound = !S.settings.sound;
      this.textContent = "🔊 Sound: " + (S.settings.sound ? "on" : "off");
      save();
    });
    $("#btnVibrate").addEventListener("click", function () {
      S.settings.haptics = !S.settings.haptics;
      this.textContent = "📳 Haptics: " + (S.settings.haptics ? "on" : "off");
      save();
    });

    // Cycle the listening speed; each tap steps through slower/natural/fast so
    // the learner can find their own speed instead of guessing.
    $("#btnSpeechRate").addEventListener("click", function () {
      const i = SPEECH_STEPS.findIndex((r) => r >= (S.settings.speechRate || 0.7) - 0.001);
      S.settings.speechRate = SPEECH_STEPS[(i + 1) % SPEECH_STEPS.length];
      applySpeechSettings();
      save();
      speak("nǐ hǎo");   // audition the new speed immediately
    });

    $("#btnShowEnglish").addEventListener("click", function () {
      S.settings.showEnglish = !S.settings.showEnglish;
      this.textContent = "🇬🇧 English meaning: " + (S.settings.showEnglish ? "on" : "off");
      save();
      toast(S.settings.showEnglish ? "Meaning shown before you answer" : "No meaning hint — recall only");
    });
    $("#btnShowPinyin").addEventListener("click", function () {
      S.settings.showPinyin = !S.settings.showPinyin;
      this.textContent = "🔤 Pinyin hints: " + (S.settings.showPinyin ? "on" : "off");
      save();
    });
    $("#btnTracePractice").addEventListener("click", function () {
      S.settings.tracePractice = !S.settings.tracePractice;
      this.textContent = "✍️ Writing practice: " + (S.settings.tracePractice ? "on" : "off");
      save();
    });
    $("#btnTheme").addEventListener("click", function () {
      S.settings.theme = nextTheme(S.settings.theme);
      applyTheme();
      save();
    });
    $("#btnExport").addEventListener("click", exportData);
    $("#btnImport").addEventListener("click", importData);
    $("#btnCheckVoice").addEventListener("click", function () {
      // Force a re-resolve: a voice may have been installed since page load.
      zhVoice = null;
      voicesResolvedAt = 0;
      const v = resolveVoice();
      if (!v) {
        toast("No Mandarin voice — Settings › Accessibility › Spoken Content");
      } else {
        toast("Voice found: " + v.name);
        speak("你好");
      }
    });
    $("#btnReset").addEventListener("click", function () {
      if (!window.confirm("Erase all XP, streaks and review cards? This cannot be undone.")) return;
      S = defaultState();
      save();
      toMain("learn");
      toast("Progress reset");
    });

    // iOS install affordance: show only when it is actually installable.
    const installBtn = $("#btnInstall");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      installBtn.hidden = false;
      installBtn.addEventListener("click", () => { e.prompt(); }, { once: true });
    });
    if (window.navigator.standalone === false && /iphone|ipad/i.test(navigator.userAgent)) {
      installBtn.hidden = false;
      installBtn.addEventListener("click", () => {
        toast("Tap Share → Add to Home Screen");
      });
    }

    // Offline shell. Registering the SW is what makes it installable.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch((e) => {
        console.info("[MandarinPath] service worker not registered:", e.message);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.MP_APP = { state: () => S, speak: speak, reset: () => { S = defaultState(); save(); },
    // Test hook: exercises nextExercise/gradeExercise without driving the DOM.
    // Used by test-friendliness.js to assert the beginner re-queue actually
    // re-presents missed items before the lesson ends.
    _test: {
      beginLesson: function (id) {
        const u = M.UNITS.find((x) => x.lessons.some((l) => l.id === id));
        const l = u.lessons.find((x) => x.id === id);
        if (!l) return false;
        lesson = l; lessonIdx = 0;
        lessonResults = { correct: 0, total: 0, wrongItems: [], retry: [], retryRounds: 0 };
        return true;
      },
      current: function () { return lesson.exercises[lessonIdx]; },
      idx: function () { return lessonIdx; },
      len: function () { return lesson.exercises.length; },
      results: function () { return JSON.parse(JSON.stringify(lessonResults)); },
      grade: function (ok, detail) { gradeExercise(ok, detail || {}); },
      next: function () { nextExercise(); },
      done: function () { return !!document.getElementById("screenComplete").hidden === false; }
    }
  };
})();