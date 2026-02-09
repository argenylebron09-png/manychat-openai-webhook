import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
   CONFIGURACIÓN DEL FILTRO
================================ */

const ALLOWED_KEYWORDS = [
  "curso",
  "clases",
  "precio",
  "costo",
  "pago",
  "inscripción",
  "inscribir",
  "horario",
  "fecha",
  "inicio",
  "duración",
  "certificado",
  "modalidad",
  "reserva",
  "cupo",
  "programa",
  "contenido"
];

const REJECTION_MESSAGE =
  "Solo puedo ayudarte con información relacionada al curso, precios, fechas o inscripción.";

/* ===============================
   PROMPT DEL CURSO (ÚNICO)
================================ */

const SYSTEM_PROMPT = `
Eres un asistente EXCLUSIVO del curso.

REGLAS OBLIGATORIAS:
- SOLO respondes preguntas sobre el curso.
- NO respondas preguntas generales, científicas ni curiosidades.
- Si la pregunta no es del curso, responde EXACTAMENTE:
"${REJECTION_MESSAGE}"
- Defiende el valor del curso si cuestionan el precio.
- Sé claro, profesional y orientado a ventas.
- No inventes información fuera del programa del curso.
`;

/* ===============================
   WEBHOOK
================================ */

app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.message || "";

    const normalized = userMessage.toLowerCase();

    const isAllowed = ALLOWED_KEYWORDS.some(keyword =>
      normalized.includes(keyword)
    );

    // 🔒 BLOQUEO TOTAL
    if (!isAllowed) {
      return res.json({
        reply: REJECTION_MESSAGE
      });
    }

    // ✅ SOLO SI PASA EL FILTRO ENTRA A OPENAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    return res.json({
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      reply: "Ocurrió un error. Intenta nuevamente."
    });
  }
});

/* ===============================
   SERVIDOR
================================ */

app.listen(8080, () => {
  console.log("Webhook activo con FILTRO DURO en puerto 8080");
});
