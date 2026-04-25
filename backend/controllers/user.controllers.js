import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
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

    // 🔥 RAG: CONTEXT
    const context = user.history.slice(-5).join("\n");

    const enhancedCommand = `
Previous conversation:
${context}

Current question:
${command}
`;

    const gemResult = await geminiResponse(
      enhancedCommand,
      assistantName,
      userName
    );

    const type = gemResult.type;

    switch (type) {
      case "get-date": {
        const responseText = `current date is ${moment().format("YYYY-MM-DD")}`;

        // 🔥 AVOID STORING DEBUG / CONTEXT
        const cleanResponse = gemResult.response.includes("DEBUG")
          ? "Temporary response"
          : gemResult.response;

        user.history.push(`Assistant: ${cleanResponse}`);
        await user.save();

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
        const cleanResponse = gemResult.response.includes("DEBUG")
          ? "Temporary response"
          : gemResult.response;

        user.history.push(`Assistant: ${cleanResponse}`);
        await user.save();

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