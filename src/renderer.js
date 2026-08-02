/* ==========================================================================
   Vitrine — renderer
   --------------------------------------------------------------------------
   Pure function: a validated component spec goes in, DOM comes out.

   Three rules this file never breaks:

   1. Nothing from the model is ever passed to innerHTML. Every string the
      model produced reaches the page through textContent or a typed
      attribute. There is no path from a planner response to markup.
   2. Every card knows its own height before its content arrives, so the
      skeleton and the hydrated card occupy the same space. Chat UIs that
      reflow after a card lands feel broken even when they are correct.
   3. Interaction is emitted back into the conversation as if the user had
      typed it. A tapped card and a typed sentence are the same event to
      everything downstream, which is what keeps the transcript coherent.
   ========================================================================== */

(function (global) {
  "use strict";

  /* ---- helpers -------------------------------------------------------- */

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  const usd = (n) =>
    "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

  const usd2 = (n) =>
    "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** Standard amortised payment. Handles the 0% APR case, which the naive formula divides by zero on. */
  function monthlyPayment(principal, aprPct, months) {
    const r = (Number(aprPct) / 100) / 12;
    if (!months) return 0;
    if (r === 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  }

  /* ---- unit artwork ---------------------------------------------------
     Geometric silhouettes rather than photography: a demo that ships with
     no image assets can be dropped into any page, and the tenant's real
     inventory photos slot into the same box later.
     ------------------------------------------------------------------- */

  const SHAPES = {
    moto:  "M12 62 h10 l12-22 h22 l6 10 h14 M34 40 l-6 22 M62 50 h16",
    atv:   "M14 56 h72 M22 56 l6-18 h44 l6 18 M34 38 v-8 h20 v8",
    boat:  "M8 58 q42 16 84 0 l-8-14 H16 z M46 44 V22 l22 10 -22 6",
    rv:    "M10 30 h56 l16 14 v14 H10 z M18 36 h20 v12 H18 z M50 36 h12 v12 H50 z",
    jetski:"M10 54 q30 14 76 0 l-10-14 q-26 -8 -46 2 z M48 40 V26 h14"
  };
  const WHEELS = {
    moto:  [[24, 62, 9], [76, 62, 9]],
    atv:   [[24, 60, 8], [46, 60, 8], [64, 60, 8], [84, 60, 8]],
    rv:    [[26, 58, 8], [72, 58, 8]],
    boat:  [],
    jetski:[]
  };

  function unitArt(category, hue) {
    const cat = SHAPES[category] ? category : "moto";
    const h = (typeof hue === "number") ? hue : 210;

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 96 76");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none");

    const g = document.createElementNS(ns, "g");
    g.setAttribute("stroke", "rgba(255,255,255,.92)");
    g.setAttribute("stroke-width", "2.4");
    g.setAttribute("stroke-linecap", "round");
    g.setAttribute("stroke-linejoin", "round");

    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", SHAPES[cat]);
    g.appendChild(p);

    (WHEELS[cat] || []).forEach(([cx, cy, r]) => {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", r);
      g.appendChild(c);
    });

    svg.appendChild(g);

    const wrap = el("div", "vt-unit-art");
    wrap.style.background =
      "linear-gradient(150deg, hsl(" + h + " 62% 54%), hsl(" + ((h + 34) % 360) + " 58% 42%))";
    wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     Components
     ====================================================================== */

  const R = {};

  /* ---------------------------------------------------------------- */
  R.text = function (props) {
    const b = el("div", "vt-bubble agent");
    String(props.body).split(/\n{2,}/).forEach((para) => b.appendChild(el("p", null, para)));
    return b;
  };

  /* ---------------------------------------------------------------- */
  R.choice_chips = function (props, ctx) {
    const wrap = el("div");
    if (props.prompt) {
      const b = el("div", "vt-bubble agent");
      b.appendChild(el("p", null, props.prompt));
      b.style.marginBottom = "10px";
      wrap.appendChild(b);
    }
    const row = el("div", "vt-chips");
    props.options.forEach((opt) => {
      const c = el("button", "vt-chip", opt.label);
      c.type = "button";
      c.addEventListener("click", () => ctx.emit(opt.value, { source: "choice_chips" }));
      row.appendChild(c);
    });
    wrap.appendChild(row);
    return wrap;
  };
  R.choice_chips.height = 92;

  /* ---------------------------------------------------------------- */
  R.unit_carousel = function (props, ctx) {
    const card = el("div", "vt-card");

    if (props.title || props.subtitle) {
      const head = el("div", "vt-card-head");
      if (props.title) head.appendChild(el("h3", "vt-card-title", props.title));
      if (props.subtitle) head.appendChild(el("p", "vt-card-sub", props.subtitle));
      card.appendChild(head);
    }

    const rail = el("div", "vt-rail");
    rail.setAttribute("role", "list");
    rail.setAttribute("aria-label", props.title || "Matching units");

    props.units.forEach((u) => {
      const b = el("button", "vt-unit");
      b.type = "button";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label",
        u.name + ", " + usd(u.price) + (u.meta ? ", " + u.meta : ""));

      const art = unitArt(u.category, u.hue);
      if (u.badge) art.appendChild(el("span", "vt-unit-tag", u.badge));
      b.appendChild(art);

      const body = el("div", "vt-unit-body");
      body.appendChild(el("div", "vt-unit-name", u.name));
      if (u.meta) body.appendChild(el("div", "vt-unit-meta", u.meta));

      const price = el("div", "vt-unit-price", usd(u.price));
      if (u.monthly) {
        const mo = el("span", "vt-unit-mo", "  ·  " + usd(u.monthly) + "/mo est.");
        price.appendChild(mo);
      }
      body.appendChild(price);
      b.appendChild(body);

      b.addEventListener("click", () => {
        ctx.setState({ selectedUnitId: u.id, selectedUnitName: u.name, selectedUnitPrice: u.price });
        ctx.emit("Tell me more about the " + u.name, { source: "unit_carousel", unitId: u.id });
      });

      rail.appendChild(b);
    });

    card.appendChild(rail);
    return card;
  };
  R.unit_carousel.height = 268;

  /* ---------------------------------------------------------------- */
  R.unit_compare = function (props) {
    const card = el("div", "vt-card");
    const head = el("div", "vt-card-head");
    head.appendChild(el("h3", "vt-card-title", props.title || "Side by side"));
    card.appendChild(head);

    const wrap = el("div", "vt-cmp-wrap");
    const table = el("table", "vt-cmp");

    const thead = el("thead");
    const hr = el("tr");
    hr.appendChild(el("th", null, ""));
    props.units.forEach((u) => {
      const th = el("th", null, u.name);
      th.setAttribute("scope", "col");
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = el("tbody");
    props.rows.forEach((row) => {
      const tr = el("tr");
      const th = el("th", null, row.label);
      th.setAttribute("scope", "row");
      tr.appendChild(th);
      row.values.forEach((v, i) => {
        const td = el("td", row.bestIndex === i ? "best" : null, v);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    wrap.appendChild(table);
    card.appendChild(wrap);
    return card;
  };
  R.unit_compare.height = 290;

  /* ---------------------------------------------------------------- */
  R.finance_slider = function (props, ctx) {
    const card = el("div", "vt-card");

    const head = el("div", "vt-card-head");
    head.appendChild(el("h3", "vt-card-title", "Estimate a payment"));
    head.appendChild(el("p", "vt-card-sub", props.unitName + " · " + usd(props.price)));
    card.appendChild(head);

    const body = el("div", "vt-card-body");

    const minDown = props.minDown !== undefined ? props.minDown : 0;
    const maxDown = props.maxDown !== undefined ? props.maxDown : Math.round(props.price * 0.5);
    const terms = (props.termOptions && props.termOptions.length) ? props.termOptions : [24, 36, 48, 60, 72];

    // Snap the default to the slider's step, otherwise the thumb lands on a
    // rounded value that disagrees with the number printed beside it.
    const STEP = 250;
    const rawDown = props.downPayment !== undefined ? props.downPayment : props.price * 0.1;
    let down = Math.min(maxDown, Math.max(minDown, Math.round(rawDown / STEP) * STEP));
    let termIdx = Math.max(0, terms.indexOf(props.termMonths));
    if (termIdx === -1) termIdx = terms.length - 1;

    /* headline figure */
    const figure = el("div", "vt-fin-figure");
    const amount = el("div", "vt-fin-amount", "$0");
    amount.setAttribute("aria-live", "polite");
    figure.appendChild(amount);
    figure.appendChild(el("div", "vt-fin-per", "per month, estimated"));
    body.appendChild(figure);

    /* down payment */
    const dWrap = el("div", "vt-slider");
    const dTop = el("div", "vt-slider-top");
    dTop.appendChild(el("span", "vt-slider-name", "Down payment"));
    const dVal = el("span", "vt-slider-val", usd(down));
    dTop.appendChild(dVal);
    dWrap.appendChild(dTop);
    const dIn = el("input", "vt-range");
    dIn.type = "range";
    dIn.min = String(minDown); dIn.max = String(maxDown);
    dIn.step = String(STEP); dIn.value = String(down);
    dIn.setAttribute("aria-label", "Down payment");
    dWrap.appendChild(dIn);
    body.appendChild(dWrap);

    /* term */
    const tWrap = el("div", "vt-slider");
    const tTop = el("div", "vt-slider-top");
    tTop.appendChild(el("span", "vt-slider-name", "Term"));
    const tVal = el("span", "vt-slider-val", terms[termIdx] + " months");
    tTop.appendChild(tVal);
    tWrap.appendChild(tTop);
    const tIn = el("input", "vt-range");
    tIn.type = "range";
    tIn.min = "0"; tIn.max = String(terms.length - 1);
    tIn.step = "1"; tIn.value = String(termIdx);
    tIn.setAttribute("aria-label", "Loan term in months");
    tWrap.appendChild(tIn);
    body.appendChild(tWrap);

    /* Regulation Z / Regulation M disclosure.
       Rendered from the same numbers the slider is showing, recomputed on
       every input event. There is no code path that displays a payment
       without it — that is the point of putting it in the renderer rather
       than leaving it to whoever writes the prompt. */
    const disc = el("div", "vt-disclosure");
    disc.appendChild(el("b", null, "Financing disclosure"));
    const dl = el("dl");
    const mk = (k) => {
      dl.appendChild(el("dt", null, k));
      const dd = el("dd", null, "—");
      dl.appendChild(dd);
      return dd;
    };
    const ddDown  = mk("Down payment");
    const ddFin   = mk("Amount financed");
    const ddApr   = mk("APR");
    const ddTerm  = mk("Term");
    const ddPay   = mk("Monthly payment");
    const ddTotal = mk("Total of payments");
    disc.appendChild(dl);
    disc.appendChild(el("span", null,
      "Estimate only, for illustration. Not an offer of credit and not a quote. " +
      "Actual APR and terms depend on creditworthiness, lender approval and final " +
      "negotiated price, and exclude tax, title, registration and dealer charges. " +
      (props.lenderNote || "")
    ));
    body.appendChild(disc);

    const cta = el("button", "vt-btn block", "Check what I qualify for");
    cta.type = "button";
    cta.style.marginTop = "14px";
    body.appendChild(cta);

    function recompute() {
      down = Number(dIn.value);
      const term = terms[Number(tIn.value)];
      const financed = Math.max(0, props.price - down);
      const pay = monthlyPayment(financed, props.apr, term);
      const total = pay * term;

      amount.textContent = usd(pay);
      dVal.textContent = usd(down);
      tVal.textContent = term + " months";

      ddDown.textContent  = usd(down);
      ddFin.textContent   = usd(financed);
      ddApr.textContent   = Number(props.apr).toFixed(2) + "%";
      ddTerm.textContent  = term + " months";
      ddPay.textContent   = usd2(pay);
      ddTotal.textContent = usd2(total);

      dIn.style.setProperty("--vt-pct", ((down - minDown) / Math.max(1, maxDown - minDown) * 100) + "%");
      tIn.style.setProperty("--vt-pct", (Number(tIn.value) / Math.max(1, terms.length - 1) * 100) + "%");
    }

    dIn.addEventListener("input", recompute);
    tIn.addEventListener("input", recompute);
    recompute();

    cta.addEventListener("click", () => {
      ctx.setState({ financeDown: down, financeTerm: terms[Number(tIn.value)] });
      ctx.emit("I'd like to see what I qualify for on the " + props.unitName, { source: "finance_slider" });
    });

    card.appendChild(body);
    return card;
  };
  R.finance_slider.height = 470;

  /* ---------------------------------------------------------------- */
  R.trade_in = function (props, ctx) {
    const card = el("div", "vt-card");
    const head = el("div", "vt-card-head");
    head.appendChild(el("h3", "vt-card-title", props.title || "What's your trade worth?"));
    head.appendChild(el("p", "vt-card-sub", "Four fields. Indicative range in a second, no contact details needed."));
    card.appendChild(head);

    const body = el("div", "vt-card-body");
    const pre = props.prefill || {};

    function field(label, name, ph, val, wrapCls) {
      const f = el("label", "vt-field" + (wrapCls ? " " + wrapCls : ""));
      f.appendChild(el("span", "vt-label", label));
      const i = el("input", "vt-input");
      i.type = "text"; i.name = name; i.placeholder = ph;
      if (val) i.value = val;
      f.appendChild(i);
      return { wrap: f, input: i };
    }

    const grid = el("div", "vt-grid2");
    const fYear  = field("Year", "year", "2021", pre.year);
    const fMake  = field("Make", "make", "Yamaha", pre.make);
    const fModel = field("Model", "model", "MT-07", pre.model);
    const fHours = field("Miles / hours", "hours", "6,400", pre.hours);
    [fYear, fMake, fModel, fHours].forEach((f) => grid.appendChild(f.wrap));
    body.appendChild(grid);

    const btn = el("button", "vt-btn block", "Get my range");
    btn.type = "button";
    btn.style.marginTop = "4px";
    body.appendChild(btn);

    const out = el("div");
    body.appendChild(out);

    btn.addEventListener("click", () => {
      const yr = parseInt(fYear.input.value, 10);
      if (!yr || String(yr).length !== 4) { fYear.input.focus(); return; }

      // Deliberately crude: this is a demo, and a real integration would call
      // a book-value service here. The shape of the interaction is the point.
      const age = Math.max(0, 2026 - yr);
      const base = Math.max(1400, 15500 - age * 1250);
      const lo = Math.round(base * 0.86 / 50) * 50;
      const hi = Math.round(base * 1.14 / 50) * 50;

      out.textContent = "";
      const est = el("div", "vt-estimate");
      est.appendChild(el("div", "k", "Indicative range"));
      est.appendChild(el("div", "v", usd(lo) + " – " + usd(hi)));
      est.appendChild(el("div", "n",
        "Based on year and category only. A real number needs eyes on the unit — " +
        "condition, service history and tyres move this by more than the model does."));
      est.classList.add("vt-enter");
      out.appendChild(est);

      const label = [fYear.input.value, fMake.input.value, fModel.input.value].filter(Boolean).join(" ");
      ctx.setState({ tradeIn: label, tradeLow: lo, tradeHigh: hi });
      btn.textContent = "Recalculate";
    });

    card.appendChild(body);
    return card;
  };
  R.trade_in.height = 300;

  /* ---------------------------------------------------------------- */
  R.schedule = function (props, ctx) {
    const card = el("div", "vt-card");
    const head = el("div", "vt-card-head");
    head.appendChild(el("h3", "vt-card-title", props.title || "Pick a time"));
    if (props.subtitle) head.appendChild(el("p", "vt-card-sub", props.subtitle));
    card.appendChild(head);

    const body = el("div", "vt-card-body");
    let activeDay = 0;

    const dayRow = el("div", "vt-days");
    dayRow.setAttribute("role", "group");
    dayRow.setAttribute("aria-label", "Choose a day");
    const slotGrid = el("div", "vt-slots");
    slotGrid.setAttribute("role", "group");
    slotGrid.setAttribute("aria-label", "Choose a time");

    function paintSlots() {
      slotGrid.textContent = "";
      const day = props.days[activeDay];
      day.slots.forEach((s) => {
        const b = el("button", "vt-slot", s.time);
        b.type = "button";
        b.setAttribute("aria-pressed", "false");
        if (s.taken) {
          b.disabled = true;
          b.setAttribute("aria-label", s.time + ", unavailable");
        } else {
          b.addEventListener("click", () => {
            Array.from(slotGrid.children).forEach((c) => c.setAttribute("aria-pressed", "false"));
            b.setAttribute("aria-pressed", "true");
            ctx.setState({ apptDate: day.date, apptTime: s.time });
            ctx.emit("Book me for " + day.date + " at " + s.time, { source: "schedule" });
          });
        }
        slotGrid.appendChild(b);
      });
    }

    props.days.forEach((d, i) => {
      const b = el("button", "vt-day");
      b.type = "button";
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.setAttribute("aria-label", d.date);
      b.appendChild(el("span", "dow", d.dow));
      b.appendChild(el("span", "dnum", d.dnum));
      b.addEventListener("click", () => {
        activeDay = i;
        Array.from(dayRow.children).forEach((c, j) => c.setAttribute("aria-pressed", j === i ? "true" : "false"));
        paintSlots();
      });
      dayRow.appendChild(b);
    });

    body.appendChild(dayRow);
    body.appendChild(slotGrid);
    paintSlots();

    card.appendChild(body);
    return card;
  };
  R.schedule.height = 236;

  /* ---------------------------------------------------------------- */
  R.lead_capture = function (props, ctx) {
    const card = el("div", "vt-card");
    const head = el("div", "vt-card-head");
    head.appendChild(el("h3", "vt-card-title", props.title || "Where should we confirm?"));
    if (props.subtitle) head.appendChild(el("p", "vt-card-sub", props.subtitle));
    card.appendChild(head);

    const body = el("div", "vt-card-body");
    const form = el("form");

    function field(label, name, type, ph, auto) {
      const f = el("label", "vt-field");
      f.appendChild(el("span", "vt-label", label));
      const i = el("input", "vt-input");
      i.type = type; i.name = name; i.placeholder = ph; i.required = true;
      if (auto) i.autocomplete = auto;
      f.appendChild(i);
      form.appendChild(f);
      return i;
    }

    const iName  = field("Name", "name", "text", "Alex Moreno", "name");
    const iPhone = field("Mobile", "phone", "tel", "(555) 012-8899", "tel");
    const iMail  = field("Email", "email", "email", "alex@example.com", "email");

    const note = el("p", "vt-disclosure");
    note.style.marginTop = "2px";
    note.textContent = props.consentNote ||
      "By continuing you agree to be contacted about this enquiry, including by text. " +
      "Message and data rates may apply. Consent is not a condition of purchase; reply STOP to opt out.";
    form.appendChild(note);

    const btn = el("button", "vt-btn block", props.cta || "Confirm");
    btn.type = "submit";
    btn.style.marginTop = "14px";
    form.appendChild(btn);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!iName.value.trim() || !iPhone.value.trim()) return;
      ctx.setState({ leadName: iName.value.trim(), leadPhone: iPhone.value.trim(), leadEmail: iMail.value.trim() });
      btn.disabled = true;
      btn.textContent = "Sending…";
      [iName, iPhone, iMail].forEach((i) => { i.readOnly = true; });
      Promise.resolve(ctx.emit("__lead_submitted__", { source: "lead_capture", silent: true }))
        .then(() => { btn.textContent = "Sent"; });
    });

    body.appendChild(form);
    card.appendChild(body);
    return card;
  };
  R.lead_capture.height = 360;

  /* ---------------------------------------------------------------- */
  R.summary_receipt = function (props) {
    const card = el("div", "vt-card");
    const body = el("div", "vt-card-body vt-receipt");
    body.style.paddingTop = "18px";

    const check = el("div", "vt-receipt-check");
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "21"); svg.setAttribute("height", "21");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M5 12.5 L10 17.5 L19 7");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.6");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("fill", "none");
    svg.appendChild(path);
    check.appendChild(svg);
    body.appendChild(check);

    body.appendChild(el("h3", "vt-card-title", props.title));
    if (props.subtitle) body.appendChild(el("p", "vt-card-sub", props.subtitle));

    const dl = el("dl");
    props.rows.forEach((r) => {
      dl.appendChild(el("dt", null, r.label));
      dl.appendChild(el("dd", null, r.value));
    });
    body.appendChild(dl);

    card.appendChild(body);
    return card;
  };
  R.summary_receipt.height = 250;

  /* ======================================================================
     Public entry points
     ====================================================================== */

  /**
   * Build a skeleton that occupies the component's known height, so the
   * hydrated card lands in exactly the space the skeleton held.
   */
  function skeleton(componentName) {
    const h = (R[componentName] && R[componentName].height) || 120;
    const s = el("div", "vt-skel");
    s.style.height = h + "px";
    s.setAttribute("aria-hidden", "true");
    s.appendChild(el("div", "vt-skel-line w40"));
    if (h > 200) s.appendChild(el("div", "vt-skel-block"));
    s.appendChild(el("div", "vt-skel-line w80"));
    s.appendChild(el("div", "vt-skel-line w60"));
    return s;
  }

  /**
   * Render one validated block.
   * @param {{component:string, props:object}} block
   * @param {{emit:Function, setState:Function, state:object}} ctx
   * @returns {HTMLElement|null}
   */
  function render(block, ctx) {
    const fn = R[block.component];
    if (!fn) return null;
    try {
      const node = fn(block.props || {}, ctx);
      if (node) node.classList.add("vt-enter");
      return node;
    } catch (err) {
      // A component that throws must not take the conversation down with it.
      console.error("[vitrine] renderer threw for '" + block.component + "'", err);
      return null;
    }
  }

  global.VitrineRenderer = { render, skeleton, monthlyPayment, usd, heights: R };
})(typeof window !== "undefined" ? window : globalThis);
