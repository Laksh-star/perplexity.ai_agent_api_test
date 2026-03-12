import fs from "node:fs";
import path from "node:path";
import { buildArtifactBaseName, enrichReport, renderMarkdown } from "./report.js";
import { runReleaseMonitor } from "./perplexity.js";

export async function executeMonitor(options, runtime = {}) {
  const cwd = runtime.cwd ?? process.cwd();
  const shouldWriteArtifacts = runtime.writeArtifacts ?? true;
  const result = await runReleaseMonitor(options);
  const enrichedReport = enrichReport(result.report, result.response, options);

  const execution = {
    requestBody: result.requestBody,
    response: result.response,
    report: enrichedReport,
    artifacts: null
  };

  if (!shouldWriteArtifacts) {
    return execution;
  }

  const artifactBaseName = buildArtifactBaseName(enrichedReport);
  const outputDirectory = path.resolve(cwd, options.outDir);

  fs.mkdirSync(outputDirectory, { recursive: true });

  const jsonPath = path.join(outputDirectory, `${artifactBaseName}.json`);
  const markdownPath = path.join(outputDirectory, `${artifactBaseName}.md`);
  const rawPath = path.join(outputDirectory, `${artifactBaseName}.raw.json`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(enrichedReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${renderMarkdown(enrichedReport)}\n`);
  fs.writeFileSync(rawPath, `${JSON.stringify(result.response, null, 2)}\n`);

  execution.artifacts = {
    jsonPath,
    markdownPath,
    rawPath
  };

  return execution;
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
    dryRun: false,
    verbose: false
  };

  if (options.maxSteps > 10) {
    throw new Error("maxSteps cannot exceed 10.");
  }

  return options;
}
