/* ==========================================================================
   Vitrine — component registry
   --------------------------------------------------------------------------
   This file is the entire contract between the model and the interface.

   The model never writes markup, never writes JSX, never writes CSS. It
   picks a component by name and fills a JSON payload that must validate
   against the schema below. Anything that fails validation is dropped and
   the turn falls back to text.

   Two consequences worth stating out loud:

   1. The blast radius of a hallucination is one dropped card, not a broken
      page or an injection. The client renders from a catalog it already
      trusts. This is the same principle behind Google's A2UI and MCP Apps:
      safe like data, expressive like code.

   2. The registry is the product. Swapping this file — and only this file —
      retargets the whole system at a different vertical. The renderer,
      theming, streaming and motion layers do not know what a motorcycle is.
   ========================================================================== */

(function (global) {
  "use strict";

  const money = { type: "number", minimum: 0 };

  const REGISTRY = {
    /* ---------------------------------------------------------------- */
    text: {
      description:
        "Prose. Use for greetings, explanations, and anything that is genuinely a sentence. " +
        "Never use text to describe options the user must choose between — that is what the " +
        "other components are for. Keep it to two sentences.",
      schema: {
        type: "object",
        required: ["body"],
        additionalProperties: false,
        properties: {
          body: { type: "string", maxLength: 400 }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    choice_chips: {
      description:
        "Two to five mutually exclusive quick replies. Use to narrow a broad request into a " +
        "concrete one. Prefer this over asking an open question in prose.",
      schema: {
        type: "object",
        required: ["options"],
        additionalProperties: false,
        properties: {
          prompt: { type: "string", maxLength: 120 },
          options: {
            type: "array", minItems: 2, maxItems: 5,
            items: {
              type: "object",
              required: ["label", "value"],
              additionalProperties: false,
              properties: {
                label: { type: "string", maxLength: 40 },
                value: { type: "string", maxLength: 80 }
              }
            }
          }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    unit_carousel: {
      description:
        "A horizontally scrollable rail of inventory units. Use whenever the answer is " +
        "'here are some units'. Two to six units. Ordered best-match first; never pad the " +
        "rail to fill it.",
      schema: {
        type: "object",
        required: ["units"],
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 70 },
          subtitle: { type: "string", maxLength: 110 },
          units: {
            type: "array", minItems: 1, maxItems: 6,
            items: {
              type: "object",
              required: ["id", "name", "price"],
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                name: { type: "string", maxLength: 60 },
                meta: { type: "string", maxLength: 60 },
                price: money,
                monthly: money,
                badge: { type: "string", maxLength: 18 },
                category: { type: "string", enum: ["moto", "atv", "boat", "rv", "jetski"] },
                hue: { type: "number", minimum: 0, maximum: 360 }
              }
            }
          }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    unit_compare: {
      description:
        "Side-by-side comparison of exactly two or three units the user has already shown " +
        "interest in. Use when the user says 'compare', 'difference', or names two units in " +
        "one message. Do not use it to introduce units for the first time.",
      schema: {
        type: "object",
        required: ["units", "rows"],
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 70 },
          units: {
            type: "array", minItems: 2, maxItems: 3,
            items: {
              type: "object",
              required: ["id", "name"],
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                name: { type: "string", maxLength: 40 }
              }
            }
          },
          rows: {
            type: "array", minItems: 2, maxItems: 8,
            items: {
              type: "object",
              required: ["label", "values"],
              additionalProperties: false,
              properties: {
                label: { type: "string", maxLength: 32 },
                values: { type: "array", minItems: 2, maxItems: 3, items: { type: "string", maxLength: 28 } },
                bestIndex: { type: "integer", minimum: 0, maximum: 2 }
              }
            }
          }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    finance_slider: {
      description:
        "An interactive monthly-payment estimator for one unit. Use when the user asks about " +
        "payments, financing, affordability, or 'what would this cost me a month'. " +
        "IMPORTANT: this component displays a monthly payment, which under Regulation Z is an " +
        "advertised trigger term. The renderer attaches the full disclosure automatically and " +
        "will refuse to draw the card if apr or termMonths is missing. Do not attempt to " +
        "present a payment figure through the text component to avoid this.",
      schema: {
        type: "object",
        required: ["unitId", "unitName", "price", "apr", "termMonths"],
        additionalProperties: false,
        properties: {
          unitId: { type: "string" },
          unitName: { type: "string", maxLength: 60 },
          price: money,
          apr: { type: "number", minimum: 0, maximum: 40 },
          termMonths: { type: "integer", minimum: 6, maximum: 240 },
          downPayment: money,
          minDown: money,
          maxDown: money,
          termOptions: { type: "array", items: { type: "integer" }, maxItems: 6 },
          lenderNote: { type: "string", maxLength: 160 }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    trade_in: {
      description:
        "Trade-in valuation form. Use when the user mentions trading, selling, or 'what's my " +
        "current one worth'. Returns an indicative range, never a firm offer.",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 70 },
          prefill: {
            type: "object",
            additionalProperties: false,
            properties: {
              year: { type: "string", maxLength: 4 },
              make: { type: "string", maxLength: 30 },
              model: { type: "string", maxLength: 40 },
              hours: { type: "string", maxLength: 10 }
            }
          }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    schedule: {
      description:
        "Date and time picker for a demo ride, sea trial, walkthrough or service visit. " +
        "Use as soon as intent to visit is expressed. Never ask for a preferred time in prose.",
      schema: {
        type: "object",
        required: ["days"],
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 70 },
          subtitle: { type: "string", maxLength: 110 },
          days: {
            type: "array", minItems: 1, maxItems: 10,
            items: {
              type: "object",
              required: ["date", "dow", "dnum", "slots"],
              additionalProperties: false,
              properties: {
                date: { type: "string" },
                dow: { type: "string", maxLength: 4 },
                dnum: { type: "string", maxLength: 2 },
                slots: {
                  type: "array", minItems: 1, maxItems: 12,
                  items: {
                    type: "object",
                    required: ["time"],
                    additionalProperties: false,
                    properties: {
                      time: { type: "string", maxLength: 10 },
                      taken: { type: "boolean" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    lead_capture: {
      description:
        "Name, phone and email. Ask for this LAST, once the user has committed to something " +
        "concrete — a time slot, a specific unit. Asking up front is the single most reliable " +
        "way to lose the conversation.",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 70 },
          subtitle: { type: "string", maxLength: 130 },
          cta: { type: "string", maxLength: 30 },
          consentNote: { type: "string", maxLength: 200 }
        }
      }
    },

    /* ---------------------------------------------------------------- */
    summary_receipt: {
      description:
        "Confirmation of a completed action. Use once, at the end, after a booking or a " +
        "submitted lead. Never speculatively.",
      schema: {
        type: "object",
        required: ["title", "rows"],
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 60 },
          subtitle: { type: "string", maxLength: 140 },
          rows: {
            type: "array", minItems: 1, maxItems: 8,
            items: {
              type: "object",
              required: ["label", "value"],
              additionalProperties: false,
              properties: {
                label: { type: "string", maxLength: 30 },
                value: { type: "string", maxLength: 60 }
              }
            }
          }
        }
      }
    }
  };

  /* ======================================================================
     A deliberately small JSON Schema subset validator.

     Vitrine has no build step and no dependencies — that is a feature for a
     drop-in widget, where every kilobyte is somebody else's page weight.
     This covers exactly the keywords the registry uses. If you extend the
     registry with keywords beyond this subset, swap in Ajv; the interface
     below (`validate` -> {valid, errors}) is the same shape Ajv returns.
     ====================================================================== */

  function validate(schema, value, path) {
    path = path || "$";
    const errors = [];

    const fail = (msg) => errors.push(path + " " + msg);

    if (schema.type === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail("must be an object");
        return { valid: false, errors };
      }
      (schema.required || []).forEach((k) => {
        if (value[k] === undefined) fail("is missing required property '" + k + "'");
      });
      if (schema.additionalProperties === false) {
        Object.keys(value).forEach((k) => {
          if (!schema.properties || !schema.properties[k]) fail("has unknown property '" + k + "'");
        });
      }
      Object.keys(schema.properties || {}).forEach((k) => {
        if (value[k] === undefined) return;
        const sub = validate(schema.properties[k], value[k], path + "." + k);
        errors.push.apply(errors, sub.errors);
      });
    } else if (schema.type === "array") {
      if (!Array.isArray(value)) { fail("must be an array"); return { valid: false, errors }; }
      if (schema.minItems !== undefined && value.length < schema.minItems) fail("needs at least " + schema.minItems + " items");
      if (schema.maxItems !== undefined && value.length > schema.maxItems) fail("allows at most " + schema.maxItems + " items");
      if (schema.items) {
        value.forEach((v, i) => {
          const sub = validate(schema.items, v, path + "[" + i + "]");
          errors.push.apply(errors, sub.errors);
        });
      }
    } else if (schema.type === "string") {
      if (typeof value !== "string") { fail("must be a string"); return { valid: false, errors }; }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) fail("exceeds maxLength " + schema.maxLength);
      if (schema.enum && schema.enum.indexOf(value) === -1) fail("must be one of " + schema.enum.join(", "));
    } else if (schema.type === "number" || schema.type === "integer") {
      if (typeof value !== "number" || !isFinite(value)) { fail("must be a number"); return { valid: false, errors }; }
      if (schema.type === "integer" && !Number.isInteger(value)) fail("must be an integer");
      if (schema.minimum !== undefined && value < schema.minimum) fail("must be >= " + schema.minimum);
      if (schema.maximum !== undefined && value > schema.maximum) fail("must be <= " + schema.maximum);
    } else if (schema.type === "boolean") {
      if (typeof value !== "boolean") fail("must be a boolean");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate one component instance emitted by the planner.
   * @returns {{valid:boolean, errors:string[]}}
   */
  function validateBlock(block) {
    if (!block || typeof block !== "object") {
      return { valid: false, errors: ["block must be an object"] };
    }
    const def = REGISTRY[block.component];
    if (!def) {
      return { valid: false, errors: ["unknown component '" + block.component + "'"] };
    }
    return validate(def.schema, block.props || {}, block.component);
  }

  /**
   * Render the registry as OpenAI/Anthropic-style tool definitions, so a live
   * model can be constrained by the same schemas the renderer trusts. One
   * source of truth, no drift between what the model may emit and what the
   * client will draw.
   */
  function toolSpecs() {
    return Object.keys(REGISTRY).map((name) => ({
      name: "render_" + name,
      description: REGISTRY[name].description,
      input_schema: REGISTRY[name].schema
    }));
  }

  global.VitrineRegistry = { REGISTRY, validate, validateBlock, toolSpecs };
})(typeof window !== "undefined" ? window : globalThis);
