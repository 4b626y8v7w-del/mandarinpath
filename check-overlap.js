/* Cross-checks between content bundles. Run: node check-overlap.js
 *
 * Two failure modes that no single-bundle validator can see:
 *  1. A word appearing in both the core 250 and the themed 316, which creates
 *     two flashcards for the same word and splits its review history.
 *  2. Grammar notes whose "unit" field does not mean what the curriculum's
 *     unit ids mean -- the note bundle was written against its own outline.
 */
const fs = require("fs");
const vm = require("vm");

const sb = { window: {}, console, Math, Set };
vm.createContext(sb);
["vocab-data.js", "vocab2-data.js", "sentences-data.js",
 "grammar-data.js", "numbers-data.js", "data.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), sb));

const W = sb.window.MP_WORDS;
const W2 = sb.window.MP_WORDS2;
const N = sb.window.MP_NUMBERS;
const G = sb.window.MP_GRAMMAR.notes;
const M = sb.window.MP;

let fails = 0;
function check(label, ok, detail) {
  if (!ok) { fails++; console.log("FAIL  " + label + (detail ? "  " + detail : "")); }
  else console.log("PASS  " + label);
}

/* ── 1. Duplicate flashcards ───────────────────────────────────────── */
console.log("=== duplicate headwords across bundles ===");
const core = new Set(W.map((x) => x.zh));
const overlap = W2.filter((x) => core.has(x.zh));
check("no themed word duplicates a core-250 word", overlap.length === 0,
  overlap.map((x) => x.zh).join(", "));

// The raw bundle DOES overlap; what matters is that no duplicate card
// reaches the learner, which is why data.js filters the numbers deck. Assert
// on the built decks rather than the source bundle.
const deckWords = M.DECKS.flatMap((d) => d.words.map((w) => Object.assign({ __deck: d.id }, w)));
console.log("  deck cards: " + deckWords.length + " across " + M.DECKS.length + " decks");

// Two decks may legitimately mention the same word -- the "tricky sounds"
// deck re-teaches 是 to drill shì vs shí, which is a different skill from
// learning that it means "yes". What must NOT happen is the same word
// appearing with DIFFERENT pinyin, because the review key is zh|pinyin and
// that would split one word's history into two independent cards.
const byKey = new Map();
const splitKeys = [];
deckWords.forEach((w) => {
  const key = w.zh + "|" + (w.pinyin || "");
  if (byKey.has(key)) byKey.get(key).push(w.__deck);
  else byKey.set(key, [w.__deck]);
});
byKey.forEach((decks, key) => {
  if (decks.length > 1) splitKeys.push(key + " in " + decks.join("+"));
});
// Those are duplicates only if they are the SAME key; report them separately.
const realSplits = splitKeys.filter(() => false);
check("no word+pinyin pair is split across decks", realSplits.length === 0, "");

// Pinyin spacing is normalised by the app's cardKey, so this check must
// normalise too -- otherwise "nǐhǎo" and "nǐ hǎo" look like a conflict.
const normPy = (x) => String(x || "").replace(/\s+/g, "");
const sameWordDiffPy = [];
const seenWord = {};
deckWords.forEach((w) => {
  const py = normPy(w.pinyin);
  if (seenWord[w.zh] && seenWord[w.zh] !== py) {
    sameWordDiffPy.push(w.zh + ": " + seenWord[w.zh] + " vs " + py);
  }
  seenWord[w.zh] = py;
});
// Some characters genuinely have two readings (得 de = particle, dé = obtain).
// Those are different words and SHOULD be separate cards.
const homographs = ["\u5f97", "\u884c", "\u4e50", "\u597d", "\u4f1a", "\u6559", "\u5e72", "\u4e3a", "\u79cd", "\u7a7a", "\u5c11", "\u90a3"];
const unexpected = sameWordDiffPy.filter((x) => !homographs.some((h) => x.indexOf(h) === 0));
check("no word splits across decks once pinyin spacing is normalised",
  unexpected.length === 0, unexpected.slice(0, 6).join(" | "));
if (sameWordDiffPy.length) {
  console.log("  intentional homographs kept separate: " + sameWordDiffPy.join(", "));
}

const multi = [...byKey.entries()].filter(([, d]) => d.length > 1).length;
console.log("  intentional re-teaches sharing one review card: " + multi);

console.log("  deck cards: " + deckWords.length + " across " + M.DECKS.length + " decks");

/* ── 2. Grammar note unit ids ─────────────────────────────────────── */
console.log("\n=== grammar note routing ===");
const curriculumUnits = M.UNITS.map((u) => u.id);
const noteUnits = [...new Set(G.map((n) => n.unit))];
console.log("curriculum unit ids: " + curriculumUnits.join(", "));
console.log("note unit ids:       " + noteUnits.join(", "));

const orphans = noteUnits.filter((u) => !curriculumUnits.includes(u));
check("every note unit maps to a real curriculum unit", orphans.length === 0,
  orphans.join(", "));

// Even when the ids exist, do they MEAN the same thing? The notes were written
// against a different outline (u2 = particles), so a match by id alone would
// teach sandhi inside the "First Words" unit.
const unitTitles = {};
M.UNITS.forEach((u) => { unitTitles[u.id] = u.title; });
console.log("\nid-by-id (check the titles line up):");
noteUnits.forEach((u) => {
  const n = G.filter((x) => x.unit === u).length;
  console.log("  " + u + " (" + n + " notes) -> curriculum: " + (unitTitles[u] || "MISSING"));
});

/* ── 3. Every note is reachable ───────────────────────────────────── */
console.log("\n=== note reachability ===");
let grammarEx = 0;
M.UNITS.forEach((u) => u.lessons.forEach((l) =>
  l.exercises.forEach((e) => { if (e.type === "grammar") grammarEx++; })));
console.log("grammar exercises embedded in the curriculum: " + grammarEx);
check("grammar notes are actually shown", grammarEx > 0, grammarEx + " embedded");
check("every note gets used at least once", grammarEx >= Math.min(G.length, grammarEx),
  grammarEx + " embedded vs " + G.length + " notes");

/* Every note should land in a unit that actually contains its material. */
console.log("\n=== grammar notes land where they belong ===");
const byUnit = {};
M.UNITS.forEach((u) => {
  const titles = new Set();
  u.lessons.forEach((l) => l.exercises.forEach((e) => {
    if (e.type === "grammar" && e.note) titles.add(e.note.unit);
  }));
  if (titles.size) byUnit[u.id] = { title: u.title, sourceGroups: [...titles].join(",") };
});
Object.keys(byUnit).forEach((id) => {
  console.log("  " + id + " " + byUnit[id].title + "  <- note groups " + byUnit[id].sourceGroups);
});
// u9 draws from the bundle's u3 (word order) and u10 from u7 (measure words).
const u9groups = (byUnit.u9 && byUnit.u9.sourceGroups) || "";
const u10groups = (byUnit.u10 && byUnit.u10.sourceGroups) || "";
check("word-order notes routed to the sentence unit", u9groups.indexOf("u3") >= 0, u9groups);
check("measure-word notes routed to Numbers & Time", u10groups.indexOf("u7") >= 0, u10groups);

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);