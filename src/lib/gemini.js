const { GoogleGenerativeAI, TaskType } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../config/env");

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

async function embedText(text, taskType = TaskType.RETRIEVAL_DOCUMENT) {
  const result = await embeddingModel.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType,
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });
  // gemini-embedding-001 only guarantees unit-normalized output at its native
  // 3072 dimensions; truncated outputs (e.g. 768) must be re-normalized.
  return normalize(result.embedding.values);
}

module.exports = { embedText, TaskType, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
