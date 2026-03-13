require("dotenv").config();
const express = require("express");

const { classifyIntent } = require("./classifier");
const { routeAndRespond } = require("./router");
const { logRequest } = require("./utils/logger");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("AI Prompt Router is running 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AI Prompt Router",
    timestamp: new Date().toISOString()
  });
});

app.get("/intents", (req, res) => {
  res.json({
    supported_intents: [
      { intent: "code", description: "Programming help and debugging" },
      { intent: "data", description: "Data analysis and statistics" },
      { intent: "writing", description: "Writing feedback and improvements" },
      { intent: "career", description: "Career advice and planning" }
    ]
  });
});

app.post("/chat", async (req, res) => {

  let { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Message is required"
    });
  }

  try {

    let intentData;

    // Manual intent override
    if (message.startsWith("@")) {

      const parts = message.split(" ");
      const overrideIntent = parts[0].substring(1);

      intentData = {
        intent: overrideIntent,
        confidence: 1
      };

      message = parts.slice(1).join(" ");

    } else {

      intentData = await classifyIntent(message);

    }

    const response = await routeAndRespond(message, intentData);

    await logRequest({
      intent: intentData.intent,
      confidence: intentData.confidence,
      user_message: message,
      final_response: response
    });

    res.json({
      intent: intentData.intent,
      confidence: intentData.confidence,
      response
    });

  } catch (error) {

    console.error("Server error:", error);

    res.status(500).json({
      error: "Internal server error"
    });

  }

});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});