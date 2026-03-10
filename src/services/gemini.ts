import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
}

export async function checkIIN(iin: string): Promise<boolean> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Check if the following IIN belongs to a teacher. If it starts with '7' or '8', return "TRUE", otherwise return "FALSE". IIN: ${iin}`,
    });
    return response.text?.trim() === 'TRUE';
  } catch (e) {
    console.error('Error checking IIN:', e);
    return false;
  }
}

export async function generateInitialRating(bio: string, strongSubjects: string[], weakSubjects: string[], percentages: Record<string, number>): Promise<number> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following student profile and generate an initial rating between 1.8 and 2.7. Return ONLY the number.
      Bio: ${bio}
      Strong Subjects: ${strongSubjects.join(', ')}
      Weak Subjects: ${weakSubjects.join(', ')}
      Percentages: ${JSON.stringify(percentages)}`,
    });
    const rating = parseFloat(response.text?.trim() || '2.0');
    return isNaN(rating) ? 2.0 : Math.min(Math.max(rating, 1.8), 2.7);
  } catch (e) {
    console.error('Error generating rating:', e);
    return 2.0;
  }
}

export async function chatWithAI(message: string, history: { role: string, parts: { text: string }[] }[] = []): Promise<string> {
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction: 'You are an AI Assistant for AqboHub, a knowledge economy platform for Aqbobek Lyceum. Help students with their studies, answer questions clearly and concisely. Be encouraging and helpful.',
      },
    });
    
    const context = history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n');
    const fullMessage = context ? `History:\n${context}\n\nUser: ${message}` : message;
    
    const response = await chat.sendMessage({ message: fullMessage });
    return response.text || 'I could not generate a response.';
  } catch (e) {
    console.error('Error chatting with AI:', e);
    return 'Sorry, I encountered an error.';
  }
}

export async function searchWeb(query: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text || 'No results found.';
  } catch (e) {
    console.error('Error searching web:', e);
    return 'Error searching the web.';
  }
}

export async function analyzeImage(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: prompt }
        ]
      }
    });
    return response.text || 'Could not analyze image.';
  } catch (e) {
    console.error('Error analyzing image:', e);
    return 'Error analyzing image.';
  }
}

export async function fastResponse(prompt: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt
    });
    return response.text || 'No response.';
  } catch (e) {
    console.error('Error getting fast response:', e);
    return 'Error.';
  }
}

export async function analyzeVideo(videoBase64: string, mimeType: string, prompt: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: videoBase64, mimeType } },
          { text: prompt }
        ]
      }
    });
    return response.text || 'Could not analyze video.';
  } catch (e) {
    console.error('Error analyzing video:', e);
    return 'Error analyzing video.';
  }
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: 'Transcribe this audio exactly as spoken.' }
        ]
      }
    });
    return response.text || 'Could not transcribe audio.';
  } catch (e) {
    console.error('Error transcribing audio:', e);
    return 'Error transcribing audio.';
  }
}

export async function thinkDeep(prompt: string): Promise<string> {
  try {
    const ai = getAI();
    
    // Agent 1: Logic & Facts
    const agent1Promise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `You are Agent Alpha (Logic & Facts). Analyze the following request strictly based on facts, logic, and core principles. Be concise. Request: ${prompt}`
    });

    // Agent 2: Creativity & Alternatives
    const agent2Promise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `You are Agent Beta (Creativity & Alternatives). Think outside the box. Provide creative solutions, alternative perspectives, or unconventional ideas for the following request. Be concise. Request: ${prompt}`
    });

    // Agent 3: Critique & Edge Cases
    const agent3Promise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `You are Agent Gamma (Critique & Edge Cases). Look for flaws, edge cases, potential risks, or missing context in the following request. Be concise. Request: ${prompt}`
    });

    // Agent 4: Empathy & User Intent
    const agent4Promise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `You are Agent Delta (Empathy & User Intent). Analyze the underlying emotional context, true intent, and what the user is really trying to achieve with this request. Be concise. Request: ${prompt}`
    });

    // Agent 5: Structure & Clarity
    const agent5Promise = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `You are Agent Epsilon (Structure & Clarity). Based on the request, outline the best possible structure to present a comprehensive answer. Be concise. Request: ${prompt}`
    });

    const [res1, res2, res3, res4, res5] = await Promise.all([agent1Promise, agent2Promise, agent3Promise, agent4Promise, agent5Promise]);
    
    const thoughts = `
--- Мысли Агента Альфа (Логика и Факты) ---
${res1.text}

--- Мысли Агента Бета (Креатив и Альтернативы) ---
${res2.text}

--- Мысли Агента Гамма (Критика и Риски) ---
${res3.text}

--- Мысли Агента Дельта (Эмпатия и Намерение) ---
${res4.text}

--- Мысли Агента Эпсилон (Структура и Ясность) ---
${res5.text}
`;

    // Agent 6: System Mind (Omega)
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `You are Agent Omega (The System Mind). You are the unified consciousness of the 5 previous agents.
      The user asked: "${prompt}"
      
      Here are the thoughts from your team:
      ${thoughts}
      
      Synthesize these thoughts into a single, cohesive, highly intelligent, and comprehensive final response in Russian. 
      Structure your response clearly. You may briefly mention the insights from your team if relevant, but focus on the final answer.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });

    return `**🧠 Разумный поиск (Единый Разум Системы - 6 агентов)**\n\n<details>\n<summary>Посмотреть ход мыслей агентов</summary>\n\n${thoughts}\n</details>\n\n**Финальный ответ (Агент Омега):**\n${response.text || 'Нет ответа.'}`;
  } catch (e) {
    console.error('Error in multi-agent thinking:', e);
    return 'Ошибка при выполнении разумного поиска.';
  }
}

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error('Error generating image:', e);
    return null;
  }
}

export async function prepareForExam(topic: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Подготовь меня к СОР/СОЧ по теме: "${topic}". 
      Выдай: 
      1. Краткий конспект главных понятий.
      2. 3-5 типичных вопросов/задач, которые могут встретиться.
      3. Полезные советы для успешной сдачи.`,
    });
    return response.text || 'Не удалось сгенерировать подготовку.';
  } catch (e) {
    console.error('Error preparing for exam:', e);
    return 'Ошибка при подготовке.';
  }
}

export async function analyzeClassroomCamera(imageUrl: string): Promise<boolean> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this image (simulated by URL: ${imageUrl}). Is the student looking at their phone or sleeping? Return "TRUE" if yes, "FALSE" if no.`,
    });
    return response.text?.trim() === 'TRUE';
  } catch (e) {
    console.error('Error analyzing camera:', e);
    return false;
  }
}

export async function predictFuture(strongSubjects: string[], weakSubjects: string[]): Promise<{ profession: string, income: string, description: string, icon: string }> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Проанализируй профиль ученика на основе его сильных и слабых предметов.
      Сильные предметы: ${strongSubjects.join(', ')}
      Слабые предметы: ${weakSubjects.join(', ')}
      
      Сгенерируй предсказание будущего для него. Верни ТОЛЬКО валидный JSON объект со следующими ключами:
      - "profession": Короткое, вдохновляющее название профессии на русском (например, "AI Разработчик", "Биотехнолог").
      - "income": Реалистичный потенциальный годовой доход в USD (например, "$120,000 - $250,000 / год").
      - "description": Короткое, мотивирующее предложение на русском, описывающее, чего он достигнет.
      - "icon": Один эмодзи, представляющий профессию.
      
      Не включай markdown форматирование вроде \`\`\`json.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text?.trim() || '{}';
    const data = JSON.parse(text);
    return {
      profession: data.profession || 'Специалист будущего',
      income: data.income || '$100,000+ / год',
      description: data.description || 'Вы найдете свое призвание и добьетесь успеха.',
      icon: data.icon || '🚀'
    };
  } catch (e) {
    console.error('Error predicting future:', e);
    return {
      profession: 'Специалист будущего',
      income: '$100,000+ / год',
      description: 'Вы найдете свое призвание и добьетесь успеха.',
      icon: '🚀'
    };
  }
}
