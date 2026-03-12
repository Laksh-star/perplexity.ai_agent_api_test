import { buildAgentTools, callAgentApi, extractJson, extractOutputText, requireApiKey, shouldRetryWithFlatFilters } from "./agent-api.js";
import { competitiveReportSchema, validateCompetitiveReportShape } from "./competitive-schema.js";
import { buildCompetitiveInputPrompt, buildCompetitiveInstructions, buildCompetitiveWindow } from "./competitive-prompt.js";

export function buildCompetitiveRequestBody(options, filterStyle = "nested") {
  const window = buildCompetitiveWindow(options.days);

  return {
    preset: options.preset,
    max_steps: options.maxSteps,
    input: buildCompetitiveInputPrompt({
      productName: options.productName,
      competitors: options.competitors,
      days: options.days,
      maxItemsPerCompetitor: options.maxItemsPerCompetitor,
      targetChannels: options.targetChannels,
      window
    }),
    instructions: buildCompetitiveInstructions(),
    tools: buildAgentTools(options.domains, filterStyle),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "competitive_monitor_report",
        schema: competitiveReportSchema
      }
    }
  };
}

export async function runCompetitiveMonitor(options) {
  const apiKey = requireApiKey();
  let requestBody = buildCompetitiveRequestBody(options, "nested");
  let response;

  try {
    response = await callAgentApi(apiKey, requestBody);
  } catch (error) {
    if (!shouldRetryWithFlatFilters(error)) {
      throw error;
    }

    requestBody = buildCompetitiveRequestBody(options, "flat");
    response = await callAgentApi(apiKey, requestBody);
  }

  if (response.status !== "completed") {
    throw new Error(`Unexpected Agent API status: ${response.status}`);
  }

  const outputText = response.output_text ?? extractOutputText(response.output);
  const parsed = validateCompetitiveReportShape(extractJson(outputText));

  return {
    requestBody,
    response,
    report: parsed
  };
}
