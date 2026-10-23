# Demo video and gallery scripts

How `docs/media/common-ground-demo.mp4` and `docs/media/gallery/*` were made. Free tools only: Playwright (Chromium), ffmpeg and faster-whisper.

1. **Record** (`rec3.js`, `rec4.js`): drives the live app on a 390×844 phone viewport through Chrome's screencast, shows taps as ripples, and logs a focus box (what's being talked about) for every step to `<clip>.focus.json`. `rec4.js` runs two phones at once for the "apart" and "swipe" scenes.
2. **Layers** (`layers2.js`): renders the 4K backgrounds, phone bezels and 1080p caption strips from `script.json` and `geometry.json`.
3. **Voice:** the narration is Lindokuhle's own recording. It was transcribed with faster-whisper for word timings, cleaned with ffmpeg (high-pass, noise reduction, compression, loudness at -16 LUFS) and cut into one line per scene.
4. **Compose** (`build2.py`): for each scene it puts the clip into the phone at 4K, then runs a virtual camera (ffmpeg `zoompan`) that eases between the logged focus boxes, adds the caption while the line plays, and joins the scenes.
5. **Gallery** (`gallery.js`): 3:2 Devpost images and a 1280×720 YouTube thumbnail, built from stills of the recordings.

The scripts use the working paths they were run with (`/tmp/claude-0/...`). Change the constants at the top of each file to run them elsewhere.
