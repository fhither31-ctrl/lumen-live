import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, openai: !!process.env.OPENAI_API_KEY });
});

app.post("/api/ai", async (req, res) => {
  try {
    const { action, payload, messages } = req.body;

    let prompt = "";

    if (messages) {
      prompt = messages.map(m => m.content).join("\n");
    } else if (action === "splitLyricsToSlides") {
      prompt = `
Divide esta letra en slides para iglesia.
Devuelve SOLO JSON válido así:
{"slides":[{"label":"VERSO 1","text":"texto"},{"label":"CORO","text":"texto"}]}

Letra:
${payload?.text || payload?.lyrics || ""}
`;
    } else if (action === "translateLyrics") {
      prompt = `
Traduce esta letra a ${payload?.targetLanguage || "English"}.
Devuelve SOLO JSON válido así:
{"text":"traducción aquí"}

Texto:
${payload?.text || ""}
`;
    } else {
      prompt = JSON.stringify({ action, payload });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    let content = data.choices?.[0]?.message?.content || "";

    try {
      return res.json(JSON.parse(content));
    } catch {
      return res.json({ text: content });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
