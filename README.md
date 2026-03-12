# Perplexity Agent API Release Monitor

This repo contains a minimal MVP that tests Perplexity's Agent API against a concrete workflow: monitoring recent official product and platform updates from major AI vendors.

The implementation uses:

- `preset="pro-search"` by default
- built-in `web_search` and `fetch_url` tools
- JSON Schema structured output with `response_format`
- official-domain search filtering so the agent prefers source-of-truth pages
- post-processing that maps `source_titles` from the model output back to URLs from the API `search_results` and `fetch_url_results` payloads

The official docs used for the request design:

- [Agent API quickstart](https://docs.perplexity.ai/docs/agent-api/quickstart)
- [Tools overview](https://docs.perplexity.ai/docs/agent-api/tools/overview)
- [Output control](https://docs.perplexity.ai/docs/agent-api/output-control)
- [Presets](https://docs.perplexity.ai/docs/agent-api/presets)
- [Prompt guide](https://docs.perplexity.ai/docs/agent-api/prompt-guide)

## What it builds

Given a vendor list and a time window, the CLI asks Perplexity to:

1. Search for recent official announcements.
2. Fetch full page content for relevant URLs when needed.
3. Return a normalized JSON report with:
   - `overview`
   - per-vendor `status`
   - per-update `title`, `date`, `category`, `summary`, `impact`, `confidence`, and `source_titles`
4. Save three artifacts:
   - a normalized JSON report
   - a Markdown brief
   - the raw API response

## Setup

Node 20+ is enough. No third-party packages are required.

```bash
cp .env.example .env
```

Then set your Perplexity key in `.env`:

```bash
PERPLEXITY_API_KEY=pplx-your-key-here
```

## Run

Default run:

```bash
npm start --
```

Run the local web app:

```bash
npm run serve
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Dry run without hitting the API:

```bash
npm start -- --dry-run
```

Custom vendor list:

```bash
npm start -- --days 14 --vendors "OpenAI,Anthropic,Perplexity"
```

Write artifacts to a different folder:

```bash
npm start -- --out-dir output
```

Print usage metadata from the raw response:

```bash
npm start -- --verbose
```

## Output

Artifacts are written to `reports/` by default:

- `*.json`: enriched structured report
- `*.md`: human-readable brief
- `*.raw.json`: unmodified Agent API response

## Browser app

The web app is a thin layer on top of the same monitor engine used by the CLI.

- `GET /api/health`: returns whether `PERPLEXITY_API_KEY` is present
- `GET /api/defaults`: returns the default vendor and domain configuration
- `POST /api/run`: executes the workflow and returns the structured report

The page supports two modes:

- `Run monitor`: calls Perplexity and writes report artifacts to disk
- `Preview request`: dry-run mode that shows the exact Agent API payload without making the upstream API call

The result panel also exposes Agent API evidence directly in the browser:

- response status and model
- output types returned by the API, such as `search_results` and `fetch_url_results`
- tool call counts from `usage.tool_calls_details`
- an `Agentic Strength` badge (`light`, `medium`, or `deep`) derived from the observed tool usage

The header includes a `Restrict to official domains` checkbox:

- checked: sends a domain allowlist so search stays on first-party sources when possible
- unchecked: omits `search_domain_filter` entirely for broader deep-research exploration

## Notes

- The prompt does not ask the model to return URLs directly. Perplexity's prompt guide warns that URLs in generated text can be hallucinated, so this project maps titles back to URLs from the API response instead.
- Perplexity's docs currently show search filters in two shapes for Agent API examples: nested under `tools[].filters` and flat on the `web_search` tool itself. This CLI tries the nested shape first and retries with the flat shape if the API rejects the first form.
- The first request for a new JSON schema may be slower because Perplexity prepares the schema server-side.
- Source enrichment uses title matching first, then falls back to search-result snippet text and URL-path hints so newsroom-style pages with generic titles can still resolve to clickable sources.
