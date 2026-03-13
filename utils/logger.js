const fs = require("fs/promises");
const path = require("path");

const logFile = path.join(__dirname, "../logs/route_log.jsonl");

async function logRequest(data) {

  const logEntry = JSON.stringify(data) + "\n";

  await fs.mkdir(path.dirname(logFile), { recursive: true });
  await fs.appendFile(logFile, logEntry, "utf8");

}

module.exports = { logRequest };