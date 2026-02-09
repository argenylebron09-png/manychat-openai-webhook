import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// MEMORIA SIMPLE EN RAM (luego DB)
const memory = {};

app.post("/webhook", async (req, res) => {
  try {
    const { type, message, image_url, subscriber_id } = req.body;

    if (!memory[subscriber_id]) {
      memory[subscriber_id] = [];
    }

    let userPrompt = "";

    // TEXTO
    if (type === "text") {
      userPrompt = message;
      memory[subscriber_id].push({ role: "user", content: message });
    }

    // IMAGEN (COMPROBANTE)
    if (type === "image") {
      userPrompt = `
Analiza esta imagen como comprobante de pago.
Verifica:
- Nombre
- Monto
- Fecha
- Método
- Si parece válido o no
Responde claro y profesional.
Imagen: ${image_url}
`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        ...memory[subscriber_id],
        { role: "user", content: userPrompt }
      ]
    });

    const answer = response.choices[0].message.content;

    memory[subscriber_id].push({
      role: "assistant",
      content: answer
    });

    res.json({ reply: answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Ocurrió un error, intenta nuevamente." });
  }
});

app.listen(8080, () => {
  console.log("Webhook activo en puerto 8080");
});
