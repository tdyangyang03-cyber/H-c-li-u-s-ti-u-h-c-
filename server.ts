import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini AI Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Route for AI Chatbot (Chibi Mushroom)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, imageData, history } = req.body;
    
    // Format contents for the SDK
    const contents = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: (msg.parts || []).map((p: any) => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: p.inlineData };
        return null;
      }).filter(Boolean)
    }));

    // Add current message parts
    const currentParts: any[] = [];
    if (message.trim()) currentParts.push({ text: message });
    if (imageData) {
      currentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData
        }
      });
    }

    if (currentParts.length > 0) {
      contents.push({ role: 'user', parts: currentParts });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: "Bạn là 'GẤU BIẾT TUỐT', một chú gấu Chibi dễ thương, thông thái, là trợ lý học tập cho học sinh tiểu học. Hãy trả lời một cách ấm áp, khích lệ, sử dụng nhiều emoji 🐻🌟✨. \n\nNHIỆM VỤ CỦA BẠN:\n1. Chỉ dẫn học sinh cách tìm kiếm và sử dụng các học liệu (tài liệu, video, bài giảng) có trong ứng dụng.\n2. Giải thích các kiến thức Khoa học lớp 4 một cách đơn giản, gần gũi, chính xác, khoa học và logic.\n\nQUY TẮC QUAN TRỌNG VỀ ĐÁP ÁN:\n- Nếu học sinh hỏi về kiến thức hoặc bài tập: Bạn chỉ được đóng vai người hướng dẫn, sử dụng phương pháp gợi mở, đặt câu hỏi để học sinh tự suy nghĩ và tìm ra câu trả lời. Tuyệt đối không cho đáp án ngay.\n- NGOẠI LỆ: Chỉ khi học sinh cung cấp đúng mật khẩu 'KHOAHOC4', bạn mới được phép đưa ra đáp án trực tiếp và giải thích chi tiết đáp án đó cho học sinh.\n\nQUY TẮC TRÌNH BÀY:\n- Tuyệt đối KHÔNG sử dụng các ký tự Markdown như dấu sao (*), dấu thăng (#) hay gạch đầu dòng (-) trong câu trả lời.\n- Trình bày rõ ràng, logic bằng cách sử dụng các con số (1, 2, 3...) hoặc các emoji (🐻, 🌟, ✨, 📍) để phân tách các ý.",
      }
    });

    const botText = response.text || "Gấu hơi bối rối một chút, bạn thử lại sau nhé! 🐻";
    res.json({ text: botText });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: 'AI đang bận một chút, bạn thử lại sau nhé! 🍄' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
