import { loadEnvFile, parseCompetitiveArgs, printCompetitiveHelp } from "./config.js";
import { buildCompetitiveRequestBody } from "./competitive.js";
import { executeCompetitiveWorkflow } from "./app.js";

async function main() {
  const cwd = process.cwd();
  loadEnvFile(cwd);

  const options = parseCompetitiveArgs();
  if (options.help) {
    printCompetitiveHelp();
    return;
  }

  if (options.dryRun) {
    const requestBody = buildCompetitiveRequestBody(options);
    console.log(JSON.stringify(requestBody, null, 2));
    return;
  }

  const execution = await executeCompetitiveWorkflow(options, { cwd, deliver: options.deliver });

  console.log(`Saved JSON report to ${execution.artifacts.jsonPath}`);
  console.log(`Saved Markdown report to ${execution.artifacts.markdownPath}`);
  console.log(`Saved raw API response to ${execution.artifacts.rawPath}`);
  if (execution.delivery?.deliveries?.length > 0) {
    console.log(`Delivered to ${execution.delivery.deliveries.map((item) => item.channel).join(", ")}`);
  }
  if (execution.delivery?.errors?.length > 0) {
    console.log(`Delivery errors: ${execution.delivery.errors.join(" | ")}`);
  }

  if (options.verbose) {
    console.log("");
    console.log(JSON.stringify(execution.response.usage ?? {}, null, 2));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
