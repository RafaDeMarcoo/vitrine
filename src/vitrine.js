/* ==========================================================================
   Vitrine — runtime
   --------------------------------------------------------------------------
   Owns the conversation loop and, more importantly, the timing.

   Streaming is the whole problem with generative UI in a chat. Text arrives
   token by token and looks alive; a component cannot render half-parsed and
   looks broken if you try. The resolution here:

     text        -> streamed character by character, caret trailing
     components  -> a skeleton at the component's known height lands first,
                    then the real card replaces it in place

   Because the skeleton is sized from the registry rather than measured after
   the fact, nothing below it ever jumps. That single property is most of
   what separates "feels premium" from "feels like a widget".
   ========================================================================== */

(function (global) {
  "use strict";

  const Registry = global.VitrineRegistry;
  const Renderer = global.VitrineRenderer;
  const M = global.VitrineMotion;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => (M ? M.env.reducedMotion : false);

  /* Every block arrives the same way: it materialises — blur and scale resolve
     together off one spring — rather than fading in. A cross-fade reads as an
     image appearing; this reads as an object arriving. */
  const arrive = (node, opts) =>
    M ? M.materialize(node, opts) : Promise.resolve();

  /* A procedural displacement map gives the fixed chrome a refracted edge.
     It lives inside each widget so the package remains dependency-free and
     multiple Vitrine instances do not depend on host-page SVG definitions. */
  function liquidFilter() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("vt-liquid-defs");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const defs = document.createElementNS(ns, "defs");
    const filter = document.createElementNS(ns, "filter");
    filter.setAttribute("id", "vt-liquid-distortion");
    filter.setAttribute("x", "-20%"); filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%"); filter.setAttribute("height", "140%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const noise = document.createElementNS(ns, "feTurbulence");
    noise.setAttribute("type", "fractalNoise");
    noise.setAttribute("baseFrequency", "0.008 0.035");
    noise.setAttribute("numOctaves", "2");
    noise.setAttribute("seed", "11");
    noise.setAttribute("result", "noise");

    const soften = document.createElementNS(ns, "feGaussianBlur");
    soften.setAttribute("in", "noise");
    soften.setAttribute("stdDeviation", "1.4");
    soften.setAttribute("result", "map");

    const displace = document.createElementNS(ns, "feDisplacementMap");
    displace.setAttribute("in", "SourceGraphic");
    displace.setAttribute("in2", "map");
    displace.setAttribute("scale", "18");
    displace.setAttribute("xChannelSelector", "R");
    displace.setAttribute("yChannelSelector", "G");

    filter.appendChild(noise);
    filter.appendChild(soften);
    filter.appendChild(displace);
    defs.appendChild(filter);
    svg.appendChild(defs);
    return svg;
  }

  function Vitrine(root, opts) {
    opts = opts || {};
    this.root = root;
    this.planner = opts.planner;
    this.state = { turns: 0 };
    this.history = [];
    this.busy = false;
    this.onEvent = opts.onEvent || function () {};
    this.suggestions = opts.suggestions || [];
    this._build(opts);
  }

  /* ---- DOM shell ------------------------------------------------------ */

  Vitrine.prototype._build = function (opts) {
    const r = this.root;
    r.textContent = "";
    r.classList.add("vt");
    r.appendChild(liquidFilter());

    const header = document.createElement("div");
    header.className = "vt-header";

    this.logo = document.createElement("div");
    this.logo.className = "vt-logo";
    this.logo.textContent = opts.logoText || "N";
    header.appendChild(this.logo);

    const title = document.createElement("div");
    title.className = "vt-title";
    this.titleText = document.createTextNode(opts.brandName || "Northline Powersports");
    title.appendChild(this.titleText);
    const sub = document.createElement("span");
    sub.textContent = opts.brandTagline || "Sales · Service · Marine";
    title.appendChild(sub);
    header.appendChild(title);

    const right = document.createElement("div");
    right.className = "vt-header-right";
    // Several US states now require this disclosure outright. It costs one
    // chip and removes an entire category of problem.
    const badge = document.createElement("span");
    badge.className = "vt-ai-badge";
    badge.textContent = "AI assistant";
    right.appendChild(badge);
    header.appendChild(right);
    r.appendChild(header);

    this.thread = document.createElement("div");
    this.thread.className = "vt-thread";
    this.thread.setAttribute("role", "log");
    this.thread.setAttribute("aria-live", "polite");
    this.thread.setAttribute("aria-relevant", "additions");
    r.appendChild(this.thread);

    const composer = document.createElement("div");
    composer.className = "vt-composer";

    this.suggRow = document.createElement("div");
    this.suggRow.className = "vt-suggestions";
    composer.appendChild(this.suggRow);
    this._paintSuggestions();

    const row = document.createElement("div");
    row.className = "vt-composer-row";

    this.input = document.createElement("textarea");
    this.input.rows = 1;
    this.input.placeholder = opts.placeholder || "Ask about anything on the floor…";
    this.input.setAttribute("aria-label", "Message");
    row.appendChild(this.input);

    this.sendBtn = document.createElement("button");
    this.sendBtn.className = "vt-send";
    this.sendBtn.type = "button";
    this.sendBtn.setAttribute("aria-label", "Send");
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16"); svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M12 19V5M12 5l-6 6M12 5l6 6");
    p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "2.4");
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    p.setAttribute("fill", "none");
    svg.appendChild(p);
    this.sendBtn.appendChild(svg);
    if (M) M.pressable(this.sendBtn, { scale: 0.9 });
    row.appendChild(this.sendBtn);

    composer.appendChild(row);
    r.appendChild(composer);

    const self = this;
    this.input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(120, this.scrollHeight) + "px";
    });
    this.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); self._submit(); }
    });
    this.sendBtn.addEventListener("click", () => this._submit());
  };

  Vitrine.prototype._paintSuggestions = function () {
    this.suggRow.textContent = "";
    const self = this;
    this.suggestions.forEach((s) => {
      const b = document.createElement("button");
      b.className = "vt-sugg";
      b.type = "button";
      b.textContent = s;
      b.addEventListener("click", () => self.send(s));
      if (M) M.pressable(b);
      this.suggRow.appendChild(b);
    });
  };

  Vitrine.prototype._submit = function () {
    const v = this.input.value.trim();
    if (!v) return;
    this.input.value = "";
    this.input.style.height = "auto";
    this.send(v);
  };

  /* ---- thread plumbing ------------------------------------------------ */

  Vitrine.prototype._turn = function () {
    const t = document.createElement("div");
    t.className = "vt-turn";
    this.thread.appendChild(t);
    return t;
  };

  Vitrine.prototype._scroll = function () {
    this.thread.scrollTop = this.thread.scrollHeight;
  };

  Vitrine.prototype._userBubble = function (text) {
    const turn = this._turn();
    const b = document.createElement("div");
    b.className = "vt-bubble user";
    b.textContent = text;
    turn.appendChild(b);
    arrive(b, { response: 0.4, lift: 8, scale: 0.98 });
    this._scroll();
  };

  Vitrine.prototype._thinking = function () {
    const turn = this._turn();
    const b = document.createElement("div");
    b.className = "vt-bubble agent";
    arrive(b, { response: 0.38, lift: 6, scale: 0.98 });
    const t = document.createElement("span");
    t.className = "vt-typing";
    t.appendChild(document.createElement("i"));
    t.appendChild(document.createElement("i"));
    t.appendChild(document.createElement("i"));
    b.appendChild(t);
    turn.appendChild(b);
    this._scroll();
    return turn;
  };

  /**
   * Stream a text bubble. The caret is a separate node that is removed at
   * the end, so the completed bubble contains only the text — no trailing
   * element to shift the final layout.
   */
  Vitrine.prototype._streamText = function (container, body) {
    const self = this;
    const bubble = document.createElement("div");
    bubble.className = "vt-bubble agent";
    const para = document.createElement("p");
    const span = document.createElement("span");
    const caret = document.createElement("span");
    caret.className = "vt-caret";
    para.appendChild(span);
    para.appendChild(caret);
    bubble.appendChild(para);
    container.appendChild(bubble);
    arrive(bubble, { response: 0.38, lift: 6, scale: 0.98 });

    if (reduced()) {
      span.textContent = body;
      caret.remove();
      this._scroll();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let i = 0;
      // Chunked rather than per-character: 60fps of single-character writes
      // is a lot of layout work for a visual effect nobody can resolve.
      const step = () => {
        i = Math.min(body.length, i + (2 + Math.floor(Math.random() * 3)));
        span.textContent = body.slice(0, i);
        self._scroll();
        if (i < body.length) {
          setTimeout(step, 14);
        } else {
          caret.remove();
          resolve();
        }
      };
      step();
    });
  };

  /* ---- the loop -------------------------------------------------------- */

  Vitrine.prototype.send = function (text, meta) {
    const self = this;
    if (this.busy) return Promise.resolve();
    this.busy = true;
    this.sendBtn.disabled = true;

    const silent = meta && meta.silent;
    if (!silent) {
      this._userBubble(text);
      this.history.push({ role: "user", text: text });
    }
    this.onEvent({ type: "user_message", text: text, meta: meta || {} });

    const thinking = this._thinking();

    return Promise.resolve()
      .then(() => this.planner.plan(text, this.state, this.history))
      .then((blocks) => self._replay(thinking, blocks))
      .catch((err) => {
        console.error("[vitrine] planner failed", err);
        thinking.textContent = "";
        return self._streamText(thinking,
          "Something went wrong on my side. Try that again, or ask me differently.");
      })
      .then(() => {
        self.state.turns = (self.state.turns || 0) + 1;
        self.busy = false;
        self.sendBtn.disabled = false;
        self._scroll();
      });
  };

  /**
   * Walk the planner's blocks, validating each against the registry before
   * anything reaches the DOM. A block that fails is dropped with a console
   * warning — never rendered partially, never guessed at.
   */
  Vitrine.prototype._replay = function (turn, blocks) {
    const self = this;
    turn.textContent = "";

    if (!blocks || !blocks.length) {
      return this._streamText(turn, "I didn't catch that — try asking another way.");
    }

    let chain = Promise.resolve();
    let rendered = 0;

    blocks.forEach((block) => {
      chain = chain.then(() => {
        const check = Registry.validateBlock(block);
        if (!check.valid) {
          console.warn("[vitrine] dropped an invalid block:", block.component, check.errors);
          self.onEvent({ type: "block_rejected", component: block.component, errors: check.errors });
          return;
        }

        self.onEvent({ type: "block_rendered", component: block.component });

        if (block.component === "text") {
          rendered++;
          self.history.push({ role: "assistant", text: block.props.body });
          return self._streamText(turn, block.props.body);
        }

        const holder = document.createElement("div");
        holder.style.marginTop = rendered ? "12px" : "0";
        turn.appendChild(holder);
        rendered++;

        /* Components with nothing to load skip the skeleton. Everything else
           gets one sized from the registry, so the card lands in exactly the
           space the placeholder held. */
        const spec = Renderer.heights[block.component];
        if (spec && spec.instant) {
          const node = Renderer.render(block, {
            emit: (t, m) => self.send(t, m),
            setState: (patch) => Object.assign(self.state, patch),
            state: self.state
          });
          if (node) { holder.appendChild(node); arrive(node, { response: 0.44, blur: 4, lift: 8, scale: 0.98 }); }
          self.history.push({ role: "assistant", text: "[rendered " + block.component + "]" });
          self._scroll();
          return sleep(reduced() ? 0 : 90);
        }

        holder.appendChild(Renderer.skeleton(block.component));
        self._scroll();

        return sleep(reduced() ? 0 : 260).then(() => {
          const node = Renderer.render(block, {
            emit: (t, m) => self.send(t, m),
            setState: (patch) => Object.assign(self.state, patch),
            state: self.state
          });
          holder.textContent = "";
          if (node) { holder.appendChild(node); arrive(node, { response: 0.52, blur: 7, lift: 12, scale: 0.965 }); }
          self.history.push({ role: "assistant", text: "[rendered " + block.component + "]" });
          self._scroll();
          return sleep(reduced() ? 0 : 90);
        });
      });
    });

    return chain.then(() => {
      if (!rendered) return self._streamText(turn, "Let me try that a different way — what are you after?");
    });
  };

  /** Kick off the opening turn without a visible user message. */
  Vitrine.prototype.open = function () {
    const self = this;
    const turn = this._thinking();
    return Promise.resolve(this.planner.plan("__open__", this.state, []))
      .then((blocks) => self._replay(turn, blocks))
      .then(() => { self.state.turns = 1; });
  };

  Vitrine.prototype.reset = function () {
    this.thread.textContent = "";
    this.state = { turns: 0 };
    this.history = [];
    this.busy = false;
    this.sendBtn.disabled = false;
    return this.open();
  };

  global.Vitrine = Vitrine;
})(typeof window !== "undefined" ? window : globalThis);
