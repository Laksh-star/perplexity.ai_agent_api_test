import fs from "node:fs";
import path from "node:path";
import { buildArtifactBaseName, enrichReport, renderMarkdown } from "./report.js";
import { runReleaseMonitor } from "./perplexity.js";
import {
  buildCompetitiveArtifactBaseName,
  enrichCompetitiveReport,
  renderCompetitiveMarkdown
} from "./competitive-report.js";
import { runCompetitiveMonitor } from "./competitive.js";
import { getConfiguredDestinations, sendConfiguredDelivery } from "./delivery.js";

async function executeWorkflow({
  options,
  runtime = {},
  runner,
  enricher,
  renderer,
  artifactBaseNameBuilder
}) {
  const cwd = runtime.cwd ?? process.cwd();
  const shouldWriteArtifacts = runtime.writeArtifacts ?? true;
  const result = await runner(options);
  const enrichedReport = enricher(result.report, result.response, options);

  const execution = {
    requestBody: result.requestBody,
    response: result.response,
    report: enrichedReport,
    artifacts: null,
    delivery: null
  };

  if (!shouldWriteArtifacts) {
    return execution;
  }

  const artifactBaseName = artifactBaseNameBuilder(enrichedReport);
  const outputDirectory = path.resolve(cwd, options.outDir);

  fs.mkdirSync(outputDirectory, { recursive: true });

  const jsonPath = path.join(outputDirectory, `${artifactBaseName}.json`);
  const markdownPath = path.join(outputDirectory, `${artifactBaseName}.md`);
  const rawPath = path.join(outputDirectory, `${artifactBaseName}.raw.json`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(enrichedReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${renderer(enrichedReport)}\n`);
  fs.writeFileSync(rawPath, `${JSON.stringify(result.response, null, 2)}\n`);

  execution.artifacts = {
    jsonPath,
    markdownPath,
    rawPath
  };

  const shouldDeliver = runtime.deliver === true;
  if (shouldDeliver) {
    execution.delivery = await sendConfiguredDelivery({
      title: `${enrichedReport.preset} · ${artifactBaseName}`,
      markdown: renderer(enrichedReport)
    });
  } else {
    execution.delivery = {
      deliveries: [],
      errors: []
    };
  }

  return execution;
}

export async function executeMonitor(options, runtime = {}) {
  return executeWorkflow({
    options,
    runtime,
    runner: runReleaseMonitor,
    enricher: enrichReport,
    renderer: renderMarkdown,
    artifactBaseNameBuilder: buildArtifactBaseName
  });
}

export async function executeCompetitiveWorkflow(options, runtime = {}) {
  return executeWorkflow({
    options,
    runtime,
    runner: runCompetitiveMonitor,
    enricher: enrichCompetitiveReport,
    renderer: renderCompetitiveMarkdown,
    artifactBaseNameBuilder: buildCompetitiveArtifactBaseName
  });
}

function parsePositiveInt(value, label, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,]/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

export function coerceRunOptions(input, defaults) {
  const vendors = splitList(input.vendors);
  const domains = splitList(input.domains);
  const restrictDomains = parseBoolean(input.restrictDomains, true);

  const options = {
    days: parsePositiveInt(input.days, "days", defaults.days),
    preset: typeof input.preset === "string" && input.preset.trim() ? input.preset.trim() : defaults.preset,
    maxSteps: parsePositiveInt(input.maxSteps, "maxSteps", defaults.maxSteps),
    maxItemsPerVendor: parsePositiveInt(
      input.maxItemsPerVendor,
      "maxItemsPerVendor",
      defaults.maxItemsPerVendor
    ),
    vendors: vendors.length > 0 ? vendors : defaults.vendors,
    domains: restrictDomains ? (domains.length > 0 ? domains : defaults.domains) : [],
    outDir: typeof input.outDir === "string" && input.outDir.trim() ? input.outDir.trim() : defaults.outDir,
    deliver: parseBoolean(input.deliver, false),
    dryRun: false,
    verbose: false
  };

  if (options.maxSteps > 10) {
    throw new Error("maxSteps cannot exceed 10.");
  }

  return options;
}

export function coerceCompetitiveOptions(input, defaults) {
  const competitors = splitList(input.competitors);
  const domains = splitList(input.domains);
  const targetChannels = splitList(input.targetChannels);
  const restrictDomains = parseBoolean(input.restrictDomains, true);

  const options = {
    productName:
      typeof input.productName === "string" && input.productName.trim()
        ? input.productName.trim()
        : defaults.productName,
    competitors: competitors.length > 0 ? competitors : defaults.competitors,
    targetChannels: targetChannels.length > 0 ? targetChannels : defaults.targetChannels,
    days: parsePositiveInt(input.days, "days", defaults.days),
    preset: typeof input.preset === "string" && input.preset.trim() ? input.preset.trim() : defaults.preset,
    maxSteps: parsePositiveInt(input.maxSteps, "maxSteps", defaults.maxSteps),
    maxItemsPerCompetitor: parsePositiveInt(
      input.maxItemsPerCompetitor,
      "maxItemsPerCompetitor",
      defaults.maxItemsPerCompetitor
    ),
    domains: restrictDomains ? (domains.length > 0 ? domains : defaults.domains) : [],
    outDir: typeof input.outDir === "string" && input.outDir.trim() ? input.outDir.trim() : defaults.outDir,
    deliver: parseBoolean(input.deliver, false),
    dryRun: false,
    verbose: false
  };

  if (!options.productName) {
    throw new Error("productName is required.");
  }

  if (options.competitors.length === 0) {
    throw new Error("At least one competitor is required.");
  }

  if (options.maxSteps > 10) {
    throw new Error("maxSteps cannot exceed 10.");
  }

  return options;
}

export { getConfiguredDestinations };
