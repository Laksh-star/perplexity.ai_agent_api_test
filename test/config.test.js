import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/config.js";

test("parseArgs applies defaults", () => {
  const options = parseArgs([]);
  assert.equal(options.days, 7);
  assert.equal(options.preset, "pro-search");
  assert.equal(options.maxSteps, 3);
  assert.equal(options.dryRun, false);
  assert.equal(options.vendors.length, 6);
});

test("parseArgs reads csv options", () => {
  const options = parseArgs([
    "--days",
    "14",
    "--vendors",
    "OpenAI,Anthropic",
    "--domains",
    "openai.com,anthropic.com",
    "--dry-run"
  ]);

  assert.equal(options.days, 14);
  assert.deepEqual(options.vendors, ["OpenAI", "Anthropic"]);
  assert.deepEqual(options.domains, ["openai.com", "anthropic.com"]);
  assert.equal(options.dryRun, true);
});

test("parseArgs enables delivery flag", () => {
  const options = parseArgs(["--deliver"]);
  assert.equal(options.deliver, true);
});
