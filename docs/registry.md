# The component contract

Every turn the planner produces an ordered array of **blocks**:

```json
[
  { "component": "text",          "props": { "body": "Four that land under $12,000." } },
  { "component": "unit_carousel", "props": { "units": [ … ] } }
]
```

The runtime validates each block against its schema **before** anything touches the DOM. A block that fails is dropped with a console warning and a `block_rejected` event; it is never rendered partially and never guessed at. If every block in a turn is rejected, the runtime falls back to a text bubble — the conversation degrades, it does not break.

Blocks render in array order. One to four per turn is the useful range.

---

## Writing descriptions

The `description` on each registry entry is not documentation. It is prompt surface — it goes to the model verbatim as the tool description, and it is where nearly all of the output quality lives.

The rule that pays for itself: **say when not to use the component.** A description that only says what a component does gets it used everywhere.

```js
// Weak — the model will reach for this constantly.
description: "Compares units side by side."

// Strong — the model knows the boundary.
description:
  "Side-by-side comparison of exactly two or three units the user has already shown " +
  "interest in. Use when the user says 'compare', 'difference', or names two units in " +
  "one message. Do not use it to introduce units for the first time."
```

Second rule: put the invariants in the schema, not the description. `maxItems: 6` is enforced; "keep it to about six" is a suggestion the model will ignore under pressure.

---

## Components

### `text`

Prose. Two sentences maximum.

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `body` | string ≤400 | ● | Streamed character by character |

Anything the user must choose between belongs in a component, not here. If the model is listing options in `text`, the registry is missing a component.

---

### `choice_chips`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `prompt` | string ≤120 | | Rendered as a bubble above the chips |
| `options` | array 2–5 | ● | `{ label ≤40, value ≤80 }` |

`value` is submitted to the planner as though the user typed it, so write it as a sentence, not a token: `"Show me motorcycles under $12,000"`, not `"moto_search"`.

---

### `unit_carousel`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` | string ≤70 | | |
| `subtitle` | string ≤110 | | |
| `units` | array 1–6 | ● | see below |

Unit: `id`● · `name`● ≤60 · `price`● · `meta` ≤60 · `monthly` · `badge` ≤18 · `category` (`moto`\|`atv`\|`boat`\|`rv`\|`jetski`) · `hue` 0–360

`category` and `hue` drive the generated artwork, so a demo needs no image assets. Replace `unitArt()` in the renderer with an `<img>` when you have real photography — nothing else changes.

Tapping a unit sets `selectedUnitId` / `selectedUnitName` / `selectedUnitPrice` in conversation state and emits `"Tell me more about {name}"`.

---

### `unit_compare`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` | string ≤70 | | |
| `units` | array 2–3 | ● | `{ id, name ≤40 }` |
| `rows` | array 2–8 | ● | `{ label ≤32, values[2–3], bestIndex? }` |

`values` must be the same length as `units`. `bestIndex` tints one cell in the accent — use it for the row where "better" is unambiguous (lower payment), never for taste.

---

### `finance_slider`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `unitId` | string | ● | |
| `unitName` | string ≤60 | ● | |
| `price` | number | ● | |
| `apr` | number 0–40 | ● | **Required by law, not by preference** |
| `termMonths` | integer 6–240 | ● | **Same** |
| `downPayment` | number | | Snapped to the $250 step |
| `minDown` / `maxDown` | number | | Default 0 → 50% of price |
| `termOptions` | integer[] ≤6 | | Default `[24,36,48,60,72]` |
| `lenderNote` | string ≤160 | | Appended to the disclosure |

**Regulation Z.** A displayed monthly payment is an advertised trigger term. Under 12 CFR §1026.24(d), stating one obliges you to disclose the down payment, the terms of repayment and the APR; Regulation M imposes the equivalent for leases. So the renderer:

1. recomputes the full disclosure from the same numbers the slider is showing, on every `input` event;
2. cannot draw the card at all without `apr` and `termMonths`, because the schema rejects it;
3. tells the model in the registry description not to route around this by putting a payment in `text`.

Points 1 and 2 are enforcement. Point 3 is a request. That ordering is deliberate: prompt instructions get ignored under distribution shift, and a renderer that cannot draw the unsafe thing does not.

This is not legal advice, and how these rules apply to *interactive* calculators as opposed to static advertising is genuinely unsettled — get counsel before you ship it.

---

### `trade_in`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` | string ≤70 | | |
| `prefill` | object | | `{ year, make, model, hours }` |

Prefill from anything the user already said. Sets `tradeIn` / `tradeLow` / `tradeHigh` in state. The bundled valuation is arithmetic on a model year — swap it for a real book-value call.

---

### `schedule`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` | string ≤70 | | |
| `subtitle` | string ≤110 | | |
| `days` | array 1–10 | ● | `{ date, dow ≤4, dnum ≤2, slots[1–12] }` |

Slot: `{ time ≤10, taken? }`. Taken slots render struck through and disabled rather than hidden — visible scarcity converts, and an empty diary reads as an empty business.

Selecting a slot sets `apptDate` / `apptTime` and emits `"Book me for {date} at {time}"`.

---

### `lead_capture`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` / `subtitle` / `cta` | string | | |
| `consentNote` | string ≤200 | | Replaces the default TCPA-style notice |

Ask last. The default consent note covers written consent for texting and an opt-out; replace it with whatever your counsel signs off on, but do not remove it.

---

### `summary_receipt`

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` | string ≤60 | ● | |
| `subtitle` | string ≤140 | | |
| `rows` | array 1–8 | ● | `{ label ≤30, value ≤60 }` |

Once, at the end, after something actually happened.

---

## Conversation state

A flat object the planner reads and card interactions write, via `ctx.setState(patch)`:

```
turns                                      selectedUnitId / Name / Price
apptDate, apptTime                         financeDown, financeTerm
tradeIn, tradeLow, tradeHigh               leadName, leadPhone, leadEmail
```

It is serialised into the system prompt for `LivePlanner`, so keep it small and keep it flat. It is not a database — it is what the next turn needs to know.

## Adding a component

1. Add the schema and a description to `REGISTRY`.
2. Add `R.your_component = function (props, ctx) { … }` in `renderer.js`, returning a detached element.
3. Set `R.your_component.height = <px>` — the skeleton size. Measure the real card and round up; too tall is invisible, too short causes the jump you added skeletons to avoid.
4. Emit user-shaped strings from interactions: `ctx.emit("Book me for Tue at 3:00 PM")`, not `ctx.emit("BOOK|tue|1500")`.

`ctx` is `{ emit(text, meta?), setState(patch), state }`. That's all a component gets, on purpose.
