import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 Memoria en RAM por usuario
const userMemory = new Map();

// Configuración
const MAX_MESSAGES = 6; // historial corto (reduce costos)

app.post("/webhook", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const userId = req.body?.user_id || "anonymous";

    if (!message) {
      return res.status(200).json({
        reply: "¿En qué puedo ayudarte? 😊"
      });
    }

    // Obtener historial del usuario
    const history = userMemory.get(userId) || [];

    // Agregar mensaje del usuario
    history.push({ role: "user", content: message });

    // Limitar tamaño del historial
    const trimmedHistory = history.slice(-MAX_MESSAGES);

    // Llamar a OpenAI con contexto
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente útil y claro que responde por WhatsApp."
        },
        ...trimmedHistory
      ]
    });

    const answer = completion.choices[0].message.content;

    // Guardar respuesta del asistente
    trimmedHistory.push({ role: "assistant", content: answer });

    // Guardar memoria actualizada
    userMemory.set(userId, trimmedHistory);

    res.status(200).json({
      reply: answer
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(200).json({
      reply: "Ocurrió un error, intenta de nuevo 🙏"
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Webhook con memoria activo en puerto", PORT);
});
