const express = require("express");
const { retrieveRelevantChunks } = require("../lib/retrieval");
const { generateAnswer } = require("../lib/chat");

const router = express.Router();

router.post("/", async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: '"question" is required.' });
  }

  try {
    const chunks = await retrieveRelevantChunks(question);

    if (chunks.length === 0) {
      return res.json({
        answer: "I don't have any information relevant to that question yet.",
        sources: [],
      });
    }

    const answer = await generateAnswer(question, chunks);
    const sources = [...new Set(chunks.map((chunk) => chunk.ticker))];

    res.json({ answer, sources });
  } catch (error) {
    console.error("Chat endpoint failed:", error);
    res.status(500).json({ error: "Something went wrong generating a response." });
  }
});

module.exports = router;
