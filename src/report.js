function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
}

export function collectSources(response) {
  const sources = [];

  for (const item of response.output ?? []) {
    if (item.type === "search_results") {
      for (const result of item.results ?? []) {
        sources.push({
          title: result.title,
          snippet: result.snippet ?? "",
          url: result.url,
          date: result.date ?? null,
          kind: "search"
        });
      }
    }

    if (item.type === "fetch_url_results") {
      for (const result of item.contents ?? []) {
        sources.push({
          title: result.title,
          snippet: result.text ?? result.excerpt ?? "",
          url: result.url,
          date: null,
          kind: "fetch"
        });
      }
    }
  }

  return dedupeSources(sources);
}

function dedupeSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = `${source.title}::${source.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeTitle(value) {
  return value.toLowerCase().replace(/\s+/gu, " ").trim();
}

function normalizeSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function extractUrlSlug(url) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return normalizeSlug(segments.at(-1) ?? "");
  } catch {
    return "";
  }
}

function sourceMatchScore(requested, source) {
  const normalizedActual = normalizeTitle(source.title ?? "");
  const normalizedSnippet = normalizeTitle(source.snippet ?? "");
  const requestedSlug = normalizeSlug(requested);
  const urlSlug = extractUrlSlug(source.url ?? "");

  if (!normalizedActual && !normalizedSnippet) {
    return 0;
  }

  if (normalizedActual === requested) {
    return 100;
  }

  if (normalizedActual.includes(requested) || requested.includes(normalizedActual)) {
    return 80;
  }

  if (normalizedSnippet.includes(requested)) {
    return 70;
  }

  if (requestedSlug && urlSlug && (requestedSlug === urlSlug || urlSlug.includes(requestedSlug))) {
    return 60;
  }

  const requestedTokens = new Set(requested.split(" ").filter((token) => token.length >= 4));
  if (requestedTokens.size === 0) {
    return 0;
  }

  let tokenHits = 0;
  for (const token of requestedTokens) {
    if (normalizedActual.includes(token) || normalizedSnippet.includes(token)) {
      tokenHits += 1;
    }
  }

  const overlapRatio = tokenHits / requestedTokens.size;
  if (overlapRatio >= 0.8 && tokenHits >= 2) {
    return 50;
  }

  return 0;
}

function matchSources(sourceTitles, sources) {
  const normalizedRequested = sourceTitles.map(normalizeTitle).filter(Boolean);
  if (normalizedRequested.length === 0) {
    return [];
  }

  const scoredMatches = sources
    .map((source) => ({
      source,
      score: Math.max(...normalizedRequested.map((requested) => sourceMatchScore(requested, source)))
    }))
    .filter((entry) => entry.score >= 50)
    .sort((left, right) => right.score - left.score);

  if (scoredMatches.length === 0) {
    return [];
  }

  const bestScore = scoredMatches[0].score;
  const threshold = Math.max(50, bestScore - 10);
  const narrowedMatches = scoredMatches
    .filter((entry) => entry.score >= threshold)
    .map((entry) => entry.source);

  return dedupeSources(narrowedMatches);
}

export function matchSourcesToTitles(sourceTitles, sources) {
  return matchSources(sourceTitles, sources);
}

export function enrichReport(report, response, options) {
  const sources = collectSources(response);

  const enrichedVendors = report.vendors.map((vendor) => ({
    ...vendor,
    updates: vendor.updates.map((update) => ({
      ...update,
      sources: matchSources(update.source_titles, sources)
    }))
  }));

  return {
    generated_at: new Date().toISOString(),
    preset: options.preset,
    max_steps: options.maxSteps,
    model_used: response.model,
    response_id: response.id,
    usage: response.usage ?? null,
    raw_source_count: sources.length,
    query_window: report.query_window,
    overview: report.overview,
    vendors: enrichedVendors
  };
}

export function renderMarkdown(report) {
  const lines = [];

  lines.push("# AI Release Monitor");
  lines.push("");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Window: ${report.query_window.start_date} to ${report.query_window.end_date} (${report.query_window.days} days)`);
  lines.push(`Preset: ${report.preset}`);
  lines.push(`Model: ${report.model_used}`);
  lines.push("");
  lines.push(report.overview);
  lines.push("");

  for (const vendor of report.vendors) {
    lines.push(`## ${vendor.vendor}`);
    lines.push("");

    if (vendor.status === "no_updates_found" || vendor.updates.length === 0) {
      lines.push("No notable official updates found in the requested window.");
      lines.push("");
      continue;
    }

    for (const update of vendor.updates) {
      lines.push(`### ${update.title}`);
      lines.push(`- Date: ${update.date}`);
      lines.push(`- Category: ${update.category}`);
      lines.push(`- Confidence: ${update.confidence}`);
      lines.push(`- Summary: ${update.summary}`);
      lines.push(`- Impact: ${update.impact}`);

      if (update.sources.length > 0) {
        lines.push("- Sources:");
        for (const source of update.sources) {
          lines.push(`  - [${source.title}](${source.url})`);
        }
      } else if (update.source_titles.length > 0) {
        lines.push(`- Source titles: ${update.source_titles.join("; ")}`);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}

export function buildArtifactBaseName(report) {
  const datePart = report.generated_at.replace(/[:.]/gu, "-");
  return `${datePart}-${slugify(report.query_window.start_date)}-to-${slugify(report.query_window.end_date)}`;
}
