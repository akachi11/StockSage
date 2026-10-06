const express = require("express");
const cors = require("cors");
const chatRouter = require("./routes/chat");
const seedRouter = require("./routes/seed");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/chat", chatRouter);
app.use("/seed", seedRouter);

module.exports = app;
