import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// memoria simple: subscriber_id → thread_id
const threads = {};

app.post("/webhook", async (req, res) => {
  try {
    const { type, message, image_url, subscriber_id } = req.body;

    if (!subscriber_id) {
      return res.status(400).json({ reply: "Sin subscriber_id" });
    }

    /* ======================
       CASO 1: TEXTO → ASSISTANT
       ====================== */
    if (type === "text") {

      // crear thread si no existe
      if (!threads[subscriber_id]) {
        const thread = await openai.beta.threads.create();
        threads[subscriber_id] = thread.id;
      }

      const threadId = threads[subscriber_id];

      // agregar mensaje del usuario
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });

      // ejecutar assistant
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: ASSISTANT_ID
      });

      // esperar resultado
      let status = "in_progress";
      while (status === "in_progress" || status === "queued") {
        await new Promise(r => setTimeout(r, 1000));
        const runStatus = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
        );
        status = runStatus.status;
      }

      // leer respuesta
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data.find(
        m => m.role === "assistant"
      );

      const answer =
        lastMessage?.content?.[0]?.text?.value ||
        "No pude generar respuesta.";

      return res.json({ reply: answer });
    }

    /* ======================
       CASO 2: IMAGEN → VISIÓN
       ====================== */
    if (type === "image") {

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Clasifica la imagen. Responde solo con: COMPROBANTE, NO_COMPROBANTE o INCIERTO."
              },
              {
                type: "image_url",
                image_url: { url: image_url }
              }
            ]
          }
        ]
      });

      const result =
        response.choices[0].message.content.trim();

      return res.json({ classification: result });
    }

    return res.json({
      reply: "Tipo de mensaje no soportado."
    });

  } catch (error) {
    console.error("ERROR WEBHOOK:", error);
    return res.status(500).json({
      reply: "Error interno del servidor."
    });
  }
});

app.listen(8080, () => {
  console.log("Webhook activo en puerto 8080");
});
