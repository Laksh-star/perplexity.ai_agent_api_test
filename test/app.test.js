import test from "node:test";
import assert from "node:assert/strict";
import { coerceRunOptions } from "../src/app.js";

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
