import test from "node:test";
import assert from "node:assert/strict";
import { buildRequestBody } from "../src/perplexity.js";

test("buildRequestBody omits search_domain_filter when domains are unrestricted", () => {
  const body = buildRequestBody({
    days: 7,
    preset: "deep-research",
    maxSteps: 5,
    maxItemsPerVendor: 2,
    vendors: ["OpenAI"],
    domains: []
  });

  assert.equal(body.tools[0].type, "web_search");
  assert.equal("search_domain_filter" in body.tools[0].filters, false);
});
