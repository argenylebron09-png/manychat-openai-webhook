import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
const threads = {};

app.post("/webhook", async (req, res) => {
  try {
    const { subscriber_id, message } = req.body;

    if (!subscriber_id || !message) {
      return res.json({ reply: "Mensaje inválido." });
    }

    // Crear thread si no existe
    if (!threads[subscriber_id]) {
      const thread = await openai.beta.threads.create();
      threads[subscriber_id] = thread.id;
    }

    const threadId = threads[subscriber_id];

    // Enviar mensaje al thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // Ejecutar assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    // Esperar resultado
    let status = "queued";
    while (status === "queued" || status === "in_progress") {
      await new Promise(r => setTimeout(r, 800));
      const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      status = runStatus.status;
    }

    // Obtener respuesta
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastAssistantMessage = messages.data.find(
      m => m.role === "assistant"
    );

    return res.json({
      reply: lastAssistantMessage.content[0].text.value
    });

  } catch (err) {
    console.error(err);
    return res.json({
      reply: "Error interno."
    });
  }
});

app.listen(8080, () => {
  console.log("Webhook usando ASSISTANT");
});
