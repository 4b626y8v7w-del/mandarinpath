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
      settings: { sound: true, haptics: true },
      session: { lessonId: null, index: 0 }
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
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(S));
      } catch (e) {
        toast("Storage full — progress may not save");
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

  function speak(text, opts) {
    if (!window.speechSynthesis || !text) return;
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
    opts = opts || {};
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = zhVoice.lang || "zh-CN";
      u.voice = zhVoice;
      u.rate = opts.rate || 0.85;   // beginners: slow, tones intact
      u.pitch = opts.pitch || 1;
      u.onend = function () {
        document.querySelectorAll(".speaking").forEach((n) => n.classList.remove("speaking"));
      };
      speechSynthesis.speak(u);
    } catch (e) {
      /* some browsers throw if speak() is called too soon after cancel() */
    }
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

  function showScreen(id) {
    ["screenSplash", "screenMain", "screenLesson", "screenReview", "screenFlip",
     "screenCards", "screenTones", "screenComplete"].forEach((s) => {
      const n = document.getElementById(s);
      if (n) n.hidden = s !== id;
    });
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2200);
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

  function cardKey(zh, pinyin) {
    return zh + "|" + (pinyin || "");
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
  let lessonResults = { correct: 0, total: 0, wrongItems: [] };

  function startLesson(id) {
    const l = ALL_LESSONS.find((x) => x.id === id);
    if (!l) return;
    lesson = l;
    lessonIdx = 0;
    locked = false;
    lessonResults = { correct: 0, total: 0, wrongItems: [] };
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
    if (fb) fb.hidden = true;
    locked = false;

    const body = $("#lessonBody");
    if (!ex) return;
    lessonResults.total++;

    if (ex.type === "teach") {
      body.innerHTML =
        '<div class="dir-label">New word · tap to hear</div>' +
        '<div class="teach-card">' +
          '<button type="button" class="teach-zh speakable" id="speakZh">' + esc(ex.zh) + "</button>" +
          '<button type="button" class="teach-py speakable" id="speakPy">' + esc(ex.pinyin) + "</button>" +
          '<div class="teach-en">' + esc(ex.en) + "</div>" +
          '<p class="teach-hint">Tap the characters to hear · 点击听发音</p>' +
          '<button type="button" class="speaker-btn" id="btnSpeak" aria-label="Play">🔊</button>' +
        "</div>" +
        '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Got it — continue</button>';
      const play = () => speak(ex.zh);
      $("#speakZh").addEventListener("click", play);
      $("#speakPy").addEventListener("click", play);
      $("#btnSpeak").addEventListener("click", play);
      $("#btnTeachNext").addEventListener("click", nextExercise);
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

    if (ex.type === "tricky" || ex.type === "phrase") {
      const note = ex.type === "tricky" ? ex.note : ex.en;
      body.innerHTML =
        '<div class="dir-label">' + (ex.type === "tricky" ? "Common mistake · listen closely" : "Say it out loud") + "</div>" +
        '<div class="teach-card">' +
          '<button type="button" class="teach-zh speakable" id="speakZh">' + esc(ex.zh) + "</button>" +
          '<div class="teach-py">' + esc(ex.pinyin) + "</div>" +
          '<div class="teach-en">' + esc(note) + "</div>" +
          '<button type="button" class="speaker-btn" id="btnSpeak" aria-label="Play">🔊</button>' +
        "</div>" +
        '<button type="button" class="btn btn-primary btn-xl" id="btnTeachNext">Understood</button>';
      const play = () => speak(ex.zh);
      $("#speakZh").addEventListener("click", play);
      $("#btnSpeak").addEventListener("click", play);
      $("#btnTeachNext").addEventListener("click", nextExercise);
      return;
    }

    if (ex.type === "mc" || ex.type === "listen") {
      const isListen = ex.type === "listen";
      const zhToEn = ex.direction === "zh_to_en" || isListen;
      const dirLabel = isListen ? "Listen — what does this mean?"
        : zhToEn ? "What does this mean?" : "How do you say this in Chinese?";
      const promptHtml = zhToEn
        ? '<button type="button" class="prompt-zh speakable" id="promptTap">' + esc(ex.prompt) + "</button>" +
          (ex.pinyin ? '<div class="prompt-py">' + esc(ex.pinyin) + "</div>" : "")
        : '<div class="prompt-en">' + esc(ex.prompt) + "</div>";
      const opts = ex.options.map((o, i) => {
        if (CJK.test(o)) {
          return '<div class="opt-row"><button type="button" class="opt-btn has-zh" data-i="' + i + '">' + esc(o) + "</button>" +
            '<button type="button" class="opt-speak" data-speak="' + esc(o) + '" aria-label="Play">🔊</button></div>';
        }
        return '<button type="button" class="opt-btn" data-i="' + i + '">' + esc(o) + "</button>";
      }).join("");

      body.innerHTML =
        '<div class="dir-label">' + dirLabel + "</div>" +
        '<div class="prompt-row">' + promptHtml +
          '<button type="button" class="speaker-btn" id="btnSpeak" aria-label="Play">🔊</button></div>' +
        '<div class="opt-list">' + opts + "</div>";

      const play = () => speak(ex.prompt);
      $("#btnSpeak").addEventListener("click", play);
      const pt = $("#promptTap");
      if (pt) pt.addEventListener("click", play);
      $$(".opt-speak", body).forEach((b) =>
        b.addEventListener("click", (ev) => { ev.stopPropagation(); speak(b.dataset.speak); }));
      if (isListen) setTimeout(play, 300);

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
      showFeedback(true, "Nice!", detail);
    } else {
      lessonResults.wrongItems.push(detail);
      S.hearts = Math.max(0, S.hearts - 1);
      const hb = $("#lessonHearts b");
      if (hb) hb.textContent = S.hearts;
      sfx.wrong();
      showFeedback(false, "Not quite", detail);
      if (S.hearts <= 0) {
        S.hearts = S.maxHearts;
        toast("Hearts refilled — keep going");
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
    S.xp += xp;
    S.completed[lesson.id] = Date.now();
    S.session = { lessonId: null, index: 0 };
    save();

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
    if (fb) fb.hidden = true;
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
        options.map((o, i) => '<button type="button" class="opt-btn" data-i="' + i + '">' + esc(o) + "</button>").join("") +
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
      S.xp += bonus;
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
      if (!this.classList.contains("flipped")) {
        this.classList.add("flipped");
        speak(it.w.zh);
      }
    });
    const grades = $("#cardGrades");
    grades.hidden = false;
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
              S.xp += 20;
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
      '<button type="button" class="mode-card gold-mode" id="modeFlip">' +
        '<div class="mode-ico gold">🃏</div><div class="mode-text"><strong>Flip Match</strong>' +
        "<span>Match words to meanings</span></div><span class=\"mode-start gold\">Start</span></button>";

    $("#modeReview").addEventListener("click", startReview);
    $("#modeTones").addEventListener("click", openTones);
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
    const badge = $("#dueBadge");
    const due = dueCount();
    if (due > 0) { badge.hidden = false; badge.textContent = String(due); }
    else badge.hidden = true;
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
    if (name === "progress") renderProgress();
    updateStats();
  }

  function toMain(tab) {
    showScreen("screenMain");
    setTab(tab || "learn");
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */
  function boot() {
    showScreen("screenSplash");

    // Restore the last XP so the header is right on the splash→main transition.
    updateStats();

    $("#btnStart").addEventListener("click", function () {
      // Any audio or speech call before this gesture is blocked on iOS.
      ac();
      speak("nǐ hǎo");
      toMain("learn");
    });

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

  window.MP_APP = { state: () => S, speak: speak, reset: () => { S = defaultState(); save(); } };
})();