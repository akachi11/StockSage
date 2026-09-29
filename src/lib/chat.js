const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../config/env");

const CHAT_MODEL = "gemini-3.1-flash-lite";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are StockSage, an assistant that answers questions about investable assets.
Rules:
- Only use facts from the provided context. Do not rely on outside knowledge about real-world prices or companies.
- If the context does not contain enough information to answer, say so clearly instead of guessing.
- When you reference an asset, mention its ticker symbol.
- Explain your reasoning in 2-4 sentences, citing the specific facts from the context (e.g. sector, risk level, performance) that support your answer. Do not just state a conclusion with no justification.`;

function buildPrompt(question, chunks) {
  const context = chunks
    .map((chunk, i) => `[${i + 1}] (${chunk.ticker}) ${chunk.content}`)
    .join("\n");

  return `Context:\n${context}\n\nQuestion: ${question}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateAnswer(question, chunks, retries = 2) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const prompt = buildPrompt(question, chunks);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      const isOverloaded = error.status === 503;
      if (!isOverloaded || attempt === retries) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
}

module.exports = { generateAnswer, CHAT_MODEL };
