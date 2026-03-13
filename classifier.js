const { generateText } = require("./llm");

const CONFIDENCE_THRESHOLD = 0.7;

const ALLOWED_INTENTS = new Set([
  "code",
  "data",
  "writing",
  "career",
  "unclear"
]);

// keywords used for lightweight intent detection
const INTENT_KEYWORDS = {
  code: ["code", "python", "javascript", "java", "sql", "bug", "debug", "function", "api"],
  data: ["data", "dataset", "average", "mean", "median", "statistics", "chart", "analysis", "pivot table"],
  writing: ["grammar", "sentence", "paragraph", "rewrite", "tone", "improve writing"],
  career: ["career", "job", "resume", "interview", "skills", "profession", "cover letter"]
};

const VAGUE_PATTERNS = [
  /^help me make this better[.!?]*$/i,
  /^make this better[.!?]*$/i,
  /^can you help me fix this[.!?]*$/i
];

function detectKeywordIntent(message) {
  const lower = message.toLowerCase();
  const matches = [];

  for (const intent in INTENT_KEYWORDS) {
    const keywords = INTENT_KEYWORDS[intent];

    if (keywords.some(word => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(^|[^a-z])${escapedWord}([^a-z]|$)`, "i");
      return pattern.test(lower);
    })) {
      matches.push(intent);
    }
  }

  return matches;
}

async function classifyIntent(message) {

  const normalized = message.toLowerCase().trim();

  // vague input detection
  const vagueInputs = ["hello", "hi", "hey", "help", "help me"];

  if (vagueInputs.includes(normalized)) {
    return { intent: "unclear", confidence: 0 };
  }

  if (VAGUE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return { intent: "unclear", confidence: 0 };
  }

  // multi-intent detection using keywords
  const detectedIntents = detectKeywordIntent(message);

  if (detectedIntents.length > 1) {
    return { intent: "unclear", confidence: 0 };
  }

  // Strong single-intent keyword matches do not need an LLM round trip.
  if (detectedIntents.length === 1) {
    return { intent: detectedIntents[0], confidence: 0.9 };
  }

  const prompt = `
You are an AI intent classification system.

Classify the user's request into ONE of these labels:

code
data
writing
career
unclear

Intent definitions:

code → programming, debugging, explaining code, SQL queries, APIs.

data → statistics, averages, datasets, numerical analysis.

writing → improving existing text, grammar correction, tone improvement, editing sentences.

career → job advice, resume improvement, career planning.

unclear → greetings, vague inputs, creative writing requests,
or messages outside the supported intents.

Rules:
- Creative writing requests (poems, stories, songs) MUST be "unclear".
- If the message is ambiguous or multi-intent, choose "unclear".
- Return ONLY valid JSON.

Format:
{"intent":"code","confidence":0.95}

User message:
${message}
`;

  try {

    const response = await generateText(prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON");

    const parsed = JSON.parse(jsonMatch[0]);

    let intent = typeof parsed.intent === "string"
      ? parsed.intent.toLowerCase().trim()
      : "unclear";

    let confidence = Number(parsed.confidence) || 0;

    if (!ALLOWED_INTENTS.has(intent)) {
      intent = "unclear";
      confidence = 0;
    }

    // clamp confidence between 0 and 1
    confidence = Math.max(0, Math.min(confidence, 1));

    // threshold enforcement
    if (confidence < CONFIDENCE_THRESHOLD) {
      intent = "unclear";
      confidence = 0;
    }

    // IMPORTANT: ensure unclear always has 0 confidence
    if (intent === "unclear") {
      confidence = 0;
    }

    return { intent, confidence };

  } catch (error) {

    console.error("Intent classification error:", error);

    return {
      intent: "unclear",
      confidence: 0
    };

  }

}

module.exports = { classifyIntent };
