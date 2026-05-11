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

const PORT = process.env.PORT || 8080;

/**
 * 🔥 HEALTH CHECK (Railway required)
 */
app.get("/", (req, res) => {
  res.json({
    status: "Cymor Downloader API Online 🚀",
    time: new Date().toISOString()
  });
});

/**
 * 📊 GET VIDEO INFO (platform detection happens here)
 * Useful for frontend preview
 */
app.get("/info", async (req, res) => {
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
        platform: json.extractor,
        formats: json.formats?.length || 0
      });
    } catch (err) {
      res.status(500).json({
        error: "Failed to parse video info"
      });
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
    "bv*+ba/best", // best video + audio
    "--merge-output-format",
    "mp4",
    "-o",
    "-",
    url
  ]);

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="cymor_video.mp4"'
  );

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp:", data.toString());
  });

  ytdlp.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed" });
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
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="cymor_audio.mp3"'
  );

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp:", data.toString());
  });

  ytdlp.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Audio download failed" });
    }
  });
});

/**
 * 🔥 RAILWAY BINDING (VERY IMPORTANT)
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
