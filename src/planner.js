/* ==========================================================================
   Vitrine — planners
   --------------------------------------------------------------------------
   A planner turns (message, state, history) into an ordered list of blocks:

       [{ component: "text", props: {...} },
        { component: "unit_carousel", props: {...} }]

   Four are shipped.

   MockPlanner is deterministic and offline. It exists so the demo works the
   instant the page loads — no key, no network, no rate limit, identical
   every time. Screenshots and tests need that; so do the ninety percent of
   visitors who will never paste an API key into a stranger's demo.

   LivePlanner talks to a real model with the registry's schemas bound as
   tools, so the model is constrained by exactly the contract the renderer
   trusts. Same registry, one source of truth, no drift.

   RemotePlanner sends {message, state, history} to your own endpoint and
   expects {blocks} back — the production shape, where the key and the
   prompt live on a server you control.

   FallbackPlanner chains two planners: a primary (usually remote) and a
   fallback (usually mock), so a rate-limited or unreachable endpoint
   degrades to scripted answers instead of an error.

   All return the same shape, and the runtime cannot tell them apart.
   ========================================================================== */

(function (global) {
  "use strict";

  const Inv = global.DemoInventory;

  /* ======================================================================
     Mock planner
     ====================================================================== */

  function unitToCard(u) {
    return {
      id: u.id, name: u.name, meta: u.meta, price: u.price,
      monthly: u.monthly, badge: u.badge, category: u.category, hue: u.hue,
      image: u.image, imageCredit: u.imageCredit
    };
  }

  function compareRows(units) {
    const keys = [];
    units.forEach((u) => {
      Object.keys(Inv.SPECS[u.id] || {}).forEach((k) => {
        if (keys.indexOf(k) === -1) keys.push(k);
      });
    });
    return keys.slice(0, 6).map((k) => {
      const values = units.map((u) => (Inv.SPECS[u.id] || {})[k] || "—");
      const row = { label: k, values: values };
      if (k === "Est. payment") {
        let best = 0, bestN = Infinity;
        values.forEach((v, i) => {
          const n = Number(String(v).replace(/[^\d]/g, ""));
          if (n && n < bestN) { bestN = n; best = i; }
        });
        if (bestN < Infinity) row.bestIndex = best;
      }
      return row;
    });
  }

  function MockPlanner() {}

  MockPlanner.prototype.name = "mock";

  MockPlanner.prototype.plan = function (message, state) {
    const q = String(message || "").toLowerCase();
    const out = [];

    /* --- terminal: the lead form was submitted ----------------------- */
    if (message === "__lead_submitted__") {
      const rows = [];
      if (state.selectedUnitName) rows.push({ label: "Unit", value: state.selectedUnitName });
      if (state.apptDate) rows.push({ label: "When", value: state.apptDate + (state.apptTime ? ", " + state.apptTime : "") });
      if (state.leadName) rows.push({ label: "Name", value: state.leadName });
      if (state.leadPhone) rows.push({ label: "Mobile", value: state.leadPhone });
      if (state.tradeIn) rows.push({ label: "Trade", value: state.tradeIn });
      if (!rows.length) rows.push({ label: "Status", value: "Received" });

      out.push({ component: "summary_receipt", props: {
        title: "You're booked",
        subtitle: "A text confirmation is on the way. Reply to it and it reaches the same person you'd meet.",
        rows: rows
      }});
      return out;
    }

    /* --- greeting ----------------------------------------------------- */
    if (!state.turns) {
      out.push({ component: "text", props: {
        body: "Hey — I can search the floor, work out payments, value your trade and book you in. What are you after?"
      }});
      out.push({ component: "choice_chips", props: {
        options: [
          { label: "Something to ride", value: "Show me motorcycles under $12,000" },
          { label: "Something on water", value: "I want a boat the whole family fits in" },
          { label: "Value my trade", value: "What's my trade worth?" },
          { label: "Just book a visit", value: "I'd like to book a visit" }
        ]
      }});
      return out;
    }

    /* --- booking a specific slot -------------------------------------- */
    if (/^book me for /.test(q) || (state.apptTime && /confirm/.test(q))) {
      out.push({ component: "text", props: { body: "Locked. Last thing and you're done." } });
      out.push({ component: "lead_capture", props: {
        title: "Where should we send the confirmation?",
        subtitle: state.selectedUnitName
          ? "We'll have the " + state.selectedUnitName + " out front and charged."
          : "We'll have someone free when you arrive.",
        cta: "Confirm booking"
      }});
      return out;
    }

    /* --- scheduling ---------------------------------------------------- */
    if (/\b(book|schedule|appointment|visit|test ride|demo|sea trial|walkthrough|come in|see it)\b/.test(q)) {
      out.push({ component: "text", props: {
        body: state.selectedUnitName
          ? "Good call — the " + state.selectedUnitName + " is worth sitting on before you decide. When suits?"
          : "Sure. When works for you?"
      }});
      out.push({ component: "schedule", props: {
        title: state.selectedUnitName ? "Ride the " + state.selectedUnitName : "Book a visit",
        subtitle: "45 minutes. Bring a licence and we'll have it ready.",
        days: Inv.upcomingDays(5)
      }});
      return out;
    }

    /* --- trade-in ------------------------------------------------------ */
    if (/\b(trade|trade-in|part exchange|worth|sell my|my current)\b/.test(q)) {
      out.push({ component: "text", props: { body: "Let's put a number on it." } });
      out.push({ component: "trade_in", props: {} });
      return out;
    }

    /* --- financing ------------------------------------------------------
       No trailing \b on the stems: "payments" and "financing" are how people
       actually write this, and \b after "payment" refuses the plural. */
    if (/(financ|payment|instal?ment|afford|monthly|per month|\bapr\b|\bloan\b|\bcredit\b|\bdown payment\b)/.test(q)) {
      const u = Inv.byId(state.selectedUnitId) || Inv.search(q, 1)[0];
      out.push({ component: "text", props: {
        body: "Here's the shape of it on the " + u.name + ". Move the sliders — the disclosure updates with them."
      }});
      out.push({ component: "finance_slider", props: {
        unitId: u.id, unitName: u.name, price: u.price,
        apr: 8.99, termMonths: 60,
        downPayment: Math.round(u.price * 0.1),
        minDown: 0, maxDown: Math.round(u.price * 0.5),
        termOptions: [24, 36, 48, 60, 72],
        lenderNote: "Rate shown is a well-qualified tier example."
      }});
      return out;
    }

    /* --- comparison ------------------------------------------------------ */
    if (/\b(compare|versus|vs\.?|difference|side by side|which one)\b/.test(q)) {
      let units = Inv.search(q, 3);
      const sel = Inv.byId(state.selectedUnitId);
      if (sel && units.map((u) => u.id).indexOf(sel.id) === -1) units = [sel].concat(units).slice(0, 3);
      units = units.slice(0, 3);

      out.push({ component: "text", props: { body: "Side by side, then." } });
      out.push({ component: "unit_compare", props: {
        title: units.map((u) => u.name.replace(/^\d{4}\s+/, "")).join("  ·  "),
        units: units.map((u) => ({ id: u.id, name: u.name.replace(/^\d{4}\s+/, "") })),
        rows: compareRows(units)
      }});
      out.push({ component: "choice_chips", props: {
        options: units.slice(0, 3).map((u) => ({
          label: "Payments on the " + u.name.split(" ").slice(1, 3).join(" "),
          value: "What are the payments on the " + u.name + "?"
        }))
      }});
      return out;
    }

    /* --- a specific unit -------------------------------------------------- */
    const named = /tell me more about (.+)/.exec(q);
    if (named || state.lastIntent === "carousel") {
      const u = Inv.byId(state.selectedUnitId) || Inv.search(named ? named[1] : q, 1)[0];
      if (u) {
        const spec = Inv.SPECS[u.id] || {};
        const bits = Object.keys(spec).slice(0, 3).map((k) => k.toLowerCase() + " " + spec[k]).join(", ");
        out.push({ component: "text", props: {
          body: "The " + u.name + " — " + bits + ". It's on the floor now at " +
                "$" + u.price.toLocaleString("en-US") + "."
        }});
        out.push({ component: "choice_chips", props: {
          options: [
            { label: "What's the payment?", value: "What are the payments on the " + u.name + "?" },
            { label: "Compare it", value: "Compare the " + u.name + " with something similar" },
            { label: "Book a ride", value: "Book me a test ride on the " + u.name }
          ]
        }});
        return out;
      }
    }

    /* --- search (the default) ---------------------------------------------- */
    const results = Inv.search(q, 4);
    if (results.length) {
      const budget = Inv.parseBudget(q);
      const count = ["", "One", "Two", "Three", "Four", "Five", "Six"][results.length] || String(results.length);
      out.push({ component: "text", props: {
        body: budget
          ? count + " that land under $" + budget.toLocaleString("en-US") + ", closest match first."
          : "Here's what's on the floor that fits."
      }});
      out.push({ component: "unit_carousel", props: {
        title: "On the floor now",
        subtitle: "Tap one and I'll pull the numbers.",
        units: results.map(unitToCard)
      }});
      return out;
    }

    out.push({ component: "text", props: {
      body: "I can search inventory, run payments, value a trade or book you a slot. Which of those?"
    }});
    out.push({ component: "choice_chips", props: {
      options: [
        { label: "Search inventory", value: "Show me what's on the floor" },
        { label: "Run a payment", value: "What would payments look like?" },
        { label: "Book a visit", value: "I'd like to book a visit" }
      ]
    }});
    return out;
  };

  /* ======================================================================
     Live planner — a real model, bound to the same schemas
     ====================================================================== */

  const SYSTEM = [
    "You are the sales assistant on the website of a powersports, marine and RV dealership.",
    "",
    "You do not reply in prose. You reply by choosing components from a fixed catalog and",
    "filling their payloads. Every tool you can call is one component. Call one to four of",
    "them per turn, in the order they should appear.",
    "",
    "How to choose well:",
    "- Lead with at most one short `render_text` for voice, then let components carry the content.",
    "- Anything the user must pick between is a component, never a sentence. If you catch",
    "  yourself listing options in prose, you picked the wrong tool.",
    "- Never invent inventory. Use only units from the INVENTORY block, with exact ids and prices.",
    "- Ask for contact details last, once something concrete has been chosen. Never first.",
    "- A monthly payment may only be shown through `render_finance_slider`, which attaches the",
    "  Regulation Z disclosure automatically. Never put a payment figure in text.",
    "",
    "Tone: a good salesperson on their fourth coffee. Short sentences. No exclamation marks,",
    "no 'Great question', no emoji, no restating what the user just said."
  ].join("\n");

  /**
   * @param {{provider?:string, apiKey:string, model?:string, endpoint?:string}} cfg
   */
  function LivePlanner(cfg) {
    this.cfg = cfg || {};
    this.provider = this.cfg.provider || "anthropic";
  }

  LivePlanner.prototype.name = "live";

  LivePlanner.prototype.inventoryContext = function () {
    return "INVENTORY (the only units that exist):\n" +
      Inv.UNITS.map((u) =>
        "- id=" + u.id + " | " + u.name + " | " + u.category + " | $" + u.price +
        " | ~$" + u.monthly + "/mo | " + u.meta + " | hue=" + u.hue + " | image=" + (u.image || "none")
      ).join("\n");
  };

  LivePlanner.prototype.plan = function (message, state, history) {
    const tools = global.VitrineRegistry.toolSpecs();
    const sys = SYSTEM + "\n\n" + this.inventoryContext() +
      "\n\nCONVERSATION STATE: " + JSON.stringify(state);

    const msgs = (history || []).slice(-8).map((h) => ({
      role: h.role, content: [{ type: "text", text: h.text }]
    }));
    msgs.push({ role: "user", content: [{ type: "text", text: message }] });

    if (this.provider === "anthropic") {
      return fetch(this.cfg.endpoint || "https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.cfg.apiKey,
          "anthropic-version": "2023-06-01",
          // Browser calls to the Anthropic API need this opt-in. It also means
          // the key is in the page — fine for a local demo, never for production.
          // Ship a server proxy instead; see README, "Going live".
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: this.cfg.model || "claude-sonnet-4-5",
          max_tokens: this.cfg.maxTokens || 1400,
          system: sys,
          tools: tools,
          // The contract is components-only; "any" stops the model from
          // drifting into prose on inputs the system prompt didn't foresee.
          tool_choice: { type: "any" },
          messages: msgs
        })
      }).then((r) => r.json()).then((data) => {
        if (data.error) throw new Error(data.error.message || "API error");
        return (data.content || [])
          .filter((c) => c.type === "tool_use")
          .map((c) => ({ component: c.name.replace(/^render_/, ""), props: c.input }));
      });
    }

    // OpenAI-compatible fallback.
    return fetch(this.cfg.endpoint || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + this.cfg.apiKey },
      body: JSON.stringify({
        model: this.cfg.model || "gpt-4o",
        messages: [{ role: "system", content: sys }].concat(
          msgs.map((m) => ({ role: m.role, content: m.content[0].text }))
        ),
        tools: tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.input_schema }
        })),
        tool_choice: "required"
      })
    }).then((r) => r.json()).then((data) => {
      if (data.error) throw new Error(data.error.message || "API error");
      const choice = (data.choices || [])[0] || {};
      const calls = (choice.message && choice.message.tool_calls) || [];
      return calls.map((c) => {
        let props = {};
        try { props = JSON.parse(c.function.arguments || "{}"); } catch (e) { /* dropped by validation */ }
        return { component: c.function.name.replace(/^render_/, ""), props: props };
      });
    });
  };

  /* ======================================================================
     Remote planner — this page's contract, your server's key
     ====================================================================== */

  /**
   * @param {{endpoint:string, timeoutMs?:number}} cfg
   */
  function RemotePlanner(cfg) {
    this.cfg = cfg || {};
  }

  RemotePlanner.prototype.name = "remote";

  RemotePlanner.prototype.plan = function (message, state, history) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), this.cfg.timeoutMs || 9000) : null;

    return fetch(this.cfg.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: message,
        state: state,
        history: (history || []).slice(-8)
      }),
      signal: ctl ? ctl.signal : undefined
    }).then((r) => {
      if (!r.ok) {
        const err = new Error("planner endpoint returned " + r.status);
        err.status = r.status;
        throw err;
      }
      return r.json();
    }).then((data) => data.blocks || [])
      .finally(() => { if (timer) clearTimeout(timer); });
  };

  /* ======================================================================
     Fallback planner — remote first, scripted when it can't answer
     ====================================================================== */

  function FallbackPlanner(primary, fallback) {
    this.primary = primary;
    this.fallback = fallback;
    this.scripted = false; // the page flips this on for auto-played turns
    this.noted = false;
  }

  FallbackPlanner.prototype.name = "fallback";

  FallbackPlanner.prototype.plan = function (message, state, history) {
    const self = this;

    // Synthetic turns (opening, lead receipt) and scripted auto-play stay on
    // the deterministic planner — no reason to spend a model call on them.
    if (this.scripted || message === "__open__" || message === "__lead_submitted__") {
      return Promise.resolve(this.fallback.plan(message, state, history));
    }

    return Promise.resolve()
      .then(() => self.primary.plan(message, state, history))
      .then((blocks) => {
        if (blocks && blocks.length) return blocks;
        throw new Error("primary planner returned no blocks");
      })
      .catch((err) => {
        console.warn("[vitrine] live planner unavailable, answering scripted:", err && err.message);
        const blocks = self.fallback.plan(message, state, history) || [];
        if (!self.noted) {
          self.noted = true;
          const why = err && err.status === 429 ? "hit the demo's rate limit" : "is unreachable";
          blocks.unshift({ component: "text", props: {
            body: "(The live model " + why + " right now, so this reply comes scripted.)"
          }});
        }
        return blocks;
      });
  };

  global.VitrinePlanner = { MockPlanner, LivePlanner, RemotePlanner, FallbackPlanner, SYSTEM };
})(typeof window !== "undefined" ? window : globalThis);
