import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const threads = {};

app.post("/webhook", async (req, res) => {
  try {
    const { subscriber_id, message } = req.body;

    if (!subscriber_id || !message) {
      return res.json({ reply: "Mensaje inválido." });
    }

    if (!threads[subscriber_id]) {
      const thread = await openai.beta.threads.create();
      threads[subscriber_id] = thread.id;
    }

    const threadId = threads[subscriber_id];

    console.log("USANDO ASSISTANT:", process.env.OPENAI_ASSISTANT_ID);

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });

    let status;
    do {
      await new Promise(r => setTimeout(r, 800));
      const check = await openai.beta.threads.runs.retrieve(threadId, run.id);
      status = check.status;
    } while (status !== "completed");

    const messages = await openai.beta.threads.messages.list(threadId);
    const lastAssistantMessage = messages.data.find(
      m => m.role === "assistant"
    );

    res.json({
      reply: lastAssistantMessage.content[0].text.value
    });

  } catch (error) {
    console.error(error);
    res.json({
      reply: "Ocurrió un error. Intenta nuevamente."
    });
  }
});

app.listen(8080, () => {
  console.log("Webhook activo usando SOLO el Assistant");
});
