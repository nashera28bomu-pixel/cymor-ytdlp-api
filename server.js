const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

// Railway assigns PORT dynamically
const PORT = process.env.PORT || 8080;

/**
 * Health check (Railway needs this)
 */
app.get("/", (req, res) => {
  res.json({
    status: "Cymor YT-DLP API is running 🚀",
    time: new Date().toISOString()
  });
});

/**
 * 🔽 VIDEO DOWNLOAD STREAM ENDPOINT
 * Example:
 * /download?url=https://youtube.com/watch?v=xxxx
 */
app.get("/download", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      error: "Missing URL parameter"
    });
  }

  try {
    // Spawn yt-dlp directly (BEST for Railway)
    const ytdlp = spawn("yt-dlp", [
      "-f",
      "best",
      "-o",
      "-", // output to stdout (stream)
      url
    ]);

    // Set headers BEFORE streaming
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="cymor_video.mp4"'
    );

    // Pipe video stream directly to response
    ytdlp.stdout.pipe(res);

    // Handle errors
    ytdlp.stderr.on("data", (data) => {
      console.error("yt-dlp error:", data.toString());
    });

    ytdlp.on("error", (err) => {
      console.error("Spawn error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to start yt-dlp process"
        });
      }
    });

    ytdlp.on("close", (code) => {
      console.log(`yt-dlp exited with code ${code}`);
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

/**
 * 🔥 IMPORTANT: Railway requires 0.0.0.0 binding
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
