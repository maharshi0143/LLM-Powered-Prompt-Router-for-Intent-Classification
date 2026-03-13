require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function generateText(input) {

  try {

    let messages;

    if (typeof input === "string") {

      messages = [
        { role: "user", content: input }
      ];

    } else {

      messages = [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userMessage }
      ];

    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages
    });

    return completion.choices[0].message.content;

  } catch (error) {

    console.error("LLM Error:", error);

    return "Error generating response.";

  }

}

module.exports = { generateText };