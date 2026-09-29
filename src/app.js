const express = require("express");
const cors = require("cors");
const chatRouter = require("./routes/chat");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/chat", chatRouter);

module.exports = app;
