# AI Prompt Router

A Node.js service that routes user messages to specialized AI personas using a two-step flow:

1. Classify user intent.
2. Route to an intent-specific system prompt and generate a response.

This repository is implemented with Express + Groq (`llama-3.1-8b-instant`) and logs each routed request in JSON Lines format.

## Reference Link

- Google Drive file: https://drive.google.com/file/d/1Q1tfILkaUk6ElpKWKYUlLMRLeCKIlwsK/view?usp=sharing

## Features

- Intent classification with confidence score.
- Routing to expert personas: `code`, `data`, `writing`, `career`.
- `unclear` fallback that asks a clarifying question.
- Manual override support with `@intent` prefix.
- Per-request route logging to `logs/route_log.jsonl`.
- Graceful fallback to `unclear` when classifier JSON is malformed.

## Current Architecture

- `server.js`
Handles HTTP API, request validation, manual override logic, orchestration (`classifyIntent` -> `routeAndRespond`), and logging.

- `classifier.js`
Implements intent detection:
keyword-based quick checks for vague or multi-intent input, then LLM-based classification with strict JSON parsing and confidence thresholding.

- `router.js`
Maps classified intent to persona system prompt and performs final generation call.
If intent is `unclear` (or prompt missing), returns a clarifying question.

- `prompts/systemPrompts.js`
Central store for persona prompts (configurable map keyed by intent).

- `llm.js`
Groq wrapper that accepts either plain prompt strings or `{ systemPrompt, userMessage }` message pairs.
Returns fallback string on provider errors.

- `utils/logger.js`
Asynchronous JSONL append logger with automatic `logs/` directory creation.

## Request Lifecycle

1. Client sends `POST /chat` with `{ "message": "..." }`.
2. If message starts with `@`, server bypasses classifier and uses override intent.
3. Otherwise, `classifyIntent(message)` returns `{ intent, confidence }`.
4. `routeAndRespond(message, intentData)` picks persona prompt and generates final text.
5. Server logs `{ intent, confidence, user_message, final_response }` to `logs/route_log.jsonl`.
6. Response returned as JSON.

## Project Structure

```text
ai-prompt-router/
  classifier.js
  llm.js
  router.js
  server.js
  package.json
  .env.example
  .gitignore
  prompts/
    systemPrompts.js
  utils/
    logger.js
  logs/
    route_log.jsonl
```

## Prerequisites

- Node.js 18+
- npm 9+
- Groq API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set your key:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

3. Start server:

```bash
npm start
```

Server runs at `http://localhost:3000` by default.

## API Reference

### `GET /`

Returns plain text status.

### `GET /health`

Returns service health metadata.

Example:

```json
{
  "status": "ok",
  "service": "AI Prompt Router",
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### `GET /intents`

Returns currently supported user-facing intents.

### `POST /chat`

Routes a user request.

Request body:

```json
{
  "message": "how do i sort a list of objects in python?"
}
```

Success response:

```json
{
  "intent": "code",
  "confidence": 0.95,
  "response": "..."
}
```

Error response:

```json
{
  "error": "Message is required"
}
```

## Manual Override

You can bypass classifier using a prefix in message:

- `@code fix this bug`
- `@data what is the mean of 10, 20, 30`
- `@writing review this paragraph`
- `@career how should I prepare for interviews`

Current behavior note:
override intent is taken as-is from prefix token and routed through `systemPrompts[intent]`.
If the intent is unknown, router falls back to clarifying question.

## Logging

Each `POST /chat` appends one JSON object to `logs/route_log.jsonl`.

Logged fields:

- `intent`
- `confidence`
- `user_message`
- `final_response`

Example log line:

```json
{"intent":"code","confidence":0.95,"user_message":"how do i reverse a string in js?","final_response":"..."}
```

## Intent Classification Details

`classifyIntent` combines 3 layers:

1. Vague-input short-circuit (`hello`, `hi`, `help`, etc.) -> `unclear`.
2. Keyword-based multi-intent detection -> `unclear` when multiple intent families match.
3. LLM classification with strict JSON extraction.

Post-processing rules:

- Unknown intent labels are forced to `unclear`.
- Confidence is clamped to `[0,1]`.
- Confidence below `0.7` is converted to `unclear` with `0` confidence.
- Parse failure or model failure returns `{ intent: "unclear", confidence: 0 }`.

## Core Requirement Mapping

Status against assignment requirements:

1. Four distinct prompts in config map: Yes (`prompts/systemPrompts.js`).
2. `classify_intent` with LLM call and JSON output: Yes (`classifier.js`).
3. `route_and_respond` selecting prompt + second generation call: Yes (`router.js`).
4. `unclear` routes to clarifying question: Yes (`router.js`).
5. JSONL route logging with required keys: Yes (`utils/logger.js`).
6. Malformed/non-JSON classifier response fallback: Yes (`classifier.js`).

## Local Testing Tips

Quick curl examples:

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"fxi thsi bug pls: for i in range(10) print(i)"}'
```

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"@writing My boss says my writing is too verbose."}'
```

## Security Note

- Keep `.env` local and out of version control.
- If any real API key was previously committed or shared, rotate it immediately.

## License

ISC
