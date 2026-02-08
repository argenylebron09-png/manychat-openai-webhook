import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// 🔑 Lee la variable correctamente
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check (Railway lo necesita)
app.get("/", (req, res) => {
  res.send("Webhook OK");
});

// Webhook para ManyChat
app.post("/webhook", async (req, res) => {
  try {
    const { message, user_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un asistente para WhatsApp, responde corto y claro." },
        { role: "user", content: message }
      ]
    });

    const reply = response.choices[0].message.content;

    res.json({
      reply,
      user_id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal error" });
  }
});

// 🚀 Railway usa PORT automáticamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
