# Smart Skipper for Spicetify

Have you ever wanted to discover new songs? I developed this extension to automatically skip songs i have already heard and/or are in one of my playlists.
- Automatically skips a track if it is already present in any of your existing playlists, **unless you are currently playing one of the playlists that contains it**.
- Keeps track of your last 1,000 played tracks and automatically skips them if they come up again in shuffle rotation.
- Adds two native-looking toggles to the Spotify top bar: **Playlist Skip** and **History Skip**.

## Installation

### Quick install (Windows)

If you downloaded the latest release, run `install.bat`.

Alternatively, you can find the extension in the spicetify marketplace.

### Manual install

#### Step 1: Copy the files

Download `smart-skipper-core.js` and place it inside your Spicetify Extensions directory:

- **Windows:** `%appdata%\spicetify\Extensions\`
- **Linux:** `~/.config/spicetify/Extensions/`
- **MacOS:** `~/.config/spicetify/Extensions/`

The easiest way to find this folder on any operating system is to open your terminal or command prompt and run: `spicetify config-dir`

#### Step 2: Register the extension

Open your terminal or command prompt and execute the following commands:

```
spicetify config extensions smart-skipper-core.js
spicetify apply
```

Restart Spotify. The **Playlist Skip** and **History Skip** toggles will appear in the top bar.
