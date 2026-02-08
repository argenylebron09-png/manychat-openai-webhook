import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/webhook", async (req, res) => {
  try {
    const { message, user_name } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message received" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente del curso de Cocinas Modulares en SketchUp. Responde claro, breve y profesional."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "OpenAI error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Webhook running on port", PORT);
});
