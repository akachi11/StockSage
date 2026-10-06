const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../config/env");

const CHAT_MODEL = "gemini-3.1-flash-lite";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CHAT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    grounded: {
      type: SchemaType.BOOLEAN,
      description: "true only if the answer is fully supported by the provided context.",
    },
    answer: { type: SchemaType.STRING },
  },
  required: ["grounded", "answer"],
};

const SYSTEM_INSTRUCTION = `You are StockSage, an assistant that answers questions about investable assets.
You will be given a block of verified context and a question. Decide whether the context is actually sufficient to answer the question:
- If it is: answer using only facts from the context, cite the ticker symbol, and explain your reasoning in 2-4 sentences citing the specific facts that support it. Set grounded to true.
- If it is not (the context is empty, off-topic, or simply doesn't cover what's asked): say so in one short natural sentence, then answer as best you can from your own general knowledge in 2-4 more sentences. Set grounded to false. Never present that general-knowledge part as verified data.`;

function buildPrompt(question, chunks) {
  if (chunks.length === 0) {
    return `Context: (none available)\n\nQuestion: ${question}`;
  }

  const context = chunks.map((chunk, i) => `[${i + 1}] (${chunk.ticker}) ${chunk.content}`).join("\n");
  return `Context:\n${context}\n\nQuestion: ${question}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isOverloaded = error.status === 503;
      if (!isOverloaded || attempt === retries) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
}

async function generateAnswer(question, chunks) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CHAT_RESPONSE_SCHEMA,
    },
  });

  const prompt = buildPrompt(question, chunks);

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  });
}

module.exports = { generateAnswer, CHAT_MODEL };
