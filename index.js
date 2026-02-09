import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// memoria simple por usuario (RAM)
const threads = {};

app.post("/webhook", async (req, res) => {
  try {
    const { subscriber_id, message } = req.body;

    if (!subscriber_id || !message) {
      return res.json({ reply: "Mensaje inválido." });
    }

    // crear thread por usuario
    if (!threads[subscriber_id]) {
      const thread = await openai.beta.threads.create();
      threads[subscriber_id] = thread.id;
    }

    const threadId = threads[subscriber_id];

    // enviar mensaje al assistant
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // ejecutar assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });

    // esperar respuesta
    let status;
    do {
      await new Promise(r => setTimeout(r, 1000));
      const check = await openai.beta.threads.runs.retrieve(threadId, run.id);
      status = check.status;
    } while (status !== "completed");

    // obtener respuesta
    const messages = await openai.beta.threads.messages.list(threadId);
    const last = messages.data.find(m => m.role === "assistant");

    res.json({
      reply: last?.content?.[0]?.text?.value || "No tengo respuesta en este momento."
    });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Ocurrió un error. Intenta nuevamente." });
  }
});

app.listen(8080, () => {
  console.log("Assistant webhook activo");
});
