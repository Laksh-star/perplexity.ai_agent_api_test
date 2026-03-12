export const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["query_window", "overview", "vendors"],
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
    overview: {
      type: "string"
    },
    vendors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["vendor", "status", "updates"],
        properties: {
          vendor: { type: "string" },
          status: {
            type: "string",
            enum: ["updates_found", "no_updates_found"]
          },
          updates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "title",
                "date",
                "category",
                "summary",
                "impact",
                "confidence",
                "source_titles"
              ],
              properties: {
                title: { type: "string" },
                date: { type: "string" },
                category: {
                  type: "string",
                  enum: [
                    "model_release",
                    "product_launch",
                    "api_platform",
                    "pricing",
                    "policy",
                    "research",
                    "partnership",
                    "other"
                  ]
                },
                summary: { type: "string" },
                impact: { type: "string" },
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

export function validateReportShape(report) {
  assert(report && typeof report === "object", "Report must be an object.");
  assert(report.query_window && typeof report.query_window === "object", "query_window is required.");
  assert(typeof report.query_window.start_date === "string", "query_window.start_date must be a string.");
  assert(typeof report.query_window.end_date === "string", "query_window.end_date must be a string.");
  assert(Number.isInteger(report.query_window.days), "query_window.days must be an integer.");
  assert(typeof report.overview === "string", "overview must be a string.");
  assert(Array.isArray(report.vendors), "vendors must be an array.");

  for (const vendor of report.vendors) {
    assert(typeof vendor.vendor === "string", "vendor.vendor must be a string.");
    assert(
      vendor.status === "updates_found" || vendor.status === "no_updates_found",
      `Invalid vendor status for ${vendor.vendor}.`
    );
    assert(Array.isArray(vendor.updates), `updates must be an array for ${vendor.vendor}.`);

    for (const update of vendor.updates) {
      assert(typeof update.title === "string", "update.title must be a string.");
      assert(typeof update.date === "string", "update.date must be a string.");
      assert(typeof update.category === "string", "update.category must be a string.");
      assert(typeof update.summary === "string", "update.summary must be a string.");
      assert(typeof update.impact === "string", "update.impact must be a string.");
      assert(
        update.confidence === "high" || update.confidence === "medium" || update.confidence === "low",
        `Invalid confidence value for ${update.title}.`
      );
      assert(Array.isArray(update.source_titles), `source_titles must be an array for ${update.title}.`);
      for (const title of update.source_titles) {
        assert(typeof title === "string", `source_titles entries must be strings for ${update.title}.`);
      }
    }
  }

  return report;
}
