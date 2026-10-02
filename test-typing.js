/* Tests the typing exercise's pinyin comparator. Run: node test-typing.js
 *
 * The comparator decides whether a typed answer counts. Too strict and a
 * correct answer is marked wrong, which is worse than useless in a language
 * app; too loose and it stops testing anything. These pin both edges.
 *
 * The comparator is tone-insensitive ON PURPOSE: tones are drilled by the
 * Tone Trainer and the listening exercises, and on a phone keyboard the tone
 * marks are genuinely hard to enter. Making the keyboard the bottleneck would
 * measure typing, not Mandarin.
 */
const fs = require("fs");
const vm = require("vm");

// Extract just the comparator from app.js: it is a pure function, so it can be
// evaluated without the rest of the app.
const src = fs.readFileSync(__dirname + "/app.js", "utf8");
const start = src.indexOf("  function comparePinyin(");
if (start < 0) { console.log("FAIL  comparePinyin not found in app.js"); process.exit(1); }
const end = src.indexOf("\n  function ", start + 10);
const body = src.slice(start, end);

const sb = { console };
vm.createContext(sb);
vm.runInContext(body.trim(), sb);
const compare = vm.runInContext("comparePinyin", sb);

let fails = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log((ok ? "PASS  " : "FAIL  ") + label + ": " + actual + (ok ? "" : "  (expected " + expected + ")"));
}

console.log("=== must match (toneless typing is correct) ===");
check("plain letters", compare("nihao", "nǐ hǎo"), true);
check("tone marks present", compare("nǐ hǎo", "nǐ hǎo"), true);
check("uppercase", compare("NIHAO", "nǐ hǎo"), true);
check("extra spaces", compare("  ni   hao  ", "nǐ hǎo"), true);
check("no space vs space", compare("nǐhǎo", "nǐ hǎo"), true);
check("reference has no tones", compare("ma", "mā"), true);
check("typed has tones, reference does not", compare("mā", "ma"), true);
check("wrong tone still accepted (by design)", compare("mā", "má"), true);
check("v stands for ü", compare("nv", "nǚ"), true);
check("ü as literal", compare("lü", "lǚ"), true);
check("erhua written -r", compare("nar", "nǎr"), true);

console.log("\n=== must not match ===");
check("different word", compare("nihao", "zài jiàn"), false);
check("missing syllable", compare("nihao", "nǐ hǎ"), false);
check("extra syllable", compare("nihao hao", "nǐ hǎo"), false);
check("empty input", compare("", "nǐ hǎo"), false);
check("whitespace only", compare("   ", "nǐ hǎo"), false);
check("empty reference", compare("nǐ hǎo", ""), false);
check("both empty", compare("", ""), false);
check("wrong initial", compare("mihao", "nǐ hǎo"), false);
check("wrong vowel", compare("nihou", "nǐ hǎo"), false);
check("longer word that merely contains it", compare("nihaoma", "nǐ hǎo"), false);

console.log("\n=== a false pass is worse than a false fail ===");
// These are the near-misses a naive substring or prefix check would let
// through. If any of these return true the exercise is not testing anything.
[["ni", "nǐ hǎo"], ["hao", "nǐ hǎo"], ["nihao", "nǐ hǎo?"],
 ["mihao", "nǐ hǎo"], ["zaih", "zài hàn"], ["nhao", "nǐ hǎo"]].forEach(([t, r]) => {
  check("traps " + JSON.stringify(t) + " vs " + JSON.stringify(r), compare(t, r), false);
});

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);
