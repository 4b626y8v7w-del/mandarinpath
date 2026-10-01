/* MandarinPath — beginner-friendliness assertions.
 *
 * These cover the "make it feel like Duolingo/Lingodeer" changes: a missed item
 * must come back within the same lesson, answering it right must clear it, and
 * quiz distractors must not be drawn only from the lesson's own words.
 *
 * Run against a live page (the app's engine lives in an IIFE, so we drive it
 * through the MP_APP._test hook):
 *
 *   node test-friendliness.js
 *
 * It expects the app served at http://localhost:8099. Start it with:
 *   python -m http.server 8099 --bind 0.0.0.0
 */
"use strict";

const BASE = process.env.MP_BASE || "http://localhost:8099";

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { console.log("PASS  " + name); pass++; }
  else { console.log("FAIL  " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); fail++; }
}

async function main() {
  // The engine is browser-side; we assert on the page via a headless browser.
  // If puppeteer is unavailable, fall back to reporting the HTTP precondition
  // so the failure mode is obvious rather than a silent no-op.
  let puppeteer;
  try { puppeteer = require("puppeteer"); }
  catch (e) {
    try { puppeteer = require("puppeteer-core"); }
    catch (e2) {
      console.log("SKIP  needs puppeteer or puppeteer-core installed");
      console.log("      (install one, or run the same assertions by hand in the");
      console.log("       browser console against " + BASE + ")");
      process.exit(0);
    }
  }

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: "networkidle2" });

  const hasHook = await page.evaluate(() => !!(window.MP_APP && window.MP_APP._test));
  if (!hasHook) {
    console.log("FAIL  MP_APP._test hook present (is app.js cached by the service worker?)");
    await browser.close();
    process.exit(1);
  }
  check("test hook available", true);

  // --- 1. a missed quiz item is queued for retry -----------------------------
  const t1 = await page.evaluate(() => {
    const T = window.MP_APP._test;
    T.beginLesson("u2-l1");
    while (T.current().type === "teach") T.next();
    const ex = T.current();
    const heartsBefore = window.MP_APP.state().hearts;
    T.grade(false, { chosen: "x", correct: "y", zh: ex.prompt });
    return { type: ex.type, queued: T.results().retry.length, heartsBefore, heartsAfter: window.MP_APP.state().hearts };
  });
  check("a missed mc is queued for retry", t1.queued === 1, t1);
  check("a miss costs a heart", t1.heartsAfter === t1.heartsBefore - 1, t1);

  // --- 2. the queued item is re-presented before the lesson ends -------------
  const t2 = await page.evaluate(() => {
    const T = window.MP_APP._test;
    T.beginLesson("u2-l1");
    while (T.current().type === "teach") T.next();
    T.grade(false, { chosen: "x", correct: "y", zh: T.current().prompt });
    const beforeLen = T.len();
    let guard = 0;
    while (T.idx() < beforeLen && guard++ < 300) {
      T.grade(true, { zh: T.current().prompt });
      T.next();
    }
    return { beforeLen, afterLen: T.len(), idx: T.idx(), queuedLeft: T.results().retry.length };
  });
  check("lesson grows by the retried item", t2.afterLen === t2.beforeLen + 1, t2);
  check("retry lands at the end of the lesson", t2.idx === t2.afterLen - 1, t2);
  check("answering the retry correctly clears it", t2.queuedLeft === 0, t2);

  // --- 3. answering a queued item right early also removes it ----------------
  const t3 = await page.evaluate(() => {
    const T = window.MP_APP._test;
    T.beginLesson("u2-l1");
    while (T.current().type === "teach") T.next();
    T.grade(false, { chosen: "x", correct: "y", zh: T.current().prompt });
    const queued = T.results().retry.length;
    T.grade(true, { zh: T.current().prompt });   // immediate correct
    return { queued, after: T.results().retry.length };
  });
  check("immediate correct clears the queue", t3.after === 0, t3);

  // --- 4. distractors reach beyond the lesson's own words --------------------
  const t4 = await page.evaluate(() => {
    const L = window.MP_UNITS[1].lessons[0];
    const teaches = L.exercises.filter((e) => e.type === "teach").map((e) => e.zh);
    const enToZh = L.exercises.filter((e) => e.type === "mc" && e.direction === "en_to_zh");
    let widest = 0;
    for (const m of enToZh) {
      widest = Math.max(widest, m.options.filter((o) => !teaches.includes(o)).length);
    }
    return { lessonWords: teaches.length, widestOutside: widest };
  });
  check("distractors include words from other lessons",
    t4.widestOutside > 0, t4);

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });