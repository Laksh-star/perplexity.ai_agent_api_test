import { buildWindow } from "./prompt.js";

export function buildCompetitiveWindow(days) {
  return buildWindow(days);
}

export function buildCompetitiveInstructions() {
  return [
    "You are a founder-focused competitive intelligence analyst.",
    "Use web_search to find recent launches, pricing moves, positioning changes, and user pain signals.",
    "Use fetch_url when a result needs deeper context before reporting it.",
    "Prioritize official product pages, changelogs, pricing pages, docs, and high-signal public discussions discovered through search.",
    "Return no_signal_found for a competitor when the evidence is weak or stale."
  ].join(" ");
}

export function buildCompetitiveInputPrompt({
  productName,
  competitors,
  days,
  maxItemsPerCompetitor,
  targetChannels,
  window
}) {
  const competitorList = competitors.join(", ");
  const channels = targetChannels.length > 0 ? targetChannels.join(", ") : "company sites, changelogs, docs, and public discussions";

  return [
    `Target product: ${productName}.`,
    `Analyze these competitors over the last ${days} days: ${competitorList}.`,
    `The target window is ${window.startDate} through ${window.endDate}.`,
    `Focus on founder/GTM signals from ${channels}.`,
    `For each competitor, include at most ${maxItemsPerCompetitor} signal items and at most 3 counter-moves.`,
    "Look for launches, feature changes, pricing moves, packaging shifts, messaging or positioning changes, demand signals, and user pain points.",
    "For each competitor, set a threat level of low, medium, high, or existential based on the evidence in the window.",
    "Counter-moves must be concrete and realistic to ship or test within 7 days.",
    "Do not include URLs in the JSON. Use source_titles that closely match retrieved pages."
  ].join(" ");
}
