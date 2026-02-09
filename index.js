import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
Eres un asistente EXCLUSIVO del curso.

REGLAS:
- SOLO respondes sobre el curso.
- Si la pregunta NO es del curso, responde:
  "Solo puedo ayudarte con información del curso."
- NO des datos generales.
- NO respondas ciencia, curiosidades, etc.
- Defiende el valor del curso si cuestionan el precio.
`;

app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.message || "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    const reply = response.choices[0].message.content;

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply: "Error interno. Intenta nuevamente."
    });
  }
});

app.listen(8080, () => {
  console.log("Webhook activo en puerto 8080");
});
