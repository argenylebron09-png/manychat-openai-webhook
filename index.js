import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/webhook", async (req, res) => {
  try {
    // ✅ LEER EXACTAMENTE LO QUE ENVÍA MANYCHAT
    const userMessage = req.body.question;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userMessage }]
    });

    // ✅ RESPONDER CON EL CAMPO QUE MANYCHAT ESPERA
    res.json({
      answer: response.choices[0].message.content
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en OpenAI" });
  }
});

app.listen(8080, () => {
  console.log("Webhook running on port 8080");
});
