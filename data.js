/* MandarinPath — curriculum + tone data.
 *
 * Content sources:
 *  - MP_WORDS / MP_PHRASES / MP_TRICKY: 250 highest-frequency words, 60 phrases,
 *    40 mispronunciation notes (generated research pack, verified parse-clean).
 *  - Tone minimal pairs: hand-checked against the phonology reference.
 *  - UNITS / LESSONS: generated from MP_WORDS by HSK band and frequency so the
 *    path stays balanced as content grows.
 */
(function () {
  "use strict";

  const WORDS = window.MP_WORDS || [];
  const PHRASES = window.MP_PHRASES || {};
  const TRICKY = window.MP_TRICKY || [];
  const SENT = window.MP_SENTENCES || { patterns: [], sentences: [] };
  const GRAMMAR = (window.MP_GRAMMAR || {}).notes || [];
  const NUMBERS = window.MP_NUMBERS || { numbers: [], measures: [], dates: [], times: [] };
  const WORDS2 = window.MP_WORDS2 || [];

  /* ── Tones ────────────────────────────────────────────────────────────
   * Each entry is a minimal set: same syllable, different tone.
   * `zh` is the full word, `single` is the syllable used for TTS so the
   * ear only has to discriminate tone, not vocabulary.
   */
  const TONE_SETS = [
    { base: "ma", setName: "mā má mǎ mà", items: [
      { tone: 1, zh: "妈", single: "mā", en: "mom", pitch: "high level, flat (55)" },
      { tone: 2, zh: "麻", single: "má", en: "hemp", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "马", single: "mǎ", en: "horse", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "骂", single: "mà", en: "to scold", pitch: "falling, high to low (51)" }
    ]},
    { base: "yi", setName: "yī yí yǐ yì", items: [
      { tone: 1, zh: "衣", single: "yī", en: "clothes", pitch: "high level, flat (55)" },
      { tone: 2, zh: "姨", single: "yí", en: "aunt", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "椅", single: "yǐ", en: "chair", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "亿", single: "yì", en: "hundred million", pitch: "falling, high to low (51)" }
    ]},
    { base: "shu", setName: "shū shú shǔ shù", items: [
      { tone: 1, zh: "书", single: "shū", en: "book", pitch: "high level, flat (55)" },
      { tone: 2, zh: "熟", single: "shú", en: "cooked / familiar", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "数", single: "shǔ", en: "to count", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "树", single: "shù", en: "tree", pitch: "falling, high to low (51)" }
    ]},
    { base: "shi", setName: "shī shí shǐ shì", items: [
      { tone: 1, zh: "诗", single: "shī", en: "poem", pitch: "high level, flat (55)" },
      { tone: 2, zh: "十", single: "shí", en: "ten", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "使", single: "shǐ", en: "to make", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "是", single: "shì", en: "to be", pitch: "falling, high to low (51)" }
    ]},
    { base: "hao", setName: "hāo háo hǎo hào", items: [
      { tone: 1, zh: "蒿", single: "hāo", en: "artemisia (rare)", pitch: "high level, flat (55)" },
      { tone: 2, zh: "豪", single: "háo", en: "heroic", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "好", single: "hǎo", en: "good", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "号", single: "hào", en: "number", pitch: "falling, high to low (51)" }
    ]},
    { base: "xin", setName: "xīn xín xǐn xìn", items: [
      { tone: 1, zh: "心", single: "xīn", en: "heart", pitch: "high level, flat (55)" },
      { tone: 2, zh: "新", single: "xín", en: "new", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "信", single: "xǐn", en: "letter (honorific)", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "信", single: "xìn", en: "trust / message", pitch: "falling, high to low (51)" }
    ]},
    { base: "chang", setName: "chāng cháng chǎng chàng", items: [
      { tone: 1, zh: "昌", single: "chāng", en: "prosperous", pitch: "high level, flat (55)" },
      { tone: 2, zh: "长", single: "cháng", en: "long", pitch: "rising, mid to high (35)" },
      { tone: 3, zh: "场", single: "chǎng", en: "field / venue", pitch: "dipping, low then up (214)" },
      { tone: 4, zh: "唱", single: "chàng", en: "to sing", pitch: "falling, high to low (51)" }
    ]}
  ];

  const TONE_MARKS = [
    { tone: 1, mark: "ˉ", name: "high level", zh: "阴平", pitch: "55", how: "flat and high — like stating a fact" },
    { tone: 2, mark: "ˊ", name: "rising", zh: "阳平", pitch: "35", how: "starts mid, climbs — like a question" },
    { tone: 3, mark: "ˇ", name: "dipping", zh: "上声", pitch: "214", how: "drops low, then lifts at the end" },
    { tone: 4, mark: "ˋ", name: "falling", zh: "去声", pitch: "51", how: "starts high, drops hard — firm and final" },
    { tone: 0, mark: "", name: "neutral", zh: "轻声", pitch: "—", how: "quick and light; particles like 的 de, 了 le, 吗 ma" }
  ];

  /* ── Sentence building ───────────────────────────────────────────────
   * The signature word-order exercise: chop a sentence into chunks, shuffle
   * them, and have the learner put it back together. Word order is the thing
   * English speakers get most wrong in Chinese, and multiple choice cannot
   * practise it -- you either recognise the right order or you do not, but
   * neither option forces you to build it.
   *
   * Chunks are real word groups, not single characters, so the answer is
   * grammatically plausible either way and only position distinguishes them.
   * Punctuation rides along with its chunk so the result reads naturally. */
  const CJK = /[\u4e00-\u9fff]/;

  /* Split into chunks on natural boundaries: measure words and particles
   * stay attached to what follows, which is how Mandarin actually parses. */
  function chunkSentence(zh) {
    const chars = Array.from(String(zh || ""));
    if (!chars.length) return [];
    const chunks = [];
    let buf = "";

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      buf += c;
      // Break after a noun-ish or adverb-ish char when something follows.
      const atBreak = /[的了着吗呢吧是在不很太们]/.test(c) ||
        /[一二三四五六七八九十百千万]/.test(c) ||
        (CJK.test(c) && i === chars.length - 1);
      if (atBreak && buf) { chunks.push(buf); buf = ""; }
    }
    if (buf) chunks.push(buf);

    // A sentence of all one chunk cannot be shuffled into a puzzle.
    if (chunks.length < 2) {
      const mid = Math.max(1, Math.floor(chars.length / 2));
      return [chars.slice(0, mid).join(""), chars.slice(mid).join("")];
    }
    return chunks;
  }

  /* Drop trailing punctuation into the previous chunk so it does not become
   * its own confusing tile. */
  function chunkSentenceClean(zh) {
    const raw = chunkSentence(zh);
    const out = [];
    raw.forEach((c) => {
      const m = c.match(/^([^，。？！、,.?!]*)([，。？！、,.?!]*)$/);
      const body = m ? m[1] : c;
      const punct = m ? m[2] : "";
      // Punctuation attaches to the END of its own chunk. Dropping it
      // (as an earlier version did) made a question sentence read as a
      // statement, and it made every build answer differ from the source
      // sentence by one character.
      if (body) {
        out.push(body + punct);
      } else if (punct && out.length) {
        out[out.length - 1] += punct;
      } else if (punct) {
        out.push(punct);
      }
    });
    return out.filter((c) => c.length);
  }

  /* Repeated chunks make the puzzle ambiguous: 谢谢 splits to [谢][谢] and
   * any arrangement looks right. Merge duplicates back together so every tile
   * is distinguishable. */
  function dedupeChunks(chunks) {
    const seen = new Set();
    const out = [];
    chunks.forEach((c) => {
      if (seen.has(c)) {
        // Absorb the repeat into the previous chunk.
        if (out.length) { out[out.length - 1] += c; return; }
      }
      seen.add(c);
      out.push(c);
    });
    return out;
  }

  function sentenceBuildExercise(sentence) {
    let chunks = dedupeChunks(chunkSentenceClean(sentence.zh));

    // Too few chunks to be a puzzle, or every chunk a single character, means
    // the sentence is too short to scramble meaningfully. Return null and let
    // the caller fall back to another exercise type.
    if (chunks.length < 2) return null;
    if (chunks.every((c) => Array.from(c).length === 1)) return null;
    // A puzzle whose tiles are all one character is trivial: the learner can
    // just read the answer off the shuffled bank.
    if (chunks.some((c) => Array.from(c).length === 1) && chunks.length < 3) return null;

    return {
      type: "build",
      zh: sentence.zh,
      pinyin: sentence.pinyin,
      en: sentence.en,
      chunks: chunks,
      answer: chunks.join(""),
      distractors: buildDistractorChunks(chunks, sentence.en)
    };
  }

  /* Two plausible wrong orders built from the same chunks: the sentence
   * reversed, and the first two chunks swapped. Both are real misorderings a
   * learner actually produces, not random noise. */
  function buildDistractorChunks(chunks, enLabel) {
    void enLabel;
    const a = chunks.slice().reverse();
    const b = chunks.slice();
    if (b.length > 2) { const t = b[0]; b[0] = b[1]; b[1] = t; }
    const seen = new Set([chunks.join("")]);
    return [a, b].map((x) => x.join("")).filter((x) => !seen.has(x));
  }

  /* ── Curriculum ────────────────────────────────────────────────────────
   * Eight units. Unit 1 is a pronunciation-only tone unit (no characters yet)
   * because tones gate everything after it. Units 2-8 draw from the
   * frequency-ranked word list so early lessons stay high-yield.
   */
  const UNIT_PLAN = [
    { id: "u1", title: "Tones First", titleZh: "声调", titlePinyin: "shēngdiào", color: "#26B8B3", icon: "🎵", kind: "tones",
      blurb: "Four tones carry as much meaning as the syllable itself." },
    { id: "u2", title: "First Words", titleZh: "第一批词", titlePinyin: "dì yī pī cí", color: "#22C55E", icon: "🌱", kind: "words", from: 0, to: 40,
      blurb: "The most common words in any Mandarin sentence." },
    { id: "u3", title: "People & Family", titleZh: "人和家庭", titlePinyin: "rén hé jiātíng", color: "#FF8C33", icon: "👨‍👩‍👧", kind: "words", from: 40, to: 80,
      blurb: "Talk about who you are and who you know." },
    { id: "u4", title: "Daily Life", titleZh: "日常生活", titlePinyin: "rìcháng shēnghuó", color: "#9E6BF2", icon: "🏠", kind: "words", from: 80, to: 120,
      blurb: "Food, home, errands — the nouns you need every day." },
    { id: "u5", title: "Getting Around", titleZh: "出行", titlePinyin: "chūxíng", color: "#26B8B3", icon: "🗺️", kind: "phrases", group: "Directions & transport",
      blurb: "Directions, transport, and asking where things are." },
    { id: "u6", title: "Talking & Time", titleZh: "说话和时间", titlePinyin: "shuōhuà hé shíjiān", color: "#22C55E", icon: "⏰", kind: "phrases", group: "Time & dates",
      blurb: "Make plans and say when you mean." },
    { id: "u7", title: "Shop & Eat", titleZh: "买东西和吃饭", titlePinyin: "mǎi dōngxi hé chīfàn", color: "#FF8C33", icon: "🍜", kind: "phrases", group: "Ordering food",
      blurb: "Order food, ask the price, pay." },
    { id: "u8", title: "Sound It Out", titleZh: "发音难点", titlePinyin: "fāyīn nándiǎn", color: "#9E6BF2", icon: "🎧", kind: "tricky",
      blurb: "The 40 words beginners reliably get wrong — and why." },
    { id: "u9", title: "Put It Together", titleZh: "组句", titlePinyin: "zǔ jù", color: "#26B8B3", icon: "💬", kind: "sentences",
      blurb: "Real sentences. Isolated words are easier than the real thing." },
    { id: "u10", title: "Numbers & Time", titleZh: "数字和时间", titlePinyin: "shùzì hé shíjiān", color: "#FF8C33", icon: "🔢", kind: "numbers",
      blurb: "Count, ask the price, tell the time. Measure words too." }
  ];

  const LESSONS_PER_UNIT = 4;

  function pickWords(from, to) {
    return WORDS.slice(from, to);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Distractors: same-HSK neighbours are much harder than random words, which
   * is the point — easy distractors make retrieval feel successful for free. */
  function makeOptions(target, pool, n) {
    const pool2 = pool.filter((w) => w.zh !== target.zh);
    const picked = [];
    const seen = new Set();
    // Glosses are not unique per word ("at; in; to be located" covers both
    // 在 and some others), so the de-dup has to run on the displayed string or
    // the same option shows up twice and the answer becomes guessable.
    const push = (w) => {
      if (!w) return;
      const label = w === target ? target.en : w.en;
      if (seen.has(label)) return;
      seen.add(label);
      picked.push(w);
    };
    const sameBand = pool2.filter((w) => w.hsk === target.hsk);
    const rest = pool2.filter((w) => w.hsk !== target.hsk);
    shuffle(sameBand).forEach((w) => { if (picked.length < Math.max(1, Math.ceil(n / 2))) push(w); });
    shuffle(rest).forEach((w) => { if (picked.length < n) push(w); });
    // Fall back to the whole pool if dedup left us short.
    shuffle(pool2).forEach((w) => { if (picked.length < n) push(w); });
    push(target);
    return shuffle(picked).slice(0, n + 1);
  }

  /* One grammar tip per lesson.
   *
   * The note bundle was written against a DIFFERENT outline than this
   * curriculum: its "u2" means particles while ours means First Words, its
   * "u3" means word order while ours means People & Family, and so on. Routing
   * by id alone put 55 of 70 notes in the wrong unit -- particle notes inside
   * First Words, measure words inside Shop & Eat.
   *
   * So the bundle's semantic groups are remapped onto this curriculum's units
   * explicitly. NOTE_GROUP_SOURCE documents which of the bundle's own unit ids
   * each curriculum unit draws from. */
  const NOTE_GROUP_SOURCE = {
    u1: ["u1"],   // tones
    u2: ["u2"],   // particles — foundational, taught with the first words
    u3: ["u3", "u9"], // word order: reinforced in People & Family AND where
                      // sentences are actually built
    u7: ["u10"],  // measure words live with Numbers & Time
    u6: ["u6"],   // time and place — already correct
    u8: ["u4"]    // common errors, surfaced in Daily Life
  };

  const grammarByUnit = {};
  GRAMMAR.forEach((n) => {
    if (!n || !n.unit) return;
    const targets = NOTE_GROUP_SOURCE[n.unit] || [];
    // A note can legitimately serve more than one unit, so assign to all of
    // them rather than first-match-wins.
    targets.forEach((t) => {
      const list = grammarByUnit[t] || (grammarByUnit[t] = []);
      list.push(n);
    });
  });

  let grammarCursor = 0;
  function grammarForUnit(unitId) {
    const list = grammarByUnit[unitId];
    if (!list || !list.length) return null;
    // Deterministic rotation rather than randomness: the same unit always
    // leads with the same note, so a learner working through it sees the
    // foundational points first every time.
    return list[(grammarCursor++) % list.length];
  }

  function lessonFromWords(lessonId, words, unitTitle, xp, distractorPool, unitId) {
    const exercises = [];
    const w = words;
    // Distractor pool: the lesson's own words by default, widened to the whole
    // unit when supplied. Options drawn from only ~10 words make the answer
    // guessable (pick the odd one out). Hard distractors are still the goal —
    // makeOptions prefers same-HSK neighbours — so widening the candidate set
    // raises difficulty without making any single item unfair.
    const pool = (distractorPool && distractorPool.length > w.length) ? distractorPool : w;
    if (w.length === 1) {
      const only = w[0];
      exercises.push({ type: "teach", zh: only.zh, pinyin: only.pinyin, en: only.en });
      exercises.push({ type: "mc", direction: "zh_to_en", prompt: only.zh, pinyin: only.pinyin,
        options: makeOptions(only, pool, 3).map((x) => x.en), answer: only.en });
      exercises.push({ type: "mc", direction: "en_to_zh", prompt: only.en,
        options: makeOptions(only, pool, 3).map((x) => x.zh), answer: only.zh });
      exercises.push({ type: "listen", prompt: only.zh, pinyin: only.pinyin,
        options: makeOptions(only, pool, 3).map((x) => x.en), answer: only.en });
    } else {
      // Teach every word first (teach-before-test), then quiz.
      w.forEach((x) => exercises.push({ type: "teach", zh: x.zh, pinyin: x.pinyin, en: x.en }));
      // Block by recall direction, do NOT alternate zh->en and en->zh per word.
      // Brunmair & Richter found interleaving actively harmful for word
      // material (g = -0.39) — switching format every item splits attention
      // from the word itself. Interleaving belongs in the tile/flip games,
      // which discriminate formats on purpose.
      [true, false].forEach((zhToEn) => {
        w.forEach((x) => {
          exercises.push({ type: "mc",
            direction: zhToEn ? "zh_to_en" : "en_to_zh",
            prompt: zhToEn ? x.zh : x.en,
            pinyin: zhToEn ? x.pinyin : undefined,
            options: makeOptions(x, pool, 3).map((o) => (zhToEn ? o.en : o.zh)),
            answer: zhToEn ? x.en : x.zh });
        });
      });
      // Listening comprehension for EVERY word, not just the first. Hearing a
      // word and recognising it is a different skill from reading it, and a
      // beginner who can read a character they cannot hear is exactly who
      // this exercises.
      w.forEach((x) => {
        exercises.push({ type: "listen", prompt: x.zh, pinyin: x.pinyin,
          options: makeOptions(x, pool, 3).map((o) => o.en), answer: x.en });
      });

      // Mixed round with 6 options: harder distractors drawn from the whole
      // unit, so the answer cannot be found by elimination within the batch.
      w.forEach((x) => {
        exercises.push({ type: "mc", direction: "zh_to_en", prompt: x.zh, pinyin: x.pinyin,
          options: makeOptions(x, pool, 5).map((o) => o.en), answer: x.en });
      });

      // Production: say it back, self-checked, on two words not always the first.
      w.slice(0, 2).forEach((x) => {
        exercises.push({ type: "speakBack", promptZh: x.zh, promptPinyin: x.pinyin,
          promptEn: x.en, maxDurationSec: 4 });
      });

      // Writing: trace the single-character words just taught. The renderer
      // checks stroke data exists, so multi-character words are skipped here.
      w.forEach((x) => {
        if (Array.from(x.zh).length === 1) {
          exercises.push({ type: "trace", zh: x.zh, pinyin: x.pinyin, en: x.en });
        }
      });

      // Grammar tip, once per lesson, if one is mapped to this unit.
      const note = grammarForUnit(unitId);
      if (note) exercises.push({ type: "grammar", note: note });
    }
    return { id: lessonId, title: unitTitle, titleZh: w[0] ? w[0].zh : "", xp: xp, exercises: exercises };
  }

  /* Build the flat UNITS structure the UI renders. */
  const UNITS = UNIT_PLAN.map((plan, ui) => {
    let lessons = [];
    if (plan.kind === "tones") {
      lessons = TONE_SETS.slice(0, LESSONS_PER_UNIT).map((ts, i) => ({
        id: plan.id + "-l" + (i + 1),
        title: ts.setName,
        titleZh: "声调",
        xp: 25,
        exercises: [{ type: "toneSet", set: ts, done: true }]
      }));
    } else if (plan.kind === "tricky") {
      const chunk = 10;
      for (let i = 0; i < TRICKY.length; i += chunk) {
        const slice = TRICKY.slice(i, i + chunk);
        lessons.push({
          id: plan.id + "-l" + (i / chunk + 1),
          title: slice[0].zh + " " + (slice.length > 1 ? "…" : ""),
          titleZh: "易错音",
          xp: 30,
          exercises: slice.map((t) => ({ type: "tricky", zh: t.zh, pinyin: t.pinyin, note: t.note }))
        });
      }
    } else if (plan.kind === "phrases") {
      const list = PHRASES[plan.group] || [];
      const chunk = Math.max(1, Math.ceil(list.length / LESSONS_PER_UNIT));
      for (let i = 0; i < list.length; i += chunk) {
        const slice = list.slice(i, i + chunk);
        lessons.push({
          id: plan.id + "-l" + (i / chunk + 1),
          title: slice[0][2],
          titleZh: slice[0][0],
          xp: 30,
          exercises: slice.map((p) => ({ type: "phrase", zh: p[0], pinyin: p[1], en: p[2] }))
        });
      }
    } else if (plan.kind === "sentences") {
      // Group by situation so the unit stays thematically coherent, and teach
      // every sentence before testing any of them: a full sentence is a much
      // bigger retrieval target than a word.
      const groups = {};
      (SENT.sentences || []).forEach(function (s) {
        const g = s.group || "g_other";
        (groups[g] = groups[g] || []).push(s);
      });
      const keys = Object.keys(groups).sort();
      const targetLessons = LESSONS_PER_UNIT;
      const perLesson = Math.max(2, Math.ceil((SENT.sentences || []).length / targetLessons));
      let n = 0;
      keys.forEach(function (gk) {
        const list = groups[gk];
        const chunk = Math.max(1, Math.min(perLesson, Math.ceil(list.length / Math.max(1, Math.ceil(list.length / perLesson)))));
        for (let i = 0; i < list.length; i += chunk) {
          const slice = list.slice(i, i + chunk);
          const ex = slice.map(function (s) {
            return { type: "sentence", zh: s.zh, pinyin: s.pinyin, en: s.en, group: gk };
          });
          // Build exercise: force the learner to construct the word order.
          slice.forEach(function (s) {
            const b = sentenceBuildExercise(s);
            if (b) ex.push(b);
          });
          slice.forEach(function (s) {
            const others = shuffle((SENT.sentences || [])
              .filter(function (x) { return x.en !== s.en; }))
              .slice(0, 3).map(function (x) { return x.en; });
            ex.push({ type: "mc", direction: "zh_to_en", prompt: s.zh, pinyin: s.pinyin,
              options: shuffle(others.concat([s.en])), answer: s.en });
          });
          // Listening recall: hear it, then recognise it.
          slice.forEach(function (s) {
            const others = shuffle((SENT.sentences || [])
              .filter(function (x) { return x.zh !== s.zh; }))
              .slice(0, 3).map(function (x) { return x.zh; });
            ex.push({ type: "listen", prompt: s.zh, pinyin: s.pinyin,
              options: shuffle(others.concat([s.zh])), answer: s.zh });
          });
          const sNote = grammarForUnit(plan.id);
          if (sNote) ex.push({ type: "grammar", note: sNote });
          lessons.push({
            id: plan.id + "-l" + (++n),
            title: slice[0].en,
            titleZh: slice[0].zh,
            xp: 30,
            exercises: ex
          });
        }
      });
    } else if (plan.kind === "numbers") {
      // Numbers first (they are the highest-utility items in the language),
      // then measure words, then the date/time expressions.
      const chunkOf = (list, per) => {
        const out = [];
        for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
        return out;
      };
      const groups = [
        { key: "numbers", list: NUMBERS.numbers || [], per: 10, kind: "num" },
        { key: "measures", list: NUMBERS.measures || [], per: 6, kind: "measure" },
        { key: "dates", list: NUMBERS.dates || [], per: 8, kind: "num" },
        { key: "times", list: NUMBERS.times || [], per: 7, kind: "num" }
      ];
      let n = 0;
      groups.forEach(function (g) {
        chunkOf(g.list, g.per).forEach(function (slice) {
          const ex = slice.map(function (x) {
            return {
              type: g.kind === "measure" ? "measure" : "num",
              zh: x.zh, pinyin: x.pinyin, en: x.en,
              exampleZh: x.example_zh, exampleEn: x.example_en, note: x.note
            };
          });
          // Test recall against the whole numbers pool so distractors are
          // numerals, not random words.
          slice.forEach(function (x) {
            const others = shuffle(g.list.filter(function (y) { return y.zh !== x.zh; }))
              .slice(0, 3).map(function (y) { return y.zh; });
            ex.push({ type: "mc", direction: "zh_to_en", prompt: x.zh, pinyin: x.pinyin,
              options: shuffle(others.concat([x.zh])), answer: x.zh, numeric: true });
          });
          const sNote = grammarForUnit(plan.id);
          if (sNote) ex.push({ type: "grammar", note: sNote });
          lessons.push({
            id: plan.id + "-l" + (++n),
            title: slice[0].en,
            titleZh: slice[0].zh,
            xp: 30,
            exercises: ex
          });
        });
      });
      const note = grammarForUnit(plan.id);
      if (note && lessons.length) {
        lessons[lessons.length - 1].exercises.push({ type: "grammar", note: note });
      }
    } else {
      const pool = pickWords(plan.from, plan.to);
      const chunk = Math.max(1, Math.ceil(pool.length / LESSONS_PER_UNIT));
      for (let i = 0; i < pool.length; i += chunk) {
        const slice = pool.slice(i, i + chunk);
        const lid = plan.id + "-l" + (i / chunk + 1);
        lessons.push(lessonFromWords(lid, slice, slice[0] ? slice[0].zh : plan.titleZh, 25, pool, plan.id));
      }
    }
    return Object.assign({}, plan, { lessons: lessons });
  });

  /* Every vocabulary word becomes a reviewable card, keyed by HSK band. */
  /* The numbers bundle repeats words the learner already has cards for
   * (个, 今天, 现在, 一点, 时间, ...). A second card for the same word splits
   * its review history in half and makes the "words introduced" count
   * dishonest, so those entries are dropped from the deck -- the word is still
   * taught inside the Numbers unit, it just does not become a second card. */
  const existingHeadwords = new Set(
    WORDS.map((w) => w.zh)
      .concat(WORDS2.map((w) => w.zh))
      .concat(Object.keys(PHRASES).flatMap((g) => PHRASES[g].map((p) => p[0])))
  );
  const numWord = (x) => ({ zh: x.zh, pinyin: x.pinyin, en: x.en, hsk: x.hsk });
  const numEntries = [].concat(
    (NUMBERS.numbers || []).map((x) => numWord({ zh: x.zh, pinyin: x.pinyin, en: x.en, hsk: "number" })),
    (NUMBERS.measures || []).map((x) => ({ zh: x.zh, pinyin: x.pinyin, en: x.en, hsk: "measure" })),
    (NUMBERS.dates || []).map((x) => ({ zh: x.zh, pinyin: x.pinyin, en: x.en, hsk: "date" })),
    (NUMBERS.times || []).map((x) => ({ zh: x.zh, pinyin: x.pinyin, en: x.en, hsk: "time" }))
  );
  const NUM_CARDS = numEntries.filter((x) => !existingHeadwords.has(x.zh));

  const DECKS = [
    { id: "hsk1", label: "HSK 1 · first 100", words: WORDS.slice(0, 100) },
    { id: "hsk2", label: "HSK 2 · 101-250", words: WORDS.slice(100, 250) },
    { id: "themed", label: "Everyday themes · " + WORDS2.length, words: WORDS2.map((w) => ({
      zh: w.zh, pinyin: w.pinyin, en: w.en, hsk: w.hsk,
      exampleZh: w.ex_zh, exampleEn: w.ex_en, theme: w.theme
    })) },
    { id: "tricky", label: "Tricky sounds", words: TRICKY.map((t) => ({ zh: t.zh, pinyin: t.pinyin, en: t.note, hsk: "—" })) },
    { id: "phrases", label: "Everyday phrases", words: Object.keys(PHRASES).flatMap((g) =>
      PHRASES[g].map((p) => ({ zh: p[0], pinyin: p[1], en: p[2], hsk: g }))) },
    { id: "numbers", label: "Numbers, measures, time · " + NUM_CARDS.length, words: NUM_CARDS }
  ];

  /* ── Word index ─────────────────────────────────────────────────────
   * Every bundle contributes to one lookup, so tapping a word anywhere --
   * a lesson, a flashcard, a sentence, a grammar example -- can open the same
   * full entry. Later bundles do not overwrite earlier ones: the core 250
   * gloss is more useful than a themed one, and numbers carry a note. */
  const WORD_INDEX = new Map();
  function indexWord(w) {
    if (!w || !w.zh) return;
    const existing = WORD_INDEX.get(w.zh);
    if (existing) {
      // Fill in gaps rather than replacing what is already known.
      if (!existing.pinyin && w.pinyin) existing.pinyin = w.pinyin;
      if (!existing.en && w.en) existing.en = w.en;
      if (!existing.exampleZh && w.exampleZh) {
        existing.exampleZh = w.exampleZh;
        existing.exampleEn = w.exampleEn;
      }
      if (!existing.note && w.note) existing.note = w.note;
      if (!existing.theme && w.theme) existing.theme = w.theme;
      if (!existing.hsk && w.hsk) existing.hsk = w.hsk;
      if (w.ex_zh && !existing.exampleZh) {
        existing.exampleZh = w.ex_zh;
        existing.exampleEn = w.ex_en;
      }
      return existing;
    }
    const entry = {
      zh: w.zh,
      pinyin: w.pinyin || "",
      en: w.en || "",
      hsk: w.hsk || "",
      theme: w.theme || "",
      note: w.note || "",
      exampleZh: w.exampleZh || w.ex_zh || "",
      examplePinyin: w.examplePinyin || w.ex_pinyin || "",
      exampleEn: w.exampleEn || w.ex_en || ""
    };
    WORD_INDEX.set(w.zh, entry);
    return entry;
  }

  DECKS.forEach((d) => d.words.forEach(indexWord));
  (SENT.sentences || []).forEach((s) => indexWord({ zh: s.zh, pinyin: s.pinyin, en: s.en }));
  GRAMMAR.forEach((n) => { if (n && n.zh) indexWord({ zh: n.zh, pinyin: n.pinyin, en: n.en }); });
  [].concat(
    (NUMBERS.numbers || []).map((x) => Object.assign({ hsk: "number" }, x)),
    (NUMBERS.measures || []).map((x) => Object.assign({ hsk: "measure" }, x)),
    (NUMBERS.dates || []).map((x) => Object.assign({ hsk: "date" }, x)),
    (NUMBERS.times || []).map((x) => Object.assign({ hsk: "time" }, x))
  ).forEach(indexWord);

  const ALL_CARDS = DECKS.flatMap((d) => d.words.map((w) => ({ deck: d.id, zh: w.zh, pinyin: w.pinyin, en: w.en })));

  window.MP = {
    UNITS: UNITS,
    WORDS: WORDS,
    PHRASES: PHRASES,
    TRICKY: TRICKY,
    TONE_SETS: TONE_SETS,
    TONE_MARKS: TONE_MARKS,
    DECKS: DECKS,
    ALL_CARDS: ALL_CARDS,
    WORD_INDEX: WORD_INDEX,
    lookupWord: function (zh) { return WORD_INDEX.get(zh) || null; },
    shuffle: shuffle
  };

  /* Back-compat with the original demo globals. */
  window.MP_UNITS = UNITS;
})();