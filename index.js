import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// memoria simple por usuario
const memory = {};

app.post("/webhook", async (req, res) => {
  try {
    const { type, message, image_url, subscriber_id } = req.body;

    if (!subscriber_id) {
      return res.status(400).json({ reply: "Sin subscriber_id" });
    }

    if (!memory[subscriber_id]) {
      memory[subscriber_id] = [];
    }

    /* ======================
       CASO 1: TEXTO NORMAL
       ====================== */
    if (type === "text") {
      console.log("MENSAJE TEXTO:", message);

      memory[subscriber_id].push({
        role: "user",
        content: message
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: memory[subscriber_id]
      });

      const answer = response.choices[0].message.content;

      memory[subscriber_id].push({
        role: "assistant",
        content: answer
      });

      return res.json({ reply: answer });
    }

    /* ======================
       CASO 2: IMAGEN (COMPROBANTE)
       ====================== */
    if (type === "image") {
      console.log("IMAGEN RECIBIDA:", image_url);

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

      const result = response.choices[0].message.content.trim();

      console.log("RESULTADO IMAGEN:", result);

      return res.json({
        classification: result
      });
    }

    /* ======================
       CASO NO SOPORTADO
       ====================== */
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
