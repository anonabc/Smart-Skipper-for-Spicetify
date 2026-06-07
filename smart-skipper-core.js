// NAME: Smart Skipper Core
// AUTHOR: anonabc

(function SmartSkipper() {
    if (!window.Spicetify || !Spicetify.Player || !Spicetify.LocalStorage || !Spicetify.Topbar || !Spicetify.Platform?.RootlistAPI || !Spicetify.Platform?.PlaylistAPI) {
        setTimeout(SmartSkipper, 250);
        return;
    }

    if (window.SmartSkipperInitialized) return;
    window.SmartSkipperInitialized = true;

    let skipIfInPlaylist = Spicetify.LocalStorage.get("smartskip:playlist") === "true";
    let skipIfHeardBefore = Spicetify.LocalStorage.get("smartskip:heard") === "true";
    let heardTracks = new Set(JSON.parse(Spicetify.LocalStorage.get("smartskip:history") || "[]"));

    async function updatePlaylistCache() {
        if (!skipIfInPlaylist) return;
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith("smartskip:track:")) {
                    localStorage.removeItem(key);
                }
            }

            const tempMap = new Map();
            const rootlist = await Spicetify.Platform.RootlistAPI.getContents();
            const rootItems = rootlist.items || rootlist;

            const extractPlaylistUris = (items) => {
                let uris = [];
                for (const item of items) {
                    if (item.type === "playlist") {
                        uris.push(item.uri);
                    } else if (item.type === "folder" && (item.items || item.children)) {
                        uris.push(...extractPlaylistUris(item.items || item.children));
                    }
                }
                return uris;
            };

            const playlistUris = extractPlaylistUris(rootItems);

            for (const playlistUri of playlistUris) {
                try {
                    const playlistData = await Spicetify.Platform.PlaylistAPI.getContents(playlistUri);
                    const tracks = playlistData.items || playlistData.tracks?.items || playlistData;
                    
                    if (!Array.isArray(tracks)) continue;

                    for (const trackObj of tracks) {
                        const trackUri = trackObj.uri || trackObj.item?.uri || trackObj.track?.uri; 
                        if (trackUri && trackUri.includes(":track:")) {
                            if (!tempMap.has(trackUri)) {
                                tempMap.set(trackUri, new Set());
                            }
                            tempMap.get(trackUri).add(playlistUri);
                        }
                    }
                } catch (pErr) {
                    console.warn(`[Smart Skipper] Skipping playlist metadata fetch for ${playlistUri}`);
                }
            }

            for (const [trackUri, playlistsSet] of tempMap.entries()) {
                try {
                    Spicetify.LocalStorage.set(`smartskip:track:${trackUri}`, JSON.stringify(Array.from(playlistsSet)));
                } catch (quotaErr) {
                    console.error("[Smart Skipper] LocalStorage quota exceeded. Cache truncated.");
                    break;
                }
            }
            
            tempMap.clear();
            console.log(`[Smart Skipper] Cached mapping stored directly to LocalStorage.`);
        } catch (err) {
            console.error("[Smart Skipper] Cache error:", err);
        }
    }

    updatePlaylistCache();

    // Inject native Spotify Toggle CSS styling to guarantee visibility in the Topbar
    const style = document.createElement("style");
    style.innerHTML = `
        .smart-skip-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 8px;
            cursor: pointer;
        }
        .smart-skip-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--spice-text, #fff);
            white-space: nowrap;
        }
        .smart-skip-switch {
            position: relative;
            display: inline-block;
            width: 32px;
            height: 18px;
        }
        .smart-skip-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .smart-skip-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #535353;
            transition: .2s;
            border-radius: 18px;
        }
        .smart-skip-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .2s;
            border-radius: 50%;
        }
        input:checked + .smart-skip-slider {
            background-color: #1DB954;
        }
        input:checked + .smart-skip-slider:before {
            transform: translateX(14px);
        }
    `;
    document.head.appendChild(style);

    // Interface Switch Generator
    const createToggleContainer = (labelText, isChecked, onChangeCallback) => {
        const wrapper = document.createElement("div");
        wrapper.className = "smart-skip-wrapper";
        
        wrapper.innerHTML = `
            <span class="smart-skip-label">${labelText}</span>
            <label class="smart-skip-switch">
                <input type="checkbox" ${isChecked ? "checked" : ""}>
                <span class="smart-skip-slider"></span>
            </label>
        `;

        wrapper.querySelector("input").addEventListener("change", (e) => {
            onChangeCallback(e.target.checked);
        });

        return wrapper.outerHTML;
    };

    // Register elements within Topbar using standard text wrappers to bypass SVG filtering rules
    const pButton = new Spicetify.Topbar.Button(
        "SmartSkip Playlist", 
        createToggleContainer("Playlist Skip", skipIfInPlaylist, () => {}), 
        () => {
            const input = pButton.element.querySelector("input");
            if (!input) return;
            skipIfInPlaylist = !input.checked; 
            input.checked = skipIfInPlaylist; // Toggle structural state
            Spicetify.LocalStorage.set("smartskip:playlist", skipIfInPlaylist ? "true" : "false");
            Spicetify.showNotification(skipIfInPlaylist ? "Skip if in Playlist: ON" : "Skip if in Playlist: OFF");
            if (skipIfInPlaylist) updatePlaylistCache();
        }
    );

    const hButton = new Spicetify.Topbar.Button(
        "SmartSkip History", 
        createToggleContainer("History Skip", skipIfHeardBefore, () => {}), 
        () => {
            const input = hButton.element.querySelector("input");
            if (!input) return;
            skipIfHeardBefore = !input.checked;
            input.checked = skipIfHeardBefore; // Toggle structural state
            Spicetify.LocalStorage.set("smartskip:heard", skipIfHeardBefore ? "true" : "false");
            Spicetify.showNotification(skipIfHeardBefore ? "Skip if Heard Before: ON" : "Skip if Heard Before: OFF");
        }
    );

    // Playback Interceptor Loop
    Spicetify.Player.addEventListener("songchange", () => {
        const playerData = Spicetify.Player.data;
        if (!playerData) return;

        let currentTrackUri = playerData.item?.uri || playerData.track?.uri || playerData.track?.metadata?.track_uri;
        let currentContextUri = playerData.context?.uri || "";

        if (!currentTrackUri) return;

        currentTrackUri = currentTrackUri.split("?")[0];
        if (currentContextUri.includes(":user:")) {
            currentContextUri = currentContextUri.replace(/spotify:user:[^:]+:playlist:/, "spotify:playlist:");
        }

        if (skipIfInPlaylist) {
            const cachedPlaylistsData = Spicetify.LocalStorage.get(`smartskip:track:${currentTrackUri}`);
            if (cachedPlaylistsData) {
                const parentPlaylists = JSON.parse(cachedPlaylistsData);
                if (!parentPlaylists.includes(currentContextUri)) {
                    console.log(`[Smart Skipper] Skipping matching track: ${currentTrackUri}`);
                    Spicetify.Player.next();
                    return;
                }
            }
        }

        if (skipIfHeardBefore && heardTracks.has(currentTrackUri)) {
            console.log(`[Smart Skipper] Skipping previously heard track.`);
            Spicetify.Player.next();
            return;
        }

        if (!heardTracks.has(currentTrackUri)) {
            heardTracks.add(currentTrackUri);
            const historyArray = Array.from(heardTracks).slice(-1000);
            Spicetify.LocalStorage.set("smartskip:history", JSON.stringify(historyArray));
        }
    });

    Spicetify.Player.addEventListener("contextchange", () => {
        if (skipIfInPlaylist) updatePlaylistCache();
    });
})();