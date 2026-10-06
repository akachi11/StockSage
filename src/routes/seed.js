const express = require("express");
const { seedAsset } = require("../lib/seedAsset");

const router = express.Router();

router.post("/:ticker", async (req, res) => {
  const { ticker } = req.params;

  if (!ticker || !/^[A-Za-z.]{1,10}$/.test(ticker)) {
    return res.status(400).json({ error: "A valid stock ticker is required." });
  }

  try {
    const result = await seedAsset(ticker);
    res.json(result);
  } catch (error) {
    console.error("Seed endpoint failed:", error);
    res.status(422).json({ error: error.message || "Failed to gather data for that ticker." });
  }
});

module.exports = router;
