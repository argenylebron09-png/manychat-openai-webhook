import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

/* ================================
   CONTROL DE DOMINIO
================================ */

const ALLOWED_TOPICS = [
  "curso",
  "cocina",
  "cocinas",
  "cocinas modulares",
  "sketchup",
  "diseño",
  "fabricar",
  "fabricación",
  "muebles",
  "módulos",
  "precio",
  "costo",
  "vale la pena",
  "duración",
  "principiante",
  "medidas",
  "despiece",
  "ergonomía"
];

function isInDomain(text) {
  const lower = text.toLowerCase();
  return ALLOWED_TOPICS.some(topic => lower.includes(topic));
}

const OUT_OF_DOMAIN_REPLY =
  "Este asistente está enfocado exclusivamente en información sobre el curso de Cocinas Modulares. " +
  "Puedo ayudarte con dudas sobre el contenido, metodología y valor del curso.";

/* ================================
   THREADS = MEMORIA REAL
================================ */

const threads = {}; // subscriber_id → thread_id

/* ================================
   WEBHOOK
================================ */

app.post("/webhook", async (req, res) => {
  try {
    const { type, message, image_url, subscriber_id } = req.body;

    if (!subscriber_id) {
      return res.status(400).json({ reply: "Sin subscriber_id" });
    }

    /* =========================
       TEXTO → ASSISTANT
       ========================= */
    if (type === "text") {

      // 1️⃣ FILTRO DE DOMINIO (CLAVE)
      if (!isInDomain(message)) {
        return res.json({ reply: OUT_OF_DOMAIN_REPLY });
      }

      // 2️⃣ CREAR THREAD SI NO EXISTE
      if (!threads[subscriber_id]) {
        const thread = await openai.beta.threads.create();
        threads[subscriber_id] = thread.id;
      }

      const threadId = threads[subscriber_id];

      // 3️⃣ MENSAJE DEL USUARIO
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });

      // 4️⃣ EJECUTAR ASSISTANT
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: ASSISTANT_ID
      });

      // 5️⃣ ESPERAR RESPUESTA
      let status = "queued";
      while (status === "queued" || status === "in_progress") {
        await new Promise(r => setTimeout(r, 1000));
        const runStatus = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
        );
        status = runStatus.status;
      }

      // 6️⃣ LEER RESPUESTA
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastAssistantMessage = messages.data.find(
        m => m.role === "assistant"
      );

      const answer =
        lastAssistantMessage?.content?.[0]?.text?.value ||
        "Puedo ayudarte con información del curso.";

      return res.json({ reply: answer });
    }

    /* =========================
       IMAGEN → VISIÓN (SEPARADO)
       ========================= */
    if (type === "image") {

      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Clasifica la imagen. Responde SOLO con: COMPROBANTE, NO_COMPROBANTE o INCIERTO."
              },
              {
                type: "input_image",
                image_url: image_url
              }
            ]
          }
        ]
      });

      const result =
        response.output_text?.trim() || "INCIERTO";

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
