import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// Inicializar OpenAI con variable de entorno
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Webhook que llama ManyChat
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 Body recibido:", JSON.stringify(req.body));

    // ManyChat envía el texto aquí
    const userMessage = String(req.body?.question || "").trim();

    // Si el mensaje viene vacío (emoji, sticker, system event, etc.)
    if (!userMessage || userMessage.trim() === "") {
      return res.status(200).json({
        reply: "¿En qué puedo ayudarte? 😊",
      });
    }

    // Llamada a OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    // Respuesta para ManyChat
    res.status(200).json({
      reply: answer,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(200).json({
      reply: "Ocurrió un error, intenta de nuevo 🙏",
    });
  }
});

// Puerto requerido por Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Webhook activo en puerto ${PORT}`);
});
