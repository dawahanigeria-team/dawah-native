# Track Player migration (Expo)

## Goal
Replace `expo-audio` with `react-native-track-player` so playback is reliable in the background and supports lock screen controls, queue playback, and resume after restart.

## Scope
- Make Track Player the source of truth for playback and queue state.
- Mirror Track Player state into `playerStore` for UI only.
- Persist a minimal queue snapshot and restore it on launch.
- Register a playback service for remote controls.

## Design
We replace `useAudioPlayback` with a Track Player-backed hook and update `AudioProvider` to initialize Track Player and configure notification controls. The queue and playback state live in Track Player; `playerStore` reads Track Player state and exposes UI-friendly data. We keep existing screens (MiniPlayer, lecture detail, playlist) and map their actions to Track Player commands.

A new playback service handles remote events (play, pause, next, previous, seek). We add a custom entry file to register this service before `expo-router/entry`.

## Queue persistence (Option 1)
Persist a minimal queue snapshot:
- track IDs in order
- current index
- last position
- playback rate
- repeat + shuffle
- lightweight current-track snapshot (title, artist, artwork)

On app start, resolve IDs to full metadata (cache first, API fallback), rebuild the Track Player queue, restore current index, then seek to last position. If offline, use cached metadata and downloaded file URIs when available.

## Data flow
1. User taps a lecture or playlist item.
2. App builds a Track Player queue and sets the current index.
3. Track Player emits state/progress events.
4. `playerStore` mirrors these values for UI.
5. A snapshot of minimal queue state persists on change.

## Error handling
- If a track fails to load, mark it failed, log to Sentry, and advance to the next track if available.
- If rehydration fails, clear the queue and keep the last snapshot for UI context.
- If offline and a track is not downloaded, skip it and surface “Unavailable offline.”

## Testing
- Unit tests for queue snapshot save/restore and corruption fallback.
- Integration tests for queue rehydration and Track Player API calls.
- Manual QA on device: background playback, lock screen controls, headset controls, resume after kill, offline restore.

## Release note
This change requires a dev build or EAS build; it cannot ship by OTA alone because Track Player is a native module.
