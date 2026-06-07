# Smart-Skipper-for-Spicetify
- Automatically skips a track if it is already present in any of your existing playlists, unless you are explicitly listening to that playlist. 
- Keeps track of your last 1,000 played tracks and automatically skips them if they come up again in shuffle rotation.

## Installation
### Step 1: Copy the files
Download `smart-skipper-core.js` and place it inside your Spicetify Extensions directory:

- **Windows:** `%appdata%\Spotify\Apps\xpui\extensions\` or `%userprofile%\.spicetify\Extensions\`
- **Linux:** `~/.config/spicetify/Extensions/`
- **MacOS:** `~/.config/spicetify/Extensions/`

The easiest way to find this folder on any operating system is to open your terminal or command prompt and run: `spicetify config-dir`

### Step 2: Register the extension
Open your terminal or command prompt and execute the following commands:

`spicetify config extensions smart-skipper-core.js`

`spicetify apply`
