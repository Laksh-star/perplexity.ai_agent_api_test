import { loadEnvFile, parseArgs, printHelp } from "./config.js";
import { buildRequestBody } from "./perplexity.js";
import { executeMonitor } from "./app.js";

async function main() {
  const cwd = process.cwd();
  loadEnvFile(cwd);

  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  if (options.dryRun) {
    const requestBody = buildRequestBody(options);
    console.log(JSON.stringify(requestBody, null, 2));
    return;
  }

  const execution = await executeMonitor(options, { cwd });

  console.log(`Saved JSON report to ${execution.artifacts.jsonPath}`);
  console.log(`Saved Markdown report to ${execution.artifacts.markdownPath}`);
  console.log(`Saved raw API response to ${execution.artifacts.rawPath}`);

  if (options.verbose) {
    console.log("");
    console.log(JSON.stringify(execution.response.usage ?? {}, null, 2));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
