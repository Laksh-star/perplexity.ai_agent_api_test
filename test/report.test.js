import test from "node:test";
import assert from "node:assert/strict";
import { enrichReport } from "../src/report.js";

test("enrichReport maps source titles onto URLs", () => {
  const report = {
    query_window: {
      start_date: "2026-03-05",
      end_date: "2026-03-12",
      days: 7
    },
    overview: "Test overview",
    vendors: [
      {
        vendor: "OpenAI",
        status: "updates_found",
        updates: [
          {
            title: "Responses API update",
            date: "2026-03-10",
            category: "api_platform",
            summary: "Summary",
            impact: "Impact",
            confidence: "high",
            source_titles: ["OpenAI launches new Responses API tools"]
          }
        ]
      }
    ]
  };

  const response = {
    id: "resp_123",
    model: "openai/gpt-5.1",
    output: [
      {
        type: "search_results",
        results: [
          {
            title: "OpenAI launches new Responses API tools",
            url: "https://openai.com/index/example",
            date: "2026-03-10"
          }
        ]
      }
    ]
  };

  const enriched = enrichReport(report, response, {
    preset: "pro-search",
    maxSteps: 3
  });

  assert.equal(enriched.vendors[0].updates[0].sources.length, 1);
  assert.equal(enriched.vendors[0].updates[0].sources[0].url, "https://openai.com/index/example");
});

test("enrichReport ignores empty source titles from fetch_url results", () => {
  const report = {
    query_window: {
      start_date: "2026-03-05",
      end_date: "2026-03-12",
      days: 7
    },
    overview: "Test overview",
    vendors: [
      {
        vendor: "Anthropic",
        status: "updates_found",
        updates: [
          {
            title: "Institute launch",
            date: "2026-03-10",
            category: "research",
            summary: "Summary",
            impact: "Impact",
            confidence: "high",
            source_titles: ["Introducing The Anthropic Institute"]
          }
        ]
      }
    ]
  };

  const response = {
    id: "resp_456",
    model: "openai/gpt-5.1",
    output: [
      {
        type: "search_results",
        results: [
          {
            title: "Introducing The Anthropic Institute",
            url: "https://www.anthropic.com/news/the-anthropic-institute",
            date: "2026-03-10"
          }
        ]
      },
      {
        type: "fetch_url_results",
        contents: [
          {
            title: "",
            url: "https://www.anthropic.com/news/mozilla-firefox-security"
          }
        ]
      }
    ]
  };

  const enriched = enrichReport(report, response, {
    preset: "pro-search",
    maxSteps: 3
  });

  assert.equal(enriched.vendors[0].updates[0].sources.length, 1);
  assert.equal(
    enriched.vendors[0].updates[0].sources[0].url,
    "https://www.anthropic.com/news/the-anthropic-institute"
  );
});

test("enrichReport can match a generic search result title using the snippet text", () => {
  const report = {
    query_window: {
      start_date: "2026-03-06",
      end_date: "2026-03-12",
      days: 7
    },
    overview: "Test overview",
    vendors: [
      {
        vendor: "Anthropic",
        status: "updates_found",
        updates: [
          {
            title: "Sydney office update",
            date: "2026-03-10",
            category: "other",
            summary: "Summary",
            impact: "Impact",
            confidence: "medium",
            source_titles: ["Sydney will become Anthropic’s fourth office in Asia-Pacific"]
          }
        ]
      }
    ]
  };

  const response = {
    id: "resp_789",
    model: "openai/gpt-5.1",
    output: [
      {
        type: "search_results",
        results: [
          {
            title: "Newsroom",
            snippet:
              "Mar 10, 2026 Announcements Sydney will become Anthropic’s fourth office in Asia-Pacific Mar 6, 2026 Policy Partnering with Mozilla",
            url: "https://www.anthropic.com/news",
            date: "2026-03-05"
          }
        ]
      }
    ]
  };

  const enriched = enrichReport(report, response, {
    preset: "deep-research",
    maxSteps: 3
  });

  assert.equal(enriched.vendors[0].updates[0].sources.length, 1);
  assert.equal(enriched.vendors[0].updates[0].sources[0].url, "https://www.anthropic.com/news");
});
