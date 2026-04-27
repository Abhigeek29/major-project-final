import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import ollamaResponse from "../ollama.js";
import User from "../models/user.model.js";
import moment from "moment";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "get current user error" });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage;

    if (req.file) {
      assistantImage = await uploadOnCloudinary(req.file.path);
    } else {
      assistantImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        assistantName,
        assistantImage,
      },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "updateAssistantError user error" });
  }
};

export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;

    const user = await User.findById(req.userId);
    

    user.history = user.history.map(item => {
      if (item.startsWith("User:") || item.startsWith("Assistant:")) {
        return item;
      }
      return `User: ${item}`;
    });

    user.history.push(`User: ${command}`);
    await user.save();
    console.log("HISTORY:", user.history);

    const userName = user.name;
    const assistantName = user.assistantName;

    // 🔥 CLEAN CONTEXT (REMOVE BAD RESPONSES)
const cleanHistory = user.history
  .filter(item => 
    !item.includes("Hi! I'd love to help") &&
    !item.includes("logic game") &&
    !item.includes("transitivity") &&
    !item.includes("chatbot user")
  )
  .slice(-5);

const context = cleanHistory.join("\n");

    const enhancedCommand = `
Previous conversation:
${context}

Current question:
${command}
`;

    let gemResult;

try {
  gemResult = await ollamaResponse(
    enhancedCommand,
    assistantName,
    userName
  );
} catch (err1) {
  console.log("⚠️ Ollama failed, switching to Gemini");

  try {
    gemResult = await geminiResponse(
      enhancedCommand,
      assistantName,
      userName
    );
  } catch (err2) {
    console.log("❌ Gemini also failed");

    gemResult = {
      type: "general",
      userInput: command,
      response: "I'm currently offline, but I can still execute basic commands."
    };
  }
}

    
    // 🔥 SAFETY NORMALIZATION (VERY IMPORTANT)
if (!gemResult.response || typeof gemResult.response !== "string") {
  gemResult.response = "Alright, working on it.";
}

if (!gemResult.userInput || typeof gemResult.userInput !== "string") {
  gemResult.userInput = command;
}
// 🔥 ADD THIS EXACTLY HERE
if (gemResult.userInput.includes("Current question:")) {
  gemResult.userInput = gemResult.userInput
    .split("Current question:")
    .pop()
    .trim();
}
if (!gemResult.type || typeof gemResult.type !== "string") {
  gemResult.type = "general";
}
    const type = gemResult.type;

    switch (type) {
      case "get-date": {
        const responseText = `current date is ${moment().format("YYYY-MM-DD")}`;

        // 🔥 AVOID STORING DEBUG / CONTEXT
        const badPatterns = [
  "Hi! I'd love to help",
  "chatbot user",
  "transitivity",
  "logic game",
  "JSON format",
  "Here's a breakdown",
  "curious user"
];

const isBad =
  badPatterns.some(p => (gemResult.response || "").includes(p)) ||
  gemResult.response.length > 200;

if (!isBad) {
  user.history.push(`Assistant: ${gemResult.response}`);
  await user.save();
} else {
  console.log("⚠️ Skipped storing bad AI response");
}

        return res.json({
          type,
          userInput: gemResult.userInput,
          response: responseText,
        });
      }

      case "get-time": {
        const responseText = `current time is ${moment().format("hh:mm A")}`;

        user.history.push(`Assistant: ${responseText}`);
        await user.save();

        return res.json({
          type,
          userInput: gemResult.userInput,
          response: responseText,
        });
      }

      case "get-day": {
        const responseText = `today is ${moment().format("dddd")}`;

        user.history.push(`Assistant: ${responseText}`);
        await user.save();

        return res.json({
          type,
          userInput: gemResult.userInput,
          response: responseText,
        });
      }

      case "get-month": {
        const responseText = `this month is ${moment().format("MMMM")}`;

        user.history.push(`Assistant: ${responseText}`);
        await user.save();

        return res.json({
          type,
          userInput: gemResult.userInput,
          response: responseText,
        });
      }

      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "weather-show":

        // 🔥 AVOID STORING DEBUG / CONTEXT (FIX APPLIED HERE)
        // 🔥 FILTER BAD RESPONSES BEFORE STORING
const badPatterns = [
  "Hi! I'd love to help",
  "chatbot user",
  "transitivity",
  "logic game",
  "JSON format",
  "Here's a breakdown",
  "curious user"
];

const safeResponse = gemResult.response || "";

const isBad =
  badPatterns.some(p => safeResponse.includes(p)) ||
  safeResponse.length > 200;

if (!isBad) {
  user.history.push(`Assistant: ${gemResult.response}`);
  await user.save();
} else {
  console.log("⚠️ Skipped storing bad AI response");
}
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: gemResult.response,
        });

      default:
        return res.status(400).json({
          response: "I didn't understand that command.",
        });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      response: "ask assistant error",
    });
  }
};