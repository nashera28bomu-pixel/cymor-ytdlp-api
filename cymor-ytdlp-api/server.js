const express = require("express");
const cors = require("cors");

const { exec } =
require("child_process");

const app = express();

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));

const PORT =
process.env.PORT || 3000;

/* HOME */

app.get("/", (req, res) => {

    res.json({

        status:
        "Cymor yt-dlp API Online",

        owner:
        "Legendary Smiley Cymor"
    });
});

/* DOWNLOAD */

app.post("/download", async (req, res) => {

    try {

        const {
            url
        } = req.body;

        if (!url) {

            return res.status(400).json({

                error:
                "Missing URL"
            });
        }

        const cmd =

        `yt-dlp -f "best" --get-url "${url}"`;

        exec(

            cmd,

            {
                timeout: 120000
            },

            (error, stdout, stderr) => {

                if (error) {

                    console.log(error);

                    return res.status(500).json({

                        success: false,

                        error:
                        "Failed to fetch video"
                    });
                }

                const videoUrl =
                stdout.trim();

                if (!videoUrl) {

                    return res.status(500).json({

                        success: false,

                        error:
                        "No downloadable media found"
                    });
                }

                return res.json({

                    success: true,

                    url: videoUrl
                });
            }
        );

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            error:
            "Server error"
        });
    }
});

/* START */

app.listen(PORT, () => {

    console.log(

        `Cymor yt-dlp API running on ${PORT}`
    );
});
