export const competitiveReportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["query_window", "overview", "competitors"],
  properties: {
    query_window: {
      type: "object",
      additionalProperties: false,
      required: ["start_date", "end_date", "days"],
      properties: {
        start_date: { type: "string" },
        end_date: { type: "string" },
        days: { type: "integer" }
      }
    },
    overview: { type: "string" },
    competitors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "competitor",
          "status",
          "threat_level",
          "summary",
          "signals",
          "pricing_changes",
          "positioning_moves",
          "user_pain_points",
          "recommended_counter_moves"
        ],
        properties: {
          competitor: { type: "string" },
          status: {
            type: "string",
            enum: ["signals_found", "no_signal_found"]
          },
          threat_level: {
            type: "string",
            enum: ["low", "medium", "high", "existential"]
          },
          summary: { type: "string" },
          signals: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "date", "why_it_matters", "confidence", "source_titles"],
              properties: {
                title: { type: "string" },
                date: { type: "string" },
                why_it_matters: { type: "string" },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"]
                },
                source_titles: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          pricing_changes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "summary", "date", "source_titles"],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                date: { type: "string" },
                source_titles: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          positioning_moves: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "summary", "date", "source_titles"],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                date: { type: "string" },
                source_titles: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          user_pain_points: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "summary", "date", "source_titles"],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                date: { type: "string" },
                source_titles: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          recommended_counter_moves: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "summary", "expected_impact", "effort"],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                expected_impact: {
                  type: "string",
                  enum: ["low", "medium", "high"]
                },
                effort: {
                  type: "string",
                  enum: ["low", "medium", "high"]
                }
              }
            }
          }
        }
      }
    }
  }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateSourceTitles(values, label) {
  assert(Array.isArray(values), `${label} source_titles must be an array.`);
  for (const title of values) {
    assert(typeof title === "string", `${label} source_titles entries must be strings.`);
  }
}

function validateInsightList(items, label, requireConfidence = false) {
  assert(Array.isArray(items), `${label} must be an array.`);
  for (const item of items) {
    assert(typeof item.title === "string", `${label}.title must be a string.`);
    if ("summary" in item) {
      assert(typeof item.summary === "string", `${label}.summary must be a string.`);
    }
    if ("why_it_matters" in item) {
      assert(typeof item.why_it_matters === "string", `${label}.why_it_matters must be a string.`);
    }
    assert(typeof item.date === "string", `${label}.date must be a string.`);
    if (requireConfidence) {
      assert(
        item.confidence === "high" || item.confidence === "medium" || item.confidence === "low",
        `${label}.confidence must be high, medium, or low.`
      );
    }
    validateSourceTitles(item.source_titles, label);
  }
}

export function validateCompetitiveReportShape(report) {
  assert(report && typeof report === "object", "Report must be an object.");
  assert(report.query_window && typeof report.query_window === "object", "query_window is required.");
  assert(typeof report.query_window.start_date === "string", "query_window.start_date must be a string.");
  assert(typeof report.query_window.end_date === "string", "query_window.end_date must be a string.");
  assert(Number.isInteger(report.query_window.days), "query_window.days must be an integer.");
  assert(typeof report.overview === "string", "overview must be a string.");
  assert(Array.isArray(report.competitors), "competitors must be an array.");

  for (const competitor of report.competitors) {
    assert(typeof competitor.competitor === "string", "competitor.competitor must be a string.");
    assert(
      competitor.status === "signals_found" || competitor.status === "no_signal_found",
      `Invalid status for ${competitor.competitor}.`
    );
    assert(
      ["low", "medium", "high", "existential"].includes(competitor.threat_level),
      `Invalid threat level for ${competitor.competitor}.`
    );
    assert(typeof competitor.summary === "string", `summary must be a string for ${competitor.competitor}.`);
    validateInsightList(competitor.signals, `${competitor.competitor}.signals`, true);
    validateInsightList(competitor.pricing_changes, `${competitor.competitor}.pricing_changes`);
    validateInsightList(competitor.positioning_moves, `${competitor.competitor}.positioning_moves`);
    validateInsightList(competitor.user_pain_points, `${competitor.competitor}.user_pain_points`);
    assert(
      Array.isArray(competitor.recommended_counter_moves),
      `${competitor.competitor}.recommended_counter_moves must be an array.`
    );
    for (const move of competitor.recommended_counter_moves) {
      assert(typeof move.title === "string", "counter move title must be a string.");
      assert(typeof move.summary === "string", "counter move summary must be a string.");
      assert(["low", "medium", "high"].includes(move.expected_impact), "invalid expected_impact.");
      assert(["low", "medium", "high"].includes(move.effort), "invalid effort.");
    }
  }

  return report;
}
