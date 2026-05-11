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

/**
 * 🔥 CRITICAL: Railway requires dynamic port
 */
const PORT = process.env.PORT;

/**
 * 🔥 HEALTH CHECK (must be FAST or Railway kills container)
 */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * 🔥 TEST ROUTE
 */
app.get("/ping", (req, res) => {
  res.json({ status: "alive" });
});

/**
 * 📊 VIDEO INFO (safe, no heavy processing on main thread)
 */
app.get("/info", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  const ytdlp = spawn("yt-dlp", [
    "--dump-json",
    "--no-playlist",
    url
  ]);

  let output = "";

  ytdlp.stdout.on("data", (data) => {
    output += data.toString();
  });

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp error:", data.toString());
  });

  ytdlp.on("close", () => {
    try {
      const json = JSON.parse(output);

      res.json({
        title: json.title,
        duration: json.duration,
        thumbnail: json.thumbnail,
        platform: json.extractor
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to parse info" });
    }
  });
});

/**
 * 🎥 MP4 DOWNLOAD (best quality)
 */
app.get("/download/mp4", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  const ytdlp = spawn("yt-dlp", [
    "-f",
    "bv*+ba/best",
    "--merge-output-format",
    "mp4",
    "-o",
    "-",
    url
  ]);

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp:", data.toString());
  });

  ytdlp.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).end("Download failed");
    }
  });
});

/**
 * 🎵 MP3 DOWNLOAD (high quality audio)
 */
app.get("/download/mp3", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  const ytdlp = spawn("yt-dlp", [
    "-f",
    "bestaudio",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "-o",
    "-",
    url
  ]);

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", 'attachment; filename="audio.mp3"');

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp:", data.toString());
  });

  ytdlp.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).end("Audio download failed");
    }
  });
});

/**
 * 🎯 SIMPLE UNIVERSAL DOWNLOAD (optional fallback)
 */
app.get("/download", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  const ytdlp = spawn("yt-dlp", [
    "-f",
    "best",
    "-o",
    "-",
    url
  ]);

  res.setHeader("Content-Type", "application/octet-stream");

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp:", data.toString());
  });

  ytdlp.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).end("Download failed");
    }
  });
});

/**
 * 🔥 RAILWAY BINDING (CRITICAL FIX)
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
