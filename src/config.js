import fs from "node:fs";
import path from "node:path";

const DEFAULT_VENDORS = [
  "OpenAI",
  "Anthropic",
  "Google AI",
  "Perplexity",
  "Vercel",
  "LangChain"
];

const OFFICIAL_DOMAINS = [
  "openai.com",
  "anthropic.com",
  "blog.google",
  "deepmind.google",
  "ai.google.dev",
  "perplexity.ai",
  "vercel.com",
  "langchain.com"
];

function parseBooleanFlag(value) {
  if (value === undefined) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function parseNumber(value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer for ${flagName}, received: ${value}`);
  }
  return parsed;
}

function parseCsv(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function setEnvIfMissing(key, value) {
  if (!(key in process.env)) {
    process.env[key] = value;
  }
}

export function loadEnvFile(cwd, envPath = ".env") {
  const resolvedPath = path.resolve(cwd, envPath);
  if (!fs.existsSync(resolvedPath)) {
    return;
  }

  const contents = fs.readFileSync(resolvedPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    setEnvIfMissing(key, value);
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    days: 7,
    preset: "pro-search",
    maxSteps: 3,
    maxItemsPerVendor: 2,
    vendors: DEFAULT_VENDORS,
    domains: OFFICIAL_DOMAINS,
    outDir: "reports",
    dryRun: false,
    verbose: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    switch (current) {
      case "--days":
        options.days = parseNumber(argv[++index], "--days");
        break;
      case "--preset":
        options.preset = argv[++index];
        break;
      case "--max-steps":
        options.maxSteps = parseNumber(argv[++index], "--max-steps");
        break;
      case "--max-items-per-vendor":
        options.maxItemsPerVendor = parseNumber(argv[++index], "--max-items-per-vendor");
        break;
      case "--vendors":
        options.vendors = parseCsv(argv[++index]);
        break;
      case "--domains":
        options.domains = parseCsv(argv[++index]);
        break;
      case "--out-dir":
        options.outDir = argv[++index];
        break;
      case "--dry-run":
        options.dryRun = parseBooleanFlag(argv[index + 1]?.startsWith("--") ? undefined : argv[++index]);
        break;
      case "--verbose":
        options.verbose = parseBooleanFlag(argv[index + 1]?.startsWith("--") ? undefined : argv[++index]);
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${current}`);
    }
  }

  if (options.vendors.length === 0) {
    throw new Error("At least one vendor is required.");
  }

  if (options.domains.length === 0) {
    throw new Error("At least one domain is required.");
  }

  if (options.maxSteps > 10) {
    throw new Error("--max-steps cannot exceed 10.");
  }

  return options;
}

export function printHelp() {
  console.log(`Usage: npm start -- [options]

Options:
  --days <n>                    Look back window in days. Default: 7
  --preset <name>               Perplexity preset. Default: pro-search
  --max-steps <n>               Override preset max steps. Default: 3
  --max-items-per-vendor <n>    Cap updates per vendor. Default: 2
  --vendors <csv>               Vendor names. Default: ${DEFAULT_VENDORS.join(", ")}
  --domains <csv>               Domain allowlist for web search
  --out-dir <path>              Directory for report artifacts. Default: reports
  --dry-run [bool]              Print request body without calling the API
  --verbose [bool]              Print raw API metadata
  --help                        Show this help
`);
}

export const defaults = {
  DEFAULT_VENDORS,
  OFFICIAL_DOMAINS
};
