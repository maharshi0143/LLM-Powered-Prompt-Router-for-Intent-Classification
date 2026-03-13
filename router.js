const { generateText } = require("./llm");
const systemPrompts = require("./prompts/systemPrompts");

async function routeAndRespond(message, intentData) {

  const { intent } = intentData;
  const systemPrompt = systemPrompts[intent];

  if (intent === "unclear" || !systemPrompt) {

    return "I'm not sure what you're asking. Are you looking for help with coding, data analysis, writing, or career advice?";

  }

  const response = await generateText({
    systemPrompt,
    userMessage: message
  });

  return response;
}

module.exports = { routeAndRespond };