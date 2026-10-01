/* Validates the generated data bundles. Run: node validate-data.js
 *
 * These files come from research agents, so they get checked rather than
 * trusted: wrong stroke data would silently produce wrong grading feedback.
 */
const fs = require("fs");
const vm = require("vm");

let fails = 0;
function fail(msg) { fails++; console.log("FAIL  " + msg); }

function load(file) {
  const sb = { window: {}, console, Math, Set, JSON };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(__dirname + "/" + file, "utf8"), sb);
  return sb.window;
}

console.log("=== strokes-data.js ===");
const w = load("strokes-data.js");
const STROKES = w.MP_STROKES;
if (!STROKES) fail("window.MP_STROKES is missing");
else {
  const keys = Object.keys(STROKES);
  console.log("characters: " + keys.length);
  if (keys.length < 100) fail("only " + keys.length + " characters (expected 120)");

  let total = 0;
  let minPts = Infinity;
  let oob = 0;
  let unnamed = 0;
  let degenerate = 0;

  keys.forEach((ch) => {
    const entry = STROKES[ch];
    if (!entry || !Array.isArray(entry.strokes) || !entry.strokes.length) {
      fail(ch + ": no strokes");
      return;
    }
    if (typeof entry.count !== "number") fail(ch + ": missing stroke count");
    else if (entry.count !== entry.strokes.length)
      fail(ch + ": count " + entry.count + " != strokes " + entry.strokes.length);

    entry.strokes.forEach((s, i) => {
      total++;
      if (!s.name) unnamed++;
      if (!Array.isArray(s.pts) || s.pts.length < 2) {
        fail(ch + " stroke " + i + ": needs >=2 points");
        return;
      }
      minPts = Math.min(minPts, s.pts.length);
      // A stroke whose endpoints coincide cannot be traced meaningfully.
      const a = s.pts[0], b = s.pts[s.pts.length - 1];
      if (s.pts.length === 2 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1) degenerate++;
      s.pts.forEach((p) => {
        if (!Array.isArray(p) || p.length !== 2) { fail(ch + " stroke " + i + ": malformed point"); return; }
        if (p[0] < -5 || p[0] > 1005 || p[1] < -5 || p[1] > 1005) oob++;
      });
    });
  });

  console.log("total strokes: " + total);
  console.log("min points per stroke: " + minPts);
  if (unnamed) fail(unnamed + " strokes have no name");
  if (oob) fail(oob + " points fall outside the 1000x1000 grid");
  if (degenerate) fail(degenerate + " strokes have zero length");
  if (minPts < 2) fail("a stroke has fewer than 2 points");

  // The grader must be able to score every character without throwing.
  const T = w.MP_TRACE;
  if (T) {
    let graded = 0;
    keys.slice(0, 40).forEach((ch) => {
      try {
        // Feed the reference back in as if the learner drew it exactly:
        // every character must be gradeable in principle.
        const s = STROKES[ch];
        const strokes = s.strokes.map((x) => ({ pts: x.pts.map((p) => [p[0] * 0.34, p[1] * 0.34]) }));
        const res = T.grade(strokes, s, { x: 0, y: 0, w: 340, h: 340 });
        if (!isFinite(res.score)) fail(ch + ": grader returned a non-finite score");
        graded++;
      } catch (e) {
        fail(ch + ": grader threw " + e.message);
      }
    });
    console.log("self-graded without error: " + graded + "/40");
  } else {
    console.log("(MP_TRACE not loaded in this pass — graded separately by test-trace.js)");
  }

  console.log("sample 十: " + JSON.stringify(STROKES["十"]));
}

console.log("\n=== sentences-data.js ===");
const w2 = load("sentences-data.js");
const SENT = w2.MP_SENTENCES;
if (!SENT) fail("window.MP_SENTENCES is missing");
else {
  const pats = SENT.patterns || [];
  const sens = SENT.sentences || [];
  console.log("patterns: " + pats.length + " | sentences: " + sens.length);
  if (pats.length < 25) fail("only " + pats.length + " patterns (expected 30)");
  if (sens.length < 70) fail("only " + sens.length + " sentences (expected 80)");

  const CJK = /[\u4e00-\u9fff]/;
  const PUNCT = /[。，？！、,.?!]/;
  const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/;
  const seen = new Set();

  pats.forEach((p, i) => {
    if (!p.zh || !CJK.test(p.zh)) fail("pattern " + i + ": no Chinese");
    if (!p.pinyin) fail("pattern " + i + ": no pinyin");
    if (!p.en) fail("pattern " + i + ": no English");
    if (!p.slots || !p.slots.length) fail("pattern " + i + ": no slots");
  });

  // Pinyin orthography merges some syllables into one written word (早上 =
  // "zǎoshang", 餐厅 = "cāntīng") and erhua appends a syllable as a bare -r
  // (哪儿 = "nǎr" is two). So count vowel nuclei and add one for a trailing -r.
  const VOWELS = "[aeiou\u00fc\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01da\u01d8]";
  function countSyllables(pinyin) {
    const tokens = String(pinyin || "").replace(/[.,?!，。？！、]/g, " ").trim().split(/\s+/).filter(Boolean);
    let n = 0;
    tokens.forEach((t) => {
      const body = t.replace(/[^a-zA-Z\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01da\u01d8]/g, "").toLowerCase();
      if (!body) return;
      const groups = body.match(/[aeiou\u00fc\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01da\u01d8]+/g);
      n += groups ? groups.length : 1;
      if (new RegExp(VOWELS + "r$").test(body)) n += 1;
    });
    return n;
  }

  sens.forEach((s, i) => {
    if (!s.zh || !CJK.test(s.zh)) fail("sentence " + i + ": no Chinese");
    if (!s.pinyin) fail("sentence " + i + ": no pinyin");
    else if (!/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(s.pinyin)) fail("sentence " + i + ": pinyin not latin");
    if (!s.en) fail("sentence " + i + ": no English");
    if (seen.has(s.zh)) fail("sentence " + i + " duplicate: " + s.zh);
    seen.add(s.zh);

    // Syllable count should track character count exactly. A mismatch means a
    // dropped or duplicated syllable, which would mislead a learner reading
    // the pinyin as a pronunciation guide.
    const chars = Array.from(s.zh).filter((c) => !PUNCT.test(c)).length;
    const syl = countSyllables(s.pinyin);
    if (chars !== syl)
      fail("sentence " + i + " (" + s.zh + "): " + chars + " chars vs " + syl + " syllables [" + s.pinyin + "]");
  });

  const withTone = sens.filter((s) => TONE.test(s.pinyin || "")).length;
  console.log("sentences with tone marks: " + withTone + "/" + sens.length);
  console.log("sample: " + JSON.stringify(sens[0]));
}

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " PROBLEMS");
process.exit(fails === 0 ? 0 : 1);