# Competitive Monitor Agent API Demo

## Summary
- Add a second standalone demo in this repo: a founder/GTM-focused Competitive Monitor that uses Perplexity's Agent API to research competitors over a recent time window and return structured strategic intel.
- Keep the current release monitor intact and add separate CLI and browser flows for the new example.
- Show clear Agent API evidence in the UI so each run is visibly tool-using and agentic.

## Implementation Changes
- Add a `/competitive` browser page and `/api/competitive/*` endpoints, reusing the same lightweight Node server and artifact-writing pattern.
- Add a second CLI entrypoint for the competitive monitor so both demos can be run from terminal or browser.
- Define a structured JSON schema covering query window, overview, competitor cards, threat level, pricing/positioning shifts, user pain points, and recommended counter-moves.
- Use `deep-research` by default for this demo, with `web_search`, `fetch_url`, and `response_format.json_schema`.
- Reuse source-title enrichment so returned source titles resolve into URLs from Agent API search results where possible.
- Reuse the Agent API evidence block in the UI, including status, model, output types, tool calls, and agentic-strength badge.

## API Feature Map
- Used directly: `preset`, `web_search`, `fetch_url`, `response_format.json_schema`, `status`, `model`, `output`, `usage`, `response_id`.
- Used indirectly in the app: source enrichment from `search_results` and `fetch_url_results`, UI evidence rendering, and agentic-strength classification from tool usage.
- Not used in v1: multi-model, embeddings, sandbox, custom function calling, Slack/email delivery, direct Reddit/X/Product Hunt APIs.

## Test Plan
- Unit tests for request building, schema validation, unrestricted vs restricted domain behavior, and source enrichment.
- Dry-run validation from the browser so edited inputs are reflected in the request payload.
- CLI dry-run validation for the competitive monitor request body.
- Browser/API smoke tests to verify the new endpoints and page wiring.

## Assumptions
- Package as a second standalone demo in the same repo.
- Optimize for founder/GTM use cases.
- Default preset is `deep-research`.
- Domain restriction is enabled by default, but optional.
- Source gathering relies on web discovery rather than direct social/community APIs.
