const express = require("express");
const app = express();

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.get("/ping", (req, res) => {
  res.json({ alive: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});
