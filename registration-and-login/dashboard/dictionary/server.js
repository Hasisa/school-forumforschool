import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: "https://educonnect-958e2.web.app",
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));

app.use(express.json());

// Проверка сервера
app.get("/", (req, res) => {
  res.send("✅ Server is running");
});

// Эндпоинт AI объяснения
app.post("/api/ai-explain", async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ error: "Term is required" });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Explain "${term}" strictly as JSON:
{
  "term": "${term}",
  "definition": "...",
  "formula": "...",
  "relatedTerms": ["..."]
}`
      }]
    });

    const content = response.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch {
      res.json({ term, definition: content, formula: null, relatedTerms: [] });
    }
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI explanation failed" });
  }
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
