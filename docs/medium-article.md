# Building Real Agentic Workflows with Perplexity's Agent API

Most "AI demos" still collapse into one of two categories:

- a chat box with a prompt wrapper
- a summarizer with citations

That is not what I wanted to test with Perplexity's Agent API.

I wanted to answer a narrower question:

> Can we build small, practical workflows where the model actually uses retrieval tools, returns structured output, and produces something a founder or operator would use?

The answer was yes. I ended up building two working examples:

- a **Release Monitor** for official AI vendor updates
- a **Competitive Monitor** for founder-grade market signals and counter-moves

Both run in a browser UI and from the CLI. Both use the same Agent API backend. Both save raw API artifacts so the run can be audited after the fact.

## What I Built

The repo is a lightweight Node app with no external UI framework. The point was not to show frontend complexity. The point was to isolate the Agent API behavior.

The two demos are:

### 1. Release Monitor

Input:

- vendor names
- date window
- optional domain restriction

Output:

- overview
- per-vendor updates
- title, date, category, summary, impact, confidence
- source links reconstructed from the raw API response

This is useful for tracking OpenAI, Anthropic, Google AI, Perplexity, Vercel, LangChain, or any other vendor set you care about.

### 2. Competitive Monitor

Input:

- your product name
- competitor names
- lookback window
- optional high-signal domain restriction

Output:

- threat level
- recent signals
- pricing changes
- positioning moves
- user pain points
- recommended counter-moves

This is aimed at founder and GTM workflows rather than generic research.

## Why This Is Actually Agentic

The easiest way to misuse the word "agentic" is to call any grounded LLM response an agent. That bar is too low.

In these demos, the model is agentic in a more concrete sense:

- it decides which sub-queries to run
- it performs repeated `web_search` calls
- it can escalate to `fetch_url` when snippets are not enough
- it synthesizes multiple retrieved results into a fixed JSON schema
- the UI exposes `status`, `model`, `output_types`, `response_id`, and `tool_calls_details`

That last point matters.

I did not want to infer agent behavior from "it looks researched." I wanted direct evidence from the API response that tools were used.

For example, one live competitive-monitor run came back with:

- `status: completed`
- model `openai/gpt-5.2`
- repeated `search_results` in `output_types`
- `usage.tool_calls_details.search_web.invocation = 3`

That is not just a generated answer with decorative citations. It is a tool-using retrieval workflow.

## Screenshots

### Release Monitor

![Release Monitor UI](screenshots/release-monitor.png)

### Competitive Monitor

![Competitive Monitor UI](screenshots/competitive-monitor.png)

## The Agent API Features That Mattered

Perplexity's Agent API is broad, but this build only needed a focused subset.

### Used directly

- **Presets**
  - `pro-search` for Release Monitor
  - `deep-research` for Competitive Monitor
- **Built-in tools**
  - `web_search`
  - `fetch_url`
- **Structured output**
  - `response_format` with JSON Schema
- **Response metadata**
  - `status`
  - `model`
  - `response_id`
  - `output`
  - `usage.tool_calls_details`
- **Search filters**
  - optional domain restriction to bias toward official or high-signal sources

### Used in the app layer

- source-title matching back to real URLs from `search_results` and `fetch_url_results`
- UI rendering of tool evidence
- "Agentic Strength" scoring based on the observed search/fetch pattern
- Telegram delivery after a successful run

### Not used

- multi-model orchestration
- model fallback arrays
- custom function calling
- embeddings or historical memory
- sandbox execution

That is an important design point: you do not need every possible agent feature to build something genuinely useful.

## What Worked Well

### 1. Structured output changed the quality of the app

The JSON schema constraint was one of the highest leverage choices in the project.

Instead of trying to parse ad hoc markdown, the app gets predictable objects and can render:

- vendor cards
- competitor cards
- confidence badges
- threat levels
- source lists

That made the browser UI and the CLI outputs much more reliable.

### 2. Domain restriction was useful, but only when exposed as a toggle

At first, the apps always pushed official-domain defaults. That reduced noise, but it also made the UX misleading because an empty domain field still silently fell back to defaults.

The better design was:

- a checkbox to restrict domains
- when checked, send the allowlist
- when unchecked, omit `search_domain_filter` completely

That made the "search breadth vs source discipline" tradeoff explicit.

### 3. Raw response artifacts were essential

Every live run writes:

- an enriched `*.json`
- a readable `*.md`
- a raw `*.raw.json`

That raw file is where the truth lives if you want to verify:

- whether the run actually completed
- which model ran
- whether `web_search` or `fetch_url` was invoked
- what output object types the API returned

Without that artifact, it would have been much harder to separate app bugs from model behavior.

## What Broke Along the Way

This is where the project became more interesting than a polished happy-path demo.

I hit several real implementation issues:

- an off-by-one bug in the date window
- brittle source-title matching, especially when fetched pages had generic titles
- frontend form bugs where edited values were ignored
- null-handling bugs in the browser payload builder
- delivery wiring that was partially implemented but not actually flowing end to end

These were not theoretical concerns. They showed up in live runs and had to be fixed against real response payloads.

One of the best fixes was improving source resolution to fall back to snippet text and URL-path hints instead of relying only on exact title matches. That cleaned up cases where a newsroom page or generic article title would otherwise fail to link properly.

## What the Final UX Looks Like

Each browser page now shows:

- run controls
- a dry-run preview mode
- result cards
- local artifact paths
- an **Agent API Evidence** block
- an **Agentic Strength** badge
- optional downstream delivery

The evidence block is the key idea.

I wanted the UI to answer:

> Did this run actually use the Agent API in an agentic way?

So the page shows:

- `completed` or failed status
- model used
- response ID
- output types like `search_results` and `fetch_url_results`
- tool call counts such as `search_web 6 call(s)`

That removes a lot of ambiguity.

## Telegram as the First Downstream Action

I considered Slack first, but Telegram was the faster path to a complete "agentic workflow" story.

The app now supports optional delivery after a successful run:

- Telegram via Bot API `sendMessage`
- Slack via incoming webhook, ready but not configured in this build

Telegram was enough to prove an important step up in value:

- the agent researches
- the app structures and stores the result
- the result is pushed to a real destination outside the terminal

That is still a modest workflow, but it is much closer to operational software than a notebook-style demo.

## What This Still Does Not Do

There are a few things I intentionally did not add in v1:

- multi-model comparison
- persistent historical memory
- function-calling into CRM or ticketing systems
- long-running streaming UX

Those are all valid next steps. They just were not necessary to prove the core point.

The current demos already answer the important question:

> Can Perplexity's Agent API power practical, inspectable, small-scale agent workflows right now?

Yes.

## If I Extended This Next

I would add only one or two upgrades:

### 1. Function-calling style actions

Examples:

- create a Jira ticket from a competitive threat
- send a Slack digest to a team channel
- append a verified update to Notion or Google Sheets

That would move the system from agentic research to agentic operations.

### 2. Historical memory

The next practical improvement would be change awareness:

- what is new since the last run
- what signals are recurring
- what is already known and does not need to be sent again

That would reduce noise significantly.

## Final Takeaway

The most useful lesson from this project is simple:

You do not need a giant autonomous system to build something meaningfully agentic.

You need:

- a clear workflow
- tool use you can verify
- structured output
- visible evidence of what the model actually did
- a small downstream action that makes the result operational

That combination is enough to get beyond AI theater.

If you want to inspect the code, the repo includes:

- both browser demos
- both CLI entrypoints
- raw response artifacts
- screenshot-backed documentation
- Telegram delivery integration

That makes it a decent starting point for anyone who wants to test where Perplexity's Agent API is genuinely useful, and where a plain LLM call is still enough.
