import test from "node:test";
import assert from "node:assert/strict";
import { coerceCompetitiveOptions, coerceRunOptions } from "../src/app.js";

test("coerceRunOptions splits textarea input", () => {
  const options = coerceRunOptions(
    {
      days: "14",
      preset: "deep-research",
      maxSteps: "4",
      maxItemsPerVendor: "3",
      vendors: "OpenAI\nAnthropic",
      domains: "openai.com,anthropic.com"
    },
    {
      days: 7,
      preset: "pro-search",
      maxSteps: 3,
      maxItemsPerVendor: 2,
      vendors: ["A"],
      domains: ["example.com"],
      outDir: "reports"
    }
  );

  assert.equal(options.days, 14);
  assert.equal(options.preset, "deep-research");
  assert.equal(options.maxSteps, 4);
  assert.equal(options.maxItemsPerVendor, 3);
  assert.deepEqual(options.vendors, ["OpenAI", "Anthropic"]);
  assert.deepEqual(options.domains, ["openai.com", "anthropic.com"]);
});

test("coerceRunOptions allows unrestricted search when domain restriction is disabled", () => {
  const options = coerceRunOptions(
    {
      vendors: "OpenAI",
      domains: "",
      restrictDomains: false
    },
    {
      days: 7,
      preset: "pro-search",
      maxSteps: 3,
      maxItemsPerVendor: 2,
      vendors: ["OpenAI"],
      domains: ["openai.com"],
      outDir: "reports"
    }
  );

  assert.deepEqual(options.domains, []);
});

test("coerceCompetitiveOptions applies product and competitor defaults", () => {
  const options = coerceCompetitiveOptions(
    {
      productName: "Agent app",
      competitors: "OpenAI\nPerplexity",
      targetChannels: "blogs,pricing pages",
      maxItemsPerCompetitor: "4"
    },
    {
      productName: "Fallback",
      competitors: ["FallbackCo"],
      targetChannels: ["blogs"],
      days: 7,
      preset: "deep-research",
      maxSteps: 3,
      maxItemsPerCompetitor: 3,
      domains: ["openai.com"],
      outDir: "reports"
    }
  );

  assert.equal(options.productName, "Agent app");
  assert.deepEqual(options.competitors, ["OpenAI", "Perplexity"]);
  assert.deepEqual(options.targetChannels, ["blogs", "pricing pages"]);
  assert.equal(options.maxItemsPerCompetitor, 4);
});

test("coerceCompetitiveOptions allows unrestricted search when domain restriction is disabled", () => {
  const options = coerceCompetitiveOptions(
    {
      productName: "Agent app",
      competitors: "Perplexity",
      domains: "",
      restrictDomains: false
    },
    {
      productName: "Fallback",
      competitors: ["FallbackCo"],
      targetChannels: ["blogs"],
      days: 7,
      preset: "deep-research",
      maxSteps: 3,
      maxItemsPerCompetitor: 3,
      domains: ["perplexity.ai"],
      outDir: "reports"
    }
  );

  assert.deepEqual(options.domains, []);
});
