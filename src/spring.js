/* ==========================================================================
   Vitrine UI — motion
   --------------------------------------------------------------------------
   The part of an interface that decides whether it feels alive.

   CSS transitions and @keyframes cannot be interrupted usefully. Grab an
   element mid-flight and the browser either ignores you or snaps. That is the
   whole reason web UI feels different from native even when the pixels match.

   So nothing here that a finger can touch uses a CSS transition. Everything
   runs on springs, and springs have four properties that matter:

     1. They start from the CURRENT ON-SCREEN VALUE, not the logical target.
        Retarget mid-flight and the motion continues from where it visibly is.
     2. They inherit the pointer's release VELOCITY, so a flick keeps flying
        and a gentle release settles.
     3. They can be grabbed and REVERSED at any instant, with the velocity
        blended rather than hard-cut. A hard cut reads as a brick wall.
     4. They are parameterised the way Apple parameterises them — a damping
        RATIO and a RESPONSE time — instead of an opaque stiffness number.
        damping 1.0 is critically damped (no overshoot); 0.8 gives the small
        bounce that gestural, momentum-carrying motion wants.

   One rAF loop drives every spring on the page. Each tick writes only
   `transform` and `opacity`, which the compositor can handle without layout.
   ========================================================================== */

(function (global) {
  "use strict";

  /* ======================================================================
     The driver — one loop, every spring
     ====================================================================== */

  const active = new Set();
  let raf = 0;
  let last = 0;

  function tick(now) {
    const dt = Math.min(0.064, last ? (now - last) / 1000 : 1 / 60);
    last = now;

    active.forEach((s) => {
      s._step(dt);
      if (s.onChange) s.onChange(s.value, s.velocity);
      if (s.settled()) {
        s.value = s.target;
        s.velocity = 0;
        if (s.onChange) s.onChange(s.value, 0);
        active.delete(s);
        if (s.onRest) { const f = s.onRest; s.onRest = null; f(); }
      }
    });

    if (active.size) { raf = requestAnimationFrame(tick); }
    else { raf = 0; last = 0; }
  }

  function wake() {
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  }

  /* ======================================================================
     Spring
     ====================================================================== */

  /**
   * @param {{damping?:number, response?:number, from?:number, precision?:number}} opts
   *   damping  — ratio. 1.0 critically damped (default), 0.8 for momentum.
   *   response — seconds to settle. 0.3–0.4 for general UI.
   */
  function Spring(opts) {
    opts = opts || {};
    this.damping = opts.damping !== undefined ? opts.damping : 1.0;
    this.response = opts.response !== undefined ? opts.response : 0.35;
    this.value = opts.from || 0;
    this.target = this.value;
    this.velocity = 0;
    this.precision = opts.precision || 0.002;
    this.onChange = opts.onChange || null;
    this.onRest = null;
  }

  Spring.prototype._step = function (dt) {
    const w = (2 * Math.PI) / this.response;   // natural frequency
    const k = w * w;                            // stiffness
    const c = 2 * this.damping * w;             // damping coefficient

    // Substep at 240Hz. A single Euler step at 60Hz is unstable for stiff
    // springs and visibly wrong on a 30fps frame drop; substepping keeps the
    // simulation identical regardless of what the display is doing.
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -k * (this.value - this.target) - c * this.velocity;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
  };

  Spring.prototype.settled = function () {
    return Math.abs(this.velocity) < this.precision * 40 &&
           Math.abs(this.target - this.value) < this.precision;
  };

  /**
   * Retarget. The spring keeps its current value and velocity, so this is
   * safe to call mid-flight — that is the entire point.
   * @param {number} target
   * @param {number} [velocity] blended into the current velocity rather than
   *   replacing it, so a reversal does not hit a discontinuity.
   */
  Spring.prototype.to = function (target, velocity) {
    this.target = target;
    if (velocity !== undefined) {
      // Blend rather than assign. Hard-cutting velocity at a reversal is what
      // makes a gesture feel like it hit a wall.
      this.velocity = this.velocity * 0.25 + velocity * 0.75;
    }
    active.add(this);
    wake();
    return this;
  };

  /** Jump with no animation — used when the pointer is driving directly. */
  Spring.prototype.set = function (value) {
    this.value = this.target = value;
    this.velocity = 0;
    active.delete(this);
    if (this.onChange) this.onChange(value, 0);
    return this;
  };

  Spring.prototype.then = function (fn) { this.onRest = fn; return this; };

  Spring.prototype.stop = function () {
    this.target = this.value;
    this.velocity = 0;
    active.delete(this);
    return this;
  };

  /* ======================================================================
     Momentum
     ====================================================================== */

  /**
   * Where a flick would come to rest, given a release velocity.
   *
   * Snapping to the nearest target measured from the RELEASE POINT ignores how
   * hard the user threw it — a fast flick that only moved 20px should still
   * advance. Project first, then snap to whatever is nearest the projection.
   *
   * @param {number} position px
   * @param {number} velocity px/s
   * @param {number} [decay] 0.998 is the standard scroll feel; 0.99 snappier.
   */
  function project(position, velocity, decay) {
    const d = decay === undefined ? 0.998 : decay;
    return position + (velocity / 1000) * (d / (1 - d));
  }

  /**
   * Progressive resistance past a boundary. The further out, the less the
   * element follows — which reads as "you can keep pulling, but there is
   * nothing more here". A hard stop reads as a bug.
   */
  function rubberBand(overflow, dimension, coefficient) {
    const c = coefficient === undefined ? 0.55 : coefficient;
    const d = dimension || 1;
    return (1 - (1 / ((Math.abs(overflow) * c / d) + 1))) * d * Math.sign(overflow);
  }

  /** Track pointer velocity over a short window — a single frame is noise. */
  function VelocityTracker() { this.samples = []; }
  VelocityTracker.prototype.add = function (v, t) {
    this.samples.push({ v: v, t: t });
    while (this.samples.length > 6) this.samples.shift();
  };
  VelocityTracker.prototype.get = function () {
    const s = this.samples;
    if (s.length < 2) return 0;
    // Ignore samples older than 100ms: a pause before release means the user
    // stopped, and stale samples would fling an element they meant to place.
    const now = s[s.length - 1].t;
    let first = s[0];
    for (let i = 0; i < s.length; i++) { if (now - s[i].t <= 100) { first = s[i]; break; } }
    const dt = (now - first.t) / 1000;
    if (dt <= 0) return 0;
    return (s[s.length - 1].v - first.v) / dt;
  };
  VelocityTracker.prototype.reset = function () { this.samples.length = 0; };

  /* ======================================================================
     Environment
     ====================================================================== */

  const media = (q) => global.matchMedia && global.matchMedia(q).matches;
  const env = {
    get reducedMotion() { return media("(prefers-reduced-motion: reduce)"); },
    get reducedTransparency() { return media("(prefers-reduced-transparency: reduce)"); },
    get moreContrast() { return media("(prefers-contrast: more)"); },
    get coarse() { return media("(pointer: coarse)"); }
  };

  /* ======================================================================
     Gestures
     ====================================================================== */

  const TAP_SLOP = 10;   // px of movement before a press becomes a drag

  /**
   * Press feedback that starts on pointerDOWN, not on click.
   *
   * Waiting for click to show feedback is the single most common reason a web
   * UI feels dead next to a native one — there is a whole human reaction time
   * of nothing happening. Also handles the drag-away-and-back case: slide off
   * the control and it un-presses; slide back and it presses again; release
   * outside and nothing fires.
   */
  function pressable(el, opts) {
    opts = opts || {};
    const depth = opts.scale === undefined ? 0.97 : opts.scale;
    if (env.reducedMotion) return el;   // no scale, but the CSS :active still reads

    const s = new Spring({ damping: 1.0, response: 0.18, from: 1 });
    const base = opts.transform || "";
    s.onChange = (v) => { el.style.transform = base + " scale(" + v + ")"; };

    let down = false, ox = 0, oy = 0;

    const inside = (e) => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left - TAP_SLOP && e.clientX <= r.right + TAP_SLOP &&
             e.clientY >= r.top - TAP_SLOP && e.clientY <= r.bottom + TAP_SLOP;
    };

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      down = true; ox = e.clientX; oy = e.clientY;
      s.to(depth);
    });
    el.addEventListener("pointermove", (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - ox, e.clientY - oy) > TAP_SLOP;
      s.to(moved && !inside(e) ? 1 : depth);
    });
    const release = () => { if (!down) return; down = false; s.to(1); };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    return el;
  }

  /**
   * Horizontal drag with 1:1 tracking, rubber-banded edges, momentum on
   * release and snapping to the projected landing point.
   *
   * Grab offset is respected: the content stays glued to the point the user
   * grabbed, rather than jumping so the pointer is at its centre.
   *
   * @param {HTMLElement} viewport  the clipping element
   * @param {HTMLElement} track     the moving element
   * @param {{snap?:function():number[]}} opts
   */
  function dragScroll(viewport, track, opts) {
    opts = opts || {};
    let x = 0, min = 0, dragging = false, startX = 0, startOffset = 0, moved = false;
    const tracker = new VelocityTracker();

    const s = new Spring({ damping: 0.9, response: 0.4 });
    s.onChange = (v) => { x = v; track.style.transform = "translate3d(" + v + "px,0,0)"; };

    function bounds() {
      min = Math.min(0, viewport.clientWidth - track.scrollWidth);
    }

    function clampWithBand(v) {
      bounds();
      if (v > 0) return rubberBand(v, viewport.clientWidth);
      if (v < min) return min + rubberBand(v - min, viewport.clientWidth);
      return v;
    }

    viewport.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      bounds();
      if (min === 0) return;                    // nothing to scroll
      dragging = true; moved = false;
      startX = e.clientX;
      startOffset = s.value;                    // grab the PRESENTATION value
      s.stop();                                 // interrupt any flight in place
      tracker.reset();
      tracker.add(e.clientX, e.timeStamp);
      // Deliberately NOT capturing yet. Capturing on pointerdown retargets the
      // compatibility mouse events too, so the click lands on the rail and the
      // card underneath never hears it — a drag-scroller that eats taps. Wait
      // until the gesture is actually a drag.
    });

    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > TAP_SLOP) {
        moved = true;
        try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      }
      if (!moved) return;
      e.preventDefault();
      tracker.add(e.clientX, e.timeStamp);
      s.set(clampWithBand(startOffset + dx));   // 1:1, no lag, no spring
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      try { viewport.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      if (!moved) return;

      const v = tracker.get();
      bounds();
      let landing = project(s.value, v);

      const snaps = opts.snap && opts.snap();
      if (snaps && snaps.length) {
        // Snap to whatever is nearest the PROJECTED landing point, not the
        // release point. A hard flick should advance even if the finger
        // barely travelled.
        let best = snaps[0];
        snaps.forEach((p) => { if (Math.abs(p - landing) < Math.abs(best - landing)) best = p; });
        landing = best;
      }
      s.to(Math.max(min, Math.min(0, landing)), v);
    }

    viewport.addEventListener("pointerup", end);
    viewport.addEventListener("pointercancel", end);

    // Suppress the click that follows a drag, so flicking the rail does not
    // also open whichever card happened to be under the finger.
    viewport.addEventListener("click", (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);

    global.addEventListener("resize", () => { bounds(); s.to(Math.max(min, Math.min(0, s.value))); });

    return {
      get x() { return s.value; },
      to(v, vel) { bounds(); s.to(Math.max(min, Math.min(0, v)), vel); },
      refresh: bounds
    };
  }

  /**
   * A slider the pointer drives directly.
   *
   * The native <input type=range> cannot honour a grab offset — click the
   * thumb 8px off centre and it teleports. It also gives no velocity and
   * cannot be styled to 44pt without fighting the UA. So: a real track, a
   * real thumb, 1:1 tracking during the drag, and a spring only when the user
   * taps the track and the thumb has to travel to meet them.
   */
  function slider(root, opts) {
    const fill = root.querySelector("[data-fill]");
    const thumb = root.querySelector("[data-thumb]");
    const min = opts.min, max = opts.max, step = opts.step || 1;
    let value = opts.value;
    let dragging = false, grabOffset = 0;

    const s = new Spring({ damping: 1.0, response: 0.28, from: value });
    s.onChange = (v) => paint(v);

    function quantize(v) {
      const q = Math.round((v - min) / step) * step + min;
      return Math.max(min, Math.min(max, q));
    }
    function pct(v) { return (v - min) / (max - min || 1); }

    function paint(v) {
      const p = pct(v);
      const w = root.clientWidth;
      const tw = thumb.offsetWidth || 28;
      const x = p * (w - tw);
      thumb.style.transform = "translate3d(" + x + "px,0,0)";
      // The fill has to end at the thumb's CENTRE, not at p× the full track.
      // The thumb travels (w − tw) while the track spans w, so scaling the
      // fill by p alone leaves a visible gap that grows toward the middle.
      fill.style.transform = "scaleX(" + ((x + tw / 2) / (w || 1)) + ")";
    }

    function commit(v, silent) {
      const q = quantize(v);
      if (q !== value || silent) { value = q; if (opts.onInput) opts.onInput(q); }
    }

    function valueAt(clientX) {
      const r = root.getBoundingClientRect();
      const w = r.width - thumb.offsetWidth;
      const p = Math.max(0, Math.min(1, (clientX - r.left - thumb.offsetWidth / 2 - grabOffset) / (w || 1)));
      return min + p * (max - min);
    }

    root.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      root.setPointerCapture(e.pointerId);
      dragging = true;
      const tr = thumb.getBoundingClientRect();
      const onThumb = e.clientX >= tr.left - 8 && e.clientX <= tr.right + 8;
      // Grab offset: if they grabbed the thumb off-centre, keep it there.
      grabOffset = onThumb ? e.clientX - (tr.left + tr.width / 2) : 0;
      const v = valueAt(e.clientX);
      if (onThumb) { s.stop(); s.value = value; commit(v); s.set(value); }
      else { commit(v); s.to(value); }        // tapped the track: thumb travels
      root.focus();
    });

    root.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      e.preventDefault();
      commit(valueAt(e.clientX));
      s.set(value);                            // 1:1 — a spring here feels laggy
    });

    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      try { root.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    };
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);

    root.addEventListener("keydown", (e) => {
      const big = (max - min) / 10;
      let v = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") v = value + step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = value - step;
      else if (e.key === "PageUp") v = value + big;
      else if (e.key === "PageDown") v = value - big;
      else if (e.key === "Home") v = min;
      else if (e.key === "End") v = max;
      if (v === null) return;
      e.preventDefault();
      commit(v);
      s.to(value);
    });

    paint(value);
    return {
      get value() { return value; },
      set(v) { commit(v, true); s.to(value); },
      refresh() { paint(s.value); }
    };
  }

  /**
   * Materialise: a surface arrives by coming into focus and resolving, not by
   * fading. Blur and scale animate together off one spring, so it reads as an
   * object arriving rather than an image cross-dissolving.
   */
  function materialize(el, opts) {
    opts = opts || {};
    if (env.reducedMotion) { el.style.opacity = "1"; return Promise.resolve(); }

    const s = new Spring({ damping: 1.0, response: opts.response || 0.5, from: 0 });
    const blur = opts.blur === undefined ? 6 : opts.blur;
    const lift = opts.lift === undefined ? 10 : opts.lift;
    const from = opts.scale === undefined ? 0.97 : opts.scale;

    el.style.willChange = "transform, opacity, filter";
    s.onChange = (v) => {
      const e = Math.max(0, Math.min(1, v));
      el.style.opacity = String(e);
      el.style.filter = e > 0.995 ? "" : "blur(" + ((1 - e) * blur).toFixed(2) + "px)";
      el.style.transform =
        "translate3d(0," + ((1 - e) * lift).toFixed(2) + "px,0) scale(" + (from + (1 - from) * e).toFixed(4) + ")";
    };
    s.onChange(0);

    return new Promise((resolve) => {
      s.to(1).then(() => {
        // Clear the inline transform so nothing inherits a stale matrix and
        // hover transitions start from a clean slate.
        el.style.filter = ""; el.style.transform = ""; el.style.willChange = "";
        resolve();
      });
    });
  }

  global.VitrineMotion = {
    Spring, project, rubberBand, VelocityTracker,
    pressable, dragScroll, slider, materialize, env, TAP_SLOP
  };
})(typeof window !== "undefined" ? window : globalThis);
