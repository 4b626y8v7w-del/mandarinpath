/* Probes what the page records, so coordinate bugs are visible rather than
 * guessed at. Injected into the running app by the browser test.
 *
 * Draws with VIEWPORT coordinates (what a real finger/mouse sends), which is
 * what the app's pos() expects to receive.
 */
window.MP_PROBE = (function () {
  function vis() {
    const s = [...document.querySelectorAll(".screen")].filter((x) => !x.hidden);
    return s[0] ? s[0].id : "none";
  }
  function click(sel) {
    const b = document.querySelector(sel);
    if (b) { b.click(); return true; }
    return false;
  }
  function ev(t, x, y) {
    return new MouseEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true });
  }

  function drawViewport(cv, pts) {
    const r = cv.getBoundingClientRect();
    cv.dispatchEvent(ev("mousedown", r.left + pts[0][0], r.top + pts[0][1]));
    for (let i = 1; i < pts.length; i++) {
      cv.dispatchEvent(ev("mousemove", r.left + pts[i][0], r.top + pts[i][1]));
    }
    window.dispatchEvent(ev("mouseup", 0, 0));
  }

  /* Replays a character's reference strokes at canvas scale. */
  function drawReference(cv, glyph, onlyFirstN) {
    const ref = (window.MP_STROKES || {})[glyph];
    if (!ref) return false;
    const side = Math.min(cv.clientWidth, cv.clientHeight);
    const strokes = onlyFirstN ? ref.strokes.slice(0, onlyFirstN) : ref.strokes;
    strokes.forEach((s) => {
      drawViewport(cv, s.pts.map((p) => [p[0] / 1000 * side, p[1] / 1000 * side]));
    });
    return true;
  }

  function enterTrace(glyph) {
    if (vis() !== "screenTrace") {
      click(".tab[data-goto=practice]");
      click("#modeWrite");
    }
    return document.getElementById("traceCanvas");
  }

  function feedback() {
    return (document.getElementById("traceFeedback").innerText || "").replace(/\n/g, " | ");
  }

  function score() {
    click("#btnTraceCheck");
    const txt = feedback();
    const m = txt.match(/shape match (\d+)%/);
    return { text: txt, pct: m ? +m[1] : null };
  }

  return { vis, click, drawViewport, drawReference, enterTrace, feedback, score };
})();
"MP_PROBE ready";