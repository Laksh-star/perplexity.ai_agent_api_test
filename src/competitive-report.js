import { collectSources, matchSourcesToTitles, buildArtifactBaseName } from "./report.js";

function enrichInsightList(items, sources) {
  return items.map((item) => ({
    ...item,
    sources: matchSourcesToTitles(item.source_titles ?? [], sources)
  }));
}

export function enrichCompetitiveReport(report, response, options) {
  const sources = collectSources(response);
  const enrichedCompetitors = report.competitors.map((competitor) => ({
    ...competitor,
    signals: enrichInsightList(competitor.signals, sources),
    pricing_changes: enrichInsightList(competitor.pricing_changes, sources),
    positioning_moves: enrichInsightList(competitor.positioning_moves, sources),
    user_pain_points: enrichInsightList(competitor.user_pain_points, sources)
  }));

  return {
    generated_at: new Date().toISOString(),
    preset: options.preset,
    max_steps: options.maxSteps,
    model_used: response.model,
    response_id: response.id,
    usage: response.usage ?? null,
    raw_source_count: sources.length,
    product_name: options.productName,
    target_channels: options.targetChannels,
    query_window: report.query_window,
    overview: report.overview,
    competitors: enrichedCompetitors
  };
}

function renderSourcedList(lines, label, items) {
  if (items.length === 0) {
    lines.push(`### ${label}`);
    lines.push("No notable items found.");
    lines.push("");
    return;
  }

  lines.push(`### ${label}`);
  lines.push("");
  for (const item of items) {
    lines.push(`- ${item.title} (${item.date})`);
    if (item.why_it_matters) {
      lines.push(`  - Why it matters: ${item.why_it_matters}`);
    }
    if (item.summary) {
      lines.push(`  - Summary: ${item.summary}`);
    }
    if (item.confidence) {
      lines.push(`  - Confidence: ${item.confidence}`);
    }
    if (item.sources?.length > 0) {
      lines.push(`  - Sources: ${item.sources.map((source) => `[${source.title}](${source.url})`).join("; ")}`);
    } else if (item.source_titles?.length > 0) {
      lines.push(`  - Source titles: ${item.source_titles.join("; ")}`);
    }
  }
  lines.push("");
}

export function renderCompetitiveMarkdown(report) {
  const lines = [];

  lines.push("# Competitive Monitor");
  lines.push("");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Product: ${report.product_name}`);
  lines.push(`Window: ${report.query_window.start_date} to ${report.query_window.end_date} (${report.query_window.days} days)`);
  lines.push(`Preset: ${report.preset}`);
  lines.push(`Model: ${report.model_used}`);
  lines.push("");
  lines.push(report.overview);
  lines.push("");

  for (const competitor of report.competitors) {
    lines.push(`## ${competitor.competitor}`);
    lines.push("");
    lines.push(`Threat level: ${competitor.threat_level}`);
    lines.push("");
    lines.push(competitor.summary);
    lines.push("");

    if (competitor.status === "no_signal_found") {
      lines.push("No strong recent signals found in the requested window.");
      lines.push("");
      continue;
    }

    renderSourcedList(lines, "Signals", competitor.signals);
    renderSourcedList(lines, "Pricing Changes", competitor.pricing_changes);
    renderSourcedList(lines, "Positioning Moves", competitor.positioning_moves);
    renderSourcedList(lines, "User Pain Points", competitor.user_pain_points);

    lines.push("### Recommended Counter-Moves");
    lines.push("");
    if (competitor.recommended_counter_moves.length === 0) {
      lines.push("No counter-moves generated.");
    } else {
      for (const move of competitor.recommended_counter_moves) {
        lines.push(`- ${move.title}`);
        lines.push(`  - Summary: ${move.summary}`);
        lines.push(`  - Expected impact: ${move.expected_impact}`);
        lines.push(`  - Effort: ${move.effort}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function buildCompetitiveArtifactBaseName(report) {
  return buildArtifactBaseName(report);
}
