import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =====================================================
   CONFIGURACIÓN DE DOMINIO (CONTROL TOTAL)
   ===================================================== */

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
  "aprendo",
  "principiante",
  "medidas",
  "despiece",
  "electrodomésticos",
  "presentación",
  "ergonomía"
];

function isInDomain(text) {
  const lower = text.toLowerCase();
  return ALLOWED_TOPICS.some(topic => lower.includes(topic));
}

const OUT_OF_DOMAIN_REPLY =
  "Este asistente está enfocado exclusivamente en información sobre el curso de Cocinas Modulares. " +
  "Puedo ayudarte con dudas sobre el contenido, metodología y valor del curso.";

/* =====================================================
   MEMORIA LIGERA POR USUARIO (WHATSAPP)
   ===================================================== */

const memory = {};
const MAX_MEMORY = 6;

/* =====================================================
   WEBHOOK PRINCIPAL
   ===================================================== */

app.post("/webhook", async (req, res) => {
  try {
    const { type, message, image_url, subscriber_id } = req.body;

    if (!subscriber_id) {
      return res.status(400).json({ reply: "Sin subscriber_id" });
    }

    if (!memory[subscriber_id]) {
      memory[subscriber_id] = [];
    }

    /* =========================
       CASO 1: TEXTO
       ========================= */
    if (type === "text") {

      // FILTRO DE DOMINIO (CLAVE)
      if (!isInDomain(message)) {
        return res.json({ reply: OUT_OF_DOMAIN_REPLY });
      }

      // guardar mensaje del usuario
      memory[subscriber_id].push({
        role: "user",
        content: message
      });

      if (memory[subscriber_id].length > MAX_MEMORY) {
        memory[subscriber_id] =
          memory[subscriber_id].slice(-MAX_MEMORY);
      }

      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: memory[subscriber_id]
      });

      const answer =
        response.output_text ||
        "Puedo ayudarte con información del curso.";

      // guardar respuesta del bot
      memory[subscriber_id].push({
        role: "assistant",
        content: answer
      });

      if (memory[subscriber_id].length > MAX_MEMORY) {
        memory[subscriber_id] =
          memory[subscriber_id].slice(-MAX_MEMORY);
      }

      return res.json({ reply: answer });
    }

    /* =========================
       CASO 2: IMAGEN (COMPROBANTE)
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
                  "Clasifica la imagen. Responde SOLO con una de estas opciones: COMPROBANTE, NO_COMPROBANTE o INCIERTO."
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

    /* =========================
       CASO NO SOPORTADO
       ========================= */
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
