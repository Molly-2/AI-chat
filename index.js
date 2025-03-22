const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;

// System prefix message
const SYSTEM_PREFIX_MESSAGE = "🌐 System prefix: ,\n🛸 Your box chat prefix: ,";

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      return res.status(400).send({ error: "Prompt is required" });
    }

    // If user types "prefix", respond with the system prefix message
    if (prompt.toLowerCase() === "prefix") {
      return res.send({ message: SYSTEM_PREFIX_MESSAGE });
    }

    // AI Response (if prompt is NOT "prefix")
    const cacheBuster = Date.now();
    const response = await axios.get(
      `https://over-ai-yau-5001-center-hassan.vercel.app/ai?prompt=${encodeURIComponent(prompt)}&cb=${cacheBuster}`
    );

    if (response.status !== 200 || !response.data || !response.data.response) {
      throw new Error("Failed to get a response from AI");
    }

    const messageText = response.data.response;

    // Check for image URLs in the response
    const urls = messageText.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif)/gi);
    if (urls && urls.length > 0) {
      const imagePaths = [];
      for (let i = 0; i < urls.length && i < 6; i++) {
        const imageUrl = urls[i];
        const imageFileName = `image_${Date.now()}_${i + 1}.jpg`;
        const imagePath = path.join(__dirname, "public", imageFileName);
        imagePaths.push(`/${imageFileName}`);

        // Download the image
        const imageResponse = await axios({ url: imageUrl, responseType: "stream" });
        await new Promise((resolve, reject) => {
          imageResponse.data.pipe(fs.createWriteStream(imagePath))
            .on("finish", resolve)
            .on("error", reject);
        });
      }
      return res.send({ message: "HERE ARE YOUR IMAGES ✅", images: imagePaths });
    }

    // Send AI-generated response
    res.send({ message: messageText });

  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).send({ error: "Failed to get AI response" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
