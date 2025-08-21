// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Создаём клиент OpenAI с ключом из переменной окружения
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /ai
app.post('/ai', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // или 'gpt-4', если есть доступ
      messages: [{ role: 'user', content: message }],
    });

    const aiResponse = completion.choices[0].message.content;
    res.json({ response: aiResponse });
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
