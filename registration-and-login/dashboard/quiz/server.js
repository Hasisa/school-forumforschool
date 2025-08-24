import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();

// Настройка CORS для фронтенда Firebase
const corsOptions = {
  origin: 'https://educonnect-958e2.web.app', // твой фронт
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Preflight-запросы
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://educonnect-958e2.web.app');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.sendStatus(204);
});

// Чтобы Express понимал JSON
app.use(express.json());

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Проверка сервера
app.get('/', (req, res) => {
  res.send('✅ Server is running!');
});

// Эндпоинт генерации теста
app.post('/generate-quiz', async (req, res) => {
  const { material, questionCount } = req.body;

  if (!material || !questionCount) {
    return res.status(400).json({ error: 'Material and questionCount are required' });
  }

  try {
    const prompt = `
      Create ${questionCount} multiple-choice questions based on the following study material.
      Each question must have 4 answers and mark the correct one.
      Format the response as a JSON array like this:
      [{ "text": "...", "answers": ["...", "...", "...", "..."], "correctAnswer": 0 }]
      
      Study material:
      ${material}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const text = response.choices[0].message.content;

    let questions;
    try {
      questions = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    res.json({ questions });

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
