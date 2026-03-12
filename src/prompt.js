function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildWindow(days) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

export function buildInputPrompt({ vendors, days, maxItemsPerVendor, window }) {
  const vendorList = vendors.join(", ");

  return [
    `Find notable public updates from these AI vendors in the last ${days} days: ${vendorList}.`,
    `Use official public sources only. The target window is ${window.startDate} through ${window.endDate}.`,
    `For each vendor, include at most ${maxItemsPerVendor} updates.`,
    "Only include an update when the source clearly supports it. If nothing notable is found for a vendor, mark that vendor as no_updates_found.",
    "Focus on launches, model releases, API/platform changes, pricing, policy changes, research announcements, and partnerships.",
    "Return concise summaries and practical impact statements. Do not include URLs in the JSON.",
    "Use source_titles with the exact page titles when possible so they can be matched to the API search results."
  ].join(" ");
}

export function buildInstructions() {
  return [
    "You are an AI release-monitoring analyst.",
    "Use web_search to find recent official announcements and fetch_url when you need fuller page context.",
    "Only report items you can verify from retrieved public sources.",
    "If search results are weak or missing for a vendor, say so by returning no_updates_found instead of guessing.",
    "Keep the overview under 90 words."
  ].join(" ");
}
