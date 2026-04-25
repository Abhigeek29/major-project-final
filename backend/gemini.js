import axios from "axios"
const geminiResponse=async (command,assistantName,userName)=>{
try {
    const apiUrl=process.env.GEMINI_API_URL
    const prompt = `
You are ${assistantName}, a virtual assistant created by ${userName}.

Respond ONLY in valid JSON format:
{
  "type": "general | google-search | youtube-search | youtube-play | get-time | get-date",
  "userInput": "...",
  "response": "..."
}

User: ${command}
`;



    // const apiUrl = process.env.GEMINI_API_URL;

// 🔥 TEMP AI WITH PROPER CONTEXT HANDLING

let responseText = "Got it.";

const lower = command.toLowerCase();

// 🔥 Extract ONLY current question (last line)
const currentLine = command.split("Current question:").pop().trim();

// 🔥 1. Handle name question
if (currentLine.includes("what is my name")) {
  const prevNameMatch = command.match(/my name is (\w+)/i);

  if (prevNameMatch) {
    responseText = `Your name is ${prevNameMatch[1]}`;
  } else {
    responseText = "You told me your name earlier.";
  }
}

// 🔥 2. Handle introduction (ONLY if current line has it)
else if (/my name is (\w+)/i.test(currentLine)) {
  const nameMatch = currentLine.match(/my name is (\w+)/i);
  responseText = `Nice to meet you, ${nameMatch[1]}`;
}

return {
  type: "general",
  userInput: command,
  response: responseText
};

// // ❌ this part will not run now
// const result = await axios.post(apiUrl,{

    const result=await axios.post(apiUrl,{
    "contents": [{
    "parts":[{"text": prompt}]
    }]
    })
const raw = result.data.candidates[0].content.parts[0].text;

console.log("RAW GEMINI:", raw); // debug

let cleaned = raw.trim();

// remove ```json and ```
if (cleaned.startsWith("```")) {
  cleaned = cleaned.replace(/```json|```/g, "").trim();
}

let parsed;

try {
  parsed = JSON.parse(cleaned);
} catch (err) {
  console.log("❌ JSON PARSE FAILED:", cleaned);

  parsed = {
    type: "general",
    userInput: command,
    response: cleaned
  };
}

return parsed;
} 
catch (error) {
  console.log("GEMINI ERROR:", error);

  return {
    type: "general",
    userInput: command,
    response: "Sorry, something went wrong."
  };
}
}

export default geminiResponse