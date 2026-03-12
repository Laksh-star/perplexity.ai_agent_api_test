import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { loadEnvFile, defaults } from "./config.js";
import { buildRequestBody } from "./perplexity.js";
import { coerceRunOptions, executeMonitor } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cwd = process.cwd();
const publicDir = path.resolve(__dirname, "..", "public");

loadEnvFile(cwd);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(response, statusCode, text, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType
  });
  response.end(text);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}

function serveStaticAsset(requestPath, response) {
  const target = requestPath === "/" ? "/index.html" : requestPath;
  const normalizedPath = path.normalize(target).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, normalizedPath);

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, "Not found");
    return;
  }

  const contents = fs.readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": getContentType(filePath)
  });
  response.end(contents);
}

function getDefaultOptions() {
  return {
    days: 7,
    preset: "pro-search",
    maxSteps: 3,
    maxItemsPerVendor: 2,
    vendors: defaults.DEFAULT_VENDORS,
    domains: defaults.OFFICIAL_DOMAINS,
    outDir: "reports"
  };
}

async function handleApiRun(request, response) {
  const rawBody = await readRequestBody(request);
  const payload = rawBody ? JSON.parse(rawBody) : {};
  const baseOptions = getDefaultOptions();
  const options = coerceRunOptions(payload, baseOptions);

  if (payload.dryRun === true) {
    sendJson(response, 200, {
      ok: true,
      mode: "dry-run",
      requestBody: buildRequestBody(options)
    });
    return;
  }

  const execution = await executeMonitor(options, { cwd, writeArtifacts: true });
  const outputTypes = (execution.response.output ?? []).map((item) => item.type);

  sendJson(response, 200, {
    ok: true,
    report: execution.report,
    artifacts: execution.artifacts,
    usage: execution.response.usage ?? null,
    response_id: execution.response.id,
    model: execution.response.model,
    status: execution.response.status,
    output_types: outputTypes,
    tool_calls_details: execution.response.usage?.tool_calls_details ?? {}
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        has_api_key: Boolean(process.env.PERPLEXITY_API_KEY)
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/defaults") {
      sendJson(response, 200, {
        ok: true,
        defaults: getDefaultOptions()
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/run") {
      await handleApiRun(request, response);
      return;
    }

    if (request.method === "GET") {
      serveStaticAsset(url.pathname, response);
      return;
    }

    sendJson(response, 405, {
      ok: false,
      error: "Method not allowed."
    });
  } catch (error) {
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    sendJson(response, statusCode, {
      ok: false,
      error: error.message
    });
  }
});

const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

server.listen(port, host, () => {
  console.log(`Release monitor server listening on http://${host}:${port}`);
});
