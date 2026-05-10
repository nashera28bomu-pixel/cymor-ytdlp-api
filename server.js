const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        status: "Cymor yt-dlp API Online"
    });
});

app.post("/download", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                error: "Missing URL"
            });
        }

        // Updated command to use 'python' instead of 'python3' 
        // to match the Nixpacks environment settings.
        const command = `python -m yt_dlp -f best --get-url "${url}"`;

        exec(
            command,
            {
                timeout: 120000 // 2 minutes
            },
            (error, stdout, stderr) => {
                if (error) {
                    console.error("Exec Error:", error);
                    console.error("Stderr:", stderr);

                    return res.status(500).json({
                        error: "yt-dlp failed",
                        details: stderr
                    });
                }

                const videoUrl = stdout.trim();

                if (!videoUrl) {
                    return res.status(500).json({
                        error: "No media found"
                    });
                }

                return res.json({
                    success: true,
                    url: videoUrl
                });
            }
        );

    } catch (err) {
        console.error("Catch Error:", err);
        return res.status(500).json({
            error: "Server error"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
