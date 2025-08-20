import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const HF_API_TOKEN = process.env.HF_API_TOKEN?.trim();
const HF_MODEL = 'meta-llama/Llama-2-7b-chat-hf';
const PORT = process.env.PORT || 3000;

// Проверка сервера
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// POST для общения с AI
app.post('/ai', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    console.log('Sending message to HF API:', message);

    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [
          { role: "system", content: "Ты полезный AI-ассистент." },
          { role: "user", content: message }
        ],
        parameters: {
          max_new_tokens: 256
        }
      })
    });

    const data = await response.json();
    console.log('HF raw response:', data);

    let aiText = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      aiText = data[0].generated_text;
    } else if (data?.generated_text) {
      aiText = data.generated_text;
    } else if (data?.error) {
      aiText = `HF API Error: ${data.error}`;
    } else {
      aiText = 'Извините, я не смог ответить.';
    }

    res.json({ response: aiText });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
