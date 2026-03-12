const healthPill = document.querySelector("#health-pill");
const reportsPill = document.querySelector("#reports-pill");
const form = document.querySelector("#run-form");
const fillDefaultsButton = document.querySelector("#fill-defaults");
const dryRunButton = document.querySelector("#dry-run");
const feedback = document.querySelector("#feedback");
const agentEvidence = document.querySelector("#agent-evidence");
const artifacts = document.querySelector("#artifacts");
const overview = document.querySelector("#overview");
const vendorResults = document.querySelector("#vendor-results");
const requestPreview = document.querySelector("#request-preview");
const runMeta = document.querySelector("#run-meta");

let cachedDefaults = null;

function listToTextarea(values) {
  if (!Array.isArray(values)) {
    return "";
  }

  return values.join("\n");
}

function textareaToList(value) {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value !== "string") {
    return [String(value).trim()].filter(Boolean);
  }

  return value
    .split(/\n|,/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function setFeedback(message, tone = "muted") {
  feedback.hidden = false;
  feedback.textContent = message;
  feedback.className = `feedback feedback-${tone}`;
}

function setReportsPill(text, className = "pill pill-dark", title = "") {
  reportsPill.className = className;
  reportsPill.innerHTML = text;
  reportsPill.title = title;
}

function setLoading(isLoading, label = "Running monitor...") {
  if (isLoading) {
    setFeedback(label, "muted");
    runMeta.textContent = "Working...";
  }

  form.querySelectorAll("input, textarea, select, button").forEach((element) => {
    element.disabled = isLoading;
  });
}

function hideResultBlocks() {
  agentEvidence.hidden = true;
  artifacts.hidden = true;
  overview.hidden = true;
  vendorResults.hidden = true;
  requestPreview.hidden = true;
}

function getToolInvocationCount(result, toolName) {
  return result.tool_calls_details?.[toolName]?.invocation ?? 0;
}

function computeAgenticStrength(result) {
  const searchCalls = getToolInvocationCount(result, "search_web");
  const fetchCalls = getToolInvocationCount(result, "fetch_url");
  const outputTypes = new Set(result.output_types ?? []);

  if (fetchCalls >= 2 || (searchCalls >= 3 && fetchCalls >= 1) || outputTypes.has("fetch_url_results")) {
    return "deep";
  }

  if (searchCalls >= 2 || fetchCalls >= 1) {
    return "medium";
  }

  return "light";
}

function renderAgentEvidence(result) {
  const toolCalls = Object.entries(result.tool_calls_details ?? {});
  const toolCallMarkup =
    toolCalls.length === 0
      ? `<span class="evidence-empty">No tool call details returned.</span>`
      : toolCalls
          .map(
            ([tool, details]) =>
              `<div class="evidence-chip"><span>${tool}</span><strong>${details.invocation ?? 0} call(s)</strong></div>`
          )
          .join("");

  const outputTypes = (result.output_types ?? []).join(", ") || "none";
  const strength = computeAgenticStrength(result);

  agentEvidence.hidden = false;
  agentEvidence.innerHTML = `
    <div class="evidence-card">
      <div class="evidence-head">
        <h3>Agent API Evidence</h3>
        <div class="evidence-badges">
          <span class="status status-${result.status}">${result.status}</span>
          <span class="strength strength-${strength}">${strength}</span>
        </div>
      </div>
      <div class="evidence-grid">
        <div>
          <p class="evidence-label">Model</p>
          <p class="evidence-value">${result.model}</p>
        </div>
        <div>
          <p class="evidence-label">Response ID</p>
          <p class="evidence-value evidence-mono">${result.response_id}</p>
        </div>
        <div>
          <p class="evidence-label">Output Types</p>
          <p class="evidence-value evidence-mono">${outputTypes}</p>
        </div>
        <div>
          <p class="evidence-label">Agentic Strength</p>
          <p class="evidence-value">${strength}</p>
        </div>
      </div>
      <div class="evidence-tools">
        <p class="evidence-label">Tool Calls</p>
        <div class="evidence-chips">${toolCallMarkup}</div>
      </div>
    </div>
  `;
}

function renderArtifacts(result) {
  artifacts.hidden = false;
  artifacts.innerHTML = "";

  const items = [
    ["JSON report", result.artifacts.jsonPath],
    ["Markdown brief", result.artifacts.markdownPath],
    ["Raw API response", result.artifacts.rawPath]
  ];

  for (const [label, filePath] of items) {
    const item = document.createElement("div");
    item.className = "artifact-item";
    item.innerHTML = `<span>${label}</span><code>${filePath}</code>`;
    artifacts.append(item);
  }
}

function renderOverview(report) {
  overview.hidden = false;
  overview.innerHTML = `
    <div class="overview-card">
      <p class="overview-label">Overview</p>
      <p class="overview-text">${report.overview}</p>
      <div class="overview-meta">
        <span>${report.query_window.start_date} to ${report.query_window.end_date}</span>
        <span>${report.preset}</span>
        <span>${report.model_used}</span>
      </div>
    </div>
  `;
}

function createSourceList(update) {
  if (!update.sources || update.sources.length === 0) {
    return `<p class="source-fallback">Source titles: ${update.source_titles.join("; ")}</p>`;
  }

  const links = update.sources
    .map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a>`)
    .join("");

  return `<div class="source-links">${links}</div>`;
}

function renderVendors(report) {
  vendorResults.hidden = false;
  vendorResults.innerHTML = "";

  for (const vendor of report.vendors) {
    const card = document.createElement("article");
    card.className = "vendor-card";

    const updatesMarkup =
      vendor.status === "no_updates_found" || vendor.updates.length === 0
        ? `<p class="empty-state">No notable official updates found in the requested window.</p>`
        : vendor.updates
            .map(
              (update) => `
                <div class="update-card">
                  <div class="update-head">
                    <h4>${update.title}</h4>
                    <span class="confidence confidence-${update.confidence}">${update.confidence}</span>
                  </div>
                  <p class="update-meta">${update.date} · ${update.category}</p>
                  <p>${update.summary}</p>
                  <p class="impact">${update.impact}</p>
                  ${createSourceList(update)}
                </div>
              `
            )
            .join("");

    card.innerHTML = `
      <div class="vendor-head">
        <h3>${vendor.vendor}</h3>
        <span class="status status-${vendor.status}">${vendor.status.replaceAll("_", " ")}</span>
      </div>
      ${updatesMarkup}
    `;

    vendorResults.append(card);
  }
}

function getPayload() {
  const formData = new FormData(form);
  const readNumberField = (name) => {
    const value = formData.get(name);
    if (value === null || value === undefined) {
      return undefined;
    }

    const normalized = String(value).trim();
    if (normalized === "") {
      return undefined;
    }

    return normalized;
  };

  return {
    preset: formData.get("preset"),
    days: readNumberField("days"),
    maxSteps: readNumberField("maxSteps"),
    maxItemsPerVendor: readNumberField("maxItemsPerVendor"),
    vendors: textareaToList(formData.get("vendors")),
    domains: textareaToList(formData.get("domains")),
    restrictDomains: form.elements.restrictDomains.checked
  };
}

async function fetchDefaults() {
  const response = await fetch("/api/defaults");
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Unable to load defaults.");
  }
  cachedDefaults = payload.defaults;
  form.elements.preset.value = cachedDefaults.preset;
  form.elements.days.value = cachedDefaults.days;
  form.elements.maxSteps.value = cachedDefaults.maxSteps;
  form.elements.maxItemsPerVendor.value = cachedDefaults.maxItemsPerVendor;
  form.elements.vendors.value = listToTextarea(cachedDefaults.vendors);
  form.elements.domains.value = listToTextarea(cachedDefaults.domains);
  form.elements.restrictDomains.checked = true;
}

async function refreshHealth() {
  const response = await fetch("/api/health");
  const payload = await response.json();
  if (payload.has_api_key) {
    healthPill.textContent = "API key loaded";
    healthPill.className = "pill pill-good";
  } else {
    healthPill.textContent = "Missing PERPLEXITY_API_KEY";
    healthPill.className = "pill pill-warn";
  }
}

async function postRun(payload) {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Run failed.");
  }
  return result;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideResultBlocks();
  const payload = getPayload();
  setLoading(true);

  try {
    const result = await postRun(payload);
    setFeedback("Run completed. Structured results and artifact paths are below.", "good");
    runMeta.textContent = `${result.model} · ${result.response_id}`;
    setReportsPill(
      `Saved latest run to <code>reports/</code>`,
      "pill pill-good",
      `${result.artifacts.jsonPath}\n${result.artifacts.markdownPath}\n${result.artifacts.rawPath}`
    );
    renderAgentEvidence(result);
    renderArtifacts(result);
    renderOverview(result.report);
    renderVendors(result.report);
  } catch (error) {
    setFeedback(error.message, "bad");
    runMeta.textContent = "Run failed.";
  } finally {
    setLoading(false);
  }
});

dryRunButton.addEventListener("click", async () => {
  hideResultBlocks();
  const payload = getPayload();
  setLoading(true, "Building request preview...");

  try {
    const result = await postRun({
      ...payload,
      dryRun: true
    });
    requestPreview.hidden = false;
    requestPreview.textContent = JSON.stringify(result.requestBody, null, 2);
    setFeedback("Dry run completed. This is the payload that will be sent to Perplexity.", "good");
    runMeta.textContent = "Dry run preview";
    setReportsPill("Preview only. No files written.", "pill pill-muted");
  } catch (error) {
    setFeedback(error.message, "bad");
    runMeta.textContent = "Dry run failed.";
  } finally {
    setLoading(false);
  }
});

fillDefaultsButton.addEventListener("click", async () => {
  try {
    if (!cachedDefaults) {
      await fetchDefaults();
    } else {
      form.elements.preset.value = cachedDefaults.preset;
      form.elements.days.value = cachedDefaults.days;
      form.elements.maxSteps.value = cachedDefaults.maxSteps;
      form.elements.maxItemsPerVendor.value = cachedDefaults.maxItemsPerVendor;
      form.elements.vendors.value = listToTextarea(cachedDefaults.vendors);
      form.elements.domains.value = listToTextarea(cachedDefaults.domains);
      form.elements.restrictDomains.checked = true;
    }
    setFeedback("Defaults restored.", "muted");
  } catch (error) {
    setFeedback(error.message, "bad");
  }
});

await fetchDefaults();
await refreshHealth();
setReportsPill("Writes reports to <code>reports/</code>", "pill pill-dark");
setFeedback("Ready. Configure the run and launch it from the browser.", "muted");
