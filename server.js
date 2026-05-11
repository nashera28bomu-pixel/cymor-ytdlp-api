const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { spawn } = require("child_process");

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());

// 🔥 MUST HAVE FALLBACK PORT
const PORT = process.env.PORT || 3000;

// 🔥 SUPER FAST HEALTH CHECK
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.get("/ping", (req, res) => {
  res.json({ ok: true });
});

// 🎥 TEST DOWNLOAD
app.get("/download", (req, res) => {
  const url = req.query.url;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  const ytdlp = spawn("yt-dlp", ["-f", "best", "-o", "-", url]);

  res.setHeader("Content-Type", "application/octet-stream");

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", d => {
    console.error(d.toString());
  });

  ytdlp.on("error", err => {
    console.error(err);
    if (!res.headersSent) res.status(500).end("Failed");
  });
});

// 🔥 RAILWAY BINDING
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
