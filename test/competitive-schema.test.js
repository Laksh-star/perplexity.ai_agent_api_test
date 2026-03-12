import test from "node:test";
import assert from "node:assert/strict";
import { validateCompetitiveReportShape } from "../src/competitive-schema.js";

test("validateCompetitiveReportShape accepts a minimal valid report", () => {
  const report = {
    query_window: {
      start_date: "2026-03-06",
      end_date: "2026-03-12",
      days: 7
    },
    overview: "Overview",
    competitors: [
      {
        competitor: "OpenAI",
        status: "signals_found",
        threat_level: "high",
        summary: "Summary",
        signals: [
          {
            title: "Signal",
            date: "2026-03-11",
            why_it_matters: "Matters",
            confidence: "high",
            source_titles: ["OpenAI launch"]
          }
        ],
        pricing_changes: [],
        positioning_moves: [],
        user_pain_points: [],
        recommended_counter_moves: [
          {
            title: "Move",
            summary: "Ship this next",
            expected_impact: "high",
            effort: "low"
          }
        ]
      }
    ]
  };

  assert.deepEqual(validateCompetitiveReportShape(report), report);
});
