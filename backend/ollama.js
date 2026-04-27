import axios from "axios";

const ollamaResponse = async (command, assistantName, userName) => {
  try {
    const prompt = `
You are ${assistantName}, a virtual assistant created by ${userName}.

STRICT RULES:
- Respond ONLY in valid JSON
- NO explanations
- NO extra text
- ONLY ONE JSON object

FORMAT:
{
  "type": "general | google-search | youtube-search | youtube-play",
  "userInput": "<clean input>",
  "response": "<short reply>"
}

INTENT RULES:
- "youtube" → youtube-search
- "open youtube" → youtube-play
- "search" → google-search
- otherwise → general

EXAMPLES:

User: open youtube
{"type":"youtube-play","userInput":"youtube","response":"Opening YouTube"}

User: open code with harry on youtube
{"type":"youtube-search","userInput":"code with harry","response":"Searching YouTube"}

User: search react tutorial
{"type":"google-search","userInput":"react tutorial","response":"Searching Google"}

NOW RESPOND:

User: ${command}
`;

    const result = await axios.post("http://localhost:11434/api/generate", {
      model: "phi",
      prompt: prompt,
      stream: false
    });

    const raw = result.data.response.trim();

    console.log("RAW OLLAMA:", raw);

    let parsed;

try {
  // 🔥 EXTRACT JSON FROM RESPONSE
  const jsonMatch = raw.match(/\{[^}]*\}/);

  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error("No JSON found");
  }

} catch (err) {
  console.log("❌ JSON PARSE FAILED:", raw);

  // 🔥 SMART FALLBACK INTENT DETECTION
const lowerRaw = raw.toLowerCase();
const lowerCommand = command.toLowerCase();

let detectedType = "general";

// 🔥 CHECK MODEL OUTPUT
if (lowerRaw.includes("youtube")) {
  detectedType = "youtube-search";
} else if (lowerRaw.includes("google")) {
  detectedType = "google-search";
}

// 🔥 FALLBACK TO USER COMMAND (CRITICAL)
else if (lowerCommand.includes("youtube")) {
  detectedType = "youtube-search";
} else if (lowerCommand.includes("google")) {
  detectedType = "google-search";
}

parsed = {
  type: detectedType,
  userInput: command,
  response: raw.slice(0, 100)
};
}

    return parsed;

  } catch (error) {
    console.log("OLLAMA ERROR:", error);

    throw error; // 🔥 IMPORTANT (for fallback)
  }
};

export default ollamaResponse;