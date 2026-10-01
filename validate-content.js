/* Validates the content bundles. Run: node validate-content.js
 *
 * These came from research agents, so they get checked rather than trusted.
 * The pinyin check is the same idea as validate-data.js: a syllable count
 * that disagrees with the character count means a learner is shown a
 * pronunciation guide that does not match the characters.
 */
const fs = require("fs");
const vm = require("vm");

function load(file) {
  const sb = { window: {}, console, Math, Set, JSON };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(__dirname + "/" + file, "utf8"), sb);
  return sb.window;
}

let fails = 0;
function fail(m) { fails++; console.log("FAIL  " + m); }
function ok(m) { console.log("PASS  " + m); }

const CJK = /[\u4e00-\u9fff]/;
const PUNCT = /[。，？！、,.?!]/;
// ǖ ǘ ǚ ǜ are U+01D6 U+01DA U+01D8 U+01DC. Omitting the last made 红绿灯
// count as two syllables instead of three, producing false positives.
const TONE = "aeiou\u00fc\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01da\u01d8\u01dc";
const VOWELS = "[" + TONE + "]";

function syllables(token) {
  const body = String(token).replace(new RegExp("[^a-zA-Z" + TONE + "]", "g"), "").toLowerCase();
  if (!body) return 0;
  const g = body.match(new RegExp("[" + TONE + "]+", "g"));
  let n = g ? g.length : 1;
  if (new RegExp(VOWELS + "r$").test(body)) n += 1;   // erhua
  return n;
}

function countSyllables(pinyin) {
  return String(pinyin || "")
    .replace(/[.,?!\u2019\u02bc，。？！、]/g, " ")
    .trim().split(/\s+/).filter(Boolean)
    .reduce((n, t) => n + syllables(t), 0);
}

function charCount(zh) {
  return Array.from(String(zh || "")).filter((c) => !PUNCT.test(c)).length;
}

function checkEntry(list, name, keys) {
  const bad = [];
  list.forEach((x, i) => {
    keys.forEach((k) => {
      if (x[k] === undefined || x[k] === null || x[k] === "") bad.push(name + "[" + i + "]." + k);
    });
  });
  if (bad.length) fail(bad.length + " missing fields, e.g. " + bad.slice(0, 3).join(", "));
  else ok(name + ": all " + list.length + " entries complete");
}

function englishFieldsAreEnglish(groups, label) {
  const bad = [];
  Object.keys(groups).forEach((k) => {
    (groups[k] || []).forEach((x, i) => {
      ["en", "example_en"].forEach((f) => {
        if (x[f] && CJK.test(x[f])) bad.push(k + "[" + i + "]." + f);
      });
    });
  });
  if (bad.length) fail(label + ": " + bad.length + " English fields contain Chinese: " + bad.slice(0, 4).join(" | "));
  else ok(label + ": every English field is actually English");
}

/* ── grammar ─────────────────────────────────────────────────────── */
console.log("=== grammar-data.js ===");
const G = load("grammar-data.js").MP_GRAMMAR;
if (!G || !G.notes) fail("window.MP_GRAMMAR.notes missing");
else {
  const n = G.notes;
  console.log("notes: " + n.length);
  if (n.length < 50) fail("only " + n.length + " notes (expected 70)");
  checkEntry(n, "notes", ["id", "unit", "title", "body", "zh", "pinyin", "en"]);

  const dup = n.map((x) => x.id).filter((v, i, a) => a.indexOf(v) !== i);
  if (dup.length) fail("duplicate note ids: " + dup.slice(0, 3).join(", "));
  else ok("note ids are unique");

  const noZh = n.filter((x) => !CJK.test(x.zh || ""));
  if (noZh.length) fail(noZh.length + " examples have no Chinese");
  else ok("every example has Chinese");

  const long = n.filter((x) => (x.body || "").length > 300);
  if (long.length) fail(long.length + " bodies too long for a phone card");
  else ok("every body fits a phone card");

  console.log("units covered: " + [...new Set(n.map((x) => x.unit))].join(", "));
}

/* ── numbers ─────────────────────────────────────────────────────── */
console.log("\n=== numbers-data.js ===");
const N = load("numbers-data.js").MP_NUMBERS;
if (!N) fail("window.MP_NUMBERS missing");
else {
  const groups = {
    numbers: N.numbers || [], measures: N.measures || [],
    dates: N.dates || [], times: N.times || []
  };
  Object.keys(groups).forEach((k) => {
    console.log(k + ": " + groups[k].length);
    if (!groups[k].length) fail(k + " is empty");
  });
  Object.keys(groups).forEach((k) => checkEntry(groups[k], k, ["zh", "pinyin", "en"]));

  if (groups.numbers.length < 100) fail("fewer than 100 numbers");
  else ok("number count is sufficient");

  englishFieldsAreEnglish(groups, "numbers-data");

  const dupAll = groups.numbers.map((x) => x.zh).filter((v, i, a) => a.indexOf(v) !== i);
  if (dupAll.length) fail("duplicate number headwords: " + dupAll.join(", "));
  else ok("number headwords are unique");

  const bad = groups.numbers.filter((x) => x.example_zh && x.example_pinyin &&
    countSyllables(x.example_pinyin) !== charCount(x.example_zh));
  if (bad.length) fail(bad.length + " number examples have pinyin/character mismatch: " +
    bad.slice(0, 3).map((x) => x.example_zh).join(" | "));
  else ok("number example pinyin matches its characters");

  console.log("sample measure: " + JSON.stringify(groups.measures[0]));
}

/* ── vocab2 ──────────────────────────────────────────────────────── */
console.log("\n=== vocab2-data.js ===");
const W2 = load("vocab2-data.js").MP_WORDS2;
if (!W2) fail("window.MP_WORDS2 missing");
else {
  console.log("words: " + W2.length);
  if (W2.length < 250) fail("only " + W2.length + " words (expected 300)");
  checkEntry(W2, "words", ["zh", "pinyin", "en", "hsk", "theme", "ex_zh", "ex_pinyin", "ex_en"]);

  const dup = W2.map((x) => x.zh).filter((v, i, a) => a.indexOf(v) !== i);
  if (dup.length) fail(dup.length + " duplicate headwords: " + dup.slice(0, 5).join(", "));
  else ok("headwords are unique");

  // Inflected forms interpose a particle (下了雪 contains the stem 下雪 plus
  // le), so test the stripped form as well as an exact substring.
  const notIn = W2.filter((x) => {
    const stripped = String(x.ex_zh || "").replace(/[了的着过吗呢吧]/g, "");
    return String(x.ex_zh || "").indexOf(x.zh) < 0 && stripped.indexOf(x.zh) < 0;
  });
  if (notIn.length) fail(notIn.length + " examples do not contain their own word: " +
    notIn.slice(0, 3).map((x) => x.zh).join(", "));
  else ok("every example sentence contains its word");

  const mismatch = W2.filter((x) =>
    charCount(x.ex_zh) > 0 && countSyllables(x.ex_pinyin) !== charCount(x.ex_zh));
  if (mismatch.length) fail(mismatch.length + " example pinyin/character mismatches, e.g. " +
    mismatch.slice(0, 3).map((x) => x.ex_zh + " [" + x.ex_pinyin + "]").join(" | "));
  else ok("example pinyin matches example characters");

  englishFieldsAreEnglish({ vocab2: W2 }, "vocab2");

  console.log("themes (" + new Set(W2.map((x) => x.theme)).size + "): " +
    [...new Set(W2.map((x) => x.theme))].sort().join(", "));
}

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " PROBLEMS");
process.exit(fails === 0 ? 0 : 1);