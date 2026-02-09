import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// Cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 👉 Assistant ID desde Railway Variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// 🧠 Threads por usuario (memoria por alumno)
const userThreads = new Map();

app.post("/webhook", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const userId = req.body?.user_id || "anonymous";
    const isStudent =
      req.body?.is_student === true ||
      req.body?.is_student === "true";

    // Mensaje vacío (emoji, evento, etc.)
    if (!message) {
      return res.status(200).json({
        reply: "¿En qué puedo ayudarte? 😊"
      });
    }

    // Si NO es alumno confirmado
    if (!isStudent) {
      return res.status(200).json({
        reply: "Para acceder al soporte del curso debes ser alumno confirmado."
      });
    }

    // Obtener o crear thread del alumno
    let threadId = userThreads.get(userId);

    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      userThreads.set(userId, threadId);
    }

    // Agregar mensaje del usuario al thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // Ejecutar el Assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    // Esperar a que el Assistant termine
    let runStatus;
    do {
      await new Promise(r => setTimeout(r, 500));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    // Obtener la última respuesta del Assistant
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastAssistantMessage = messages.data.find(
      m => m.role === "assistant"
    );

    const answer =
      lastAssistantMessage?.content?.[0]?.text?.value ||
      "No pude generar una respuesta.";

    return res.status(200).json({
      reply: answer
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(200).json({
      reply: "Ocurrió un error, intenta de nuevo 🙏"
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Webhook con Assistant activo en puerto", PORT);
});
