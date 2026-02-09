import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// Memoria por usuario (en RAM, simple y estable)
const threads = {};

app.post("/webhook", async (req, res) => {
  try {
    const userMessage =
      req.body.message ||
      req.body.text ||
      req.body.last_input_text ||
      "";

    const userId =
      req.body.subscriber_id ||
      req.body.contact_id ||
      "anonymous";

    if (!userMessage.trim()) {
      return res.json({
        reply: "Solo puedo responder consultas relacionadas con el curso."
      });
    }

    // 1️⃣ Crear thread si no existe
    if (!threads[userId]) {
      const thread = await openai.beta.threads.create();
      threads[userId] = thread.id;
    }

    const threadId = threads[userId];

    // 2️⃣ Enviar mensaje del usuario al thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage,
    });

    // 3️⃣ Ejecutar el asistente
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    // 4️⃣ Esperar a que termine
    let runStatus;
    do {
      await new Promise(r => setTimeout(r, 800));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    // 5️⃣ Obtener respuesta del asistente
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data.find(m => m.role === "assistant");

    const reply =
      lastMessage?.content?.[0]?.text?.value ||
      "Solo puedo ayudarte con información del curso.";

    res.json({ reply });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      reply: "Ocurrió un error. Intenta nuevamente."
    });
  }
});

app.listen(8080, () => {
  console.log("Webhook activo usando SOLO el asistente");
});
