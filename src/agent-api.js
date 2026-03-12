const API_URL = "https://api.perplexity.ai/v1/agent";

function buildWebSearchTool(domains) {
  const filters = {
    search_language_filter: ["en"],
    search_recency_filter: "month",
    max_tokens_per_page: 1200
  };

  if (domains.length > 0) {
    filters.search_domain_filter = domains;
  }

  return {
    type: "web_search",
    filters
  };
}

function buildFlatWebSearchTool(domains) {
  const tool = {
    type: "web_search",
    search_language_filter: ["en"],
    search_recency_filter: "month",
    max_tokens_per_page: 1200
  };

  if (domains.length > 0) {
    tool.search_domain_filter = domains;
  }

  return tool;
}

export function buildAgentTools(domains, filterStyle = "nested") {
  const webSearchTool =
    filterStyle === "nested" ? buildWebSearchTool(domains) : buildFlatWebSearchTool(domains);

  return [webSearchTool, { type: "fetch_url" }];
}

export function extractJson(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("The API returned an empty output_text payload.");
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/u);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Unable to parse JSON from output_text.");
  }
}

export async function callAgentApi(apiKey, body) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Perplexity API returned non-JSON output (status ${response.status}).`);
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? payload?.message ?? `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function shouldRetryWithFlatFilters(error) {
  if (error.status !== 400 || !error.payload) {
    return false;
  }

  const serialized = JSON.stringify(error.payload).toLowerCase();
  return serialized.includes("filters") || serialized.includes("search_domain_filter");
}

export function extractOutputText(output = []) {
  for (const item of output) {
    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new Error("No output_text content found in response.output.");
}

export function requireApiKey() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not set. Copy .env.example to .env and add your key.");
  }
  return apiKey;
}
