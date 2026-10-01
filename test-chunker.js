/* Checks the sentence-builder chunker. Run: node test-chunker.js
 *
 * The chunker decides what the learner taps and reassembles, so a bad split
 * produces either a trivial puzzle or an impossible one.
 */
const fs = require("fs");
const vm = require("vm");

const sb = { window: {}, console, Math, Set, JSON };
vm.createContext(sb);
["vocab-data.js", "sentences-data.js", "strokes-data.js", "grammar-data.js", "numbers-data.js", "vocab2-data.js", "data.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), sb)
);

const M = sb.window.MP;
const SENT = sb.window.MP_SENTENCES;

// The chunker is internal, so exercise it through the exported exercise
// factory: every "build" exercise in the curriculum came out of it.
const buildEx = [];
M.UNITS.forEach((u) => u.lessons.forEach((l) =>
  (l.exercises || []).forEach((e) => { if (e.type === "build") buildEx.push(e); }
)));

let fails = 0;
function check(label, ok, detail) {
  if (!ok) { fails++; console.log("FAIL  " + label + (detail ? "  " + detail : "")); }
  else console.log("PASS  " + label);
}

console.log("build exercises generated: " + buildEx.length);

check("some build exercises exist", buildEx.length > 0, buildEx.length + " found");

// Every build exercise must be solvable and unambiguous.
let bad = [];
buildEx.forEach((e, i) => {
  const joined = e.chunks.join("");
  if (!e.chunks || e.chunks.length < 2) bad.push("#" + i + " too few chunks");
  if (joined !== e.answer) bad.push("#" + i + " chunks do not rejoin to the answer");
  if (!e.zh) bad.push("#" + i + " no Chinese");
  // Distractors must not collide with the correct answer.
  (e.distractors || []).forEach((d) => {
    if (d === e.answer) bad.push("#" + i + " distractor equals the answer");
  });
  if (new Set(e.chunks).size !== e.chunks.length) bad.push("#" + i + " duplicate chunks: " + e.zh);
});
check("every build exercise is solvable", bad.length === 0, bad.slice(0, 4).join(" | "));

// Show a few real splits so the output can be eyeballed.
console.log("\nsample splits:");
buildEx.slice(0, 8).forEach((e) => {
  console.log("  " + e.zh.padEnd(14) + " -> [" + e.chunks.join("] [") + "]");
});

// Chunking should be conservative: never split into single characters for a
// short sentence, which would make the exercise trivial.
const singles = buildEx.filter((e) => e.chunks.every((c) => Array.from(c).length === 1));
check("no exercise is all single characters", singles.length === 0,
  singles.length + " trivial: " + singles.slice(0, 2).map((e) => e.zh).join(", "));

// Punctuation should ride along, never be its own tile.
const punctOnly = buildEx.filter((e) => e.chunks.some((c) => /^[，。？！、,.?!]+$/.test(c)));
check("punctuation is never a standalone tile", punctOnly.length === 0,
  punctOnly.slice(0, 3).map((e) => e.zh).join(", "));

// Punctuation must survive at all: the answer has to rejoin to EXACTLY the
// source sentence. An earlier build dropped trailing punctuation, which made
// every question read as a statement and passed the check above for the wrong
// reason.
const lost = buildEx.filter((e) => e.answer !== e.zh);
check("answer rejoins to the exact source sentence", lost.length === 0,
  lost.slice(0, 3).map((e) => e.zh + " -> " + e.answer).join(" | "));

// And a sentence ending in a question mark must keep it.
const questions = buildEx.filter((e) => /[？?]$/.test(e.zh));
const keptQ = questions.filter((e) => /[？?]$/.test(e.answer));
check("question marks are preserved (" + questions.length + " checked)", keptQ.length === questions.length,
  questions.length - keptQ.length + " lost their question mark");

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);